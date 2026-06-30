import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EmployeeRole } from '../../employees/dto/employee.dto';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<EmployeeRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Route has no @Roles() decorator — access is open to any authenticated user
    if (!required || required.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    return required.includes(user?.role as EmployeeRole);
  }
}
