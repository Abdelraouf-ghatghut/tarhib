import type { Lang } from "./theme";
import type { StockZone } from "./api/inventory";

// Source unique des libellés AR/EN. Consommé à la fois par t() (accès direct
// typé) et par i18next (i18n/index.ts) — ne jamais dupliquer ce dictionnaire.
export const en = {
  appName: "Tarhib",
  employee: "Employee",
  operations: "Operations",
  welcome: "Welcome back",
  signIn: "Sign in",
  email: "Email",
  password: "Password",
  phoneOtp: "Phone OTP",
  catalog: "Catalog",
  favorites: "Favorites",
  cart: "Cart",
  profile: "Profile",
  orders: "Orders",
  rooms: "Rooms",
  search: "Search products",
  quota: "Quota",
  add: "Add",
  total: "Total",
  validateCart: "Validate cart",
  orderTracking: "Order tracking",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  delivered: "Delivered",
  queue: "Queue",
  dashboard: "Dashboard",
  stock: "Stock",
  tasks: "Tasks",
  todayOrders: "Today orders",
  pending: "Pending",
  deliveredToday: "Delivered today",
  stockAlerts: "Stock alerts",
  startPreparation: "Start preparation",
  markReady: "Mark ready",
  markDelivered: "Mark delivered",
  darkMode: "Dark mode",
  lightMode: "Light mode",
  language: "Language",
  arabic: "Arabic",
  english: "English",
  logout: "Logout",
  loading: "Loading...",
  retry: "Retry",
  networkError: "Unable to reach the server. Check your connection.",
  sessionExpired: "Session expired. Please sign in again.",
  all: "All",
  order: "Order",
  items: "items",
  liveActivity: "Live activity",
  noActiveOrders: "No active orders",
  queueClear: "Queue is clear",
  adjustStock: "Adjust stock",
  quantity: "Quantity",
  reason: "Reason",
  saveAdjustment: "Save adjustment",
  saving: "Saving...",
  notifications: "Notifications",
  notificationsSubtitle: "Orders and stock alerts",
  operationsProfile: "Operations profile",
  operationsAgent: "Operations agent",
  permissionsSuffix: "permissions",
  minimumLabel: "minimum",
  noStockItems: "No stock items in this zone",
  branchUnavailable: "Branch context unavailable",
  minutesLate: "min late",
  minutesShort: "min",
  orderDetails: "Order details",
  priority: "Priority",
  close: "Close",
  reportProblem: "Report a problem",
  reportShortage: "Report shortage",
  incidentReasonPlaceholder: "Describe the issue…",
  submitReport: "Submit report",
  viewDetails: "View details",
  cancel: "Cancel",
  history: "History",
  performance: "Performance",
  onTimeRate: "On-time rate",
  totalDelivered: "Delivered",
  totalRejected: "Rejected/incidents",
  meetingPrep: "Meeting prep",
  upcomingMeetings: "Upcoming meetings",
  noUpcomingMeetings: "No upcoming meetings",
  markAllRead: "Mark all as read",
  noNotifications: "No notifications yet",
  lowStock: "Low stock",
  noPermissionForAction: "You don't have permission for this action",
  attendees: "attendees",
};

export type Copy = typeof en;

export const ar: Copy = {
  appName: "ترحيب",
  employee: "الموظف",
  operations: "العمليات",
  welcome: "مرحبا بعودتك",
  signIn: "تسجيل الدخول",
  email: "البريد الإلكتروني",
  password: "كلمة المرور",
  phoneOtp: "رمز الهاتف",
  catalog: "الكتالوج",
  favorites: "المفضلة",
  cart: "السلة",
  profile: "الملف",
  orders: "الطلبات",
  rooms: "القاعات",
  search: "ابحث عن منتج",
  quota: "الحصة",
  add: "إضافة",
  total: "المجموع",
  validateCart: "اعتماد السلة",
  orderTracking: "تتبع الطلب",
  confirmed: "مؤكد",
  preparing: "قيد التحضير",
  ready: "جاهز",
  delivered: "تم التسليم",
  queue: "الطابور",
  dashboard: "لوحة التحكم",
  stock: "المخزون",
  tasks: "المهام",
  todayOrders: "طلبات اليوم",
  pending: "قيد الانتظار",
  deliveredToday: "تم تسليمها",
  stockAlerts: "تنبيهات المخزون",
  startPreparation: "بدء التحضير",
  markReady: "تحديد كجاهز",
  markDelivered: "تحديد كمسلم",
  darkMode: "الوضع الداكن",
  lightMode: "الوضع الفاتح",
  language: "اللغة",
  arabic: "العربية",
  english: "الإنجليزية",
  logout: "تسجيل الخروج",
  loading: "جاري التحميل...",
  retry: "إعادة المحاولة",
  networkError: "تعذر الوصول إلى الخادم. تحقق من اتصالك.",
  sessionExpired: "انتهت الجلسة. الرجاء تسجيل الدخول من جديد.",
  all: "الكل",
  order: "طلب",
  items: "منتجات",
  liveActivity: "النشاط المباشر",
  noActiveOrders: "لا توجد طلبات نشطة",
  queueClear: "الطابور فارغ",
  adjustStock: "تعديل المخزون",
  quantity: "الكمية",
  reason: "السبب",
  saveAdjustment: "حفظ التعديل",
  saving: "جاري الحفظ...",
  notifications: "الإشعارات",
  notificationsSubtitle: "تنبيهات الطلبات والمخزون",
  operationsProfile: "ملف العمليات",
  operationsAgent: "موظف العمليات",
  permissionsSuffix: "صلاحية",
  minimumLabel: "الحد الأدنى",
  noStockItems: "لا توجد أصناف في هذه المنطقة",
  branchUnavailable: "سياق الفرع غير متوفر",
  minutesLate: "دقيقة تأخير",
  minutesShort: "دقيقة",
  orderDetails: "تفاصيل الطلب",
  priority: "الأولوية",
  close: "إغلاق",
  reportProblem: "الإبلاغ عن مشكلة",
  reportShortage: "الإبلاغ عن نفاد",
  incidentReasonPlaceholder: "اكتب وصف المشكلة...",
  submitReport: "إرسال البلاغ",
  viewDetails: "عرض التفاصيل",
  cancel: "إلغاء",
  history: "السجل",
  performance: "الأداء",
  onTimeRate: "نسبة الالتزام بالوقت",
  totalDelivered: "تم التسليم",
  totalRejected: "ملغاة/بلاغات",
  meetingPrep: "تحضير الاجتماعات",
  upcomingMeetings: "الاجتماعات القادمة",
  noUpcomingMeetings: "لا توجد اجتماعات قادمة",
  markAllRead: "تحديد الكل كمقروء",
  noNotifications: "لا توجد إشعارات بعد",
  lowStock: "مخزون منخفض",
  noPermissionForAction: "لا تملك صلاحية لهذا الإجراء",
  attendees: "مشاركين",
};

