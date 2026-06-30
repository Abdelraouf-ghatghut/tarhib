import { useState } from "react";
import {
  Button,
  Form,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { PlusOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { inventoryTransfersApi, companiesApi, branchesApi, productsApi } from "../../lib/api";

const { Title } = Typography;

const ZONES = ["CENTRAL", "BRANCH", "KITCHEN"] as const;
type Zone = (typeof ZONES)[number];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "gold",
  CONFIRMED: "green",
  CANCELLED: "red",
};

interface Transfer {
  id: string;
  companyId: string;
  branchId: string;
  productId: string;
  fromZone: Zone;
  toZone: Zone;
  quantity: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  requestedBy: string;
  note: string | null;
  createdAt: string;
}

interface NamedEntity {
  id: string;
  nameAr: string;
  nameEn: string;
}

export function InventoryTransfersPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const isAr = i18n.language === "ar";
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: transfers = [], isLoading } = useQuery<Transfer[]>({
    queryKey: ["inventory-transfers"],
    queryFn: () => inventoryTransfersApi.list().then((r) => r.data as Transfer[]),
  });

  const { data: companies = [] } = useQuery<NamedEntity[]>({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as NamedEntity[]),
  });

  const companyId = Form.useWatch("companyId", form);

  const { data: branches = [] } = useQuery<NamedEntity[]>({
    queryKey: ["branches", companyId],
    queryFn: () => branchesApi.list(companyId).then((r) => r.data as NamedEntity[]),
    enabled: !!companyId,
  });

  const { data: products = [] } = useQuery<NamedEntity[]>({
    queryKey: ["products"],
    queryFn: () => productsApi.list().then((r) => r.data as NamedEntity[]),
  });

  const label = (e: NamedEntity) => (isAr ? e.nameAr : e.nameEn);

  const handleCreate = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      await inventoryTransfersApi.create(values);
      message.success(t("transferCreated"));
      qc.invalidateQueries({ queryKey: ["inventory-transfers"] });
      setOpen(false);
      form.resetFields();
    } catch {
      message.error(t("errorOccurred"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      await inventoryTransfersApi.confirm(id);
      message.success(t("transferConfirmed"));
      qc.invalidateQueries({ queryKey: ["inventory-transfers"] });
    } catch {
      message.error(t("errorOccurred"));
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await inventoryTransfersApi.cancel(id);
      message.success(t("transferCancelled"));
      qc.invalidateQueries({ queryKey: ["inventory-transfers"] });
    } catch {
      message.error(t("errorOccurred"));
    }
  };

  const columns = [
    {
      title: t("product"),
      dataIndex: "productId",
      render: (id: string) => {
        const p = products.find((p) => p.id === id);
        return p ? label(p) : id.slice(0, 8);
      },
    },
    {
      title: t("from"),
      dataIndex: "fromZone",
      render: (z: Zone) => <Tag>{z}</Tag>,
    },
    {
      title: t("to"),
      dataIndex: "toZone",
      render: (z: Zone) => <Tag>{z}</Tag>,
    },
    { title: t("quantity"), dataIndex: "quantity" },
    {
      title: t("status"),
      dataIndex: "status",
      render: (s: string) => <Tag color={STATUS_COLORS[s]}>{t(`transferStatus_${s}`)}</Tag>,
    },
    {
      title: t("date"),
      dataIndex: "createdAt",
      render: (d: string) => new Date(d).toLocaleString(isAr ? "ar" : "en"),
    },
    {
      title: t("actions"),
      render: (_: unknown, row: Transfer) =>
        row.status === "PENDING" ? (
          <Space>
            <Button
              size="small"
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => handleConfirm(row.id)}
            >
              {t("confirm")}
            </Button>
            <Button
              size="small"
              danger
              icon={<CloseOutlined />}
              onClick={() => handleCancel(row.id)}
            >
              {t("cancel")}
            </Button>
          </Space>
        ) : null,
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }} align="start">
        <Title level={4} style={{ margin: 0 }}>
          {t("inventoryTransfers")}
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          {t("newTransfer")}
        </Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={transfers}
        loading={isLoading}
        size="small"
      />

      <Modal
        open={open}
        title={t("newTransfer")}
        onOk={handleCreate}
        onCancel={() => {
          setOpen(false);
          form.resetFields();
        }}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="companyId" label={t("company")} rules={[{ required: true }]}>
            <Select options={companies.map((c) => ({ value: c.id, label: label(c) }))} />
          </Form.Item>
          <Form.Item name="branchId" label={t("branch")} rules={[{ required: true }]}>
            <Select
              options={branches.map((b) => ({ value: b.id, label: label(b) }))}
              disabled={!companyId}
            />
          </Form.Item>
          <Form.Item name="productId" label={t("product")} rules={[{ required: true }]}>
            <Select options={products.map((p) => ({ value: p.id, label: label(p) }))} />
          </Form.Item>
          <Form.Item name="fromZone" label={t("fromZone")} rules={[{ required: true }]}>
            <Select options={ZONES.map((z) => ({ value: z, label: z }))} />
          </Form.Item>
          <Form.Item name="toZone" label={t("toZone")} rules={[{ required: true }]}>
            <Select options={ZONES.map((z) => ({ value: z, label: z }))} />
          </Form.Item>
          <Form.Item name="quantity" label={t("quantity")} rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
