import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, Tag, Typography, Space, Select, DatePicker, Button, Card, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { DownloadOutlined } from "@ant-design/icons";
import { auditApi } from "../../lib/api";
import { exportToCsv } from "../../lib/exportCsv";

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
  "inventory-transfers",
  "products",
  "employees",
  "companies",
  "branches",
  "departments",
  "procurement",
  "suppliers",
  "vip-self-service",
  "meeting-rooms",
  "meeting-service-packages",
  "quotas",
  "sla-levels",
  "roles",
  "auth",
];

export default function AuditLogPage() {
  const { t } = useTranslation();
  const [entity, setEntity] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [page, setPage] = useState(1);
  // Pas de liste d'utilisateurs/entités à choisir dans un Select (IDs opaques,
  // pas de contrepartie "employé" pour tout le personnel Tarhib) — on filtre
  // en cliquant directement sur une ligne existante (§ suivi administratif).
  const [filterUserId, setFilterUserId] = useState<string | undefined>();
  const [filterEntityId, setFilterEntityId] = useState<string | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", entity, dateRange, page, filterUserId, filterEntityId],
    queryFn: async () => {
      const res = await auditApi.list({
        entity,
        userId: filterUserId,
        entityId: filterEntityId,
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
      width: 220,
      // action = "PATCH:procurement" → « تعديل — المشتريات »
      render: (action: string, row: AuditLog) => {
        const method = action.split(":")[0];
        const actionKey = `audit.action_${method}`;
        const actionLabel = t(actionKey);
        const entityLabel = t(`audit.entity_${row.entity}`, { defaultValue: row.entity });
        return (
          <Space>
            <Tag color={METHOD_COLORS[method] ?? "default"}>
              {actionLabel === actionKey ? method : actionLabel}
            </Tag>
            <span>{entityLabel}</span>
          </Space>
        );
      },
    },
    {
      title: t("audit.entity"),
      dataIndex: "entity",
      width: 140,
      render: (v: string) => <Tag>{t(`audit.entity_${v}`, { defaultValue: v })}</Tag>,
    },
    {
      title: t("audit.entityId"),
      dataIndex: "entityId",
      width: 120,
      render: (v: string | null) =>
        v ? (
          <Tooltip title={t("audit.filterByThisEntity")}>
            <Button
              type="link"
              size="small"
              style={{ fontFamily: "monospace", padding: 0 }}
              onClick={() => {
                setFilterEntityId(v);
                setPage(1);
              }}
            >
              {v.slice(0, 8)}…
            </Button>
          </Tooltip>
        ) : (
          "—"
        ),
    },
    {
      title: t("audit.user"),
      key: "user",
      width: 200,
      render: (_: unknown, row: AuditLog) => (
        <Tooltip title={t("audit.filterByThisUser")}>
          <Button
            type="link"
            size="small"
            style={{ padding: 0 }}
            onClick={() => {
              setFilterUserId(row.userId);
              setPage(1);
            }}
          >
            {row.userEmail ?? row.userId}
          </Button>
        </Tooltip>
      ),
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
            options={ENTITIES.map((e) => ({
              label: t(`audit.entity_${e}`, { defaultValue: e }),
              value: e,
            }))}
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
          {filterUserId && (
            <Tag closable onClose={() => setFilterUserId(undefined)}>
              {t("audit.user")}: {filterUserId.slice(0, 8)}…
            </Tag>
          )}
          {filterEntityId && (
            <Tag closable onClose={() => setFilterEntityId(undefined)}>
              {t("audit.entityId")}: {filterEntityId.slice(0, 8)}…
            </Tag>
          )}
          <Button
            onClick={() => {
              setEntity(undefined);
              setDateRange(null);
              setFilterUserId(undefined);
              setFilterEntityId(undefined);
              setPage(1);
            }}
          >
            {t("audit.reset")}
          </Button>
          <Tooltip title={t("audit.exportPageHint")}>
            <Button
              icon={<DownloadOutlined />}
              onClick={() =>
                exportToCsv(`audit-log-${dayjs().format("YYYY-MM-DD")}`, data?.data ?? [], [
                  {
                    label: t("audit.date"),
                    value: (r) => dayjs(r.createdAt).format("YYYY-MM-DD HH:mm:ss"),
                  },
                  { label: t("audit.action"), value: (r) => r.action },
                  { label: t("audit.entity"), value: (r) => r.entity },
                  { label: t("audit.entityId"), value: (r) => r.entityId },
                  { label: t("audit.user"), value: (r) => r.userEmail ?? r.userId },
                  { label: t("audit.ip"), value: (r) => r.ipAddress },
                ])
              }
            >
              {t("exportCsv")}
            </Button>
          </Tooltip>
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
