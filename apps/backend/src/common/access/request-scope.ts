import { ForbiddenException } from '@nestjs/common';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface.js';

export interface RequestedScope {
  companyId?: string;
  branchId?: string;
}

/**
 * Empêche un filtre fourni par le client d'élargir la portée issue du JWT.
 * Les services doivent encore vérifier les ressources chargées par identifiant.
 */
export function constrainRequestedScope(
  user: JwtPayload,
  requested: RequestedScope,
): RequestedScope {
  if (user.dataScope === 'GLOBAL') return requested;

  const companyId = user.companyId;
  if (requested.companyId && requested.companyId !== companyId) {
    throw new ForbiddenException('Company is outside the current data scope');
  }

  if (user.dataScope === 'COMPANY') {
    return { companyId, branchId: requested.branchId };
  }

  const branchId = user.branchId;
  if (!branchId) {
    throw new ForbiddenException('A branch context is required');
  }
  if (requested.branchId && requested.branchId !== branchId) {
    throw new ForbiddenException('Branch is outside the current data scope');
  }

  return { companyId, branchId };
}

/** Vérifie une ressource déjà chargée par identifiant. */
export function assertResourceScope(
  user: JwtPayload,
  resource: { companyId: string; branchId?: string | null },
): void {
  if (user.dataScope === 'GLOBAL') return;
  if (resource.companyId !== user.companyId) {
    throw new ForbiddenException(
      'Resource company is outside the current data scope',
    );
  }
  if (user.dataScope === 'COMPANY') return;
  if (!user.branchId || resource.branchId !== user.branchId) {
    throw new ForbiddenException(
      'Resource branch is outside the current data scope',
    );
  }
}
