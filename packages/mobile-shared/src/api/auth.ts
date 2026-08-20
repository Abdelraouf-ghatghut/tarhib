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
    mustChangePassword: boolean;
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

export interface AcceptInvitePayload {
  code: string;
  firstNameAr: string;
  firstNameEn: string;
  lastNameAr: string;
  lastNameEn: string;
  phoneNumber: string;
  password: string;
}

export type CompanyRegistrationMode = "APPROVAL_REQUIRED" | "AUTO_APPROVED";

export interface CompanyRegistrationOption {
  id: string;
  branch: { id: string; nameAr: string; nameEn: string | null };
  department: { id: string; nameAr: string; nameEn: string | null };
  role: { id: string; nameAr: string; nameEn: string | null };
}

export interface RegistrationResolution {
  challenge: string;
  company: { id: string; nameAr: string; nameEn: string | null };
  mode: CompanyRegistrationMode;
  expiresInSeconds: number;
}

export interface RegisterEmployeePayload {
  challenge: string;
  registrationOptionId: string;
  email: string;
  firstNameAr: string;
  firstNameEn: string;
  lastNameAr: string;
  lastNameEn: string;
  phoneNumber: string;
  phoneVerificationToken: string;
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
  acceptInvite: (payload: AcceptInvitePayload) => {
    const { code, ...rest } = payload;
    return api.post<LoginResponse>("/auth/accept-invite", { token: code, ...rest });
  },
  resolveCompanyRegistration: (code: string) =>
    api.post<RegistrationResolution>("/auth/company-registration/resolve", { code }),
  companyRegistrationOptions: (challenge: string) =>
    api.get<CompanyRegistrationOption[]>(
      `/auth/company-registration/${encodeURIComponent(challenge)}/options`,
    ),
  registerEmployee: (payload: RegisterEmployeePayload) =>
    api.post<{ status: "PENDING" | "ACTIVATION_REQUIRED" }>("/auth/register", payload),
  requestRegistrationOtp: (challenge: string, phoneNumber: string, channel: OtpChannel = "sms") =>
    api.post("/auth/register/otp/request", { challenge, phoneNumber, channel }),
  verifyRegistrationOtp: (challenge: string, phoneNumber: string, code: string) =>
    api.post<{ verificationToken: string }>("/auth/register/otp/verify", {
      challenge,
      phoneNumber,
      code,
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post("/auth/password/change", { currentPassword, newPassword }),
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
