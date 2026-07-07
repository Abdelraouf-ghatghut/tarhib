import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { InternalAxiosRequestConfig } from "axios";
import { api, setAuthToken, clearAuthToken } from "../lib/api";
import { AuthContext } from "./auth-context";
import type { AuthState } from "./auth-context";

/**
 * Sécurité (TARHIB) : aucun token en localStorage. L'access token ne vit
 * qu'en mémoire (header axios) ; la session est restaurée au démarrage via
 * le refresh token porté par un cookie HttpOnly que ce code ne voit jamais.
 */

const EMPTY_STATE: AuthState = {
  token: null,
  role: null,
  roleId: null,
  email: null,
  scope: null,
  permissions: [],
  companyId: null,
  branchId: null,
  departmentId: null,
  firstNameAr: null,
  firstNameEn: null,
  lastNameAr: null,
  lastNameEn: null,
};

interface TokenResponse {
  accessToken: string;
  expiresIn: number;
  email?: string;
  role?: string;
  roleId?: string;
  scope?: string;
  permissions?: string[];
  companyId?: string;
  branchId?: string;
}

interface MePayload {
  email?: string;
  role?: string;
  roleId?: string;
  scope?: string;
  permissions?: string[];
  companyId?: string;
  branchId?: string;
  departmentId?: string | null;
  firstNameAr?: string;
  firstNameEn?: string;
  lastNameAr?: string;
  lastNameEn?: string;
}

// Anciennes clés localStorage (token inclus) : purge au premier chargement
const LEGACY_KEYS = [
  "tarhib_token",
  "tarhib_role",
  "tarhib_role_id",
  "tarhib_email",
  "tarhib_scope",
  "tarhib_permissions",
  "tarhib_company_id",
  "tarhib_branch_id",
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(EMPTY_STATE);
  const [isBooting, setIsBooting] = useState(true);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshInFlight = useRef<Promise<string | null> | null>(null);
  const silentRefreshRef = useRef<() => Promise<string | null>>(() => Promise.resolve(null));

  const logout = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    clearAuthToken();
    // Révoque le refresh token côté serveur et efface le cookie HttpOnly
    void api.post("/auth/logout", {}).catch(() => undefined);
    setAuth(EMPTY_STATE);
  }, []);

  const scheduleRefresh = useCallback((expiresIn: number) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    // 60 s de marge avant expiration, jamais moins de 30 s
    const delayMs = Math.max((expiresIn - 60) * 1000, 30_000);
    refreshTimer.current = setTimeout(() => {
      void silentRefreshRef.current();
    }, delayMs);
  }, []);

  /** Renouvelle l'access token via le cookie ; single-flight (un seul appel concurrent). */
  const silentRefresh = useCallback((): Promise<string | null> => {
    refreshInFlight.current ??= api
      .post("/auth/refresh", {})
      .then((res) => {
        const data = res.data as TokenResponse;
        setAuthToken(data.accessToken);
        setAuth((prev) => ({ ...prev, token: data.accessToken }));
        scheduleRefresh(data.expiresIn);
        return data.accessToken;
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight.current = null;
      });
    return refreshInFlight.current;
  }, [scheduleRefresh]);

  useEffect(() => {
    silentRefreshRef.current = silentRefresh;
  }, [silentRefresh]);

  // Restauration de session au démarrage : refresh cookie → /auth/me
  useEffect(() => {
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
    let cancelled = false;
    void (async () => {
      const token = await silentRefresh();
      if (token && !cancelled) {
        try {
          const me = (await api.get("/auth/me")).data as MePayload;
          if (!cancelled) {
            // Portail réservé au personnel interne Tarhib : les comptes
            // clients (app mobile) ne restaurent pas de session ici
            if (me.scope !== "TARHIB") {
              logout();
            } else {
              setAuth({
                token,
                email: me.email ?? null,
                role: me.role ?? null,
                roleId: me.roleId ?? null,
                scope: (me.scope ?? null) as AuthState["scope"],
                permissions: me.permissions ?? [],
                companyId: me.companyId || null,
                branchId: me.branchId || null,
                departmentId: me.departmentId ?? null,
                firstNameAr: me.firstNameAr ?? null,
                firstNameEn: me.firstNameEn ?? null,
                lastNameAr: me.lastNameAr ?? null,
                lastNameEn: me.lastNameEn ?? null,
              });
            }
          }
        } catch {
          // profil invérifiable → pas de session sur le portail interne
          logout();
        }
      }
      if (!cancelled) setIsBooting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [silentRefresh]);

  // 401 → tentative de refresh unique puis rejeu de la requête ; sinon logout
  useEffect(() => {
    const id = api.interceptors.response.use(
      (r) => r,
      async (err: unknown) => {
        const e = err as {
          config?: InternalAxiosRequestConfig & { _retry?: boolean };
          response?: { status?: number };
        };
        const cfg = e.config;
        const url = cfg?.url ?? "";
        const isAuthRoute = url.includes("/auth/");
        if (e.response?.status === 401 && cfg && !cfg._retry && !isAuthRoute) {
          cfg._retry = true;
          const token = await silentRefresh();
          if (token) {
            cfg.headers.set("Authorization", `Bearer ${token}`);
            return api.request(cfg);
          }
          logout();
        }
        return Promise.reject(err);
      },
    );
    return () => api.interceptors.response.eject(id);
  }, [logout, silentRefresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post("/auth/login", { email, password });
      const data = res.data as TokenResponse;
      // Le web admin est un outil interne : les comptes clients utilisent
      // exclusivement l'app mobile. On révoque immédiatement la session.
      if (data.scope !== "TARHIB") {
        void api.post("/auth/logout", {}).catch(() => undefined);
        throw new Error("INTERNAL_ONLY");
      }
      setAuthToken(data.accessToken);
      scheduleRefresh(data.expiresIn);
      setAuth({
        token: data.accessToken,
        role: data.role ?? null,
        roleId: data.roleId ?? null,
        email: data.email ?? email,
        scope: (data.scope ?? null) as AuthState["scope"],
        permissions: data.permissions ?? [],
        companyId: data.companyId ?? null,
        branchId: data.branchId ?? null,
        departmentId: null,
        firstNameAr: null,
        firstNameEn: null,
        lastNameAr: null,
        lastNameEn: null,
      });
      // Le nom affiché (profil) vient de la fiche employé, pas du JWT — complété
      // juste après pour ne pas retarder la connexion elle-même
      try {
        const me = (await api.get("/auth/me")).data as MePayload;
        setAuth((prev) => ({
          ...prev,
          departmentId: me.departmentId ?? null,
          firstNameAr: me.firstNameAr ?? null,
          firstNameEn: me.firstNameEn ?? null,
          lastNameAr: me.lastNameAr ?? null,
          lastNameEn: me.lastNameEn ?? null,
        }));
      } catch {
        // non-bloquant : le profil retombera sur l'email en cas d'échec
      }
    },
    [scheduleRefresh],
  );

  const hasPermission = useCallback(
    (key: string) => auth.permissions.includes(key),
    [auth.permissions],
  );

  const value = useMemo(
    () => ({
      ...auth,
      isAuthenticated: !!auth.token,
      isBooting,
      isSuperadmin: auth.scope === "TARHIB" && auth.permissions.includes("company.manage"),
      login,
      logout,
      hasPermission,
    }),
    [auth, isBooting, login, logout, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
