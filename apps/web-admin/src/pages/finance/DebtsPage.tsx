import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  message,
  Tag,
  Typography,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { financeApi } from "../../lib/api";
import { getErrorMessage } from "../../lib/errors";
import { useAuth } from "../../hooks/useAuth";

const { Title } = Typography;

interface Debt {
  id: string;
  creditorName: string;
  totalAmount: number;
  remainingAmount: number;
  dueDate: string | null;
  status: "PENDING" | "PARTIALLY_PAID" | "PAID" | "OVERDUE";
  notes: string | null;
}

const STATUS_COLOR: Record<Debt["status"], string> = {
  PENDING: "default",
  PARTIALLY_PAID: "blue",
  PAID: "green",
  OVERDUE: "red",
};

export function DebtsPage() {
  const { t } = useTranslation();
  const { modal } = App.useApp();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("finance.manage");
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);

  const { data: debts = [], isLoading } = useQuery({
    queryKey: ["finance", "debts"],
    queryFn: () => financeApi.debts.list().then((r) => r.data as Debt[]),
  });

  const save = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const payload = {
        ...values,
        dueDate: values.dueDate ? dayjs(values.dueDate as dayjs.Dayjs).format("YYYY-MM-DD") : null,
      };
      return editing
        ? financeApi.debts.update(editing.id, payload)
        : financeApi.debts.create(payload);
    },
    onSuccess: () => {
      message.success(t("saved"));
      queryClient.invalidateQueries({ queryKey: ["finance", "debts"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "overview"] });
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => financeApi.debts.remove(id),
    onSuccess: () => {
      message.success(t("deleted"));
      queryClient.invalidateQueries({ queryKey: ["finance", "debts"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "overview"] });
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (d: Debt) => {
    setEditing(d);
    form.setFieldsValue({ ...d, dueDate: d.dueDate ? dayjs(d.dueDate) : undefined });
    setModalOpen(true);
  };

  const columns = [
    { title: t("creditorName"), dataIndex: "creditorName", key: "creditorName" },
    {
      title: t("totalAmount"),
      dataIndex: "totalAmount",
      key: "totalAmount",
      render: (v: number) => `${v.toFixed(2)} ${t("currencyUnit")}`,
    },
    {
      title: t("remainingAmount"),
      dataIndex: "remainingAmount",
      key: "remainingAmount",
      render: (v: number) => `${v.toFixed(2)} ${t("currencyUnit")}`,
    },
    {
      title: t("dueDate"),
      dataIndex: "dueDate",
      key: "dueDate",
      render: (v: string | null) => v ?? "—",
    },
    {
      title: t("status"),
      dataIndex: "status",
      key: "status",
      render: (v: Debt["status"]) => <Tag color={STATUS_COLOR[v]}>{t(`debtStatus_${v}`)}</Tag>,
    },
    ...(canManage
      ? [
          {
            title: t("actions"),
            key: "actions",
            render: (_: unknown, r: Debt) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  loading={remove.isPending}
                  onClick={() =>
                    modal.confirm({
                      title: t("deleteConfirm"),
                      okText: t("confirm"),
                      cancelText: t("cancel"),
                      okButtonProps: { danger: true },
                      onOk: () => remove.mutateAsync(r.id),
                    })
                  }
                />
              </Space>
            ),
          },
        ]
      : []),
  ];

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          {t("debts")}
        </Title>
        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t("add")}
          </Button>
        )}
      </div>

      <Table
        rowKey="id"
        dataSource={debts}
        columns={columns}
        loading={isLoading}
        pagination={{ pageSize: 20 }}
        scroll={{ x: "max-content" }}
      />

      <Modal
        open={modalOpen}
        title={editing ? t("edit") : t("add")}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={save.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
          <Form.Item name="creditorName" label={t("creditorName")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="totalAmount" label={t("totalAmount")} rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} addonAfter={t("currencyUnit")} />
          </Form.Item>
          {editing && (
            <Form.Item
              name="remainingAmount"
              label={t("remainingAmount")}
              extra={t("remainingAmountHint")}
            >
              <InputNumber min={0} style={{ width: "100%" }} addonAfter={t("currencyUnit")} />
            </Form.Item>
          )}
          <Form.Item name="dueDate" label={t("dueDateOptional")}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="notes" label={t("notes")}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default DebtsPage;
