import { useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { EditOutlined, SlidersOutlined, WarningOutlined } from "@ant-design/icons";
import { inventoryApi } from "../../lib/api";

const { Title } = Typography;

interface InventoryItem {
  id: string;
  productId: string;
  branchId: string;
  quantity: number;
  minThreshold: number;
  maxThreshold: number | null;
}

interface AlertItem {
  productId: string;
  branchId: string;
  quantity: number;
  minThreshold: number;
}

export function InventoryPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [editForm] = Form.useForm();
  const [adjustForm] = Form.useForm();

  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("stock");

  const { data: stockData, isPending: stockPending } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => inventoryApi.list().then((r) => r.data as InventoryItem[]),
  });

  const { data: alertsData, isPending: alertsPending } = useQuery({
    queryKey: ["inventory", "alerts"],
    queryFn: () => inventoryApi.alerts().then((r) => r.data as AlertItem[]),
    enabled: activeTab === "alerts",
  });

  async function handleEditSave() {
    if (!editingItem) return;
    setEditSaving(true);
    try {
      const values = await editForm.validateFields();
      await inventoryApi.update(editingItem.id, values);
      void qc.invalidateQueries({ queryKey: ["inventory"] });
      setEditingItem(null);
    } catch (err) {
      if (!(err as { errorFields?: unknown }).errorFields) {
        void message.error(String(err));
      }
    } finally {
      setEditSaving(false);
    }
  }

  async function handleAdjustSave() {
    if (!adjustingItem) return;
    setAdjustSaving(true);
    try {
      const values = await adjustForm.validateFields();
      await inventoryApi.adjust(adjustingItem.id, values);
      void qc.invalidateQueries({ queryKey: ["inventory"] });
      void message.success(t("adjustSuccess"));
      setAdjustingItem(null);
    } catch (err) {
      if (!(err as { errorFields?: unknown }).errorFields) {
        void message.error(String(err));
      }
    } finally {
      setAdjustSaving(false);
    }
  }

  const stockColumns = [
    {
      title: t("productId"),
      dataIndex: "productId",
      render: (v: string) => v.substring(0, 8),
    },
    {
      title: t("branchId"),
      dataIndex: "branchId",
      render: (v: string) => v.substring(0, 8),
    },
    {
      title: t("quantity"),
      dataIndex: "quantity",
      render: (v: number, row: InventoryItem) => (
        <span style={{ color: v < row.minThreshold ? "#cf1322" : undefined }}>
          {v < row.minThreshold && <WarningOutlined style={{ marginInlineEnd: 4 }} />}
          {v}
        </span>
      ),
    },
    { title: t("minLevel"), dataIndex: "minThreshold" },
    { title: t("maxLevel"), dataIndex: "maxThreshold" },
    {
      title: t("status"),
      render: (_: unknown, row: InventoryItem) => (
        <Tag color={row.quantity < row.minThreshold ? "red" : "green"}>
          {row.quantity < row.minThreshold ? t("restockAlert") : "OK"}
        </Tag>
      ),
      width: 160,
    },
    {
      title: t("actions"),
      width: 140,
      render: (_: unknown, row: InventoryItem) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingItem(row);
              editForm.setFieldsValue({
                quantity: row.quantity,
                minThreshold: row.minThreshold,
                maxThreshold: row.maxThreshold,
              });
            }}
          />
          <Button
            size="small"
            icon={<SlidersOutlined />}
            onClick={() => {
              setAdjustingItem(row);
              adjustForm.resetFields();
            }}
          >
            {t("adjust")}
          </Button>
        </Space>
      ),
    },
  ];

  const alertColumns = [
    {
      title: t("productId"),
      dataIndex: "productId",
      render: (v: string) => v.substring(0, 8),
    },
    {
      title: t("branchId"),
      dataIndex: "branchId",
      render: (v: string) => v.substring(0, 8),
    },
    { title: t("quantity"), dataIndex: "quantity" },
    { title: t("minLevel"), dataIndex: "minThreshold" },
    {
      title: t("status"),
      render: (_: unknown, row: AlertItem) => (
        <Tag color={row.quantity === 0 ? "red" : "orange"}>
          {row.quantity === 0 ? t("outOfStock") : t("restockAlert")}
        </Tag>
      ),
      width: 160,
    },
  ];

  return (
    <>
      <Title level={4}>{t("inventory")}</Title>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "stock",
            label: t("inventory"),
            children: (
              <Table<InventoryItem>
                rowKey="id"
                dataSource={stockData}
                loading={stockPending}
                size="middle"
                scroll={{ x: true }}
                pagination={{ pageSize: 20 }}
                columns={stockColumns}
              />
            ),
          },
          {
            key: "alerts",
            label: t("alerts"),
            children: (
              <Table<AlertItem>
                rowKey={(r) => `${r.productId}-${r.branchId}`}
                dataSource={alertsData}
                loading={alertsPending}
                size="middle"
                scroll={{ x: true }}
                pagination={{ pageSize: 20 }}
                columns={alertColumns}
              />
            ),
          },
        ]}
      />

      {/* Edit thresholds modal */}
      <Modal
        open={!!editingItem}
        title={t("updateStock")}
        onOk={handleEditSave}
        onCancel={() => setEditingItem(null)}
        confirmLoading={editSaving}
        okText={t("save")}
        cancelText={t("cancel")}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" style={{ marginBlockStart: 16 }}>
          <Form.Item name="quantity" label={t("quantity")} rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="minThreshold" label={t("minLevel")} rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="maxThreshold" label={t("maxLevel")} rules={[{ required: false }]}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Adjust stock modal */}
      <Modal
        open={!!adjustingItem}
        title={t("adjust")}
        onOk={handleAdjustSave}
        onCancel={() => {
          setAdjustingItem(null);
          adjustForm.resetFields();
        }}
        confirmLoading={adjustSaving}
        okText={t("save")}
        cancelText={t("cancel")}
        destroyOnClose
      >
        <Form form={adjustForm} layout="vertical" style={{ marginBlockStart: 16 }}>
          <Form.Item name="type" label={t("adjustmentType")} rules={[{ required: true }]}>
            <Select
              options={[
                { value: "SORTIE", label: t("sortie") },
                { value: "AJUSTEMENT", label: t("ajustement") },
              ]}
            />
          </Form.Item>
          <Form.Item name="quantity" label={t("quantity")} rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="reason" label={t("reason")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
