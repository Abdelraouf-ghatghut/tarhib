import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Collapse,
  Divider,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Tooltip,
  Typography,
} from "antd";
import { CloseOutlined, InfoCircleOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import {
  bilingualName,
  slaColor,
  slaLevelLabel,
  type Permission,
  type Product,
  type Role,
  type RoleQuotaInput,
  type SlaLevel,
} from "./shared";

const { Text, Title } = Typography;

export interface RoleFormPayload {
  nameAr: string;
  nameEn?: string;
  slaPriority?: string;
  permissionKeys?: string[];
  quotas?: RoleQuotaInput[];
}

interface Props {
  scope: "TARHIB" | "CLIENT";
  editing: Role | null;
  permissions?: Permission[];
  products?: Product[];
  slaLevels?: SlaLevel[];
  saving: boolean;
  onCancel: () => void;
  onSubmit: (payload: RoleFormPayload) => void;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text
      strong
      style={{
        display: "block",
        fontSize: 13,
        textTransform: "uppercase",
        letterSpacing: 0.4,
        color: "#64748B",
        marginBlockEnd: 16,
      }}
    >
      {children}
    </Text>
  );
}

/**
 * Formulaire inline unique (création + modification) — aucun modal ni drawer.
 * Organisé en sections (guide §10) : Informations / Configuration / Permissions.
 * Pour les rôles CLIENT, les quotas font partie intégrante du rôle :
 * quotasEnabled est dérivé côté serveur (≥1 quota = activé).
 */
