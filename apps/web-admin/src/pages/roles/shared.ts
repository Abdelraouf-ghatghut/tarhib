export interface RoleQuotaInput {
  productId: string;
  periodType: "DAILY" | "WEEKLY" | "MONTHLY";
  maxQuantity: number;
}

export interface RoleQuota extends RoleQuotaInput {
  id: string;
}

export interface Role {
  id: string;
  companyId: string | null;
  nameAr: string;
  nameEn: string | null;
  scope: "TARHIB" | "CLIENT";
  slaPriority: string;
  isSystem: boolean;
  quotasEnabled: boolean;
  permissions: string[];
  quotas: RoleQuota[];
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  nameAr: string;
  nameEn: string;
}

export interface Product {
  id: string;
  nameAr: string;
  nameEn: string;
  type: string;
}

export interface Permission {
  key: string;
  nameAr: string;
  nameEn: string;
  scope: string;
}

export interface SlaLevel {
  code: string;
  nameAr: string | null;
  nameEn: string | null;
  targetMinutes: number;
  active: boolean;
  isDefault: boolean;
}

export const SLA_CODES = ["P1", "P2", "P3", "P4", "P5"] as const;

export const SLA_COLORS: Record<string, string> = {
  P1: "#f5222d",
  P2: "#fa8c16",
  P3: "#1677ff",
  P4: "#52c41a",
  P5: "#8c8c8c",
};

export const TARHIB_COLOR = "#1677ff";
export const CLIENT_COLOR = "#52c41a";
export const QUOTA_COLOR = "#fa8c16";

/** L'anglais est optionnel : s'il est absent, l'arabe est affiché par défaut. */
export function bilingualName(
  nameAr: string,
  nameEn: string | null | undefined,
  isAr: boolean,
): string {
  if (isAr) return nameAr;
  return nameEn?.trim() ? nameEn : nameAr;
}

/** Libellé d'un niveau SLA : nom personnalisé de l'entreprise sinon le code. */
export function slaLevelLabel(code: string, levels: SlaLevel[] | undefined, isAr: boolean): string {
  const level = levels?.find((l) => l.code === code);
  if (!level) return code;
  const custom = isAr ? level.nameAr : (level.nameEn ?? level.nameAr);
  return custom?.trim() ? `${code} — ${custom}` : code;
}
