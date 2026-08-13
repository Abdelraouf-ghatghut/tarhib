import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import {
  Card,
  MetricCard,
  createSnowStyles,
  spacing,
  type CatalogProduct,
  type Copy,
  type DashboardStats,
  type DeliveryTask,
  type Lang,
  type Order,
  type SnowTheme,
} from "@tarhib/mobile-shared";

import { CenteredTitle, EmptyText, LoadingCard, StatusBadge, ui } from "../../components/ui";
import { arOrEn } from "../../lib/format";
import { formatMinutesUntil, orderCode, productName } from "../../lib/format";

export const DashboardTab = ({
  theme,
  lang,
  copy,
  loading,
  stats,
  ordersCount,
  queueOrders,
  pendingOrders,
  deliveryTasks,
  lowStockCount,
  productsById,
  canReview,
  reviewBusy,
  onApprove,
  onReject,
}: {
  theme: SnowTheme;
  lang: Lang;
  copy: Copy;
  loading: boolean;
  stats: DashboardStats | undefined;
  ordersCount: number;
  queueOrders: Order[];
  pendingOrders: Order[];
  deliveryTasks: DeliveryTask[];
  lowStockCount: number;
  productsById: Map<string, CatalogProduct>;
  canReview: boolean;
  reviewBusy: boolean;
  onApprove: (orderId: string) => void;
  onReject: (orderId: string, reason: string) => void;
}) => {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const now = Date.now();
  const slaExceptions = queueOrders.filter(
    (order) => new Date(order.slaDeadline).getTime() - now <= 15 * 60_000,
  );
  const deliveryIssues = deliveryTasks.filter((task) => task.status === "ISSUE_REPORTED");
  return (
    <>
      <CenteredTitle title={arOrEn(lang, "لوحة المتابعة", "Dashboard")} theme={theme} />
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
      <Card theme={theme} style={styles.supervisorCard}>
        <View style={styles.sectionHeader}>
          <Text style={[ui.sectionTitle, { color: theme.text }]}>لوحة إشراف الضيافة</Text>
          <Ionicons name="shield-checkmark-outline" size={22} color={theme.primaryStrong} />
        </View>
        <View style={styles.loadRow}>
          <LoadMetric label="بانتظار الموافقة" value={pendingOrders.length} color={theme.warning} />
          <LoadMetric label="حمل المطبخ" value={queueOrders.length} color={theme.primaryStrong} />
          <LoadMetric label="حمل التوصيل" value={deliveryTasks.length} color={theme.success} />
        </View>
        {(lowStockCount > 0 || slaExceptions.length > 0 || deliveryIssues.length > 0) && (
          <View style={[styles.alertBox, { backgroundColor: `${theme.danger}12` }]}>
            <Text style={[styles.alertTitle, { color: theme.danger }]}>
              استثناءات تتطلب الانتباه
            </Text>
            <Text style={[styles.alertText, { color: theme.text }]}>
              مخزون منخفض: {lowStockCount}
            </Text>
            <Text style={[styles.alertText, { color: theme.text }]}>
              SLA قريب أو متجاوز: {slaExceptions.length}
            </Text>
            <Text style={[styles.alertText, { color: theme.text }]}>
              مشكلات توصيل: {deliveryIssues.length}
            </Text>
          </View>
        )}
        {pendingOrders.slice(0, 5).map((order) => (
          <View key={order.id} style={[styles.reviewRow, { borderColor: theme.border }]}>
            <View style={ui.rowInfo}>
              <Text style={[ui.orderId, { color: theme.text }]}>{orderCode(order.id)}</Text>
              <Text style={[ui.small, { color: theme.muted }]}>
                {formatMinutesUntil(order.slaDeadline, copy)}
              </Text>
            </View>
            {canReview && rejectingId !== order.id ? (
              <View style={styles.reviewActions}>
                <Pressable
                  disabled={reviewBusy}
                  onPress={() => onApprove(order.id)}
                  style={[styles.reviewButton, { backgroundColor: theme.success }]}
                >
                  <Text style={styles.reviewButtonText}>موافقة</Text>
                </Pressable>
                <Pressable
                  disabled={reviewBusy}
                  onPress={() => setRejectingId(order.id)}
                  style={[styles.reviewButton, { backgroundColor: theme.danger }]}
                >
                  <Text style={styles.reviewButtonText}>رفض</Text>
                </Pressable>
              </View>
            ) : null}
            {canReview && rejectingId === order.id ? (
              <View style={styles.rejectBox}>
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  placeholder="سبب الرفض إلزامي"
                  placeholderTextColor={theme.muted}
                  style={[styles.reasonInput, { borderColor: theme.border, color: theme.text }]}
                />
                <Pressable
                  disabled={reviewBusy || !reason.trim()}
                  onPress={() => {
                    onReject(order.id, reason);
                    setReason("");
                    setRejectingId(null);
                  }}
                  style={[
                    styles.confirmReject,
                    { backgroundColor: reason.trim() ? theme.danger : theme.border },
                  ]}
                >
                  <Text style={styles.reviewButtonText}>تأكيد الرفض</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ))}
        {!pendingOrders.length ? (
          <EmptyText theme={theme} text="لا توجد طلبات بانتظار الموافقة" />
        ) : null}
      </Card>
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
};

const LoadMetric = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <View style={styles.loadMetric}>
    <Text style={[styles.loadValue, { color }]}>{value}</Text>
    <Text style={styles.loadLabel}>{label}</Text>
  </View>
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
  activityCard: { gap: spacing.md, borderRadius: 13, marginTop: spacing.sm },
  supervisorCard: { gap: 16, borderRadius: 13, marginTop: 12 },
  loadRow: { flexDirection: "row", gap: 8 },
  loadMetric: { flex: 1, minHeight: 76, alignItems: "center", justifyContent: "center", gap: 4 },
  loadValue: { fontSize: 24, fontWeight: "700" },
  loadLabel: { fontSize: 11, color: "#64748B", textAlign: "center" },
  alertBox: { borderRadius: 12, padding: 16, gap: 6 },
  alertTitle: { fontSize: 14, fontWeight: "700" },
  alertText: { fontSize: 13 },
  reviewRow: { borderTopWidth: 1, paddingTop: 12, gap: 12 },
  reviewActions: { flexDirection: "row", gap: 8 },
  reviewButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  rejectBox: { gap: 8 },
  reasonInput: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 12,
    textAlign: "right",
  },
  confirmReject: { minHeight: 44, borderRadius: 9, alignItems: "center", justifyContent: "center" },
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
