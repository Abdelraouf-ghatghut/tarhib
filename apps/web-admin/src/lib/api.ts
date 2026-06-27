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
};

export const productsApi = {
  list: () => api.get("/products"),
  create: (d: unknown) => api.post("/products", d),
  update: (id: string, d: unknown) => api.patch(`/products/${id}`, d),
  remove: (id: string) => api.delete(`/products/${id}`),
};

export const inventoryApi = {
  list: (branchId?: string) => api.get("/inventory", { params: branchId ? { branchId } : {} }),
  update: (id: string, d: unknown) => api.patch(`/inventory/${id}`, d),
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
