import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  Card,
  BottomTabs,
  createSnowStyles,
  orderStatusLabel,
  rejectionReasonLabel,
  spacing,
  type CatalogProduct,
  type Lang,
  type Order,
  type SnowTheme,
} from "@tarhib/mobile-shared";

import { arOrEn, formatDateTime, formatTime, orderCode, productLabel } from "../lib/format";
import { productImage } from "../lib/productImages";

interface TimelineStep {
  label: string;
  time?: string;
  icon: keyof typeof Ionicons.glyphMap;
  state: "done" | "current" | "pending" | "rejected";
}

// Timeline dérivée des vrais horodatages du backend (order.dto.ts).
function timelineForOrder(order: Order, lang: Lang): TimelineStep[] {
  const step = (ar: string, en: string) => arOrEn(lang, ar, en);
  if (order.status === "REJECTED") {
    return [
      {
        label: step("تم استلام الطلب", "Order received"),
        time: formatDateTime(order.createdAt, lang),
        icon: "clipboard-outline",
        state: "done",
      },
      {
        label: step("تم إلغاء الطلب", "Order rejected"),
        time: formatDateTime(order.rejectedAt, lang),
        icon: "close-circle-outline",
        state: "rejected",
      },
    ];
  }
  const delivered = !!order.deliveredAt;
  return [
    {
      label: step("تم استلام الطلب", "Order received"),
      time: formatDateTime(order.createdAt, lang),
      icon: "clipboard-outline",
      state: "done",
    },
    {
      label: step("جاري التحضير", "Preparing"),
      time: formatDateTime(order.prepStartedAt, lang),
      icon: "restaurant-outline",
      state:
        order.status === "PENDING" || order.status === "APPROVED" || order.status === "IN_PROGRESS"
          ? "current"
          : order.readyAt || delivered
            ? "done"
            : "pending",
    },
    {
      label: step("الطلب جاهز", "Ready"),
      time: formatDateTime(order.readyAt, lang),
      icon: "bag-handle-outline",
      state: order.status === "READY" ? "current" : delivered ? "done" : "pending",
    },
    {
      label: step("تم التسليم", "Delivered"),
      time: formatDateTime(order.deliveredAt, lang),
      icon: "bicycle-outline",
      state: delivered ? "done" : "pending",
    },
  ];
}

