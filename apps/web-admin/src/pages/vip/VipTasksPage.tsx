import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  Tag,
  Button,
  Space,
  Select,
  Typography,
  Row,
  Col,
  Statistic,
  Card,
  message,
  Tooltip,
} from "antd";
import { CheckOutlined, ReloadOutlined } from "@ant-design/icons";
import { vipSelfServiceApi } from "../../lib/api";

const { Title } = Typography;

type TaskStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED";

interface VipTask {
  id: string;
  productId: string;
  branchId: string;
  companyId: string;
  locationName: string | null;
  requestedQty: number;
  status: TaskStatus;
  assignedAgentId: string | null;
  completedBy: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface VipLocation {
  id: string;
  productNameAr: string;
  productNameEn: string;
  locationName: string | null;
  branchId: string;
  currentStock: number;
  minThreshold: number;
  maxThreshold: number | null;
  belowThreshold: boolean;
  openTaskId: string | null;
}

const STATUS_COLOR: Record<TaskStatus, string> = {
  OPEN: "orange",
  IN_PROGRESS: "blue",
  COMPLETED: "green",
};

export default function VipTasksPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const isRtl = i18n.dir() === "rtl";
  const [statusFilter, setStatusFilter] = useState<TaskStatus | undefined>(undefined);

  const {
    data: tasks = [],
    isLoading: tasksLoading,
    refetch: refetchTasks,
  } = useQuery<VipTask[]>({
    queryKey: ["vipTasks", statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      const res = await vipSelfServiceApi.tasks(params);
      return res.data as VipTask[];
    },
  });

  const { data: locations = [], isLoading: locationsLoading } = useQuery<VipLocation[]>({
    queryKey: ["vipLocations"],
    queryFn: async () => {
      const res = await vipSelfServiceApi.locations();
      return res.data as VipLocation[];
    },
  });

  const completeTask = useMutation({
    mutationFn: (taskId: string) => vipSelfServiceApi.completeTask(taskId),
    onSuccess: () => {
      message.success(t("vipTaskCompleted"));
      queryClient.invalidateQueries({ queryKey: ["vipTasks"] });
      queryClient.invalidateQueries({ queryKey: ["vipLocations"] });
    },
    onError: () => message.error(t("errorOccurred")),
  });

  const replenish = useMutation({
    mutationFn: (locationId: string) => vipSelfServiceApi.replenish(locationId),
    onSuccess: () => {
      message.success(t("vipReplenished"));
      queryClient.invalidateQueries({ queryKey: ["vipLocations"] });
      queryClient.invalidateQueries({ queryKey: ["vipTasks"] });
    },
    onError: () => message.error(t("errorOccurred")),
  });

  const openCount = tasks.filter((t) => t.status === "OPEN").length;
  const belowThresholdCount = locations.filter((l) => l.belowThreshold).length;

  const taskColumns = [
    {
      title: t("location"),
      dataIndex: "locationName",
      key: "locationName",
      render: (v: string | null) => v ?? "—",
    },
    {
      title: t("requestedQty"),
      dataIndex: "requestedQty",
      key: "requestedQty",
    },
    {
      title: t("status"),
      dataIndex: "status",
      key: "status",
      render: (s: TaskStatus) => <Tag color={STATUS_COLOR[s]}>{t(`vipTaskStatus_${s}`)}</Tag>,
    },
    {
      title: t("date"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (d: string) => new Date(d).toLocaleString(),
    },
    {
      title: t("completedAt"),
      dataIndex: "completedAt",
      key: "completedAt",
      render: (d: string | null) => (d ? new Date(d).toLocaleString() : "—"),
    },
    {
      title: t("actions"),
      key: "actions",
      render: (_: unknown, record: VipTask) =>
        record.status !== "COMPLETED" ? (
          <Tooltip title={t("markComplete")}>
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              loading={completeTask.isPending}
              onClick={() => completeTask.mutate(record.id)}
            >
              {t("complete")}
            </Button>
          </Tooltip>
        ) : null,
    },
  ];

  const locationColumns = [
    {
      title: isRtl ? t("nameAr") : t("nameEn"),
      key: "name",
      render: (_: unknown, r: VipLocation) => (isRtl ? r.productNameAr : r.productNameEn),
    },
    {
      title: t("location"),
      dataIndex: "locationName",
      key: "locationName",
      render: (v: string | null) => v ?? "—",
    },
    {
      title: t("currentStock"),
      dataIndex: "currentStock",
      key: "currentStock",
    },
    {
      title: t("minThreshold"),
      dataIndex: "minThreshold",
      key: "minThreshold",
    },
    {
      title: t("maxThreshold"),
      dataIndex: "maxThreshold",
      key: "maxThreshold",
      render: (v: number | null) => v ?? "—",
    },
    {
      title: t("status"),
      key: "belowThreshold",
      render: (_: unknown, r: VipLocation) => (
        <Tag color={r.belowThreshold ? "red" : "green"}>
          {r.belowThreshold ? t("belowThreshold") : t("ok")}
        </Tag>
      ),
    },
    {
      title: t("actions"),
      key: "actions",
      render: (_: unknown, r: VipLocation) =>
        r.belowThreshold ? (
          <Button size="small" loading={replenish.isPending} onClick={() => replenish.mutate(r.id)}>
            {t("replenish")}
          </Button>
        ) : null,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>{t("vipSelfService")}</Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title={t("openTasks")}
              value={openCount}
              valueStyle={{ color: openCount > 0 ? "var(--fg-warning-subtle)" : undefined }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t("belowThreshold")}
              value={belowThresholdCount}
              valueStyle={{
                color: belowThresholdCount > 0 ? "var(--fg-danger)" : undefined,
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Locations */}
      <Card
        title={t("vipLocations")}
        style={{ marginBottom: 24 }}
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => queryClient.invalidateQueries({ queryKey: ["vipLocations"] })}
          >
            {t("refresh")}
          </Button>
        }
      >
        <Table
          rowKey="id"
          dataSource={locations}
          columns={locationColumns}
          loading={locationsLoading}
          pagination={false}
        />
      </Card>

      {/* Tasks */}
      <Card
        title={t("vipReplenishmentTasks")}
        extra={
          <Space>
            <Select
              allowClear
              placeholder={t("filterByStatus")}
              style={{ width: 180 }}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as TaskStatus | undefined)}
              options={[
                { value: "OPEN", label: t("vipTaskStatus_OPEN") },
                {
                  value: "IN_PROGRESS",
                  label: t("vipTaskStatus_IN_PROGRESS"),
                },
                {
                  value: "COMPLETED",
                  label: t("vipTaskStatus_COMPLETED"),
                },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={() => refetchTasks()}>
              {t("refresh")}
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          dataSource={tasks}
          columns={taskColumns}
          loading={tasksLoading}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  );
}
