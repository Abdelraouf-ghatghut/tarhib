import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Collapse,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  BankOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  SearchOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import {
  bilingualName,
  permissionGroupLabel,
  slaColor,
  slaLevelLabel,
  type MeetingRoomLite,
  type Permission,
  type Product,
  type Role,
  type RoleQuotaInput,
  type SlaLevel,
} from "./shared";

const { Text, Title } = Typography;

// Base toujours accordée à tout rôle client : commander et consulter ses
// commandes/quotas ne sont pas des permissions activables — seule la gestion
// des réunions (réserver une salle + commander des packages de service) l'est.
const CLIENT_BASE_PERMISSIONS = ["order.create", "catalog.view", "quota.view", "profile.edit"];
const MEETING_PERMISSIONS = ["meeting.book", "meeting.order_services"];

export interface RoleFormPayload {
  nameAr: string;
  nameEn?: string;
  slaPriority?: string;
  permissionKeys?: string[];
  quotas?: RoleQuotaInput[];
  allRoomsAllowed?: boolean;
  roomIds?: string[];
}

interface Props {
  scope: "TARHIB" | "CLIENT";
  editing: Role | null;
  permissions?: Permission[];
  products?: Product[];
  rooms?: MeetingRoomLite[];
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
        color: "var(--fg-body-subtle)",
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
  rooms,
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
  const [meetingEnabled, setMeetingEnabled] = useState<boolean>(
    () => editing?.permissions?.includes("meeting.book") ?? false,
  );
  // Accès aux salles : toutes (défaut) ou une sélection explicite
  const [allRoomsAllowed, setAllRoomsAllowed] = useState<boolean>(
    () => editing?.allRoomsAllowed ?? true,
  );
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(
    () => new Set(editing?.roomIds ?? []),
  );
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [roomSearch, setRoomSearch] = useState("");
  const [tempRooms, setTempRooms] = useState<Set<string>>(new Set());
  const [permSearch, setPermSearch] = useState("");
  const [quotas, setQuotas] = useState<RoleQuotaInput[]>(
    () =>
      editing?.quotas.map((q) => ({
        productId: q.productId,
        periodType: q.periodType,
        maxQuantity: q.maxQuantity,
      })) ?? [],
  );
  // Le switch reflète quotasEnabled (dérivé serveur : ≥1 quota = activé)
  const [quotasEnabled, setQuotasEnabled] = useState(
    () => (editing?.quotasEnabled ?? false) || (editing?.quotas.length ?? 0) > 0,
  );
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [tempSelected, setTempSelected] = useState<Set<string>>(new Set());

  // Seuls les produits vendus peuvent recevoir un quota ; les VIP
  // libre-service et les ingrédients de recette sont exclus (§3 CLAUDE.md)
  const commandableProducts = useMemo(() => (products ?? []).filter((p) => p.isSold), [products]);

  const activeRooms = useMemo(() => (rooms ?? []).filter((r) => r.active), [rooms]);

  const modalRooms = useMemo(() => {
    if (!roomSearch.trim()) return activeRooms;
    const needle = roomSearch.trim().toLowerCase();
    return activeRooms.filter((r) => `${r.nameAr} ${r.nameEn}`.toLowerCase().includes(needle));
  }, [activeRooms, roomSearch]);

  const modalProducts = useMemo(() => {
    if (!productSearch.trim()) return commandableProducts;
    const needle = productSearch.trim().toLowerCase();
    return commandableProducts.filter((p) =>
      `${p.nameAr} ${p.nameEn}`.toLowerCase().includes(needle),
    );
  }, [commandableProducts, productSearch]);

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

  function roomName(id: string) {
    const r = rooms?.find((x) => x.id === id);
    return r ? bilingualName(r.nameAr, r.nameEn, isAr) : id;
  }

  function openRoomModal() {
    setTempRooms(new Set(selectedRoomIds));
    setRoomSearch("");
    setRoomModalOpen(true);
  }

