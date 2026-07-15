import { api } from "./client";
import { fetchMyQuotas, type MobileQuota } from "./quotas";

export interface MobileProduct {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  category: string;
  type: "COMMANDABLE" | "LIBRE_SERVICE_VIP";
  allowedRoles?: string[] | null;
  imageUrl?: string | null;
  active: boolean;
}

export interface ProductAvailability {
  productId: string;
  quantity: number;
  available: boolean;
}

export interface CatalogProduct extends MobileProduct {
  availableQuantity: number;
  available: boolean;
  stockStatus: "available" | "limited" | "unavailable";
  quotaRemaining: number | null;
  quotaMax: number | null;
}

export async function fetchEmployeeCatalog(): Promise<CatalogProduct[]> {
  const [productsRes, availabilityRes, quotas] = await Promise.all([
    api.get<MobileProduct[]>("/products"),
    api.get<ProductAvailability[]>("/products/availability"),
    // Quotas best-effort : un échec n'empêche pas d'afficher le catalogue.
    fetchMyQuotas().catch(() => [] as MobileQuota[]),
  ]);

  const availabilityByProduct = new Map(availabilityRes.data.map((item) => [item.productId, item]));
  const quotaByProduct = new Map(quotas.map((quota) => [quota.productId, quota]));

  return productsRes.data.map((product) => {
    const availability = availabilityByProduct.get(product.id);
    const quantity = availability?.quantity ?? 0;
    const available = availability?.available ?? quantity > 0;
    const quota = quotaByProduct.get(product.id);
    return {
      ...product,
      availableQuantity: quantity,
      available,
      stockStatus: !available ? "unavailable" : quantity <= 10 ? "limited" : "available",
      quotaRemaining: quota?.remaining ?? null,
      quotaMax: quota?.maxQuantity ?? null,
    };
  });
}