export const TrackingModal = ({
  order,
  productsById,
  lang,
  theme,
  canBookRooms,
  onNavigate,
  onClose,
}: {
  order: Order | null;
  productsById: Map<string, CatalogProduct>;
  lang: Lang;
  theme: SnowTheme;
  canBookRooms: boolean;
  onNavigate: (target: "home" | "orders" | "rooms" | "profile") => void;
  onClose: () => void;
}) => {
  const isHistory = order?.status === "DELIVERED" || order?.status === "REJECTED";
  const statusColor =
    order?.status === "REJECTED"
      ? theme.danger
      : order?.status === "DELIVERED"
        ? theme.success
        : theme.primaryStrong;

  const lineName = (productId: string) => {
    const product = productsById.get(productId);
    return product ? productLabel(product, lang) : `#${productId.slice(0, 8)}`;
  };

  return (
    <Modal visible={!!order} animationType="slide" onRequestClose={onClose}>
      {order ? (
        <SafeAreaView
          edges={["top", "bottom"]}
          style={[styles.root, { backgroundColor: theme.background }]}
        >
          <View style={styles.trackingHeader}>
            <Pressable onPress={onClose} style={styles.headerAction}>
              <Ionicons name="arrow-back" size={28} color={theme.text} />
            </Pressable>
            <Text style={[styles.trackingHeaderTitle, { color: theme.text }]}>
              {isHistory
                ? arOrEn(lang, "تفاصيل الطلب", "Order details")
                : arOrEn(lang, "تتبع الطلب", "Order tracking")}
            </Text>
            <View style={styles.headerAction} />
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.trackingContent}
          >
            <Card theme={theme} style={styles.orderHeroCard}>
              <View style={styles.heroCopy}>
                <Text style={[styles.trackingBodyText, { color: theme.muted }]}>
                  {arOrEn(lang, "الطلب", "Order")}
                </Text>
                <Text style={[styles.heroOrderCode, { color: theme.text }]}>
                  {orderCode(order.id)}
                </Text>
                <View style={[styles.heroStatus, { backgroundColor: `${statusColor}14` }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.heroStatusText, { color: statusColor }]}>
                    {orderStatusLabel(order.status, lang)}
                  </Text>
                </View>
                <View style={styles.arrivalRow}>
                  <Ionicons
                    name={isHistory ? "calendar-outline" : "time-outline"}
                    size={20}
                    color={theme.muted}
                  />
                  {isHistory ? (
                    <Text style={[styles.trackingBodyText, { color: theme.muted }]}>
                      {formatDateTime(order.createdAt, lang)}
                    </Text>
                  ) : (
                    <>
                      <Text style={[styles.trackingBodyText, { color: theme.muted }]}>
                        {arOrEn(lang, "متوقع حوالي", "Expected around")}
                      </Text>
                      <Text style={[styles.arrivalTime, { color: theme.primaryStrong }]}>
                        {formatTime(order.slaDeadline, lang)}
                      </Text>
                    </>
                  )}
                </View>
              </View>
              <View style={[styles.heroImageWrap, { backgroundColor: theme.primarySoft }]}>
                {productsById.get(order.lines[0]?.productId ?? "") &&
                productImage(productsById.get(order.lines[0]?.productId ?? "")!) ? (
                  <Image
                    source={productImage(productsById.get(order.lines[0]?.productId ?? "")!)!}
                    resizeMode="contain"
                    style={styles.heroImage}
                  />
                ) : (
                  <Ionicons name="cafe" size={62} color={theme.primaryStrong} />
                )}
              </View>
            </Card>

            <Card theme={theme} style={styles.detailsCard}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {arOrEn(lang, "تفاصيل الطلب", "Order details")}
              </Text>
              {order.lines.map((line, index) => {
                const product = productsById.get(line.productId);
                const image = product ? productImage(product) : null;
                return (
                  <View
                    key={line.productId}
                    style={[
                      styles.productLine,
                      index > 0 ? { borderTopWidth: 1, borderTopColor: theme.border } : null,
                    ]}
                  >
                    <View style={[styles.productThumb, { backgroundColor: theme.surfaceAlt }]}>
                      {image ? (
                        <Image
                          source={image}
                          resizeMode="contain"
                          style={styles.productThumbImage}
                        />
                      ) : (
                        <Ionicons name="cafe-outline" size={24} color={theme.muted} />
                      )}
                    </View>
                    <View style={styles.productLineCopy}>
                      <Text style={[styles.productLineName, { color: theme.text }]}>
                        {lineName(line.productId)}
                      </Text>
                      {line.validationStatus === "REJECTED" ? (
                        <Text style={[styles.rejectedText, { color: theme.danger }]}>
                          {rejectionReasonLabel(line.rejectionReason, lang)}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.quantityText, { color: theme.text }]}>
                      ×{line.quantity}
                    </Text>
                  </View>
                );
              })}
              <View style={[styles.itemCountBar, { backgroundColor: theme.primarySoft }]}>
                <Ionicons name="bag-handle-outline" size={20} color={theme.muted} />
                <Text style={[styles.trackingBodyText, { color: theme.muted }]}>
                  {order.lines.reduce((sum, line) => sum + line.quantity, 0)}{" "}
                  {arOrEn(lang, "منتجات", "items")}
                </Text>
              </View>
            </Card>

            <Card theme={theme} style={styles.progressCard}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {arOrEn(lang, "التقدم", "Progress")}
              </Text>
              {timelineForOrder(order, lang).map((step, index, steps) => (
                <TimelineRow
                  key={step.label}
                  theme={theme}
                  lang={lang}
                  step={step}
                  isLast={index === steps.length - 1}
                />
              ))}
            </Card>

            <View style={styles.infoCardsRow}>
              <Card theme={theme} style={styles.infoCard}>
                <Text style={[styles.trackingBodyText, { color: theme.muted }]}>
                  {arOrEn(lang, "مكان التسليم", "Delivery location")}
                </Text>
                <View style={styles.infoValueRow}>
                  <View style={[styles.infoIcon, { backgroundColor: theme.primarySoft }]}>
                    <Ionicons name="location-outline" size={22} color={theme.primaryStrong} />
                  </View>
                  <Text style={[styles.infoValue, { color: theme.text }]}>
                    {arOrEn(lang, "مكتبك", "Your office")}
                  </Text>
                </View>
              </Card>
              <Card theme={theme} style={styles.infoCard}>
                <Text style={[styles.trackingBodyText, { color: theme.muted }]}>
                  {arOrEn(lang, "ملاحظة", "Note")}
                </Text>
                <View style={styles.infoValueRow}>
                  <View style={[styles.infoIcon, { backgroundColor: theme.primarySoft }]}>
                    <Ionicons name="document-text-outline" size={22} color={theme.primaryStrong} />
                  </View>
                  <Text numberOfLines={2} style={[styles.infoValue, { color: theme.text }]}>
                    {order.note || arOrEn(lang, "لا توجد ملاحظة", "No note")}
                  </Text>
                </View>
              </Card>
            </View>

            <Pressable
              onPress={onClose}
              style={[styles.ordersButton, { borderColor: theme.primaryStrong }]}
            >
              <Text style={[styles.ordersButtonText, { color: theme.primaryStrong }]}>
                {arOrEn(lang, "عرض طلباتي", "View my orders")}
              </Text>
            </Pressable>
          </ScrollView>
          <BottomTabs
            active="orders"
            onChange={(key) => onNavigate(key as "home" | "orders" | "rooms" | "profile")}
            theme={theme}
            tabs={[
              { key: "home", label: arOrEn(lang, "الرئيسية", "Home"), icon: "home" },
              { key: "orders", label: arOrEn(lang, "الطلبات", "Orders"), icon: "bag-handle" },
              ...(canBookRooms
                ? [
                    {
                      key: "rooms",
                      label: arOrEn(lang, "الحجز", "Reserve"),
                      icon: "calendar" as const,
                    },
                  ]
                : []),
              { key: "profile", label: arOrEn(lang, "الحساب", "Account"), icon: "person" },
            ]}
          />
        </SafeAreaView>
      ) : null}
    </Modal>
  );
};

