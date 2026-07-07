import { Form, Input, Select, Switch, Tag, Typography } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CrudTable } from "../../components/CrudTable";
import { ScopeFilterBar } from "../../components/ScopeFilterBar";
import { useScope } from "../../contexts/ScopeContext";
import { useAuth } from "../../hooks/useAuth";
import { departmentsApi, branchesApi, companiesApi } from "../../lib/api";
import { bilingualName } from "../../lib/bilingualName";

const { Title } = Typography;

interface Department {
  id: string;
  nameAr: string;
  nameEn: string;
  companyId: string;
  branchId: string;
  active: boolean;
}

interface NamedEntity {
  id: string;
  nameAr: string;
  nameEn: string;
}

/**
 * Champs du formulaire département : la société est renseignée en premier et
 * la liste des branches se limite à celles de la société choisie.
 */
function DepartmentFormFields({ companies, isAr }: { companies: NamedEntity[]; isAr: boolean }) {
  const { t } = useTranslation();
  const form = Form.useFormInstance();
  const companyId = Form.useWatch("companyId", form) as string | undefined;

  const { data: companyBranches = [] } = useQuery({
    queryKey: ["branches", companyId],
    queryFn: () => branchesApi.list(companyId).then((r) => r.data as NamedEntity[]),
    enabled: !!companyId,
  });

  const label = (e: NamedEntity) => bilingualName(e.nameAr, e.nameEn, isAr);

  return (
    <>
      <Form.Item name="companyId" label={t("company")} rules={[{ required: true }]}>
        <Select
          showSearch
          optionFilterProp="label"
          options={companies.map((c) => ({ value: c.id, label: label(c) }))}
          onChange={() => form.setFieldValue("branchId", undefined)}
        />
      </Form.Item>
      <Form.Item name="branchId" label={t("branch")} rules={[{ required: true }]}>
        <Select
          showSearch
          optionFilterProp="label"
          disabled={!companyId}
          placeholder={!companyId ? t("noCompanySelected") : undefined}
          options={companyBranches.map((b) => ({ value: b.id, label: label(b) }))}
        />
      </Form.Item>
      <Form.Item name="nameAr" label={t("nameAr")} rules={[{ required: true }]}>
        <Input dir="rtl" />
      </Form.Item>
      <Form.Item name="nameEn" label={t("nameEnOptional")}>
        <Input />
      </Form.Item>
      <Form.Item name="active" label={t("active")} valuePropName="checked" initialValue={true}>
        <Switch />
      </Form.Item>
    </>
  );
}

export function DepartmentsPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const isAr = i18n.language === "ar";
  const { hasPermission } = useAuth();
  const { companyId: scopeCompanyId, branchId: scopeBranchId } = useScope();

  // Affichage filtré par entreprise (et branche) via la barre de scope
  const listParams: Record<string, string> = {};
  if (scopeCompanyId) listParams.companyId = scopeCompanyId;
  if (scopeBranchId) listParams.branchId = scopeBranchId;

  const { data, isPending } = useQuery({
    queryKey: ["departments", listParams],
    queryFn: () =>
      departmentsApi
        .list(Object.keys(listParams).length ? listParams : undefined)
        .then((r) => r.data as Department[]),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as NamedEntity[]),
    enabled: hasPermission("company.manage"),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchesApi.list().then((r) => r.data as NamedEntity[]),
  });

  async function onSave(values: Record<string, unknown>, id?: string) {
    if (id) await departmentsApi.update(id, values);
    else await departmentsApi.create(values);
    void qc.invalidateQueries({ queryKey: ["departments"] });
  }

  async function onDelete(id: string) {
    await departmentsApi.remove(id);
    void qc.invalidateQueries({ queryKey: ["departments"] });
  }

  const companyMap = Object.fromEntries(
    companies.map((c) => [c.id, bilingualName(c.nameAr, c.nameEn, isAr)]),
  );
  const branchMap = Object.fromEntries(
    branches.map((b) => [b.id, bilingualName(b.nameAr, b.nameEn, isAr)]),
  );

  return (
    <>
      <Title level={4}>{t("departments")}</Title>

      <ScopeFilterBar />

      <CrudTable<Department>
        data={data}
        isPending={isPending}
        onSave={onSave}
        onDelete={onDelete}
        columns={[
          {
            title: t("company"),
            dataIndex: "companyId",
            render: (v: string) => companyMap[v] ?? v?.substring(0, 8),
          },
          { title: t("branch"), dataIndex: "branchId", render: (v: string) => branchMap[v] ?? v },
          { title: t("nameAr"), dataIndex: "nameAr" },
          { title: t("nameEn"), dataIndex: "nameEn" },
          {
            title: t("active"),
            dataIndex: "active",
            render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "✓" : "✗"}</Tag>,
            width: 80,
          },
        ]}
        formContent={() => <DepartmentFormFields companies={companies} isAr={isAr} />}
      />
    </>
  );
}
