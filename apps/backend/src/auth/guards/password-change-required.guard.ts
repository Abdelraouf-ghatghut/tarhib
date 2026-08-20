import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from '../interfaces/jwt-payload.interface.js';

const ALLOWED_PATHS = new Set([
  '/auth/me',
  '/auth/logout',
  '/auth/password/change',
  '/operations/me',
]);

@Injectable()
export class PasswordChangeRequiredGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();
    if (!request.user?.mustChangePassword) return true;
    const path = request.path.replace(/\/$/, '') || '/';
    if (ALLOWED_PATHS.has(path)) return true;
    throw new ForbiddenException('passwordChangeRequired');
  }
}
