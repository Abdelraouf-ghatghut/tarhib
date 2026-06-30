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
import { Role } from '../../roles/entities/role.entity.js';
import type { JwtPayload } from '../interfaces/jwt-payload.interface.js';

@Injectable()
export class EnrichUserInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
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
    });

    if (!emp) return next.handle();

    user.companyId = emp.companyId;
    user.branchId = emp.branchId;
    user.email = emp.email || user.email;

    if (emp.roleId) {
      const role = await this.roleRepo.findOne({
        where: { id: emp.roleId },
        relations: ['permissions'],
      });
      if (role) {
        user.roleId = role.id;
        user.roleName = role.nameEn;
        user.scope = role.scope;
        user.permissions = role.permissions.map((p) => p.key);
        user.role = role.nameEn;
        return next.handle();
      }
    }

    // Fallback: legacy role string
    user.role = emp.role ?? 'EMPLOYEE';
    user.permissions = user.permissions ?? [];

    return next.handle();
  }
}
