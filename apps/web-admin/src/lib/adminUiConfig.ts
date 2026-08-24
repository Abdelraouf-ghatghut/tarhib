export interface AdminUiConfig {
  menuItems?: string[];
  dashboardWidgets?: string[];
}

export const ADMIN_MENU_OPTIONS = [
  "/orders",
  "/operations/kitchen",
  "/operations/delivery",
  "/operations/cleaning",
  "/operations/meeting-preparations",
  "/quotas",
  "/meeting-rooms-admin",
  "/meeting-service-packages",
  "/products",
  "/companies",
  "/branches",
  "/departments",
  "/employees/internal",
  "/employees/client",
  "/registrations",
  "/inventory",
  "/inventory-transfers",
  "/suppliers",
  "/procurement",
  "/vip-tasks",
  "/reports",
  "/finance",
  "/performance-management",
  "/finance/contracts",
  "/finance/expenses",
  "/finance/debts",
  "/finance/accounts",
  "/accounting/chart-of-accounts",
  "/accounting/journal-entries",
  "/accounting/reports",
  "/hr/leave-requests",
  "/hr/contracts",
  "/hr/performance-reviews",
  "/hr/payslips",
  "/roles",
  "/settings/company-documents",
  "/settings/company-registration",
  "/settings/operational-zones",
  "/audit",
] as const;

/**
 * The overview is deliberately not user-configurable. Its content and order
 * are derived from effective permissions so that every role receives the
 * same decision-support view defined by Tarhib's operating rules.
 */
export type DashboardProfileKey =
  | "executive"
  | "manager"
  | "kitchen"
  | "delivery"
  | "cleaning"
  | "meetings"
  | "stock"
  | "procurement"
  | "hr"
  | "finance"
  | "generic";

export interface DashboardProfile {
  key: DashboardProfileKey;
  widgets: string[];
}

export function resolveDashboardProfile(
  role: string | null,
  hasPermission: (permission: string) => boolean,
): DashboardProfile {
  const normalizedRole = (role ?? "").trim().toLocaleLowerCase();
  const roleContains = (...values: string[]) =>
    values.some((value) => normalizedRole.includes(value));
  const canViewReports =
    hasPermission("report.view") ||
    hasPermission("company.manage") ||
    hasPermission("branch.manage");
  const canViewKitchen = hasPermission("order.prepare") || hasPermission("order.queue.manage");
  const canViewDelivery =
    hasPermission("order.deliver") ||
    hasPermission("order.delivery.queue.view") ||
    hasPermission("order.queue.manage");
  const canViewCleaning =
    hasPermission("cleaning.task.view") || hasPermission("cleaning.task.manage");
  const canViewMeetingPreparations =
    hasPermission("meeting.preparation.view") ||
    hasPermission("meeting.preparation.execute") ||
    hasPermission("meeting.preparation.manage");
  const canViewOperations =
    canViewKitchen || canViewDelivery || canViewCleaning || canViewMeetingPreparations;
  const canViewInventory = hasPermission("inventory.manage") || hasPermission("company.manage");
  const canViewOrders =
    canViewReports ||
    ["order.queue.view", "order.queue.manage", "order.prepare", "order.deliver"].some(
      hasPermission,
    );

  let key: DashboardProfileKey;
  if (roleContains("superadmin", "director", "directeur", "المدير العام", "مدير النظام")) {
    key = "executive";
  } else if (roleContains("finance", "comptab", "مالي", "محاسب")) {
    key = "finance";
  } else if (roleContains("human resource", "ressources humaines", "rh", "موارد بشرية")) {
    key = "hr";
  } else if (roleContains("procurement", "purchase", "achat", "مشتريات")) {
    key = "procurement";
  } else if (roleContains("stock", "inventory", "مخزون", "مستودع")) {
    key = "stock";
  } else if (roleContains("kitchen", "cook", "cuisin", "مطبخ", "طباخ")) {
    key = "kitchen";
  } else if (roleContains("delivery", "driver", "livreur", "توصيل", "مندوب")) {
    key = "delivery";
  } else if (roleContains("clean", "ménage", "menage", "نظافة")) {
    key = "cleaning";
  } else if (roleContains("meeting", "réunion", "reunion", "اجتماع")) {
    key = "meetings";
  } else if (roleContains("manager", "admin branche", "مدير", "مشرف")) {
    key = "manager";
  } else if (hasPermission("hr.contract.manage") || hasPermission("hr.leave.approve")) {
    key = "hr";
  } else if (hasPermission("finance.manage") || hasPermission("accounting.manage")) {
    key = "finance";
  } else if (hasPermission("procurement.manage")) {
    key = "procurement";
  } else if (canViewKitchen && !canViewDelivery && !canViewCleaning) {
    key = "kitchen";
  } else if (canViewDelivery && !canViewKitchen && !canViewCleaning) {
    key = "delivery";
  } else if (canViewCleaning && !canViewKitchen && !canViewDelivery) {
    key = "cleaning";
  } else if (canViewMeetingPreparations && !canViewKitchen && !canViewDelivery) {
    key = "meetings";
  } else if (canViewInventory && !canViewReports && !canViewOperations) {
    key = "stock";
  } else if (canViewReports || canViewOperations) {
    key = "manager";
  } else {
    key = "generic";
  }

  const requestedByProfile: Record<DashboardProfileKey, string[]> = {
    executive: [
      "business-kpis",
      "sla-kpis",
      "charts",
      "operations",
      "stock-alerts",
      "latest-orders",
      "quick-actions",
    ],
    manager: [
      "operations",
      "business-kpis",
      "sla-kpis",
      "stock-alerts",
      "latest-orders",
      "charts",
      "quick-actions",
    ],
    kitchen: ["operations", "latest-orders", "stock-alerts", "quick-actions"],
    delivery: ["operations", "latest-orders", "quick-actions"],
    cleaning: ["operations", "quick-actions"],
    meetings: ["operations", "quick-actions"],
    stock: ["stock-alerts", "quick-actions"],
    procurement: ["stock-alerts", "quick-actions"],
    hr: ["quick-actions"],
    finance: ["business-kpis", "charts", "quick-actions"],
    generic: ["quick-actions"],
  };
  const available = new Set<string>(["quick-actions"]);
  if (canViewOperations) available.add("operations");
  if (canViewReports) {
    available.add("business-kpis");
    available.add("sla-kpis");
    available.add("charts");
  }
  if (canViewInventory) available.add("stock-alerts");
  if (canViewOrders) available.add("latest-orders");

  return {
    key,
    widgets: requestedByProfile[key].filter((widget) => available.has(widget)),
  };
}

