import {
  Button,
  Drawer,
  Form,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { productsAdminApi, rolesApi } from "../../lib/api";
import { useState } from "react";

const { Title, Text } = Typography;

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
  type: string;
}

interface Props {
  roleId: string;
  roleName: string;
  quotasEnabled: boolean;
  open: boolean;
  onClose: () => void;
}

export function RoleQuotasModal({
  roleId,
  roleName,
  quotasEnabled: initialEnabled,
  open,
  onClose,
}: Props) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [toggling, setToggling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: quotas, isPending: quotasLoading } = useQuery({
    queryKey: ["role-quotas", roleId],
    queryFn: () => rolesApi.getQuotas(roleId).then((r) => r.data as RoleQuota[]),
    enabled: open,
  });

  const { data: allProducts } = useQuery({
    queryKey: ["products-admin"],
    queryFn: () => productsAdminApi.list().then((r) => r.data as Product[]),
    enabled: open,
  });

  const commandableProducts = (allProducts ?? []).filter(
    (p) => p.type === "COMMANDABLE" || p.type === "commandable",
  );

  const configuredProductIds = new Set((quotas ?? []).map((q) => q.productId));
  const availableProducts = commandableProducts.filter((p) => !configuredProductIds.has(p.id));

  function productName(id: string) {
    const p = commandableProducts.find((x) => x.id === id);
    return p ? (isAr ? p.nameAr : p.nameEn) : id;
  }

  function periodLabel(p: string) {
    if (p === "DAILY") return t("quotaPeriodDaily");
    if (p === "WEEKLY") return t("quotaPeriodWeekly");
    return t("quotaPeriodMonthly");
  }

  async function handleToggle(enabled: boolean) {
    setToggling(true);
    try {
      await rolesApi.toggleQuotas(roleId, enabled);
      void qc.invalidateQueries({ queryKey: ["roles"] });
      void message.success(enabled ? t("quotasActivated") : t("quotasDeactivated"));
    } catch {
      void message.error(t("errorOccurred"));
    } finally {
      setToggling(false);
    }
  }

  async function handleAdd() {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await rolesApi.setQuota(roleId, values);
      void qc.invalidateQueries({ queryKey: ["role-quotas", roleId] });
      form.resetFields();
      setShowAddForm(false);
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) return;
      void message.error(String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(quotaId: string) {
    try {
      await rolesApi.removeQuota(roleId, quotaId);
      void qc.invalidateQueries({ queryKey: ["role-quotas", roleId] });
    } catch {
      void message.error(t("errorOccurred"));
    }
  }

  const enabled = initialEnabled;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={560}
      title={
        <Title level={5} style={{ margin: 0 }}>
          {t("quotaPerRole")} — {roleName}
        </Title>
      }
      destroyOnClose
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBlockEnd: 24 }}>
        <Switch checked={enabled} loading={toggling} onChange={handleToggle} />
        <Text strong>{t("quotasEnabledForRole")}</Text>
        {enabled && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t("quotasEnabledHint")}
          </Text>
        )}
      </div>

      {enabled && (
        <>
          <Table<RoleQuota>
            rowKey="id"
            dataSource={quotas}
            loading={quotasLoading}
            pagination={false}
            size="small"
            style={{ marginBlockEnd: 20 }}
            locale={{ emptyText: t("noData") }}
            columns={[
              {
                title: t("products"),
                dataIndex: "productId",
                render: (id: string) => productName(id),
              },
              {
                title: t("periodType"),
                dataIndex: "periodType",
                width: 110,
                render: (p: string) => periodLabel(p),
              },
              {
                title: t("maxQuantity"),
                dataIndex: "maxQuantity",
                width: 90,
                align: "center" as const,
              },
              {
                title: "",
                key: "_del",
                width: 48,
                render: (_: unknown, r: RoleQuota) => (
                  <Popconfirm
                    title={t("deleteConfirm")}
                    onConfirm={() => void handleDelete(r.id)}
                    okText={t("confirm")}
                    cancelText={t("cancel")}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                ),
              },
            ]}
          />

          {showAddForm ? (
            <Form form={form} layout="vertical">
              <Form.Item name="productId" label={t("products")} rules={[{ required: true }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder={t("search")}
                  options={availableProducts.map((p) => ({
                    value: p.id,
                    label: isAr ? p.nameAr : p.nameEn,
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
              <Space>
                <Button type="primary" onClick={() => void handleAdd()} loading={saving}>
                  {t("addQuota")}
                </Button>
                <Button
                  onClick={() => {
                    setShowAddForm(false);
                    form.resetFields();
                  }}
                >
                  {t("cancel")}
                </Button>
              </Space>
            </Form>
          ) : (
            <Button
              icon={<PlusOutlined />}
              onClick={() => setShowAddForm(true)}
              disabled={availableProducts.length === 0}
            >
              {t("addQuota")}
            </Button>
          )}
        </>
      )}
    </Drawer>
  );
}
