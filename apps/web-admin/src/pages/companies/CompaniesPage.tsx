import { Form, Input, Switch, Tag, Typography } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CrudTable } from "../../components/CrudTable";
import { companiesApi } from "../../lib/api";

const { Title } = Typography;

interface Company {
  id: string;
  nameAr: string;
  nameEn: string;
  active: boolean;
}

export function CompaniesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as Company[]),
  });

  async function onSave(values: Record<string, unknown>, id?: string) {
    if (id) {
      await companiesApi.update(id, values);
    } else {
      await companiesApi.create(values);
    }
    void qc.invalidateQueries({ queryKey: ["companies"] });
  }

  async function onDelete(id: string) {
    await companiesApi.remove(id);
    void qc.invalidateQueries({ queryKey: ["companies"] });
  }

  return (
    <>
      <Title level={4}>{t("companies")}</Title>
      <CrudTable<Company>
        data={data}
        isPending={isPending}
        onSave={onSave}
        onDelete={onDelete}
        columns={[
          { title: t("nameAr"), dataIndex: "nameAr" },
          { title: t("nameEn"), dataIndex: "nameEn" },
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
