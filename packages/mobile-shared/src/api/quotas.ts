import { api } from "./client";

// Aligné sur GET /mobile/quotas (apps/backend/src/mobile/mobile.controller.ts)
export interface MobileQuota {
  productId: string;
  maxQuantity: number;
  usedQuantity: number;
  remaining: number;
}

/** Quotas restants de l'employé connecté, par produit. */
export async function fetchMyQuotas(): Promise<MobileQuota[]> {
  const { data } = await api.get<MobileQuota[]>("/mobile/quotas");
  return data;
}
