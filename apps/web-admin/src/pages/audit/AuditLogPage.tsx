import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, Tag, Typography, Space, Select, DatePicker, Button, Card, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { auditApi } from "../../lib/api";

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface AuditLog {
  id: string;
  userId: string;
  userEmail: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

const METHOD_COLORS: Record<string, string> = {
  POST: "green",
  PATCH: "blue",
  PUT: "blue",
  DELETE: "red",
};

const ENTITIES = [
  "orders",
  "inventory",
  "products",
  "employees",
  "companies",
  "branches",
  "procurement",
  "suppliers",
  "vip-self-service",
  "meeting-rooms",
  "quotas",
  "auth",
];

export default function AuditLogPage() {
  const { t } = useTranslation();
  const [entity, setEntity] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", entity, dateRange, page],
    queryFn: async () => {
      const res = await auditApi.list({
        entity,
        startDate: dateRange?.[0],
        endDate: dateRange?.[1],
        page,
        limit: 50,
      });
      return res.data as { data: AuditLog[]; total: number };
    },
  });

  const columns: ColumnsType<AuditLog> = [
    {
      title: t("audit.date"),
      dataIndex: "createdAt",
      width: 160,
      render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      title: t("audit.action"),
      dataIndex: "action",
      width: 200,
      render: (action: string) => {
        const [method, ...rest] = action.split(":");
        return (
          <Space>
            <Tag color={METHOD_COLORS[method] ?? "default"}>{method}</Tag>
            <span>{rest.join(":").toLowerCase()}</span>
          </Space>
        );
      },
    },
    {
      title: t("audit.entity"),
      dataIndex: "entity",
      width: 140,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: t("audit.entityId"),
      dataIndex: "entityId",
      width: 120,
      render: (v: string | null) =>
        v ? (
          <Tooltip title={v}>
            <span style={{ fontFamily: "monospace" }}>{v.slice(0, 8)}…</span>
          </Tooltip>
        ) : (
          "—"
        ),
    },
    {
      title: t("audit.user"),
      key: "user",
      width: 200,
      render: (_: unknown, row: AuditLog) => row.userEmail ?? row.userId,
    },
    {
      title: t("audit.ip"),
      dataIndex: "ipAddress",
      width: 120,
      render: (v: string | null) => v ?? "—",
    },
    {
      title: t("audit.details"),
      dataIndex: "metadata",
      render: (v: Record<string, unknown> | null) =>
        v ? (
          <Tooltip title={<pre style={{ fontSize: 11 }}>{JSON.stringify(v, null, 2)}</pre>}>
            <Button size="small" type="link">
              {t("audit.viewDetails")}
            </Button>
          </Tooltip>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>{t("audit.title")}</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            allowClear
            placeholder={t("audit.filterEntity")}
            style={{ width: 180 }}
            options={ENTITIES.map((e) => ({ label: e, value: e }))}
            onChange={(v) => {
              setEntity(v);
              setPage(1);
            }}
          />
          <RangePicker
            onChange={(_, str) => {
              setDateRange(str[0] && str[1] ? [str[0], str[1]] : null);
              setPage(1);
            }}
          />
          <Button
            onClick={() => {
              setEntity(undefined);
              setDateRange(null);
              setPage(1);
            }}
          >
            {t("audit.reset")}
          </Button>
        </Space>
      </Card>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.data ?? []}
        loading={isLoading}
        scroll={{ x: 1000 }}
        pagination={{
          current: page,
          total: data?.total ?? 0,
          pageSize: 50,
          onChange: setPage,
          showTotal: (total) => `${total} ${t("audit.entries")}`,
        }}
      />
    </div>
  );
}
