import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import {
  Card,
  IconBubble,
  createSnowStyles,
  directionalIcon,
  orderStatusLabel,
  priorityLabel,
  priorityRank,
  spacing,
  type Copy,
  type Lang,
  type OrderStatus,
  type SnowTheme,
} from "@tarhib/mobile-shared";

export type IconName = keyof typeof Ionicons.glyphMap;

/** Styles transverses (typo, badges, lignes) partagés entre les onglets Operations. */
export const ui = createSnowStyles({
  screenTitle: { fontSize: 20, fontWeight: "700" },
  sectionTitle: { fontSize: 14, fontWeight: "600" },
  orderId: { fontSize: 15, fontWeight: "600" },
  small: { fontSize: 12, fontWeight: "400" },
  badge: { borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  badgeText: { fontSize: 11, fontWeight: "600" },
  rowInfo: { flex: 1, gap: spacing.xs },
  chips: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  metricsRow: { flexDirection: "row", gap: spacing.sm },
});

export const OpsHeader = ({
  theme,
  copy,
  employeeName,
  unreadNotifications,
  onOpenNotifications,
}: {
  theme: SnowTheme;
  copy: Copy;
  employeeName: string;
  unreadNotifications?: number;
  onOpenNotifications?: () => void;
}) => (
  <View style={styles.header}>
    <View style={styles.agentRow}>
      <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
        <Ionicons name="shield-checkmark" size={24} color={theme.primaryStrong} />
      </View>
      <View>
        <Text style={[styles.headerName, { color: theme.text }]}>{copy.operations}</Text>
        <Text style={[ui.small, { color: theme.muted }]}>{employeeName}</Text>
      </View>
    </View>
    <Pressable onPress={onOpenNotifications} style={styles.bellButton}>
      <IconBubble icon="notifications-outline" theme={theme} />
      {unreadNotifications ? (
        <View
          style={[
            styles.bellBadge,
            { backgroundColor: theme.danger, borderColor: theme.background },
          ]}
        >
          <Text style={styles.bellBadgeText}>
            {unreadNotifications > 9 ? "9+" : unreadNotifications}
          </Text>
        </View>
      ) : null}
    </Pressable>
  </View>
);

export const CenteredTitle = ({ title, theme }: { title: string; theme: SnowTheme }) => (
  <View style={styles.centeredTitle}>
    <Text style={[ui.screenTitle, { color: theme.text }]}>{title}</Text>
  </View>
);

export const LoadingCard = ({ theme }: { theme: SnowTheme }) => (
  <Card theme={theme} style={styles.loadingCard}>
    <ActivityIndicator color={theme.primaryStrong} />
  </Card>
);

export const EmptyText = ({ theme, text }: { theme: SnowTheme; text: string }) => (
  <Card theme={theme} style={styles.emptyCard}>
    <Text style={[ui.small, { color: theme.muted }]}>{text}</Text>
  </Card>
);

export const StatusBadge = ({
  status,
  theme,
  lang,
}: {
  status: OrderStatus;
  theme: SnowTheme;
  lang: Lang;
}) => {
  const color =
    status === "READY"
      ? theme.success
      : status === "IN_PROGRESS"
        ? theme.warning
        : theme.primaryStrong;
  return (
    <View style={[ui.badge, { backgroundColor: `${color}16` }]}>
      <Text style={[ui.badgeText, { color }]}>{orderStatusLabel(status, lang)}</Text>
    </View>
  );
};

/** P1/P2 = urgent (rouge), P3 = normal (orange), P4/P5 = standard (gris). */
export const PriorityBadge = ({
  priority,
  theme,
  lang,
}: {
  priority: string;
  theme: SnowTheme;
  lang: Lang;
}) => {
  const rank = priorityRank(priority);
  const color = rank <= 2 ? theme.danger : rank === 3 ? theme.warning : theme.muted;
  return (
    <View style={[ui.badge, { backgroundColor: `${color}16` }]}>
      <Text style={[ui.badgeText, { color }]}>{priorityLabel(priority, lang)}</Text>
    </View>
  );
};

export const SettingsRow = ({
  theme,
  icon,
  title,
  subtitle,
  onPress,
}: {
  theme: SnowTheme;
  icon: IconName;
  title: string;
  subtitle: string;
  onPress?: () => void;
}) => (
  <Pressable onPress={onPress}>
    <Card theme={theme} style={styles.settingsRow}>
      <IconBubble icon={icon} theme={theme} />
      <View style={ui.rowInfo}>
        <Text style={[ui.orderId, { color: theme.text }]}>{title}</Text>
        <Text style={[ui.small, { color: theme.muted }]}>{subtitle}</Text>
      </View>
      <Ionicons name={directionalIcon("chevron-forward")} size={18} color={theme.muted} />
    </Card>
  </Pressable>
);

const styles = createSnowStyles({
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  agentRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerName: { fontSize: 16, fontWeight: "600" },
  centeredTitle: { paddingTop: spacing.lg, alignItems: "center" },
  loadingCard: { minHeight: 64, alignItems: "center", justifyContent: "center" },
  emptyCard: { minHeight: 74, alignItems: "center", justifyContent: "center" },
  settingsRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  bellButton: { position: "relative" },
  bellBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadgeText: { fontSize: 10, fontWeight: "700", color: "#FFFFFF" },
});
