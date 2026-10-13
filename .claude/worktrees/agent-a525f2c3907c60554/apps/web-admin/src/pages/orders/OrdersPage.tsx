import { useState } from "react";
import {
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ordersApi } from "../../lib/api";

const { Title } = Typography;

const STATUS_COLOR: Record<string, string> = {
  PENDING: "orange",
  APPROVED: "blue",
  IN_PROGRESS: "processing",
  DELIVERED: "green",
  REJECTED: "red",
};

interface OrderLine {
  productId: string;
  quantity: number;
}
interface Order {
  id: string;
  status: string;
  priority: string;
  slaDeadline: string;
  createdAt: string;
  employeeId: string;
  lines: OrderLine[];
}

export function OrdersPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [selected, setSelected] = useState<Order | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  const { data, isPending } = useQuery({
    queryKey: ["orders", statusFilter],
    queryFn: () =>
      ordersApi
        .list(statusFilter ? { status: statusFilter } : undefined)
        .then((r) => r.data as Order[]),
  });

  async function transition(id: string, status: string) {
    setTransitioning(true);
    try {
      await ordersApi.updateStatus(id, status);
      void qc.invalidateQueries({ queryKey: ["orders"] });
      setSelected(null);
    } catch (err) {
      void message.error(String(err));
    } finally {
      setTransitioning(false);
    }
  }

  return (
    <>
      <Row justify="space-between" align="middle" style={{ marginBlockEnd: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            {t("orders")}
          </Title>
        </Col>
        <Col>
          <Select
            allowClear
            placeholder={t("status")}
            style={{ width: 160 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={["PENDING", "APPROVED", "IN_PROGRESS", "DELIVERED", "REJECTED"].map((s) => ({
              value: s,
              label: <Tag color={STATUS_COLOR[s]}>{s}</Tag>,
            }))}
          />
        </Col>
      </Row>

      <Table<Order>
        rowKey="id"
        dataSource={data}
        loading={isPending}
        size="middle"
        scroll={{ x: true }}
        onRow={(r) => ({ onClick: () => setSelected(r) })}
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
            render: (v: string) => <Tag color={STATUS_COLOR[v]}>{v}</Tag>,
            width: 130,
          },
          { title: t("priority"), dataIndex: "priority", width: 80 },
          {
            title: t("slaDeadline"),
            dataIndex: "slaDeadline",
            render: (v: string) => v.substring(0, 16),
          },
          {
            title: t("createdAt"),
            dataIndex: "createdAt",
            render: (v: string) => v.substring(0, 16),
          },
        ]}
      />

      <Drawer
        title={`${t("orders")} — ${selected?.id.substring(0, 8).toUpperCase()}`}
        open={!!selected}
        onClose={() => setSelected(null)}
        width={480}
        footer={
          selected && (
            <Space wrap>
              {selected.status === "PENDING" && (
                <>
                  <Popconfirm
                    title={t("confirm")}
                    onConfirm={() => transition(selected.id, "APPROVED")}
                  >
                    <Button type="primary" loading={transitioning}>
                      {t("approve")}
                    </Button>
                  </Popconfirm>
                  <Popconfirm
                    title={t("confirm")}
                    onConfirm={() => transition(selected.id, "REJECTED")}
                  >
                    <Button danger loading={transitioning}>
                      {t("reject")}
                    </Button>
                  </Popconfirm>
                </>
              )}
              {(selected.status === "APPROVED" || selected.status === "PENDING") && (
                <Popconfirm
                  title={t("confirm")}
                  onConfirm={() => transition(selected.id, "IN_PROGRESS")}
                >
                  <Button loading={transitioning}>{t("inProgress")}</Button>
                </Popconfirm>
              )}
              {selected.status === "IN_PROGRESS" && (
                <Popconfirm
                  title={t("confirm")}
                  onConfirm={() => transition(selected.id, "DELIVERED")}
                >
                  <Button type="primary" loading={transitioning}>
                    {t("delivered")}
                  </Button>
                </Popconfirm>
              )}
            </Space>
          )
        }
      >
        {selected && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label={t("status")}>
                <Tag color={STATUS_COLOR[selected.status]}>{selected.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t("priority")}>{selected.priority}</Descriptions.Item>
              <Descriptions.Item label={t("slaDeadline")}>
                {selected.slaDeadline.substring(0, 16)}
              </Descriptions.Item>
              <Descriptions.Item label={t("createdAt")}>
                {selected.createdAt.substring(0, 16)}
              </Descriptions.Item>
            </Descriptions>

            <Card title={t("orderLines")} size="small" style={{ marginBlockStart: 16 }}>
              <Table<OrderLine>
                rowKey="productId"
                dataSource={selected.lines}
                size="small"
                pagination={false}
                columns={[
                  {
                    title: t("productId"),
                    dataIndex: "productId",
                    render: (v: string) => v.substring(0, 8),
                  },
                  { title: t("quantity"), dataIndex: "quantity", width: 80 },
                ]}
              />
            </Card>
          </>
        )}
      </Drawer>
    </>
  );
}
