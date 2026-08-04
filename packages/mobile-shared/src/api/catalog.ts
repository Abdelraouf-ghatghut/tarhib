import AsyncStorage from "@react-native-async-storage/async-storage";

import { api } from "./client";
import { fetchMyQuotas, type MobileQuota } from "./quotas";
import { useAuthStore } from "../store/auth-store";

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

interface CatalogVersion {
  version: string;
  updatedAt: string;
}

interface CatalogSnapshot extends CatalogVersion {
  products: MobileProduct[];
}

interface CachedCatalog {
  version: string;
  products: MobileProduct[];
}

const CATALOG_CACHE_PREFIX = "tarhib_catalog_v1";

function catalogCacheKey(): string {
  const auth = useAuthStore.getState();
  const scope = [
    auth.employee?.id ?? auth.email ?? "anonymous",
    auth.roleId ?? auth.role ?? "no-role",
    auth.branchId ?? "no-branch",
  ]
    .join(":")
    .replace(/[^a-zA-Z0-9:_-]/g, "_");
  return `${CATALOG_CACHE_PREFIX}:${scope}`;
}

async function readCachedCatalog(key: string): Promise<CachedCatalog | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedCatalog>;
    if (!parsed.version || !Array.isArray(parsed.products)) return null;
    return parsed as CachedCatalog;
  } catch {
    return null;
  }
}

async function fetchStaticCatalog(): Promise<MobileProduct[]> {
  const key = catalogCacheKey();
  const cachedPromise = readCachedCatalog(key);

  try {
    const [{ data: remoteVersion }, cached] = await Promise.all([
      api.get<CatalogVersion>("/products/version"),
      cachedPromise,
    ]);
    if (cached?.version === remoteVersion.version) return cached.products;

    const { data: snapshot } = await api.get<CatalogSnapshot>("/products/snapshot");
    await AsyncStorage.setItem(
      key,
      JSON.stringify({
        version: snapshot.version,
        products: snapshot.products,
      } satisfies CachedCatalog),
    );
    return snapshot.products;
  } catch (error) {
    const cached = await cachedPromise;
    if (cached) return cached.products;

    // Compatibilité avec un backend pas encore migré, et premier démarrage
    // hors cache : l'ancien endpoint reste une solution de repli.
    try {
      return (await api.get<MobileProduct[]>("/products")).data;
    } catch {
      throw error;
    }
  }
}

export async function fetchEmployeeCatalog(): Promise<CatalogProduct[]> {
  const [products, availabilityRes, quotas] = await Promise.all([
    fetchStaticCatalog(),
    // En mode hors ligne/dégradé, le catalogue statique reste consultable,
    // mais aucun produit n'est présenté comme commandable sans stock frais.
    api
      .get<ProductAvailability[]>("/products/availability")
      .catch(() => ({ data: [] as ProductAvailability[] })),
    // Quotas best-effort : un échec n'empêche pas d'afficher le catalogue.
    fetchMyQuotas().catch(() => [] as MobileQuota[]),
  ]);

  const availabilityByProduct = new Map(availabilityRes.data.map((item) => [item.productId, item]));
  const quotaByProduct = new Map(quotas.map((quota) => [quota.productId, quota]));

  return products.map((product) => {
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
