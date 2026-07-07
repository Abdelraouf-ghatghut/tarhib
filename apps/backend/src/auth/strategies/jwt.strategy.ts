import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { JwtPayload } from '../interfaces/jwt-payload.interface.js';
import { Employee } from '../../employees/entities/employee.entity.js';
import { Role } from '../../roles/entities/role.entity.js';
import { legacyPermissions } from '../legacy-permissions.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
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

  /**
   * Le token Keycloak brut ne porte ni rôle ni permissions (pas de mapper configuré).
   * On enrichit ici depuis la DB (employé → rôle dynamique ou fallback legacy)
   * pour que req.user soit complet AVANT l'exécution des guards de permission.
   */
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

    // Lookup employé par keycloakId (sub) puis fallback email
    let employee: Employee | null = null;
    if (payload.sub) {
      employee = await this.employeeRepo.findOne({
        where: { keycloakId: payload.sub },
      });
    }
    if (!employee && email) {
      employee = await this.employeeRepo.findOne({ where: { email } });
    }
    if (!employee) return base;

    base.email = employee.email || base.email;
    base.companyId = employee.companyId || base.companyId;
    base.branchId = employee.branchId || base.branchId;

    if (employee.roleId) {
      const role = await this.roleRepo.findOne({
        where: { id: employee.roleId },
        relations: ['permissions'],
      });
      if (role) {
        base.roleId = role.id;
        base.roleName = role.nameEn ?? role.nameAr;
        base.scope = role.scope;
        base.role = role.nameEn ?? role.nameAr;
        base.slaPriority = role.slaPriority;
        base.permissions = role.permissions.map((p) => p.key);
        return base;
      }
    }

    // Fallback legacy : rôle string → permissions
    base.role = employee.role ?? 'EMPLOYEE';
    base.permissions = legacyPermissions(employee.role);
    return base;
  }
}
