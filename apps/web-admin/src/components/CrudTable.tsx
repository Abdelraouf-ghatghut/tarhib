import { useState } from "react";
import type { MouseEvent } from "react";
import { Button, Form, Modal, Popconfirm, Space, Table, message } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { TableColumnType } from "antd";
import { getErrorMessage } from "../lib/errors";

export interface CrudTableProps<T extends { id: string }> {
  data: T[] | undefined;
  isPending: boolean;
  columns: TableColumnType<T>[];
  formContent: (record: T | null) => React.ReactNode;
  onSave: (values: Record<string, unknown>, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  extraActions?: (record: T) => React.ReactNode;
  rowKey?: string;
  /** Ligne cliquable en plus du bouton Modifier (ex. Drawer de détail) — les
   * actions de la colonne "Actions" restent prioritaires (clic sans effet
   * de bord sur onRow, cf. stopPropagation ci-dessous). */
  onRow?: (record: T) => { onClick?: () => void; style?: React.CSSProperties };
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
  onRow,
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
      const values = (await form.validateFields()) as Record<string, unknown>;
      // Champs optionnels vidés ("" / undefined) : retirés du payload pour ne
      // pas déclencher les validations backend (ex. « must be a UUID »)
      for (const key of Object.keys(values)) {
        if (values[key] === "" || values[key] === undefined) delete values[key];
      }
      setSaving(true);
      await onSave(values, editing?.id);
      setOpen(false);
      form.resetFields();
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) return; // validation only
      void message.error(getErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!onDelete) return;
    try {
      await onDelete(id);
    } catch (err) {
      void message.error(getErrorMessage(err, t));
    }
  }

  const actionCol: TableColumnType<T> = {
    title: t("actions"),
    key: "_actions",
    width: 140,
    render: (_: unknown, record: T) => (
      // Empêche le onRow (Drawer de détail) de s'ouvrir quand on clique sur
      // une action de la ligne (Modifier/Supprimer/extra) — sans ça, un
      // clic sur ces boutons ouvrirait le Drawer en plus de son propre effet.
      <div onClick={(e: MouseEvent) => e.stopPropagation()}>
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
      </div>
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
        onRow={onRow}
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
