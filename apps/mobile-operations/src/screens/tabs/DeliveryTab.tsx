import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import {
  Card,
  PrimaryButton,
  createSnowStyles,
  fetchBranches,
  resolveDeliveryIssue,
  transitionDeliveryTask,
  type DeliveryTask,
  type CatalogProduct,
  type Lang,
  type OrganizationBranch,
  type OrganizationCompany,
  type SnowTheme,
} from "@tarhib/mobile-shared";
import { OperationalEmptyState } from "../../components/ui";
import { arOrEn } from "../../lib/format";
import { DeliveryDetailModal } from "../../modals/DeliveryDetailModal";
import { DeliveryIssueReportModal } from "../../modals/DeliveryIssueReportModal";

type Filter = "ALL" | "AVAILABLE" | "MINE";
type DeliveryAction = "accept" | "pickup" | "depart" | "deliver";
export type DeliveryScope = {
  companies: OrganizationCompany[];
  branches: OrganizationBranch[];
  companyId: string | null;
  branchId: string | null;
  canChangeCompany: boolean;
  onCompanyChange: (id: string | null) => void;
  onBranchChange: (id: string | null) => void;
};

export const DeliveryTab = ({
  theme,
  lang,
  tasks,
  loading,
  canManage,
  productsById,
  scope,
}: {
  theme: SnowTheme;
  lang: Lang;
  tasks: DeliveryTask[];
  loading: boolean;
  canManage: boolean;
  productsById: Map<string, CatalogProduct>;
  scope?: DeliveryScope;
}) => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [issueTaskId, setIssueTaskId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [scopePicker, setScopePicker] = useState<"company" | "branch" | null>(null);
  const activeTasks = tasks.filter(
    (task) => !["DELIVERED", "RETURNED", "FAILED"].includes(task.status),
  );
  const mine = activeTasks.filter((task) => task.status !== "AVAILABLE");
  const visible =
    filter === "ALL"
      ? activeTasks
      : filter === "AVAILABLE"
        ? activeTasks.filter((task) => task.status === "AVAILABLE")
        : mine;

  const optimistic = (id: string, status: DeliveryTask["status"], reason?: string) => {
    const snapshot = queryClient.getQueriesData<DeliveryTask[]>({ queryKey: ["delivery-queue"] });
    queryClient.setQueriesData<DeliveryTask[]>({ queryKey: ["delivery-queue"] }, (current) =>
      current?.map((task) =>
        task.id === id ? { ...task, status, issueReason: reason ?? task.issueReason } : task,
      ),
    );
    return snapshot;
  };
  const rollback = (snapshot?: Array<[readonly unknown[], DeliveryTask[] | undefined]>) =>
    snapshot?.forEach(([key, data]) => queryClient.setQueryData(key, data));
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["delivery-queue"] });
  const transition = useMutation({
    mutationFn: ({ id, action }: { id: string; action: DeliveryAction }) =>
      transitionDeliveryTask(id, action),
    onMutate: ({ id, action }) =>
      optimistic(
        id,
        (
          {
            accept: "ASSIGNED",
            pickup: "PICKED_UP",
            depart: "OUT_FOR_DELIVERY",
            deliver: "DELIVERED",
          } as const
        )[action],
      ),
    onError: (_error, _input, context) => rollback(context),
    onSettled: refresh,
  });
  const report = useMutation({
    mutationFn: ({
      id,
      reason,
      description,
    }: {
      id: string;
      reason: string;
      description: string;
    }) => transitionDeliveryTask(id, "issue", reason, description),
    onMutate: ({ id, description }) => optimistic(id, "ISSUE_REPORTED", description),
    onError: (_e, _v, c) => rollback(c),
    onSuccess: () => {
      setIssueTaskId(null);
    },
    onSettled: refresh,
  });
  const resolve = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "resume" | "return" | "fail" }) =>
      resolveDeliveryIssue(id, action),
    onMutate: ({ id, action }) =>
      optimistic(
        id,
        action === "resume" ? "OUT_FOR_DELIVERY" : action === "return" ? "RETURNED" : "FAILED",
      ),
    onError: (_e, _v, c) => rollback(c),
    onSettled: refresh,
  });

  return (
    <>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          {arOrEn(lang, "التوصيلات", "Deliveries")}
        </Text>
        <Pressable onPress={() => scope && setScopeOpen(true)} style={styles.filterIcon}>
          <Ionicons name="filter-outline" size={27} color={theme.text} />
        </Pressable>
      </View>
      <View style={[styles.filters, { borderColor: theme.border }]}>
        <FilterButton
          theme={theme}
          active={filter === "ALL"}
          label={arOrEn(lang, "الكل", "All")}
          count={activeTasks.length}
          onPress={() => setFilter("ALL")}
        />
        <FilterButton
          theme={theme}
          active={filter === "AVAILABLE"}
          label={arOrEn(lang, "متاح", "Available")}
          count={activeTasks.filter((task) => task.status === "AVAILABLE").length}
          onPress={() => setFilter("AVAILABLE")}
        />
        <FilterButton
          theme={theme}
          active={filter === "MINE"}
          label={arOrEn(lang, "مهامي", "My tasks")}
          count={mine.length}
          onPress={() => setFilter("MINE")}
        />
      </View>

      <View style={styles.list}>
        {visible.map((task) => (
          <DeliveryCard
            key={task.id}
            theme={theme}
            lang={lang}
            task={task}
            busy={transition.isPending || report.isPending || resolve.isPending}
            canManage={canManage}
            onOpen={() => setSelectedTaskId(task.id)}
            onOpenIssue={() => setIssueTaskId(task.id)}
            onAction={(action) => transition.mutate({ id: task.id, action })}
            onResolve={(action) => resolve.mutate({ id: task.id, action })}
          />
        ))}
      </View>
      {!loading && !visible.length ? (
        <OperationalEmptyState
          theme={theme}
          title={arOrEn(lang, "لا توجد توصيلات", "No deliveries")}
          text={arOrEn(
            lang,
            "لا توجد مهام توصيل في هذا النطاق.",
            "There are no delivery tasks in this scope.",
          )}
        />
      ) : null}
      <DeliveryDetailModal
        visible={Boolean(selectedTaskId)}
        task={tasks.find((task) => task.id === selectedTaskId) ?? null}
        theme={theme}
        lang={lang}
        productsById={productsById}
        busy={transition.isPending || report.isPending}
        onClose={() => setSelectedTaskId(null)}
        onAction={(action) => selectedTaskId && transition.mutate({ id: selectedTaskId, action })}
        onReport={() => {
          if (selectedTaskId) setIssueTaskId(selectedTaskId);
          setSelectedTaskId(null);
        }}
      />
      <DeliveryIssueReportModal
        visible={Boolean(issueTaskId)}
        task={tasks.find((task) => task.id === issueTaskId) ?? null}
        theme={theme}
        lang={lang}
        busy={report.isPending}
        onClose={() => setIssueTaskId(null)}
        onSubmit={(reason, description) =>
          issueTaskId && report.mutate({ id: issueTaskId, reason, description })
        }
      />
      {scope ? (
        <ScopeFilterModal
          visible={scopeOpen}
          picker={scopePicker}
          theme={theme}
          lang={lang}
          scope={scope}
          onPickerChange={setScopePicker}
          onClose={() => {
            setScopePicker(null);
            setScopeOpen(false);
          }}
        />
      ) : null}
    </>
  );
};

