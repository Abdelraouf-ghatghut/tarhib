import { useRef, useState } from "react";
import {
  Button,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CrudTable } from "../../components/CrudTable";
import type { CrudTableHandle } from "../../components/CrudTable";
import { productsApi, productsAdminApi, rolesApi, companiesApi, branchesApi } from "../../lib/api";
import { bilingualName } from "../../lib/bilingualName";
import { getErrorMessage } from "../../lib/errors";
import { useEntityLookup } from "../../hooks/useEntityLookup";

const { Title } = Typography;

/**
 * isSold / isVipSelfService / isPurchased sont indépendants (un ingrédient
 * interne comme le café en grains est acheté mais jamais vendu ; un produit
 * composé comme "café sucré" est vendu mais pas forcément acheté tel quel).
 * isSold et isVipSelfService restent mutuellement exclusifs (règle §3.2
 * CLAUDE.md : un produit VIP n'est jamais commandable).
 */
function ProductFlagsFields() {
  const { t } = useTranslation();
  const form = Form.useFormInstance();

  return (
    <>
      <Form.Item
        name="isSold"
        label={t("isSoldLabel")}
        tooltip={t("isSoldHint")}
        valuePropName="checked"
        initialValue={true}
      >
        <Switch
          onChange={(checked) => {
            if (checked) form.setFieldValue("isVipSelfService", false);
          }}
        />
      </Form.Item>
      <Form.Item
        name="isVipSelfService"
        label={t("isVipSelfServiceLabel")}
        tooltip={t("isVipSelfServiceHint")}
        valuePropName="checked"
        initialValue={false}
      >
        <Switch
          onChange={(checked) => {
            if (checked) form.setFieldValue("isSold", false);
          }}
        />
      </Form.Item>
      <Form.Item
        name="isPurchased"
        label={t("isPurchasedLabel")}
        tooltip={t("isPurchasedHint")}
        valuePropName="checked"
        initialValue={true}
      >
        <Switch />
      </Form.Item>
    </>
  );
}

interface DynamicRole {
  id: string;
  nameAr: string;
  nameEn: string | null;
  scope: "TARHIB" | "CLIENT";
  companyId: string | null;
}

interface NamedEntity {
  id: string;
  nameAr: string;
  nameEn: string | null;
  companyId?: string;
}

interface Product {
  id: string;
  nameAr: string;
  nameEn: string | null;
  category: string;
  type: string;
  allowedRoles: string[] | null;
  allowedBranches: string[] | null;
  active: boolean;
  unitCost: number | null;
  isSold: boolean;
  isPurchased: boolean;
  isVipSelfService: boolean;
  unit: string | null;
  purchaseUnit: string | null;
  unitsPerPurchase: number;
}

interface RecipeLine {
  id: string;
  productId: string;
  ingredientProductId: string;
  quantity: number;
}

