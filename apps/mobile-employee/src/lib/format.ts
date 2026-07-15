import { Ionicons } from "@expo/vector-icons";
import { AxiosError } from "axios";

import {
  rejectionReasonLabel,
  useAuthStore,
  type CatalogProduct,
  type Lang,
  type OrderStatus,
} from "@tarhib/mobile-shared";

export type IconName = keyof typeof Ionicons.glyphMap;
export type EmployeeProfile = ReturnType<typeof useAuthStore.getState>["employee"];

export type OrderGroup = "active" | "done" | "rejected";

export function orderGroup(status: OrderStatus): OrderGroup {
  if (status === "REJECTED") return "rejected";
  if (status === "DELIVERED") return "done";
  return "active";
}

export function orderCode(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

export function formatTime(iso: string | null, lang: Lang): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(11, 16);
  }
}

export function formatDateTime(iso: string | null, lang: Lang): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16).replace("T", " ");
  }
}

export function arOrEn(lang: Lang, ar: string, en: string): string {
  return lang === "ar" ? ar : en;
}

export function displayEmployeeName(employee: NonNullable<EmployeeProfile>, lang: Lang): string {
  if (lang === "ar") return `${employee.firstNameAr} ${employee.lastNameAr}`;
  return `${employee.firstNameEn} ${employee.lastNameEn}`;
}

export function productLabel(product: CatalogProduct, lang: Lang): string {
  if (lang === "ar") return product.nameAr;
  return product.nameEn || product.nameAr;
}

/**
 * Sous-titre affiché sous le nom sur les cartes boissons (variantes café).
 * Anglais uniquement : les noms arabes (قهوة سادة/معدلة) portent déjà la
 * nuance sans/avec sucre, un sous-titre AR serait redondant.
 */
export function productSubtitle(product: CatalogProduct, lang: Lang): string | null {
  if (lang === "ar") return null;
  if (product.nameEn === "Black Coffee") return "No sugar";
  if (product.nameEn === "Coffee") return "With sugar";
  return null;
}

export function quotaLabel(product: CatalogProduct, lang: Lang): string {
  if (product.quotaMax === null || product.quotaRemaining === null) {
    return arOrEn(lang, "الحصة غير محددة", "No quota configured");
  }
  return arOrEn(
    lang,
    `الحصة المتبقية ${product.quotaRemaining} من ${product.quotaMax}`,
    `${product.quotaRemaining}/${product.quotaMax} remaining`,
  );
}

export function iconForProduct(product: CatalogProduct): IconName {
  const haystack = `${product.nameEn ?? ""} ${product.nameAr} ${product.category}`.toLowerCase();
  if (
    haystack.includes("coffee") ||
    haystack.includes("espresso") ||
    haystack.includes("cappuccino")
  )
    return "cafe";
  if (haystack.includes("tea")) return "leaf";
  if (haystack.includes("water") || haystack.includes("juice")) return "water";
  if (haystack.includes("sandwich") || haystack.includes("salad") || haystack.includes("meal"))
    return "fast-food";
  if (haystack.includes("cookie") || haystack.includes("croissant")) return "restaurant";
  return "cube";
}

export function categoryIcon(category: string): IconName {
  const normalized = category.toLowerCase();
  if (normalized === "all") return "grid";
  if (normalized.includes("coffee") || normalized.includes("hot")) return "cafe";
  if (normalized.includes("juice") || normalized.includes("cold")) return "water";
  if (normalized.includes("meal") || normalized.includes("sandwich")) return "fast-food";
  if (normalized.includes("sweet") || normalized.includes("dessert")) return "ice-cream";
  return "restaurant";
}

export function categoryLabel(category: string, lang: Lang): string {
  if (category === "All") return arOrEn(lang, "الكل", "All");
  if (category === "Drinks") return arOrEn(lang, "مشروبات", "Drinks");
  return category;
}

export function orderErrorMessage(
  err: unknown,
  lang: Lang,
  productsById: Map<string, CatalogProduct>,
): string {
  if (err instanceof AxiosError) {
    if (err.response?.status === 422) {
      const data = err.response.data as {
        rejectedLines?: Array<{ productId: string; reason?: string }>;
      };
      const details = (data.rejectedLines ?? [])
        .map((line) => {
          const product = productsById.get(line.productId);
          const name = product ? productLabel(product, lang) : line.productId.slice(0, 8);
          return `${name}: ${rejectionReasonLabel(line.reason ?? null, lang)}`;
        })
        .join(lang === "ar" ? "، " : ", ");
      const base = arOrEn(lang, "تعذر قبول الطلب", "The order was rejected");
      return details ? `${base} — ${details}` : base;
    }
    if (!err.response) {
      return arOrEn(
        lang,
        "تعذر الوصول إلى الخادم. تحقق من الاتصال",
        "Unable to reach the server. Check your connection",
      );
    }
  }
  return arOrEn(lang, "تعذر إرسال الطلب. حاول مرة أخرى", "Unable to send the order. Try again");
}
