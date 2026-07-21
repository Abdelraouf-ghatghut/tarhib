import { createContext } from "react";

export interface AuthState {
  token: string | null;
  role: string | null;
  roleId: string | null;
  email: string | null;
  scope: "TARHIB" | "CLIENT" | null;
  permissions: string[];
  companyId: string | null;
  branchId: string | null;
  departmentId: string | null;
  firstNameAr: string | null;
  firstNameEn: string | null;
  lastNameAr: string | null;
  lastNameEn: string | null;
}

/** Mode "test RBAC" actif : identité réelle changée (employee) ou seules les
 * permissions simulées (role) — voir AuthContext.tsx pour le détail. */
export interface Impersonation {
  mode: "employee" | "role";
  label: string;
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  /** Restauration de session en cours (refresh silencieux au démarrage) */
  isBooting: boolean;
  hasPermission: (key: string) => boolean;
  isSuperadmin: boolean;
  impersonation: Impersonation | null;
  startEmployeeImpersonation: (employeeId: string, label: string) => Promise<void>;
  startRoleImpersonation: (roleId: string, label: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