  function toggleRoom(id: string, checked: boolean) {
    setTempRooms((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function openProductModal() {
    setTempSelected(new Set(quotas.map((q) => q.productId)));
    setProductSearch("");
    setProductModalOpen(true);
  }

  function toggleProduct(id: string, checked: boolean) {
    setTempSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  /** Valide la sélection : conserve les quotas existants, ajoute les nouveaux
   *  produits avec des valeurs par défaut, retire les produits décochés. */
  function confirmProductSelection() {
    setQuotas((prev) => {
      const kept = prev.filter((q) => tempSelected.has(q.productId));
      const existing = new Set(kept.map((q) => q.productId));
      const added = [...tempSelected]
        .filter((id) => !existing.has(id))
        .map((id) => ({ productId: id, periodType: "MONTHLY" as const, maxQuantity: 1 }));
      return [...kept, ...added];
    });
    setProductModalOpen(false);
  }

  function updateQuota(productId: string, patch: Partial<RoleQuotaInput>) {
    setQuotas((prev) => prev.map((q) => (q.productId === productId ? { ...q, ...patch } : q)));
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
        // Base toujours accordée + gestion des réunions si activée : c'est la
        // seule permission togglable pour un rôle client
        payload.permissionKeys = [
          ...CLIENT_BASE_PERMISSIONS,
          ...(meetingEnabled ? MEETING_PERMISSIONS : []),
        ];
        // Switch désactivé = aucun quota (le serveur dérive quotasEnabled=false)
        payload.quotas = quotasEnabled ? quotas : [];
        // Accès aux salles : « toutes » vide la sélection ; sans gestion des
        // réunions on remet le défaut (toutes) pour ne pas garder une
        // restriction fantôme.
        payload.allRoomsAllowed = meetingEnabled ? allRoomsAllowed : true;
        payload.roomIds = meetingEnabled && !allRoomsAllowed ? [...selectedRoomIds] : [];
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
            {activeLevels.length === 0 && (
              <Text type="warning" style={{ display: "block", fontSize: 13, marginBlockEnd: 12 }}>
                {t("defineSlaLevelsFirst")}
              </Text>
            )}
            <Form.Item
              name="slaPriority"
              label={
                <Space size={6}>
                  {t("slaPriority")}
                  <Tooltip title={t("slaPriorityHint")}>
                    <InfoCircleOutlined style={{ color: "var(--fg-body-subtle)" }} />
                  </Tooltip>
                </Space>
              }
              rules={[{ required: true, message: t("defineSlaLevelsFirst") }]}
              style={{ maxInlineSize: 360 }}
            >
              <Select
                disabled={activeLevels.length === 0}
                placeholder={activeLevels.length === 0 ? t("noSlaLevels") : undefined}
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
            <SectionTitle>{t("meetingManagementSection")}</SectionTitle>
            <Space align="center" style={{ marginBlockEnd: 8 }}>
              <Switch checked={meetingEnabled} onChange={setMeetingEnabled} />
              <Text strong>{t("enableMeetingManagement")}</Text>
            </Space>
            <Text type="secondary" style={{ display: "block", fontSize: 13, marginBlockEnd: 16 }}>
              {t("enableMeetingManagementHint")}
            </Text>

            {meetingEnabled && (
              <>
                <Radio.Group
                  value={allRoomsAllowed ? "all" : "selected"}
                  onChange={(e) => setAllRoomsAllowed(e.target.value === "all")}
                  style={{ display: "block", marginBlockEnd: 12 }}
                  options={[
                    { value: "all", label: t("allRoomsOption") },
                    { value: "selected", label: t("selectedRoomsOption") },
                  ]}
                />
                {!allRoomsAllowed && (
                  <>
                    <Space style={{ marginBlockEnd: 12 }} wrap>
                      <Button
                        icon={<BankOutlined />}
                        onClick={openRoomModal}
                        disabled={activeRooms.length === 0}
                      >
                        {t("chooseRooms")}
                      </Button>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {activeRooms.length === 0
                          ? t("noRoomsForCompany")
                          : t("roomsSelected", { count: selectedRoomIds.size })}
                      </Text>
                    </Space>
                    {selectedRoomIds.size === 0 ? (
                      <Text
                        type="warning"
                        style={{ display: "block", fontSize: 13, marginBlockEnd: 16 }}
                      >
                        {t("noRoomsSelectedWarning")}
                      </Text>
                    ) : (
                      <Space size={8} wrap style={{ marginBlockEnd: 16 }}>
                        {[...selectedRoomIds].map((id) => (
                          <Tag
                            key={id}
                            bordered={false}
                            closable
                            onClose={() =>
                              setSelectedRoomIds((prev) => {
                                const next = new Set(prev);
                                next.delete(id);
                                return next;
                              })
                            }
                          >
                            {roomName(id)}
                          </Tag>
                        ))}
                      </Space>
                    )}
                    <Modal
                      title={t("chooseRooms")}
                      open={roomModalOpen}
                      onOk={() => {
                        setSelectedRoomIds(new Set(tempRooms));
                        setRoomModalOpen(false);
                      }}
                      onCancel={() => setRoomModalOpen(false)}
                      okText={t("confirm")}
                      cancelText={t("cancel")}
                      width={520}
                    >
                      <Input
                        allowClear
                        prefix={<SearchOutlined style={{ color: "var(--fg-body-subtle)" }} />}
                        placeholder={t("searchRoom")}
                        value={roomSearch}
                        onChange={(e) => setRoomSearch(e.target.value)}
                        style={{ marginBlockEnd: 12 }}
                      />
                      {modalRooms.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("noData")} />
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                            maxBlockSize: 360,
                            overflowY: "auto",
                          }}
                        >
                          {modalRooms.map((r) => (
                            <label
                              key={r.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                borderRadius: 8,
                                paddingBlock: 8,
                                paddingInline: 10,
                                cursor: "pointer",
                                background: tempRooms.has(r.id)
                                  ? "var(--brand-softer)"
                                  : "transparent",
                              }}
                            >
                              <Checkbox
                                checked={tempRooms.has(r.id)}
                                onChange={(e) => toggleRoom(r.id, e.target.checked)}
                              />
                              <Text style={{ fontSize: 13 }}>
                                {bilingualName(r.nameAr, r.nameEn, isAr)}
                              </Text>
                            </label>
                          ))}
                        </div>
                      )}
                      <Text
                        type="secondary"
                        style={{ display: "block", fontSize: 12, marginBlockStart: 12 }}
                      >
                        {t("roomsSelected", { count: tempRooms.size })}
                      </Text>
                    </Modal>
                  </>
                )}
              </>
            )}

