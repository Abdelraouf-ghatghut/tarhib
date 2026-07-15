export { bilingualName } from "../../lib/bilingualName";

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
  /** true = toutes les salles de la société ; false = seulement roomIds */
  allRoomsAllowed: boolean;
  roomIds: string[];
  permissions: string[];
  quotas: RoleQuota[];
  createdAt: string;
  updatedAt: string;
}

export interface MeetingRoomLite {
  id: string;
  nameAr: string;
  nameEn: string;
  active: boolean;
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

const PERMISSION_GROUP_KEYS: Record<string, string> = {
  alert: "permissionGroupAlert",
  branch: "permissionGroupBranch",
  catalog: "permissionGroupCatalog",
  cleaning: "permissionGroupCleaning",
  company: "permissionGroupCompany",
  employee: "permissionGroupEmployee",
  favorite: "permissionGroupFavorite",
  inventory: "permissionGroupInventory",
  meeting: "permissionGroupMeeting",
  notification: "permissionGroupNotification",
  operations: "permissionGroupOperations",
  order: "permissionGroupOrder",
  procurement: "permissionGroupProcurement",
  profile: "permissionGroupProfile",
  quota: "permissionGroupQuota",
  report: "permissionGroupReport",
  role: "permissionGroupRole",
  stock: "permissionGroupStock",
  supplier: "permissionGroupSupplier",
  suppliers: "permissionGroupSupplier",
  vip: "permissionGroupVip",
};

export function permissionGroupLabel(group: string, t: (key: string) => string): string {
  const key = PERMISSION_GROUP_KEYS[group] ?? `permissionGroup_${group}`;
  const translated = t(key);
  return translated === key ? group : translated;
}

/**
 * Couleurs de statut du design system (tokens CSS, résolution light/dark
 * automatique) pour les défauts P1..P5 ; les niveaux personnalisés reçoivent
 * une couleur selon leur rang.
 */
const SLA_COLORS: Record<string, string> = {
  P1: "var(--danger)",
  P2: "var(--warning)",
  P3: "var(--sky)",
  P4: "var(--success)",
  P5: "var(--gray)",
};

const SLA_PALETTE = [
  "var(--danger)",
  "var(--warning)",
  "var(--sky)",
  "var(--success)",
  "var(--gray)",
];

export function slaColor(code: string, levels?: SlaLevel[]): string {
  if (SLA_COLORS[code]) return SLA_COLORS[code];
  const idx = levels?.findIndex((l) => l.code === code) ?? -1;
  if (idx < 0) return "var(--fg-body-subtle)";
  return SLA_PALETTE[Math.min(idx, SLA_PALETTE.length - 1)];
}

/** Libellé d'un niveau SLA : nom personnalisé de l'entreprise sinon le code. */
export function slaLevelLabel(code: string, levels: SlaLevel[] | undefined, isAr: boolean): string {
  const level = levels?.find((l) => l.code === code);
  if (!level) return code;
  const custom = isAr ? level.nameAr : level.nameEn;
  return custom?.trim() ? `${code} — ${custom}` : code;
}
