import type { ReactNode } from "react";
import {
  WarningOutlined,
  StopOutlined,
  ClockCircleOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { useAuth } from "./useAuth";
import { useScope } from "../contexts/ScopeContext";
import { registrationsApi, reportingApi } from "../lib/api";

export const RAIL_WIDTH = 300;

export interface AdminNotification {
  key: string;
  tone: "warning" | "danger" | "brand" | "success";
  icon: ReactNode;
  text: string;
  to: string;
}

interface InventoryReport {
  belowThreshold: number;
  outOfStock: number;
}

interface OrdersReport {
  byStatus: Record<string, number>;
}

/** Notifications dérivées des données réelles (stock, commandes, inscriptions). */
export function useAdminNotifications(): AdminNotification[] {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const { companyId } = useScope();
  const scopeParams = companyId ? { companyId } : undefined;
  const today = dayjs().format("YYYY-MM-DD");

  const canInventory = hasPermission("inventory.manage") || hasPermission("company.manage");
  const canEmployees = hasPermission("employee.manage");

  const { data: inv } = useQuery({
    queryKey: ["rail", "inventory", companyId],
    queryFn: () => reportingApi.inventory(scopeParams).then((r) => r.data as InventoryReport),
    enabled: canInventory,
  });

  const { data: ordersRep } = useQuery({
    queryKey: ["rail", "orders", companyId, today],
    queryFn: () =>
      reportingApi
        .orders({ ...(scopeParams ?? {}), from: today, to: today })
        .then((r) => r.data as OrdersReport),
  });

  const { data: registrations } = useQuery({
    queryKey: ["rail", "registrations", companyId],
    queryFn: () =>
      registrationsApi.listPending(companyId ?? undefined).then((r) => r.data as unknown[]),
    enabled: canEmployees,
  });

  const notifications: AdminNotification[] = [];
  const pendingOrders = ordersRep?.byStatus?.["PENDING"] ?? 0;
  if (pendingOrders > 0) {
    notifications.push({
      key: "pending-orders",
      tone: "brand",
      icon: <ClockCircleOutlined />,
      text: t("pendingOrdersNotif", { count: pendingOrders }),
      to: "/orders",
    });
  }
  if ((inv?.belowThreshold ?? 0) > 0) {
    notifications.push({
      key: "below-threshold",
      tone: "warning",
      icon: <WarningOutlined />,
      text: t("stockBelowThresholdNotif", { count: inv?.belowThreshold }),
      to: "/inventory",
    });
  }
  if ((inv?.outOfStock ?? 0) > 0) {
    notifications.push({
      key: "out-of-stock",
      tone: "danger",
      icon: <StopOutlined />,
      text: t("outOfStockNotif", { count: inv?.outOfStock }),
      to: "/inventory",
    });
  }
  if ((registrations?.length ?? 0) > 0) {
    notifications.push({
      key: "registrations",
      tone: "success",
      icon: <UserAddOutlined />,
      text: t("pendingRegistrationsNotif", { count: registrations?.length }),
      to: "/registrations",
    });
  }
  return notifications;
}
