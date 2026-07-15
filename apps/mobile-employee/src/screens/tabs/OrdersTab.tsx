import { Ionicons } from "@expo/vector-icons";
import type { UseQueryResult } from "@tanstack/react-query";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";

import {
  Card,
  PrimaryButton,
  createSnowStyles,
  orderStatusLabel,
  spacing,
  type CatalogProduct,
  type Lang,
  type Order,
  type SnowTheme,
} from "@tarhib/mobile-shared";

import { ErrorState, LoadingState, ui } from "../../components/ui";
import { arOrEn, formatDateTime, orderCode, orderGroup, productLabel } from "../../lib/format";
import { productImage } from "../../lib/productImages";

export type OrderFilter = "active" | "history";

const OrdersEmpty = ({
  theme,
  lang,
  onGoHome,
}: {
  theme: SnowTheme;
  lang: Lang;
  onGoHome: () => void;
}) => (
  <View style={styles.emptyRoot}>
    <View style={styles.emptyContent}>
      <Image
        source={require("../../assets/shopping_bag.png")}
        style={styles.emptyImage}
        resizeMode="contain"
      />
      <Text style={[ui.screenTitle, { color: theme.text }]}>
        {arOrEn(lang, "لا توجد طلبات", "No orders yet")}
      </Text>
      <Text style={[ui.small, styles.emptyText, { color: theme.muted }]}>
        {arOrEn(
          lang,
          "اختر مشروباتك من الصفحة الرئيسية وسيظهر طلبك هنا",
          "Choose your drinks from Home and your order will appear here",
        )}
      </Text>
    </View>
    <PrimaryButton
      label={arOrEn(lang, "العودة للرئيسية", "Back to Home")}
      pill
      theme={theme}
      onPress={onGoHome}
    />
  </View>
);

