import { useState } from "react";
import { Button, Form, InputNumber, Modal, Table, Tag, Typography, message } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { EditOutlined, WarningOutlined } from "@ant-design/icons";
import { inventoryApi } from "../../lib/api";

const { Title } = Typography;

interface InventoryItem {
  id: string;
  productId: string;
  branchId: string;
  quantity: number;
  minLevel: number;
  maxLevel: number;
}

export function InventoryPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, isPending } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => inventoryApi.list().then((r) => r.data as InventoryItem[]),
  });

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      const values = await form.validateFields();
      await inventoryApi.update(editing.id, values);
      void qc.invalidateQueries({ queryKey: ["inventory"] });
      setEditing(null);
    } catch (err) {
      if (!(err as { errorFields?: unknown }).errorFields) {
        void message.error(String(err));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Title level={4}>{t("inventory")}</Title>

      <Table<InventoryItem>
        rowKey="id"
        dataSource={data}
        loading={isPending}
        size="middle"
        scroll={{ x: true }}
        pagination={{ pageSize: 20 }}
        columns={[
          {
            title: t("productId"),
            dataIndex: "productId",
            render: (v: string) => v.substring(0, 8),
          },
          { title: t("branchId"), dataIndex: "branchId", render: (v: string) => v.substring(0, 8) },
          {
            title: t("quantity"),
            dataIndex: "quantity",
            render: (v: number, row: InventoryItem) => (
              <span style={{ color: v < row.minLevel ? "#cf1322" : undefined }}>
                {v < row.minLevel && <WarningOutlined style={{ marginInlineEnd: 4 }} />}
                {v}
              </span>
            ),
          },
          { title: t("minLevel"), dataIndex: "minLevel" },
          { title: t("maxLevel"), dataIndex: "maxLevel" },
          {
            title: t("status"),
            render: (_: unknown, row: InventoryItem) => (
              <Tag color={row.quantity < row.minLevel ? "red" : "green"}>
                {row.quantity < row.minLevel ? t("restockAlert") : "OK"}
              </Tag>
            ),
            width: 140,
          },
          {
            title: t("actions"),
            width: 80,
            render: (_: unknown, row: InventoryItem) => (
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  setEditing(row);
                  form.setFieldsValue({
                    quantity: row.quantity,
                    minLevel: row.minLevel,
                    maxLevel: row.maxLevel,
                  });
                }}
              />
            ),
          },
        ]}
      />

      <Modal
        open={!!editing}
        title={t("updateStock")}
        onOk={handleSave}
        onCancel={() => setEditing(null)}
        confirmLoading={saving}
        okText={t("save")}
        cancelText={t("cancel")}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginBlockStart: 16 }}>
          <Form.Item name="quantity" label={t("quantity")} rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="minLevel" label={t("minLevel")} rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="maxLevel" label={t("maxLevel")} rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
