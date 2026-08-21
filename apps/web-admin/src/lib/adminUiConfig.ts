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

export const DASHBOARD_WIDGET_OPTIONS = [
  "quick-actions",
  "operations",
  "business-kpis",
  "sla-kpis",
  "charts",
  "stock-alerts",
  "latest-orders",
] as const;

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

export const DASHBOARD_WIDGET_PERMISSION_REQUIREMENTS: Record<string, string[]> = {
  "quick-actions": [],
  operations: [
    "order.prepare",
    "order.deliver",
    "order.delivery.queue.view",
    "order.queue.manage",
    "cleaning.task.view",
    "cleaning.task.manage",
    "meeting.preparation.view",
    "meeting.preparation.execute",
    "meeting.preparation.manage",
  ],
  "business-kpis": ["report.view", "company.manage", "branch.manage"],
  "sla-kpis": ["report.view", "company.manage", "branch.manage"],
  charts: ["report.view", "company.manage", "branch.manage"],
  "stock-alerts": ["inventory.manage", "company.manage"],
  "latest-orders": [
    "report.view",
    "company.manage",
    "branch.manage",
    "order.queue.view",
    "order.queue.manage",
    "order.prepare",
    "order.deliver",
  ],
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
  dashboardWidgets: string[];
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
    dashboardWidgets: [
      "quick-actions",
      "business-kpis",
      "sla-kpis",
      "charts",
      "stock-alerts",
      "latest-orders",
    ],
  },
  manager: {
    labelKey: "adminUiPreset.manager",
    menuItems: [...ADMIN_MENU_OPTIONS],
    dashboardWidgets: [...DASHBOARD_WIDGET_OPTIONS],
  },
  kitchen: {
    labelKey: "adminUiPreset.kitchen",
    menuItems: ["/operations/kitchen", "/orders", "/inventory"],
    dashboardWidgets: ["quick-actions", "operations", "latest-orders", "stock-alerts"],
  },
  delivery: {
    labelKey: "adminUiPreset.delivery",
    menuItems: ["/operations/delivery", "/orders", "/settings/operational-zones"],
    dashboardWidgets: ["quick-actions", "operations", "latest-orders"],
  },
  cleaning: {
    labelKey: "adminUiPreset.cleaning",
    menuItems: ["/operations/cleaning", "/settings/operational-zones"],
    dashboardWidgets: ["quick-actions", "operations"],
  },
  meetings: {
    labelKey: "adminUiPreset.meetings",
    menuItems: [
      "/operations/meeting-preparations",
      "/meeting-rooms-admin",
      "/meeting-service-packages",
    ],
    dashboardWidgets: ["quick-actions", "operations"],
  },
  stock: {
    labelKey: "adminUiPreset.stock",
    menuItems: ["/inventory", "/inventory-transfers", "/vip-tasks", "/procurement", "/suppliers"],
    dashboardWidgets: ["quick-actions", "stock-alerts"],
  },
  procurement: {
    labelKey: "adminUiPreset.procurement",
    menuItems: ["/procurement", "/suppliers", "/inventory", "/inventory-transfers"],
    dashboardWidgets: ["quick-actions", "stock-alerts"],
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
    dashboardWidgets: ["quick-actions"],
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
    dashboardWidgets: ["quick-actions", "business-kpis", "charts"],
  },
};

/** Une configuration absente conserve les valeurs par défaut. Un tableau
 * présent, y compris vide, représente une sélection explicite. */
export function isAdminUiItemEnabled(configured: string[] | undefined, key: string): boolean {
  return configured === undefined || configured.includes(key);
}
