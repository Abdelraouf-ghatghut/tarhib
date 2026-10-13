import { Form, Input, Select, Switch, Tag, Typography } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CrudTable } from "../../components/CrudTable";
import { productsApi } from "../../lib/api";

const { Title } = Typography;

const ROLES = ["ADMIN", "DEPARTMENT_MANAGER", "INVENTORY_MANAGER", "HOSPITALITY_AGENT", "EMPLOYEE"];
const TYPES = ["COMMANDABLE", "LIBRE_SERVICE_VIP"];

interface Product {
  id: string;
  nameAr: string;
  nameEn: string;
  category: string;
  type: string;
  allowedRoles: string[];
  active: boolean;
}

export function ProductsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: ["products"],
    queryFn: () => productsApi.list().then((r) => r.data as Product[]),
  });

  async function onSave(values: Record<string, unknown>, id?: string) {
    if (id) await productsApi.update(id, values);
    else await productsApi.create(values);
    void qc.invalidateQueries({ queryKey: ["products"] });
  }

  async function onDelete(id: string) {
    await productsApi.remove(id);
    void qc.invalidateQueries({ queryKey: ["products"] });
  }

  return (
    <>
      <Title level={4}>{t("products")}</Title>
      <CrudTable<Product>
        data={data}
        isPending={isPending}
        onSave={onSave}
        onDelete={onDelete}
        columns={[
          { title: t("nameAr"), dataIndex: "nameAr" },
          { title: t("nameEn"), dataIndex: "nameEn" },
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
            title: t("active"),
            dataIndex: "active",
            render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "✓" : "✗"}</Tag>,
            width: 80,
          },
        ]}
        formContent={() => (
          <>
            <Form.Item name="nameAr" label={t("nameAr")} rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="nameEn" label={t("nameEn")} rules={[{ required: true }]}>
              <Input />
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
              <Select mode="multiple" options={ROLES.map((r) => ({ value: r, label: r }))} />
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
    </>
  );
}
