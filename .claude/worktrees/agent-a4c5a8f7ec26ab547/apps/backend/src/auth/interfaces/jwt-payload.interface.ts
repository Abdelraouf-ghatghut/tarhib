import { EmployeeRole } from '../../employees/dto/employee.dto';

export interface JwtPayload {
  /** Keycloak user UUID, mapped to employee.keycloakId */
  sub: string;
  email: string;
  role: EmployeeRole;
  /** Tenant identifier — injected automatically by Keycloak mapper */
  companyId: string;
  /** Required for HOSPITALITY_AGENT branch-scoped isolation */
  branchId: string;
  iat?: number;
  exp?: number;
}
