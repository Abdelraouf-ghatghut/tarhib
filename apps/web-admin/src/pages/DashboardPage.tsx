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
  RiseOutlined,
  FallOutlined,
  WarningOutlined,
  StopOutlined,
  AlertOutlined,
  EyeOutlined,
  RightOutlined,
  LeftOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import dayjs, { type Dayjs } from "dayjs";
import { inventoryApi, ordersApi, reportingApi } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { useScope } from "../contexts/ScopeContext";
import { ScopeFilterBar } from "../components/ScopeFilterBar";

const { Title, Text } = Typography;

interface OrderRow {
  id: string;
  status: string;
  priority: string;
  slaDeadline: string;
  createdAt: string;
}

interface InventoryReport {
  belowThreshold: number;
  outOfStock: number;
}

interface StockAlertItem {
  quantity: number;
  minThreshold: number;
}

interface SlaReport {
  complianceRate: number;
}

interface OrdersReport {
  total: number;
  byStatus: Record<string, number>;
}

const STATUS_META: Array<{ status: string; labelKey: string; color: string; tag: string }> = [
  { status: "PENDING", labelKey: "pending", color: "var(--danger)", tag: "red" },
  { status: "APPROVED", labelKey: "approved", color: "var(--brand)", tag: "blue" },
  { status: "IN_PROGRESS", labelKey: "inProgress", color: "var(--warning)", tag: "orange" },
  { status: "DELIVERED", labelKey: "delivered", color: "var(--success)", tag: "green" },
  { status: "REJECTED", labelKey: "rejected", color: "var(--gray)", tag: "default" },
];

type ChartPeriod = "today" | "week" | "month" | "year" | "custom";

const fmt = (d: Dayjs) => d.format("YYYY-MM-DD");

/** Bornes réelles d'une période de graphique (custom = plage sélectionnée). */
function periodRange(
  period: ChartPeriod,
  custom: [Dayjs, Dayjs] | null,
): { from: Dayjs; to: Dayjs } {
  const now = dayjs();
  if (period === "today") return { from: now.startOf("day"), to: now.endOf("day") };
  if (period === "week")
    return { from: now.subtract(6, "day").startOf("day"), to: now.endOf("day") };
  if (period === "month") return { from: now.startOf("month"), to: now.endOf("day") };
  if (period === "year") return { from: now.startOf("year"), to: now.endOf("day") };
  if (custom) return { from: custom[0].startOf("day"), to: custom[1].endOf("day") };
  return { from: now.startOf("month"), to: now.endOf("day") };
}

/** Agrège les commandes en buckets adaptés à la durée (heures / jours / mois). */
function buildTrend(orders: OrderRow[], from: Dayjs, to: Dayjs, locale: string) {
  const spanDays = to.diff(from, "day") + 1;
  const unit: "hour" | "day" | "month" = spanDays <= 1 ? "hour" : spanDays <= 92 ? "day" : "month";
  const starts: Dayjs[] = [];
  let cursor = from.startOf(unit);
  while (starts.length < 500 && (cursor.isBefore(to) || cursor.isSame(to, unit))) {
    starts.push(cursor);
    cursor = cursor.add(1, unit);
  }

  const buckets = starts.map(() => ({ total: 0, delivered: 0 }));
  for (const o of orders) {
    const d = dayjs(o.createdAt);
    if (d.isBefore(from) || d.isAfter(to)) continue;
    const idx =
      unit === "month"
        ? (d.year() - starts[0].year()) * 12 + d.month() - starts[0].month()
        : d.startOf(unit).diff(starts[0], unit);
    if (idx < 0 || idx >= buckets.length) continue;
    buckets[idx].total += 1;
    if (o.status === "DELIVERED") buckets[idx].delivered += 1;
  }

  const monthFmt = new Intl.DateTimeFormat(locale, { month: "short" });
  const labelEvery = Math.max(1, Math.ceil(starts.length / 12));
  const labels = starts.map((s, i) => {
    if (i % labelEvery !== 0) return "";
    if (unit === "hour") return s.format("HH:mm");
    if (unit === "day") return s.format("DD/MM");
    return monthFmt.format(s.toDate());
  });

  return {
    labels,
    orders: buckets.map((b) => b.total),
    sla: buckets.map((b) => (b.total === 0 ? null : (b.delivered / b.total) * 100)),
    hasData: buckets.some((b) => b.total > 0),
  };
}

function niceMax(v: number): number {
  if (v <= 10) return 10;
  const mag = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / mag) * mag;
}

