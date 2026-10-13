import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PermissionInsuffisanteException } from '../auth.exceptions';
import type { RequestAvecUtilisateur } from '../auth.types';

/**
 * Vérifie, à chaque requête, que le rôle de l'utilisateur dispose bien de toutes
 * les permissions requises via la table de jointure roles_permissions — contrairement
 * au rôle (embarqué dans le JWT), une révocation de permission est donc effective
 * immédiatement sans attendre l'expiration du token.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissionsRequises = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!permissionsRequises || permissionsRequises.length === 0) {
      return true;
    }

    const utilisateur = context
      .switchToHttp()
      .getRequest<RequestAvecUtilisateur>().user;
    if (!utilisateur) {
      throw new PermissionInsuffisanteException();
    }

    const role = await this.prisma.role.findUnique({
      where: { code: utilisateur.role },
      include: { roles_permissions: { include: { permission: true } } },
    });

    const permissionsDuRole = new Set(
      role?.roles_permissions.map((rp) => rp.permission.code) ?? [],
    );
    const aToutesLesPermissions = permissionsRequises.every((code) =>
      permissionsDuRole.has(code),
    );

    if (!aToutesLesPermissions) {
      throw new PermissionInsuffisanteException();
    }

    return true;
  }
}
