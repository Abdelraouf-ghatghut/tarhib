import { useState } from "react";
import { Button, Form, InputNumber, Modal, Select, Table, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { productsApi, rolesApi } from "../../lib/api";

const { Title } = Typography;

interface RoleQuota {
  id: string;
  productId: string;
  periodType: "DAILY" | "WEEKLY" | "MONTHLY";
  maxQuantity: number;
}

interface Product {
  id: string;
  nameAr: string;
  nameEn: string;
}

interface Props {
  roleId: string;
  roleName: string;
  open: boolean;
  onClose: () => void;
}

export function RoleQuotasModal({ roleId, roleName, open, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: quotas, isPending } = useQuery({
    queryKey: ["role-quotas", roleId],
    queryFn: () => rolesApi.getQuotas(roleId).then((r) => r.data as RoleQuota[]),
    enabled: open,
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: () => productsApi.list().then((r) => r.data as Product[]),
    enabled: open,
  });

  async function handleAdd() {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await rolesApi.setQuota(roleId, values);
      void qc.invalidateQueries({ queryKey: ["role-quotas", roleId] });
      setAddOpen(false);
      form.resetFields();
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) return;
      void message.error(String(err));
    } finally {
      setSaving(false);
    }
  }

  const periodLabel = (p: string) => {
    if (p === "DAILY") return t("quotaPeriodDaily");
    if (p === "WEEKLY") return t("quotaPeriodWeekly");
    return t("quotaPeriodMonthly");
  };

  const productName = (id: string) => {
    const p = products?.find((p) => p.id === id);
    return p ? (i18n.language === "ar" ? p.nameAr : p.nameEn) : id;
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
      title={
        <Title level={5}>
          {t("quotaPerRole")} — {roleName}
        </Title>
      }
      destroyOnClose
    >
      <div style={{ marginBlockEnd: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
          {t("addQuota")}
        </Button>
      </div>

      <Table<RoleQuota>
        rowKey="id"
        dataSource={quotas}
        loading={isPending}
        pagination={false}
        size="small"
        columns={[
          { title: t("product"), dataIndex: "productId", render: (id: string) => productName(id) },
          {
            title: t("periodType"),
            dataIndex: "periodType",
            render: (p: string) => periodLabel(p),
          },
          { title: t("maxQuantity"), dataIndex: "maxQuantity" },
        ]}
      />

      <Modal
        open={addOpen}
        title={t("addQuota")}
        onOk={handleAdd}
        onCancel={() => {
          setAddOpen(false);
          form.resetFields();
        }}
        confirmLoading={saving}
        okText={t("save")}
        cancelText={t("cancel")}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginBlockStart: 16 }}>
          <Form.Item name="productId" label={t("product")} rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={products?.map((p) => ({
                value: p.id,
                label: i18n.language === "ar" ? p.nameAr : p.nameEn,
              }))}
            />
          </Form.Item>
          <Form.Item name="periodType" label={t("periodType")} rules={[{ required: true }]}>
            <Select
              options={[
                { value: "DAILY", label: t("quotaPeriodDaily") },
                { value: "WEEKLY", label: t("quotaPeriodWeekly") },
                { value: "MONTHLY", label: t("quotaPeriodMonthly") },
              ]}
            />
          </Form.Item>
          <Form.Item name="maxQuantity" label={t("maxQuantity")} rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </Modal>
  );
}