export const t = (lang: Lang): Copy => (lang === "ar" ? ar : en);

// Statuts du cycle de commande backend (apps/backend OrderStatus).
const orderStatusEn: Record<string, string> = {
  PENDING: "Pending approval",
  APPROVED: "Confirmed",
  IN_PROGRESS: "Preparing",
  READY: "Ready",
  DELIVERED: "Delivered",
  REJECTED: "Rejected",
};

const orderStatusAr: Record<string, string> = {
  PENDING: "بانتظار الموافقة",
  APPROVED: "مؤكد",
  IN_PROGRESS: "قيد التحضير",
  READY: "جاهز",
  DELIVERED: "تم التسليم",
  REJECTED: "ملغي",
};

export const orderStatusLabel = (status: string, lang: Lang): string =>
  (lang === "ar" ? orderStatusAr : orderStatusEn)[status] ?? status;

// Priorité SLA (roles.sla_priority, P1 = le plus urgent).
const priorityEn: Record<string, string> = {
  P1: "P1 · Urgent",
  P2: "P2 · High",
  P3: "P3 · Normal",
  P4: "P4 · Low",
  P5: "P5 · Standard",
};

const priorityAr: Record<string, string> = {
  P1: "P1 · عاجل",
  P2: "P2 · مرتفع",
  P3: "P3 · عادي",
  P4: "P4 · منخفض",
  P5: "P5 · قياسي",
};

export const priorityLabel = (priority: string, lang: Lang): string =>
  (lang === "ar" ? priorityAr : priorityEn)[priority] ?? priority;

/** Rang numérique pour trier P1 (le plus urgent) avant P5. */
export const priorityRank = (priority: string): number => {
  const match = /^P(\d)$/.exec(priority);
  return match ? Number(match[1]) : 99;
};

const stockZoneEn: Record<StockZone, string> = {
  KITCHEN: "Kitchen",
  BRANCH: "Branch warehouse",
  CENTRAL: "Central warehouse",
};

const stockZoneAr: Record<StockZone, string> = {
  KITCHEN: "المطبخ",
  BRANCH: "مستودع الفرع",
  CENTRAL: "المستودع المركزي",
};

export const stockZoneLabel = (zone: StockZone, lang: Lang): string =>
  (lang === "ar" ? stockZoneAr : stockZoneEn)[zone];

// Codes de rejet du moteur de validation (§3.3 CLAUDE.md).
const rejectionEn: Record<string, string> = {
  PRODUCT_NOT_COMMANDABLE: "Product not orderable",
  ROLE_NOT_ALLOWED: "Not allowed for your role",
  BRANCH_NOT_ALLOWED: "Not available at your branch",
  INSUFFICIENT_STOCK: "Insufficient stock",
  QUOTA_EXCEEDED: "Quota exceeded",
};

const rejectionAr: Record<string, string> = {
  PRODUCT_NOT_COMMANDABLE: "المنتج غير قابل للطلب",
  ROLE_NOT_ALLOWED: "غير متاح لدورك",
  BRANCH_NOT_ALLOWED: "غير متاح في فرعك",
  INSUFFICIENT_STOCK: "المخزون غير كافٍ",
  QUOTA_EXCEEDED: "تم تجاوز الحصة المسموحة",
};

export const rejectionReasonLabel = (reason: string | null | undefined, lang: Lang): string => {
  if (!reason) return "";
  return (lang === "ar" ? rejectionAr : rejectionEn)[reason] ?? reason;
};
