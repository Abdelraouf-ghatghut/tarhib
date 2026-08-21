import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  CodeSandboxOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  LineChartOutlined,
  WarningOutlined,
  StopOutlined,
  AlertOutlined,
  EyeOutlined,
  RightOutlined,
  LeftOutlined,
  PieChartOutlined,
  FieldTimeOutlined,
  FileTextOutlined,
  CarOutlined,
  CoffeeOutlined,
  ClearOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import dayjs, { type Dayjs } from "dayjs";
import {
  inventoryApi,
  operationsDashboardApi,
  ordersApi,
  reportingApi,
  rolesApi,
} from "../lib/api";
import {
  DASHBOARD_WIDGET_OPTIONS,
  isAdminUiItemEnabled,
  type AdminUiConfig,
} from "../lib/adminUiConfig";
import { useAuth } from "../hooks/useAuth";
import { useScope } from "../contexts/ScopeContext";
import { ScopeFilterBar } from "../components/ScopeFilterBar";
import { useNow } from "../hooks/useNow";
import {
  REFRESH_INTERVAL_MS,
  STATUS_META,
  type ChartPeriod,
  type InventoryReport,
  type OrderRow,
  type OrdersReport,
  type QuotaReport,
  type SlaReport,
  type StockAlertItem,
} from "./dashboard/types";
import { buildTrend, fmt, periodRange } from "./dashboard/trend";
import { TrendChart, LegendDot } from "./dashboard/TrendChart";
import { StatCard } from "./dashboard/StatCard";
import { deltaInfo, type DeltaInfo } from "./dashboard/deltaInfo";

const { Title, Text } = Typography;

