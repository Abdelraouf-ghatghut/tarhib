import { Form, Input, Select, Switch, Tag, Typography } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CrudTable } from "../../components/CrudTable";
import { departmentsApi, branchesApi } from "../../lib/api";

const { Title } = Typography;

interface Department {
  id: string;
  nameAr: string;
  nameEn: string;
  branchId: string;
  active: boolean;
}
interface Branch {
  id: string;
  nameAr: string;
  nameEn: string;
}

export function DepartmentsPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const isAr = i18n.language === "ar";

  const { data, isPending } = useQuery({
    queryKey: ["departments"],
    queryFn: () => departmentsApi.list().then((r) => r.data as Department[]),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchesApi.list().then((r) => r.data as Branch[]),
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

  const branchMap = Object.fromEntries(branches.map((b) => [b.id, isAr ? b.nameAr : b.nameEn]));

  return (
    <>
      <Title level={4}>{t("departments")}</Title>
      <CrudTable<Department>
        data={data}
        isPending={isPending}
        onSave={onSave}
        onDelete={onDelete}
        columns={[
          { title: t("nameAr"), dataIndex: "nameAr" },
          { title: t("nameEn"), dataIndex: "nameEn" },
          { title: t("branch"), dataIndex: "branchId", render: (v: string) => branchMap[v] ?? v },
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
            <Form.Item name="branchId" label={t("branch")} rules={[{ required: true }]}>
              <Select
                options={branches.map((b) => ({ value: b.id, label: isAr ? b.nameAr : b.nameEn }))}
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
