import { useState } from "react";
import {
  Button,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import { StopOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CrudTable } from "../../components/CrudTable";
import { employeesApi, companiesApi, branchesApi, departmentsApi, rolesApi } from "../../lib/api";

const { Title } = Typography;

interface DynamicRole {
  id: string;
  nameAr: string;
  nameEn: string;
}

interface Employee {
  id: string;
  firstNameAr: string;
  firstNameEn: string;
  lastNameAr: string;
  lastNameEn: string;
  email: string;
  phoneNumber: string;
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

  const [filterRoleId, setFilterRoleId] = useState<string | undefined>();
  const [filterDept, setFilterDept] = useState<string | undefined>();
  const [filterActive, setFilterActive] = useState<boolean | undefined>();

  const queryParams: Record<string, string> = {};
  if (filterRoleId) queryParams.roleId = filterRoleId;
  if (filterDept) queryParams.departmentId = filterDept;
  if (filterActive !== undefined) queryParams.active = String(filterActive);

  const { data, isPending } = useQuery({
    queryKey: ["employees", queryParams],
    queryFn: () => employeesApi.list(queryParams).then((r) => r.data as Employee[]),
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

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: () => rolesApi.list().then((r) => r.data as DynamicRole[]),
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

  async function onDeactivate(id: string) {
    try {
      await employeesApi.deactivate(id);
      void qc.invalidateQueries({ queryKey: ["employees"] });
    } catch (err) {
      void message.error(String(err));
    }
  }

  const label = (e: NamedEntity) => (isAr ? e.nameAr : e.nameEn);
  const fullName = (e: Employee) =>
    isAr ? `${e.firstNameAr} ${e.lastNameAr}` : `${e.firstNameEn} ${e.lastNameEn}`;

  return (
    <>
      <Title level={4}>{t("employees")}</Title>

      <Space wrap style={{ marginBlockEnd: 16 }}>
        <Select
          allowClear
          placeholder={t("role")}
          style={{ width: 220 }}
          options={roles.map((r) => ({
            value: r.id,
            label: isAr ? r.nameAr : r.nameEn,
          }))}
          value={filterRoleId}
          onChange={setFilterRoleId}
        />
        <Select
          allowClear
          placeholder={t("department")}
          style={{ width: 220 }}
          options={departments.map((d) => ({ value: d.id, label: label(d) }))}
          value={filterDept}
          onChange={setFilterDept}
        />
        <Space size="small">
          <span style={{ fontSize: 14 }}>{t("active")}</span>
          <Switch
            checked={filterActive === true}
            onChange={(checked) => setFilterActive(checked ? true : undefined)}
          />
        </Space>
      </Space>

      <CrudTable<Employee>
        data={data}
        isPending={isPending}
        onSave={onSave}
        onDelete={onDelete}
        extraActions={(rec) => (
          <Popconfirm
            title={t("deactivateConfirm")}
            onConfirm={() => {
              void onDeactivate(rec.id);
            }}
            okText={t("confirm")}
            cancelText={t("cancel")}
            disabled={!rec.active}
          >
            <Button
              size="small"
              danger
              icon={<StopOutlined />}
              disabled={!rec.active}
              title={t("deactivate")}
            />
          </Popconfirm>
        )}
        columns={[
          {
            title: t("name"),
            key: "name",
            render: (_: unknown, rec: Employee) => fullName(rec),
          },
          { title: t("email"), dataIndex: "email" },
          { title: t("phone"), dataIndex: "phoneNumber" },
          {
            title: t("role"),
            key: "role",
            render: (_: unknown, rec: Employee) => {
              const r = roles.find((x) => x.id === rec.role);
              return <Tag>{r ? (isAr ? r.nameAr : r.nameEn) : rec.role}</Tag>;
            },
          },
          {
            title: t("active"),
            dataIndex: "active",
            render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "✓" : "✗"}</Tag>,
            width: 80,
          },
        ]}
        formContent={(rec) => (
          <>
            <Form.Item name="firstNameAr" label={t("firstNameAr")} rules={[{ required: true }]}>
              <Input dir="rtl" />
            </Form.Item>
            <Form.Item name="lastNameAr" label={t("lastNameAr")} rules={[{ required: true }]}>
              <Input dir="rtl" />
            </Form.Item>
            <Form.Item name="firstNameEn" label={t("firstNameEn")} rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="lastNameEn" label={t("lastNameEn")} rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="email" label={t("email")} rules={[{ required: true, type: "email" }]}>
              <Input />
            </Form.Item>
            <Form.Item
              name="phoneNumber"
              label={t("phone")}
              rules={[{ required: true, pattern: /^\+[1-9]\d{7,14}$/, message: t("phoneFormat") }]}
            >
              <Input placeholder="+213555000000" />
            </Form.Item>
            {!rec && (
              <Form.Item name="password" label={t("password")} rules={[{ required: true, min: 8 }]}>
                <Input.Password />
              </Form.Item>
            )}
            <Form.Item name="roleId" label={t("role")} rules={[{ required: true }]}>
              <Select
                showSearch
                optionFilterProp="label"
                options={roles.map((r) => ({
                  value: r.id,
                  label: isAr ? r.nameAr : r.nameEn,
                }))}
              />
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
