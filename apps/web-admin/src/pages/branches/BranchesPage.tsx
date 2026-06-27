import { Form, Input, Select, Switch, Tag, Typography } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CrudTable } from "../../components/CrudTable";
import { branchesApi, companiesApi } from "../../lib/api";

const { Title } = Typography;

interface Branch {
  id: string;
  nameAr: string;
  nameEn: string;
  companyId: string;
  active: boolean;
}
interface Company {
  id: string;
  nameAr: string;
  nameEn: string;
}

export function BranchesPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const isAr = i18n.language === "ar";

  const { data, isPending } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchesApi.list().then((r) => r.data as Branch[]),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as Company[]),
  });

  async function onSave(values: Record<string, unknown>, id?: string) {
    if (id) await branchesApi.update(id, values);
    else await branchesApi.create(values);
    void qc.invalidateQueries({ queryKey: ["branches"] });
  }

  async function onDelete(id: string) {
    await branchesApi.remove(id);
    void qc.invalidateQueries({ queryKey: ["branches"] });
  }

  const companyMap = Object.fromEntries(companies.map((c) => [c.id, isAr ? c.nameAr : c.nameEn]));

  return (
    <>
      <Title level={4}>{t("branches")}</Title>
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
            <Form.Item name="companyId" label={t("company")} rules={[{ required: true }]}>
              <Select
                options={companies.map((c) => ({ value: c.id, label: isAr ? c.nameAr : c.nameEn }))}
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
          </>
        )}
      />
    </>
  );
}
