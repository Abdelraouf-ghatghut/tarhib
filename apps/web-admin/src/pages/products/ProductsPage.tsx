import { useState } from "react";
import {
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CrudTable } from "../../components/CrudTable";
import { productsApi, productsAdminApi, rolesApi, companiesApi } from "../../lib/api";
import { bilingualName } from "../../lib/bilingualName";

const { Title } = Typography;

const TYPES = ["COMMANDABLE", "LIBRE_SERVICE_VIP"];

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
  nameEn: string;
}

interface Product {
  id: string;
  nameAr: string;
  nameEn: string;
  category: string;
  type: string;
  allowedRoles: string[] | null;
  active: boolean;
  unitCost: number | null;
}

export function ProductsPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith("ar");
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Product | null>(null);

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
    if (id) await productsApi.update(id, values);
    else await productsApi.create(values);
    void qc.invalidateQueries({ queryKey: ["products-admin"] });
  }

  async function onDelete(id: string) {
    await productsApi.remove(id);
    void qc.invalidateQueries({ queryKey: ["products-admin"] });
  }

  return (
    <>
      <Title level={4}>{t("products")}</Title>
      <CrudTable<Product>
        data={data}
        isPending={isPending}
        onSave={onSave}
        onDelete={onDelete}
        onRow={(rec) => ({ onClick: () => setSelected(rec), style: { cursor: "pointer" } })}
        columns={[
          { title: t("nameAr"), dataIndex: "nameAr" },
          { title: t("nameEn"), dataIndex: "nameEn", render: (v: string) => v?.trim() || "—" },
          { title: t("category"), dataIndex: "category" },
          {
            title: t("type"),
            dataIndex: "type",
            render: (v: string) => (
              <Tag color={v === "COMMANDABLE" ? "blue" : "purple"}>
                {v === "COMMANDABLE" ? t("commandable") : t("vip_self_service")}
              </Tag>
            ),
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
            <Form.Item name="type" label={t("type")} rules={[{ required: true }]}>
              <Select
                options={TYPES.map((tp) => ({
                  value: tp,
                  label: tp === "COMMANDABLE" ? t("commandable") : t("vip_self_service"),
                }))}
              />
            </Form.Item>
            <Form.Item name="allowedRoles" label={t("allowedRoles")}>
              <Select mode="multiple" allowClear options={clientRoleOptions} />
            </Form.Item>
            <Form.Item name="unitCost" label={t("unitCost")} tooltip={t("unitCostHint")}>
              <InputNumber min={0} style={{ width: "100%" }} />
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
            <Descriptions.Item label={t("active")}>
              <Tag color={selected.active ? "green" : "default"}>{selected.active ? "✓" : "✗"}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </>
  );
}
