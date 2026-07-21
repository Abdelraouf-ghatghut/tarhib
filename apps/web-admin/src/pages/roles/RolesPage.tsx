import { useState } from "react";
import {
  App,
  Button,
  Card,
  DatePicker,
  Grid,
  Input,
  Select,
  Space,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import {
  BankOutlined,
  DeleteOutlined,
  EditOutlined,
  ExperimentOutlined,
  InboxOutlined,
  PlusOutlined,
  SafetyOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  companiesApi,
  meetingRoomsAdminApi,
  permissionsApi,
  productsAdminApi,
  rolesApi,
  slaLevelsApi,
} from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import { getErrorMessage } from "../../lib/errors";
import { RoleForm, type RoleFormPayload } from "./RoleForm";
import { RoleDetailDrawer } from "./RoleDetailDrawer";
import { SlaLevelsConfig } from "./SlaLevelsConfig";
import {
  bilingualName,
  slaColor,
  slaLevelLabel,
  type Company,
  type MeetingRoomLite,
  type Permission,
  type Product,
  type Role,
  type SlaLevel,
} from "./shared";

const { Title, Text } = Typography;

type ActiveTab = "tarhib" | "client";
type ViewMode = { mode: "list" } | { mode: "create" } | { mode: "edit"; role: Role };
type QuotaFilter = "all" | "with" | "without";
type SortBy = "newest" | "oldest" | "name";

export function RolesPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { isSuperadmin, hasPermission, impersonation, startRoleImpersonation } = useAuth();
  const canTestRole = hasPermission("role.impersonate") && !impersonation;
  const { modal } = App.useApp();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [activeTab, setActiveTab] = useState<ActiveTab>("tarhib");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>({ mode: "list" });
  const [search, setSearch] = useState("");
  // Filtres propres au client (SLA + présence de quotas) — dropdowns
  // combinables, plutôt que les chips exclusifs d'avant.
  const [slaFilter, setSlaFilter] = useState<string | undefined>(undefined);
  const [quotaFilter, setQuotaFilter] = useState<QuotaFilter>("all");
  // Filtres avancés (plage de dates, tri) — communs aux deux onglets ; le
  // filtre par permission ne s'applique qu'à l'onglet Tarhib.
  const [permFilter, setPermFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [detailRole, setDetailRole] = useState<Role | null>(null);
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

  // Salles de la société : sélection « toutes / certaines salles » du RoleForm
  const { data: rooms } = useQuery({
    queryKey: ["meeting-rooms-admin", selectedCompanyId],
    queryFn: () =>
      meetingRoomsAdminApi
        .list(selectedCompanyId as string)
        .then((r) => r.data as MeetingRoomLite[]),
    enabled: activeTab === "client" && !!selectedCompanyId,
  });

  const selectedCompany = companies?.find((c) => c.id === selectedCompanyId);
  const selectedCompanyName = selectedCompany
    ? bilingualName(selectedCompany.nameAr, selectedCompany.nameEn, isAr)
    : null;

  function resetList() {
    setView({ mode: "list" });
    setSearch("");
    setSlaFilter(undefined);
    setQuotaFilter("all");
    setPermFilter([]);
    setDateRange(null);
    setSortBy("newest");
    setDetailRole(null);
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
    if (slaFilter) out = out.filter((r) => r.slaPriority === slaFilter);
    if (quotaFilter === "with") out = out.filter((r) => r.quotas.length > 0);
    if (quotaFilter === "without") out = out.filter((r) => r.quotas.length === 0);
    // Le rôle doit détenir TOUTES les permissions sélectionnées
    if (permFilter.length > 0) {
      out = out.filter((r) => permFilter.every((key) => r.permissions.includes(key)));
    }
    const [from, to] = dateRange ?? [null, null];
    if (from) out = out.filter((r) => !dayjs(r.createdAt).isBefore(from, "day"));
    if (to) out = out.filter((r) => !dayjs(r.createdAt).isAfter(to, "day"));
    const sorted = [...out];
    if (sortBy === "newest") sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (sortBy === "oldest") sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (sortBy === "name") {
      sorted.sort((a, b) =>
        bilingualName(a.nameAr, a.nameEn, isAr).localeCompare(
          bilingualName(b.nameAr, b.nameEn, isAr),
          isAr ? "ar" : "en",
        ),
      );
    }
    return sorted;
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
    } catch (err) {
      void message.error(getErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await rolesApi.remove(id);
      void qc.invalidateQueries({ queryKey: ["roles"] });
      void message.success(t("deleted"));
    } catch (err) {
      void message.error(getErrorMessage(err, t));
    }
  }

  function formatDate(iso: string) {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(isAr ? "ar" : "en-GB");
  }

  // Fonctions de rendu (pas des composants imbriqués : un composant défini dans
  // le render serait remonté à chaque frappe et l'input de recherche perdrait le focus)
  function renderRoleCard(role: Role) {
    return (
      <Card
        key={role.id}
        size="small"
        variant="borderless"
        hoverable
        onClick={() => setDetailRole(role)}
        styles={{
          body: { display: "flex", flexDirection: "column", gap: 8, padding: 16 },
        }}
        style={{ cursor: "pointer" }}
      >
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
              flexShrink: 0,
            }}
          >
            <UserOutlined style={{ color: "var(--fg-brand)", fontSize: 15 }} />
          </span>
          <Text strong style={{ fontSize: 15 }}>
            {bilingualName(role.nameAr, role.nameEn, isAr)}
          </Text>
        </Space>

        <Space size={8} wrap>
          {activeTab === "tarhib" ? (
            <>
              <Tag bordered={false} color="blue">
                {t("permissionsCount", { count: role.permissions.length })}
              </Tag>
              {role.permissions.slice(0, 2).map((key) => {
                const perm = permissions?.find((p) => p.key === key);
                return (
                  <Tag key={key} bordered={false}>
                    {perm ? bilingualName(perm.nameAr, perm.nameEn, isAr) : key}
                  </Tag>
                );
              })}
              {role.permissions.length > 2 && (
                <Tag bordered={false}>+{role.permissions.length - 2}</Tag>
              )}
            </>
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
          {/* stopPropagation : les actions ne doivent pas ouvrir la fiche détail */}
          <Space size={4} onClick={(e) => e.stopPropagation()}>
            {canTestRole && (
              <Tooltip title={t("testThisRole")}>
                <Button
                  size="small"
                  type="text"
                  icon={<ExperimentOutlined />}
                  onClick={() => {
                    const label = bilingualName(role.nameAr, role.nameEn, isAr);
                    modal.confirm({
                      title: t("testRoleConfirm", { role: label }),
                      okText: t("confirm"),
                      cancelText: t("cancel"),
                      onOk: async () => {
                        try {
                          await startRoleImpersonation(role.id, label);
                          void message.success(t("roleTestStarted", { role: label }));
                          navigate("/");
                        } catch (err) {
                          void message.error(getErrorMessage(err, t));
                        }
                      },
                    });
                  }}
                />
              </Tooltip>
            )}
            <Tooltip title={t("edit")}>
              <Button
                size="small"
                type="text"
                icon={<EditOutlined />}
                onClick={() => setView({ mode: "edit", role })}
              />
            </Tooltip>
            <Tooltip title={t("delete")}>
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() =>
                  modal.confirm({
                    title: t("deleteConfirm"),
                    okText: t("confirm"),
                    cancelText: t("cancel"),
                    okButtonProps: { danger: true },
                    onOk: () => handleDelete(role.id),
                  })
                }
              />
            </Tooltip>
          </Space>
        </div>
      </Card>
    );
  }

  // Barre de filtres — même famille de contrôles (Select/RangePicker/tri)
  // pour les deux onglets ; seule la facette propre à chaque scope change
  // (permissions pour Tarhib, SLA + quotas pour client).
  function renderSearchAndFilters(withSla: boolean) {
    const slaOptions = (slaLevels ?? []).map((l) => ({
      value: l.code,
      label: slaLevelLabel(l.code, slaLevels, isAr),
    }));
    return (
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          marginBlockEnd: 24,
        }}
      >
        <Input
          allowClear
          prefix={<SearchOutlined style={{ color: "var(--fg-body-subtle)" }} />}
          placeholder={t("searchRole")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxInlineSize: 240 }}
        />
        {withSla ? (
          <>
            <Select
              allowClear
              placeholder={t("slaPriority")}
              value={slaFilter}
              onChange={setSlaFilter}
              style={{ minInlineSize: 160 }}
              options={slaOptions}
            />
            <Select<QuotaFilter>
              value={quotaFilter}
              onChange={setQuotaFilter}
              style={{ minInlineSize: 170 }}
              options={[
                { value: "all", label: t("filterAll") },
                { value: "with", label: t("filterWithQuotas") },
                { value: "without", label: t("filterWithoutQuotas") },
              ]}
            />
          </>
        ) : (
          <Select
            mode="multiple"
            allowClear
            maxTagCount="responsive"
            placeholder={t("filterByPermission")}
            value={permFilter}
            onChange={setPermFilter}
            style={{ minInlineSize: 220, maxInlineSize: 320 }}
            optionFilterProp="label"
            options={(permissions ?? []).map((p) => ({
              value: p.key,
              label: bilingualName(p.nameAr, p.nameEn, isAr),
            }))}
          />
        )}
        <DatePicker.RangePicker
          allowEmpty={[true, true]}
          value={dateRange}
          onChange={(range) => setDateRange(range)}
          placeholder={[t("createdAt"), t("createdAt")]}
        />
        <Select<SortBy>
          value={sortBy}
          onChange={setSortBy}
          style={{ inlineSize: 150 }}
          options={[
            { value: "newest", label: t("sortNewest") },
            { value: "oldest", label: t("sortOldest") },
            { value: "name", label: t("sortByName") },
          ]}
        />
      </div>
    );
  }

  function renderEmptyState(description: string, showCreate: boolean) {
    return (
      <Card variant="borderless" styles={{ body: { textAlign: "center", padding: 48 } }}>
        <SafetyOutlined style={{ fontSize: 40, color: "var(--fg-disabled)" }} />
        <Text style={{ display: "block", marginBlock: 16, color: "var(--fg-body-subtle)" }}>
          {description}
        </Text>
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
        <BankOutlined style={{ fontSize: 40, color: "var(--fg-disabled)" }} />
        <Text style={{ display: "block", marginBlockStart: 16, color: "var(--fg-body-subtle)" }}>
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
      rooms={rooms}
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
            boxShadow: "var(--shadow-lg)",
          }}
        />
      )}

      <RoleDetailDrawer
        role={detailRole}
        permissions={permissions}
        products={products}
        slaLevels={slaLevels}
        onClose={() => setDetailRole(null)}
        onEdit={(role) => {
          setDetailRole(null);
          setView({ mode: "edit", role });
        }}
      />
    </>
  );
}
