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

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    private readonly accessPolicy: AccessPolicyService,
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
    const primary = access.roles.find((r) => r.primary) ?? access.roles[0];
    if (primary) {
      base.roleId = primary.id;
      base.roleIds = access.roles.map((r) => r.id);
      base.roleName = primary.nameEn ?? primary.nameAr;
      base.roleNames = access.roles.map((r) => r.nameEn ?? r.nameAr);
      base.scope = primary.scope;
      base.role = primary.nameEn ?? primary.nameAr;
    } else {
      base.role = employee.role ?? 'EMPLOYEE';
    }
    base.permissions = access.permissions;
    base.capabilities = access.capabilities;
    base.modules = access.modules.map((m) => m.key);
    base.dataScope = access.dataScope;
    return base;
  }
}
