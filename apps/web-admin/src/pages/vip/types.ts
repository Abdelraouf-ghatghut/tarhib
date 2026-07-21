export type TaskStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED";

export interface VipTask {
  id: string;
  productId: string;
  branchId: string;
  companyId: string;
  locationName: string | null;
  requestedQty: number;
  status: TaskStatus;
  assignedAgentId: string | null;
  completedBy: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface VipLocation {
  id: string;
  vipLocationId: string;
  productId: string;
  productNameAr: string;
  productNameEn: string;
  locationName: string | null;
  branchId: string;
  companyId: string;
  departmentId: string | null;
  assignedEmployeeId: string | null;
  currentStock: number;
  minThreshold: number;
  maxThreshold: number | null;
  belowThreshold: boolean;
  openTaskId: string | null;
}

export interface GroupedLocation {
  vipLocationId: string;
  companyId: string;
  branchId: string;
  departmentId: string | null;
  assignedEmployeeId: string | null;
  locationName: string | null;
  products: VipLocation[];
}

export interface NamedEntity {
  id: string;
  nameAr: string;
  nameEn: string;
  companyId?: string;
  branchId?: string;
}

export interface Employee {
  id: string;
  firstNameAr: string;
  lastNameAr: string;
  firstNameEn: string;
  lastNameEn: string;
  email: string;
  companyId: string | null;
}

export interface VipProduct {
  id: string;
  nameAr: string;
  nameEn: string;
  type: string;
  isVipSelfService: boolean;
}

export const STATUS_COLOR: Record<TaskStatus, string> = {
  OPEN: "orange",
  IN_PROGRESS: "blue",
  COMPLETED: "green",
};

/** Action en attente de zone source (compléter une tâche ou réapprovisionner un emplacement). */
export interface ZoneAction {
  kind: "task" | "location";
  id: string;
}
