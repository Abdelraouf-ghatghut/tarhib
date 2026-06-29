export interface JwtPayload {
  sub: string;
  email: string;
  /** Legacy role string — kept for backward compat, use permissions[] for logic */
  role: string;
  /** UUID of the dynamic role entity */
  roleId?: string;
  roleName?: string;
  scope?: 'TARHIB' | 'CLIENT';
  /** Resolved permission keys from the role */
  permissions: string[];
  companyId: string;
  branchId?: string;
  iat?: number;
  exp?: number;
}
