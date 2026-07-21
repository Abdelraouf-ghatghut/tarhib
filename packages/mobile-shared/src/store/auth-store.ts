import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { create } from "zustand";

import {
  accessApi,
  authApi,
  type AcceptInvitePayload,
  type AccessProfile,
  type AccessRoleSummary,
} from "../api/auth";
import { configureApiClient } from "../api/client";
import type { AppMode } from "../theme";

const SECURE_REFRESH_TOKEN_KEY = "tarhib_refresh_token";
const CONTEXT_STORAGE_KEY = "tarhib_auth_context";

async function getRefreshToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(SECURE_REFRESH_TOKEN_KEY);
  }
  return SecureStore.getItemAsync(SECURE_REFRESH_TOKEN_KEY);
}

async function setRefreshToken(refreshToken: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(SECURE_REFRESH_TOKEN_KEY, refreshToken);
    return;
  }
  await SecureStore.setItemAsync(SECURE_REFRESH_TOKEN_KEY, refreshToken);
}

async function deleteRefreshToken(): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(SECURE_REFRESH_TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(SECURE_REFRESH_TOKEN_KEY);
}

export interface AuthContext {
  email: string | null;
  role: string | null;
  roleId: string | null;
  roleIds: string[];
  roles: AccessRoleSummary[];
  scope: "TARHIB" | "CLIENT" | null;
  permissions: string[];
  capabilities: Record<string, boolean>;
  modules: AccessProfile["modules"];
  dataScope: AccessProfile["dataScope"] | null;
  companyId: string | null;
  branchId: string | null;
  employee: AccessProfile["employee"] | null;
}

const EMPTY_CONTEXT: AuthContext = {
  email: null,
  role: null,
  roleId: null,
  roleIds: [],
  roles: [],
  scope: null,
  permissions: [],
  capabilities: {},
  modules: [],
  dataScope: null,
  companyId: null,
  branchId: null,
  employee: null,
};

interface AuthState extends AuthContext {
  accessToken: string | null;
  refreshToken: string | null;
  isBooting: boolean;
  isAuthenticated: boolean;

  restoreSession: (appMode: AppMode) => Promise<void>;
  login: (appMode: AppMode, email: string, password: string) => Promise<void>;
  loginWithOtp: (appMode: AppMode, phoneNumber: string, code: string) => Promise<void>;
  acceptInvite: (appMode: AppMode, payload: AcceptInvitePayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessContext: (appMode: AppMode) => Promise<void>;
  registerDeviceToken: (token: string) => Promise<void>;
}

async function persistContext(ctx: AuthContext): Promise<void> {
  await AsyncStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(ctx));
}

// /auth/login returns a lighter snapshot than /mobile/me|/operations/me —
// notably `modules` is just string keys there, not full MobileModule
// objects. That's fine: `refreshAccessContext` (called right after login)
// immediately overwrites this with the full AccessProfile, so `modules`
// intentionally stays empty here rather than fighting the type mismatch.
function contextFromLoginResponse(res: {
  email?: string;
  role?: string;
  roleId?: string;
  roleIds?: string[];
  scope?: "TARHIB" | "CLIENT";
  permissions?: string[];
  capabilities?: Record<string, boolean>;
  dataScope?: AccessProfile["dataScope"];
  companyId?: string;
  branchId?: string;
}): AuthContext {
  return {
    email: res.email ?? null,
    role: res.role ?? null,
    roleId: res.roleId ?? null,
    roleIds: res.roleIds ?? [],
    roles: [],
    scope: res.scope ?? null,
    permissions: res.permissions ?? [],
    capabilities: res.capabilities ?? {},
    modules: [],
    dataScope: res.dataScope ?? null,
    companyId: res.companyId ?? null,
    branchId: res.branchId ?? null,
    employee: null,
  };
}

