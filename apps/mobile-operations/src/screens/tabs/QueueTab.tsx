import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import {
  Card,
  PrimaryButton,
  createSnowStyles,
  orderStatusLabel,
  priorityRank,
  spacing,
  type CatalogProduct,
  type Copy,
  type Lang,
  type Order,
  type SnowTheme,
} from "@tarhib/mobile-shared";
import { LoadingCard, OperationalEmptyState } from "../../components/ui";
import { formatMinutesUntil, orderCode, productName } from "../../lib/format";
import { operationsProductImage } from "../../lib/productImages";
import { ScopeFilterModal, type DeliveryScope } from "./DeliveryTab";

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
  productsById,
  onFilterChange,
  onStart,
  onReady,
  onDeliver,
  onOpenOrder,
  allowedFilters,
  scope,
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
  productsById: Map<string, CatalogProduct>;
  onFilterChange: (filter: QueueFilter) => void;
  onStart: (id: string) => void;
  onReady: (id: string) => void;
  onDeliver: (id: string) => void;
  onOpenOrder: (order: Order) => void;
  allowedFilters?: QueueFilter[];
  scope?: DeliveryScope;
}) => {
  const [scopeOpen, setScopeOpen] = React.useState(false);
  const [scopePicker, setScopePicker] = React.useState<"company" | "branch" | null>(null);
  const filters = allowedFilters ?? ["ALL", "APPROVED", "IN_PROGRESS", "READY"];
  const visible = orders.filter((order) => filter === "ALL" || order.status === filter);
  const groups = (["APPROVED", "IN_PROGRESS", "READY"] as const)
    .map((status) => ({ status, orders: visible.filter((order) => order.status === status) }))
    .filter((group) => group.orders.length > 0);

  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerSide} />
        <Text style={[styles.title, { color: theme.text }]}>
          {lang === "ar" ? "قائمة المطبخ" : "Kitchen queue"}
        </Text>
        <Pressable onPress={() => scope && setScopeOpen(true)} style={styles.filterIcon}>
          <Ionicons name="filter-outline" size={25} color={theme.text} />
        </Pressable>
      </View>

      <View style={styles.filters}>
        {filters.map((item) => {
          const active = filter === item;
          const count =
            item === "ALL" ? orders.length : orders.filter((order) => order.status === item).length;
          return (
            <Pressable
              key={item}
              onPress={() => onFilterChange(item)}
              style={[
                styles.filter,
                { backgroundColor: active ? theme.primaryStrong : theme.surfaceAlt },
              ]}
            >
              <Text style={[styles.filterText, { color: active ? "#FFFFFF" : theme.text }]}>
                {item === "ALL" ? copy.all : orderStatusLabel(item, lang)}
              </Text>
              <Text style={[styles.filterCount, { color: active ? "#FFFFFF" : theme.text }]}>
                {count}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? <LoadingCard theme={theme} /> : null}
      {groups.map((group) => (
        <View key={group.status} style={styles.group}>
          <Text style={[styles.groupTitle, { color: theme.text }]}>
            {orderStatusLabel(group.status, lang)}
          </Text>
          {group.orders.map((order) => (
            <KitchenCard
              key={order.id}
              theme={theme}
              lang={lang}
              copy={copy}
              order={order}
              busy={busy}
              canPrepare={canPrepare}
              canDeliver={canDeliver}
              productsById={productsById}
              onStart={onStart}
              onReady={onReady}
              onDeliver={onDeliver}
              onOpen={() => onOpenOrder(order)}
            />
          ))}
        </View>
      ))}
      {!loading && !visible.length ? (
        <OperationalEmptyState
          theme={theme}
          title={lang === "ar" ? "قائمة المطبخ فارغة" : "Kitchen queue is empty"}
          text={copy.queueClear}
        />
      ) : null}
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

const KitchenCard = ({
  theme,
  lang,
  copy,
  order,
  busy,
  canPrepare,
  canDeliver,
  productsById,
  onStart,
  onReady,
  onDeliver,
  onOpen,
}: {
  theme: SnowTheme;
  lang: Lang;
  copy: Copy;
  order: Order;
  busy: boolean;
  canPrepare: boolean;
  canDeliver: boolean;
  productsById: Map<string, CatalogProduct>;
  onStart: (id: string) => void;
  onReady: (id: string) => void;
  onDeliver: (id: string) => void;
  onOpen: () => void;
}) => {
  const first = order.lines[0];
  const product = first ? productsById.get(first.productId) : undefined;
  const localImage = product ? operationsProductImage(product) : null;
  const itemCount = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  const rank = priorityRank(order.priority);
  const priorityColor = rank <= 2 ? "#F04424" : rank === 3 ? "#E88A12" : theme.primaryStrong;
  const priorityLabel =
    rank <= 2
      ? lang === "ar"
        ? "أولوية عالية"
        : "High priority"
      : rank === 3
        ? lang === "ar"
          ? "عادي"
          : "Normal"
        : lang === "ar"
          ? "منخفض"
          : "Low";
  return (
    <Pressable onPress={onOpen}>
      <Card theme={theme} style={styles.card}>
        <View style={[styles.topRow, lang === "ar" && styles.topRowRtl]}>
          <Text style={[styles.code, { color: theme.text }]}>{orderCode(order.id)}</Text>
          <View style={[styles.priority, { backgroundColor: `${priorityColor}0D` }]}>
            <Text style={[styles.priorityText, { color: priorityColor }]}>{priorityLabel}</Text>
          </View>
          <View style={[styles.sla, lang === "ar" && styles.slaRtl]}>
            <Ionicons name="time-outline" size={18} color={theme.muted} />
            <Text style={[styles.slaText, { color: theme.muted }]}>
              {formatMinutesUntil(order.slaDeadline, copy)}
            </Text>
          </View>
        </View>

        <View style={[styles.statusRow, lang === "ar" && styles.statusRowRtl]}>
          <Ionicons
            name={order.status === "APPROVED" ? "ribbon-outline" : "restaurant-outline"}
            size={18}
            color={order.status === "APPROVED" ? theme.primaryStrong : theme.muted}
          />
          <Text
            style={[
              styles.statusText,
              { color: order.status === "APPROVED" ? theme.primaryStrong : theme.text },
            ]}
          >
            {orderStatusLabel(order.status, lang)}
          </Text>
          {order.status === "IN_PROGRESS" ? (
            <Text style={[styles.due, lang === "ar" && styles.dueRtl, { color: theme.muted }]}>
              {new Date(order.slaDeadline).toLocaleTimeString(lang, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          ) : null}
        </View>

        <View style={styles.productRow}>
          <View style={[styles.imageBox, { backgroundColor: theme.surfaceAlt }]}>
            {localImage || product?.imageUrl ? (
              <Image
                source={localImage ?? { uri: product!.imageUrl! }}
                resizeMode="contain"
                style={styles.image}
              />
            ) : (
              <Ionicons name="restaurant" size={31} color={theme.warning} />
            )}
          </View>
          <View style={styles.productCopy}>
            <Text style={[styles.productName, { color: theme.text }]}>
              {first ? productName(product, lang, first.productId) : copy.order}
            </Text>
            {order.lines.length > 1 ? (
              <Text style={[styles.more, { color: theme.muted }]}>
                +{order.lines.length - 1}{" "}
                {lang === "ar"
                  ? "عناصر أخرى"
                  : order.lines.length === 2
                    ? "more item"
                    : "more items"}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.quantity, { color: theme.text }]}>x {first?.quantity ?? 0}</Text>
        </View>

        <Text style={[styles.total, { color: theme.text }]}>
          {itemCount} {copy.items}
        </Text>
        {order.status === "APPROVED" && canPrepare ? (
          <PrimaryButton
            label={copy.startPreparation}
            theme={theme}
            disabled={busy}
            onPress={() => onStart(order.id)}
          />
        ) : null}
        {order.status === "IN_PROGRESS" && canPrepare ? (
          <PrimaryButton
            label={copy.markReady}
            theme={theme}
            disabled={busy}
            onPress={() => onReady(order.id)}
          />
        ) : null}
        {order.status === "READY" && canDeliver ? (
          <PrimaryButton
            label={copy.markDelivered}
            theme={theme}
            disabled={busy}
            onPress={() => onDeliver(order.id)}
          />
        ) : null}
      </Card>
    </Pressable>
  );
};

const styles = createSnowStyles({
  header: {
    height: 86,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerSide: { width: 42 },
  title: { fontSize: 20, fontWeight: "700" },
  filterIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  filters: { flexDirection: "row", gap: 12, marginBottom: 30 },
  filter: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 6,
  },
  filterText: { fontSize: 13, fontWeight: "600" },
  filterCount: { fontSize: 13, fontWeight: "600" },
  group: { gap: 12, marginBottom: 26 },
  groupTitle: { fontSize: 19, fontWeight: "700", marginBottom: 2 },
  card: { minHeight: 270, padding: 16, gap: 16, borderRadius: 14 },
  topRow: {
    position: "relative",
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  topRowRtl: { paddingLeft: 104 },
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
  slaRtl: { position: "absolute", left: 0, marginLeft: 0 },
  slaText: { fontSize: 12 },
  statusRow: {
    position: "relative",
    minHeight: 26,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusRowRtl: { paddingLeft: 56 },
  statusText: { fontSize: 13 },
  due: { marginLeft: "auto", fontSize: 12 },
  dueRtl: { position: "absolute", left: 0, marginLeft: 0 },
  productRow: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 14 },
  imageBox: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: { width: "94%", height: "94%" },
  productCopy: { flex: 1 },
  productName: { fontSize: 16, fontWeight: "700" },
  more: { fontSize: 12, marginTop: 5 },
  quantity: { fontSize: 16, fontWeight: "700" },
  total: { fontSize: 13 },
});
