import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";

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
  screenTitle: { fontSize: 22, lineHeight: 29, fontWeight: "700" },
  sectionTitle: { fontSize: 15, lineHeight: 21, fontWeight: "600" },
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
  roleLabel,
  unreadNotifications,
  onOpenNotifications,
}: {
  theme: SnowTheme;
  copy: Copy;
  employeeName: string;
  roleLabel?: string;
  unreadNotifications?: number;
  onOpenNotifications?: () => void;
}) => (
  <View style={styles.header}>
    <View style={styles.agentRow}>
      <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
        <Ionicons name="person" size={27} color={theme.primaryStrong} />
      </View>
      <View style={styles.identityCopy}>
        <Text style={[styles.greeting, { color: theme.muted }]}>Hello 👋</Text>
        <View style={styles.identityNameRow}>
          <Text style={[styles.headerName, { color: theme.text }]}>{employeeName}</Text>
          <Ionicons name="chevron-down" size={15} color={theme.text} />
        </View>
        <Text style={[styles.context, { color: theme.muted }]}>{roleLabel ?? copy.operations}</Text>
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

export const OperationalEmptyState = ({
  theme,
  title,
  text,
}: {
  theme: SnowTheme;
  title: string;
  text?: string;
}) => (
  <View style={styles.operationalEmpty}>
    <Image
      source={require("../assets/shopping_bag.png")}
      resizeMode="contain"
      style={styles.operationalEmptyImage}
    />
    <Text style={[styles.operationalEmptyTitle, { color: theme.text }]}>{title}</Text>
    {text ? (
      <Text style={[styles.operationalEmptyText, { color: theme.muted }]}>{text}</Text>
    ) : null}
  </View>
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
    paddingTop: 28,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  agentRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  identityCopy: { flexShrink: 1, alignItems: "flex-start" },
  identityNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: { display: "none" },
  headerName: { fontSize: 17, fontWeight: "700" },
  context: { fontSize: 13, fontWeight: "400", marginTop: 3 },
  centeredTitle: {
    minHeight: 76,
    paddingTop: 24,
    paddingBottom: spacing.md,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  loadingCard: { minHeight: 64, alignItems: "center", justifyContent: "center" },
  emptyCard: { minHeight: 74, alignItems: "center", justifyContent: "center" },
  operationalEmpty: {
    minHeight: 360,
    paddingVertical: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  operationalEmptyImage: { width: 230, height: 230, marginBottom: -12 },
  operationalEmptyTitle: { fontSize: 20, lineHeight: 28, fontWeight: "700", textAlign: "center" },
  operationalEmptyText: { maxWidth: 290, fontSize: 13, lineHeight: 20, textAlign: "center" },
  settingsRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  bellButton: {
    position: "relative",
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
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
