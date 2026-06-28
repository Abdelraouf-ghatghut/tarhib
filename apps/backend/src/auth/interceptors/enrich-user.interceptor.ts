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

/**
 * Enrichit request.user avec companyId/branchId/role depuis la DB
 * quand le JWT Keycloak n'a pas encore les mappers configurés.
 */
@Injectable()
export class EnrichUserInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = req.user;
    if (user?.sub && (!user.companyId || !user.role)) {
      const emp = await this.employeeRepo.findOne({
        where: { keycloakId: user.sub },
      });
      if (emp) {
        user.companyId = emp.companyId;
        user.branchId = emp.branchId;
        user.role = emp.role;
        user.email = emp.email || user.email;
      }
    }
    return next.handle();
  }
}
