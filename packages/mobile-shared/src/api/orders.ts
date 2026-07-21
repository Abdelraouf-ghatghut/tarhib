import { api } from "./client";

// Aligné sur apps/backend/src/orders/dto/order.dto.ts
export type OrderStatus =
  | "PENDING"
  | "APPROVED"
  | "IN_PROGRESS"
  | "READY"
  | "DELIVERED"
  | "REJECTED";

export type LineValidationStatus = "APPROVED" | "REJECTED" | "PENDING_APPROVAL";

// Codes émis par le moteur de validation (§3.3) — clés i18n côté app.
export type LineRejectionReason =
  | "PRODUCT_NOT_COMMANDABLE"
  | "ROLE_NOT_ALLOWED"
  | "BRANCH_NOT_ALLOWED"
  | "INSUFFICIENT_STOCK"
  | "QUOTA_EXCEEDED";

export interface OrderLine {
  productId: string;
  quantity: number;
  validationStatus: LineValidationStatus;
  rejectionReason: LineRejectionReason | string | null;
}

export interface Order {
  id: string;
  employeeId: string;
  recipientNameAr?: string | null;
  recipientNameEn?: string | null;
  recipientPhone?: string | null;
  recipientFloor?: string | null;
  recipientOffice?: string | null;
  branchId: string;
  companyId: string;
  status: OrderStatus;
  priority: string;
  slaDeadline: string;
  createdAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  prepStartedAt: string | null;
  readyAt: string | null;
  deliveredAt: string | null;
  note: string | null;
  lines: OrderLine[];
}

export interface CreateOrderInput {
  lines: Array<{ productId: string; quantity: number }>;
  note?: string;
}

export interface DashboardStats {
  todayOrders: number;
  pendingCount: number;
  deliveredToday: number;
  avgSlaMinutes: number;
  mostOrdered: Array<{ productId: string; name: string; count: number }>;
}

/** POST /orders — déclenche le moteur de validation §3.3 côté serveur. */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const { data } = await api.post<Order>("/orders", input);
  return data;
}

/** Commandes de l'employé connecté (filtre imposé côté serveur). */
export async function fetchMyOrders(status?: OrderStatus): Promise<Order[]> {
  const { data } = await api.get<Order[]>("/orders/me", {
    params: status ? { status } : undefined,
  });
  return data;
}

/** Liste Operations/Admin, filtrable comme GET /orders côté backend. */
export async function fetchOrders(filters?: {
  companyId?: string | null;
  branchId?: string | null;
  employeeId?: string;
  status?: OrderStatus;
}): Promise<Order[]> {
  const { data } = await api.get<Order[]>("/orders", {
    params: {
      companyId: filters?.companyId ?? undefined,
      branchId: filters?.branchId ?? undefined,
      employeeId: filters?.employeeId,
      status: filters?.status,
    },
  });
  return data;
}

export async function fetchOrder(id: string): Promise<Order> {
  const { data } = await api.get<Order>(`/orders/${id}`);
  return data;
}

/** File cuisine (APPROVED + IN_PROGRESS, triée par SLA croissant). */
export async function fetchKitchenQueue(branchId?: string): Promise<Order[]> {
  const { data } = await api.get<Order[]>("/kitchen/queue", {
    params: branchId ? { branchId } : undefined,
  });
  return data;
}

export interface DeliveryTask {
  id: string;
  orderId: string;
  assignedEmployeeId: string | null;
  status:
    | "AVAILABLE"
    | "ASSIGNED"
    | "PICKED_UP"
    | "OUT_FOR_DELIVERY"
    | "ISSUE_REPORTED"
    | "DELIVERED"
    | "RETURNED"
    | "FAILED";
  issueReason: string | null;
  issueDescription: string | null;
  createdAt: string;
  updatedAt: string;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  order: Order;
  destination: {
    recipientNameAr: string;
    recipientNameEn: string;
    floor: string | null;
    officeNumber: string | null;
    companyNameAr: string;
    companyNameEn: string;
    branchNameAr: string;
    branchNameEn: string;
  } | null;
}

export async function fetchDeliveryQueue(branchId?: string): Promise<DeliveryTask[]> {
  const { data } = await api.get<DeliveryTask[]>("/delivery/queue", {
    params: branchId ? { branchId } : undefined,
  });
  return data;
}
export async function transitionDeliveryTask(
  id: string,
  action: "accept" | "pickup" | "depart" | "deliver" | "issue",
  reason?: string,
  description?: string,
): Promise<DeliveryTask> {
  return (
    await api.patch<DeliveryTask>(
      `/delivery/tasks/${id}/${action}`,
      reason ? { reason, ...(description ? { description } : {}) } : undefined,
    )
  ).data;
}
export async function resolveDeliveryIssue(
  id: string,
  action: "resume" | "return" | "fail",
): Promise<DeliveryTask> {
  return (await api.patch<DeliveryTask>(`/delivery/tasks/${id}/${action}`)).data;
}

export async function startPreparation(orderId: string): Promise<Order> {
  const { data } = await api.patch<Order>(`/kitchen/orders/${orderId}/start`);
  return data;
}

export async function markReady(orderId: string): Promise<Order> {
  const { data } = await api.patch<Order>(`/kitchen/orders/${orderId}/ready`);
  return data;
}

export async function markDelivered(orderId: string): Promise<Order> {
  const { data } = await api.patch<Order>(`/orders/${orderId}/status`, {
    status: "DELIVERED",
  });
  return data;
}

/** Met la commande en attente et crée un incident opérationnel. */
export async function reportOrderIncident(
  orderId: string,
  reason: string,
  description: string,
): Promise<DeliveryTask> {
  const { data } = await api.patch<DeliveryTask>(`/delivery/orders/${orderId}/issue`, {
    reason,
    description,
  });
  return data;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>("/orders/dashboard/stats");
  return data;
}