export const ScopeFilterModal = ({
  visible,
  picker,
  theme,
  lang,
  scope,
  onPickerChange,
  onClose,
}: {
  visible: boolean;
  picker: "company" | "branch" | null;
  theme: SnowTheme;
  lang: Lang;
  scope: DeliveryScope;
  onPickerChange: (picker: "company" | "branch" | null) => void;
  onClose: () => void;
}) => {
  const [draftCompanyId, setDraftCompanyId] = useState<string | null>(scope.companyId);
  const [draftBranchId, setDraftBranchId] = useState<string | null>(scope.branchId);
  useEffect(() => {
    if (!visible) return;
    setDraftCompanyId(scope.companyId);
    setDraftBranchId(scope.branchId);
    onPickerChange(null);
  }, [visible]);
  const companies = [
    { id: null, label: arOrEn(lang, "كل الشركات", "All companies") },
    ...scope.companies.map((item) => ({
      id: item.id as string | null,
      label: lang === "ar" ? item.nameAr : item.nameEn,
    })),
  ];
  const draftBranchesQuery = useQuery({
    queryKey: ["scope-filter-branches", draftCompanyId],
    queryFn: () => fetchBranches(draftCompanyId!),
    enabled: Boolean(visible && draftCompanyId),
    staleTime: 300_000,
  });
  const availableBranches =
    draftBranchesQuery.data ?? (draftCompanyId === scope.companyId ? scope.branches : []);
  const branches = [
    { id: null, label: arOrEn(lang, "كل الفروع", "All branches") },
    ...availableBranches.map((item) => ({
      id: item.id as string | null,
      label: lang === "ar" ? item.nameAr : item.nameEn,
    })),
  ];
  const selectedCompany = companies.find((item) => item.id === draftCompanyId)?.label;
  const selectedBranch = branches.find((item) => item.id === draftBranchId)?.label;
  const options = picker === "company" ? companies : branches;
  const selectedId = picker === "company" ? draftCompanyId : draftBranchId;
  const reset = () => {
    setDraftCompanyId(null);
    setDraftBranchId(null);
    onPickerChange(null);
  };
  const apply = () => {
    scope.onCompanyChange(draftCompanyId);
    scope.onBranchChange(draftBranchId);
    onClose();
  };
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.scopeSheet, { backgroundColor: theme.background }]}>
        <View style={styles.scopeHeader}>
          <Pressable onPress={onClose} style={styles.scopeClose}>
            <Ionicons name="close" size={31} color={theme.text} />
          </Pressable>
          <Text style={[styles.scopeTitle, { color: theme.text }]}>
            {picker === "company"
              ? arOrEn(lang, "اختيار الشركة", "Select company")
              : picker === "branch"
                ? arOrEn(lang, "اختيار الفرع", "Select branch")
                : arOrEn(lang, "تصفية", "Filters")}
          </Text>
          <Pressable onPress={reset} style={styles.scopeReset}>
            <Text style={[styles.scopeResetText, { color: theme.primaryStrong }]}>
              {arOrEn(lang, "إعادة تعيين", "Reset")}
            </Text>
          </Pressable>
        </View>
        {picker ? (
          <ScrollView
            style={styles.scopeOptions}
            contentContainerStyle={styles.scopeOptionsContent}
          >
            <Pressable onPress={() => onPickerChange(null)} style={styles.scopePickerBack}>
              <Ionicons
                name={lang === "ar" ? "chevron-forward" : "chevron-back"}
                size={24}
                color={theme.text}
              />
            </Pressable>
            {options.map((option) => {
              const active = option.id === selectedId;
              return (
                <Pressable
                  key={option.id ?? "all"}
                  onPress={() => {
                    if (picker === "company") {
                      setDraftCompanyId(option.id);
                      setDraftBranchId(null);
                    } else setDraftBranchId(option.id);
                    onPickerChange(null);
                  }}
                  style={[styles.scopeOption, { borderBottomColor: theme.border }]}
                >
                  <Text
                    style={[
                      styles.scopeOptionText,
                      { color: active ? theme.primaryStrong : theme.text },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {active ? (
                    <Ionicons name="checkmark" size={20} color={theme.primaryStrong} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.scopeFields}>
            {scope.canChangeCompany ? (
              <ScopeField
                theme={theme}
                lang={lang}
                icon="business-outline"
                label={arOrEn(lang, "الشركة", "Company")}
                placeholder={arOrEn(lang, "اختر الشركة", "Select company")}
                value={selectedCompany}
                onPress={() => onPickerChange("company")}
                onClear={() => {
                  setDraftCompanyId(null);
                  setDraftBranchId(null);
                }}
              />
            ) : null}
            {draftCompanyId ? (
              <ScopeField
                theme={theme}
                lang={lang}
                icon="git-branch-outline"
                label={arOrEn(lang, "الفرع", "Branch")}
                placeholder={arOrEn(lang, "اختر الفرع", "Select branch")}
                value={selectedBranch}
                onPress={() => onPickerChange("branch")}
                onClear={() => setDraftBranchId(null)}
              />
            ) : null}
          </View>
        )}
        {!picker ? (
          <View
            style={[
              styles.scopeActions,
              { borderTopColor: theme.border, backgroundColor: theme.surface },
            ]}
          >
            <Pressable
              onPress={reset}
              style={[styles.scopeClearButton, { borderColor: theme.primaryStrong }]}
            >
              <Text style={[styles.scopeActionText, { color: theme.primaryStrong }]}>
                {arOrEn(lang, "مسح", "Clear")}
              </Text>
            </Pressable>
            <Pressable
              onPress={apply}
              style={[styles.scopeApplyButton, { backgroundColor: theme.primaryStrong }]}
            >
              <Text style={[styles.scopeActionText, { color: "#FFFFFF" }]}>
                {arOrEn(lang, "تطبيق", "Apply")}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
};

const ScopeField = ({
  theme,
  lang,
  icon,
  label,
  placeholder,
  value,
  onPress,
  onClear,
}: {
  theme: SnowTheme;
  lang: Lang;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  placeholder: string;
  value?: string;
  onPress: () => void;
  onClear: () => void;
}) => (
  <View style={[styles.scopeFieldCard, { backgroundColor: theme.surface }]}>
    <View style={[styles.scopeFieldHeading, lang === "ar" && styles.scopeFieldHeadingRtl]}>
      <View style={[styles.scopeFieldIcon, { backgroundColor: theme.primarySoft }]}>
        <Ionicons name={icon} size={27} color={theme.primaryStrong} />
      </View>
      <Text style={[styles.scopeFieldLabel, { color: theme.text }]}>{label}</Text>
    </View>
    <Pressable
      onPress={onPress}
      style={[
        styles.scopeSelect,
        lang === "ar" && styles.scopeSelectRtl,
        { borderColor: theme.border },
      ]}
    >
      <Text style={[styles.scopeSelectText, { color: theme.muted }]}>{placeholder}</Text>
      <Ionicons name="chevron-down" size={25} color={theme.text} />
    </Pressable>
    {value ? (
      <View
        style={[
          styles.scopeSelected,
          lang === "ar" && styles.scopeSelectedRtl,
          { borderColor: `${theme.primaryStrong}35`, backgroundColor: `${theme.primaryStrong}05` },
        ]}
      >
        <View style={styles.scopeCheck}>
          <Ionicons name="checkmark" size={22} color="#FFFFFF" />
        </View>
        <Text numberOfLines={1} style={[styles.scopeSelectedText, { color: theme.text }]}>
          {value}
        </Text>
        <Pressable onPress={onClear} style={styles.scopeRemove}>
          <Ionicons name="close" size={23} color={theme.text} />
        </Pressable>
      </View>
    ) : null}
  </View>
);

const FilterButton = ({
  theme,
  active,
  label,
  count,
  onPress,
}: {
  theme: SnowTheme;
  active: boolean;
  label: string;
  count: number;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={[styles.filter, { backgroundColor: active ? theme.primaryStrong : theme.surfaceAlt }]}
  >
    <Text style={[styles.filterText, { color: active ? "#FFFFFF" : theme.text }]}>{label}</Text>
    <Text style={[styles.filterCount, { color: active ? "#FFFFFF" : theme.text }]}>{count}</Text>
  </Pressable>
);

const DeliveryCard = ({
  theme,
  lang,
  task,
  busy,
  canManage,
  onOpen,
  onOpenIssue,
  onAction,
  onResolve,
}: {
  theme: SnowTheme;
  lang: Lang;
  task: DeliveryTask;
  busy: boolean;
  canManage: boolean;
  onOpen: () => void;
  onOpenIssue: () => void;
  onAction: (action: DeliveryAction) => void;
  onResolve: (action: "resume" | "return" | "fail") => void;
}) => {
  const rank = Number(task.order.priority.replace(/\D/g, "")) || 3;
  const color = rank <= 2 ? "#F04424" : rank === 3 ? theme.primaryStrong : theme.primaryStrong;
  const priority =
    rank <= 2
      ? arOrEn(lang, "مرتفع", "High")
      : rank === 3
        ? arOrEn(lang, "عادي", "Normal")
        : arOrEn(lang, "منخفض", "Low");
  const destination = task.destination;
  const recipient = destination
    ? lang === "ar"
      ? destination.recipientNameAr
      : destination.recipientNameEn
    : "—";
  const location = destination
    ? lang === "ar"
      ? `${destination.branchNameAr}  •  الدور ${destination.floor ?? "—"}  •  مكتب ${destination.officeNumber ?? "—"}`
      : `${destination.branchNameEn}  •  Floor ${destination.floor ?? "—"}  •  Office ${destination.officeNumber ?? "—"}`
    : "—";
  const itemCount = task.order.lines.reduce((sum, line) => sum + line.quantity, 0);
  const minutesLeft = Math.max(
    0,
    Math.ceil((new Date(task.order.slaDeadline).getTime() - Date.now()) / 60_000),
  );
  const next: [DeliveryAction, string] | null =
    task.status === "AVAILABLE"
      ? ["accept", arOrEn(lang, "قبول", "Accept")]
      : task.status === "ASSIGNED"
        ? ["pickup", arOrEn(lang, "استلام", "Pick up")]
        : task.status === "PICKED_UP"
          ? ["depart", arOrEn(lang, "بدء التوصيل", "Start delivery")]
          : task.status === "OUT_FOR_DELIVERY"
            ? ["deliver", arOrEn(lang, "تم التوصيل", "Mark delivered")]
            : null;
  const canReport = ["PICKED_UP", "OUT_FOR_DELIVERY"].includes(task.status);
  return (
    <Card theme={theme} style={styles.card}>
      <Pressable onPress={onOpen} style={styles.cardContent}>
        <View style={[styles.topRow, lang === "ar" && styles.topRowRtl]}>
          <View style={[styles.headingGroup, lang === "ar" && styles.headingGroupRtl]}>
            <Text style={[styles.code, { color: theme.text }]}>
              #D-{task.id.replace(/-/g, "").slice(0, 4).toUpperCase()}
            </Text>
            <View style={[styles.priority, { backgroundColor: `${color}0D` }]}>
              <Text style={[styles.priorityText, { color }]}>{priority}</Text>
            </View>
          </View>
          <View style={[styles.sla, lang === "ar" && styles.slaRtl]}>
            <Ionicons name="time-outline" size={19} color={theme.muted} />
            <Text style={[styles.slaText, { color: theme.muted }]}>
              {arOrEn(lang, `متبقي ${minutesLeft} دقيقة`, `${minutesLeft} min left`)}
            </Text>
          </View>
        </View>
        <View style={[styles.infoRow, lang === "ar" && styles.infoRowRtl]}>
          <Ionicons name="person" size={19} color={theme.text} />
          <Text style={[styles.recipient, lang === "ar" && styles.textRtl, { color: theme.text }]}>
            {recipient}
          </Text>
        </View>
        <View style={[styles.infoRow, lang === "ar" && styles.infoRowRtl]}>
          <Ionicons name="business-outline" size={19} color={theme.muted} />
          <Text
            numberOfLines={1}
            style={[styles.location, lang === "ar" && styles.textRtl, { color: theme.muted }]}
          >
            {location}
          </Text>
        </View>
      </Pressable>
      <View style={[styles.bottomRow, lang === "ar" && styles.bottomRowRtl]}>
        <View style={[styles.infoRow, lang === "ar" && styles.itemsRtl]}>
          <Ionicons name="cube-outline" size={20} color={theme.muted} />
          <Text style={[styles.items, { color: theme.muted }]}>
            {itemCount} {arOrEn(lang, "عناصر", "items")}
          </Text>
        </View>
        {next && !canReport ? (
          <View style={[styles.action, lang === "ar" && styles.actionRtl]}>
            <PrimaryButton
              theme={theme}
              label={next[1]}
              disabled={busy}
              onPress={() => onAction(next[0])}
            />
          </View>
        ) : null}
      </View>
      {next && canReport ? (
        <View style={styles.cardPrimaryAction}>
          <PrimaryButton
            theme={theme}
            label={next[1]}
            disabled={busy}
            onPress={() => onAction(next[0])}
          />
        </View>
      ) : null}
      {canReport ? (
        <Pressable
          onPress={onOpenIssue}
          style={[styles.issueLink, { backgroundColor: theme.danger }]}
        >
          <Text style={styles.issueLinkText}>
            {arOrEn(lang, "الإبلاغ عن مشكلة", "Report an issue")}
          </Text>
        </Pressable>
      ) : null}
      {canManage && task.status === "ISSUE_REPORTED" ? (
        <View style={styles.issueForm}>
          <Text style={{ color: theme.danger }}>{task.issueReason}</Text>
          <PrimaryButton
            theme={theme}
            label={arOrEn(lang, "استئناف", "Resume")}
            disabled={busy}
            onPress={() => onResolve("resume")}
          />
          <View style={styles.manager}>
            <Pressable onPress={() => onResolve("return")}>
              <Text style={{ color: theme.warning }}>{arOrEn(lang, "إرجاع", "Return")}</Text>
            </Pressable>
            <Pressable onPress={() => onResolve("fail")}>
              <Text style={{ color: theme.danger }}>{arOrEn(lang, "فشل", "Fail")}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </Card>
  );
};

const styles = createSnowStyles({
  header: {
    height: 90,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 27, fontWeight: "700" },
  filterIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  filters: {
    height: 52,
    borderWidth: 1,
    borderRadius: 11,
    flexDirection: "row",
    overflow: "hidden",
    marginBottom: 22,
  },
  filter: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: "rgba(148,163,184,0.22)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 11,
  },
  filterText: { fontSize: 13, fontWeight: "600" },
  filterCount: { fontSize: 13, fontWeight: "600" },
  list: { gap: 16, paddingBottom: 10 },
  card: { minHeight: 198, padding: 16, gap: 16, borderRadius: 13 },
  cardContent: { gap: 17 },
  topRow: { position: "relative", minHeight: 34, flexDirection: "row", alignItems: "center" },
  topRowRtl: { paddingLeft: 120 },
  headingGroup: { flexDirection: "row", alignItems: "center", gap: 10 },
  headingGroupRtl: {
    position: "absolute",
    right: 0,
    flexDirection: "row-reverse",
    direction: "ltr",
  },
  code: { fontSize: 20, fontWeight: "700" },
  priority: {
    minHeight: 32,
    borderRadius: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  priorityText: { fontSize: 12, fontWeight: "600" },
  sla: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 6 },
  slaRtl: {
    position: "absolute",
    left: 0,
    marginLeft: 0,
    flexDirection: "row-reverse",
    direction: "ltr",
  },
  slaText: { fontSize: 12 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoRowRtl: { flexDirection: "row-reverse", direction: "ltr", justifyContent: "flex-start" },
  textRtl: { textAlign: "right", writingDirection: "rtl" },
  recipient: { fontSize: 14, fontWeight: "700" },
  location: { flex: 1, fontSize: 12 },
  bottomRow: {
    position: "relative",
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bottomRowRtl: { justifyContent: "flex-start" },
  itemsRtl: { position: "absolute", right: 0, flexDirection: "row-reverse", direction: "ltr" },
  items: { fontSize: 12 },
  action: { width: 100 },
  actionRtl: { position: "absolute", left: 0, width: 76 },
  cardPrimaryAction: { width: "100%" },
  issueLink: {
    width: "100%",
    minHeight: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  issueLinkText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  issueForm: { gap: 10 },
  input: { minHeight: 80, borderWidth: 1, borderRadius: 9, padding: 10, textAlignVertical: "top" },
  cancel: { minHeight: 38, alignItems: "center", justifyContent: "center" },
  manager: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  scopeSheet: { flex: 1 },
  scopeHeader: {
    height: 90,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.22)",
    flexDirection: "row",
    direction: "ltr",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scopeTitle: {
    position: "absolute",
    left: 95,
    right: 95,
    textAlign: "center",
    fontSize: 25,
    lineHeight: 34,
    fontWeight: "700",
  },
  scopeClose: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  scopeReset: { minWidth: 90, minHeight: 48, alignItems: "flex-end", justifyContent: "center" },
  scopeResetText: { fontSize: 16, lineHeight: 23, fontWeight: "600" },
  scopeFields: { flex: 1, paddingHorizontal: 26, paddingTop: 26, paddingBottom: 125, gap: 28 },
  scopeFieldCard: { borderRadius: 18, padding: 24, gap: 18 },
  scopeFieldHeading: { flexDirection: "row", alignItems: "center", gap: 14 },
  scopeFieldHeadingRtl: { flexDirection: "row-reverse", justifyContent: "flex-start" },
  scopeFieldIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  scopeFieldLabel: { fontSize: 22, lineHeight: 31, fontWeight: "600" },
  scopeSelect: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scopeSelectRtl: { flexDirection: "row-reverse" },
  scopeSelectText: { fontSize: 17, lineHeight: 24 },
  scopeSelected: {
    minHeight: 62,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  scopeSelectedRtl: { flexDirection: "row-reverse" },
  scopeCheck: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#0B8F48",
    alignItems: "center",
    justifyContent: "center",
  },
  scopeSelectedText: { flex: 1, fontSize: 16, lineHeight: 23, textAlign: "center" },
  scopeRemove: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  scopeActions: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 112,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 24,
    borderTopWidth: 1,
    flexDirection: "row",
    direction: "ltr",
    gap: 12,
  },
  scopeClearButton: {
    flex: 1,
    minHeight: 62,
    borderWidth: 1.5,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
  },
  scopeApplyButton: {
    flex: 1,
    minHeight: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
  },
  scopeActionText: { fontSize: 19, lineHeight: 27, fontWeight: "700" },
  scopeOptions: { flex: 1 },
  scopeOptionsContent: { paddingHorizontal: 26, paddingVertical: 22 },
  scopePickerBack: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  scopeOption: {
    minHeight: 62,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scopeOptionText: { flex: 1, fontSize: 16, lineHeight: 23, fontWeight: "500" },
});
