export type PoStatus =
  | "DRAFT"
  | "PENDING_VALIDATION"
  | "VALIDATED"
  | "SENT"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

export interface PoLine {
  id: string;
  productId: string;
  orderedQty: number;
  receivedQty: number;
  unitCost: number | null;
  notes: string | null;
}

export interface Po {
  id: string;
  companyId: string;
  branchId: string;
  supplierId: string;
  status: PoStatus;
  notes: string | null;
  createdBy: string;
  validatedBy: string | null;
  validatedAt: string | null;
  rejectionReason: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  sentBy: string | null;
  sentAt: string | null;
  receivedBy: string | null;
  receivedAt: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  lines: PoLine[];
  createdAt: string;
}

export interface Product {
  id: string;
  nameAr: string;
  nameEn: string;
  unitCost: number | null;
  unit: string | null;
  purchaseUnit: string | null;
  unitsPerPurchase: number;
  isPurchased: boolean;
}

export interface Supplier {
  id: string;
  nameAr: string;
  nameEn: string;
}

export interface NamedEntity {
  id: string;
  nameAr: string;
  nameEn: string;
}

export interface Employee {
  id: string;
  firstNameAr: string;
  lastNameAr: string;
  firstNameEn: string;
  lastNameEn: string;
  email: string;
  keycloakId?: string | null;
}

export const STATUS_COLOR: Record<PoStatus, string> = {
  DRAFT: "default",
  PENDING_VALIDATION: "gold",
  VALIDATED: "cyan",
  SENT: "blue",
  PARTIALLY_RECEIVED: "orange",
  RECEIVED: "green",
  CANCELLED: "red",
};

export const ALL_STATUSES: PoStatus[] = [
  "DRAFT",
  "PENDING_VALIDATION",
  "VALIDATED",
  "SENT",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
];
