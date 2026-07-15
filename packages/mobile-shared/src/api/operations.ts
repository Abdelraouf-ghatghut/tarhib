import { api } from "./client";
import type { StockZone } from "./inventory";

export interface InventoryTransfer {
  id: string;
  productId: string;
  fromZone: StockZone;
  toZone: StockZone;
  quantity: number;
  status: string;
  createdAt: string;
}
export interface VipTask {
  id: string;
  productId: string;
  locationName: string | null;
  requestedQty: number;
  status: string;
  createdAt: string;
}
export interface PurchaseOrder {
  id: string;
  supplierId: string;
  status: string;
  createdAt: string;
  lines: Array<{ id: string; productId: string; orderedQty: number; receivedQty: number }>;
}
export interface Supplier {
  id: string;
  nameAr: string;
  nameEn: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
}
export interface OperationsTeamMember {
  id: string;
  firstNameAr: string;
  firstNameEn: string;
  lastNameAr: string;
  lastNameEn: string;
  branchId: string | null;
  activeTaskCount: number;
}
export interface PurchaseOrderInput {
  companyId: string;
  branchId: string;
  supplierId: string;
  notes?: string;
  lines: Array<{ productId: string; orderedQty: number; unitCost?: number; notes?: string }>;
}
export interface CleaningTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  assignedEmployeeId: string | null;
}
export interface CleaningProduct {
  id: string;
  nameAr: string;
  nameEn: string;
  category: string;
  unit: string;
}
export interface CleaningStockItem {
  id: string;
  companyId: string;
  branchId: string;
  cleaningProductId: string;
  quantity: number;
  minThreshold: number;
  maxThreshold: number | null;
  locationName: string | null;
}
export interface CleaningStockRequest {
  id: string;
  cleaningProductId: string;
  requestedQty: number;
  status: string;
  note: string | null;
  createdAt: string;
}
export interface ReplenishmentRequest {
  id: string;
  productId: string;
  requestedQty: number;
  status: string;
  transferId: string | null;
}
export interface MeetingPreparation {
  id: string;
  bookingId: string;
  status: string;
  assignedEmployeeId: string | null;
  checklist: Array<{ key: string; label: string; done: boolean }>;
  booking: { startTime: string; endTime: string; roomId: string } | null;
}
export interface PersistentNotification {
  id: string;
  domain: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  referenceId: string | null;
  data: Record<string, string> | null;
  readAt: string | null;
  createdAt: string;
}

export const fetchInventoryTransfers = async (): Promise<InventoryTransfer[]> =>
  (await api.get<InventoryTransfer[]>("/inventory-transfers")).data;
export const confirmInventoryTransfer = async (id: string): Promise<InventoryTransfer> =>
  (await api.patch<InventoryTransfer>(`/inventory-transfers/${id}/confirm`)).data;
export const fetchVipTasks = async (): Promise<VipTask[]> =>
  (await api.get<VipTask[]>("/vip-self-service/tasks")).data;
export const completeVipTask = async (id: string): Promise<VipTask> =>
  (await api.patch<VipTask>(`/vip-self-service/tasks/${id}/complete`)).data;
export const fetchPurchaseOrders = async (): Promise<PurchaseOrder[]> =>
  (await api.get<PurchaseOrder[]>("/procurement")).data;
export const fetchSuppliers = async (): Promise<Supplier[]> =>
  (await api.get<Supplier[]>("/suppliers")).data;
export const fetchOperationsTeam = async (): Promise<OperationsTeamMember[]> =>
  (await api.get<OperationsTeamMember[]>("/operations/team")).data;
export const createPurchaseOrder = async (input: PurchaseOrderInput): Promise<PurchaseOrder> =>
  (await api.post<PurchaseOrder>("/procurement", input)).data;
export const updatePurchaseOrder = async (
  id: string,
  input: Omit<PurchaseOrderInput, "companyId" | "branchId">,
): Promise<PurchaseOrder> => (await api.patch<PurchaseOrder>(`/procurement/${id}`, input)).data;
export const rejectPurchaseOrder = async (id: string, reason: string): Promise<PurchaseOrder> =>
  (await api.patch<PurchaseOrder>(`/procurement/${id}/reject`, { reason })).data;
