import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Tag,
  Typography,
  Popconfirm,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { suppliersApi } from "../../lib/api";
import { useScope } from "../../contexts/ScopeContext";

const { Title } = Typography;

interface Supplier {
  id: string;
  companyId: string;
  nameAr: string;
  nameEn: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  active: boolean;
}

export default function SuppliersPage() {
  const { t } = useTranslation();
  const { selectedCompany } = useScope();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["suppliers", selectedCompany],
    queryFn: async () => {
      const res = await suppliersApi.list(selectedCompany ?? undefined);
      return res.data as Supplier[];
    },
  });

  const save = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      if (editing) {
        return suppliersApi.update(editing.id, values);
      }
      return suppliersApi.create({
        ...values,
        companyId: selectedCompany,
      });
    },
    onSuccess: () => {
      message.success(t("saved"));
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
    },
    onError: () => message.error(t("errorOccurred")),
  });

  const remove = useMutation({
    mutationFn: (id: string) => suppliersApi.remove(id),
    onSuccess: () => {
      message.success(t("deleted"));
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: () => message.error(t("errorOccurred")),
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    form.setFieldsValue(s);
    setModalOpen(true);
  };

  const columns = [
    { title: t("nameAr"), dataIndex: "nameAr", key: "nameAr" },
    { title: t("nameEn"), dataIndex: "nameEn", key: "nameEn" },
    {
      title: t("contact"),
      key: "contact",
      render: (_: unknown, r: Supplier) => r.contactName ?? "—",
    },
    { title: t("email"), dataIndex: "email", key: "email", render: (v: string | null) => v ?? "—" },
    { title: t("phone"), dataIndex: "phone", key: "phone", render: (v: string | null) => v ?? "—" },
    {
      title: t("active"),
      dataIndex: "active",
      key: "active",
      render: (v: boolean) => (
        <Tag color={v ? "green" : "red"}>{v ? t("active") : t("inactive")}</Tag>
      ),
    },
    {
      title: t("actions"),
      key: "actions",
      render: (_: unknown, r: Supplier) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title={t("deleteConfirm")} onConfirm={() => remove.mutate(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} loading={remove.isPending} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Title level={3}>{t("suppliers")}</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t("add")}
        </Button>
      </div>

      <Table
        rowKey="id"
        dataSource={suppliers}
        columns={columns}
        loading={isLoading}
        pagination={{ pageSize: 20 }}
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
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => save.mutate(v as Record<string, string>)}
        >
          <Form.Item name="nameAr" label={t("nameAr")} rules={[{ required: true }]}>
            <Input dir="rtl" />
          </Form.Item>
          <Form.Item name="nameEn" label={t("nameEn")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="contactName" label={t("contact")}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label={t("email")}>
            <Input type="email" />
          </Form.Item>
          <Form.Item name="phone" label={t("phone")}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label={t("address")}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
