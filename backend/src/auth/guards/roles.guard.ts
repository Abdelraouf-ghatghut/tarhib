import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RoleInsuffisantException } from '../auth.exceptions';
import type { RequestAvecUtilisateur } from '../auth.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesRequis = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!rolesRequis || rolesRequis.length === 0) {
      return true;
    }

    const utilisateur = context
      .switchToHttp()
      .getRequest<RequestAvecUtilisateur>().user;
    if (!utilisateur || !rolesRequis.includes(utilisateur.role)) {
      throw new RoleInsuffisantException();
    }

    return true;
  }
}
