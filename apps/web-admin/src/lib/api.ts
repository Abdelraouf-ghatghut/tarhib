import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const api = axios.create({ baseURL: BASE_URL });

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
  list: (branchId?: string) => api.get("/departments", { params: branchId ? { branchId } : {} }),
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
  list: (branchId?: string) => api.get("/inventory", { params: branchId ? { branchId } : {} }),
  create: (d: unknown) => api.post("/inventory", d),
  update: (id: string, d: unknown) => api.patch(`/inventory/${id}`, d),
  adjust: (id: string, d: unknown) => api.post(`/inventory/${id}/adjust`, d),
  alerts: () => api.get("/inventory/alerts/below-threshold"),
};

export const ordersApi = {
  list: (params?: Record<string, string>) => api.get("/orders", { params }),
  one: (id: string) => api.get(`/orders/${id}`),
  updateStatus: (id: string, status: string) => api.patch(`/orders/${id}/status`, { status }),
};

export const quotasApi = {
  list: () => api.get("/quotas"),
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
};

export const rolesApi = {
  list: () => api.get("/roles"),
  create: (d: unknown) => api.post("/roles", d),
  update: (id: string, d: unknown) => api.patch(`/roles/${id}`, d),
  remove: (id: string) => api.delete(`/roles/${id}`),
  getQuotas: (id: string) => api.get(`/roles/${id}/quotas`),
  setQuota: (id: string, d: unknown) => api.post(`/roles/${id}/quotas`, d),
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

export const registrationsApi = {
  listPending: (companyId?: string) =>
    api.get("/auth/pending-registrations", { params: companyId ? { companyId } : {} }),
  approve: (id: string) => api.patch(`/auth/registrations/${id}/approve`),
  reject: (id: string) => api.patch(`/auth/registrations/${id}/reject`),
  invite: (d: unknown) => api.post("/auth/invite", d),
};
