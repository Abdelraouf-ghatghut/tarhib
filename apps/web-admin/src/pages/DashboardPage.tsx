import { Card, Col, Row, Statistic, Tag, Table, Typography } from "antd";
import {
  BankOutlined,
  TeamOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  AlertOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { companiesApi, employeesApi, ordersApi, reportingApi } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

const { Title } = Typography;

interface OrderRow {
  id: string;
  status: string;
  priority: string;
  createdAt: string;
}

interface InventoryReport {
  belowThreshold: number;
  outOfStock: number;
}

interface MeetingRoomsReport {
  totalBookings: number;
  confirmed: number;
}

interface SlaReport {
  complianceRate: number;
}

interface OrdersReport {
  total: number;
  byStatus: Record<string, number>;
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: "orange",
  APPROVED: "blue",
  IN_PROGRESS: "processing",
  DELIVERED: "green",
  REJECTED: "red",
};

const today = new Date().toISOString().slice(0, 10);

export function DashboardPage() {
  const { t } = useTranslation();
  const { companyId } = useAuth();
  const params = companyId ? { companyId, from: today, to: today } : { from: today, to: today };

  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as unknown[]),
  });

  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeesApi.list().then((r) => r.data as unknown[]),
  });

  const { data: ordersReport } = useQuery({
    queryKey: ["reports", "orders-today", companyId],
    queryFn: () => reportingApi.orders(params).then((r) => r.data as OrdersReport),
  });

  const { data: slaReport } = useQuery({
    queryKey: ["reports", "sla-today", companyId],
    queryFn: () => reportingApi.sla(params).then((r) => r.data as SlaReport),
  });

  const { data: inventoryReport } = useQuery({
    queryKey: ["reports", "inventory", companyId],
    queryFn: () =>
      reportingApi
        .inventory(companyId ? { companyId } : undefined)
        .then((r) => r.data as InventoryReport),
  });

  const { data: meetingReport } = useQuery({
    queryKey: ["reports", "meeting-rooms-today", companyId],
    queryFn: () => reportingApi.meetingRooms(params).then((r) => r.data as MeetingRoomsReport),
  });

  const { data: allOrders } = useQuery({
    queryKey: ["orders"],
    queryFn: () => ordersApi.list().then((r) => r.data as OrderRow[]),
  });

  const recentOrders = (allOrders ?? []).slice(0, 10);
  const pending = ordersReport?.byStatus?.["PENDING"] ?? 0;
  const delivered = ordersReport?.byStatus?.["DELIVERED"] ?? 0;

  return (
    <>
      <Title level={4}>{t("dashboard")}</Title>

      {/* Row 1 — orders & SLA */}
      <Row gutter={[16, 16]} style={{ marginBlockEnd: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("todayOrders")}
              value={ordersReport?.total ?? 0}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("pendingCount")}
              value={pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={pending > 5 ? { color: "#cf1322" } : undefined}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("deliveredToday")}
              value={delivered}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("slaRate")}
              value={slaReport?.complianceRate ?? 100}
              suffix="%"
              valueStyle={
                (slaReport?.complianceRate ?? 100) < 80 ? { color: "#cf1322" } : undefined
              }
            />
          </Card>
        </Col>
      </Row>

      {/* Row 2 — stock */}
      <Row gutter={[16, 16]} style={{ marginBlockEnd: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("stockAlerts")}
              value={inventoryReport?.belowThreshold ?? 0}
              prefix={<AlertOutlined />}
              valueStyle={
                (inventoryReport?.belowThreshold ?? 0) > 0 ? { color: "#faad14" } : undefined
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("outOfStock")}
              value={inventoryReport?.outOfStock ?? 0}
              valueStyle={(inventoryReport?.outOfStock ?? 0) > 0 ? { color: "#cf1322" } : undefined}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("totalCompanies")}
              value={companies?.length ?? 0}
              prefix={<BankOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("totalEmployees")}
              value={employees?.length ?? 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Row 3 — meeting rooms */}
      <Row gutter={[16, 16]} style={{ marginBlockEnd: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("bookingsToday")}
              value={meetingReport?.totalBookings ?? 0}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("confirmedBookings")}
              value={meetingReport?.confirmed ?? 0}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Recent orders table */}
      <Card title={t("orders")}>
        <Table<OrderRow>
          rowKey="id"
          dataSource={recentOrders}
          size="small"
          pagination={false}
          columns={[
            {
              title: "ID",
              dataIndex: "id",
              render: (v: string) => v.substring(0, 8).toUpperCase(),
              width: 100,
            },
            {
              title: t("status"),
              dataIndex: "status",
              render: (v: string) => <Tag color={STATUS_COLOR[v] ?? "default"}>{v}</Tag>,
              width: 130,
            },
            { title: t("priority"), dataIndex: "priority", width: 80 },
            {
              title: t("createdAt"),
              dataIndex: "createdAt",
              render: (v: string) => v.substring(0, 16),
            },
          ]}
        />
      </Card>
    </>
  );
}
