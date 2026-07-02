import { useState } from "react";
import {
  Button,
  Card,
  Grid,
  Input,
  Popconfirm,
  Select,
  Space,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  BankOutlined,
  DeleteOutlined,
  EditOutlined,
  InboxOutlined,
  LockOutlined,
  PlusOutlined,
  SafetyOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  companiesApi,
  permissionsApi,
  productsAdminApi,
  rolesApi,
  slaLevelsApi,
} from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import { RoleForm, type RoleFormPayload } from "./RoleForm";
import { SlaLevelsConfig } from "./SlaLevelsConfig";
import {
  bilingualName,
  slaColor,
  slaLevelLabel,
  type Company,
  type Permission,
  type Product,
  type Role,
  type SlaLevel,
} from "./shared";

const { Title, Text } = Typography;

type ActiveTab = "tarhib" | "client";
type ViewMode = { mode: "list" } | { mode: "create" } | { mode: "edit"; role: Role };
type RoleFilter = "all" | "P1" | "P2" | "withQuotas" | "withoutQuotas" | "system";

export function RolesPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { isSuperadmin } = useAuth();
  const qc = useQueryClient();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [activeTab, setActiveTab] = useState<ActiveTab>("tarhib");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>({ mode: "list" });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RoleFilter>("all");
  const [saving, setSaving] = useState(false);

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
    enabled: activeTab === "tarhib",
  });

  const { data: products } = useQuery({
    queryKey: ["products-admin"],
    queryFn: () => productsAdminApi.list().then((r) => r.data as Product[]),
    enabled: activeTab === "client" && !!selectedCompanyId,
  });

  const { data: slaLevels } = useQuery({
    queryKey: ["sla-levels", selectedCompanyId],
    queryFn: () => slaLevelsApi.list(selectedCompanyId as string).then((r) => r.data as SlaLevel[]),
    enabled: activeTab === "client" && !!selectedCompanyId,
  });

  const selectedCompany = companies?.find((c) => c.id === selectedCompanyId);
  const selectedCompanyName = selectedCompany
    ? bilingualName(selectedCompany.nameAr, selectedCompany.nameEn, isAr)
    : null;

  function resetList() {
    setView({ mode: "list" });
    setSearch("");
    setFilter("all");
  }

  function switchTab(tab: ActiveTab) {
    setActiveTab(tab);
    resetList();
  }

  function applyFilters(list: Role[]): Role[] {
    let out = list;
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      out = out.filter((r) => `${r.nameAr} ${r.nameEn ?? ""}`.toLowerCase().includes(needle));
    }
    if (filter === "P1" || filter === "P2") out = out.filter((r) => r.slaPriority === filter);
    if (filter === "withQuotas") out = out.filter((r) => r.quotas.length > 0);
    if (filter === "withoutQuotas") out = out.filter((r) => r.quotas.length === 0);
    if (filter === "system") out = out.filter((r) => r.isSystem);
    return out;
  }

  const tarhibRoles = applyFilters((roles ?? []).filter((r) => r.scope === "TARHIB"));
  const clientRoles = applyFilters(
    (roles ?? []).filter((r) => r.scope === "CLIENT" && r.companyId === selectedCompanyId),
  );

  async function handleSubmit(payload: RoleFormPayload) {
    setSaving(true);
    try {
      if (view.mode === "edit") {
        await rolesApi.update(view.role.id, payload);
        void message.success(t("roleUpdated"));
      } else {
        await rolesApi.create({
          ...payload,
          scope: activeTab === "tarhib" ? "TARHIB" : "CLIENT",
          companyId: activeTab === "client" ? selectedCompanyId : undefined,
        });
        void message.success(t("roleCreated"));
      }
      void qc.invalidateQueries({ queryKey: ["roles"] });
      setView({ mode: "list" });
    } catch {
      void message.error(t("errorOccurred"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await rolesApi.remove(id);
      void qc.invalidateQueries({ queryKey: ["roles"] });
      void message.success(t("deleted"));
    } catch {
      void message.error(t("errorOccurred"));
    }
  }

  function formatDate(iso: string) {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(isAr ? "ar" : "en-GB");
  }

  // Fonctions de rendu (pas des composants imbriqués : un composant défini dans
  // le render serait remonté à chaque frappe et l'input de recherche perdrait le focus)
  function renderRoleCard(role: Role) {
    const editDisabled = role.isSystem;
    return (
      <Card
        key={role.id}
        size="small"
        variant="borderless"
        styles={{ body: { display: "flex", flexDirection: "column", gap: 8, padding: 16 } }}
      >
        <Space align="center">
          <span
            style={{
              inlineSize: 32,
              blockSize: 32,
              borderRadius: 8,
              background: "rgba(37, 99, 235, 0.08)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <UserOutlined style={{ color: "#2563EB", fontSize: 15 }} />
          </span>
          <Text strong style={{ fontSize: 15 }}>
            {bilingualName(role.nameAr, role.nameEn, isAr)}
          </Text>
          {role.isSystem && (
            <Tag icon={<LockOutlined />} bordered={false}>
              {t("systemRole")}
            </Tag>
          )}
        </Space>

        <Space size={8} wrap>
          {activeTab === "tarhib" ? (
            <Tag bordered={false} color="blue">
              {t("permissionsCount", { count: role.permissions.length })}
            </Tag>
          ) : (
            <>
              <Tag bordered={false} color={slaColor(role.slaPriority, slaLevels)}>
                {slaLevelLabel(role.slaPriority, slaLevels, isAr)}
              </Tag>
              {role.quotas.length > 0 ? (
                <Tag bordered={false} icon={<InboxOutlined />}>
                  {t("quotasCount", { count: role.quotas.length })}
                </Tag>
              ) : (
                <Text type="secondary">—</Text>
              )}
            </>
          )}
        </Space>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <Text type="secondary" style={{ fontSize: 12 }}>
            {activeTab === "tarhib"
              ? t("createdOn", { date: formatDate(role.createdAt) })
              : t("updatedOn", { date: formatDate(role.updatedAt) })}
          </Text>
          <Space size={4}>
            <Tooltip title={editDisabled ? t("systemRoleTooltip") : t("edit")}>
              <Button
                size="small"
                type="text"
                icon={<EditOutlined />}
                disabled={editDisabled}
                onClick={() => setView({ mode: "edit", role })}
              />
            </Tooltip>
            <Popconfirm
              title={t("deleteConfirm")}
              onConfirm={() => void handleDelete(role.id)}
              okText={t("confirm")}
              cancelText={t("cancel")}
              okButtonProps={{ danger: true }}
              disabled={editDisabled}
            >
              <Tooltip title={editDisabled ? t("systemRoleTooltip") : t("delete")}>
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={editDisabled}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        </div>
      </Card>
    );
  }

  // Filtres rapides en chips (guide §16)
  function renderSearchAndFilters(withSla: boolean) {
    const options: Array<{ value: RoleFilter; label: string }> = [
      { value: "all", label: t("filterAll") },
      ...(withSla
        ? ([
            { value: "P1", label: "SLA P1" },
            { value: "P2", label: "SLA P2" },
            { value: "withQuotas", label: t("filterWithQuotas") },
            { value: "withoutQuotas", label: t("filterWithoutQuotas") },
          ] as Array<{ value: RoleFilter; label: string }>)
        : ([{ value: "system", label: t("filterSystemRoles") }] as Array<{
            value: RoleFilter;
            label: string;
          }>)),
    ];
    return (
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
          marginBlockEnd: 24,
        }}
      >
        <Input
          allowClear
          prefix={<SearchOutlined style={{ color: "#64748B" }} />}
          placeholder={t("searchRole")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxInlineSize: 280 }}
        />
        <Space size={4} wrap>
          {options.map((o) => (
            <Tag.CheckableTag
              key={o.value}
              checked={filter === o.value}
              onChange={() => setFilter(o.value)}
              style={{ paddingInline: 12, paddingBlock: 2, borderRadius: 16, fontSize: 13 }}
            >
              {o.label}
            </Tag.CheckableTag>
          ))}
        </Space>
      </div>
    );
  }

  function renderEmptyState(description: string, showCreate: boolean) {
    return (
      <Card variant="borderless" styles={{ body: { textAlign: "center", padding: 48 } }}>
        <SafetyOutlined style={{ fontSize: 40, color: "#CBD5E1" }} />
        <Text style={{ display: "block", marginBlock: 16, color: "#64748B" }}>{description}</Text>
        {showCreate && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setView({ mode: "create" })}
          >
            {activeTab === "tarhib" ? t("newRole") : t("createClientRole")}
          </Button>
        )}
      </Card>
    );
  }

  function renderCards(list: Role[], canCreateHere: boolean) {
    if (isPending) return <Card loading variant="borderless" style={{ minBlockSize: 120 }} />;
    if (list.length === 0) {
      const hasAny =
        activeTab === "tarhib"
          ? (roles ?? []).some((r) => r.scope === "TARHIB")
          : (roles ?? []).some((r) => r.scope === "CLIENT" && r.companyId === selectedCompanyId);
      return renderEmptyState(hasAny ? t("noData") : t("noRolesYet"), !hasAny && canCreateHere);
    }
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 16,
        }}
      >
        {list.map((r) => renderRoleCard(r))}
      </div>
    );
  }

  const canCreate = activeTab === "tarhib" ? isSuperadmin : !!selectedCompanyId;
  const createLabel = activeTab === "tarhib" ? t("newRole") : t("createClientRole");

  const tarhibContent =
    view.mode === "list" ? (
      <>
        {renderSearchAndFilters(false)}
        {renderCards(tarhibRoles, isSuperadmin)}
      </>
    ) : (
      <RoleForm
        key={view.mode === "edit" ? view.role.id : "create"}
        scope="TARHIB"
        editing={view.mode === "edit" ? view.role : null}
        permissions={permissions}
        saving={saving}
        onCancel={() => setView({ mode: "list" })}
        onSubmit={(p) => void handleSubmit(p)}
      />
    );

  const companySelect = (
    <Select
      allowClear
      showSearch
      placeholder={t("searchCompany")}
      style={{ minInlineSize: 240 }}
      value={selectedCompanyId ?? undefined}
      onChange={(v: string | undefined) => {
        setSelectedCompanyId(v ?? null);
        resetList();
      }}
      filterOption={(input, opt) =>
        String(opt?.label ?? "")
          .toLowerCase()
          .includes(input.toLowerCase())
      }
      options={(companies ?? []).map((c) => ({
        value: c.id,
        label: bilingualName(c.nameAr, c.nameEn, isAr),
      }))}
    />
  );

  const clientContent = !selectedCompanyId ? (
    <>
      <div style={{ marginBlockEnd: 24 }}>{companySelect}</div>
      <Card variant="borderless" styles={{ body: { textAlign: "center", padding: 48 } }}>
        <BankOutlined style={{ fontSize: 40, color: "#CBD5E1" }} />
        <Text style={{ display: "block", marginBlockStart: 16, color: "#64748B" }}>
          {t("noCompanySelected")}
        </Text>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {t("selectCompanyToSeeRoles")}
        </Text>
      </Card>
    </>
  ) : view.mode === "list" ? (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          marginBlockEnd: 24,
        }}
      >
        {companySelect}
        <Title level={5} style={{ margin: 0 }}>
          {t("clientRolesFor", { company: selectedCompanyName })}
        </Title>
      </div>

      <SlaLevelsConfig companyId={selectedCompanyId} />

      {renderSearchAndFilters(true)}
      {renderCards(clientRoles, true)}
    </>
  ) : (
    <RoleForm
      key={view.mode === "edit" ? view.role.id : "create"}
      scope="CLIENT"
      editing={view.mode === "edit" ? view.role : null}
      products={products}
      slaLevels={slaLevels}
      saving={saving}
      onCancel={() => setView({ mode: "list" })}
      onSubmit={(p) => void handleSubmit(p)}
    />
  );

  return (
    <>
      {/* En-tête de page (guide §6) : titre, description, UNE action principale à droite */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
          marginBlockEnd: 24,
        }}
      >
        <div>
          <Title level={3} style={{ marginBlock: 0, fontWeight: 600 }}>
            {t("roles")}
          </Title>
          <Text type="secondary">
            {activeTab === "tarhib" ? t("tarhibRolesDescription") : t("rolesSubtitle")}
          </Text>
        </div>
        {view.mode === "list" && canCreate && !isMobile && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setView({ mode: "create" })}
          >
            {createLabel}
          </Button>
        )}
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(k) => switchTab(k as ActiveTab)}
        items={[
          {
            key: "tarhib",
            label: (
              <Space size={6}>
                <SafetyOutlined />
                {t("roleScopeTarhib")}
              </Space>
            ),
          },
          {
            key: "client",
            label: (
              <Space size={6}>
                <BankOutlined />
                {t("roleScopeClient")}
              </Space>
            ),
          },
        ]}
      />

      {activeTab === "tarhib" ? tarhibContent : clientContent}

      {isMobile && view.mode === "list" && canCreate && (
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={<PlusOutlined />}
          aria-label={createLabel}
          onClick={() => setView({ mode: "create" })}
          style={{
            position: "fixed",
            insetBlockEnd: 24,
            insetInlineEnd: 24,
            inlineSize: 56,
            blockSize: 56,
            zIndex: 100,
            boxShadow: "0 4px 12px rgba(15,23,42,0.2)",
          }}
        />
      )}
    </>
  );
}
