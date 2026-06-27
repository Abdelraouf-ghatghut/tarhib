import { Card, Col, Progress, Row, Space, Statistic, Tag, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { reportingApi } from "../../lib/api";

const { Title } = Typography;

interface OrdersReport {
  total: number;
  byStatus: Record<string, number>;
}

interface InventoryReport {
  total: number;
  belowThreshold: number;
  outOfStock: number;
}

interface SlaReport {
  total: number;
  onTime: number;
  late: number;
  complianceRate: number;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "orange",
  APPROVED: "blue",
  IN_PROGRESS: "processing",
  DELIVERED: "green",
  REJECTED: "red",
};

const STATUS_I18N_KEYS: Record<string, string> = {
  PENDING: "pending",
  APPROVED: "approved",
  IN_PROGRESS: "inProgress",
  DELIVERED: "delivered",
  REJECTED: "rejected",
};

export function ReportsPage() {
  const { t } = useTranslation();

  const { data: ordersData } = useQuery({
    queryKey: ["reports", "orders"],
    queryFn: () => reportingApi.orders().then((r) => r.data as OrdersReport),
  });

  const { data: inventoryData } = useQuery({
    queryKey: ["reports", "inventory"],
    queryFn: () => reportingApi.inventory().then((r) => r.data as InventoryReport),
  });

  const { data: slaData } = useQuery({
    queryKey: ["reports", "sla"],
    queryFn: () => reportingApi.sla().then((r) => r.data as SlaReport),
  });

  const complianceRate = Math.round(slaData?.complianceRate ?? 0);

  return (
    <>
      <Title level={4}>{t("reports")}</Title>

      {/* Orders section */}
      <Title level={5} style={{ marginBlockStart: 24 }}>
        {t("ordersReport")}
      </Title>
      <Row gutter={[16, 16]} style={{ marginBlockEnd: 32 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title={t("totalOrders")} value={ordersData?.total ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={16}>
          <Card title={t("status")}>
            <Space wrap>
              {Object.keys(ordersData?.byStatus ?? {}).length > 0 ? (
                Object.entries(ordersData?.byStatus ?? {}).map(([status, count]) => (
                  <Tag color={STATUS_COLORS[status] ?? "default"} key={status}>
                    {t(STATUS_I18N_KEYS[status] ?? status.toLowerCase())} : {count}
                  </Tag>
                ))
              ) : (
                <span style={{ color: "#8c8c8c" }}>{t("noData")}</span>
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Inventory section */}
      <Title level={5} style={{ marginBlockStart: 24 }}>
        {t("inventoryReport")}
      </Title>
      <Row gutter={[16, 16]} style={{ marginBlockEnd: 32 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title={t("totalItems")} value={inventoryData?.total ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title={t("restockAlert")}
              value={inventoryData?.belowThreshold ?? 0}
              valueStyle={inventoryData?.belowThreshold ? { color: "#faad14" } : undefined}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title={t("outOfStock")}
              value={inventoryData?.outOfStock ?? 0}
              valueStyle={inventoryData?.outOfStock ? { color: "#cf1322" } : undefined}
            />
          </Card>
        </Col>
      </Row>

      {/* SLA section */}
      <Title level={5} style={{ marginBlockStart: 24 }}>
        {t("slaReport")}
      </Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title={t("onTime")}
              value={slaData?.onTime ?? 0}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title={t("late")}
              value={slaData?.late ?? 0}
              valueStyle={slaData?.late ? { color: "#cf1322" } : undefined}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <div style={{ marginBlockEnd: 12, fontWeight: 500 }}>{t("complianceRate")}</div>
            <Progress
              type="circle"
              percent={complianceRate}
              size={80}
              strokeColor={
                complianceRate >= 90 ? "#52c41a" : complianceRate >= 70 ? "#faad14" : "#cf1322"
              }
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}
