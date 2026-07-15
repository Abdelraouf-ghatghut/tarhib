import { api } from "./client";

// Aligné sur apps/backend/src/inventory/dto/inventory.dto.ts
export type StockZone = "CENTRAL" | "BRANCH" | "KITCHEN";

export type AdjustmentType = "SORTIE" | "AJUSTEMENT";

export interface InventoryItem {
  id: string;
  companyId: string;
  branchId: string;
  productId: string;
  zone: StockZone;
  quantity: number;
  minThreshold: number;
  maxThreshold: number | null;
  locationName: string | null;
  departmentId: string | null;
  assignedEmployeeId: string | null;
  belowThreshold: boolean;
}

export async function fetchInventory(filters?: {
  companyId?: string;
  branchId?: string;
  zone?: StockZone;
}): Promise<InventoryItem[]> {
  const { data } = await api.get<InventoryItem[]>("/inventory", {
    params: filters,
  });
  return data;
}

export async function fetchLowStockAlerts(
  companyId: string,
  branchId?: string,
): Promise<InventoryItem[]> {
  const { data } = await api.get<InventoryItem[]>("/inventory/alerts/below-threshold", {
    params: { companyId, branchId },
  });
  return data;
}

/**
 * Ajustement de stock : SORTIE retire `quantity`, AJUSTEMENT fixe la valeur
 * absolue. L'historisation est faite côté serveur (TARHIB-41).
 */
export async function adjustInventory(
  itemId: string,
  type: AdjustmentType,
  quantity: number,
  reason: string,
): Promise<InventoryItem> {
  const { data } = await api.post<InventoryItem>(`/inventory/${itemId}/adjust`, {
    type,
    quantity,
    reason,
  });
  return data;
}
