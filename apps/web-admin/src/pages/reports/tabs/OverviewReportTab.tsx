import { Card, Col, Empty, Row, Table } from "antd";
import {
  BankOutlined,
  BranchesOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  LineChartOutlined,
  FieldTimeOutlined,
  DollarOutlined,
  WarningOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { reportingApi } from "../../../lib/api";
import type { ExecutiveReport, ReportParams } from "../types";
import { useReportLookups } from "../useReportLookups";
import { StatCard } from "../../dashboard/StatCard";
import { TrendChart, LegendDot } from "../../dashboard/TrendChart";
import { deltaInfo } from "../../dashboard/deltaInfo";

/** today/week/month restent lisibles au jour ; year passe au mois pour ne pas
 * afficher 365 points. Simplification assumée pour "custom" (toujours "day"). */
function granularityFor(params: ReportParams): "day" | "month" {
  if (!params.from || !params.to) return "day";
  const days = dayjs(params.to).diff(dayjs(params.from), "day");
  return days > 92 ? "month" : "day";
}

/** Même fenêtre de comparaison que le Dashboard : période précédente de
 * durée identique, immédiatement avant celle sélectionnée. */
function previousRange(params: ReportParams): { from: string; to: string } | null {
  if (!params.from || !params.to) return null;
  const from = dayjs(params.from);
  const to = dayjs(params.to);
  const days = to.diff(from, "day") + 1;
  const prevTo = from.subtract(1, "day");
  const prevFrom = prevTo.subtract(days - 1, "day");
  return { from: prevFrom.toISOString(), to: prevTo.endOf("day").toISOString() };
}

export function OverviewReportTab({
  params,
  filterCompanyId,
  canViewCosts,
  isSuperadmin,
}: {
  params: Record<string, string>;
  filterCompanyId: string | undefined;
  canViewCosts: boolean;
  isSuperadmin: boolean;
}) {
  const { t } = useTranslation();
  const { companyName, productName } = useReportLookups(filterCompanyId);
  const granularity = granularityFor(params);
  const prevRange = previousRange(params);

  const { data, isPending } = useQuery({
    queryKey: ["reports", "executive", params, granularity],
    queryFn: () =>
      reportingApi.executive({ ...params, granularity }).then((r) => r.data as ExecutiveReport),
  });

  // Même logique que le Dashboard : une seconde requête, sur la période
  // immédiatement précédente, alimente les indicateurs d'évolution des cartes.
  const { data: prevData } = useQuery({
    queryKey: ["reports", "executive-prev", params, prevRange],
    queryFn: () =>
      reportingApi
        .executive({
          ...params,
          ...(prevRange ?? {}),
        })
        .then((r) => r.data as ExecutiveReport),
    enabled: !!prevRange,
  });

  const deltaLabel = t("vsPrevious");
  const slaRate = data?.kpis.slaComplianceRate ?? 0;
  const slaDelta =
    prevData?.kpis.slaComplianceRate === undefined
      ? null
      : {
          text: `${slaRate - prevData.kpis.slaComplianceRate >= 0 ? "+" : ""}${(slaRate - prevData.kpis.slaComplianceRate).toFixed(1)}%`,
          up: slaRate - prevData.kpis.slaComplianceRate >= 0,
        };

  // Fusionne ordersTrend/slaTrend (deux séries indépendantes côté API) en un
  // seul jeu de points alignés par bucket pour le graphique.
  const buckets = Array.from(
    new Set([
      ...(data?.ordersTrend ?? []).map((b) => b.bucket),
      ...(data?.slaTrend ?? []).map((b) => b.bucket),
    ]),
  ).sort();
  const orderByBucket = new Map((data?.ordersTrend ?? []).map((b) => [b.bucket, b.count]));
  const slaByBucket = new Map((data?.slaTrend ?? []).map((b) => [b.bucket, b.rate]));
  const trendLabels = buckets.map((b) =>
    dayjs(b).format(granularity === "month" ? "MMM" : "DD/MM"),
  );
  const trendOrders = buckets.map((b) => orderByBucket.get(b) ?? 0);
  const trendSla = buckets.map((b) => slaByBucket.get(b) ?? null);
  const hasTrendData = buckets.length > 0;

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBlockEnd: 16 }}>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            tone="brand"
            icon={<BankOutlined />}
            title={t("companies")}
            value={String(data?.kpis.companiesCount ?? 0)}
            delta={null}
            deltaLabel=""
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            tone="brand"
            icon={<BranchesOutlined />}
            title={t("branches")}
            value={String(data?.kpis.branchesCount ?? 0)}
            delta={null}
            deltaLabel=""
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            tone="brand"
            icon={<TeamOutlined />}
            title={t("clientEmployeesCount")}
            value={String(data?.kpis.clientEmployeesCount ?? 0)}
            delta={null}
            deltaLabel=""
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            tone="violet"
            icon={<LineChartOutlined />}
            title={t("complianceRate")}
            value={`${slaRate.toFixed(1)}%`}
            delta={slaDelta}
            deltaLabel={deltaLabel}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBlockEnd: 16 }}>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            tone="success"
            icon={<CheckCircleOutlined />}
            title={t("delivered")}
            value={String(data?.kpis.deliveredCount ?? 0)}
            delta={deltaInfo(data?.kpis.deliveredCount, prevData?.kpis.deliveredCount)}
            deltaLabel={deltaLabel}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            tone="danger"
            icon={<ClockCircleOutlined />}
            title={t("pending")}
            value={String(data?.kpis.pendingCount ?? 0)}
            delta={deltaInfo(data?.kpis.pendingCount, prevData?.kpis.pendingCount)}
            deltaLabel={deltaLabel}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            tone="danger"
            icon={<StopOutlined />}
            title={t("rejected")}
            value={String(data?.kpis.rejectedCount ?? 0)}
            delta={deltaInfo(data?.kpis.rejectedCount, prevData?.kpis.rejectedCount)}
            deltaLabel={deltaLabel}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            tone="brand"
            icon={<FieldTimeOutlined />}
            title={t("avgDeliveryTime")}
            value={`${data?.kpis.avgDeliveryMinutes ?? 0} ${t("minutes")}`}
            delta={deltaInfo(data?.kpis.avgDeliveryMinutes, prevData?.kpis.avgDeliveryMinutes)}
            deltaLabel={deltaLabel}
          />
        </Col>
      </Row>

      {canViewCosts && (
        <Row gutter={[16, 16]} style={{ marginBlockEnd: 16 }}>
          <Col xs={24} sm={12} xl={8}>
            <StatCard
              tone="brand"
              icon={<DollarOutlined />}
              title={t("totalStockValue")}
              value={`${(data?.kpis.totalStockValue ?? 0).toFixed(2)} ${t("currencyUnit")}`}
              delta={null}
              deltaLabel=""
            />
          </Col>
          <Col xs={24} sm={12} xl={8}>
            <StatCard
              tone="danger"
              icon={<WarningOutlined />}
              title={t("outOfStock")}
              value={String(data?.kpis.outOfStockCount ?? 0)}
              delta={null}
              deltaLabel=""
            />
          </Col>
          <Col xs={24} sm={12} xl={8}>
            <StatCard
              tone="brand"
              icon={<ShoppingCartOutlined />}
              title={t("totalSpend")}
              value={`${(data?.kpis.purchasingSpend ?? 0).toFixed(2)} ${t("currencyUnit")}`}
              delta={deltaInfo(data?.kpis.purchasingSpend, prevData?.kpis.purchasingSpend)}
              deltaLabel={deltaLabel}
            />
          </Col>
        </Row>
      )}

      <Row gutter={[16, 16]} style={{ marginBlockEnd: 16 }}>
        <Col span={24}>
          <Card title={t("ordersSlaTrend")} loading={isPending}>
            <div style={{ display: "flex", gap: 20, marginBlockEnd: 12 }}>
              <LegendDot color="var(--brand)" label={t("orders")} />
              <LegendDot color="var(--sky)" dashed label={t("slaCompliance")} />
            </div>
            {hasTrendData ? (
              <TrendChart labels={trendLabels} orders={trendOrders} sla={trendSla} />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("noData")} />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {isSuperadmin && (
          <Col xs={24} sm={12}>
            <Card title={t("topCompanies")} loading={isPending}>
              <Table
                rowKey="companyId"
                dataSource={data?.topCompanies ?? []}
                pagination={false}
                size="small"
                scroll={{ x: "max-content" }}
                columns={[
                  {
                    title: t("company"),
                    dataIndex: "companyId",
                    render: (id: string) => companyName(id) ?? id.slice(0, 8),
                  },
                  { title: t("totalOrders"), dataIndex: "orderCount" },
                  { title: t("consumption"), dataIndex: "consumption" },
                  {
                    title: t("complianceRate"),
                    dataIndex: "slaRate",
                    render: (v: number) => `${v}%`,
                  },
                ]}
              />
            </Card>
          </Col>
        )}
        <Col xs={24} sm={isSuperadmin ? 12 : 24}>
          <Card title={t("topProducts")} loading={isPending}>
            <Table
              rowKey="productId"
              dataSource={data?.topProducts ?? []}
              pagination={false}
              size="small"
              scroll={{ x: "max-content" }}
              columns={[
                { title: t("product"), dataIndex: "productId", render: productName },
                { title: t("totalOrders"), dataIndex: "orderCount" },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}
