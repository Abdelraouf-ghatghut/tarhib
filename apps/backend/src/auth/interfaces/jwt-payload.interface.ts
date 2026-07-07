export interface JwtPayload {
  sub: string;
  email: string;
  /** Legacy role string — kept for backward compat, use permissions[] for logic */
  role: string;
  /** UUID of the dynamic role entity */
  roleId?: string;
  roleName?: string;
  scope?: 'TARHIB' | 'CLIENT';
  /** SLA priority (P1..P5) inherited from the role — drives order slaDeadline */
  slaPriority?: string;
  /** Resolved permission keys from the role */
  permissions: string[];
  companyId: string;
  branchId?: string;
  iat?: number;
  exp?: number;
}
