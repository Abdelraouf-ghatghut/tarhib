import { api } from "./client";
import type { AppMode } from "../theme";

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  email?: string;
  role?: string;
  roleId?: string;
  roleIds?: string[];
  scope?: "TARHIB" | "CLIENT";
  permissions?: string[];
  capabilities?: Record<string, boolean>;
  modules?: string[];
  dataScope?: "GLOBAL" | "COMPANY" | "BRANCH" | "OWN";
  companyId?: string;
  branchId?: string;
}

export type OtpChannel = "sms" | "whatsapp";

export interface AccessRoleSummary {
  id: string;
  nameAr: string;
  nameEn: string | null;
  scope: "TARHIB" | "CLIENT";
  primary: boolean;
}

export interface MobileModule {
  key: string;
  route: string;
  order: number;
  label: { en: string; ar: string };
}

export interface AccessProfile {
  employee: {
    id: string;
    keycloakId: string | null;
    email: string;
    firstNameAr: string;
    firstNameEn: string;
    lastNameAr: string;
    lastNameEn: string;
    phoneNumber: string;
    companyId: string | null;
    branchId: string | null;
    departmentId: string | null;
    scope: string;
    // Optionnels : absents des contextes persistés avant l'ajout côté backend.
    company?: { nameAr: string; nameEn: string } | null;
    branch?: { nameAr: string; nameEn: string } | null;
  };
  primaryRoleId: string | null;
  roles: AccessRoleSummary[];
  permissions: string[];
  capabilities: Record<string, boolean>;
  modules: MobileModule[];
  dataScope: "GLOBAL" | "COMPANY" | "BRANCH" | "OWN";
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>("/auth/login", { email, password }),
  requestOtp: (phoneNumber: string, channel: OtpChannel, appMode: AppMode) =>
    api.post("/auth/otp/request", { phoneNumber, channel, appMode }),
  verifyOtp: (phoneNumber: string, code: string, appMode: AppMode) =>
    api.post<LoginResponse>("/auth/otp/verify", { phoneNumber, code, appMode }),
  refresh: (refreshToken: string) => api.post<LoginResponse>("/auth/refresh", { refreshToken }),
  logout: (refreshToken: string) => api.post("/auth/logout", { refreshToken }),
  deviceToken: (token: string) => api.patch("/auth/device-token", { token }),
};

// GET /mobile/me (client employees) or GET /operations/me (Tarhib staff) —
// same AccessProfile shape, split only by REST namespace. Called right after
// login to hydrate the full capabilities/modules/dataScope context, matching
// the already-proven Flutter auth_provider.dart flow.
export const accessApi = {
  me: (appMode: AppMode) =>
    api.get<AccessProfile>(appMode === "employee" ? "/mobile/me" : "/operations/me"),
  capabilities: (appMode: AppMode) =>
    api.get<Pick<AccessProfile, "capabilities" | "modules" | "permissions" | "dataScope">>(
      appMode === "employee" ? "/mobile/capabilities" : "/operations/capabilities",
    ),
};
