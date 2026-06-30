import { useState } from "react";
import {
  Badge,
  Button,
  Checkbox,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { rolesApi, permissionsApi, companiesApi } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import { RoleQuotasModal } from "./RoleQuotasModal";

const { Title, Text } = Typography;

interface Permission {
  key: string;
  nameAr: string;
  nameEn: string;
  scope: string;
}

interface Role {
  id: string;
  companyId: string | null;
  nameAr: string;
  nameEn: string;
  scope: "TARHIB" | "CLIENT";
  slaPriority: string;
  isSystem: boolean;
  permissions: string[];
}

interface Company {
  id: string;
  nameAr: string;
  nameEn: string;
}

type ActiveTab = "tarhib" | "client";

export function RolesPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { isSuperadmin } = useAuth();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<ActiveTab>("tarhib");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const [quotaRole, setQuotaRole] = useState<Role | null>(null);
  const [form] = Form.useForm();

  const { data: roles, isPending } = useQuery({
    queryKey: ["roles"],
    queryFn: () => rolesApi.list().then((r) => r.data as Role[]),
  });

  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as Company[]),
    enabled: isSuperadmin,
  });

  const { data: permissions } = useQuery({
    queryKey: ["permissions"],
    queryFn: () => permissionsApi.list().then((r) => r.data as Permission[]),
    enabled: formOpen,
  });

  const tarhibRoles = (roles ?? []).filter((r) => r.scope === "TARHIB");
  const clientRoles = (roles ?? []).filter(
    (r) => r.scope === "CLIENT" && (!selectedCompanyId || r.companyId === selectedCompanyId),
  );

  const selectedCompany = companies?.find((c) => c.id === selectedCompanyId);
  const selectedCompanyName = selectedCompany
    ? isAr
      ? selectedCompany.nameAr
      : selectedCompany.nameEn
    : null;

  function openCreate() {
    setEditing(null);
    form.resetFields();
    setFormOpen(true);
  }

  function openEdit(role: Role) {
    setEditing(role);
    form.setFieldsValue({
      nameAr: role.nameAr,
      nameEn: role.nameEn,
      slaPriority: role.slaPriority,
      permissionKeys: role.permissions,
    });
    setFormOpen(true);
  }

  async function handleSave() {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload = {
        ...values,
        scope: activeTab === "tarhib" ? "TARHIB" : "CLIENT",
        companyId: activeTab === "client" ? selectedCompanyId : undefined,
        permissionKeys: (values.permissionKeys as string[] | undefined) ?? [],
      };
      if (editing) {
        await rolesApi.update(editing.id, payload);
      } else {
        await rolesApi.create(payload);
      }
      void qc.invalidateQueries({ queryKey: ["roles"] });
      setFormOpen(false);
      form.resetFields();
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) return;
      void message.error(String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await rolesApi.remove(id);
      void qc.invalidateQueries({ queryKey: ["roles"] });
    } catch (err) {
      void message.error(String(err));
    }
  }

  const permOptionsByGroup = permissions
    ? Object.entries(
        permissions.reduce<Record<string, Permission[]>>((acc, p) => {
          const group = p.key.split(".")[0];
          acc[group] = [...(acc[group] ?? []), p];
          return acc;
        }, {}),
      )
    : [];

  function roleColumns(tab: ActiveTab) {
    return [
      {
        title: isAr ? t("nameAr") : t("nameEn"),
        key: "name",
        render: (_: unknown, r: Role) => (isAr ? r.nameAr : r.nameEn),
      },
      ...(tab === "client"
        ? [
            {
              title: t("company"),
              key: "company",
              render: (_: unknown, r: Role) => {
                const co = companies?.find((c) => c.id === r.companyId);
                return co ? (
                  <Text strong>{isAr ? co.nameAr : co.nameEn}</Text>
                ) : (
                  <Text type="secondary">{"—"}</Text>
                );
              },
            },
          ]
        : []),
      {
        title: t("slaPriority"),
        dataIndex: "slaPriority",
        render: (p: string) => <Badge color="gold" text={p} />,
      },
      {
        title: t("systemRole"),
        dataIndex: "isSystem",
        render: (v: boolean) => (v ? <Tag color="red">{t("systemRole")}</Tag> : null),
      },
      {
        title: t("permissionsLabel"),
        key: "perms",
        render: (_: unknown, r: Role) => <Tag>{r.permissions.length}</Tag>,
      },
      {
        title: t("actions"),
        key: "_actions",
        width: 160,
        render: (_: unknown, r: Role) => (
          <Space>
            <Button
              size="small"
              icon={<EditOutlined />}
              disabled={r.isSystem}
              onClick={() => openEdit(r)}
            />
            <Popconfirm
              title={r.isSystem ? t("systemRoleCannotDelete") : t("deleteConfirm")}
              onConfirm={() => !r.isSystem && void handleDelete(r.id)}
              okText={t("confirm")}
              cancelText={t("cancel")}
              disabled={r.isSystem}
            >
              <Button size="small" danger icon={<DeleteOutlined />} disabled={r.isSystem} />
            </Popconfirm>
            <Button
              size="small"
              icon={<SettingOutlined />}
              onClick={() => setQuotaRole(r)}
              title={t("quotaPerRole")}
            />
          </Space>
        ),
      },
    ];
  }

  const tarhibTabLabel = (
    <span>
      {t("roleScopeTarhib")}
      <Tag color="blue" style={{ marginInlineStart: 6 }}>
        {tarhibRoles.length}
      </Tag>
    </span>
  );

  const clientTabLabel = (
    <span>
      {selectedCompanyName ? (
        <>
          {t("roleScopeClient")}
          {" — "}
          <Text strong style={{ color: "#fa8c16" }}>
            {selectedCompanyName}
          </Text>
        </>
      ) : (
        t("roleScopeClient")
      )}
      <Tag color="orange" style={{ marginInlineStart: 6 }}>
        {clientRoles.length}
      </Tag>
    </span>
  );

  const modalTitle = editing
    ? t("editRole")
    : activeTab === "tarhib"
      ? t("createTarhibRole")
      : selectedCompanyName
        ? t("createClientRoleFor", { company: selectedCompanyName })
        : t("createClientRole");

  return (
    <>
      <Title level={4}>{t("roles")}</Title>

      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as ActiveTab)}
        items={[
          {
            key: "tarhib",
            label: tarhibTabLabel,
            children: (
              <>
                <div style={{ marginBlockEnd: 16 }}>
                  {isSuperadmin && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                      {t("createTarhibRole")}
                    </Button>
                  )}
                </div>
                <Table<Role>
                  rowKey="id"
                  dataSource={tarhibRoles}
                  loading={isPending}
                  pagination={{ pageSize: 20 }}
                  size="middle"
                  scroll={{ x: true }}
                  columns={roleColumns("tarhib")}
                />
              </>
            ),
          },
          {
            key: "client",
            label: clientTabLabel,
            children: (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBlockEnd: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <Select
                    allowClear
                    showSearch
                    placeholder={t("filterByCompany")}
                    style={{ minWidth: 220 }}
                    value={selectedCompanyId ?? undefined}
                    onChange={(v: string | undefined) => setSelectedCompanyId(v ?? null)}
                    filterOption={(input, opt) =>
                      String(opt?.label ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    options={(companies ?? []).map((c) => ({
                      value: c.id,
                      label: isAr ? c.nameAr : c.nameEn,
                    }))}
                  />
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={openCreate}
                    disabled={!selectedCompanyId}
                    title={!selectedCompanyId ? t("selectCompanyFirst") : undefined}
                  >
                    {selectedCompanyName
                      ? t("createClientRoleFor", { company: selectedCompanyName })
                      : t("createClientRole")}
                  </Button>
                </div>
                {!selectedCompanyId && (
                  <Text type="secondary" style={{ display: "block", marginBlockEnd: 12 }}>
                    {t("selectCompanyToSeeRoles")}
                  </Text>
                )}
                <Table<Role>
                  rowKey="id"
                  dataSource={clientRoles}
                  loading={isPending}
                  pagination={{ pageSize: 20 }}
                  size="middle"
                  scroll={{ x: true }}
                  columns={roleColumns("client")}
                />
              </>
            ),
          },
        ]}
      />

      <Modal
        open={formOpen}
        title={modalTitle}
        onOk={handleSave}
        onCancel={() => {
          setFormOpen(false);
          form.resetFields();
        }}
        confirmLoading={saving}
        okText={t("save")}
        cancelText={t("cancel")}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginBlockStart: 16 }}>
          <Form.Item name="nameAr" label={t("roleNameAr")} rules={[{ required: true }]}>
            <Input dir="rtl" />
          </Form.Item>
          <Form.Item name="nameEn" label={t("roleNameEn")} rules={[{ required: true }]}>
            <Input dir="ltr" />
          </Form.Item>
          <Form.Item name="slaPriority" label={t("slaPriority")} rules={[{ required: true }]}>
            <Select options={["P1", "P2", "P3", "P4", "P5"].map((v) => ({ value: v, label: v }))} />
          </Form.Item>

          {activeTab === "tarhib" && (
            <Form.Item name="permissionKeys" label={t("permissionsLabel")}>
              <Checkbox.Group style={{ width: "100%" }}>
                {permOptionsByGroup.map(([group, perms]) => (
                  <div key={group} style={{ marginBlockEnd: 8 }}>
                    <strong style={{ textTransform: "capitalize" }}>{group}</strong>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBlockStart: 4 }}>
                      {perms.map((p) => (
                        <Checkbox key={p.key} value={p.key}>
                          {isAr ? p.nameAr : p.nameEn}
                        </Checkbox>
                      ))}
                    </div>
                  </div>
                ))}
              </Checkbox.Group>
            </Form.Item>
          )}
        </Form>
      </Modal>

      {quotaRole && (
        <RoleQuotasModal
          roleId={quotaRole.id}
          roleName={isAr ? quotaRole.nameAr : quotaRole.nameEn}
          open={!!quotaRole}
          onClose={() => setQuotaRole(null)}
        />
      )}
    </>
  );
}
