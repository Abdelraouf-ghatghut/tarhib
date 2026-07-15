import React from "react";
import { Pressable, Text, View } from "react-native";

import {
  Card,
  PillButton,
  PrimaryButton,
  createSnowStyles,
  orderStatusLabel,
  spacing,
  type Copy,
  type Lang,
  type Order,
  type SnowTheme,
} from "@tarhib/mobile-shared";

import {
  CenteredTitle,
  EmptyText,
  LoadingCard,
  PriorityBadge,
  StatusBadge,
  ui,
} from "../../components/ui";
import { useNowTick } from "../../hooks/useNowTick";
import { formatMinutesUntil, orderCode } from "../../lib/format";

export type QueueFilter = "ALL" | "APPROVED" | "IN_PROGRESS" | "READY";

export const QueueTab = ({
  theme,
  lang,
  copy,
  loading,
  orders,
  filter,
  busy,
  canPrepare,
  canDeliver,
  onFilterChange,
  onStart,
  onReady,
  onDeliver,
  onOpenOrder,
  allowedFilters,
}: {
  theme: SnowTheme;
  lang: Lang;
  copy: Copy;
  loading: boolean;
  orders: Order[];
  filter: QueueFilter;
  busy: boolean;
  canPrepare: boolean;
  canDeliver: boolean;
  onFilterChange: (filter: QueueFilter) => void;
  onStart: (orderId: string) => void;
  onReady: (orderId: string) => void;
  onDeliver: (orderId: string) => void;
  onOpenOrder: (order: Order) => void;
  allowedFilters?: QueueFilter[];
}) => {
  useNowTick();

  return (
    <>
      <CenteredTitle title={copy.queue} theme={theme} />
      <View style={ui.chips}>
        {(allowedFilters ?? ["ALL", "APPROVED", "IN_PROGRESS", "READY"]).map((item) => (
          <PillButton
            key={item}
            label={item === "ALL" ? copy.all : orderStatusLabel(item, lang)}
            active={filter === item}
            theme={theme}
            onPress={() => onFilterChange(item)}
          />
        ))}
      </View>
      {loading ? <LoadingCard theme={theme} /> : null}
      {orders.map((order) => (
        <QueueCard
          key={order.id}
          theme={theme}
          lang={lang}
          copy={copy}
          order={order}
          busy={busy}
          canPrepare={canPrepare}
          canDeliver={canDeliver}
          onPress={() => onOpenOrder(order)}
          onStart={() => onStart(order.id)}
          onReady={() => onReady(order.id)}
          onDeliver={() => onDeliver(order.id)}
        />
      ))}
      {orders.length === 0 && !loading ? <EmptyText theme={theme} text={copy.queueClear} /> : null}
    </>
  );
};

const QueueCard = ({
  theme,
  lang,
  copy,
  order,
  busy,
  canPrepare,
  canDeliver,
  onPress,
  onStart,
  onReady,
  onDeliver,
}: {
  theme: SnowTheme;
  lang: Lang;
  copy: Copy;
  order: Order;
  busy: boolean;
  canPrepare: boolean;
  canDeliver: boolean;
  onPress: () => void;
  onStart: () => void;
  onReady: () => void;
  onDeliver: () => void;
}) => {
  const productCount = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  return (
    <Pressable onPress={onPress}>
      <Card theme={theme} style={styles.queueCard}>
        <View style={styles.orderTop}>
          <View>
            <Text style={[ui.orderId, { color: theme.primaryStrong }]}>{orderCode(order.id)}</Text>
            <Text style={[ui.small, { color: theme.muted }]}>
              {productCount} {copy.items} - SLA {formatMinutesUntil(order.slaDeadline, copy)}
            </Text>
          </View>
          <View style={styles.badges}>
            <PriorityBadge priority={order.priority} theme={theme} lang={lang} />
            <StatusBadge status={order.status} theme={theme} lang={lang} />
          </View>
        </View>
        <View style={styles.actions}>
          {order.status === "APPROVED" && canPrepare ? (
            <PrimaryButton
              label={copy.startPreparation}
              icon="play"
              theme={theme}
              disabled={busy}
              onPress={onStart}
            />
          ) : null}
          {order.status === "IN_PROGRESS" && canPrepare ? (
            <PrimaryButton
              label={copy.markReady}
              icon="checkmark"
              theme={theme}
              disabled={busy}
              onPress={onReady}
            />
          ) : null}
          {order.status === "READY" && canDeliver ? (
            <PrimaryButton
              label={copy.markDelivered}
              icon="bicycle"
              theme={theme}
              disabled={busy}
              onPress={onDeliver}
            />
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
};

const styles = createSnowStyles({
  queueCard: { gap: spacing.md },
  orderTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  badges: { alignItems: "flex-end", gap: spacing.xs },
  actions: { gap: spacing.sm },
});
