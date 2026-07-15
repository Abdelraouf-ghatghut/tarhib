import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable } from 'rxjs';
import { Employee } from '../../employees/entities/employee.entity.js';
import type { JwtPayload } from '../interfaces/jwt-payload.interface.js';
import { AccessPolicyService } from '../../access/access-policy.service.js';

@Injectable()
export class EnrichUserInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    private readonly accessPolicy: AccessPolicyService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = req.user;

    if (!user?.sub) return next.handle();

    const needsEnrich = !user.companyId || !user.permissions?.length;
    if (!needsEnrich) return next.handle();

    const emp = await this.employeeRepo.findOne({
      where: { keycloakId: user.sub },
      relations: ['additionalRoles'],
    });

    if (!emp) return next.handle();

    // Interne non affecté (ex. superadmin) : companyId/branchId restent vides
    user.employeeId = emp.id;
    user.companyId = emp.companyId ?? user.companyId;
    user.branchId = emp.branchId ?? user.branchId;
    user.email = emp.email || user.email;

    const access = await this.accessPolicy.resolve(emp);
    if (access.roles.length > 0) {
      const primary = access.roles.find((r) => r.primary) ?? access.roles[0];
      user.roleId = primary.id;
      user.roleIds = access.roles.map((r) => r.id);
      user.roleName = primary.nameEn ?? primary.nameAr;
      user.roleNames = access.roles.map((r) => r.nameEn ?? r.nameAr);
      user.scope = primary.scope;
      user.permissions = access.permissions;
      user.capabilities = access.capabilities;
      user.modules = access.modules.map((m) => m.key);
      user.dataScope = access.dataScope;
      user.role = primary.nameEn ?? primary.nameAr;
      return next.handle();
    }

    // Fallback: legacy role string
    user.role = emp.role ?? 'EMPLOYEE';
    user.permissions = user.permissions ?? [];

    return next.handle();
  }
}
