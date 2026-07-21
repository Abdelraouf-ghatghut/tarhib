import { forwardRef, useImperativeHandle, useState } from "react";
import type { MouseEvent } from "react";
import { App, Button, Form, Modal, Space, Table, message } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { TableColumnType } from "antd";
import { getErrorMessage } from "../lib/errors";

export interface CrudTableHandle {
  /** Ouvre le formulaire de création — pour un bouton "اضافة" externe placé
   * au niveau du titre de page plutôt que celui par défaut au-dessus du tableau. */
  openCreate: () => void;
}

export interface CrudTableProps<T extends { id: string }> {
  data: T[] | undefined;
  isPending: boolean;
  columns: TableColumnType<T>[];
  formContent: (record: T | null) => React.ReactNode;
  onSave: (values: Record<string, unknown>, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  extraActions?: (record: T) => React.ReactNode;
  rowKey?: string;
  /** Masque le bouton "اضافة" par défaut (au-dessus du tableau) — utiliser
   * avec un ref (CrudTableHandle.openCreate) pour un bouton externe. */
  hideAddButton?: boolean;
  /** Ligne cliquable en plus du bouton Modifier (ex. Drawer de détail) — les
   * actions de la colonne "Actions" restent prioritaires (clic sans effet
   * de bord sur onRow, cf. stopPropagation ci-dessous). */
  onRow?: (record: T) => { onClick?: () => void; style?: React.CSSProperties };
}

function CrudTableInner<T extends { id: string }>(
  {
    data,
    isPending,
    columns,
    formContent,
    onSave,
    onDelete,
    extraActions,
    rowKey = "id",
    hideAddButton = false,
    onRow,
  }: CrudTableProps<T>,
  ref: React.ForwardedRef<CrudTableHandle>,
) {
  const { t } = useTranslation();
  const { modal } = App.useApp();
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  }

  useImperativeHandle(ref, () => ({ openCreate }));

  function openEdit(record: T) {
    setEditing(record);
    form.setFieldsValue(record);
    setOpen(true);
  }

  async function handleSave() {
    try {
      const values = (await form.validateFields()) as Record<string, unknown>;
      // Un champ vidé (Select allowClear → undefined, Input vidé → "") doit
      // être envoyé explicitement comme null pour que le backend applique le
      // "clear" — sinon la clé est absente du payload JSON (undefined n'est
      // pas sérialisable) et le serveur laisse l'ancienne valeur inchangée.
      for (const key of Object.keys(values)) {
        if (values[key] === undefined || values[key] === "") values[key] = null;
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
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() =>
                modal.confirm({
                  title: t("deleteConfirm"),
                  okText: t("confirm"),
                  cancelText: t("cancel"),
                  okButtonProps: { danger: true },
                  onOk: () => handleDelete(record.id),
                })
              }
            />
          )}
          {extraActions?.(record)}
        </Space>
      </div>
    ),
  };

  return (
    <>
      {!hideAddButton && (
        <div style={{ marginBlockEnd: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t("add")}
          </Button>
        </div>
      )}

      <Table<T>
        rowKey={rowKey}
        dataSource={data}
        // whiteSpace: nowrap sur l'entête — évite le retour à la ligne des
        // titres de colonne (ex. libellés arabes longs), quelle que soit la
        // largeur de colonne ; le corps du tableau garde son retour à la
        // ligne normal.
        columns={[...columns, actionCol].map((col) => ({
          ...col,
          title: <span style={{ whiteSpace: "nowrap" }}>{col.title}</span>,
        }))}
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

// forwardRef efface les génériques : on les restaure via un cast de signature
// (pattern standard pour un composant générique + ref).
export const CrudTable = forwardRef(CrudTableInner) as <T extends { id: string }>(
  props: CrudTableProps<T> & { ref?: React.ForwardedRef<CrudTableHandle> },
) => ReturnType<typeof CrudTableInner>;
