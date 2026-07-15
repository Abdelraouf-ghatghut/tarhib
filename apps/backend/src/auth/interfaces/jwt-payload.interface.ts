export interface JwtPayload {
  sub: string;
  /**
   * UUID de la ligne `employees` résolue par JwtStrategy/EnrichUserInterceptor.
   * `sub` est l'ID Keycloak — ne jamais l'utiliser comme FK employé ;
   * utiliser `employeeId ?? sub` (fallback pour les tokens de test/seed).
   */
  employeeId?: string;
  email: string;
  /** Legacy role string kept for backward compatibility; use permissions[] for logic. */
  role: string;
  /** UUID of the dynamic role entity. */
  roleId?: string;
  /** UUIDs of primary and additional dynamic roles. */
  roleIds?: string[];
  roleName?: string;
  roleNames?: string[];
  scope?: 'TARHIB' | 'CLIENT';
  /** Resolved permission keys from the role. */
  permissions: string[];
  capabilities?: Record<string, boolean>;
  modules?: string[];
  dataScope?: 'GLOBAL' | 'COMPANY' | 'BRANCH' | 'OWN';
  companyId: string;
  branchId?: string;
  iat?: number;
  exp?: number;
}
