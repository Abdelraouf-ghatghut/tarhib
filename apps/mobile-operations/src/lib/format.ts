import { useAuthStore, type CatalogProduct, type Copy, type Lang } from "@tarhib/mobile-shared";

export type EmployeeProfile = ReturnType<typeof useAuthStore.getState>["employee"];

export function arOrEn(lang: Lang, arabic: string, english: string): string {
  return lang === "ar" ? arabic : english;
}

export function operationsStatusLabel(status: string, lang: Lang): string {
  const labels: Record<string, [string, string]> = {
    PENDING: ["قيد الانتظار", "Pending"],
    ASSIGNED: ["مسندة", "Assigned"],
    IN_PROGRESS: ["قيد التنفيذ", "In progress"],
    DONE: ["مكتملة", "Completed"],
    COMPLETED: ["مكتملة", "Completed"],
    VERIFIED: ["معتمدة", "Verified"],
    CANCELLED: ["ملغاة", "Cancelled"],
    AVAILABLE: ["متاحة", "Available"],
    PICKED_UP: ["تم الاستلام", "Picked up"],
    OUT_FOR_DELIVERY: ["قيد التوصيل", "Out for delivery"],
    ISSUE_REPORTED: ["تم الإبلاغ عن مشكلة", "Issue reported"],
    REQUESTED: ["مطلوبة", "Requested"],
    APPROVED: ["موافق عليها", "Approved"],
    FULFILLED: ["تم التزويد", "Fulfilled"],
    OPEN: ["مفتوحة", "Open"],
    READY: ["جاهزة", "Ready"],
  };
  const value = labels[status];
  return value ? arOrEn(lang, value[0], value[1]) : status;
}

export function orderCode(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

export function formatDateTime(iso: string | null, lang: Lang): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16);
  }
}

export function formatMinutesUntil(iso: string, copy: Copy): string {
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (minutes < 0) return `${Math.abs(minutes)} ${copy.minutesLate}`;
  if (minutes < 60) return `${minutes} ${copy.minutesShort}`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function productName(
  product: CatalogProduct | undefined,
  lang: Lang,
  _fallbackId: string,
): string {
  if (!product) return arOrEn(lang, "منتج غير معروف", "Unknown product");
  return lang === "ar" ? product.nameAr : (product.nameEn ?? product.nameAr);
}

export function displayEmployeeName(employee: EmployeeProfile, copy: Copy): string {
  if (!employee) return copy.operationsAgent;
  return employee.firstNameEn || employee.firstNameAr || employee.email || copy.operationsAgent;
}