            <Divider style={{ marginBlock: 24 }} />
            <SectionTitle>{t("quotasOptional")}</SectionTitle>

            <Space align="center" style={{ marginBlockEnd: 8 }}>
              <Switch checked={quotasEnabled} onChange={(checked) => setQuotasEnabled(checked)} />
              <Text strong>{t("enableQuotas")}</Text>
            </Space>
            <Text type="secondary" style={{ display: "block", fontSize: 13, marginBlockEnd: 16 }}>
              {t("enableQuotasHint")}
            </Text>

            {quotasEnabled && (
              <>
                <Space style={{ marginBlockEnd: 16 }} wrap>
                  <Button
                    icon={<ShoppingOutlined />}
                    onClick={openProductModal}
                    disabled={commandableProducts.length === 0}
                  >
                    {t("chooseProducts")}
                  </Button>
                  {quotas.length > 0 && (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {t("productsSelected", { count: quotas.length })}
                    </Text>
                  )}
                </Space>

                {quotas.length === 0 ? (
                  <Text type="secondary" style={{ display: "block", marginBlockEnd: 8 }}>
                    {t("noQuotaProductsSelected")}
                  </Text>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      maxInlineSize: 640,
                    }}
                  >
                    {quotas.map((q) => (
                      <div
                        key={q.productId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          flexWrap: "wrap",
                          borderRadius: 8,
                          paddingBlock: 8,
                          paddingInline: 12,
                          background: "var(--neutral-secondary-soft)",
                        }}
                      >
                        <Text strong style={{ flex: "1 1 160px", fontSize: 13 }}>
                          {productName(q.productId)}
                        </Text>
                        <Select
                          size="small"
                          style={{ inlineSize: 130 }}
                          value={q.periodType}
                          onChange={(v: RoleQuotaInput["periodType"]) =>
                            updateQuota(q.productId, { periodType: v })
                          }
                          options={[
                            { value: "DAILY", label: t("quotaPeriodDaily") },
                            { value: "WEEKLY", label: t("quotaPeriodWeekly") },
                            { value: "MONTHLY", label: t("quotaPeriodMonthly") },
                          ]}
                        />
                        <InputNumber
                          size="small"
                          min={1}
                          style={{ inlineSize: 90 }}
                          value={q.maxQuantity}
                          onChange={(v) => updateQuota(q.productId, { maxQuantity: v ?? 1 })}
                        />
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

                <Modal
                  title={t("chooseProducts")}
                  open={productModalOpen}
                  onOk={confirmProductSelection}
                  onCancel={() => setProductModalOpen(false)}
                  okText={t("confirm")}
                  cancelText={t("cancel")}
                  width={520}
                >
                  <Input
                    allowClear
                    prefix={<SearchOutlined style={{ color: "var(--fg-body-subtle)" }} />}
                    placeholder={t("searchProduct")}
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    style={{ marginBlockEnd: 12 }}
                  />
                  {modalProducts.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("noData")} />
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        maxBlockSize: 360,
                        overflowY: "auto",
                      }}
                    >
                      {modalProducts.map((p) => (
                        <label
                          key={p.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            borderRadius: 8,
                            paddingBlock: 8,
                            paddingInline: 10,
                            cursor: "pointer",
                            background: tempSelected.has(p.id)
                              ? "var(--brand-softer)"
                              : "transparent",
                          }}
                        >
                          <Checkbox
                            checked={tempSelected.has(p.id)}
                            onChange={(e) => toggleProduct(p.id, e.target.checked)}
                          />
                          <Text style={{ fontSize: 13 }}>
                            {bilingualName(p.nameAr, p.nameEn, isAr)}
                          </Text>
                        </label>
                      ))}
                    </div>
                  )}
                  <Text
                    type="secondary"
                    style={{ display: "block", fontSize: 12, marginBlockStart: 12 }}
                  >
                    {t("productsSelected", { count: tempSelected.size })}
                  </Text>
                </Modal>
              </>
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
            <div style={{ marginBlockEnd: 12 }}>
              <Input
                allowClear
                prefix={<SearchOutlined style={{ color: "var(--fg-body-subtle)" }} />}
                placeholder={t("searchPermission")}
                value={permSearch}
                onChange={(e) => setPermSearch(e.target.value)}
                style={{ maxInlineSize: 320 }}
              />
            </div>
            {(permissions ?? []).length > 1 && (
              <div style={{ marginBlockEnd: 16 }}>
                <Checkbox
                  indeterminate={
                    selectedPerms.size > 0 && selectedPerms.size < (permissions ?? []).length
                  }
                  checked={
                    (permissions ?? []).length > 0 &&
                    selectedPerms.size === (permissions ?? []).length
                  }
                  onChange={(e) => toggleGroup(permissions ?? [], e.target.checked)}
                  style={{ fontWeight: 600 }}
                >
                  {t("selectAllPermissions")}
                </Checkbox>
              </div>
            )}
            <Collapse
              size="small"
              ghost
              items={permGroups.map(([group, perms]) => {
                const selectedInGroup = perms.filter((p) => selectedPerms.has(p.key)).length;
                return {
                  key: group,
                  label: (
                    <Space>
                      <span style={{ fontWeight: 600 }}>{permissionGroupLabel(group, t)}</span>
                      {selectedInGroup > 0 && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {selectedInGroup}/{perms.length}
                        </Text>
                      )}
                    </Space>
                  ),
                  children: (
                    <>
                      {perms.length > 1 && (
                        <Checkbox
                          indeterminate={selectedInGroup > 0 && selectedInGroup < perms.length}
                          checked={selectedInGroup === perms.length}
                          onChange={(e) => toggleGroup(perms, e.target.checked)}
                          style={{ marginBlockEnd: 8, fontWeight: 600 }}
                        >
                          {t("selectAll")}
                        </Checkbox>
                      )}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {perms.map((p) => (
                          <Checkbox
                            key={p.key}
                            checked={selectedPerms.has(p.key)}
                            onChange={(e) => togglePerm(p.key, e.target.checked)}
                          >
                            {bilingualName(p.nameAr, p.nameEn, isAr)}
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
