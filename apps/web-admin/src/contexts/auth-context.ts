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
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasPermission: (key: string) => boolean;
  isSuperadmin: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