function smoothPath(pts: Array<[number, number]>): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/** Courbe commandes (aire dégradée) + conformité SLA en pointillés, SVG sans dépendance. */
function TrendChart({
  labels,
  orders,
  sla,
}: {
  labels: string[];
  orders: number[];
  sla: Array<number | null>;
}) {
  const W = 720;
  const H = 210;
  const PAD = { top: 12, bottom: 8, left: 40, right: 36 };
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const yMax = niceMax(Math.max(...orders, 1));
  const x = (i: number) =>
    PAD.left + (labels.length === 1 ? iw / 2 : (i / (labels.length - 1)) * iw);
  const yOrders = (v: number) => PAD.top + ih - (v / yMax) * ih;
  const ySla = (v: number) => PAD.top + ih - (v / 100) * ih;

  const orderPts = orders.map((v, i) => [x(i), yOrders(v)] as [number, number]);
  const slaPts = sla
    .map((v, i) => (v === null ? null : ([x(i), ySla(v)] as [number, number])))
    .filter((p): p is [number, number] => p !== null);
  const line = smoothPath(orderPts);
  const area =
    orderPts.length >= 2
      ? `${line} L ${orderPts[orderPts.length - 1][0]},${PAD.top + ih} L ${orderPts[0][0]},${PAD.top + ih} Z`
      : "";

  const gridYs = [0, 0.25, 0.5, 0.75, 1];

  // Les graphiques restent LTR même en RTL (convention charts)
  return (
    <div dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          <linearGradient id="ordersFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--brand)", stopOpacity: 0.22 }} />
            <stop offset="100%" style={{ stopColor: "var(--brand)", stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        {gridYs.map((g) => (
          <line
            key={g}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + ih * g}
            y2={PAD.top + ih * g}
            stroke="var(--border-default-medium)"
            strokeWidth={1}
          />
        ))}
        {gridYs.map((g) => (
          <text
            key={`l${g}`}
            x={PAD.left - 8}
            y={PAD.top + ih * g + 4}
            textAnchor="end"
            style={{ fontSize: 11, fill: "var(--fg-body-subtle)" }}
          >
            {Math.round(yMax * (1 - g))}
          </text>
        ))}
        {[0, 50, 100].map((v) => (
          <text
            key={`r${v}`}
            x={W - PAD.right + 8}
            y={ySla(v) + 4}
            textAnchor="start"
            style={{ fontSize: 11, fill: "var(--fg-body-subtle)" }}
          >
            {v}%
          </text>
        ))}
        {area && <path d={area} fill="url(#ordersFill)" />}
        {line && (
          <path
            d={line}
            fill="none"
            stroke="var(--brand)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        )}
        {slaPts.length >= 2 && (
          <path
            d={smoothPath(slaPts)}
            fill="none"
            stroke="var(--sky)"
            strokeWidth={2}
            strokeDasharray="5 5"
            strokeLinecap="round"
          />
        )}
      </svg>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          paddingInline: `${PAD.left}px ${PAD.right}px`,
          marginBlockStart: 4,
        }}
      >
        {labels.map((m, i) => (
          <Text key={`${m}-${i}`} style={{ fontSize: 11, color: "var(--fg-body-subtle)" }}>
            {m}
          </Text>
        ))}
      </div>
    </div>
  );
}

function LegendDot({ color, dashed, label }: { color: string; dashed?: boolean; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 16,
          height: 0,
          borderTop: `2.5px ${dashed ? "dashed" : "solid"} ${color}`,
          borderRadius: 2,
        }}
      />
      <Text style={{ fontSize: 12, color: "var(--fg-body)" }}>{label}</Text>
    </span>
  );
}

interface DeltaInfo {
  text: string;
  up: boolean;
}

/**
 * Comparaison fonctionnelle même sans historique : période précédente vide
 * → variation absolue (+N) ; sinon pourcentage signé.
 */
function deltaInfo(cur: number | undefined, prev: number | undefined): DeltaInfo | null {
  if (cur === undefined || prev === undefined) return null;
  if (prev === 0 && cur === 0) return { text: "0%", up: true };
  if (prev === 0) return { text: `+${cur}`, up: true };
  const pct = ((cur - prev) / prev) * 100;
  return { text: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, up: pct >= 0 };
}

