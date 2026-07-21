import { useRef, useState } from "react";
import {
  Button,
  Col,
  Descriptions,
  Drawer,
  App,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import { PlusOutlined, StopOutlined, SwapOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { CrudTable } from "../../components/CrudTable";
import type { CrudTableHandle } from "../../components/CrudTable";
import { ScopeFilterBar } from "../../components/ScopeFilterBar";
import { FilterBar } from "../../components/FilterBar";
import { useScope } from "../../contexts/ScopeContext";
import { useAuth } from "../../hooks/useAuth";
import {
  employeesApi,
  employeesAdminApi,
  companiesApi,
  branchesApi,
  departmentsApi,
  rolesApi,
} from "../../lib/api";
import { getErrorMessage } from "../../lib/errors";
import { bilingualName } from "../../lib/bilingualName";

const { Title } = Typography;

type EmployeeScope = "TARHIB" | "CLIENT";

interface DynamicRole {
  id: string;
  nameAr: string;
  nameEn: string;
  scope: EmployeeScope;
  companyId: string | null;
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
  roleId: string | null;
  additionalRoleIds: string[];
  scope: EmployeeScope | null;
  // Site d'affectation — null pour un interne non affecté (ex. superadmin)
  companyId: string | null;
  branchId: string | null;
  departmentId: string | null;
  // Emplacement dans le site (employés clients)
  floor: string | null;
  officeNumber: string | null;
  active: boolean;
  // Présent uniquement via /employees/admin (employee.salary.manage)
  salary?: number | null;
  hireDate?: string | null;
}

interface NamedEntity {
  id: string;
  nameAr: string;
  nameEn: string;
  companyId?: string;
}

/**
 * Champs du formulaire employé, en cascade depuis la société choisie :
 * - interne : société → فرع (pas de قسم), affectation optionnelle
 * - client : société → فرع → قسم (obligatoires) et rôles limités aux rôles
 *   CLIENT de la société sélectionnée
 */
function EmployeeFormFields({
  isClientPage,
  isNew,
  companies,
  allRoles,
  isAr,
  canManageSalary,
}: {
  isClientPage: boolean;
  isNew: boolean;
  companies: NamedEntity[];
  allRoles: DynamicRole[];
  isAr: boolean;
  canManageSalary: boolean;
}) {
  const { t } = useTranslation();
  const form = Form.useFormInstance();
  const companyId = Form.useWatch("companyId", form) as string | undefined;
  const branchId = Form.useWatch("branchId", form) as string | undefined;
  const roleId = Form.useWatch("roleId", form) as string | undefined;

  const label = (e: NamedEntity) => bilingualName(e.nameAr, e.nameEn, isAr);

  const { data: companyBranches = [] } = useQuery({
    queryKey: ["branches", companyId],
    queryFn: () => branchesApi.list(companyId).then((r) => r.data as NamedEntity[]),
    enabled: !!companyId,
  });

  const { data: branchDepartments = [] } = useQuery({
    queryKey: ["departments", { branchId }],
    queryFn: () =>
      departmentsApi.list({ branchId: branchId as string }).then((r) => r.data as NamedEntity[]),
    enabled: isClientPage && !!branchId,
  });

  // Rôles proposés : scope de la page + société du formulaire (client)
  const roleOptions = allRoles.filter((r) =>
    isClientPage
      ? r.scope === "CLIENT" && (!r.companyId || r.companyId === companyId)
      : r.scope === "TARHIB",
  );

  return (
    <>
      <Form.Item name="firstNameAr" label={t("firstNameAr")} rules={[{ required: true }]}>
        <Input dir="rtl" />
      </Form.Item>
      <Form.Item name="lastNameAr" label={t("lastNameAr")} rules={[{ required: true }]}>
        <Input dir="rtl" />
      </Form.Item>
      <Form.Item name="firstNameEn" label={t("firstNameEnOptional")}>
        <Input />
      </Form.Item>
      <Form.Item name="lastNameEn" label={t("lastNameEnOptional")}>
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
        <Input dir="ltr" placeholder="+218912345678" />
      </Form.Item>
      {isNew && (
        <Form.Item name="password" label={t("password")} rules={[{ required: true, min: 8 }]}>
          <Input.Password />
        </Form.Item>
      )}

      <Form.Item
        name="companyId"
        label={isClientPage ? t("company") : t("assignmentSite")}
        rules={[{ required: isClientPage }]}
      >
        <Select
          allowClear={!isClientPage}
          showSearch
          optionFilterProp="label"
          options={companies.map((c) => ({ value: c.id, label: label(c) }))}
          onChange={() => {
            // La branche, le département et le rôle dépendent de la société
            form.setFieldValue("branchId", undefined);
            form.setFieldValue("departmentId", undefined);
            if (isClientPage) form.setFieldValue("roleId", undefined);
            form.setFieldValue("additionalRoleIds", []);
          }}
        />
      </Form.Item>
      <Form.Item name="branchId" label={t("branch")} rules={[{ required: isClientPage }]}>
        <Select
          allowClear={!isClientPage}
          showSearch
          optionFilterProp="label"
          disabled={!companyId}
          placeholder={!companyId ? t("noCompanySelected") : undefined}
          options={companyBranches.map((b) => ({ value: b.id, label: label(b) }))}
          onChange={() => {
            form.setFieldValue("departmentId", undefined);
          }}
        />
      </Form.Item>
      {/* Le قسم et l'emplacement physique ne concernent que les employés clients */}
      {isClientPage && (
        <>
          <Form.Item name="departmentId" label={t("department")} rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              disabled={!branchId}
              options={branchDepartments.map((d) => ({ value: d.id, label: label(d) }))}
            />
          </Form.Item>
          <Form.Item name="floor" label={t("floor")}>
            <Input />
          </Form.Item>
          <Form.Item name="officeNumber" label={t("officeNumber")}>
            <Input />
          </Form.Item>
        </>
      )}

      {/* Le salaire est réservé au personnel interne et à employee.salary.manage */}
      {!isClientPage && canManageSalary && (
        <Form.Item name="salary" label={t("salary")}>
          <InputNumber style={{ width: "100%" }} min={0} step={50} />
        </Form.Item>
      )}

      {/* Prise de fonction : personnel interne uniquement — sert de point de
          départ à la génération de paie mensuelle proratisée. */}
      {!isClientPage && (
        <Form.Item name="hireDate" label={t("hireDate")}>
          <Input type="date" />
        </Form.Item>
      )}

      <Form.Item name="roleId" label={t("roleLabel")} rules={[{ required: true }]}>
        <Select
          showSearch
          optionFilterProp="label"
          disabled={isClientPage && !companyId}
          placeholder={isClientPage && !companyId ? t("noCompanySelected") : undefined}
          onChange={(value: string) => {
            const current = (form.getFieldValue("additionalRoleIds") as string[] | undefined) ?? [];
            form.setFieldValue(
              "additionalRoleIds",
              current.filter((id) => id !== value),
            );
          }}
          options={roleOptions.map((r) => ({
            value: r.id,
            label: bilingualName(r.nameAr, r.nameEn, isAr),
          }))}
        />
      </Form.Item>

      <Form.Item name="additionalRoleIds" label={t("additionalRoles")} initialValue={[]}>
        <Select
          mode="multiple"
          allowClear
          showSearch
          optionFilterProp="label"
          disabled={isClientPage && !companyId}
          placeholder={isClientPage && !companyId ? t("noCompanySelected") : undefined}
          options={roleOptions
            .filter((r) => r.id !== roleId)
            .map((r) => ({
              value: r.id,
              label: bilingualName(r.nameAr, r.nameEn, isAr),
            }))}
        />
      </Form.Item>

      <Form.Item name="active" label={t("active")} valuePropName="checked" initialValue={true}>
        <Switch />
      </Form.Item>
    </>
  );
}

export function EmployeesPage({ scope }: { scope: EmployeeScope }) {
  const { t, i18n } = useTranslation();
  const { modal } = App.useApp();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { hasPermission, email: myEmail, impersonation, startEmployeeImpersonation } = useAuth();
  const isAr = i18n.language === "ar";
  const isClientPage = scope === "CLIENT";
  // Le salaire n'a de sens que pour le personnel interne, et reste réservé
  // à employee.salary.manage même sur cette page (voir EmployeesController).
  const canManageSalary = !isClientPage && hasPermission("employee.salary.manage");
  // Le web admin est un outil interne (AuthContext.login() rejette tout
  // employé CLIENT) : impersonner un employé n'a de sens que sur l'onglet
  // interne. Prévisualiser un rôle client se fait via RolesPage (mode "rôle").
  const canImpersonate = !isClientPage && hasPermission("employee.impersonate") && !impersonation;
  const crudRef = useRef<CrudTableHandle>(null);
  const { companyId: scopeCompanyId, branchId: scopeBranchId } = useScope();

  const [filterRoleId, setFilterRoleId] = useState<string | undefined>();
  const [filterDept, setFilterDept] = useState<string | undefined>();
  const [filterActive, setFilterActive] = useState<boolean | undefined>();
  // Lieu d'affectation (interne uniquement) : la ScopeFilterBar globale ne
  // s'applique qu'à la page employés clients, le personnel interne a son
  // propre tiroir de filtre détaillé.
  const [filterCompanyId, setFilterCompanyId] = useState<string | undefined>();
  const [filterBranchId, setFilterBranchId] = useState<string | undefined>();
  const [selected, setSelected] = useState<Employee | null>(null);

  const queryParams: Record<string, string> = {};
  if (filterRoleId) queryParams.roleId = filterRoleId;
  if (filterDept) queryParams.departmentId = filterDept;
  if (filterActive !== undefined) queryParams.active = String(filterActive);
  if (isClientPage && scopeCompanyId) queryParams.companyId = scopeCompanyId;
  if (isClientPage && scopeBranchId) queryParams.branchId = scopeBranchId;
  if (!isClientPage && filterCompanyId) queryParams.companyId = filterCompanyId;
  if (!isClientPage && filterBranchId) queryParams.branchId = filterBranchId;

  const { data: allEmployees, isPending } = useQuery({
    queryKey: ["employees", queryParams, canManageSalary],
    queryFn: () =>
      (canManageSalary ? employeesAdminApi.list(queryParams) : employeesApi.list(queryParams)).then(
        (r) => r.data as Employee[],
      ),
  });

  // Séparation client / interne : le scope de l'employé (défaut CLIENT)
  const data = (allEmployees ?? []).filter((e) => (e.scope ?? "CLIENT") === scope);

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

  const { data: allRoles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: () => rolesApi.list().then((r) => r.data as DynamicRole[]),
  });

  // Seuls les rôles du bon scope sont proposés (interne ⇄ client)
  const roles = allRoles.filter(
    (r) =>
      r.scope === scope &&
      (!isClientPage || !scopeCompanyId || !r.companyId || r.companyId === scopeCompanyId),
  );

  async function onSave(values: Record<string, unknown>, id?: string) {
    // Le scope est porté par la page (interne/client), pas par le formulaire
    // (CrudTable a déjà converti les champs vidés en null explicite).
    const payload: Record<string, unknown> = { ...values, scope };
    if (id) await employeesApi.update(id, payload);
    else await employeesApi.create(payload);
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
      void message.error(getErrorMessage(err, t));
    }
  }

  const label = (e: NamedEntity) => bilingualName(e.nameAr, e.nameEn, isAr);
  const fullName = (e: Employee) =>
    isAr ? `${e.firstNameAr} ${e.lastNameAr}` : `${e.firstNameEn} ${e.lastNameEn}`;
  const roleLabel = (rec: Employee) => {
    const r = allRoles.find((x) => x.id === (rec.roleId ?? rec.role));
    return r ? bilingualName(r.nameAr, r.nameEn, isAr) : (rec.role ?? "—");
  };
  const roleName = (id?: string | null) => {
    if (!id) return null;
    const r = allRoles.find((x) => x.id === id);
    return r ? bilingualName(r.nameAr, r.nameEn, isAr) : id.substring(0, 8);
  };
  const roleTags = (rec: Employee) => (
    <Space size={[4, 4]} wrap>
      <Tag color="blue">{roleLabel(rec)}</Tag>
      {(rec.additionalRoleIds ?? []).map((id) => (
        <Tag key={id}>{roleName(id)}</Tag>
      ))}
    </Space>
  );
  const departmentName = (id: string | null) => {
    if (!id) return null;
    const d = departments.find((x) => x.id === id);
    return d ? label(d) : id.substring(0, 8);
  };
  const branchName = (id: string | null) => {
    if (!id) return null;
    const b = branches.find((x) => x.id === id);
    return b ? label(b) : id.substring(0, 8);
  };
  const companyName = (id: string | null) => {
    if (!id) return null;
    const c = companies.find((x) => x.id === id);
    return c ? label(c) : id.substring(0, 8);
  };

  return (
    <>
      <Row justify="space-between" align="middle" style={{ marginBlockEnd: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            {isClientPage ? t("employeesClient") : t("employeesInternal")}
          </Title>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => crudRef.current?.openCreate()}
          >
            {t("add")}
          </Button>
        </Col>
      </Row>

      {isClientPage && <ScopeFilterBar />}

      <Space wrap style={{ marginBlockEnd: 16 }}>
        <Select
          allowClear
          placeholder={t("role")}
          style={{ width: 220 }}
          options={roles.map((r) => ({
            value: r.id,
            label: bilingualName(r.nameAr, r.nameEn, isAr),
          }))}
          value={filterRoleId}
          onChange={setFilterRoleId}
        />
        {/* Le filtre قسم n'a de sens que pour les employés clients */}
        {isClientPage && (
          <Select
            allowClear
            placeholder={t("department")}
            style={{ width: 220 }}
            options={departments.map((d) => ({ value: d.id, label: label(d) }))}
            value={filterDept}
            onChange={setFilterDept}
          />
        )}
        <Space size="small">
          <span style={{ fontSize: 14 }}>{t("active")}</span>
          <Switch
            checked={filterActive === true}
            onChange={(checked) => setFilterActive(checked ? true : undefined)}
          />
        </Space>
      </Space>

      {/* Filtre détaillé (lieu d'affectation) pour le personnel interne,
          ouvert dans un tiroir à droite — même pattern que la fiche rôle */}
      {!isClientPage && (
        <FilterBar
          activeAdvancedCount={(filterCompanyId ? 1 : 0) + (filterBranchId ? 1 : 0)}
          onClearAll={() => {
            setFilterCompanyId(undefined);
            setFilterBranchId(undefined);
          }}
          advanced={
            <>
              <div>
                <div style={{ marginBlockEnd: 6, fontSize: 13, color: "var(--fg-body-subtle)" }}>
                  {t("company")}
                </div>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  style={{ width: "100%" }}
                  placeholder={t("allCompanies")}
                  value={filterCompanyId}
                  onChange={(v: string | undefined) => {
                    setFilterCompanyId(v);
                    setFilterBranchId(undefined);
                  }}
                  options={companies.map((c) => ({ value: c.id, label: label(c) }))}
                />
              </div>
              <div>
                <div style={{ marginBlockEnd: 6, fontSize: 13, color: "var(--fg-body-subtle)" }}>
                  {t("branch")}
                </div>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  style={{ width: "100%" }}
                  placeholder={t("allBranches")}
                  disabled={!filterCompanyId}
                  value={filterBranchId}
                  onChange={setFilterBranchId}
                  options={branches
                    .filter((b) => b.companyId === filterCompanyId)
                    .map((b) => ({ value: b.id, label: label(b) }))}
                />
              </div>
            </>
          }
        />
      )}

      <CrudTable<Employee>
        ref={crudRef}
        hideAddButton
        data={data}
        isPending={isPending}
        onSave={onSave}
        onDelete={onDelete}
        onRow={(rec) => ({ onClick: () => setSelected(rec), style: { cursor: "pointer" } })}
        extraActions={(rec) => (
          <Space size={4}>
            {canImpersonate && rec.email !== myEmail && (
              <Button
                size="small"
                icon={<SwapOutlined />}
                title={t("impersonate")}
                onClick={() =>
                  modal.confirm({
                    title: t("impersonateConfirm", { name: fullName(rec) }),
                    okText: t("confirm"),
                    cancelText: t("cancel"),
                    onOk: async () => {
                      try {
                        await startEmployeeImpersonation(rec.id, fullName(rec));
                        void message.success(t("impersonationStarted", { name: fullName(rec) }));
                        navigate("/");
                      } catch (err) {
                        void message.error(getErrorMessage(err, t));
                      }
                    },
                  })
                }
              />
            )}
            <Button
              size="small"
              danger
              icon={<StopOutlined />}
              disabled={!rec.active}
              title={t("deactivate")}
              onClick={() =>
                modal.confirm({
                  title: t("deactivateConfirm"),
                  okText: t("confirm"),
                  cancelText: t("cancel"),
                  okButtonProps: { danger: true },
                  onOk: () => onDeactivate(rec.id),
                })
              }
            />
          </Space>
        )}
        columns={[
          {
            title: t("name"),
            key: "name",
            sorter: (a: Employee, b: Employee) => fullName(a).localeCompare(fullName(b)),
            render: (_: unknown, rec: Employee) => fullName(rec),
          },
          { title: t("email"), dataIndex: "email", width: 220, ellipsis: true },
          {
            title: t("phone"),
            dataIndex: "phoneNumber",
            width: 160,
            render: (v: string) => <span dir="ltr">{v}</span>,
          },
          {
            title: t("role"),
            key: "role",
            width: 220,
            render: (_: unknown, rec: Employee) => roleTags(rec),
          },
          // Interne : où l'employé est dispatché en mission
          ...(!isClientPage
            ? [
                {
                  title: t("assignmentSite"),
                  key: "site",
                  sorter: (a: Employee, b: Employee) => {
                    const nameOf = (rec: Employee) => {
                      const company = companies.find((c) => c.id === rec.companyId);
                      return company ? label(company) : "";
                    };
                    return nameOf(a).localeCompare(nameOf(b));
                  },
                  render: (_: unknown, rec: Employee) => {
                    if (!rec.companyId) return <Tag>{t("unassigned")}</Tag>;
                    const company = companies.find((c) => c.id === rec.companyId);
                    const branch = branches.find((b) => b.id === rec.branchId);
                    const parts = [company && label(company), branch && label(branch)].filter(
                      Boolean,
                    );
                    return parts.length ? parts.join(" — ") : rec.companyId.substring(0, 8);
                  },
                },
              ]
            : []),
          // Client : emplacement physique (étage + bureau)
          ...(isClientPage
            ? [
                {
                  title: t("location"),
                  key: "location",
                  width: 160,
                  render: (_: unknown, rec: Employee) =>
                    rec.floor || rec.officeNumber
                      ? [rec.floor, rec.officeNumber].filter(Boolean).join(" — ")
                      : "—",
                },
              ]
            : []),
          // Interne + employee.salary.manage uniquement
          ...(canManageSalary
            ? [
                {
                  title: t("salary"),
                  dataIndex: "salary",
                  width: 140,
                  sorter: (a: Employee, b: Employee) => (a.salary ?? -1) - (b.salary ?? -1),
                  render: (v: number | null | undefined) =>
                    v != null
                      ? `${v.toLocaleString(isAr ? "ar" : "en")} ${t("currencyUnit")}`
                      : "—",
                },
                {
                  title: t("hireDate"),
                  dataIndex: "hireDate",
                  width: 200,
                  sorter: (a: Employee, b: Employee) =>
                    (a.hireDate ?? "").localeCompare(b.hireDate ?? ""),
                  render: (v: string | null | undefined) =>
                    v ? dayjs(v).format("DD/MM/YYYY") : "—",
                },
              ]
            : []),
          {
            title: t("active"),
            dataIndex: "active",
            width: 90,
            render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "✓" : "✗"}</Tag>,
          },
        ]}
        formContent={(rec) => (
          <EmployeeFormFields
            isClientPage={isClientPage}
            isNew={!rec}
            companies={companies}
            allRoles={allRoles}
            isAr={isAr}
            canManageSalary={canManageSalary}
          />
        )}
      />

      <Drawer
        title={selected ? fullName(selected) : ""}
        open={!!selected}
        onClose={() => setSelected(null)}
        width={420}
      >
        {selected && (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label={t("email")}>{selected.email}</Descriptions.Item>
            <Descriptions.Item label={t("phone")}>
              <span dir="ltr">{selected.phoneNumber}</span>
            </Descriptions.Item>
            <Descriptions.Item label={t("role")}>
              <Tag color="blue">{roleLabel(selected)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t("additionalRoles")}>
              {selected.additionalRoleIds?.length ? (
                <Space size={[4, 4]} wrap>
                  {selected.additionalRoleIds.map((id) => (
                    <Tag key={id}>{roleName(id)}</Tag>
                  ))}
                </Space>
              ) : (
                "-"
              )}
            </Descriptions.Item>
            {isClientPage ? (
              <>
                <Descriptions.Item label={t("branch")}>
                  {branchName(selected.branchId) ?? "—"}
                </Descriptions.Item>
                <Descriptions.Item label={t("department")}>
                  {departmentName(selected.departmentId) ?? "—"}
                </Descriptions.Item>
                <Descriptions.Item label={t("floor")}>{selected.floor ?? "—"}</Descriptions.Item>
                <Descriptions.Item label={t("officeNumber")}>
                  {selected.officeNumber ?? "—"}
                </Descriptions.Item>
              </>
            ) : (
              <>
                <Descriptions.Item label={t("assignmentSite")}>
                  {selected.companyId ? (
                    [companyName(selected.companyId), branchName(selected.branchId)]
                      .filter(Boolean)
                      .join(" — ")
                  ) : (
                    <Tag>{t("unassigned")}</Tag>
                  )}
                </Descriptions.Item>
                {canManageSalary && (
                  <Descriptions.Item label={t("salary")}>
                    {selected.salary != null
                      ? `${selected.salary.toLocaleString(isAr ? "ar" : "en")} ${t("currencyUnit")}`
                      : "—"}
                  </Descriptions.Item>
                )}
                {canManageSalary && (
                  <Descriptions.Item label={t("hireDate")}>
                    {selected.hireDate ? dayjs(selected.hireDate).format("DD/MM/YYYY") : "—"}
                  </Descriptions.Item>
                )}
              </>
            )}
            <Descriptions.Item label={t("active")}>
              <Tag color={selected.active ? "green" : "default"}>{selected.active ? "✓" : "✗"}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </>
  );
}
