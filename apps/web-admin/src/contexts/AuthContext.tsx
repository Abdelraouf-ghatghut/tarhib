import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, setAuthToken, clearAuthToken } from "../lib/api";
import { AuthContext } from "./authContext";

export interface AuthState {
  token: string | null;
  role: string | null;
  email: string | null;
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const TOKEN_KEY = "tarhib_token";
const ROLE_KEY = "tarhib_role";
const EMAIL_KEY = "tarhib_email";

function loadSaved(): AuthState {
  const token = localStorage.getItem(TOKEN_KEY);
  const role = localStorage.getItem(ROLE_KEY);
  const email = localStorage.getItem(EMAIL_KEY);
  if (token) setAuthToken(token);
  return { token, role, email };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(loadSaved);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    const { accessToken, role } = res.data as { accessToken: string; role: string };
    setAuthToken(accessToken);
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(ROLE_KEY, role);
    localStorage.setItem(EMAIL_KEY, email);
    setAuth({ token: accessToken, role, email });
  }, []);

  const logout = useCallback(() => {
    clearAuthToken();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(EMAIL_KEY);
    setAuth({ token: null, role: null, email: null });
  }, []);

  const value = useMemo(
    () => ({ ...auth, isAuthenticated: !!auth.token, login, logout }),
    [auth, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
