import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Restreint l'accès aux utilisateurs dont le rôle (roles.code) figure dans la liste. */
export const Roles = (...codes: string[]) => SetMetadata(ROLES_KEY, codes);