interface OperationalTask {
  id: string;
  status: string;
  dueDate?: string | null;
  slaDeadline?: string | null;
  checklist?: Array<{ done: boolean }>;
}

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { companyId: authCompanyId, hasPermission, role, roleId, impersonation } = useAuth();
  const { data: adminUiConfig } = useQuery({
    queryKey: ["current-role-ui-config", roleId, impersonation?.label],
    queryFn: () => rolesApi.currentUiConfig().then((response) => response.data as AdminUiConfig),
  });
  const widgetEnabled = (key: string) => isAdminUiItemEnabled(adminUiConfig?.dashboardWidgets, key);
  const widgetOrder = (key: string) => {
    const configured = adminUiConfig?.dashboardWidgets;
    const index = (configured ?? [...DASHBOARD_WIDGET_OPTIONS]).indexOf(key);
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  };
  const canViewReports =
    hasPermission("report.view") ||
    hasPermission("company.manage") ||
    hasPermission("branch.manage");
  const canViewOrders =
    canViewReports ||
    hasPermission("order.queue.view") ||
    hasPermission("order.queue.manage") ||
    hasPermission("order.prepare") ||
    hasPermission("order.deliver");
  const canViewInventory = hasPermission("inventory.manage") || hasPermission("company.manage");
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
  const { companyId: scopeCompanyId, branchId: scopeBranchId } = useScope();
  const navigate = useNavigate();
  const isAr = i18n.language.startsWith("ar");
  const companyId = scopeCompanyId ?? authCompanyId;
  // Force le recalcul du compte à rebours SLA affiché toutes les 30s, même
  // entre deux refetch serveur (sinon "+12 د" reste figé jusqu'au prochain
  // re-render déclenché par autre chose).
  useNow(REFRESH_INTERVAL_MS);

  // Période partagée par TOUTE la page (cartes stats, graphiques, dernières
  // commandes) — un seul contrôle dans l'en-tête au lieu de 3 indépendants.
  const [period, setPeriod] = useState<ChartPeriod>("today");
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs] | null>(null);

  const activeRange = useMemo(() => periodRange(period, customRange), [period, customRange]);

  const range = useMemo(() => {
    const { from, to } = activeRange;
    const days = to.diff(from, "day") + 1;
    const prevTo = from.subtract(1, "day");
    const prevFrom = prevTo.subtract(days - 1, "day");
    return { from: fmt(from), to: fmt(to), prevFrom: fmt(prevFrom), prevTo: fmt(prevTo) };
  }, [activeRange]);

  const scope: Record<string, string> = {
    ...(companyId ? { companyId } : {}),
    ...(scopeBranchId ? { branchId: scopeBranchId } : {}),
  };

  const { data: ordersReport } = useQuery({
    queryKey: ["dash", "orders", companyId, scopeBranchId, range.from, range.to],
    queryFn: () =>
      reportingApi
        .orders({ ...scope, from: range.from, to: range.to })
        .then((r) => r.data as OrdersReport),
    refetchInterval: REFRESH_INTERVAL_MS,
    enabled: canViewReports,
  });

  const { data: ordersPrev } = useQuery({
    queryKey: ["dash", "orders-prev", companyId, scopeBranchId, range.prevFrom, range.prevTo],
    queryFn: () =>
      reportingApi
        .orders({ ...scope, from: range.prevFrom, to: range.prevTo })
        .then((r) => r.data as OrdersReport),
    enabled: canViewReports,
  });

  const { data: slaReport } = useQuery({
    queryKey: ["dash", "sla", companyId, scopeBranchId, range.from, range.to],
    queryFn: () =>
      reportingApi
        .sla({ ...scope, from: range.from, to: range.to })
        .then((r) => r.data as SlaReport),
    refetchInterval: REFRESH_INTERVAL_MS,
    enabled: canViewReports,
  });

  const { data: slaPrev } = useQuery({
    queryKey: ["dash", "sla-prev", companyId, scopeBranchId, range.prevFrom, range.prevTo],
    queryFn: () =>
      reportingApi
        .sla({ ...scope, from: range.prevFrom, to: range.prevTo })
        .then((r) => r.data as SlaReport),
    enabled: canViewReports,
  });

  const { data: quotaReport } = useQuery({
    queryKey: ["dash", "quotas", companyId, scopeBranchId],
    queryFn: () => reportingApi.quotas(scope).then((r) => r.data as QuotaReport),
    refetchInterval: REFRESH_INTERVAL_MS,
    enabled: canViewReports,
  });

  const { data: inventoryReport } = useQuery({
    queryKey: ["dash", "inventory", companyId],
    queryFn: () =>
      reportingApi
        .inventory(companyId ? { companyId } : undefined)
        .then((r) => r.data as InventoryReport),
    refetchInterval: REFRESH_INTERVAL_MS,
    enabled: canViewReports && canViewInventory,
  });

  const { data: alertItems } = useQuery({
    queryKey: ["dash", "stock-alerts", companyId],
    queryFn: () =>
      inventoryApi
        .alerts(companyId ? { companyId } : undefined)
        .then((r) => r.data as StockAlertItem[]),
    refetchInterval: REFRESH_INTERVAL_MS,
    enabled: canViewInventory,
  });

  const { data: allOrders } = useQuery({
    queryKey: ["orders", companyId],
    queryFn: () =>
      ordersApi.list(companyId ? { companyId } : undefined).then((r) => r.data as OrderRow[]),
    refetchInterval: REFRESH_INTERVAL_MS,
    enabled: canViewOrders,
  });

  const { data: kitchenQueue } = useQuery({
    queryKey: ["dash", "kitchen", companyId, scopeBranchId],
    queryFn: () =>
      operationsDashboardApi.kitchenQueue(scope).then((r) => r.data as OperationalTask[]),
    enabled: canViewKitchen,
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  const { data: deliveryQueue } = useQuery({
    queryKey: ["dash", "delivery", companyId, scopeBranchId],
    queryFn: () =>
      operationsDashboardApi.deliveryQueue(scope).then((r) => r.data as OperationalTask[]),
    enabled: canViewDelivery,
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  const { data: cleaningTasks } = useQuery({
    queryKey: ["dash", "cleaning", companyId, scopeBranchId],
    queryFn: () =>
      operationsDashboardApi.cleaningTasks(scope).then((r) => r.data as OperationalTask[]),
    enabled: canViewCleaning,
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  const { data: meetingPreparations } = useQuery({
    queryKey: ["dash", "meeting-preparations", companyId, scopeBranchId],
    queryFn: () =>
      operationsDashboardApi.meetingPreparations(scope).then((r) => r.data as OperationalTask[]),
    enabled: canViewMeetingPreparations,
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  // Évolution : buckets recalculés selon la période partagée
  const trend = useMemo(() => {
    const { from, to } = activeRange;
    return buildTrend(allOrders ?? [], from, to, i18n.language);
  }, [allOrders, activeRange, i18n.language]);

  // Répartition par statut sur la même période partagée
  const statusCounts = useMemo(() => {
    const { from, to } = activeRange;
    const counts: Record<string, number> = {};
    for (const o of allOrders ?? []) {
      const d = dayjs(o.createdAt);
      if (d.isBefore(from) || d.isAfter(to)) continue;
      counts[o.status] = (counts[o.status] ?? 0) + 1;
    }
    return counts;
  }, [allOrders, activeRange]);

  // Dernières commandes : parmi celles de la période partagée, pas toutes-périodes
  const latestOrders = useMemo(() => {
    const { from, to } = activeRange;
    return [...(allOrders ?? [])]
      .filter((o) => {
        const d = dayjs(o.createdAt);
        return !d.isBefore(from) && !d.isAfter(to);
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5);
  }, [allOrders, activeRange]);

  const pending = ordersReport?.byStatus?.["PENDING"] ?? 0;
  const delivered = ordersReport?.byStatus?.["DELIVERED"] ?? 0;
  const slaRate = slaReport?.complianceRate ?? null;
  const slaDelta: DeltaInfo | null =
    slaPrev?.complianceRate == null || slaRate == null
      ? null
      : {
          text: `${slaRate - slaPrev.complianceRate >= 0 ? "+" : ""}${(slaRate - slaPrev.complianceRate).toFixed(1)}%`,
          up: slaRate - slaPrev.complianceRate >= 0,
          favorable: slaRate - slaPrev.complianceRate >= 0,
        };
  const deltaLabel = period === "today" ? t("vsYesterday") : t("vsPrevious");
  const criticalCount = (alertItems ?? []).filter((a) => a.quantity <= a.minThreshold / 2).length;
  const maxStatus = Math.max(...STATUS_META.map((s) => statusCounts[s.status] ?? 0), 1);
  const Chevron = isAr ? LeftOutlined : RightOutlined;

  const periodOptions = [
    { value: "today", label: t("today") },
    { value: "week", label: t("thisWeek") },
    { value: "month", label: t("thisMonth") },
    { value: "year", label: t("thisYear") },
    { value: "custom", label: t("customRange") },
  ];

  const focusActions = [
    ...(canViewKitchen
      ? [
          {
            key: "kitchen",
            label: t("kitchenSupervision"),
            path: "/operations/kitchen",
            icon: <CoffeeOutlined />,
          },
        ]
      : []),
    ...(canViewDelivery
      ? [
          {
            key: "delivery",
            label: t("deliverySupervision"),
            path: "/operations/delivery",
            icon: <CarOutlined />,
          },
        ]
      : []),
    ...(canViewCleaning
      ? [
          {
            key: "cleaning",
            label: t("cleaningSupervision"),
            path: "/operations/cleaning",
            icon: <ClearOutlined />,
          },
        ]
      : []),
    ...(canViewMeetingPreparations
      ? [
          {
            key: "meeting-preparations",
            label: t("meetingPreparationSupervision"),
            path: "/operations/meeting-preparations",
            icon: <CalendarOutlined />,
          },
        ]
      : []),
    ...(canViewReports
      ? [{ key: "orders", label: t("orders"), path: "/orders", icon: <FileTextOutlined /> }]
      : []),
    ...(canViewInventory
      ? [{ key: "stock", label: t("stock"), path: "/inventory", icon: <WarningOutlined /> }]
      : []),
    ...(hasPermission("procurement.manage") || hasPermission("inventory.manage")
      ? [
          {
            key: "procurement",
            label: t("procurement"),
            path: "/procurement",
            icon: <CodeSandboxOutlined />,
          },
        ]
      : []),
    ...(hasPermission("hr.leave.manage") || hasPermission("hr.leave.approve")
      ? [
          {
            key: "leave",
            label: t("leaveRequests"),
            path: "/hr/leave-requests",
            icon: <ClockCircleOutlined />,
          },
        ]
      : []),
    ...(hasPermission("finance.view") || hasPermission("finance.manage")
      ? [
          {
            key: "finance",
            label: t("financeOverview"),
            path: "/finance",
            icon: <LineChartOutlined />,
          },
        ]
      : []),
  ];

  function chartPeriodControls(
    value: ChartPeriod,
    onChange: (p: ChartPeriod) => void,
    customValue: [Dayjs, Dayjs] | null,
    onCustomChange: (r: [Dayjs, Dayjs] | null) => void,
  ) {
    return (
      <Space size={8} wrap>
        {value === "custom" && (
          <DatePicker.RangePicker
            size="small"
            value={customValue}
            onChange={(r) => onCustomChange(r && r[0] && r[1] ? [r[0], r[1]] : null)}
          />
        )}
        <Select<ChartPeriod>
          size="small"
          variant="filled"
          value={value}
          onChange={onChange}
          options={periodOptions as Array<{ value: ChartPeriod; label: string }>}
          style={{ minInlineSize: 130 }}
        />
      </Space>
    );
  }

  function priorityTag(p: string) {
    const n = parseInt((p ?? "").replace(/\D/g, ""), 10);
    if (n === 1 || n === 2) return <Tag color="red">{t("priorityHigh")}</Tag>;
    if (n === 3) return <Tag color="orange">{t("priorityMedium")}</Tag>;
    if (n === 4 || n === 5) return <Tag color="blue">{t("priorityLow")}</Tag>;
    return <Tag>{p}</Tag>;
  }

  const alertRows: Array<{
    key: string;
    icon: ReactNode;
    tone: string;
    label: string;
    count: number;
  }> = [
    {
      key: "below",
      icon: <WarningOutlined />,
      tone: "var(--fg-warning-subtle)",
      label: t("belowThresholdProducts"),
      count: inventoryReport?.belowThreshold ?? 0,
    },
    {
      key: "out",
      icon: <StopOutlined />,
      tone: "var(--fg-danger)",
      label: t("outOfStockProducts"),
      count: inventoryReport?.outOfStock ?? 0,
    },
    {
      key: "critical",
      icon: <AlertOutlined />,
      tone: "var(--fg-danger-strong)",
      label: t("criticalStock"),
      count: criticalCount,
    },
  ];

  return (
    <>
      {/* En-tête : Vue d'ensemble + scope + période — un seul contrôle
          partagé, qui pilote désormais toutes les sections de la page. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBlockEnd: 12,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          {t("overview")}
        </Title>
        {chartPeriodControls(period, setPeriod, customRange, setCustomRange)}
      </div>

      <ScopeFilterBar />

      <div style={{ display: "flex", flexDirection: "column" }}>
        {widgetEnabled("quick-actions") && (
          <Card style={{ marginBlockEnd: 16, order: widgetOrder("quick-actions") }}>
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <div>
                <Text type="secondary">{t("roleBasedOverview")}</Text>
                <Title level={5} style={{ margin: "2px 0 0" }}>
                  {role || t("assignedRole")}
                </Title>
              </div>
              {focusActions.length > 0 ? (
                <Space wrap>
                  {focusActions.map((action) => (
                    <Button
                      key={action.key}
                      icon={action.icon}
                      onClick={() => navigate(action.path)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </Space>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={t("noAssignedDashboardModules")}
                />
              )}
            </Space>
          </Card>
        )}

        {widgetEnabled("operations") &&
          (canViewKitchen || canViewDelivery || canViewCleaning || canViewMeetingPreparations) && (
            <Row gutter={[16, 16]} style={{ marginBlockEnd: 16, order: widgetOrder("operations") }}>
              {canViewKitchen && (
                <Col xs={24} sm={12} xl={6}>
                  <StatCard
                    tone="brand"
                    icon={<CoffeeOutlined />}
                    title={t("kitchenQueue")}
                    value={String(kitchenQueue?.length ?? 0)}
                    delta={null}
                    deltaLabel={t("overdueCount", {
                      count: (kitchenQueue ?? []).filter(
                        (task) => task.slaDeadline && dayjs(task.slaDeadline).isBefore(dayjs()),
                      ).length,
                    })}
                  />
                </Col>
              )}
              {canViewDelivery && (
                <Col xs={24} sm={12} xl={6}>
                  <StatCard
                    tone="violet"
                    icon={<CarOutlined />}
                    title={t("assignedDeliveries")}
                    value={String(
                      (deliveryQueue ?? []).filter(
                        (task) => !["DELIVERED", "RETURNED", "FAILED"].includes(task.status),
                      ).length,
                    )}
                    delta={null}
                    deltaLabel={t("deliveryIssuesCount", {
                      count: (deliveryQueue ?? []).filter(
                        (task) => task.status === "ISSUE_REPORTED",
                      ).length,
                    })}
                  />
                </Col>
              )}
              {canViewCleaning && (
                <Col xs={24} sm={12} xl={6}>
                  <StatCard
                    tone="success"
                    icon={<ClearOutlined />}
                    title={t("cleaningTasksAssigned")}
                    value={String(
                      (cleaningTasks ?? []).filter(
                        (task) => !["DONE", "VERIFIED", "CANCELLED"].includes(task.status),
                      ).length,
                    )}
                    delta={null}
                    deltaLabel={t("overdueCount", {
                      count: (cleaningTasks ?? []).filter(
                        (task) =>
                          task.dueDate &&
                          dayjs(task.dueDate).isBefore(dayjs()) &&
                          !["DONE", "VERIFIED", "CANCELLED"].includes(task.status),
                      ).length,
                    })}
                  />
                </Col>
              )}
              {canViewMeetingPreparations && (
                <Col xs={24} sm={12} xl={6}>
                  <StatCard
                    tone="brand"
                    icon={<CalendarOutlined />}
                    title={t("meetingPreparationsAssigned")}
                    value={String(
                      (meetingPreparations ?? []).filter(
                        (task) => !["COMPLETED", "VERIFIED", "CANCELLED"].includes(task.status),
                      ).length,
                    )}
                    delta={null}
                    deltaLabel={t("incompleteChecklistsCount", {
                      count: (meetingPreparations ?? []).filter((task) =>
                        task.checklist?.some((item) => !item.done),
                      ).length,
                    })}
                  />
                </Col>
              )}
            </Row>
          )}

        {/* Cartes stats */}
        {widgetEnabled("business-kpis") && canViewReports && (
          <Row
            gutter={[16, 16]}
            style={{ marginBlockEnd: 16, order: widgetOrder("business-kpis") }}
          >
            <Col xs={24} sm={12} xl={6}>
              <StatCard
                tone="brand"
                icon={<CodeSandboxOutlined />}
                title={period === "today" ? t("todayOrders") : t("totalOrders")}
                value={String(ordersReport?.total ?? 0)}
                delta={deltaInfo(ordersReport?.total, ordersPrev?.total)}
                deltaLabel={deltaLabel}
              />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <StatCard
                tone="danger"
                icon={<ClockCircleOutlined />}
                title={t("pendingCount")}
                value={String(pending)}
                delta={deltaInfo(
                  pending,
                  ordersPrev?.byStatus?.["PENDING"] ?? (ordersPrev ? 0 : undefined),
                  { lowerIsBetter: true },
                )}
                deltaLabel={deltaLabel}
              />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <StatCard
                tone="success"
                icon={<CheckCircleOutlined />}
                title={period === "today" ? t("deliveredToday") : t("delivered")}
                value={String(delivered)}
                delta={deltaInfo(
                  delivered,
                  ordersPrev?.byStatus?.["DELIVERED"] ?? (ordersPrev ? 0 : undefined),
                )}
                deltaLabel={deltaLabel}
              />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <StatCard
                tone="violet"
                icon={<LineChartOutlined />}
                title={t("slaRate")}
                value={slaRate == null ? "—" : `${slaRate.toFixed(1)}%`}
                delta={slaDelta}
                deltaLabel={deltaLabel}
              />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <StatCard
                tone={(quotaReport?.nearCapCount ?? 0) > 0 ? "danger" : "brand"}
                icon={<PieChartOutlined />}
                title={t("quotaConsumption")}
                value={`${((quotaReport?.averageConsumptionRate ?? 0) * 100).toFixed(0)}%`}
                delta={null}
                deltaLabel={t("quotaNearCapCount", { count: quotaReport?.nearCapCount ?? 0 })}
              />
            </Col>
          </Row>
        )}

        {widgetEnabled("sla-kpis") && canViewReports && (
          <Row gutter={[16, 16]} style={{ marginBlockEnd: 16, order: widgetOrder("sla-kpis") }}>
            <Col xs={24} sm={12} xl={6}>
              <StatCard
                tone="danger"
                icon={<AlertOutlined />}
                title={t("openOverdue")}
                value={String(slaReport?.openOverdue ?? 0)}
                delta={null}
                deltaLabel=""
              />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <StatCard
                tone="violet"
                icon={<ClockCircleOutlined />}
                title={t("openAtRisk30")}
                value={String(slaReport?.openAtRisk ?? 0)}
                delta={null}
                deltaLabel=""
              />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <StatCard
                tone="brand"
                icon={<FieldTimeOutlined />}
                title={t("medianDeliveryTime")}
                value={
                  slaReport?.medianDeliveryMinutes == null
                    ? "—"
                    : `${slaReport.medianDeliveryMinutes} ${t("minutes")}`
                }
                delta={null}
                deltaLabel=""
              />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <StatCard
                tone="brand"
                icon={<FieldTimeOutlined />}
                title={t("p90DeliveryTime")}
                value={
                  slaReport?.p90DeliveryMinutes == null
                    ? "—"
                    : `${slaReport.p90DeliveryMinutes} ${t("minutes")}`
                }
                delta={null}
                deltaLabel=""
              />
            </Col>
          </Row>
        )}

        {/* Graphiques */}
        {widgetEnabled("charts") && canViewReports && (
          <Row gutter={[16, 16]} style={{ marginBlockEnd: 16, order: widgetOrder("charts") }}>
            <Col xs={24} xl={14}>
              <Card title={t("ordersSlaTrend")}>
                <div style={{ display: "flex", gap: 20, marginBlockEnd: 12 }}>
                  <LegendDot color="var(--brand)" label={t("orders")} />
                  <LegendDot color="var(--sky)" dashed label={t("slaCompliance")} />
                </div>
                {trend.hasData ? (
                  <TrendChart labels={trend.labels} orders={trend.orders} sla={trend.sla} />
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("noData")} />
                )}
              </Card>
            </Col>
            <Col xs={24} xl={10}>
              <Card title={t("ordersByStatus")}>
                <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingBlock: 8 }}>
                  {STATUS_META.map((s) => {
                    const count = statusCounts[s.status] ?? 0;
                    return (
                      <div
                        key={s.status}
                        style={{ display: "flex", alignItems: "center", gap: 12 }}
                      >
                        <Text
                          style={{
                            width: 96,
                            fontSize: 12,
                            color: "var(--fg-body)",
                            textAlign: "end",
                            flexShrink: 0,
                          }}
                        >
                          {t(s.labelKey)}
                        </Text>
                        <div
                          style={{
                            flex: 1,
                            height: 16,
                            borderRadius: 6,
                            background: "var(--neutral-secondary-medium)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${(count / maxStatus) * 100}%`,
                              height: "100%",
                              borderRadius: 6,
                              background: s.color,
                              transition: "width 0.4s",
                            }}
                          />
                        </div>
                        <Text
                          strong
                          style={{ width: 32, fontSize: 12, color: "var(--fg-heading)" }}
                        >
                          {count}
                        </Text>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </Col>
          </Row>
        )}

        {/* Alertes stock + dernières commandes */}
        {widgetEnabled("stock-alerts") && canViewInventory && (
          <Row gutter={[16, 16]} style={{ marginBlockEnd: 16, order: widgetOrder("stock-alerts") }}>
            <Col xs={24}>
              <Card title={t("stockAlerts")}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {alertRows.map((a) => (
                    <div
                      key={a.key}
                      className="alert-row"
                      style={canViewInventory ? undefined : { cursor: "default" }}
                      onClick={
                        canViewInventory ? () => navigate(`/inventory?alert=${a.key}`) : undefined
                      }
                    >
                      <span style={{ fontSize: 16, color: a.tone }}>{a.icon}</span>
                      <Text style={{ flex: 1, fontSize: 13, color: "var(--fg-heading)" }}>
                        {a.label}
                      </Text>
                      <Text strong style={{ fontSize: 13, color: "var(--fg-heading)" }}>
                        {a.count}
                      </Text>
                      {canViewInventory && (
                        <Chevron style={{ fontSize: 11, color: "var(--fg-body-subtle)" }} />
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
          </Row>
        )}
        {widgetEnabled("latest-orders") && canViewOrders && (
          <Row gutter={[16, 16]} style={{ order: widgetOrder("latest-orders") }}>
            <Col xs={24}>
              <Card
                title={t("latestOrders")}
                extra={
                  <Button size="small" onClick={() => navigate("/orders")}>
                    {t("viewAll")}
                  </Button>
                }
              >
                <Table<OrderRow>
                  rowKey="id"
                  dataSource={latestOrders}
                  size="small"
                  pagination={false}
                  scroll={{ x: 640 }}
                  columns={[
                    {
                      title: "ID",
                      dataIndex: "id",
                      render: (v: string) => (
                        <Text strong style={{ fontSize: 12.5 }}>
                          #{v.substring(0, 8).toUpperCase()}
                        </Text>
                      ),
                      width: 110,
                    },
                    {
                      title: t("status"),
                      dataIndex: "status",
                      render: (v: string) => {
                        const meta = STATUS_META.find((s) => s.status === v);
                        return (
                          <Tag color={meta?.tag ?? "default"}>{meta ? t(meta.labelKey) : v}</Tag>
                        );
                      },
                      width: 130,
                    },
                    {
                      title: "SLA",
                      dataIndex: "slaDeadline",
                      render: (v: string) => {
                        if (!v) return "—";
                        const mins = dayjs(v).diff(dayjs(), "minute");
                        return (
                          <Text
                            strong
                            style={{
                              fontSize: 12.5,
                              color: mins >= 0 ? "var(--fg-success)" : "var(--fg-danger)",
                            }}
                          >
                            {mins >= 0 ? "+" : ""}
                            {mins} {t("minutesShort")}
                          </Text>
                        );
                      },
                      width: 100,
                    },
                    {
                      title: t("priority"),
                      dataIndex: "priority",
                      render: priorityTag,
                      width: 110,
                    },
                    {
                      title: t("createdAt"),
                      dataIndex: "createdAt",
                      render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm"),
                    },
                    {
                      title: t("actions"),
                      key: "actions",
                      width: 70,
                      render: () => (
                        <Button
                          type="text"
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => navigate("/orders")}
                        />
                      ),
                    },
                  ]}
                />
              </Card>
            </Col>
          </Row>
        )}
      </div>
    </>
  );
}
