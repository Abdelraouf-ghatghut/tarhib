import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

import {
  Card,
  MetricCard,
  createSnowStyles,
  spacing,
  type CatalogProduct,
  type Copy,
  type DashboardStats,
  type Lang,
  type Order,
  type SnowTheme,
} from "@tarhib/mobile-shared";

import { EmptyText, LoadingCard, StatusBadge, ui } from "../../components/ui";
import { formatMinutesUntil, orderCode, productName } from "../../lib/format";

export const DashboardTab = ({
  theme,
  lang,
  copy,
  loading,
  stats,
  ordersCount,
  queueOrders,
  lowStockCount,
  productsById,
}: {
  theme: SnowTheme;
  lang: Lang;
  copy: Copy;
  loading: boolean;
  stats: DashboardStats | undefined;
  ordersCount: number;
  queueOrders: Order[];
  lowStockCount: number;
  productsById: Map<string, CatalogProduct>;
}) => (
  <>
    {loading ? <LoadingCard theme={theme} /> : null}
    {/* Mêmes 4 tons que les cartes stats du dashboard web : brand / rose / vert / violet. */}
    <View style={ui.metricsRow}>
      <MetricCard
        label={copy.todayOrders}
        value={stats?.todayOrders ?? ordersCount}
        icon="cube"
        theme={theme}
        tone="brand"
      />
      <MetricCard
        label={copy.pending}
        value={stats?.pendingCount ?? queueOrders.length}
        icon="time"
        theme={theme}
        tone="danger"
      />
    </View>
    <View style={ui.metricsRow}>
      <MetricCard
        label={copy.deliveredToday}
        value={stats?.deliveredToday ?? 0}
        icon="checkmark-circle"
        theme={theme}
        tone="success"
      />
      <MetricCard
        label={copy.stockAlerts}
        value={lowStockCount}
        icon="warning"
        theme={theme}
        tone="violet"
      />
    </View>
    <Card theme={theme} style={styles.activityCard}>
      <View style={styles.sectionHeader}>
        <Text style={[ui.sectionTitle, { color: theme.text }]}>{copy.liveActivity}</Text>
        <View style={[styles.liveDot, { backgroundColor: theme.success }]} />
      </View>
      {queueOrders.slice(0, 3).map((order) => (
        <MiniQueueRow
          key={order.id}
          theme={theme}
          lang={lang}
          copy={copy}
          order={order}
          productsById={productsById}
        />
      ))}
      {queueOrders.length === 0 ? <EmptyText theme={theme} text={copy.noActiveOrders} /> : null}
    </Card>
  </>
);

const MiniQueueRow = ({
  theme,
  lang,
  copy,
  order,
  productsById,
}: {
  theme: SnowTheme;
  lang: Lang;
  copy: Copy;
  order: Order;
  productsById: Map<string, CatalogProduct>;
}) => {
  const firstLine = order.lines[0];
  return (
    <View style={styles.miniRow}>
      <View style={[styles.miniIcon, { backgroundColor: theme.primarySoft }]}>
        <Ionicons name="receipt-outline" size={17} color={theme.primaryStrong} />
      </View>
      <View style={ui.rowInfo}>
        <Text style={[ui.orderId, { color: theme.text }]}>{orderCode(order.id)}</Text>
        <Text style={[ui.small, { color: theme.muted }]}>
          {firstLine
            ? productName(productsById.get(firstLine.productId), lang, firstLine.productId)
            : copy.order}
          {" - "}
          {formatMinutesUntil(order.slaDeadline, copy)}
        </Text>
      </View>
      <StatusBadge status={order.status} theme={theme} lang={lang} />
    </View>
  );
};

const styles = createSnowStyles({
  activityCard: { gap: spacing.md },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  liveDot: { width: 9, height: 9, borderRadius: 5 },
  miniRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  miniIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
