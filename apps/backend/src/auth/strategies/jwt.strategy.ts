import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { JwtPayload } from '../interfaces/jwt-payload.interface.js';
import { Employee } from '../../employees/entities/employee.entity.js';
import { AccessPolicyService } from '../../access/access-policy.service.js';
import {
  AccessCacheService,
  CachedAccessProfile,
} from '../../access/access-cache.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { IMPERSONATE_ROLE_KEY_PREFIX } from '../impersonation.constants.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    config: ConfigService,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    private readonly accessPolicy: AccessPolicyService,
    private readonly accessCache: AccessCacheService,
    private readonly redis: RedisService,
  ) {
    const keycloakUrl = config.get<string>(
      'KEYCLOAK_ADMIN_URL',
      'http://localhost:8080',
    );
    const realm = config.get<string>('KEYCLOAK_REALM', 'tarhib');
    const jwksUri = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri,
      }),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const raw = payload as JwtPayload & Record<string, unknown>;
    const email =
      payload.email ?? (raw['preferred_username'] as string | undefined);

    const base: JwtPayload = {
      sub: payload.sub,
      email: email ?? '',
      role: payload.role ?? (raw['tarhib_role'] as string | undefined) ?? '',
      companyId:
        payload.companyId ??
        (raw['tarhib_company_id'] as string | undefined) ??
        '',
      branchId:
        payload.branchId ?? (raw['tarhib_branch_id'] as string | undefined),
      permissions: raw['permissions'] ?? [],
      iat: payload.iat,
      exp: payload.exp,
    };

    // PR-1.0 : chemin rapide sur cache Redis, keyé par keycloakId (connu AVANT
    // toute requête DB) — un hit évite le lookup Employee ET la résolution des
    // rôles/permissions. La vérification d'impersonation reste TOUJOURS faite
    // en clair depuis Redis (jamais mise en cache elle-même, cf. plus bas) :
    // un admin qui active l'impersonation doit voir l'effet immédiatement, pas
    // après expiration d'un profil déjà en cache.
    if (payload.sub) {
      const cached = await this.accessCache.get(payload.sub);
      if (cached) {
        const overrideRoleId = await this.redis
          .get(`${IMPERSONATE_ROLE_KEY_PREFIX}${cached.employeeId}`)
          .catch(() => null);
        if (!overrideRoleId) {
          return {
            ...base,
            employeeId: cached.employeeId,
            email: cached.email,
            companyId: cached.companyId,
            branchId: cached.branchId,
            roleId: cached.roleId,
            roleIds: cached.roleIds,
            roleName: cached.roleName,
            roleNames: cached.roleNames,
            scope: cached.scope,
            role: cached.role,
            permissions: cached.permissions,
            capabilities: cached.capabilities,
            modules: cached.modules,
            dataScope: cached.dataScope,
          };
        }
        // Impersonation active mais on n'a que le profil réel en cache (jamais
        // l'impersonation elle-même, cf. plus bas) → chemin complet ci-dessous
        // pour résoudre le rôle simulé (nécessite l'entité Employee complète).
      }
    }

    let employee: Employee | null = null;
    if (payload.sub) {
      employee = await this.employeeRepo.findOne({
        where: { keycloakId: payload.sub },
        relations: ['additionalRoles'],
      });
    }
    if (!employee && email) {
      employee = await this.employeeRepo.findOne({
        where: { email },
        relations: ['additionalRoles'],
      });
    }
    if (!employee) return base;

    base.employeeId = employee.id;
    base.email = employee.email || base.email;
    base.companyId = employee.companyId || base.companyId;
    base.branchId = employee.branchId || base.branchId;

    const access = await this.accessPolicy.resolve(employee);

    // Mode "tester ce rôle" (impersonation) : un indicateur Redis, posé par
    // POST /auth/impersonate/role/:roleId, substitue les permissions réelles
    // par celles du rôle simulé — sub/employeeId restent ceux de l'employé
    // réel, seule cette couche est affectée (traçabilité d'audit intacte).
    //
    // PR-0.5 : Redis n'est jamais la source de vérité de l'authentification —
    // une panne Redis ne doit JAMAIS casser la connexion d'un employé déjà
    // authentifié par un JWT valide. Si l'appel échoue (panne, timeout — cf.
    // config fail-fast de RedisModule), on dégrade silencieusement vers
    // "pas d'impersonation active" plutôt que de laisser l'erreur remonter et
    // faire échouer TOUTE requête authentifiée.
    const overrideRoleId = await this.redis
      .get(`${IMPERSONATE_ROLE_KEY_PREFIX}${employee.id}`)
      .catch((err: unknown) => {
        this.logger.warn(
          `Redis indisponible pour la vérification d'impersonation (dégradé, pas d'impersonation active) : ${String(err)}`,
        );
        return null;
      });
    const effective = overrideRoleId
      ? await this.accessPolicy.resolveAsRole(employee, overrideRoleId)
      : access;

    const primary =
      effective.roles.find((r) => r.primary) ?? effective.roles[0];
    if (primary) {
      base.roleId = primary.id;
      base.roleIds = effective.roles.map((r) => r.id);
      base.roleName = primary.nameEn ?? primary.nameAr;
      base.roleNames = effective.roles.map((r) => r.nameEn ?? r.nameAr);
      base.scope = primary.scope;
      base.role = primary.nameEn ?? primary.nameAr;
    } else {
      base.role = employee.role ?? 'EMPLOYEE';
    }
    base.companyId = effective.employee.companyId || base.companyId;
    base.permissions = effective.permissions;
    base.capabilities = effective.capabilities;
    base.modules = effective.modules.map((m) => m.key);
    base.dataScope = effective.dataScope;

    // Ne JAMAIS mettre en cache un profil impersonné : sinon l'admin resterait
    // "coincé" dans le rôle simulé jusqu'à expiration du TTL après avoir arrêté
    // de tester ce rôle. Le cache ne représente que l'accès RÉEL de l'employé.
    if (!overrideRoleId && base.employeeId) {
      const toCache: CachedAccessProfile = {
        employeeId: base.employeeId,
        email: base.email,
        companyId: base.companyId,
        branchId: base.branchId,
        roleId: base.roleId,
        roleIds: base.roleIds,
        roleName: base.roleName,
        roleNames: base.roleNames,
        scope: base.scope,
        role: base.role,
        permissions: base.permissions,
        capabilities: base.capabilities,
        modules: base.modules,
        dataScope: base.dataScope,
      };
      await this.accessCache.set(payload.sub, toCache);
    }

    return base;
  }
}
