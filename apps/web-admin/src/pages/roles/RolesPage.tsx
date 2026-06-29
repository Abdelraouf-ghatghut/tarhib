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
  Tag,
  Typography,
  message,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { rolesApi, permissionsApi } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import { RoleQuotasModal } from "./RoleQuotasModal";

const { Title } = Typography;

interface Permission {
  key: string;
  nameAr: string;
  nameEn: string;
  scope: string;
}

interface Role {
  id: string;
  nameAr: string;
  nameEn: string;
  scope: "TARHIB" | "CLIENT";
  slaPriority: string;
  isSystem: boolean;
  permissions: Permission[];
}

export function RolesPage() {
  const { t, i18n } = useTranslation();
  const { isSuperadmin } = useAuth();
  const qc = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const [quotaRole, setQuotaRole] = useState<Role | null>(null);
  const [form] = Form.useForm();

  const { data: roles, isPending } = useQuery({
    queryKey: ["roles"],
    queryFn: () => rolesApi.list().then((r) => r.data as Role[]),
  });

  const { data: permissions } = useQuery({
    queryKey: ["permissions"],
    queryFn: () => permissionsApi.list().then((r) => r.data as Permission[]),
    enabled: formOpen,
  });

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
      scope: role.scope,
      slaPriority: role.slaPriority,
      permissionKeys: role.permissions.map((p) => p.key),
    });
    setFormOpen(true);
  }

  async function handleSave() {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editing) {
        await rolesApi.update(editing.id, values);
      } else {
        await rolesApi.create(values);
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

  return (
    <>
      <Title level={4}>{t("roles")}</Title>

      <div style={{ marginBlockEnd: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t("createRole")}
        </Button>
      </div>

      <Table<Role>
        rowKey="id"
        dataSource={roles}
        loading={isPending}
        pagination={{ pageSize: 20 }}
        size="middle"
        scroll={{ x: true }}
        columns={[
          {
            title: i18n.language === "ar" ? t("nameAr") : t("nameEn"),
            key: "name",
            render: (_, r) => (i18n.language === "ar" ? r.nameAr : r.nameEn),
          },
          {
            title: t("roleScope"),
            dataIndex: "scope",
            render: (s: string) => (
              <Tag color={s === "TARHIB" ? "blue" : "orange"}>
                {s === "TARHIB" ? t("roleScopeTarhib") : t("roleScopeClient")}
              </Tag>
            ),
          },
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
            render: (_, r) => <Tag>{r.permissions.length}</Tag>,
          },
          {
            title: t("actions"),
            key: "_actions",
            width: 160,
            render: (_, r) => (
              <Space>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  disabled={r.isSystem}
                  onClick={() => openEdit(r)}
                />
                <Popconfirm
                  title={r.isSystem ? t("systemRoleCannotDelete") : t("deleteConfirm")}
                  onConfirm={() => !r.isSystem && handleDelete(r.id)}
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
        ]}
      />

      <Modal
        open={formOpen}
        title={editing ? t("editRole") : t("createRole")}
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
            <Input />
          </Form.Item>
          <Form.Item name="nameEn" label={t("roleNameEn")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          {isSuperadmin && (
            <Form.Item name="scope" label={t("roleScope")} rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "TARHIB", label: t("roleScopeTarhib") },
                  { value: "CLIENT", label: t("roleScopeClient") },
                ]}
              />
            </Form.Item>
          )}
          <Form.Item name="slaPriority" label={t("slaPriority")} rules={[{ required: true }]}>
            <Select options={["P1", "P2", "P3", "P4", "P5"].map((v) => ({ value: v, label: v }))} />
          </Form.Item>
          <Form.Item name="permissionKeys" label={t("permissionsLabel")}>
            <Checkbox.Group style={{ width: "100%" }}>
              {permOptionsByGroup.map(([group, perms]) => (
                <div key={group} style={{ marginBlockEnd: 8 }}>
                  <strong style={{ textTransform: "capitalize" }}>{group}</strong>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBlockStart: 4 }}>
                    {perms.map((p) => (
                      <Checkbox key={p.key} value={p.key}>
                        {i18n.language === "ar" ? p.nameAr : p.nameEn}
                      </Checkbox>
                    ))}
                  </div>
                </div>
              ))}
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Modal>

      {quotaRole && (
        <RoleQuotasModal
          roleId={quotaRole.id}
          roleName={i18n.language === "ar" ? quotaRole.nameAr : quotaRole.nameEn}
          open={!!quotaRole}
          onClose={() => setQuotaRole(null)}
        />
      )}
    </>
  );
}
