import { createBrowserRouter, Navigate } from "react-router-dom";
import { AdminLayout } from "./layouts/AdminLayout";
import { RequireAuth } from "./components/RequireAuth";
import { RequirePermission } from "./components/RequirePermission";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProfilePage } from "./pages/ProfilePage";
import { CompaniesPage } from "./pages/companies/CompaniesPage";
import { BranchesPage } from "./pages/branches/BranchesPage";
import { DepartmentsPage } from "./pages/departments/DepartmentsPage";
import { EmployeesPage } from "./pages/employees/EmployeesPage";
import { ProductsPage } from "./pages/products/ProductsPage";
import { InventoryPage } from "./pages/inventory/InventoryPage";
import { InventoryTransfersPage } from "./pages/inventory/InventoryTransfersPage";
import { OrdersPage } from "./pages/orders/OrdersPage";
import { QuotasPage } from "./pages/quotas/QuotasPage";
import { ReportsPage } from "./pages/reports/ReportsPage";
import { RolesPage } from "./pages/roles/RolesPage";
import { MeetingRoomsAdminPage } from "./pages/meeting-rooms/MeetingRoomsAdminPage";
import { RegistrationsPage } from "./pages/registrations/RegistrationsPage";
import { MeetingServicePackagesPage } from "./pages/meeting-service-packages/MeetingServicePackagesPage";
import VipTasksPage from "./pages/vip/VipTasksPage";
import SuppliersPage from "./pages/suppliers/SuppliersPage";
import ProcurementPage from "./pages/procurement/ProcurementPage";
import AuditLogPage from "./pages/audit/AuditLogPage";
import { FinanceOverviewPage } from "./pages/finance/FinanceOverviewPage";
import { ContractsPage } from "./pages/finance/ContractsPage";
import { ExpensesPage } from "./pages/finance/ExpensesPage";
import { DebtsPage } from "./pages/finance/DebtsPage";
import { AccountsPage } from "./pages/finance/AccountsPage";
import { ChartOfAccountsPage } from "./pages/accounting/ChartOfAccountsPage";
import { JournalEntriesPage } from "./pages/accounting/JournalEntriesPage";
import { ReportsPage as AccountingReportsPage } from "./pages/accounting/ReportsPage";
import { LeaveRequestsPage } from "./pages/hr/LeaveRequestsPage";
import { ContractsPage as HrContractsPage } from "./pages/hr/ContractsPage";
import { PerformanceReviewsPage } from "./pages/hr/PerformanceReviewsPage";
import { PayslipsPage } from "./pages/hr/PayslipsPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      {
        path: "roles",
        element: (
          <RequirePermission anyOf={["role.manage"]}>
            <RolesPage />
          </RequirePermission>
        ),
      },
      {
        path: "companies",
        element: (
          <RequirePermission anyOf={["company.manage"]}>
            <CompaniesPage />
          </RequirePermission>
        ),
      },
      {
        path: "branches",
        element: (
          <RequirePermission anyOf={["company.manage", "branch.manage"]}>
            <BranchesPage />
          </RequirePermission>
        ),
      },
      {
        path: "departments",
        element: (
          <RequirePermission anyOf={["company.manage", "branch.manage"]}>
            <DepartmentsPage />
          </RequirePermission>
        ),
      },
      { path: "employees", element: <Navigate to="/employees/client" replace /> },
      {
        path: "employees/client",
        element: (
          <RequirePermission anyOf={["employee.manage"]}>
            <EmployeesPage scope="CLIENT" />
          </RequirePermission>
        ),
      },
      {
        path: "employees/internal",
        element: (
          <RequirePermission anyOf={["employee.manage"]}>
            <EmployeesPage scope="TARHIB" />
          </RequirePermission>
        ),
      },
      {
        path: "products",
        element: (
          <RequirePermission anyOf={["company.manage"]}>
            <ProductsPage />
          </RequirePermission>
        ),
      },
      {
        path: "inventory",
        element: (
          <RequirePermission anyOf={["inventory.manage", "company.manage"]}>
            <InventoryPage />
          </RequirePermission>
        ),
      },
      {
        path: "inventory-transfers",
        element: (
          <RequirePermission anyOf={["inventory.manage", "company.manage"]}>
            <InventoryTransfersPage />
          </RequirePermission>
        ),
      },
      {
        path: "vip-tasks",
        element: (
          <RequirePermission anyOf={["inventory.manage", "company.manage"]}>
            <VipTasksPage />
          </RequirePermission>
        ),
      },
      {
        path: "suppliers",
        element: (
          <RequirePermission anyOf={["inventory.manage", "company.manage"]}>
            <SuppliersPage />
          </RequirePermission>
        ),
      },
      {
        path: "procurement",
        element: (
          <RequirePermission anyOf={["inventory.manage", "company.manage"]}>
            <ProcurementPage />
          </RequirePermission>
        ),
      },
      { path: "orders", element: <OrdersPage /> },
      { path: "quotas", element: <QuotasPage /> },
      {
        path: "reports",
        element: (
          <RequirePermission anyOf={["report.view", "company.manage", "branch.manage"]}>
            <ReportsPage />
          </RequirePermission>
        ),
      },
      {
        path: "meeting-rooms-admin",
        element: (
          <RequirePermission anyOf={["branch.manage", "company.manage"]}>
            <MeetingRoomsAdminPage />
          </RequirePermission>
        ),
      },
      {
        path: "meeting-service-packages",
        element: (
          <RequirePermission anyOf={["branch.manage", "company.manage"]}>
            <MeetingServicePackagesPage />
          </RequirePermission>
        ),
      },
      {
        path: "registrations",
        element: (
          <RequirePermission anyOf={["employee.manage"]}>
            <RegistrationsPage />
          </RequirePermission>
        ),
      },
      {
        path: "audit",
        element: (
          <RequirePermission anyOf={["company.manage"]}>
            <AuditLogPage />
          </RequirePermission>
        ),
      },
      {
        path: "finance",
        element: (
          <RequirePermission anyOf={["finance.view", "finance.manage"]}>
            <FinanceOverviewPage />
          </RequirePermission>
        ),
      },
      {
        path: "finance/contracts",
        element: (
          <RequirePermission anyOf={["finance.view", "finance.manage"]}>
            <ContractsPage />
          </RequirePermission>
        ),
      },
      {
        path: "finance/expenses",
        element: (
          <RequirePermission anyOf={["finance.view", "finance.manage"]}>
            <ExpensesPage />
          </RequirePermission>
        ),
      },
      {
        path: "finance/debts",
        element: (
          <RequirePermission anyOf={["finance.view", "finance.manage"]}>
            <DebtsPage />
          </RequirePermission>
        ),
      },
      {
        path: "finance/accounts",
        element: (
          <RequirePermission anyOf={["finance.view", "finance.manage"]}>
            <AccountsPage />
          </RequirePermission>
        ),
      },
      {
        path: "accounting/chart-of-accounts",
        element: (
          <RequirePermission anyOf={["accounting.view", "accounting.manage"]}>
            <ChartOfAccountsPage />
          </RequirePermission>
        ),
      },
      {
        path: "accounting/journal-entries",
        element: (
          <RequirePermission anyOf={["accounting.view", "accounting.manage"]}>
            <JournalEntriesPage />
          </RequirePermission>
        ),
      },
      {
        path: "accounting/reports",
        element: (
          <RequirePermission anyOf={["accounting.view", "accounting.manage"]}>
            <AccountingReportsPage />
          </RequirePermission>
        ),
      },
      {
        path: "hr/leave-requests",
        element: (
          <RequirePermission anyOf={["hr.leave.manage", "hr.leave.approve"]}>
            <LeaveRequestsPage />
          </RequirePermission>
        ),
      },
      {
        path: "hr/contracts",
        element: (
          <RequirePermission anyOf={["hr.contract.manage"]}>
            <HrContractsPage />
          </RequirePermission>
        ),
      },
      {
        path: "hr/performance-reviews",
        element: (
          <RequirePermission anyOf={["hr.review.manage"]}>
            <PerformanceReviewsPage />
          </RequirePermission>
        ),
      },
      {
        path: "hr/payslips",
        element: (
          <RequirePermission anyOf={["employee.salary.manage", "company.manage"]}>
            <PayslipsPage />
          </RequirePermission>
        ),
      },
      { path: "profile", element: <ProfilePage /> },
      // 404 dans le shell admin plutôt qu'une redirection silencieuse vers
      // le dashboard : l'utilisateur voit que l'URL est erronée
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
