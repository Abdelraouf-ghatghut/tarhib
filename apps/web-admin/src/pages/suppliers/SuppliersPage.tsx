import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  Button,
  Space,
  Modal,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Empty,
  message,
  Tag,
  Typography,
  Popconfirm,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, DollarOutlined } from "@ant-design/icons";
import { suppliersApi, productsAdminApi } from "../../lib/api";
import { getErrorMessage } from "../../lib/errors";
import { bilingualName } from "../../lib/bilingualName";

const { Title, Text } = Typography;

interface Supplier {
  id: string;
  nameAr: string;
  nameEn: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  active: boolean;
}

interface Product {
  id: string;
  nameAr: string;
  nameEn: string;
}

interface ProductPrice {
  id: string;
  supplierId: string;
  productId: string;
  unitCost: number;
}

/** Prix pratiqués par un fournisseur, produit par produit — pré-remplit le
 * coût unitaire dans المشتريات dès que fournisseur + produit sont choisis.
 * Affichage en lecture par défaut ; "تعديل" bascule en mode édition, "حفظ"
 * enregistre puis revient à l'affichage. */
function ProductPricesEditor({ supplierId }: { supplierId: string }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith("ar");
  const qc = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ["products-admin"],
    queryFn: () => productsAdminApi.list().then((r) => r.data as Product[]),
  });

  const { data: prices = [], isPending } = useQuery({
    queryKey: ["supplier-product-prices", supplierId],
    queryFn: () => suppliersApi.productPrices(supplierId).then((r) => r.data as ProductPrice[]),
  });

  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<Array<{ productId?: string; unitCost: number }>>([]);
  const [saving, setSaving] = useState(false);

  const productLabel = (p: Product) => bilingualName(p.nameAr, p.nameEn, isAr);
  const productName = (productId: string) => {
    const p = products.find((pr) => pr.id === productId);
    return p ? productLabel(p) : productId;
  };

  function startEdit() {
    setRows(prices.map((p) => ({ productId: p.productId, unitCost: p.unitCost })));
    setEditing(true);
  }
  function addRow() {
    setRows((prev) => [...prev, { productId: undefined, unitCost: 0 }]);
  }
  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }
  function patchRow(index: number, patch: Partial<{ productId?: string; unitCost: number }>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  async function save() {
    const valid = rows.filter((r) => r.productId);
    setSaving(true);
    try {
      await suppliersApi.setProductPrices(
        supplierId,
        valid.map((r) => ({ productId: r.productId, unitCost: r.unitCost })),
      );
      void qc.invalidateQueries({ queryKey: ["supplier-product-prices", supplierId] });
      void message.success(t("saved"));
      setEditing(false);
    } catch (err) {
      void message.error(getErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  }

  if (isPending) return null;

  if (!editing) {
    return (
      <div>
        <Text type="secondary" style={{ display: "block", fontSize: 13, marginBlockEnd: 12 }}>
          {t("supplierPricesHint")}
        </Text>
        {prices.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("noSupplierPrices")} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBlockEnd: 12 }}>
            {prices.map((p) => (
              <div
                key={p.id}
                style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}
              >
                <span>{productName(p.productId)}</span>
                <Text strong>{p.unitCost}</Text>
              </div>
            ))}
          </div>
        )}
        <Button icon={<EditOutlined />} onClick={startEdit}>
          {t("edit")}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Text type="secondary" style={{ display: "block", fontSize: 13, marginBlockEnd: 12 }}>
        {t("supplierPricesHint")}
      </Text>
      {rows.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("noSupplierPrices")} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBlockEnd: 12 }}>
          {rows.map((row, index) => (
            <Space key={index} wrap>
              <Select
                showSearch
                optionFilterProp="label"
                placeholder={t("product")}
                style={{ minInlineSize: 240 }}
                value={row.productId}
                onChange={(v: string) => patchRow(index, { productId: v })}
                options={products.map((p) => ({ value: p.id, label: productLabel(p) }))}
              />
              <InputNumber
                min={0}
                value={row.unitCost}
                onChange={(v) => patchRow(index, { unitCost: v ?? 0 })}
                addonAfter={t("unitCost")}
              />
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeRow(index)}
              />
            </Space>
          ))}
        </div>
      )}
      <Space>
        <Button icon={<PlusOutlined />} onClick={addRow}>
          {t("addSupplierPrice")}
        </Button>
        <Button onClick={() => setEditing(false)}>{t("cancel")}</Button>
        <Button type="primary" loading={saving} onClick={() => void save()}>
          {t("save")}
        </Button>
      </Space>
    </div>
  );
}

export default function SuppliersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [pricesFor, setPricesFor] = useState<Supplier | null>(null);

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await suppliersApi.list();
      return res.data as Supplier[];
    },
  });

  const save = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      if (editing) {
        return suppliersApi.update(editing.id, values);
      }
      return suppliersApi.create(values);
    },
    onSuccess: () => {
      message.success(t("saved"));
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => suppliersApi.remove(id),
    onSuccess: () => {
      message.success(t("deleted"));
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
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
    {
      title: t("phone"),
      dataIndex: "phone",
      key: "phone",
      render: (v: string | null) => (v ? <span dir="ltr">{v}</span> : "—"),
    },
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
          <Button size="small" icon={<DollarOutlined />} onClick={() => setPricesFor(r)} />
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
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          {t("suppliers")}
        </Title>
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
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => save.mutate(v as Record<string, string>)}
        >
          <Form.Item name="nameAr" label={t("nameAr")} rules={[{ required: true }]}>
            <Input dir="rtl" />
          </Form.Item>
          <Form.Item name="nameEn" label={t("nameEnOptional")}>
            <Input />
          </Form.Item>
          <Form.Item name="contactName" label={t("contact")}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label={t("email")}>
            <Input type="email" />
          </Form.Item>
          <Form.Item name="phone" label={t("phone")}>
            <Input dir="ltr" placeholder="+218912345678" />
          </Form.Item>
          <Form.Item name="address" label={t("address")}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        open={!!pricesFor}
        title={pricesFor ? `${t("supplierPrices")} — ${pricesFor.nameAr}` : ""}
        onClose={() => setPricesFor(null)}
        width={520}
        destroyOnClose
      >
        {pricesFor && <ProductPricesEditor key={pricesFor.id} supplierId={pricesFor.id} />}
      </Drawer>
    </div>
  );
}
