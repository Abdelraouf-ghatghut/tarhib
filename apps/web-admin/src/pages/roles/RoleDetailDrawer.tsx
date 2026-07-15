import { useMemo } from "react";
import { Button, Descriptions, Divider, Drawer, Empty, Space, Table, Tag, Typography } from "antd";
import { EditOutlined, UserOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import {
  bilingualName,
  permissionGroupLabel,
  slaColor,
  slaLevelLabel,
  type Permission,
  type Product,
  type Role,
  type RoleQuota,
  type SlaLevel,
} from "./shared";

const { Text } = Typography;

interface Props {
  role: Role | null;
  permissions?: Permission[];
  products?: Product[];
  slaLevels?: SlaLevel[];
  onClose: () => void;
  onEdit: (role: Role) => void;
}

/**
 * Fiche complète d'un rôle : identité, dates, et selon le scope les
 * permissions groupées par module (TARHIB) ou SLA + quotas (CLIENT).
 */
export function RoleDetailDrawer({
  role,
  permissions,
  products,
  slaLevels,
  onClose,
  onEdit,
}: Props) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const permGroups = useMemo(() => {
    if (!role) return [];
    const byKey = new Map((permissions ?? []).map((p) => [p.key, p]));
    const groups = role.permissions.reduce<Record<string, string[]>>((acc, key) => {
      const group = key.split(".")[0];
      const perm = byKey.get(key);
      const label = perm ? bilingualName(perm.nameAr, perm.nameEn, isAr) : key;
      acc[group] = [...(acc[group] ?? []), label];
      return acc;
    }, {});
    return Object.entries(groups);
  }, [role, permissions, isAr]);

  function formatDate(iso: string) {
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
      ? "—"
      : date.toLocaleDateString(isAr ? "ar" : "en-GB", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
  }

  function productName(id: string) {
    const p = products?.find((x) => x.id === id);
    return p ? bilingualName(p.nameAr, p.nameEn, isAr) : id;
  }

  function periodLabel(period: string) {
    if (period === "DAILY") return t("quotaPeriodDaily");
    if (period === "WEEKLY") return t("quotaPeriodWeekly");
    return t("quotaPeriodMonthly");
  }

  return (
    <Drawer
      open={!!role}
      onClose={onClose}
      width={520}
      title={
        role && (
          <Space align="center">
            <span
              style={{
                inlineSize: 32,
                blockSize: 32,
                borderRadius: 8,
                background: "var(--brand-softer)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <UserOutlined style={{ color: "var(--fg-brand)", fontSize: 15 }} />
            </span>
            {bilingualName(role.nameAr, role.nameEn, isAr)}
          </Space>
        )
      }
      extra={
        role && (
          <Button icon={<EditOutlined />} onClick={() => onEdit(role)}>
            {t("edit")}
          </Button>
        )
      }
    >
      {role && (
        <>
          <Descriptions
            column={1}
            size="small"
            bordered
            items={[
              { key: "nameAr", label: t("roleNameAr"), children: role.nameAr },
              {
                key: "nameEn",
                label: t("roleNameEnOptional"),
                children: role.nameEn?.trim() || "—",
              },
              {
                key: "scope",
                label: t("type"),
                children: (
                  <Tag bordered={false} color={role.scope === "TARHIB" ? "purple" : "blue"}>
                    {role.scope === "TARHIB" ? t("roleScopeTarhib") : t("roleScopeClient")}
                  </Tag>
                ),
              },
              ...(role.scope === "CLIENT"
                ? [
                    {
                      key: "sla",
                      label: t("slaPriority"),
                      children: (
                        <Tag bordered={false} color={slaColor(role.slaPriority, slaLevels)}>
                          {slaLevelLabel(role.slaPriority, slaLevels, isAr)}
                        </Tag>
                      ),
                    },
                    {
                      key: "meeting",
                      label: t("meetingManagementSection"),
                      children: (
                        <Tag
                          bordered={false}
                          color={role.permissions.includes("meeting.book") ? "green" : "default"}
                        >
                          {role.permissions.includes("meeting.book") ? t("enabled") : t("disabled")}
                        </Tag>
                      ),
                    },
                  ]
                : []),
              {
                key: "created",
                label: t("createdAt"),
                children: formatDate(role.createdAt),
              },
              {
                key: "updated",
                label: t("updatedAtLabel"),
                children: formatDate(role.updatedAt),
              },
            ]}
          />

          {role.scope === "TARHIB" && (
            <>
              <Divider titlePlacement="start" style={{ fontSize: 13 }}>
                {t("permissionsLabel")} ({role.permissions.length})
              </Divider>
              {permGroups.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("noPermissions")} />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {permGroups.map(([group, labels]) => (
                    <div key={group}>
                      <Text
                        strong
                        style={{
                          display: "block",
                          fontSize: 12,
                          color: "var(--fg-body-subtle)",
                          marginBlockEnd: 6,
                        }}
                      >
                        {permissionGroupLabel(group, t)}
                      </Text>
                      <Space size={6} wrap>
                        {labels.map((label) => (
                          <Tag key={label} bordered={false} color="blue">
                            {label}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {role.scope === "CLIENT" && (
            <>
              <Divider titlePlacement="start" style={{ fontSize: 13 }}>
                {t("quotasOptional")} ({role.quotas.length})
              </Divider>
              {role.quotas.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("noQuotaConfigured")} />
              ) : (
                <Table<RoleQuota>
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={role.quotas}
                  columns={[
                    {
                      title: t("products"),
                      dataIndex: "productId",
                      render: (v: string) => productName(v),
                    },
                    {
                      title: t("periodType"),
                      dataIndex: "periodType",
                      width: 110,
                      render: (v: string) => periodLabel(v),
                    },
                    { title: t("maxQuantity"), dataIndex: "maxQuantity", width: 90 },
                  ]}
                />
              )}
            </>
          )}
        </>
      )}
    </Drawer>
  );
}
