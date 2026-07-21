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
  Select,
  message,
  Tag,
  Typography,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { financeApi } from "../../lib/api";
import { getErrorMessage } from "../../lib/errors";
import { useAuth } from "../../hooks/useAuth";

const { Title } = Typography;

interface Account {
  id: string;
  name: string;
  type: "BANK" | "CASH";
  balance: number;
  notes: string | null;
}

export function AccountsPage() {
  const { t } = useTranslation();
  const { modal } = App.useApp();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("finance.manage");
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["finance", "accounts"],
    queryFn: () => financeApi.accounts.list().then((r) => r.data as Account[]),
  });

  const save = useMutation({
    mutationFn: async (values: Record<string, unknown>) =>
      editing ? financeApi.accounts.update(editing.id, values) : financeApi.accounts.create(values),
    onSuccess: () => {
      message.success(t("saved"));
      queryClient.invalidateQueries({ queryKey: ["finance", "accounts"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "overview"] });
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => financeApi.accounts.remove(id),
    onSuccess: () => {
      message.success(t("deleted"));
      queryClient.invalidateQueries({ queryKey: ["finance", "accounts"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "overview"] });
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (a: Account) => {
    setEditing(a);
    form.setFieldsValue(a);
    setModalOpen(true);
  };

  const columns = [
    { title: t("accountName"), dataIndex: "name", key: "name" },
    {
      title: t("accountType"),
      dataIndex: "type",
      key: "type",
      render: (v: Account["type"]) => <Tag>{t(`accountType_${v}`)}</Tag>,
    },
    {
      title: t("balance"),
      dataIndex: "balance",
      key: "balance",
      render: (v: number) => `${v.toFixed(2)} ${t("currencyUnit")}`,
    },
    ...(canManage
      ? [
          {
            title: t("actions"),
            key: "actions",
            render: (_: unknown, r: Account) => (
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
          {t("accounts")}
        </Title>
        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t("add")}
          </Button>
        )}
      </div>

      <Table
        rowKey="id"
        dataSource={accounts}
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
          <Form.Item name="name" label={t("accountName")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label={t("accountType")} rules={[{ required: true }]}>
            <Select
              options={["BANK", "CASH"].map((v) => ({ value: v, label: t(`accountType_${v}`) }))}
            />
          </Form.Item>
          <Form.Item name="balance" label={t("balance")} initialValue={0}>
            <InputNumber style={{ width: "100%" }} addonAfter={t("currencyUnit")} />
          </Form.Item>
          <Form.Item name="notes" label={t("notes")}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default AccountsPage;
