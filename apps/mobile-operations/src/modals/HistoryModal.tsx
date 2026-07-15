import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  Card,
  MetricCard,
  createSnowStyles,
  directionalIcon,
  orderStatusLabel,
  spacing,
  type Copy,
  type Lang,
  type Order,
  type SnowTheme,
} from "@tarhib/mobile-shared";

import { ui } from "../components/ui";
import { formatDateTime, orderCode } from "../lib/format";

/**
 * Historique/Performance — calculé côté client à partir des commandes déjà
 * chargées (operations-orders, cf. OperationsApp.tsx) : pas de nouvel
 * endpoint backend, on ne fait que filtrer/agréger ce qui est déjà là.
 */
export const HistoryModal = ({
  visible,
  theme,
  lang,
  copy,
  orders,
  onClose,
}: {
  visible: boolean;
  theme: SnowTheme;
  lang: Lang;
  copy: Copy;
  orders: Order[];
  onClose: () => void;
}) => {
  const { delivered, rejected, onTimeRate } = useMemo(() => {
    const delivered = orders
      .filter((o) => o.status === "DELIVERED")
      .sort(
        (a, b) => new Date(b.deliveredAt ?? 0).getTime() - new Date(a.deliveredAt ?? 0).getTime(),
      );
    const rejected = orders
      .filter((o) => o.status === "REJECTED")
      .sort(
        (a, b) => new Date(b.rejectedAt ?? 0).getTime() - new Date(a.rejectedAt ?? 0).getTime(),
      );
    const onTime = delivered.filter(
      (o) =>
        o.deliveredAt && new Date(o.deliveredAt).getTime() <= new Date(o.slaDeadline).getTime(),
    );
    const onTimeRate = delivered.length ? Math.round((onTime.length / delivered.length) * 100) : 0;
    return { delivered, rejected, onTimeRate };
  }, [orders]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView
        edges={["top", "bottom"]}
        style={[styles.root, { backgroundColor: theme.background }]}
      >
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            style={[styles.roundButton, { backgroundColor: theme.surface }]}
          >
            <Ionicons name={directionalIcon("arrow-back")} size={20} color={theme.text} />
          </Pressable>
          <Text style={[ui.screenTitle, { color: theme.text }]}>{copy.history}</Text>
          <View style={styles.roundButtonPlaceholder} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={ui.metricsRow}>
            <MetricCard
              label={copy.totalDelivered}
              value={delivered.length}
              icon="checkmark-circle-outline"
              theme={theme}
              tone="success"
              compact
            />
            <MetricCard
              label={copy.totalRejected}
              value={rejected.length}
              icon="close-circle-outline"
              theme={theme}
              tone="danger"
              compact
            />
            <MetricCard
              label={copy.onTimeRate}
              value={`${onTimeRate}%`}
              icon="speedometer-outline"
              theme={theme}
              tone="brand"
              compact
            />
          </View>
          {[...delivered, ...rejected]
            .sort(
              (a, b) =>
                new Date(b.deliveredAt ?? b.rejectedAt ?? 0).getTime() -
                new Date(a.deliveredAt ?? a.rejectedAt ?? 0).getTime(),
            )
            .slice(0, 30)
            .map((order) => (
              <Card key={order.id} style={styles.row} theme={theme}>
                <View style={ui.rowInfo}>
                  <Text style={[ui.orderId, { color: theme.text }]}>{orderCode(order.id)}</Text>
                  <Text style={[ui.small, { color: theme.muted }]}>
                    {formatDateTime(order.deliveredAt ?? order.rejectedAt, lang)}
                  </Text>
                </View>
                <Text
                  style={[
                    ui.small,
                    { color: order.status === "DELIVERED" ? theme.success : theme.danger },
                  ]}
                >
                  {orderStatusLabel(order.status, lang)}
                </Text>
              </Card>
            ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = createSnowStyles({
  root: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  roundButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  roundButtonPlaceholder: { width: 38, height: 38 },
  content: { padding: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
});