export const ADMIN_MENU_LABEL_KEYS: Record<string, string> = {
  "/orders": "orders",
  "/operations/kitchen": "kitchenSupervision",
  "/operations/delivery": "deliverySupervision",
  "/operations/cleaning": "cleaningSupervision",
  "/operations/meeting-preparations": "meetingPreparationSupervision",
  "/quotas": "quotas",
  "/meeting-rooms-admin": "meetingRoomsAdmin",
  "/meeting-service-packages": "meetingServicePackages",
  "/products": "products",
  "/companies": "companies",
  "/branches": "branches",
  "/departments": "departments",
  "/employees/internal": "employeesInternal",
  "/employees/client": "employeesClient",
  "/registrations": "pendingRegistrations",
  "/inventory": "stock",
  "/inventory-transfers": "inventoryTransfers",
  "/suppliers": "suppliers",
  "/procurement": "procurement",
  "/vip-tasks": "vipSelfService",
  "/reports": "reports",
  "/finance": "financeOverview",
  "/performance-management": "performanceManagement",
  "/finance/contracts": "contracts",
  "/finance/expenses": "expenses",
  "/finance/debts": "debts",
  "/finance/accounts": "accounts",
  "/accounting/chart-of-accounts": "chartOfAccounts",
  "/accounting/journal-entries": "journalEntries",
  "/accounting/reports": "accountingReports",
  "/hr/leave-requests": "leaveRequests",
  "/hr/contracts": "employmentContracts",
  "/hr/performance-reviews": "performanceReviews",
  "/hr/payslips": "payslips",
  "/roles": "rolesPermissions",
  "/settings/company-documents": "companyDocuments",
  "/settings/company-registration": "companyRegistrationSettings",
  "/settings/operational-zones": "operationalZones",
  "/audit": "audit.title",
};

