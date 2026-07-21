import { useState } from "react";
import {
  Alert,
  App,
  Button,
  DatePicker,
  Form,
  InputNumber,
  Modal,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, DownloadOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import dayjs, { type Dayjs } from "dayjs";
import { quotasApi, productsAdminApi, employeesApi } from "../../lib/api";
import { ScopeFilterBar } from "../../components/ScopeFilterBar";
import { useScope } from "../../contexts/ScopeContext";
import { useAuth } from "../../hooks/useAuth";
import { getErrorMessage } from "../../lib/errors";
import { bilingualName } from "../../lib/bilingualName";
import { useEntityLookup } from "../../hooks/useEntityLookup";
import { exportToCsv } from "../../lib/exportCsv";

const { Title, Text } = Typography;

interface Quota {
  id: string;
  employeeId: string;
  productId: string;
  companyId: string;
  periodStart: string;
  periodEnd: string;
  maxQuantity: number;
  usedQuantity: number;
}

interface Product {
  id: string;
  nameAr: string;
  nameEn: string;
  isSold: boolean;
}

interface Employee {
  id: string;
  firstNameAr: string;
  lastNameAr: string;
  firstNameEn: string;
  lastNameEn: string;
  email: string;
  companyId: string;
}

/**
 * Quotas individuels (fenêtre datée employé × produit, consommation suivie).
 * Les quotas récurrents par rôle client (jour/semaine/mois) se configurent
 * dans Rôles & permissions — un lien y renvoie.
 */
export function QuotasPage() {
  const { t, i18n } = useTranslation();
  const { modal } = App.useApp();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isAr = i18n.language.startsWith("ar");
  const { companyId: scopeCompanyId } = useScope();
  const { companyId: authCompanyId, hasPermission } = useAuth();
  const companyId = scopeCompanyId ?? authCompanyId ?? undefined;

  const [form] = Form.useForm();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Quota | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: quotas = [], isPending } = useQuery({
    queryKey: ["quotas", companyId],
    queryFn: () =>
      quotasApi.list(companyId ? { companyId } : undefined).then((r) => r.data as Quota[]),
  });

  // Vue admin : /products/admin (tous les produits, sans le filtrage par
  // rôle/type/actif appliqué au catalogue employé) — sinon un quota ne
  // peut être créé que sur les produits déjà autorisés au rôle de l'appelant.
  const { data: products = [] } = useQuery({
    queryKey: ["products-admin"],
    queryFn: () => productsAdminApi.list().then((r) => r.data as Product[]),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", companyId],
    queryFn: () =>
      employeesApi.list(companyId ? { companyId } : undefined).then((r) => r.data as Employee[]),
  });

  const productName = useEntityLookup(
    products,
    (p) => p.id,
    (p) => bilingualName(p.nameAr, p.nameEn, isAr),
  );

  const employeeName = useEntityLookup(
    employees,
    (e) => e.id,
    (e) =>
      (isAr ? `${e.firstNameAr} ${e.lastNameAr}` : `${e.firstNameEn} ${e.lastNameEn}`).trim() ||
      e.email,
  );

  function openCreate() {
    setEditing(null);
    form.resetFields();
    setCreateOpen(true);
  }

  function openEdit(quota: Quota) {
    setEditing(quota);
    form.setFieldsValue({
      employeeId: quota.employeeId,
      productId: quota.productId,
      period: [dayjs(quota.periodStart), dayjs(quota.periodEnd)],
      maxQuantity: quota.maxQuantity,
    });
    setCreateOpen(true);
  }

  async function handleSubmit() {
    try {
      const values = (await form.validateFields()) as {
        employeeId: string;
        productId: string;
        period: [Dayjs, Dayjs];
        maxQuantity: number;
      };
      setSaving(true);
      if (editing) {
        await quotasApi.update(editing.id, {
          productId: values.productId,
          periodStart: values.period[0].format("YYYY-MM-DD"),
          periodEnd: values.period[1].format("YYYY-MM-DD"),
          maxQuantity: values.maxQuantity,
        });
      } else {
        const employee = employees.find((e) => e.id === values.employeeId);
        await quotasApi.create({
          employeeId: values.employeeId,
          productId: values.productId,
          periodStart: values.period[0].format("YYYY-MM-DD"),
          periodEnd: values.period[1].format("YYYY-MM-DD"),
          maxQuantity: values.maxQuantity,
          companyId: employee?.companyId ?? companyId,
        });
      }
      void qc.invalidateQueries({ queryKey: ["quotas"] });
      void message.success(t("saved"));
      setCreateOpen(false);
      setEditing(null);
      form.resetFields();
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) return;
      void message.error(getErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await quotasApi.remove(id);
      void qc.invalidateQueries({ queryKey: ["quotas"] });
      void message.success(t("deleted"));
    } catch (err) {
      void message.error(getErrorMessage(err, t));
    }
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBlockEnd: 16,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          {t("quotas")}
        </Title>
        <Space>
          <Button
            icon={<DownloadOutlined />}
            onClick={() =>
              exportToCsv(`quotas-${dayjs().format("YYYY-MM-DD")}`, quotas, [
                { label: t("employee"), value: (q) => employeeName(q.employeeId) },
                { label: t("product"), value: (q) => productName(q.productId) },
                { label: t("period"), value: (q) => `${q.periodStart} → ${q.periodEnd}` },
                { label: t("maxQuantity"), value: (q) => q.maxQuantity },
                { label: t("usedQuantity"), value: (q) => q.usedQuantity },
              ])
            }
          >
            {t("exportCsv")}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t("newQuota")}
          </Button>
        </Space>
      </div>

      {/* Les quotas récurrents par rôle se gèrent dans Rôles & permissions */}
      {hasPermission("role.manage") && (
        <Alert
          type="info"
          showIcon
          style={{ marginBlockEnd: 16 }}
          message={t("quotaRoleHint")}
          action={
            <Button size="small" onClick={() => navigate("/roles")}>
              {t("rolesPermissions")}
            </Button>
          }
        />
      )}

      <ScopeFilterBar showBranch={false} />

      <Table<Quota>
        rowKey="id"
        dataSource={quotas}
        loading={isPending}
        size="middle"
        scroll={{ x: true }}
        pagination={{ pageSize: 20 }}
        columns={[
          {
            title: t("employee"),
            dataIndex: "employeeId",
            render: (v: string) => employeeName(v),
          },
          {
            title: t("product"),
            dataIndex: "productId",
            render: (v: string) => productName(v),
          },
          {
            title: t("period"),
            key: "period",
            render: (_: unknown, r: Quota) =>
              `${dayjs(r.periodStart).format("DD/MM/YYYY")} → ${dayjs(r.periodEnd).format("DD/MM/YYYY")}`,
            width: 220,
          },
          {
            title: t("usedQuantity"),
            key: "usage",
            width: 220,
            render: (_: unknown, r: Quota) => {
              const pct = r.maxQuantity > 0 ? (r.usedQuantity / r.maxQuantity) * 100 : 0;
              return (
                <Space size={8}>
                  <Progress
                    percent={Math.min(100, Math.round(pct))}
                    size="small"
                    style={{ inlineSize: 110 }}
                    status={pct >= 100 ? "exception" : undefined}
                    showInfo={false}
                  />
                  <Tag color={pct >= 100 ? "red" : pct >= 80 ? "orange" : "green"}>
                    {r.usedQuantity} / {r.maxQuantity}
                  </Tag>
                </Space>
              );
            },
          },
          {
            title: t("actions"),
            key: "actions",
            width: 100,
            render: (_: unknown, r: Quota) => (
              <Space size={4}>
                <Button
                  size="small"
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => openEdit(r)}
                />
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() =>
                    modal.confirm({
                      title: t("deleteConfirm"),
                      okText: t("confirm"),
                      cancelText: t("cancel"),
                      okButtonProps: { danger: true },
                      onOk: () => handleDelete(r.id),
                    })
                  }
                />
              </Space>
            ),
          },
        ]}
      />

      <Modal
        open={createOpen}
        title={editing ? t("editQuota") : t("newQuota")}
        onOk={() => void handleSubmit()}
        onCancel={() => {
          setCreateOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        confirmLoading={saving}
        okText={t("save")}
        cancelText={t("cancel")}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginBlockStart: 16 }}>
          <Form.Item name="employeeId" label={t("employee")} rules={[{ required: true }]}>
            <Select
              disabled={!!editing}
              showSearch
              optionFilterProp="label"
              options={employees.map((e) => ({
                value: e.id,
                label:
                  (isAr
                    ? `${e.firstNameAr} ${e.lastNameAr}`
                    : `${e.firstNameEn} ${e.lastNameEn}`
                  ).trim() || e.email,
              }))}
            />
          </Form.Item>
          <Form.Item name="productId" label={t("product")} rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={products
                .filter((p) => p.isSold)
                .map((p) => ({
                  value: p.id,
                  label: bilingualName(p.nameAr, p.nameEn, isAr),
                }))}
            />
          </Form.Item>
          <Form.Item
            name="period"
            label={t("period")}
            rules={[{ required: true }]}
            initialValue={[dayjs().startOf("month"), dayjs().endOf("month")]}
          >
            <DatePicker.RangePicker style={{ inlineSize: "100%" }} />
          </Form.Item>
          <Form.Item
            name="maxQuantity"
            label={t("maxQuantity")}
            rules={[{ required: true }]}
            initialValue={10}
          >
            <InputNumber min={1} style={{ inlineSize: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      {quotas.length === 0 && !isPending && (
        <Text type="secondary" style={{ display: "block", marginBlockStart: 8, fontSize: 13 }}>
          {t("noData")}
        </Text>
      )}
    </>
  );
}
