import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";
import {
  Card,
  MetricCard,
  createSnowStyles,
  spacing,
  type Lang,
  type Order,
  type SnowTheme,
} from "@tarhib/mobile-shared";
import { ui } from "../../components/ui";
import { arOrEn } from "../../lib/format";

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
}) => (
  <>
    <View style={styles.heading}>
      <Text style={[styles.eyebrow, { color: theme.muted }]}>
        {arOrEn(lang, "عملي", "MY WORK")}
      </Text>
      <Text style={[styles.title, { color: theme.text }]}>
        {arOrEn(lang, `مرحباً، ${employeeName}`, `Hello, ${employeeName}`)}
      </Text>
      <Text style={[ui.small, { color: theme.muted }]}>
        {arOrEn(
          lang,
          "هذه هي المهام التي تحتاج إلى اهتمامك الآن.",
          "Here is what needs your attention now.",
        )}
      </Text>
    </View>
    <View style={ui.metricsRow}>
      <MetricCard
        label={arOrEn(lang, "للتحضير", "To prepare")}
        value={activeOrders.length}
        icon="restaurant-outline"
        theme={theme}
        tone="brand"
      />
      <MetricCard
        label={arOrEn(lang, "للتوصيل", "To deliver")}
        value={readyOrders.length}
        icon="bicycle-outline"
        theme={theme}
        tone="success"
      />
    </View>
    <MetricCard
      label={arOrEn(lang, "تنبيهات المخزون", "Stock alerts")}
      value={lowStockCount}
      icon="warning-outline"
      theme={theme}
      tone="danger"
    />
    <Text style={[ui.sectionTitle, { color: theme.text }]}>
      {arOrEn(lang, "الإجراءات ذات الأولوية", "Priority actions")}
    </Text>
    <View style={styles.actions}>
      {onOpenKitchen ? (
        <WorkAction
          theme={theme}
          icon="restaurant-outline"
          label={arOrEn(lang, "فتح قائمة المطبخ", "Open kitchen queue")}
          count={activeOrders.length}
          onPress={onOpenKitchen}
        />
      ) : null}
      {onOpenDelivery ? (
        <WorkAction
          theme={theme}
          icon="bicycle-outline"
          label={arOrEn(lang, "عرض الطلبات الجاهزة للتوصيل", "View ready deliveries")}
          count={readyOrders.length}
          onPress={onOpenDelivery}
        />
      ) : null}
      {onOpenStock && lowStockCount > 0 ? (
        <WorkAction
          theme={theme}
          icon="warning-outline"
          label={arOrEn(lang, "معالجة تنبيهات المخزون", "Handle stock alerts")}
          count={lowStockCount}
          onPress={onOpenStock}
          danger
        />
      ) : null}
    </View>
  </>
);

const WorkAction = ({
  theme,
  icon,
  label,
  count,
  onPress,
  danger,
}: {
  theme: SnowTheme;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  count: number;
  onPress: () => void;
  danger?: boolean;
}) => {
  const color = danger ? theme.danger : theme.primaryStrong;
  return (
    <Pressable onPress={onPress}>
      <Card
        theme={theme}
        style={[styles.action, { borderColor: theme.border, backgroundColor: theme.surface }]}
      >
        <View style={[styles.icon, { backgroundColor: `${color}14` }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <Text style={[ui.orderId, styles.actionLabel, { color: theme.text }]}>{label}</Text>
        <View style={[styles.count, { backgroundColor: `${color}14` }]}>
          <Text style={[ui.badgeText, { color }]}>{count}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.muted} />
      </Card>
    </Pressable>
  );
};

const styles = createSnowStyles({
  heading: { gap: spacing.xs, paddingVertical: spacing.md },
  eyebrow: { fontSize: 11, fontWeight: "600", letterSpacing: 1.2 },
  title: { fontSize: 24, fontWeight: "700" },
  actions: { gap: spacing.sm },
  action: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  actionLabel: { flex: 1 },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  count: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
