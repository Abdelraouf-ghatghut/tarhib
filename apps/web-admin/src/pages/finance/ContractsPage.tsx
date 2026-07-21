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
  Select,
  message,
  Tag,
  Typography,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { financeApi, companiesApi } from "../../lib/api";
import { getErrorMessage } from "../../lib/errors";
import { bilingualName } from "../../lib/bilingualName";
import { useAuth } from "../../hooks/useAuth";

const { Title } = Typography;

interface Company {
  id: string;
  nameAr: string;
  nameEn: string | null;
}

interface Contract {
  id: string;
  companyId: string;
  label: string;
  startDate: string;
  endDate: string;
  amount: number;
  billingFrequency: "MONTHLY" | "QUARTERLY" | "YEARLY" | "ONE_TIME";
  status: "DRAFT" | "ACTIVE" | "CANCELLED";
  isExpired: boolean;
  notes: string | null;
}

const STATUS_COLOR: Record<Contract["status"], string> = {
  DRAFT: "default",
  ACTIVE: "green",
  CANCELLED: "red",
};

export function ContractsPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith("ar");
  const { modal } = App.useApp();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("finance.manage");
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as Company[]),
  });
  const companyName = (id: string) => {
    const c = companies.find((x) => x.id === id);
    return c ? bilingualName(c.nameAr, c.nameEn, isAr) : id.slice(0, 8);
  };

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["finance", "contracts"],
    queryFn: () => financeApi.contracts.list().then((r) => r.data as Contract[]),
  });

  const save = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const payload = {
        ...values,
        startDate: dayjs(values.startDate as dayjs.Dayjs).format("YYYY-MM-DD"),
        endDate: dayjs(values.endDate as dayjs.Dayjs).format("YYYY-MM-DD"),
      };
      return editing
        ? financeApi.contracts.update(editing.id, payload)
        : financeApi.contracts.create(payload);
    },
    onSuccess: () => {
      message.success(t("saved"));
      queryClient.invalidateQueries({ queryKey: ["finance", "contracts"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "overview"] });
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => financeApi.contracts.remove(id),
    onSuccess: () => {
      message.success(t("deleted"));
      queryClient.invalidateQueries({ queryKey: ["finance", "contracts"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "overview"] });
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (c: Contract) => {
    setEditing(c);
    form.setFieldsValue({ ...c, startDate: dayjs(c.startDate), endDate: dayjs(c.endDate) });
    setModalOpen(true);
  };

  const columns = [
    { title: t("company"), dataIndex: "companyId", key: "companyId", render: companyName },
    { title: t("label"), dataIndex: "label", key: "label" },
    { title: t("startDate"), dataIndex: "startDate", key: "startDate" },
    { title: t("endDate"), dataIndex: "endDate", key: "endDate" },
    {
      title: t("amount"),
      dataIndex: "amount",
      key: "amount",
      render: (v: number) => `${v.toFixed(2)} ${t("currencyUnit")}`,
    },
    {
      title: t("billingFrequency"),
      dataIndex: "billingFrequency",
      key: "billingFrequency",
      render: (v: Contract["billingFrequency"]) => t(`billingFrequency_${v}`),
    },
    {
      title: t("status"),
      key: "status",
      render: (_: unknown, r: Contract) => (
        <Space>
          <Tag color={STATUS_COLOR[r.status]}>{t(`contractStatus_${r.status}`)}</Tag>
          {r.isExpired && <Tag color="orange">{t("contractStatus_EXPIRED")}</Tag>}
        </Space>
      ),
    },
    ...(canManage
      ? [
          {
            title: t("actions"),
            key: "actions",
            render: (_: unknown, r: Contract) => (
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
          {t("contracts")}
        </Title>
        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t("add")}
          </Button>
        )}
      </div>

      <Table
        rowKey="id"
        dataSource={contracts}
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
          <Form.Item name="companyId" label={t("company")} rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={companies.map((c) => ({ value: c.id, label: companyName(c.id) }))}
            />
          </Form.Item>
          <Form.Item name="label" label={t("label")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="startDate" label={t("startDate")} rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="endDate" label={t("endDate")} rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="amount" label={t("amount")} rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} addonAfter={t("currencyUnit")} />
          </Form.Item>
          <Form.Item
            name="billingFrequency"
            label={t("billingFrequency")}
            rules={[{ required: true }]}
          >
            <Select
              options={["MONTHLY", "QUARTERLY", "YEARLY", "ONE_TIME"].map((v) => ({
                value: v,
                label: t(`billingFrequency_${v}`),
              }))}
            />
          </Form.Item>
          <Form.Item name="status" label={t("status")} initialValue="DRAFT">
            <Select
              options={["DRAFT", "ACTIVE", "CANCELLED"].map((v) => ({
                value: v,
                label: t(`contractStatus_${v}`),
              }))}
            />
          </Form.Item>
          <Form.Item name="notes" label={t("notes")}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default ContractsPage;
