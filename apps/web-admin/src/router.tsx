import { createBrowserRouter, Navigate } from "react-router-dom";
import { AdminLayout } from "./layouts/AdminLayout";
import { RequireAuth } from "./components/RequireAuth";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
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
      { path: "roles", element: <RolesPage /> },
      { path: "companies", element: <CompaniesPage /> },
      { path: "branches", element: <BranchesPage /> },
      { path: "departments", element: <DepartmentsPage /> },
      { path: "employees", element: <EmployeesPage /> },
      { path: "products", element: <ProductsPage /> },
      { path: "inventory", element: <InventoryPage /> },
      { path: "inventory-transfers", element: <InventoryTransfersPage /> },
      { path: "vip-tasks", element: <VipTasksPage /> },
      { path: "suppliers", element: <SuppliersPage /> },
      { path: "procurement", element: <ProcurementPage /> },
      { path: "orders", element: <OrdersPage /> },
      { path: "quotas", element: <QuotasPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "meeting-rooms-admin", element: <MeetingRoomsAdminPage /> },
      { path: "meeting-service-packages", element: <MeetingServicePackagesPage /> },
      { path: "registrations", element: <RegistrationsPage /> },
      { path: "audit", element: <AuditLogPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
