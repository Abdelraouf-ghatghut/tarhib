import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator.js';
import type { JwtPayload } from '../interfaces/jwt-payload.interface.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required) return true;

    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const permissions: string[] = user?.permissions ?? [];

    if (!permissions.includes(required)) {
      throw new ForbiddenException(`Permission required: ${required}`);
    }
    return true;
  }
}
