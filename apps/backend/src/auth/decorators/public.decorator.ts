import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marque une route comme publique : le JwtAuthGuard global la laisse passer.
 * À réserver aux endpoints d'authentification (login, refresh, register…)
 * et au health check — tout le reste exige un JWT valide.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
