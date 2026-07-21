import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { JwtPayload } from '../interfaces/jwt-payload.interface.js';
import { Employee } from '../../employees/entities/employee.entity.js';
import { AccessPolicyService } from '../../access/access-policy.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { IMPERSONATE_ROLE_KEY_PREFIX } from '../impersonation.constants.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    private readonly accessPolicy: AccessPolicyService,
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
    const overrideRoleId = await this.redis.get(
      `${IMPERSONATE_ROLE_KEY_PREFIX}${employee.id}`,
    );
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
    return base;
  }
}