export const OrdersTab = ({
  theme,
  lang,
  ordersQuery,
  orders,
  productsById,
  filter,
  onFilterChange,
  onTrackOrder,
  onReorder,
  onOpenCatalog,
}: {
  theme: SnowTheme;
  lang: Lang;
  ordersQuery: UseQueryResult<Order[]>;
  orders: Order[];
  productsById: Map<string, CatalogProduct>;
  filter: OrderFilter;
  onFilterChange: (filter: OrderFilter) => void;
  onTrackOrder: (orderId: string) => void;
  onReorder: (order: Order) => void;
  onOpenCatalog: () => void;
}) => (
  <>
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text style={[styles.title, { color: theme.text }]}>
          {arOrEn(lang, "طلباتي", "My orders")}
        </Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>
          {arOrEn(
            lang,
            "يمكنك هنا متابعة جميع طلباتك السابقة والحالية.",
            "Find the history of all your orders.",
          )}
        </Text>
      </View>
      <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
        <Ionicons name="person-outline" size={27} color={theme.primaryStrong} />
      </View>
    </View>

    <View style={[styles.segmented, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <SegmentButton
        label={arOrEn(lang, "قيد التنفيذ", "In progress")}
        active={filter === "active"}
        theme={theme}
        onPress={() => onFilterChange("active")}
      />
      <SegmentButton
        label={arOrEn(lang, "السجل", "History")}
        active={filter === "history"}
        theme={theme}
        onPress={() => onFilterChange("history")}
      />
    </View>

    {filter === "history" ? <ReorderHint theme={theme} lang={lang} /> : null}

    {ordersQuery.isLoading ? (
      <LoadingState theme={theme} lang={lang} />
    ) : ordersQuery.isError ? (
      <ErrorState
        theme={theme}
        lang={lang}
        label={arOrEn(lang, "تعذر تحميل الطلبات", "Unable to load orders")}
        onRetry={() => void ordersQuery.refetch()}
      />
    ) : orders.length === 0 ? (
      <OrdersEmpty theme={theme} lang={lang} onGoHome={onOpenCatalog} />
    ) : (
      orders.map((order) => (
        <OrderCard
          key={order.id}
          theme={theme}
          lang={lang}
          order={order}
          productsById={productsById}
          onTrack={() => onTrackOrder(order.id)}
          onReorder={() => onReorder(order)}
        />
      ))
    )}
  </>
);

const SegmentButton = ({
  label,
  active,
  theme,
  onPress,
}: {
  label: string;
  active: boolean;
  theme: SnowTheme;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={[styles.segmentButton, active ? { backgroundColor: theme.primarySoft } : null]}
  >
    <Text style={[styles.segmentText, { color: active ? theme.primaryStrong : theme.muted }]}>
      {label}
    </Text>
  </Pressable>
);

const ReorderHint = ({ theme, lang }: { theme: SnowTheme; lang: Lang }) => (
  <View style={[styles.hint, { backgroundColor: theme.primarySoft }]}>
    <View style={[styles.hintIcon, { backgroundColor: `${theme.primary}18` }]}>
      <Ionicons name="information" size={24} color={theme.primaryStrong} />
    </View>
    <View style={styles.hintCopy}>
      <Text style={[styles.cardTitle, { color: theme.text }]}>
        {arOrEn(lang, "أعد الطلب بنقرة واحدة", "Reorder in one tap")}
      </Text>
      <Text style={[styles.bodyText, { color: theme.muted }]}>
        {arOrEn(
          lang,
          "إعادة الطلب تضيف المشروبات نفسها إلى سلتك.",
          "Reordering adds the same drinks to your cart.",
        )}
      </Text>
    </View>
    <View style={styles.hintBag}>
      <Ionicons name="bag-handle-outline" size={42} color={theme.muted} />
      <View style={[styles.hintPlus, { backgroundColor: theme.primaryStrong }]}>
        <Ionicons name="add" size={19} color="#FFFFFF" />
      </View>
    </View>
  </View>
);

const OrderCard = ({
  theme,
  lang,
  order,
  productsById,
  onTrack,
  onReorder,
}: {
  theme: SnowTheme;
  lang: Lang;
  order: Order;
  productsById: Map<string, CatalogProduct>;
  onTrack: () => void;
  onReorder: () => void;
}) => {
  const group = orderGroup(order.status);
  const statusColor =
    group === "rejected" ? theme.danger : group === "done" ? theme.success : theme.warning;
  const itemsCount = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  const productNames = order.lines
    .map((line) => {
      const product = productsById.get(line.productId);
      return product ? productLabel(product, lang) : `#${line.productId.slice(0, 6)}`;
    })
    .join(arOrEn(lang, "، ", ", "));

  return (
    <Card theme={theme} style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={[styles.orderIcon, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="clipboard-outline" size={21} color={theme.primaryStrong} />
        </View>
        <View style={styles.orderHeading}>
          <Text numberOfLines={1} style={[styles.cardTitle, { color: theme.text }]}>
            {arOrEn(lang, `طلب ${orderCode(order.id)}`, `Order ${orderCode(order.id)}`)}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={15} color={theme.muted} />
            <Text style={[styles.bodyText, { color: theme.muted }]}>
              {formatDateTime(order.createdAt, lang)}
            </Text>
          </View>
        </View>
        <View style={[styles.status, { backgroundColor: `${statusColor}12` }]}>
          <Ionicons
            name={
              group === "rejected" ? "close-circle" : group === "done" ? "checkmark-circle" : "time"
            }
            size={16}
            color={statusColor}
          />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {orderStatusLabel(order.status, lang)}
          </Text>
        </View>
      </View>

      <View style={styles.productsRow}>
        <View style={styles.thumbnails}>
          {order.lines.slice(0, 3).map((line) => {
            const product = productsById.get(line.productId);
            const image = product ? productImage(product) : null;
            return (
              <View
                key={line.productId}
                style={[styles.thumbnail, { backgroundColor: theme.surfaceAlt }]}
              >
                {image ? (
                  <Image source={image} resizeMode="contain" style={styles.thumbnailImage} />
                ) : (
                  <Ionicons name="cafe-outline" size={22} color={theme.muted} />
                )}
              </View>
            );
          })}
        </View>
        <Text numberOfLines={2} style={[styles.productNames, { color: theme.text }]}>
          {productNames}
        </Text>
      </View>

      <View style={[styles.itemsRow, { borderTopColor: theme.border }]}>
        <Ionicons name="bag-handle-outline" size={18} color={theme.muted} />
        <Text style={[styles.bodyText, { color: theme.muted }]}>
          {itemsCount} {arOrEn(lang, "منتجات", itemsCount === 1 ? "item" : "items")}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={group === "active" ? onTrack : onReorder}
          style={[styles.primaryAction, { backgroundColor: theme.primaryStrong }]}
        >
          <Ionicons
            name={group === "active" ? "navigate-outline" : "refresh-outline"}
            size={19}
            color="#FFFFFF"
          />
          <Text style={styles.primaryActionText}>
            {group === "active"
              ? arOrEn(lang, "تتبع الطلب", "Track order")
              : arOrEn(lang, "إعادة الطلب", "Reorder")}
          </Text>
        </Pressable>
        <Pressable
          onPress={onTrack}
          style={[styles.secondaryAction, { borderColor: theme.primaryStrong }]}
        >
          <Text style={[styles.secondaryActionText, { color: theme.primaryStrong }]}>
            {arOrEn(lang, "عرض التفاصيل", "View details")}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
};

const styles = createSnowStyles({
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  headerCopy: { flex: 1, gap: spacing.sm },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 13, fontWeight: "400", lineHeight: 20 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  segmented: { minHeight: 52, borderWidth: 1, borderRadius: 26, padding: 4, flexDirection: "row" },
  segmentButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: { fontSize: 14, fontWeight: "600" },
  hint: {
    borderRadius: 20,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  hintIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  hintCopy: { flex: 1, gap: spacing.xs },
  hintBag: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  hintPlus: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  orderCard: { borderRadius: 20, padding: spacing.lg, gap: spacing.md },
  orderHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  orderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  orderHeading: { flex: 1, gap: spacing.xs },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  bodyText: { fontSize: 12, fontWeight: "400" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  status: {
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  statusText: { fontSize: 11, fontWeight: "600" },
  productsRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: spacing.md },
  thumbnails: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbnailImage: { width: "88%", height: "88%" },
  productNames: { flex: 1, fontSize: 13, fontWeight: "500", lineHeight: 19 },
  itemsRow: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  actions: { flexDirection: "row", gap: spacing.md },
  primaryAction: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  primaryActionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  secondaryAction: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: { fontSize: 13, fontWeight: "600" },
  emptyRoot: { flex: 1, minHeight: 420, justifyContent: "space-between", gap: spacing.xl },
  emptyContent: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  emptyImage: { width: 180, height: 180 },
  emptyText: { textAlign: "center" },
});