function contextFromAccessProfile(profile: AccessProfile, previous: AuthContext): AuthContext {
  return {
    ...previous,
    email: profile.employee.email,
    roleId: profile.primaryRoleId,
    roleIds: profile.roles.map((r) => r.id),
    roles: profile.roles,
    scope: profile.employee.scope as "TARHIB" | "CLIENT",
    permissions: profile.permissions,
    capabilities: profile.capabilities,
    modules: profile.modules,
    dataScope: profile.dataScope,
    companyId: profile.employee.companyId,
    branchId: profile.employee.branchId,
    employee: profile.employee,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...EMPTY_CONTEXT,
  accessToken: null,
  refreshToken: null,
  isBooting: true,
  isAuthenticated: false,

  restoreSession: async (appMode) => {
    try {
      const [refreshToken, rawContext] = await Promise.all([
        getRefreshToken(),
        AsyncStorage.getItem(CONTEXT_STORAGE_KEY),
      ]);
      if (!refreshToken) {
        set({ isBooting: false });
        return;
      }
      const context = rawContext ? (JSON.parse(rawContext) as AuthContext) : EMPTY_CONTEXT;
      set({ refreshToken, ...context, isAuthenticated: true, isBooting: true });
      // Access token isn't persisted — obtain a fresh one now via refresh.
      const { data } = await authApi.refresh(refreshToken);
      set({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        isAuthenticated: true,
      });
      await setRefreshToken(data.refreshToken);
      await get().refreshAccessContext(appMode);
      set({ isBooting: false });
    } catch {
      // Refresh token invalid/expired — fall back to a clean logged-out state.
      await deleteRefreshToken();
      await AsyncStorage.removeItem(CONTEXT_STORAGE_KEY);
      set({
        ...EMPTY_CONTEXT,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isBooting: false,
      });
    }
  },

  login: async (appMode, email, password) => {
    const { data } = await authApi.login(email, password);
    const context = contextFromLoginResponse(data);
    set({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      isAuthenticated: true,
      ...context,
    });
    await setRefreshToken(data.refreshToken);
    await get().refreshAccessContext(appMode);
  },

  loginWithOtp: async (appMode, phoneNumber, code) => {
    const { data } = await authApi.verifyOtp(phoneNumber, code, appMode);
    const context = contextFromLoginResponse(data);
    set({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      isAuthenticated: true,
      ...context,
    });
    await setRefreshToken(data.refreshToken);
    await get().refreshAccessContext(appMode);
  },

  acceptInvite: async (appMode, payload) => {
    const { data } = await authApi.acceptInvite(payload);
    const context = contextFromLoginResponse(data);
    set({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      isAuthenticated: true,
      ...context,
    });
    await setRefreshToken(data.refreshToken);
    await get().refreshAccessContext(appMode);
  },

  logout: async () => {
    const { refreshToken } = get();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Best-effort — proceed to clear local state regardless.
      }
    }
    await deleteRefreshToken();
    await AsyncStorage.removeItem(CONTEXT_STORAGE_KEY);
    set({ ...EMPTY_CONTEXT, accessToken: null, refreshToken: null, isAuthenticated: false });
  },

  refreshAccessContext: async (appMode) => {
    const { data } = await accessApi.me(appMode);
    const merged = contextFromAccessProfile(data, get());
    set(merged);
    await persistContext(merged);
  },

  registerDeviceToken: async (token) => {
    // Best-effort, matches the Flutter app's non-blocking device-token registration.
    try {
      await authApi.deviceToken(token);
    } catch {
      // Ignore — push registration failures shouldn't affect the login flow.
    }
  },
}));

// Wire the axios client to this store once, at module load — the client
// module has no dependency on this file, so this stays a one-way link.
configureApiClient({
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  onTokensRefreshed: (accessToken, refreshToken) => {
    useAuthStore.setState({ accessToken, refreshToken });
    void setRefreshToken(refreshToken);
  },
  onSessionExpired: () => {
    useAuthStore.setState({
      ...EMPTY_CONTEXT,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
    void deleteRefreshToken();
    void AsyncStorage.removeItem(CONTEXT_STORAGE_KEY);
  },
});
