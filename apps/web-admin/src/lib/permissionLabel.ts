export interface LocalizedPermission {
  key: string;
  nameAr?: string | null;
  nameEn?: string | null;
}

/**
 * Arabic permission catalogue keyed by the immutable backend permission key.
 * Keeping UI labels independent from seeded database text also fixes existing
 * installations whose old Arabic seed values were stored with bad encoding.
 */
const ARABIC_PERMISSION_LABELS: Record<string, string> = {
  "company.manage": "إدارة الشركات",
  "branch.manage": "إدارة الفروع",
  "employee.manage": "إدارة الموظفين",
  "employee.salary.manage": "إدارة رواتب الموظفين",
  "employee.impersonate": "تسجيل الدخول كموظف",
  "role.manage": "إدارة الأدوار",
  "role.impersonate": "تجربة دور آخر",
  "report.view": "عرض التقارير",
  "procurement.cost.view": "عرض تكاليف المشتريات",
  "procurement.view": "عرض المشتريات",
  "procurement.manage": "إدارة المشتريات",
  "procurement.validate": "تدقيق المشتريات",
  "procurement.reject": "رفض المشتريات",
  "procurement.create": "إنشاء أوامر الشراء",
  "procurement.edit_draft": "تعديل مسودات أوامر الشراء",
  "procurement.submit": "تقديم أوامر الشراء",
  "procurement.send": "إرسال أوامر الشراء",
  "procurement.cancel": "إلغاء أوامر الشراء",
  "procurement.receive": "استلام أوامر الشراء",
  "finance.view": "عرض المالية",
  "finance.manage": "إدارة المالية",
  "accounting.view": "عرض المحاسبة العامة",
  "accounting.manage": "إدارة المحاسبة العامة",
  "hr.leave.manage": "إدارة الإجازات",
  "hr.leave.approve": "الموافقة على الإجازات",
  "hr.contract.manage": "إدارة عقود العمل",
  "hr.review.manage": "إدارة تقييمات الأداء",
  "operations.dashboard.view": "عرض لوحة العمليات",
  "operations.branch.supervise": "الإشراف على الفرع",
  "operations.global.supervise": "الإشراف العام على العمليات",
  "order.queue.view": "عرض قائمة الطلبات",
  "order.queue.manage": "إدارة قائمة الطلبات",
  "order.prepare": "تحضير الطلبات",
  "order.deliver": "توصيل الطلبات",
  "order.stockout.report": "الإبلاغ عن نفاد المخزون",
  "order.create": "إنشاء طلب",
  "order.view_own": "عرض طلباتي",
  "order.reorder": "إعادة الطلب",
  "order.approve": "الموافقة على الطلبات",
  "stock.kitchen.view": "عرض مخزون المطبخ",
  "stock.kitchen.request": "طلب تزويد المطبخ",
  "stock.view": "عرض المخزون",
  "stock.manage": "إدارة المخزون",
  "stock.transfer": "تحويل المخزون",
  "inventory.manage": "إدارة المخزون",
  "inventory.view": "عرض المخزون",
  "inventory.create": "إنشاء عناصر المخزون",
  "inventory.update": "تحديث عناصر المخزون",
  "inventory.adjust": "تعديل كميات المخزون",
  "inventory.transfer.view": "عرض تحويلات المخزون",
  "inventory.transfer.create": "إنشاء تحويلات المخزون",
  "inventory.transfer.confirm": "تأكيد تحويلات المخزون",
  "inventory.transfer.cancel": "إلغاء تحويلات المخزون",
  "vip.manage": "إدارة مخزون VIP",
  "vip.view": "عرض VIP",
  "vip.location.view": "عرض مواقع VIP",
  "vip.location.manage": "إدارة مواقع VIP",
  "vip.task.view": "عرض مهام تزويد VIP",
  "vip.task.complete": "إنجاز مهام تزويد VIP",
  "cleaning.task.view": "عرض مهام التنظيف",
  "cleaning.task.manage": "إدارة مهام التنظيف",
  "cleaning.task.assign": "إسناد مهام التنظيف",
  "cleaning.task.complete": "إنجاز مهامي في التنظيف",
  "cleaning.product.view": "عرض منتجات النظافة",
  "cleaning.product.manage": "إدارة منتجات النظافة",
  "cleaning.product.request": "طلب إعادة تزويد منتجات النظافة",
  "alert.view": "عرض التنبيهات",
  "meeting.preparation.view": "عرض تجهيزات الاجتماعات",
  "meeting.preparation.execute": "تنفيذ تجهيزات الاجتماعات",
  "meeting.preparation.manage": "إدارة تجهيزات الاجتماعات",
  "meeting.book": "حجز قاعة اجتماعات",
  "meeting.order_services": "طلب خدمات الاجتماع",
  "meeting.manage": "إدارة الاجتماعات",
  "catalog.view": "عرض الكتالوج",
  "favorite.manage": "إدارة المفضلة",
  "quota.view": "عرض الحصص",
  "notification.view": "عرض الإشعارات",
  "profile.manage": "إدارة الملف الشخصي",
  "profile.edit": "تعديل الملف الشخصي",
};

export function permissionLabel(permission: LocalizedPermission, isArabic: boolean): string {
  if (isArabic) {
    return ARABIC_PERMISSION_LABELS[permission.key] ?? permission.nameAr?.trim() ?? permission.key;
  }
  return permission.nameEn?.trim() ?? permission.nameAr?.trim() ?? permission.key;
}

