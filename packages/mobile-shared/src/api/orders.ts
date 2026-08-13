import { api } from "./client";

// Aligné sur apps/backend/src/orders/dto/order.dto.ts
export type OrderStatus =
  | "PENDING"
  | "APPROVED"
  | "IN_PROGRESS"
  | "READY"
  | "DELIVERED"
  | "REJECTED"
  | "CANCELLED";

export type LineValidationStatus = "APPROVED" | "REJECTED" | "PENDING_APPROVAL";

// Codes émis par le moteur de validation (§3.3) — clés i18n côté app.
export type LineRejectionReason =
  | "PRODUCT_NOT_COMMANDABLE"
  | "ROLE_NOT_ALLOWED"
  | "BRANCH_NOT_ALLOWED"
  | "INSUFFICIENT_STOCK"
  | "QUOTA_EXCEEDED";

export interface OrderLine {
  id: string;
  productId: string;
  quantity: number;
  validationStatus: LineValidationStatus;
  rejectionReason: LineRejectionReason | string | null;
  preparationStatus: "PENDING" | "DONE" | "SUBSTITUTED" | "OUT_OF_STOCK";
  preparationNote: string | null;
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
  // PR-0.4b : une resoumission (retry manuel après timeout/erreur réseau, cf.
  // le timeout axios de PR-1.8) avec le même clientRequestId est absorbée
  // côté serveur au lieu de créer une commande en double — voir
  // order-request-hash.ts (backend) pour la vérification du contenu.
  clientRequestId?: string;
}

export interface DashboardStats {
  todayOrders: number;
  pendingCount: number;
  deliveredToday: number;
  avgSlaMinutes: number;
  mostOrdered: Array<{ productId: string; name: string; count: number }>;
}

/**
 * PR-0.4b : identifiant de resoumission — pas besoin d'être cryptographique,
 * juste unique par employé (contrainte uq_orders_employee_client_request
 * côté serveur). Pas de dépendance uuid pour ça : Math.random + timestamp
 * suffit largement pour ce cas d'usage.
 */
export function generateClientRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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
    | "ARRIVED"
    | "ISSUE_REPORTED"
    | "DELIVERED"
    | "RETURNED"
    | "FAILED";
  issueReason: string | null;
  issueDescription: string | null;
  createdAt: string;
  updatedAt: string;
  pickedUpAt: string | null;
  arrivedAt: string | null;
  deliveredAt: string | null;
  recipientName: string | null;
  recipientCode: string | null;
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
  action: "accept" | "pickup" | "depart" | "arrive" | "deliver" | "issue",
  reason?: string,
  description?: string,
  proof?: {
    recipientName: string;
    recipientCode?: string;
    clientRequestId: string;
    occurredAt: string;
  },
): Promise<DeliveryTask> {
  return (
    await api.patch<DeliveryTask>(
      `/delivery/tasks/${id}/${action}`,
      proof ?? (reason ? { reason, ...(description ? { description } : {}) } : undefined),
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

export async function reviewOrder(
  orderId: string,
  status: "APPROVED" | "REJECTED",
  reason?: string,
): Promise<Order> {
  const { data } = await api.patch<Order>(`/orders/${orderId}/status`, {
    status,
    ...(reason?.trim() ? { reason: reason.trim() } : {}),
  });
  return data;
}

export async function updatePreparationLine(
  orderId: string,
  lineId: string,
  status: OrderLine["preparationStatus"],
  note?: string,
): Promise<Order> {
  const { data } = await api.patch<Order>(`/kitchen/orders/${orderId}/lines/${lineId}`, {
    status,
    ...(note?.trim() ? { note: note.trim() } : {}),
  });
  return data;
}

export async function markDelivered(orderId: string): Promise<Order> {
  const { data } = await api.patch<Order>(`/orders/${orderId}/status`, {
    status: "DELIVERED",
  });
  return data;
}

export async function cancelMyOrder(orderId: string): Promise<Order> {
  const { data } = await api.patch<Order>(`/orders/${orderId}/status`, { status: "CANCELLED" });
  return data;
}

export async function submitOrderFeedback(input: {
  companyId: string;
  orderId: string;
  rating: number;
  qualityRating?: number;
  punctualityRating?: number;
  comment?: string;
}): Promise<void> {
  await api.post("/performance-management/feedback", input);
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
