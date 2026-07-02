import { useState } from "react";
import {
  Button,
  Card,
  Empty,
  Grid,
  Input,
  Popconfirm,
  Segmented,
  Select,
  Space,
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
  CLIENT_COLOR,
  SLA_COLORS,
  TARHIB_COLOR,
  bilingualName,
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
    const accent = activeTab === "tarhib" ? TARHIB_COLOR : CLIENT_COLOR;
    const editDisabled = role.isSystem;
    return (
      <Card
        key={role.id}
        size="small"
        style={{ borderInlineStart: `3px solid ${accent}` }}
        styles={{ body: { display: "flex", flexDirection: "column", gap: 8 } }}
      >
        <Space align="center">
          <UserOutlined style={{ color: accent, fontSize: 18 }} />
          <Text strong style={{ fontSize: 15 }}>
            {bilingualName(role.nameAr, role.nameEn, isAr)}
          </Text>
          {role.isSystem && (
            <Tag icon={<LockOutlined />} color="default">
              {t("systemRole")}
            </Tag>
          )}
        </Space>

        <Space size={8} wrap>
          {activeTab === "tarhib" ? (
            <Tag color="blue">{t("permissionsCount", { count: role.permissions.length })}</Tag>
          ) : (
            <>
              <Tag color={SLA_COLORS[role.slaPriority]}>
                {slaLevelLabel(role.slaPriority, slaLevels, isAr)}
              </Tag>
              {role.quotas.length > 0 ? (
                <Tag icon={<InboxOutlined />} color="orange">
                  {t("quotasCount", { count: role.quotas.length })}
                </Tag>
              ) : (
                <Text type="secondary">—</Text>
              )}
            </>
          )}
        </Space>

        <Text type="secondary" style={{ fontSize: 12 }}>
          {activeTab === "tarhib"
            ? t("createdOn", { date: formatDate(role.createdAt) })
            : t("updatedOn", { date: formatDate(role.updatedAt) })}
        </Text>

        <Space style={{ justifyContent: "flex-end", display: "flex" }}>
          <Tooltip title={editDisabled ? t("systemRoleTooltip") : undefined}>
            <Button
              size="small"
              icon={<EditOutlined />}
              disabled={editDisabled}
              onClick={() => setView({ mode: "edit", role })}
            >
              {t("edit")}
            </Button>
          </Tooltip>
          <Popconfirm
            title={t("deleteConfirm")}
            onConfirm={() => void handleDelete(role.id)}
            okText={t("confirm")}
            cancelText={t("cancel")}
            disabled={editDisabled}
          >
            <Tooltip title={editDisabled ? t("systemRoleTooltip") : undefined}>
              <Button size="small" danger icon={<DeleteOutlined />} disabled={editDisabled}>
                {t("delete")}
              </Button>
            </Tooltip>
          </Popconfirm>
        </Space>
      </Card>
    );
  }

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
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          marginBlockEnd: 16,
        }}
      >
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={t("searchRole")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxInlineSize: 260 }}
        />
        <Segmented
          size="small"
          value={filter}
          onChange={(v) => setFilter(v as RoleFilter)}
          options={options}
        />
      </div>
    );
  }

  function renderCards(list: Role[]) {
    if (isPending) return <Card loading style={{ minBlockSize: 120 }} />;
    if (list.length === 0) return <Empty description={t("noData")} />;
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBlockEnd: 12,
          }}
        >
          <Text type="secondary">{t("tarhibRolesDescription")}</Text>
          {isSuperadmin && !isMobile && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setView({ mode: "create" })}
            >
              {t("newRole")}
            </Button>
          )}
        </div>
        {renderSearchAndFilters(false)}
        {renderCards(tarhibRoles)}
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

  const clientContent = !selectedCompanyId ? (
    <>
      <div style={{ maxInlineSize: 360, marginBlockEnd: 24 }}>
        <Text strong style={{ display: "block", marginBlockEnd: 8 }}>
          {t("selectCompany")}
        </Text>
        <Select
          allowClear
          showSearch
          placeholder={t("searchCompany")}
          style={{ inlineSize: "100%" }}
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
      </div>
      <Empty description={t("noCompanySelected")} />
    </>
  ) : view.mode === "list" ? (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBlockEnd: 16,
        }}
      >
        <Space wrap>
          <Select
            showSearch
            style={{ minInlineSize: 220 }}
            value={selectedCompanyId}
            onChange={(v: string) => {
              setSelectedCompanyId(v);
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
          <Title level={5} style={{ margin: 0, color: CLIENT_COLOR }}>
            {t("clientRolesFor", { company: selectedCompanyName })}
          </Title>
        </Space>
        {!isMobile && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ background: CLIENT_COLOR, borderColor: CLIENT_COLOR }}
            onClick={() => setView({ mode: "create" })}
          >
            {t("createClientRole")}
          </Button>
        )}
      </div>

      <SlaLevelsConfig companyId={selectedCompanyId} />

      {renderSearchAndFilters(true)}
      {renderCards(clientRoles)}
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
      <Title level={4} style={{ marginBlockEnd: 4 }}>
        {t("roles")}
      </Title>
      <Text type="secondary" style={{ display: "block", marginBlockEnd: 16 }}>
        {t("rolesSubtitle")}
      </Text>

      <Segmented
        block={isMobile}
        size="large"
        value={activeTab}
        onChange={(v) => switchTab(v as ActiveTab)}
        options={[
          {
            value: "tarhib",
            label: (
              <Space>
                <SafetyOutlined style={{ color: TARHIB_COLOR }} />
                {t("roleScopeTarhib")}
              </Space>
            ),
          },
          {
            value: "client",
            label: (
              <Space>
                <BankOutlined style={{ color: CLIENT_COLOR }} />
                {t("roleScopeClient")}
              </Space>
            ),
          },
        ]}
        style={{ marginBlockEnd: 20 }}
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
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
            background: activeTab === "client" ? CLIENT_COLOR : TARHIB_COLOR,
            borderColor: activeTab === "client" ? CLIENT_COLOR : TARHIB_COLOR,
          }}
        />
      )}
    </>
  );
}