export const ADMIN_MENU_PERMISSION_REQUIREMENTS: Record<string, string[]> = {
  "/orders": [
    "order.queue.view",
    "order.queue.manage",
    "order.prepare",
    "order.deliver",
    "company.manage",
    "branch.manage",
  ],
  "/operations/kitchen": ["order.queue.view", "order.prepare", "order.queue.manage"],
  "/operations/delivery": ["order.delivery.queue.view", "order.deliver", "order.queue.manage"],
  "/operations/cleaning": ["cleaning.task.view", "cleaning.task.manage"],
  "/operations/meeting-preparations": [
    "meeting.preparation.view",
    "meeting.preparation.execute",
    "meeting.preparation.manage",
  ],
  "/quotas": ["company.manage", "branch.manage"],
  "/meeting-rooms-admin": ["company.manage", "branch.manage"],
  "/meeting-service-packages": ["company.manage", "branch.manage"],
  "/products": ["company.manage"],
  "/companies": ["company.manage"],
  "/branches": ["company.manage", "branch.manage"],
  "/departments": ["company.manage", "branch.manage"],
  "/employees/internal": ["employee.manage"],
  "/employees/client": ["employee.manage"],
  "/registrations": ["employee.manage"],
  "/inventory": ["inventory.manage", "company.manage"],
  "/inventory-transfers": ["inventory.manage", "company.manage"],
  "/suppliers": ["inventory.manage", "company.manage"],
  "/procurement": ["inventory.manage", "company.manage"],
  "/vip-tasks": ["inventory.manage", "company.manage"],
  "/reports": ["report.view", "company.manage", "branch.manage"],
  "/finance": ["finance.view", "finance.manage"],
  "/performance-management": ["finance.view", "finance.manage", "report.view", "company.manage"],
  "/finance/contracts": ["finance.view", "finance.manage"],
  "/finance/expenses": ["finance.view", "finance.manage"],
  "/finance/debts": ["finance.view", "finance.manage"],
  "/finance/accounts": ["finance.view", "finance.manage"],
  "/accounting/chart-of-accounts": ["accounting.view", "accounting.manage"],
  "/accounting/journal-entries": ["accounting.view", "accounting.manage"],
  "/accounting/reports": ["accounting.view", "accounting.manage"],
  "/hr/leave-requests": ["hr.leave.manage", "hr.leave.approve"],
  "/hr/contracts": ["hr.contract.manage"],
  "/hr/performance-reviews": ["hr.review.manage"],
  "/hr/payslips": ["employee.salary.manage", "company.manage"],
  "/roles": ["role.manage"],
  "/settings/company-documents": ["company.manage"],
  "/settings/company-registration": ["company.manage"],
  "/settings/operational-zones": ["order.queue.manage", "cleaning.task.manage"],
  "/audit": ["company.manage"],
};

export function isCompatibleWithPermissions(
  requirements: Record<string, string[]>,
  key: string,
  permissions: ReadonlySet<string>,
): boolean {
  const anyOf = requirements[key] ?? [];
  return anyOf.length === 0 || anyOf.some((permission) => permissions.has(permission));
}

export interface AdminUiPreset {
  labelKey: string;
  menuItems: string[];
}

export const ADMIN_UI_PRESETS: Record<string, AdminUiPreset> = {
  executive: {
    labelKey: "adminUiPreset.executive",
    menuItems: [
      "/reports",
      "/performance-management",
      "/finance",
      "/companies",
      "/branches",
      "/audit",
    ],
  },
  manager: {
    labelKey: "adminUiPreset.manager",
    menuItems: [...ADMIN_MENU_OPTIONS],
  },
  kitchen: {
    labelKey: "adminUiPreset.kitchen",
    menuItems: ["/operations/kitchen", "/orders", "/inventory"],
  },
  delivery: {
    labelKey: "adminUiPreset.delivery",
    menuItems: ["/operations/delivery", "/orders", "/settings/operational-zones"],
  },
  cleaning: {
    labelKey: "adminUiPreset.cleaning",
    menuItems: ["/operations/cleaning", "/settings/operational-zones"],
  },
  meetings: {
    labelKey: "adminUiPreset.meetings",
    menuItems: [
      "/operations/meeting-preparations",
      "/meeting-rooms-admin",
      "/meeting-service-packages",
    ],
  },
  stock: {
    labelKey: "adminUiPreset.stock",
    menuItems: ["/inventory", "/inventory-transfers", "/vip-tasks", "/procurement", "/suppliers"],
  },
  procurement: {
    labelKey: "adminUiPreset.procurement",
    menuItems: ["/procurement", "/suppliers", "/inventory", "/inventory-transfers"],
  },
  hr: {
    labelKey: "adminUiPreset.hr",
    menuItems: [
      "/employees/internal",
      "/hr/leave-requests",
      "/hr/contracts",
      "/hr/performance-reviews",
      "/hr/payslips",
    ],
  },
  finance: {
    labelKey: "adminUiPreset.finance",
    menuItems: [
      "/finance",
      "/performance-management",
      "/finance/contracts",
      "/finance/expenses",
      "/finance/debts",
      "/finance/accounts",
      "/accounting/chart-of-accounts",
      "/accounting/journal-entries",
      "/accounting/reports",
    ],
  },
};

/** Une configuration absente conserve les valeurs par défaut. Un tableau
 * présent, y compris vide, représente une sélection explicite. */
export function isAdminUiItemEnabled(configured: string[] | undefined, key: string): boolean {
  return configured === undefined || configured.includes(key);
}