export function ProductsPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith("ar");
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Product | null>(null);
  const crudRef = useRef<CrudTableHandle>(null);

  // Vue admin : /products/admin renvoie TOUS les produits (VIP inclus) sans
  // filtrage par rôle. /products filtrerait selon le rôle de l'appelant — un
  // superadmin (role "Superadmin") ne verrait aucun produit restreint aux
  // rôles clients, d'où la page vide.
  const { data, isPending } = useQuery({
    queryKey: ["products-admin"],
    queryFn: () => productsAdminApi.list().then((r) => r.data as Product[]),
  });

  // "الأدوار المسموح بها" doit lister les rôles CLIENT réels (dynamiques),
  // jamais l'ancienne énumération legacy (ADMIN, INVENTORY_MANAGER…) qui n'a
  // aucun sens pour un catalogue employé. Value = roleId (unique), jamais le
  // nom (plusieurs sociétés peuvent avoir un rôle "Employee" homonyme).
  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: () => rolesApi.list().then((r) => r.data as DynamicRole[]),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as NamedEntity[]),
  });
  const companyName = (id: string | null) => {
    const c = companies.find((x) => x.id === id);
    return c ? bilingualName(c.nameAr, c.nameEn, isAr) : null;
  };

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchesApi.list().then((r) => r.data as NamedEntity[]),
  });
  const branchName = (id: string) => {
    const b = branches.find((x) => x.id === id);
    if (!b) return id.slice(0, 8);
    const name = bilingualName(b.nameAr, b.nameEn, isAr);
    const company = companyName(b.companyId ?? null);
    return company ? `${name} (${company})` : name;
  };
  const branchOptions = branches.map((b) => ({ value: b.id, label: branchName(b.id) }));

  const clientRoleOptions = roles
    .filter((r) => r.scope === "CLIENT")
    .map((r) => {
      const name = bilingualName(r.nameAr, r.nameEn, isAr);
      const company = companyName(r.companyId);
      return { value: r.id, label: company ? `${name} (${company})` : name };
    });

  const roleName = (id: string) => {
    const r = roles.find((x) => x.id === id);
    return r ? bilingualName(r.nameAr, r.nameEn, isAr) : id.slice(0, 8);
  };

  async function onSave(values: Record<string, unknown>, id?: string) {
    // `type` reste requis côté API (champ legacy) — toujours dérivé de
    // isVipSelfService pour rester cohérent avec les vrais flags envoyés.
    const payload = {
      ...values,
      type: values.isVipSelfService ? "LIBRE_SERVICE_VIP" : "COMMANDABLE",
    };
    if (id) await productsApi.update(id, payload);
    else await productsApi.create(payload);
    void qc.invalidateQueries({ queryKey: ["products-admin"] });
  }

  async function onDelete(id: string) {
    await productsApi.remove(id);
    void qc.invalidateQueries({ queryKey: ["products-admin"] });
  }

  // Nomenclature (BOM) : uniquement pour un produit vendu (isSold) — les
  // ingrédients candidats sont les produits qui ne sont pas eux-mêmes vendus.
  const { data: recipeLines = [] } = useQuery({
    queryKey: ["product-recipe", selected?.id],
    queryFn: () => productsAdminApi.getRecipe(selected!.id).then((r) => r.data as RecipeLine[]),
    enabled: !!selected?.isSold,
  });

  const ingredientCandidates = (data ?? []).filter((p) => !p.isSold);
  const ingredientName = useEntityLookup(
    ingredientCandidates,
    (p) => p.id,
    (p) => bilingualName(p.nameAr, p.nameEn, isAr),
  );

  const [recipeForm] = Form.useForm();
  const addRecipeLine = useMutation({
    mutationFn: (values: { ingredientProductId: string; quantity: number }) =>
      productsAdminApi.addRecipeLine(selected!.id, values),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["product-recipe", selected?.id] });
      recipeForm.resetFields();
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });
  const removeRecipeLine = useMutation({
    mutationFn: (lineId: string) => productsAdminApi.removeRecipeLine(lineId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["product-recipe", selected?.id] }),
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  return (
    <>
      <Row justify="space-between" align="middle" style={{ marginBlockEnd: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            {t("products")}
          </Title>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => crudRef.current?.openCreate()}
          >
            {t("add")}
          </Button>
        </Col>
      </Row>
      <CrudTable<Product>
        ref={crudRef}
        hideAddButton
        data={data}
        isPending={isPending}
        onSave={onSave}
        onDelete={onDelete}
        onRow={(rec) => ({ onClick: () => setSelected(rec), style: { cursor: "pointer" } })}
        columns={[
          { title: t("nameAr"), dataIndex: "nameAr" },
          {
            title: t("nameEn"),
            dataIndex: "nameEn",
            render: (v: string | null) => v?.trim() || "—",
          },
          { title: t("category"), dataIndex: "category" },
          {
            title: t("type"),
            dataIndex: "type",
            render: (_: string, record: Product) => {
              if (record.isVipSelfService) return <Tag color="purple">{t("vip_self_service")}</Tag>;
              if (record.isSold) return <Tag color="blue">{t("commandable")}</Tag>;
              return <Tag>{t("internalIngredient")}</Tag>;
            },
          },
          {
            title: t("unitCost"),
            dataIndex: "unitCost",
            render: (v: number | null) => (v != null ? v : "—"),
            width: 100,
          },
          {
            title: t("active"),
            dataIndex: "active",
            render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "✓" : "✗"}</Tag>,
            width: 80,
          },
        ]}
        formContent={() => (
          <>
            <Form.Item name="nameAr" label={t("nameAr")} rules={[{ required: true }]}>
              <Input dir="rtl" />
            </Form.Item>
            <Form.Item name="nameEn" label={t("nameEnOptional")}>
              <Input dir="ltr" />
            </Form.Item>
            <Form.Item name="category" label={t("category")} rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <ProductFlagsFields />
            <Form.Item name="allowedRoles" label={t("allowedRoles")}>
              <Select mode="multiple" allowClear options={clientRoleOptions} />
            </Form.Item>
            <Form.Item
              name="allowedBranches"
              label={t("allowedBranches")}
              tooltip={t("allowedBranchesHint")}
            >
              <Select
                mode="multiple"
                allowClear
                showSearch
                optionFilterProp="label"
                options={branchOptions}
              />
            </Form.Item>
            <Form.Item name="unitCost" label={t("unitCost")} tooltip={t("unitCostHint")}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="unit" label={t("unit")} tooltip={t("unitHint")}>
              <Input placeholder="g, ml, unité…" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="purchaseUnit"
              label={t("purchaseUnit")}
              tooltip={t("purchaseUnitHint")}
            >
              <Input placeholder="sac, carton…" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="unitsPerPurchase"
              label={t("unitsPerPurchase")}
              tooltip={t("unitsPerPurchaseHint")}
              initialValue={1}
            >
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="active"
              label={t("active")}
              valuePropName="checked"
              initialValue={true}
            >
              <Switch />
            </Form.Item>
          </>
        )}
      />

      <Drawer
        title={selected ? bilingualName(selected.nameAr, selected.nameEn, isAr) : ""}
        open={!!selected}
        onClose={() => setSelected(null)}
        width={420}
      >
        {selected && (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label={t("nameAr")}>{selected.nameAr}</Descriptions.Item>
            <Descriptions.Item label={t("nameEn")}>
              {selected.nameEn?.trim() || "—"}
            </Descriptions.Item>
            <Descriptions.Item label={t("category")}>{selected.category}</Descriptions.Item>
            <Descriptions.Item label={t("type")}>
              <Tag color={selected.type === "COMMANDABLE" ? "blue" : "purple"}>
                {selected.type === "COMMANDABLE" ? t("commandable") : t("vip_self_service")}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t("unitCost")}>
              {selected.unitCost != null ? selected.unitCost : "—"}
            </Descriptions.Item>
            <Descriptions.Item label={t("unit")}>{selected.unit ?? "—"}</Descriptions.Item>
            {selected.purchaseUnit && (
              <Descriptions.Item label={t("purchaseUnit")}>
                {selected.purchaseUnit} = {selected.unitsPerPurchase} {selected.unit ?? ""}
              </Descriptions.Item>
            )}
            <Descriptions.Item label={t("allowedRoles")}>
              {selected.allowedRoles?.length ? (
                <Space wrap size={4}>
                  {selected.allowedRoles.map((id) => (
                    <Tag key={id}>{roleName(id)}</Tag>
                  ))}
                </Space>
              ) : (
                "—"
              )}
            </Descriptions.Item>
            <Descriptions.Item label={t("allowedBranches")}>
              {selected.allowedBranches?.length ? (
                <Space wrap size={4}>
                  {selected.allowedBranches.map((id) => (
                    <Tag key={id}>{branchName(id)}</Tag>
                  ))}
                </Space>
              ) : (
                "—"
              )}
            </Descriptions.Item>
            <Descriptions.Item label={t("active")}>
              <Tag color={selected.active ? "green" : "default"}>{selected.active ? "✓" : "✗"}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}

        {selected?.isSold && (
          <div style={{ marginBlockStart: 24 }}>
            <Typography.Title level={5}>{t("recipe")}</Typography.Title>
            <Table<RecipeLine>
              rowKey="id"
              size="small"
              dataSource={recipeLines}
              pagination={false}
              locale={{ emptyText: <Empty description={t("noRecipeLines")} /> }}
              columns={[
                {
                  title: t("ingredient"),
                  dataIndex: "ingredientProductId",
                  render: (id: string) => ingredientName(id),
                },
                { title: t("quantity"), dataIndex: "quantity", width: 90 },
                {
                  title: "",
                  key: "actions",
                  width: 40,
                  render: (_: unknown, line: RecipeLine) => (
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      loading={removeRecipeLine.isPending}
                      onClick={() => removeRecipeLine.mutate(line.id)}
                    />
                  ),
                },
              ]}
            />
            <Form
              form={recipeForm}
              layout="inline"
              style={{ marginBlockStart: 12 }}
              onFinish={(v: { ingredientProductId: string; quantity: number }) =>
                addRecipeLine.mutate(v)
              }
            >
              <Form.Item
                name="ingredientProductId"
                rules={[{ required: true }]}
                style={{ flex: 1, minInlineSize: 160 }}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder={t("ingredient")}
                  options={ingredientCandidates.map((p) => ({
                    value: p.id,
                    label: bilingualName(p.nameAr, p.nameEn, isAr),
                  }))}
                />
              </Form.Item>
              <Form.Item name="quantity" rules={[{ required: true }]}>
                <InputNumber min={1} placeholder={t("quantity")} style={{ width: 90 }} />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<PlusOutlined />}
                  loading={addRecipeLine.isPending}
                />
              </Form.Item>
            </Form>
          </div>
        )}
      </Drawer>
    </>
  );
}
