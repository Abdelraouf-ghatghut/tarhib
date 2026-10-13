import { Card, Col, Row, Statistic, Typography, Table, Tag } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  BankOutlined,
  TeamOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { companiesApi, employeesApi, ordersApi } from "../lib/api";

const { Title } = Typography;

export function DashboardPage() {
  const { t } = useTranslation();

  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as unknown[]),
  });

  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeesApi.list().then((r) => r.data as unknown[]),
  });

  const { data: allOrders } = useQuery({
    queryKey: ["orders"],
    queryFn: () => ordersApi.list().then((r) => r.data as OrderRow[]),
  });

  const pending = allOrders?.filter((o) => o.status === "PENDING") ?? [];

  const recentOrders = (allOrders ?? []).slice(0, 10);

  return (
    <>
      <Title level={4}>{t("dashboard")}</Title>

      <Row gutter={[16, 16]} style={{ marginBlockEnd: 24 }}>
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
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("totalOrders")}
              value={allOrders?.length ?? 0}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("totalPending")}
              value={pending.length}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: pending.length > 5 ? "#cf1322" : undefined }}
            />
          </Card>
        </Col>
      </Row>

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
            { title: t("status"), dataIndex: "status", render: statusTag, width: 130 },
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

interface OrderRow {
  id: string;
  status: string;
  priority: string;
  createdAt: string;
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: "orange",
  APPROVED: "blue",
  IN_PROGRESS: "processing",
  DELIVERED: "green",
  REJECTED: "red",
};

function statusTag(status: string) {
  return <Tag color={STATUS_COLOR[status] ?? "default"}>{status}</Tag>;
}
