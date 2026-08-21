import { useMemo } from "react";
import { Button, Card, Empty, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ReloadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { ScopeFilterBar } from "../../components/ScopeFilterBar";
import { useScope } from "../../contexts/ScopeContext";
import { operationsDashboardApi } from "../../lib/api";

const { Title, Text } = Typography;

export type OperationalWorkKind = "kitchen" | "delivery" | "cleaning" | "meetings";

interface WorkItem {
  id: string;
  orderId?: string;
  title?: string;
  status: string;
  priority?: string;
  slaDeadline?: string | null;
  dueDate?: string | null;
  assignedEmployeeId?: string | null;
  building?: string | null;
  floor?: string | null;
  locationName?: string | null;
  issueReason?: string | null;
  checklist?: Array<{ done: boolean }>;
  booking?: { startTime?: string; endTime?: string; roomId?: string } | null;
}

const config: Record<
  OperationalWorkKind,
  { titleKey: string; queryKey: string; load: (scope: Record<string, string>) => Promise<unknown> }
> = {
  kitchen: {
    titleKey: "kitchenSupervision",
    queryKey: "kitchen",
    load: (scope) => operationsDashboardApi.kitchenQueue(scope),
  },
  delivery: {
    titleKey: "deliverySupervision",
    queryKey: "delivery",
    load: (scope) => operationsDashboardApi.deliveryQueue(scope),
  },
  cleaning: {
    titleKey: "cleaningSupervision",
    queryKey: "cleaning",
    load: (scope) => operationsDashboardApi.cleaningTasks(scope),
  },
  meetings: {
    titleKey: "meetingPreparationSupervision",
    queryKey: "meeting-preparations",
    load: (scope) => operationsDashboardApi.meetingPreparations(scope),
  },
};

export function OperationalWorkPage({ kind }: { kind: OperationalWorkKind }) {
  const { t } = useTranslation();
  const { companyId, branchId } = useScope();
  const definition = config[kind];
  const scope = useMemo(
    () => ({
      ...(companyId ? { companyId } : {}),
      ...(branchId ? { branchId } : {}),
    }),
    [companyId, branchId],
  );
  const query = useQuery({
    queryKey: ["operations-supervision", definition.queryKey, companyId, branchId],
    queryFn: async () => {
      const response = (await definition.load(scope)) as { data: WorkItem[] };
      return response.data;
    },
    refetchInterval: 30_000,
  });

  const columns: ColumnsType<WorkItem> = [
    {
      title: t("reference"),
      key: "reference",
      width: 150,
      render: (_, item) => (
        <Text strong>#{(item.orderId ?? item.id).slice(0, 8).toUpperCase()}</Text>
      ),
    },
    ...(kind === "cleaning"
      ? [
          {
            title: t("task"),
            dataIndex: "title" as const,
            render: (value: string | undefined) => value || "—",
          },
        ]
      : []),
    {
      title: t("status"),
      dataIndex: "status",
      width: 150,
      render: (status: string) => <Tag>{t(`operationalStatus.${status}`, status)}</Tag>,
    },
    ...(kind === "delivery" || kind === "cleaning"
      ? [
          {
            title: t("location"),
            key: "location",
            render: (_: unknown, item: WorkItem) =>
              [item.building, item.floor, item.locationName].filter(Boolean).join(" · ") || "—",
          },
        ]
      : []),
    {
      title: kind === "meetings" ? t("startTime") : t("deadline"),
      key: "deadline",
      width: 180,
      render: (_, item) => {
        const value =
          kind === "meetings" ? item.booking?.startTime : item.slaDeadline || item.dueDate;
        if (!value) return "—";
        const overdue = kind !== "meetings" && dayjs(value).isBefore(dayjs());
        return (
          <Text type={overdue ? "danger" : undefined}>
            {dayjs(value).format("DD/MM/YYYY HH:mm")}
          </Text>
        );
      },
    },
    ...(kind === "meetings"
      ? [
          {
            title: t("checklistProgress"),
            key: "checklist",
            width: 150,
            render: (_: unknown, item: WorkItem) => {
              const total = item.checklist?.length ?? 0;
              const done = item.checklist?.filter((entry) => entry.done).length ?? 0;
              return `${done}/${total}`;
            },
          },
        ]
      : []),
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            {t(definition.titleKey)}
          </Title>
          <Text type="secondary">{t("operationalSupervisionHint")}</Text>
        </div>
        <Button
          icon={<ReloadOutlined />}
          loading={query.isFetching}
          onClick={() => query.refetch()}
        >
          {t("refresh")}
        </Button>
      </div>
      <ScopeFilterBar />
      <Card>
        <Table<WorkItem>
          rowKey="id"
          columns={columns}
          dataSource={query.data ?? []}
          loading={query.isLoading}
          scroll={{ x: 760 }}
          locale={{ emptyText: <Empty description={t("noOperationalWork")} /> }}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
        />
      </Card>
    </Space>
  );
}
