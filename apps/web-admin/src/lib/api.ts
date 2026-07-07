import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// withCredentials : le refresh token vit dans un cookie HttpOnly (posé par
// /auth/login, lu par /auth/refresh et /auth/logout) — jamais dans localStorage
export const api = axios.create({ baseURL: BASE_URL, withCredentials: true });

export function setAuthToken(token: string) {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

export function clearAuthToken() {
  delete api.defaults.headers.common["Authorization"];
}

// ── Resource helpers ───────────────────────────────────────────────────────

export const companiesApi = {
  list: () => api.get("/companies"),
  create: (d: unknown) => api.post("/companies", d),
  update: (id: string, d: unknown) => api.patch(`/companies/${id}`, d),
  remove: (id: string) => api.delete(`/companies/${id}`),
};

export const branchesApi = {
  list: (companyId?: string) => api.get("/branches", { params: companyId ? { companyId } : {} }),
  create: (d: unknown) => api.post("/branches", d),
  update: (id: string, d: unknown) => api.patch(`/branches/${id}`, d),
  remove: (id: string) => api.delete(`/branches/${id}`),
};

export const departmentsApi = {
  list: (params?: Record<string, string>) => api.get("/departments", { params }),
  create: (d: unknown) => api.post("/departments", d),
  update: (id: string, d: unknown) => api.patch(`/departments/${id}`, d),
  remove: (id: string) => api.delete(`/departments/${id}`),
};

export const employeesApi = {
  list: (params?: Record<string, string>) => api.get("/employees", { params }),
  create: (d: unknown) => api.post("/employees", d),
  update: (id: string, d: unknown) => api.patch(`/employees/${id}`, d),
  remove: (id: string) => api.delete(`/employees/${id}`),
  deactivate: (id: string) => api.patch(`/employees/${id}/deactivate`),
};

export const productsApi = {
  list: () => api.get("/products"),
  create: (d: unknown) => api.post("/products", d),
  update: (id: string, d: unknown) => api.patch(`/products/${id}`, d),
  remove: (id: string) => api.delete(`/products/${id}`),
};

export const inventoryApi = {
  list: (params?: Record<string, string>) => api.get("/inventory", { params }),
  create: (d: unknown) => api.post("/inventory", d),
  update: (id: string, d: unknown) => api.patch(`/inventory/${id}`, d),
  adjust: (id: string, d: unknown) => api.post(`/inventory/${id}/adjust`, d),
  alerts: (params?: Record<string, string>) =>
    api.get("/inventory/alerts/below-threshold", { params }),
};

// Fournisseurs : ressource Tarhib globale, non liée à une société cliente.
export const suppliersApi = {
  list: () => api.get("/suppliers"),
  create: (d: unknown) => api.post("/suppliers", d),
  update: (id: string, d: unknown) => api.patch(`/suppliers/${id}`, d),
  remove: (id: string) => api.delete(`/suppliers/${id}`),
  productPrices: (supplierId: string) => api.get(`/suppliers/${supplierId}/product-prices`),
  setProductPrices: (supplierId: string, prices: unknown[]) =>
    api.put(`/suppliers/${supplierId}/product-prices`, { prices }),
};

export const procurementApi = {
  list: (params?: Record<string, string>) => api.get("/procurement", { params }),
  one: (id: string) => api.get(`/procurement/${id}`),
  create: (d: unknown) => api.post("/procurement", d),
  submit: (id: string) => api.patch(`/procurement/${id}/submit`),
  validate: (id: string) => api.patch(`/procurement/${id}/validate`),
  reject: (id: string, reason: string) => api.patch(`/procurement/${id}/reject`, { reason }),
  send: (id: string) => api.patch(`/procurement/${id}/send`),
  cancel: (id: string) => api.patch(`/procurement/${id}/cancel`),
  receive: (id: string, d: unknown) => api.patch(`/procurement/${id}/receive`, d),
};

export const productsAdminApi = {
  list: () => api.get("/products/admin"),
};

export const vipSelfServiceApi = {
  locations: (params?: Record<string, string>) =>
    api.get("/vip-self-service/locations", { params }),
  createLocation: (d: unknown) => api.post("/vip-self-service/locations", d),
  addProduct: (locationId: string, d: unknown) =>
    api.post(`/vip-self-service/locations/${locationId}/products`, d),
  removeProduct: (locationProductId: string) =>
    api.delete(`/vip-self-service/location-products/${locationProductId}`),
  adjustProduct: (locationProductId: string, d: unknown) =>
    api.patch(`/vip-self-service/location-products/${locationProductId}`, d),
  replenish: (locationProductId: string) =>
    api.patch(`/vip-self-service/locations/${locationProductId}/replenish`),
  tasks: (params?: Record<string, string>) => api.get("/vip-self-service/tasks", { params }),
  completeTask: (taskId: string) => api.patch(`/vip-self-service/tasks/${taskId}/complete`),
};

export const inventoryTransfersApi = {
  list: (params?: Record<string, string>) => api.get("/inventory-transfers", { params }),
  create: (d: unknown) => api.post("/inventory-transfers", d),
  confirm: (id: string) => api.patch(`/inventory-transfers/${id}/confirm`),
  cancel: (id: string) => api.patch(`/inventory-transfers/${id}/cancel`),
};

export const ordersApi = {
  list: (params?: Record<string, string>) => api.get("/orders", { params }),
  one: (id: string) => api.get(`/orders/${id}`),
  updateStatus: (id: string, status: string) => api.patch(`/orders/${id}/status`, { status }),
};

export const quotasApi = {
  list: (params?: Record<string, string>) => api.get("/quotas", { params }),
  create: (d: unknown) => api.post("/quotas", d),
  update: (id: string, d: unknown) => api.patch(`/quotas/${id}`, d),
  remove: (id: string) => api.delete(`/quotas/${id}`),
};

export const reportingApi = {
  orders: (params?: Record<string, string>) => api.get("/reports/orders", { params }),
  inventory: (params?: Record<string, string>) => api.get("/reports/inventory", { params }),
  sla: (params?: Record<string, string>) => api.get("/reports/sla", { params }),
  userActivity: (params?: Record<string, string>) => api.get("/reports/user-activity", { params }),
  meetingRooms: (params?: Record<string, string>) => api.get("/reports/meeting-rooms", { params }),
  purchasing: (params?: Record<string, string>) => api.get("/reports/purchasing", { params }),
  inventoryDetail: (params?: Record<string, string>) =>
    api.get("/reports/inventory-detail", { params }),
  executive: (params?: Record<string, string>) => api.get("/reports/executive", { params }),
};

export const rolesApi = {
  list: () => api.get("/roles"),
  create: (d: unknown) => api.post("/roles", d),
  update: (id: string, d: unknown) => api.patch(`/roles/${id}`, d),
  remove: (id: string) => api.delete(`/roles/${id}`),
};

export const slaLevelsApi = {
  list: (companyId: string) => api.get("/sla-levels", { params: { companyId } }),
  save: (companyId: string, levels: unknown[]) => api.put(`/sla-levels/${companyId}`, { levels }),
};

export const permissionsApi = {
  list: (scope?: string) => api.get("/permissions", { params: scope ? { scope } : {} }),
};

export const meetingRoomsAdminApi = {
  list: (companyId?: string) =>
    api.get("/meeting-rooms/admin/all", { params: companyId ? { companyId } : {} }),
  create: (d: unknown) => api.post("/meeting-rooms", d),
  update: (id: string, d: unknown) => api.patch(`/meeting-rooms/${id}`, d),
  remove: (id: string) => api.delete(`/meeting-rooms/${id}`),
  getBookings: (roomId: string) => api.get(`/meeting-rooms/${roomId}/bookings`),
};

export const meetingServicePackagesApi = {
  list: (companyId?: string) =>
    api.get("/meeting-service-packages/admin/all", { params: companyId ? { companyId } : {} }),
  create: (d: unknown) => api.post("/meeting-service-packages", d),
  update: (id: string, d: unknown) => api.patch(`/meeting-service-packages/${id}`, d),
  remove: (id: string) => api.delete(`/meeting-service-packages/${id}`),
};

export const auditApi = {
  list: (params?: {
    entity?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => api.get("/audit", { params }),
};

export const registrationsApi = {
  listPending: (companyId?: string) =>
    api.get("/auth/pending-registrations", { params: companyId ? { companyId } : {} }),
  approve: (id: string) => api.patch(`/auth/registrations/${id}/approve`),
  reject: (id: string) => api.patch(`/auth/registrations/${id}/reject`),
  invite: (d: unknown) => api.post("/auth/invite", d),
};
