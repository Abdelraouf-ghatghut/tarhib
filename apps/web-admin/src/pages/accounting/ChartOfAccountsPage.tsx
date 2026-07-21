import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Form, Input, Modal, Select, Switch, Table, Tag, Typography, message } from "antd";
import { PlusOutlined, EditOutlined } from "@ant-design/icons";
import { accountingApi } from "../../lib/api";
import { getErrorMessage } from "../../lib/errors";
import { useAuth } from "../../hooks/useAuth";

const { Title } = Typography;

interface Account {
  id: string;
  code: string;
  label: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  parentId: string | null;
  active: boolean;
}

const TYPES: Account["type"][] = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];

const TYPE_COLOR: Record<Account["type"], string> = {
  ASSET: "blue",
  LIABILITY: "volcano",
  EQUITY: "purple",
  REVENUE: "green",
  EXPENSE: "orange",
};

export function ChartOfAccountsPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("accounting.manage");
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["accounting", "accounts"],
    queryFn: () => accountingApi.accounts.list().then((r) => r.data as Account[]),
  });

  const save = useMutation({
    mutationFn: async (values: Record<string, unknown>) =>
      editing
        ? accountingApi.accounts.update(editing.id, values)
        : accountingApi.accounts.create(values),
    onSuccess: () => {
      message.success(t("saved"));
      queryClient.invalidateQueries({ queryKey: ["accounting", "accounts"] });
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
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

  const codeToLabel = (id: string | null) => {
    if (!id) return "—";
    const a = accounts.find((x) => x.id === id);
    return a ? `${a.code} — ${a.label}` : id.slice(0, 8);
  };

  const columns = [
    { title: t("accountCode"), dataIndex: "code", key: "code" },
    { title: t("accountLabel"), dataIndex: "label", key: "label" },
    {
      title: t("accountType"),
      dataIndex: "type",
      key: "type",
      render: (v: Account["type"]) => <Tag color={TYPE_COLOR[v]}>{t(`chartAccountType_${v}`)}</Tag>,
    },
    { title: t("parentAccount"), dataIndex: "parentId", key: "parentId", render: codeToLabel },
    {
      title: t("active"),
      dataIndex: "active",
      key: "active",
      render: (v: boolean) => (
        <Tag color={v ? "green" : "default"}>{v ? t("activeYes") : t("activeNo")}</Tag>
      ),
    },
    ...(canManage
      ? [
          {
            title: t("actions"),
            key: "actions",
            render: (_: unknown, r: Account) => (
              <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
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
          {t("chartOfAccounts")}
        </Title>
        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t("add")}
          </Button>
        )}
      </div>

      <Table
        rowKey="id"
        dataSource={[...accounts].sort((a, b) => a.code.localeCompare(b.code))}
        columns={columns}
        loading={isLoading}
        pagination={{ pageSize: 30 }}
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
          <Form.Item name="code" label={t("accountCode")} rules={[{ required: true }]}>
            <Input disabled={!!editing} />
          </Form.Item>
          <Form.Item name="label" label={t("accountLabel")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label={t("accountType")} rules={[{ required: true }]}>
            <Select options={TYPES.map((v) => ({ value: v, label: t(`chartAccountType_${v}`) }))} />
          </Form.Item>
          <Form.Item name="parentId" label={t("parentAccount")}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={accounts
                .filter((a) => a.id !== editing?.id)
                .map((a) => ({ value: a.id, label: `${a.code} — ${a.label}` }))}
            />
          </Form.Item>
          <Form.Item name="active" label={t("active")} valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default ChartOfAccountsPage;
