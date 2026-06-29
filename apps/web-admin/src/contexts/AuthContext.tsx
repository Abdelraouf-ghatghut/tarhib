import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, setAuthToken, clearAuthToken } from "../lib/api";
import { AuthContext } from "./auth-context";
import type { AuthState } from "./auth-context";

const KEYS = {
  token: "tarhib_token",
  role: "tarhib_role",
  roleId: "tarhib_role_id",
  email: "tarhib_email",
  scope: "tarhib_scope",
  permissions: "tarhib_permissions",
  companyId: "tarhib_company_id",
  branchId: "tarhib_branch_id",
};

function loadSaved(): AuthState {
  const token = localStorage.getItem(KEYS.token);
  const role = localStorage.getItem(KEYS.role);
  const roleId = localStorage.getItem(KEYS.roleId);
  const email = localStorage.getItem(KEYS.email);
  const scope = (localStorage.getItem(KEYS.scope) ?? null) as AuthState["scope"];
  const companyId = localStorage.getItem(KEYS.companyId);
  const branchId = localStorage.getItem(KEYS.branchId);
  let permissions: string[] = [];
  try {
    permissions = JSON.parse(localStorage.getItem(KEYS.permissions) ?? "[]");
  } catch {
    // leave permissions as []
  }
  if (token) setAuthToken(token);
  return { token, role, roleId, email, scope, permissions, companyId, branchId };
}

function clearStorage() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(loadSaved);

  const logout = useCallback(() => {
    clearAuthToken();
    clearStorage();
    setAuth({
      token: null,
      role: null,
      roleId: null,
      email: null,
      scope: null,
      permissions: [],
      companyId: null,
      branchId: null,
    });
  }, []);

  useEffect(() => {
    const id = api.interceptors.response.use(
      (r) => r,
      (err) => {
        if (err?.response?.status === 401) logout();
        return Promise.reject(err);
      },
    );
    return () => api.interceptors.response.eject(id);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    const data = res.data as {
      accessToken: string;
      role?: string;
      roleId?: string;
      scope?: string;
      permissions?: string[];
      companyId?: string;
      branchId?: string;
    };
    const { accessToken } = data;
    const role = data.role ?? null;
    const roleId = data.roleId ?? null;
    const scope = (data.scope ?? null) as AuthState["scope"];
    const permissions = data.permissions ?? [];
    const companyId = data.companyId ?? null;
    const branchId = data.branchId ?? null;

    setAuthToken(accessToken);
    localStorage.setItem(KEYS.token, accessToken);
    if (role) localStorage.setItem(KEYS.role, role);
    if (roleId) localStorage.setItem(KEYS.roleId, roleId);
    localStorage.setItem(KEYS.email, email);
    if (scope) localStorage.setItem(KEYS.scope, scope);
    localStorage.setItem(KEYS.permissions, JSON.stringify(permissions));
    if (companyId) localStorage.setItem(KEYS.companyId, companyId);
    if (branchId) localStorage.setItem(KEYS.branchId, branchId);

    setAuth({ token: accessToken, role, roleId, email, scope, permissions, companyId, branchId });
  }, []);

  const hasPermission = useCallback(
    (key: string) => auth.permissions.includes(key),
    [auth.permissions],
  );

  const value = useMemo(
    () => ({
      ...auth,
      isAuthenticated: !!auth.token,
      isSuperadmin: auth.scope === "TARHIB" && auth.permissions.includes("company.manage"),
      login,
      logout,
      hasPermission,
    }),
    [auth, login, logout, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
