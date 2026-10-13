import { Form, InputNumber, Select, Tag, Typography } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CrudTable } from "../../components/CrudTable";
import { quotasApi, productsApi, employeesApi } from "../../lib/api";

const { Title } = Typography;

const PERIODS = ["DAY", "WEEK", "MONTH"];
const ROLES = ["ADMIN", "DEPARTMENT_MANAGER", "INVENTORY_MANAGER", "HOSPITALITY_AGENT", "EMPLOYEE"];

interface Quota {
  id: string;
  productId: string;
  employeeId?: string;
  role?: string;
  period: string;
  maxQuantity: number;
  usedQuantity: number;
}

interface Product {
  id: string;
  nameAr: string;
  nameEn: string;
}
interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

export function QuotasPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const isAr = i18n.language === "ar";

  const { data, isPending } = useQuery({
    queryKey: ["quotas"],
    queryFn: () => quotasApi.list().then((r) => r.data as Quota[]),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => productsApi.list().then((r) => r.data as Product[]),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeesApi.list().then((r) => r.data as Employee[]),
  });

  async function onSave(values: Record<string, unknown>, id?: string) {
    if (id) await quotasApi.update(id, values);
    else await quotasApi.create(values);
    void qc.invalidateQueries({ queryKey: ["quotas"] });
  }

  async function onDelete(id: string) {
    await quotasApi.remove(id);
    void qc.invalidateQueries({ queryKey: ["quotas"] });
  }

  const productMap = Object.fromEntries(products.map((p) => [p.id, isAr ? p.nameAr : p.nameEn]));

  const employeeMap = Object.fromEntries(
    employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`]),
  );

  return (
    <>
      <Title level={4}>{t("quotas")}</Title>
      <CrudTable<Quota>
        data={data}
        isPending={isPending}
        onSave={onSave}
        onDelete={onDelete}
        columns={[
          {
            title: t("productId"),
            dataIndex: "productId",
            render: (v: string) => productMap[v] ?? v.substring(0, 8),
          },
          {
            title: t("role") + " / " + t("employees"),
            render: (_: unknown, row: Quota) =>
              row.role ? (
                <Tag>{row.role}</Tag>
              ) : (
                (employeeMap[row.employeeId ?? ""] ?? row.employeeId?.substring(0, 8))
              ),
          },
          { title: t("period"), dataIndex: "period" },
          { title: t("maxQuantity"), dataIndex: "maxQuantity" },
          {
            title: t("usedQuantity"),
            dataIndex: "usedQuantity",
            render: (v: number, row: Quota) => (
              <Tag color={v >= row.maxQuantity ? "red" : "green"}>
                {v} / {row.maxQuantity}
              </Tag>
            ),
          },
        ]}
        formContent={() => (
          <>
            <Form.Item name="productId" label={t("productId")} rules={[{ required: true }]}>
              <Select
                showSearch
                options={products.map((p) => ({
                  value: p.id,
                  label: isAr ? p.nameAr : p.nameEn,
                }))}
                filterOption={(input, opt) =>
                  String(opt?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              />
            </Form.Item>
            <Form.Item name="role" label={t("role")}>
              <Select
                allowClear
                options={ROLES.map((r) => ({ value: r, label: r }))}
                placeholder="Par rôle (ou laisser vide pour un employé spécifique)"
              />
            </Form.Item>
            <Form.Item name="employeeId" label={t("employees")}>
              <Select
                allowClear
                showSearch
                options={employees.map((e) => ({
                  value: e.id,
                  label: `${e.firstName} ${e.lastName}`,
                }))}
                filterOption={(input, opt) =>
                  String(opt?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                placeholder="Par employé (ou laisser vide pour un rôle)"
              />
            </Form.Item>
            <Form.Item name="period" label={t("period")} rules={[{ required: true }]}>
              <Select options={PERIODS.map((p) => ({ value: p, label: t(p.toLowerCase()) }))} />
            </Form.Item>
            <Form.Item name="maxQuantity" label={t("maxQuantity")} rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
          </>
        )}
      />
    </>
  );
}
