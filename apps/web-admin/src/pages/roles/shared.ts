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
  sortOrder: number;
  isDefault: boolean;
}

/**
 * Couleurs de statut du design system (tokens CSS, résolution light/dark
 * automatique) pour les défauts P1..P5 ; les niveaux personnalisés reçoivent
 * une couleur selon leur rang.
 */
const SLA_COLORS: Record<string, string> = {
  P1: "var(--danger)",
  P2: "var(--warning)",
  P3: "var(--brand)",
  P4: "var(--success)",
  P5: "var(--fg-body-subtle)",
};

const SLA_PALETTE = [
  "var(--danger)",
  "var(--warning)",
  "var(--brand)",
  "var(--success)",
  "var(--fg-body-subtle)",
];

export function slaColor(code: string, levels?: SlaLevel[]): string {
  if (SLA_COLORS[code]) return SLA_COLORS[code];
  const idx = levels?.findIndex((l) => l.code === code) ?? -1;
  if (idx < 0) return "var(--fg-body-subtle)";
  return SLA_PALETTE[Math.min(idx, SLA_PALETTE.length - 1)];
}

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
