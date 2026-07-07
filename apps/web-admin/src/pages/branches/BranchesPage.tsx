import { Divider, Form, Input, Select, Switch, Tag, Typography } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CrudTable } from "../../components/CrudTable";
import { ScopeFilterBar } from "../../components/ScopeFilterBar";
import { useScope } from "../../contexts/ScopeContext";
import { branchesApi, companiesApi, employeesApi } from "../../lib/api";
import { bilingualName } from "../../lib/bilingualName";

const { Title, Text } = Typography;

interface Branch {
  id: string;
  nameAr: string;
  nameEn: string;
  companyId: string;
  active: boolean;
  stockResponsibleId: string | null;
  orderValidatorId: string | null;
  purchasingManagerId: string | null;
}
interface Company {
  id: string;
  nameAr: string;
  nameEn: string;
}
interface Employee {
  id: string;
  firstNameAr: string;
  lastNameAr: string;
  firstNameEn: string;
  lastNameEn: string;
  email: string;
  scope?: string;
}

export function BranchesPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const isAr = i18n.language === "ar";

  const { companyId: scopeCompanyId } = useScope();

  const { data, isPending } = useQuery({
    queryKey: ["branches", scopeCompanyId],
    queryFn: () => branchesApi.list(scopeCompanyId ?? undefined).then((r) => r.data as Branch[]),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as Company[]),
  });

  // Chaîne d'achat : personnel Tarhib dispatché (pas des employés clients)
  const { data: allEmployees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeesApi.list().then((r) => r.data as Employee[]),
  });
  const internalEmployees = allEmployees.filter((e) => (e.scope ?? "CLIENT") === "TARHIB");
  const employeeLabel = (e: Employee) =>
    (isAr ? `${e.firstNameAr} ${e.lastNameAr}` : `${e.firstNameEn} ${e.lastNameEn}`).trim() ||
    e.email;
  const employeeName = (id: string | null) => {
    if (!id) return "—";
    const e = allEmployees.find((x) => x.id === id);
    return e ? employeeLabel(e) : id.substring(0, 8);
  };

  async function onSave(values: Record<string, unknown>, id?: string) {
    if (id) await branchesApi.update(id, values);
    else await branchesApi.create(values);
    void qc.invalidateQueries({ queryKey: ["branches"] });
  }

  async function onDelete(id: string) {
    await branchesApi.remove(id);
    void qc.invalidateQueries({ queryKey: ["branches"] });
  }

  const companyMap = Object.fromEntries(
    companies.map((c) => [c.id, bilingualName(c.nameAr, c.nameEn, isAr)]),
  );

  return (
    <>
      <Title level={4}>{t("branches")}</Title>
      <ScopeFilterBar showBranch={false} />
      <CrudTable<Branch>
        data={data}
        isPending={isPending}
        onSave={onSave}
        onDelete={onDelete}
        columns={[
          { title: t("nameAr"), dataIndex: "nameAr" },
          { title: t("nameEn"), dataIndex: "nameEn" },
          {
            title: t("company"),
            dataIndex: "companyId",
            render: (v: string) => companyMap[v] ?? v,
          },
          {
            title: t("stockResponsible"),
            dataIndex: "stockResponsibleId",
            render: (v: string | null) => employeeName(v),
          },
          {
            title: t("orderValidator"),
            dataIndex: "orderValidatorId",
            render: (v: string | null) => employeeName(v),
          },
          {
            title: t("purchasingManager"),
            dataIndex: "purchasingManagerId",
            render: (v: string | null) => employeeName(v),
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
            <Form.Item name="nameEn" label={t("nameEnOptional")}>
              <Input />
            </Form.Item>
            <Form.Item name="companyId" label={t("company")} rules={[{ required: true }]}>
              <Select
                options={companies.map((c) => ({
                  value: c.id,
                  label: bilingualName(c.nameAr, c.nameEn, isAr),
                }))}
              />
            </Form.Item>
            <Form.Item
              name="active"
              label={t("active")}
              valuePropName="checked"
              initialValue={true}
            >
              <Switch />
            </Form.Item>

            <Divider style={{ marginBlock: 16 }}>{t("procurementChain")}</Divider>
            <Text type="secondary" style={{ display: "block", fontSize: 13, marginBlockEnd: 12 }}>
              {t("procurementChainHint")}
            </Text>
            <Form.Item name="stockResponsibleId" label={t("stockResponsible")}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                options={internalEmployees.map((e) => ({ value: e.id, label: employeeLabel(e) }))}
              />
            </Form.Item>
            <Form.Item name="orderValidatorId" label={t("orderValidator")}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                options={internalEmployees.map((e) => ({ value: e.id, label: employeeLabel(e) }))}
              />
            </Form.Item>
            <Form.Item name="purchasingManagerId" label={t("purchasingManager")}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                options={internalEmployees.map((e) => ({ value: e.id, label: employeeLabel(e) }))}
              />
            </Form.Item>
          </>
        )}
      />
    </>
  );
}
