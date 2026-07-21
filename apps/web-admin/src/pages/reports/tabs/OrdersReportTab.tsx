import { Card, Col, Progress, Row, Space, Statistic, Tag } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { reportingApi } from "../../../lib/api";
import type { OrdersReport, SlaReport } from "../types";
import { STATUS_COLORS, STATUS_KEY } from "../types";

// Regroupement large P1/P2 (urgent) / P3 (medium) / P4/P5 (bas) — même
// convention de couleur que les tags de priorité du tableau de bord.
function priorityColor(priority: string): string {
  const n = parseInt(priority.replace(/\D/g, ""), 10);
  if (n <= 2) return "red";
  if (n === 3) return "orange";
  return "blue";
}

export function OrdersReportTab({ params }: { params: Record<string, string> }) {
  const { t } = useTranslation();

  const { data: ordersData, isPending: loadingOrders } = useQuery({
    queryKey: ["reports", "orders", params],
    queryFn: () => reportingApi.orders(params).then((r) => r.data as OrdersReport),
  });

  const { data: slaData, isPending: loadingSla } = useQuery({
    queryKey: ["reports", "sla", params],
    queryFn: () => reportingApi.sla(params).then((r) => r.data as SlaReport),
  });

  const complianceRate = Math.round(slaData?.complianceRate ?? 0);

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBlockEnd: 24 }}>
        <Col xs={24} sm={8}>
          <Card loading={loadingOrders}>
            <Statistic title={t("totalOrders")} value={ordersData?.total ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loadingSla}>
            <Statistic
              title={t("onTime")}
              value={slaData?.onTime ?? 0}
              valueStyle={{ color: "var(--fg-success)" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loadingSla}>
            <Statistic
              title={t("late")}
              value={slaData?.late ?? 0}
              valueStyle={slaData?.late ? { color: "var(--fg-danger)" } : undefined}
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginBlockEnd: 24 }}>
        <Col xs={24} sm={12}>
          <Card title={t("status")} loading={loadingOrders}>
            <Space wrap>
              {Object.entries(ordersData?.byStatus ?? {}).map(([s, c]) => (
                <Tag color={STATUS_COLORS[s] ?? "default"} key={s}>
                  {STATUS_KEY[s] ? t(STATUS_KEY[s]) : s}: {c}
                </Tag>
              ))}
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card title={t("priority")} loading={loadingOrders}>
            <Space wrap>
              {Object.entries(ordersData?.byPriority ?? {}).map(([p, c]) => (
                <Tag color={priorityColor(p)} key={p}>
                  {p}: {c}
                </Tag>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card title={t("complianceRate")} loading={loadingSla}>
            <Progress
              type="circle"
              percent={complianceRate}
              size={100}
              strokeColor={
                complianceRate >= 90
                  ? "var(--fg-success)"
                  : complianceRate >= 70
                    ? "var(--fg-warning-subtle)"
                    : "var(--fg-danger)"
              }
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}
