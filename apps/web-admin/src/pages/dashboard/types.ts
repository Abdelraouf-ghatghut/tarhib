export interface OrderRow {
  id: string;
  status: string;
  priority: string;
  slaDeadline: string;
  createdAt: string;
}

export interface InventoryReport {
  belowThreshold: number;
  outOfStock: number;
}

export interface StockAlertItem {
  quantity: number;
  minThreshold: number;
}

export interface SlaReport {
  complianceRate: number;
}

export interface OrdersReport {
  total: number;
  byStatus: Record<string, number>;
}

export interface QuotaReport {
  total: number;
  averageConsumptionRate: number;
  nearCapCount: number;
}

export const STATUS_META: Array<{ status: string; labelKey: string; color: string; tag: string }> =
  [
    { status: "PENDING", labelKey: "pending", color: "var(--danger)", tag: "red" },
    { status: "APPROVED", labelKey: "approved", color: "var(--brand)", tag: "blue" },
    { status: "IN_PROGRESS", labelKey: "inProgress", color: "var(--warning)", tag: "orange" },
    { status: "DELIVERED", labelKey: "delivered", color: "var(--success)", tag: "green" },
    { status: "REJECTED", labelKey: "rejected", color: "var(--gray)", tag: "default" },
  ];

export type ChartPeriod = "today" | "week" | "month" | "year" | "custom";

// Rafraîchissement auto (SLA temps réel) — commandes/rapports rechargés
// périodiquement pour que le compte à rebours affiché ne se fige jamais.
export const REFRESH_INTERVAL_MS = 30_000;