export function RoleForm({
  scope,
  editing,
  permissions,
  products,
  slaLevels,
  saving,
  onCancel,
  onSubmit,
}: Props) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [form] = Form.useForm();

  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(
    () => new Set(editing?.permissions ?? []),
  );
  const [permSearch, setPermSearch] = useState("");
  const [quotas, setQuotas] = useState<RoleQuotaInput[]>(
    () =>
      editing?.quotas.map((q) => ({
        productId: q.productId,
        periodType: q.periodType,
        maxQuantity: q.maxQuantity,
      })) ?? [],
  );
  const [quotaFormOpen, setQuotaFormOpen] = useState(false);
  const [quotaDraft, setQuotaDraft] = useState<Partial<RoleQuotaInput>>({
    periodType: "MONTHLY",
  });

  // Seuls les produits commandables sont proposés ; les produits déjà
  // configurés et les VIP libre-service sont exclus (§3 CLAUDE.md)
  const availableProducts = useMemo(() => {
    const used = new Set(quotas.map((q) => q.productId));
    return (products ?? []).filter(
      (p) => (p.type === "COMMANDABLE" || p.type === "commandable") && !used.has(p.id),
    );
  }, [products, quotas]);

  const permGroups = useMemo(() => {
    const filtered = (permissions ?? []).filter((p) => {
      if (!permSearch.trim()) return true;
      const needle = permSearch.toLowerCase();
      return (
        p.key.toLowerCase().includes(needle) ||
        p.nameAr.includes(permSearch) ||
        p.nameEn.toLowerCase().includes(needle)
      );
    });
    return Object.entries(
      filtered.reduce<Record<string, Permission[]>>((acc, p) => {
        const group = p.key.split(".")[0];
        acc[group] = [...(acc[group] ?? []), p];
        return acc;
      }, {}),
    );
  }, [permissions, permSearch]);

  function togglePerm(key: string, checked: boolean) {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function toggleGroup(perms: Permission[], checked: boolean) {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      perms.forEach((p) => (checked ? next.add(p.key) : next.delete(p.key)));
      return next;
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

  function addQuota() {
    if (!quotaDraft.productId || !quotaDraft.periodType || !quotaDraft.maxQuantity) return;
    setQuotas((prev) => [...prev, quotaDraft as RoleQuotaInput]);
    setQuotaDraft({ periodType: "MONTHLY" });
    setQuotaFormOpen(false);
  }

  async function handleSubmit() {
    try {
      const values = (await form.validateFields()) as {
        nameAr: string;
        nameEn?: string;
        slaPriority?: string;
      };
      const payload: RoleFormPayload = {
        nameAr: values.nameAr,
        nameEn: values.nameEn?.trim() || undefined,
      };
      if (scope === "TARHIB") {
        payload.permissionKeys = [...selectedPerms];
      } else {
        payload.slaPriority = values.slaPriority;
        payload.quotas = quotas;
      }
      onSubmit(payload);
    } catch {
      // erreurs de validation affichées par le Form
    }
  }

  const activeLevels = (slaLevels ?? []).filter((l) => l.active);
  const defaultSla = activeLevels[0]?.code;

  return (
    <Card style={{ maxInlineSize: 880 }}>
      <Title level={5} style={{ marginBlockStart: 0, marginBlockEnd: 24 }}>
        {editing ? t("editRole") : t("createRoleTitle")}
      </Title>

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          nameAr: editing?.nameAr,
          nameEn: editing?.nameEn ?? undefined,
          slaPriority: editing?.slaPriority ?? defaultSla,
        }}
      >
        <SectionTitle>{t("formSectionInfo")}</SectionTitle>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Form.Item
            name="nameAr"
            label={t("roleNameAr")}
            rules={[{ required: true, message: t("roleNameArRequired") }]}
            style={{ flex: "1 1 240px" }}
          >
            <Input dir="rtl" />
          </Form.Item>
          <Form.Item
            name="nameEn"
            label={t("roleNameEnOptional")}
            tooltip={t("roleNameEnHint")}
            style={{ flex: "1 1 240px" }}
          >
            <Input dir="ltr" />
          </Form.Item>
        </div>

        {scope === "CLIENT" && (
          <>
            <Divider style={{ marginBlock: 24 }} />
            <SectionTitle>{t("formSectionConfig")}</SectionTitle>
            <Form.Item
              name="slaPriority"
              label={
                <Space size={6}>
                  {t("slaPriority")}
                  <Tooltip title={t("slaPriorityHint")}>
                    <InfoCircleOutlined style={{ color: "#64748B" }} />
                  </Tooltip>
                </Space>
              }
              rules={[{ required: true }]}
              style={{ maxInlineSize: 360 }}
            >
              <Select
                options={activeLevels.map((l) => ({
                  value: l.code,
                  label: (
                    <Space size={6}>
                      <span
                        style={{
                          display: "inline-block",
                          inlineSize: 8,
                          blockSize: 8,
                          borderRadius: "50%",
                          background: slaColor(l.code, slaLevels),
                        }}
                      />
                      {slaLevelLabel(l.code, slaLevels, isAr)}
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        ({l.targetMinutes} {t("minutes")})
                      </Text>
                    </Space>
                  ),
                }))}
              />
            </Form.Item>

            <Divider style={{ marginBlock: 24 }} />
            <SectionTitle>{t("quotasOptional")}</SectionTitle>

            {quotas.length === 0 && !quotaFormOpen && (
              <Text type="secondary" style={{ display: "block", marginBlockEnd: 8 }}>
                {t("noQuotaConfigured")}
              </Text>
            )}

            {quotas.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBlockEnd: 16,
                }}
              >
                {quotas.map((q) => (
                  <div
                    key={q.productId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      borderRadius: 8,
                      paddingBlock: 4,
                      paddingInline: 12,
                      background: "#F8FAFC",
                    }}
                  >
                    <div>
                      <Text strong style={{ display: "block", fontSize: 13 }}>
                        {productName(q.productId)}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {periodLabel(q.periodType)} • {q.maxQuantity}
                      </Text>
                    </div>
                    <Button
                      type="text"
                      size="small"
                      icon={<CloseOutlined style={{ fontSize: 10 }} />}
                      onClick={() =>
                        setQuotas((prev) => prev.filter((x) => x.productId !== q.productId))
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            {quotaFormOpen ? (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "flex-end",
                  marginBlockEnd: 16,
                }}
              >
                <div style={{ flex: "1 1 220px" }}>
                  <Text style={{ display: "block", fontSize: 12, marginBlockEnd: 4 }}>
                    {t("products")}
                  </Text>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    placeholder={t("searchProduct")}
                    style={{ inlineSize: "100%" }}
                    value={quotaDraft.productId}
                    onChange={(v: string) => setQuotaDraft((d) => ({ ...d, productId: v }))}
                    options={availableProducts.map((p) => ({
                      value: p.id,
                      label: bilingualName(p.nameAr, p.nameEn, isAr),
                    }))}
                  />
                </div>
                <div>
                  <Text style={{ display: "block", fontSize: 12, marginBlockEnd: 4 }}>
                    {t("periodType")}
                  </Text>
                  <Select
                    style={{ inlineSize: 140 }}
                    value={quotaDraft.periodType}
                    onChange={(v: RoleQuotaInput["periodType"]) =>
                      setQuotaDraft((d) => ({ ...d, periodType: v }))
                    }
                    options={[
                      { value: "DAILY", label: t("quotaPeriodDaily") },
                      { value: "WEEKLY", label: t("quotaPeriodWeekly") },
                      { value: "MONTHLY", label: t("quotaPeriodMonthly") },
                    ]}
                  />
                </div>
                <div>
                  <Text style={{ display: "block", fontSize: 12, marginBlockEnd: 4 }}>
                    {t("maxQuantity")}
                  </Text>
                  <InputNumber
                    min={1}
                    style={{ inlineSize: 100 }}
                    value={quotaDraft.maxQuantity}
                    onChange={(v) => setQuotaDraft((d) => ({ ...d, maxQuantity: v ?? undefined }))}
                  />
                </div>
                <Space>
                  <Button
                    type="primary"
                    disabled={!quotaDraft.productId || !quotaDraft.maxQuantity}
                    onClick={addQuota}
                  >
                    {t("add")}
                  </Button>
                  <Button onClick={() => setQuotaFormOpen(false)}>{t("cancel")}</Button>
                </Space>
              </div>
            ) : (
              <Button
                icon={<PlusOutlined />}
                onClick={() => setQuotaFormOpen(true)}
                disabled={availableProducts.length === 0}
              >
                {t("addQuota")}
              </Button>
            )}
          </>
        )}

        {scope === "TARHIB" && (
          <>
            <Divider style={{ marginBlock: 24 }} />
            <SectionTitle>
              {t("permissionsLabel")}{" "}
              <Text type="secondary" style={{ fontSize: 13 }}>
                ({selectedPerms.size})
              </Text>
            </SectionTitle>
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: "#64748B" }} />}
              placeholder={t("searchPermission")}
              value={permSearch}
              onChange={(e) => setPermSearch(e.target.value)}
              style={{ maxInlineSize: 320, marginBlockEnd: 16 }}
            />
            <Collapse
              size="small"
              ghost
              items={permGroups.map(([group, perms]) => {
                const selectedInGroup = perms.filter((p) => selectedPerms.has(p.key)).length;
                return {
                  key: group,
                  label: (
                    <Space>
                      <span style={{ textTransform: "capitalize", fontWeight: 600 }}>{group}</span>
                      {selectedInGroup > 0 && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {selectedInGroup}/{perms.length}
                        </Text>
                      )}
                    </Space>
                  ),
                  children: (
                    <>
                      <Checkbox
                        indeterminate={selectedInGroup > 0 && selectedInGroup < perms.length}
                        checked={selectedInGroup === perms.length}
                        onChange={(e) => toggleGroup(perms, e.target.checked)}
                        style={{ marginBlockEnd: 8, fontWeight: 600 }}
                      >
                        {t("selectAll")}
                      </Checkbox>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {perms.map((p) => (
                          <Checkbox
                            key={p.key}
                            checked={selectedPerms.has(p.key)}
                            onChange={(e) => togglePerm(p.key, e.target.checked)}
                          >
                            {isAr ? p.nameAr : p.nameEn}
                          </Checkbox>
                        ))}
                      </div>
                    </>
                  ),
                };
              })}
            />
          </>
        )}

        <Divider style={{ marginBlock: 24 }} />
        <Space>
          <Button type="primary" loading={saving} onClick={() => void handleSubmit()}>
            {editing ? t("save") : t("createRoleBtn")}
          </Button>
          <Button onClick={onCancel}>{t("cancel")}</Button>
        </Space>
      </Form>
    </Card>
  );
}