const TimelineRow = ({
  theme,
  lang,
  step,
  isLast,
}: {
  theme: SnowTheme;
  lang: Lang;
  step: TimelineStep;
  isLast: boolean;
}) => {
  const isDone = step.state === "done";
  const isCurrent = step.state === "current";
  const isRejected = step.state === "rejected";
  const dotColor = isDone ? theme.primaryStrong : isRejected ? theme.danger : theme.surface;
  const dotBorderColor =
    isDone || isCurrent ? theme.primaryStrong : isRejected ? theme.danger : theme.border;
  const labelColor = step.state === "pending" ? theme.muted : theme.text;

  return (
    <View style={[styles.timelineRow, isCurrent ? { backgroundColor: theme.primarySoft } : null]}>
      <View style={styles.timelineTrack}>
        <View
          style={[styles.timelineDot, { backgroundColor: dotColor, borderColor: dotBorderColor }]}
        >
          {isDone ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
          {isCurrent ? (
            <View style={[styles.timelineCurrentInner, { borderColor: theme.primaryStrong }]} />
          ) : null}
          {isRejected ? <Ionicons name="close" size={16} color="#FFFFFF" /> : null}
        </View>
        {isLast ? null : (
          <View
            style={[
              styles.timelineConnector,
              { backgroundColor: isDone ? theme.primaryStrong : theme.border },
            ]}
          />
        )}
      </View>
      <View style={styles.timelineStepIcon}>
        <Ionicons
          name={step.icon}
          size={25}
          color={
            isDone || isCurrent ? theme.primaryStrong : isRejected ? theme.danger : theme.muted
          }
        />
      </View>
      <View style={styles.timelineText}>
        <Text style={[styles.timelineLabel, { color: labelColor }]}>{step.label}</Text>
        <Text
          style={[styles.timelineMeta, { color: isCurrent ? theme.primaryStrong : theme.muted }]}
        >
          {step.time ??
            (isCurrent
              ? arOrEn(lang, "قيد التنفيذ", "In progress")
              : arOrEn(lang, "قادم", "Upcoming"))}
        </Text>
      </View>
    </View>
  );
};

const styles = createSnowStyles({
  root: {
    flex: 1,
  },
  trackingContent: {
    padding: spacing.lg,
    // La navigation basse est absolue (72 px) : cette marge garde le dernier
    // bouton entièrement visible et facilement pressable au-dessus d'elle.
    paddingBottom: 104,
    gap: spacing.md,
  },
  trackingHeader: {
    minHeight: 64,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerAction: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  trackingHeaderTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 21,
    fontWeight: "700",
  },
  orderHeroCard: {
    minHeight: 174,
    borderRadius: 20,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  heroCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  trackingBodyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  heroOrderCode: {
    fontSize: 27,
    lineHeight: 32,
    fontWeight: "800",
  },
  heroStatus: {
    alignSelf: "flex-start",
    minHeight: 38,
    borderRadius: 19,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  heroStatusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  arrivalRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  arrivalTime: {
    fontSize: 15,
    fontWeight: "700",
  },
  heroImageWrap: {
    width: 116,
    height: 116,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heroImage: {
    width: "112%",
    height: "112%",
  },
  detailsCard: {
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
  },
  productLine: {
    minHeight: 70,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  productThumb: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  productThumbImage: {
    width: "108%",
    height: "108%",
  },
  productLineCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  productLineName: {
    fontSize: 15,
    fontWeight: "600",
  },
  rejectedText: {
    fontSize: 12,
    lineHeight: 17,
  },
  quantityText: {
    minWidth: 28,
    textAlign: "right",
    fontSize: 15,
    fontWeight: "600",
  },
  itemCountBar: {
    minHeight: 50,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  progressCard: {
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  timelineRow: {
    minHeight: 72,
    borderRadius: 14,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    flexDirection: "row",
    gap: spacing.sm,
  },
  timelineText: {
    flex: 1,
    gap: spacing.xs,
    paddingTop: 2,
    paddingBottom: spacing.md,
  },
  timelineTrack: {
    width: 34,
    alignItems: "center",
  },
  timelineDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineCurrentInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 5,
    backgroundColor: "transparent",
  },
  timelineConnector: {
    flex: 1,
    width: 2,
    borderRadius: 1,
    marginVertical: 2,
  },
  timelineStepIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  timelineMeta: {
    fontSize: 13,
    lineHeight: 18,
  },
  infoCardsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  infoCard: {
    flex: 1,
    minHeight: 128,
    borderRadius: 20,
    padding: spacing.md,
    gap: spacing.md,
  },
  infoValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  ordersButton: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ordersButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
