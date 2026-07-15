import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'required_permission';
export const RequirePermission = (permission: string) =>
  SetMetadata(PERMISSION_KEY, permission);

/**
 * Autorise l'action lorsqu'au moins une des permissions est présente.
 * Utile pendant la migration des permissions historiques trop larges vers
 * les permissions Operations granulaires.
 */
export const RequireAnyPermission = (...permissions: string[]) =>
  SetMetadata(PERMISSION_KEY, permissions);
