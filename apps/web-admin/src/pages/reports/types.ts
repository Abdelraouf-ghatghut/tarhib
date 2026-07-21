export interface OrdersReport {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
}

export interface InventoryReport {
  total: number;
  belowThreshold: number;
  outOfStock: number;
}

export interface SlaReport {
  total: number;
  onTime: number;
  late: number;
  complianceRate: number;
}

export interface QuotaReport {
  total: number;
  averageConsumptionRate: number;
  nearCapCount: number;
  byProduct: Array<{
    productId: string;
    maxQuantity: number;
    usedQuantity: number;
    consumptionRate: number;
  }>;
  nearCapEmployees: Array<{
    employeeId: string;
    productId: string;
    maxQuantity: number;
    usedQuantity: number;
    consumptionRate: number;
    periodEnd: string;
  }>;
}

export interface UserActivityReport {
  total: number;
  topEmployees: {
    employeeId: string;
    nameAr: string;
    nameEn: string;
    orderCount: number;
  }[];
  ordersByBranch: {
    branchId: string;
    nameAr: string;
    nameEn: string;
    orderCount: number;
  }[];
}

export interface MeetingRoomsReport {
  totalBookings: number;
  confirmed: number;
  cancelled: number;
  cancellationRate: number;
  mostBookedRoomId: string | null;
  avgDurationMinutes: number;
}

export interface PurchasingReport {
  totalSpend: number;
  byProductSupplier: Array<{
    productId: string;
    supplierId: string;
    quantity: number;
    totalCost: number;
  }>;
  bySupplier: Array<{ supplierId: string; quantity: number; totalCost: number }>;
  byProduct: Array<{ productId: string; quantity: number; totalCost: number }>;
}

export interface ExecutiveReport {
  kpis: {
    companiesCount: number;
    branchesCount: number;
    clientEmployeesCount: number;
    ordersCount: number;
    deliveredCount: number;
    pendingCount: number;
    rejectedCount: number;
    slaComplianceRate: number;
    avgDeliveryMinutes: number;
    totalStockValue: number;
    outOfStockCount: number;
    purchasingSpend: number;
  };
  ordersTrend: Array<{ bucket: string; count: number }>;
  slaTrend: Array<{ bucket: string; rate: number }>;
  topCompanies: Array<{
    companyId: string;
    orderCount: number;
    consumption: number;
    slaRate: number;
  }>;
  topProducts: Array<{ productId: string; orderCount: number }>;
}

export interface InventoryDetailRow {
  productId: string;
  branchId: string;
  zone: string;
  locationName: string | null;
  quantity: number;
  minThreshold: number;
  maxThreshold: number | null;
  unitCost: number | null;
  stockValue: number;
}

export interface InventoryDetailReport {
  totalQuantity: number;
  totalStockValue: number;
  byProduct: Array<{ productId: string; quantity: number; stockValue: number }>;
  byProductBranch: Array<{
    productId: string;
    branchId: string;
    quantity: number;
    stockValue: number;
  }>;
  rows: InventoryDetailRow[];
}

export interface EmployeeLite {
  id: string;
  firstNameAr: string;
  lastNameAr: string;
  firstNameEn: string;
  lastNameEn: string;
  email: string;
}

export interface Company {
  id: string;
  nameAr: string;
  nameEn: string;
}

export interface Branch {
  id: string;
  companyId: string;
  nameAr: string;
  nameEn: string;
}

export interface Supplier {
  id: string;
  nameAr: string;
  nameEn: string;
}

export interface ProductAdmin {
  id: string;
  nameAr: string;
  nameEn: string;
}

/** Filtres partagés par tous les onglets (société/branche/période). */
export interface ReportParams {
  companyId?: string;
  branchId?: string;
  from?: string;
  to?: string;
}

export const STATUS_COLORS: Record<string, string> = {
  PENDING: "orange",
  APPROVED: "blue",
  IN_PROGRESS: "processing",
  DELIVERED: "green",
  REJECTED: "red",
};

export const STATUS_KEY: Record<string, string> = {
  PENDING: "pending",
  APPROVED: "approved",
  IN_PROGRESS: "inProgress",
  DELIVERED: "delivered",
  REJECTED: "rejected",
};
