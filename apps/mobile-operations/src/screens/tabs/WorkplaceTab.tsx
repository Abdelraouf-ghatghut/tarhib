import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";
import {
  Card,
  createSnowStyles,
  spacing,
  type Lang,
  type Order,
  type SnowTheme,
} from "@tarhib/mobile-shared";
import { arOrEn } from "../../lib/format";
import { ScopeFilterModal, type DeliveryScope } from "./DeliveryTab";

export const WorkplaceTab = ({
  theme,
  lang,
  employeeName,
  activeOrders,
  readyOrders,
  lowStockCount,
  onOpenKitchen,
  onOpenDelivery,
  onOpenStock,
  onOpenIncidents,
  incidentsCount = 0,
  onOpenMessages,
  unreadMessages = 0,
  scope,
}: {
  theme: SnowTheme;
  lang: Lang;
  employeeName: string;
  activeOrders: Order[];
  readyOrders: Order[];
  lowStockCount: number;
  onOpenKitchen?: () => void;
  onOpenDelivery?: () => void;
  onOpenStock?: () => void;
  onOpenIncidents?: () => void;
  incidentsCount?: number;
  onOpenMessages?: () => void;
  unreadMessages?: number;
  scope?: DeliveryScope;
}) => {
  const [scopeOpen, setScopeOpen] = React.useState(false);
  const [scopePicker, setScopePicker] = React.useState<"company" | "branch" | null>(null);
  const firstName = employeeName.trim().split(/\s+/)[0] || employeeName;
  const inProgress = activeOrders.filter((order) => order.status === "IN_PROGRESS").length;
  const total = activeOrders.reduce(
    (sum, order) => sum + order.lines.reduce((count, line) => count + line.quantity, 0),
    0,
  );
  return (
    <>
      <View style={[styles.hero, lang === "ar" && styles.rtlBlock]}>
        <Text style={[styles.greeting, { color: theme.text }]}>
          {arOrEn(lang, "صباح الخير،", "Good morning,")}
        </Text>
        <Text style={[styles.name, { color: theme.text }]}>{firstName} 👋</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>
          {arOrEn(
            lang,
            "إليك ما يحتاج إلى اهتمامك اليوم.",
            "Here’s what needs your attention today.",
          )}
        </Text>
      </View>

      <View style={styles.overviewHeader}>
        <Text
          style={[
            styles.section,
            styles.overviewTitle,
            lang === "ar" && styles.rtlText,
            { color: theme.text },
          ]}
        >
          {arOrEn(lang, "نظرة عامة", "Overview")}
        </Text>
        {scope ? (
          <Pressable onPress={() => setScopeOpen(true)} style={styles.overviewFilter}>
            <Ionicons name="filter-outline" size={24} color={theme.text} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.metrics}>
        <Metric
          theme={theme}
          lang={lang}
          icon="briefcase-outline"
          color="#0B9A4B"
          value={activeOrders.length}
          label={arOrEn(lang, "طلبات للتحضير", "Orders to prepare")}
        />
        <Metric
          theme={theme}
          lang={lang}
          icon="time-outline"
          color="#1769D2"
          value={inProgress}
          label={arOrEn(lang, "قيد التحضير", "In progress")}
        />
        <Metric
          theme={theme}
          lang={lang}
          icon="warning-outline"
          color="#F27A12"
          value={lowStockCount}
          label={arOrEn(lang, "تنبيهات المخزون", "Stock alerts")}
        />
        <Metric
          theme={theme}
          lang={lang}
          icon="clipboard-outline"
          color="#111827"
          value={total}
          label={arOrEn(lang, "إجمالي العناصر", "Total items")}
        />
      </View>

      <Text
        style={[
          styles.section,
          styles.actionsTitle,
          lang === "ar" && styles.rtlText,
          { color: theme.text },
        ]}
      >
        {arOrEn(lang, "إجراءات سريعة", "Quick actions")}
      </Text>
      <View style={styles.actions}>
        {onOpenKitchen ? (
          <Action
            theme={theme}
            lang={lang}
            icon="list-outline"
            color="#6938EF"
            label={arOrEn(lang, "فتح قائمة المطبخ", "Open kitchen queue")}
            detail={`${activeOrders.length} ${arOrEn(lang, "طلب", "orders")}`}
            onPress={onOpenKitchen}
          />
        ) : null}
        {!onOpenKitchen && onOpenDelivery ? (
          <Action
            theme={theme}
            lang={lang}
            icon="car-outline"
            color="#1769D2"
            label={arOrEn(lang, "فتح التوصيلات", "Open deliveries")}
            detail={`${readyOrders.length} ${arOrEn(lang, "مهمة", "tasks")}`}
            onPress={onOpenDelivery}
          />
        ) : null}
        {onOpenStock ? (
          <Action
            theme={theme}
            lang={lang}
            icon="cube-outline"
            color="#111827"
            label={arOrEn(lang, "عرض المخزون", "View stock")}
            detail={`${lowStockCount} ${arOrEn(lang, "تنبيه", "alerts")}`}
            onPress={onOpenStock}
          />
        ) : null}
        {onOpenIncidents ? (
          <Action
            theme={theme}
            lang={lang}
            icon="alert-circle"
            color="#F11B28"
            label={arOrEn(lang, "حوادثي", "My incidents")}
            detail={`${incidentsCount} ${arOrEn(lang, "مفتوح", "open")}`}
            onPress={onOpenIncidents}
          />
        ) : null}
        {onOpenMessages ? (
          <Action
            theme={theme}
            lang={lang}
            icon="chatbox-ellipses-outline"
            color="#F11B28"
            label={arOrEn(lang, "الرسائل", "Messages")}
            detail={`${unreadMessages} ${arOrEn(lang, "غير مقروء", "unread")}`}
            onPress={onOpenMessages}
          />
        ) : null}
      </View>
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

const Metric = ({
  theme,
  lang,
  icon,
  color,
  value,
  label,
}: {
  theme: SnowTheme;
  lang: Lang;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  value: number;
  label: string;
}) => (
  <Card theme={theme} style={styles.metric}>
    <View style={[styles.metricIcon, { backgroundColor: `${color}0D` }]}>
      <Ionicons name={icon} size={23} color={color} />
    </View>
    <View style={[styles.metricCopy, lang === "ar" && styles.metricCopyRtl]}>
      <Text
        style={[styles.metricValue, lang === "ar" && styles.metricTextRtl, { color: theme.text }]}
      >
        {value}
      </Text>
      <Text
        numberOfLines={2}
        style={[styles.metricLabel, lang === "ar" && styles.metricTextRtl, { color: theme.muted }]}
      >
        {label}
      </Text>
    </View>
  </Card>
);

const Action = ({
  theme,
  lang,
  icon,
  color,
  label,
  detail,
  onPress,
}: {
  theme: SnowTheme;
  lang: Lang;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  detail: string;
  onPress: () => void;
}) => (
  <Pressable onPress={onPress}>
    <Card theme={theme} style={styles.action}>
      <View style={[styles.actionIcon, { backgroundColor: `${color}0D` }]}>
        <Ionicons name={icon} size={23} color={color} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={[styles.actionLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.actionDetail, { color: theme.muted }]}>{detail}</Text>
      </View>
      <Ionicons
        name={lang === "ar" ? "chevron-back" : "chevron-forward"}
        size={21}
        color={theme.muted}
      />
    </Card>
  </Pressable>
);

const styles = createSnowStyles({
  hero: { paddingTop: 6, paddingBottom: 30 },
  rtlBlock: { alignItems: "flex-end" },
  rtlText: { textAlign: "right", writingDirection: "rtl" },
  greeting: { width: "100%", fontSize: 28, lineHeight: 36, fontWeight: "700", textAlign: "right" },
  name: { width: "100%", fontSize: 30, lineHeight: 38, fontWeight: "700", textAlign: "right" },
  subtitle: { width: "100%", fontSize: 14, lineHeight: 21, marginTop: 14, textAlign: "right" },
  section: { fontSize: 18, lineHeight: 25, fontWeight: "700", marginBottom: 14 },
  overviewHeader: { position: "relative", minHeight: 42, justifyContent: "center" },
  overviewTitle: { width: "100%" },
  overviewFilter: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metric: {
    width: "48.5%",
    minHeight: 90,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
  },
  metricIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  metricCopy: { flex: 1, gap: 2 },
  metricCopyRtl: { alignItems: "flex-end" },
  metricTextRtl: { width: "100%", textAlign: "right", writingDirection: "rtl" },
  metricValue: { fontSize: 23, lineHeight: 27, fontWeight: "700" },
  metricLabel: { fontSize: 12, lineHeight: 16 },
  actionsTitle: { marginTop: 30, marginBottom: 12 },
  actions: { gap: 8, paddingBottom: spacing.lg },
  action: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCopy: { flex: 1 },
  actionLabel: { fontSize: 14, lineHeight: 18, fontWeight: "700" },
  actionDetail: { fontSize: 12, lineHeight: 16, marginTop: 3 },
});
