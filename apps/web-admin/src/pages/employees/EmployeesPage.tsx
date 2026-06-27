import { Form, Input, Select, Switch, Tag, Typography } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CrudTable } from "../../components/CrudTable";
import { employeesApi, companiesApi, branchesApi, departmentsApi } from "../../lib/api";

const { Title } = Typography;

const ROLES = ["ADMIN", "DEPARTMENT_MANAGER", "INVENTORY_MANAGER", "HOSPITALITY_AGENT", "EMPLOYEE"];

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  companyId: string;
  branchId: string;
  departmentId: string;
  active: boolean;
}

interface NamedEntity {
  id: string;
  nameAr: string;
  nameEn: string;
}

export function EmployeesPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const isAr = i18n.language === "ar";

  const { data, isPending } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeesApi.list().then((r) => r.data as Employee[]),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as NamedEntity[]),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchesApi.list().then((r) => r.data as NamedEntity[]),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: () => departmentsApi.list().then((r) => r.data as NamedEntity[]),
  });

  async function onSave(values: Record<string, unknown>, id?: string) {
    if (id) await employeesApi.update(id, values);
    else await employeesApi.create(values);
    void qc.invalidateQueries({ queryKey: ["employees"] });
  }

  async function onDelete(id: string) {
    await employeesApi.remove(id);
    void qc.invalidateQueries({ queryKey: ["employees"] });
  }

  const label = (e: NamedEntity) => (isAr ? e.nameAr : e.nameEn);

  return (
    <>
      <Title level={4}>{t("employees")}</Title>
      <CrudTable<Employee>
        data={data}
        isPending={isPending}
        onSave={onSave}
        onDelete={onDelete}
        columns={[
          { title: t("firstName"), dataIndex: "firstName" },
          { title: t("lastName"), dataIndex: "lastName" },
          { title: t("email"), dataIndex: "email" },
          { title: t("role"), dataIndex: "role", render: (v: string) => <Tag>{v}</Tag> },
          {
            title: t("active"),
            dataIndex: "active",
            render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "✓" : "✗"}</Tag>,
            width: 80,
          },
        ]}
        formContent={(rec) => (
          <>
            <Form.Item name="firstName" label={t("firstName")} rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="lastName" label={t("lastName")} rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="email" label={t("email")} rules={[{ required: true, type: "email" }]}>
              <Input />
            </Form.Item>
            {!rec && (
              <Form.Item name="password" label={t("password")} rules={[{ required: true, min: 8 }]}>
                <Input.Password />
              </Form.Item>
            )}
            <Form.Item name="role" label={t("role")} rules={[{ required: true }]}>
              <Select options={ROLES.map((r) => ({ value: r, label: r }))} />
            </Form.Item>
            <Form.Item name="companyId" label={t("company")} rules={[{ required: true }]}>
              <Select options={companies.map((c) => ({ value: c.id, label: label(c) }))} />
            </Form.Item>
            <Form.Item name="branchId" label={t("branch")} rules={[{ required: true }]}>
              <Select options={branches.map((b) => ({ value: b.id, label: label(b) }))} />
            </Form.Item>
            <Form.Item name="departmentId" label={t("department")} rules={[{ required: true }]}>
              <Select options={departments.map((d) => ({ value: d.id, label: label(d) }))} />
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