export type PurchaseOrderAction = "submit" | "validate" | "send" | "cancel";
export const transitionPurchaseOrder = async (
  id: string,
  action: PurchaseOrderAction,
): Promise<PurchaseOrder> => (await api.patch<PurchaseOrder>(`/procurement/${id}/${action}`)).data;
export const receivePurchaseOrder = async (
  id: string,
  lines: Array<{ lineId: string; receivedQty: number }>,
): Promise<PurchaseOrder> =>
  (await api.patch<PurchaseOrder>(`/procurement/${id}/receive`, { lines })).data;
export const fetchCleaningTasks = async (): Promise<CleaningTask[]> =>
  (await api.get<CleaningTask[]>("/cleaning/tasks")).data;
export const startCleaningTask = async (id: string): Promise<CleaningTask> =>
  (await api.patch<CleaningTask>(`/cleaning/tasks/${id}/start`)).data;
export const completeCleaningTask = async (id: string): Promise<CleaningTask> =>
  (await api.patch<CleaningTask>(`/cleaning/tasks/${id}/complete`)).data;
export const createCleaningTask = async (input: {
  companyId: string;
  branchId: string;
  title: string;
  description?: string;
  assignedEmployeeId?: string;
  dueDate?: string;
}): Promise<CleaningTask> => (await api.post<CleaningTask>("/cleaning/tasks", input)).data;
export const assignCleaningTask = async (id: string, employeeId: string): Promise<CleaningTask> =>
  (await api.patch<CleaningTask>(`/cleaning/tasks/${id}/assign`, { employeeId })).data;
export const fetchCleaningProducts = async (): Promise<CleaningProduct[]> =>
  (await api.get<CleaningProduct[]>("/cleaning/products")).data;
export const fetchCleaningStock = async (): Promise<CleaningStockItem[]> =>
  (await api.get<CleaningStockItem[]>("/cleaning/stock")).data;
export const requestCleaningStock = async (input: {
  companyId: string;
  branchId: string;
  cleaningProductId: string;
  requestedQty: number;
  note?: string;
}) => (await api.post("/cleaning/stock-requests", input)).data;
export const fetchCleaningStockRequests = async (): Promise<CleaningStockRequest[]> =>
  (await api.get<CleaningStockRequest[]>("/cleaning/stock-requests")).data;
export const transitionCleaningStockRequest = async (
  id: string,
  action: "approve" | "fulfill",
): Promise<CleaningStockRequest> =>
  (await api.patch<CleaningStockRequest>(`/cleaning/stock-requests/${id}/${action}`)).data;
export const createReplenishmentRequest = async (input: {
  companyId: string;
  branchId: string;
  productId: string;
  requestedQty: number;
  note?: string;
}): Promise<ReplenishmentRequest> =>
  (await api.post<ReplenishmentRequest>("/inventory-replenishments", input)).data;
export const fetchReplenishmentRequests = async (): Promise<ReplenishmentRequest[]> =>
  (await api.get<ReplenishmentRequest[]>("/inventory-replenishments")).data;
export const transitionReplenishment = async (
  id: string,
  action: "approve" | "fulfill" | "reject",
): Promise<ReplenishmentRequest> =>
  (await api.patch<ReplenishmentRequest>(`/inventory-replenishments/${id}/${action}`)).data;
export const fetchMeetingPreparations = async (): Promise<MeetingPreparation[]> =>
  (await api.get<MeetingPreparation[]>("/meeting-preparations")).data;
export const transitionMeetingPreparation = async (
  id: string,
  action: "start" | "ready" | "complete" | "verify",
): Promise<MeetingPreparation> =>
  (await api.patch<MeetingPreparation>(`/meeting-preparations/${id}/${action}`)).data;
export const toggleMeetingChecklist = async (
  id: string,
  key: string,
): Promise<MeetingPreparation> =>
  (await api.patch<MeetingPreparation>(`/meeting-preparations/${id}/checklist/${key}`)).data;
export const assignMeetingPreparation = async (
  id: string,
  employeeId: string,
): Promise<MeetingPreparation> =>
  (await api.patch<MeetingPreparation>(`/meeting-preparations/${id}/assign`, { employeeId })).data;
export const fetchNotifications = async (): Promise<PersistentNotification[]> =>
  (await api.get<PersistentNotification[]>("/notifications")).data;
export const markNotificationRead = async (id: string): Promise<void> => {
  await api.patch(`/notifications/${id}/read`);
};
export const markAllNotificationsRead = async (): Promise<void> => {
  await api.patch("/notifications/read-all");
};