function StatCard({
  tone,
  icon,
  title,
  value,
  delta,
  deltaLabel,
}: {
  tone: "brand" | "danger" | "success" | "violet";
  icon: ReactNode;
  title: string;
  value: string;
  delta: DeltaInfo | null;
  deltaLabel: string;
}) {
  return (
    <Card className={`stat-card stat-card--${tone}`} variant="borderless">
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span className={`stat-icon stat-icon--${tone}`}>{icon}</span>
        <div>
          <Text style={{ fontSize: 13, color: "var(--fg-body)" }}>{title}</Text>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "var(--fg-heading)",
              lineHeight: 1.15,
            }}
          >
            {value}
          </div>
        </div>
      </div>
      <div style={{ marginBlockStart: 12, display: "flex", alignItems: "center", gap: 6 }}>
        {delta === null ? (
          <Text style={{ fontSize: 12, color: "var(--fg-body-subtle)" }}>—</Text>
        ) : (
          <Text
            strong
            style={{ fontSize: 12, color: delta.up ? "var(--fg-success)" : "var(--fg-danger)" }}
          >
            {delta.up ? <RiseOutlined /> : <FallOutlined />} {delta.text}
          </Text>
        )}
        <Text style={{ fontSize: 12, color: "var(--fg-body-subtle)" }}>{deltaLabel}</Text>
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { companyId: authCompanyId, hasPermission } = useAuth();
  const canViewInventory = hasPermission("inventory.manage") || hasPermission("company.manage");
  const { companyId: scopeCompanyId, branchId: scopeBranchId } = useScope();
  const navigate = useNavigate();
  const isAr = i18n.language.startsWith("ar");
  const companyId = scopeCompanyId ?? authCompanyId;

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
  });

  const { data: ordersPrev } = useQuery({
    queryKey: ["dash", "orders-prev", companyId, scopeBranchId, range.prevFrom, range.prevTo],
    queryFn: () =>
      reportingApi
        .orders({ ...scope, from: range.prevFrom, to: range.prevTo })
        .then((r) => r.data as OrdersReport),
  });

  const { data: slaReport } = useQuery({
    queryKey: ["dash", "sla", companyId, scopeBranchId, range.from, range.to],
    queryFn: () =>
      reportingApi
        .sla({ ...scope, from: range.from, to: range.to })
        .then((r) => r.data as SlaReport),
  });

  const { data: slaPrev } = useQuery({
    queryKey: ["dash", "sla-prev", companyId, scopeBranchId, range.prevFrom, range.prevTo],
    queryFn: () =>
      reportingApi
        .sla({ ...scope, from: range.prevFrom, to: range.prevTo })
        .then((r) => r.data as SlaReport),
  });

  const { data: inventoryReport } = useQuery({
    queryKey: ["dash", "inventory", companyId],
    queryFn: () =>
      reportingApi
        .inventory(companyId ? { companyId } : undefined)
        .then((r) => r.data as InventoryReport),
  });

  const { data: alertItems } = useQuery({
    queryKey: ["dash", "stock-alerts", companyId],
    queryFn: () =>
      inventoryApi
        .alerts(companyId ? { companyId } : undefined)
        .then((r) => r.data as StockAlertItem[]),
  });

  const { data: allOrders } = useQuery({
    queryKey: ["orders", companyId],
    queryFn: () =>
      ordersApi.list(companyId ? { companyId } : undefined).then((r) => r.data as OrderRow[]),
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
  const slaRate = slaReport?.complianceRate ?? 100;
  const slaDelta: DeltaInfo | null =
    slaPrev?.complianceRate === undefined
      ? null
      : {
          text: `${slaRate - slaPrev.complianceRate >= 0 ? "+" : ""}${(slaRate - slaPrev.complianceRate).toFixed(1)}%`,
          up: slaRate - slaPrev.complianceRate >= 0,
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

      {/* Cartes stats */}
      <Row gutter={[16, 16]} style={{ marginBlockEnd: 16 }}>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            tone="brand"
            icon={<CodeSandboxOutlined />}
            title={t("todayOrders")}
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
            )}
            deltaLabel={deltaLabel}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            tone="success"
            icon={<CheckCircleOutlined />}
            title={t("deliveredToday")}
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
            value={`${slaRate.toFixed(1)}%`}
            delta={slaDelta}
            deltaLabel={deltaLabel}
          />
        </Col>
      </Row>

      {/* Graphiques */}
      <Row gutter={[16, 16]} style={{ marginBlockEnd: 16 }}>
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
                  <div key={s.status} style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
                    <Text strong style={{ width: 32, fontSize: 12, color: "var(--fg-heading)" }}>
                      {count}
                    </Text>
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Alertes stock + dernières commandes */}
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={8}>
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
        <Col xs={24} xl={16}>
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
                    return <Tag color={meta?.tag ?? "default"}>{meta ? t(meta.labelKey) : v}</Tag>;
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
    </>
  );
}
