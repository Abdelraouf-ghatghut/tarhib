/** Préfixe de la clé Redis portant le rôle simulé pour un employé (mode "tester ce rôle"). */
export const IMPERSONATE_ROLE_KEY_PREFIX = 'impersonate_role:';

/** Filet de sécurité : durée max d'une simulation de rôle oubliée. */
export const IMPERSONATION_TTL_SECONDS = 4 * 3600;
