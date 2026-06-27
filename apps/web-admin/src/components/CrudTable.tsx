import { useState } from "react";
import { Button, Form, Modal, Popconfirm, Space, Table, message } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { TableColumnType } from "antd";

export interface CrudTableProps<T extends { id: string }> {
  data: T[] | undefined;
  isPending: boolean;
  columns: TableColumnType<T>[];
  formContent: (record: T | null) => React.ReactNode;
  onSave: (values: Record<string, unknown>, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  extraActions?: (record: T) => React.ReactNode;
  rowKey?: string;
}

export function CrudTable<T extends { id: string }>({
  data,
  isPending,
  columns,
  formContent,
  onSave,
  onDelete,
  extraActions,
  rowKey = "id",
}: CrudTableProps<T>) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  }

  function openEdit(record: T) {
    setEditing(record);
    form.setFieldsValue(record);
    setOpen(true);
  }

  async function handleSave() {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await onSave(values, editing?.id);
      setOpen(false);
      form.resetFields();
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) return; // validation only
      void message.error(String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!onDelete) return;
    try {
      await onDelete(id);
    } catch (err) {
      void message.error(String(err));
    }
  }

  const actionCol: TableColumnType<T> = {
    title: t("actions"),
    key: "_actions",
    width: 140,
    render: (_: unknown, record: T) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
        {onDelete && (
          <Popconfirm
            title={t("deleteConfirm")}
            onConfirm={() => handleDelete(record.id)}
            okText={t("confirm")}
            cancelText={t("cancel")}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        )}
        {extraActions?.(record)}
      </Space>
    ),
  };

  return (
    <>
      <div style={{ marginBlockEnd: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t("add")}
        </Button>
      </div>

      <Table<T>
        rowKey={rowKey}
        dataSource={data}
        columns={[...columns, actionCol]}
        loading={isPending}
        pagination={{ pageSize: 20 }}
        size="middle"
        scroll={{ x: true }}
      />

      <Modal
        open={open}
        title={editing ? t("edit") : t("add")}
        onOk={handleSave}
        onCancel={() => setOpen(false)}
        confirmLoading={saving}
        okText={t("save")}
        cancelText={t("cancel")}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginBlockStart: 16 }}>
          {formContent(editing)}
        </Form>
      </Modal>
    </>
  );
}
