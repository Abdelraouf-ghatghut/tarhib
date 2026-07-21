import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Linking, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  PrimaryButton,
  createSnowStyles,
  directionalIcon,
  type CatalogProduct,
  type DeliveryTask,
  type Lang,
  type SnowTheme,
} from "@tarhib/mobile-shared";
import { arOrEn, productName } from "../lib/format";
import { operationsProductImage } from "../lib/productImages";

type Action = "accept" | "pickup" | "depart" | "deliver";

export const DeliveryDetailModal = ({
  visible,
  task,
  theme,
  lang,
  productsById,
  busy,
  onClose,
  onAction,
  onReport,
}: {
  visible: boolean;
  task: DeliveryTask | null;
  theme: SnowTheme;
  lang: Lang;
  productsById: Map<string, CatalogProduct>;
  busy: boolean;
  onClose: () => void;
  onAction: (action: Action) => void;
  onReport: () => void;
}) => {
  if (!task) return null;
  const destination = task.destination;
  const recipient = destination
    ? lang === "ar"
      ? destination.recipientNameAr
      : destination.recipientNameEn
    : "—";
  const location = destination
    ? `${lang === "ar" ? destination.branchNameAr : destination.branchNameEn}  •  ${arOrEn(lang, "الطابق", "Floor")} ${destination.floor ?? "—"}  •  ${arOrEn(lang, "المكتب", "Office")} ${destination.officeNumber ?? "—"}`
    : "—";
  const rank = Number(task.order.priority.replace(/\D/g, "")) || 3;
  const priority =
    rank <= 2
      ? arOrEn(lang, "مرتفع", "High")
      : rank === 3
        ? arOrEn(lang, "عادي", "Normal")
        : arOrEn(lang, "منخفض", "Low");
  const minutes = Math.max(
    0,
    Math.ceil((new Date(task.order.slaDeadline).getTime() - Date.now()) / 60_000),
  );
  const next: [Action, string] | null =
    task.status === "AVAILABLE"
      ? ["accept", arOrEn(lang, "قبول", "Accept")]
      : task.status === "ASSIGNED"
        ? ["pickup", arOrEn(lang, "استلام الطلب", "Pick up")]
        : task.status === "PICKED_UP"
          ? ["depart", arOrEn(lang, "بدء التوصيل", "Start delivery")]
          : task.status === "OUT_FOR_DELIVERY"
            ? ["deliver", arOrEn(lang, "تم التوصيل", "Mark as delivered")]
            : null;
  const steps = [
    { key: "ASSIGNED", label: arOrEn(lang, "تم القبول", "Accepted"), time: task.createdAt },
    { key: "PICKED_UP", label: arOrEn(lang, "تم الاستلام", "Picked up"), time: task.pickedUpAt },
    {
      key: "OUT_FOR_DELIVERY",
      label: arOrEn(lang, "في الطريق", "On the way"),
      time: ["OUT_FOR_DELIVERY", "ISSUE_REPORTED", "DELIVERED"].includes(task.status)
        ? task.updatedAt
        : null,
    },
    { key: "DELIVERED", label: arOrEn(lang, "تم التوصيل", "Delivered"), time: task.deliveredAt },
  ];
  const order = [
    "AVAILABLE",
    "ASSIGNED",
    "PICKED_UP",
    "OUT_FOR_DELIVERY",
    "ISSUE_REPORTED",
    "DELIVERED",
  ];
  const currentRank = order.indexOf(task.status);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView
        edges={["top", "bottom"]}
        style={[styles.root, { backgroundColor: theme.background }]}
      >
        <View style={styles.header}>
          <Pressable onPress={onClose} style={[styles.back, { borderColor: theme.border }]}>
            <Ionicons name={directionalIcon("chevron-back")} size={28} color={theme.text} />
          </Pressable>
          <Text style={[styles.code, { color: theme.text }]}>
            #D-{task.id.replace(/-/g, "").slice(0, 4).toUpperCase()}
          </Text>
          <View style={styles.backSpacer} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.statusRow}>
            <View style={[styles.statusPill, { backgroundColor: theme.primarySoft }]}>
              <Text style={[styles.statusText, { color: theme.primaryStrong }]}>
                {statusLabel(task.status, lang)}
              </Text>
            </View>
            <View style={[styles.priorityPill, { backgroundColor: "#FFF1E8" }]}>
              <Text style={styles.priorityText}>{priority}</Text>
            </View>
            <View style={styles.remaining}>
              <Ionicons name="stopwatch-outline" size={20} color={theme.muted} />
              <Text style={[styles.remainingText, { color: theme.muted }]}>
                {arOrEn(lang, `${minutes} د متبقية`, `${minutes} min left`)}
              </Text>
            </View>
          </View>
          <View style={styles.sla}>
            <Text style={[styles.slaText, { color: theme.muted }]}>
              {arOrEn(lang, "الموعد التقديري", "Estimated time")}{" "}
              {new Date(task.order.slaDeadline).toLocaleTimeString(lang, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            <Ionicons name="information-circle-outline" size={18} color={theme.muted} />
          </View>

          <View style={styles.recipient}>
            <Text style={[styles.recipientName, { color: theme.text }]}>{recipient}</Text>
            <View style={styles.meta}>
              <Ionicons name="location-outline" size={20} color={theme.muted} />
              <Text style={[styles.metaText, { color: theme.muted }]}>{location}</Text>
            </View>
            <Pressable
              disabled={!task.order.recipientPhone}
              onPress={() =>
                task.order.recipientPhone &&
                void Linking.openURL(`tel:${task.order.recipientPhone}`)
              }
              style={styles.meta}
            >
              <Ionicons name="call-outline" size={20} color={theme.muted} />
              <Text style={[styles.metaText, { color: theme.muted }]}>
                {task.order.recipientPhone || "—"}
              </Text>
            </Pressable>
          </View>

          <View style={[styles.rule, { backgroundColor: theme.border }]} />
          <Text style={[styles.section, { color: theme.text }]}>
            {arOrEn(
              lang,
              `العناصر (${task.order.lines.length})`,
              `Items (${task.order.lines.length})`,
            )}
          </Text>
          <View style={styles.products}>
            {task.order.lines.slice(0, 4).map((line, index) => {
              const product = productsById.get(line.productId);
              const image = product ? operationsProductImage(product) : null;
              return (
                <View
                  key={`${line.productId}-${index}`}
                  style={[
                    styles.product,
                    { borderColor: theme.border, backgroundColor: theme.surfaceAlt },
                  ]}
                >
                  {image || product?.imageUrl ? (
                    <Image
                      source={image ?? { uri: product!.imageUrl! }}
                      resizeMode="contain"
                      style={styles.productImage}
                    />
                  ) : (
                    <Ionicons name="restaurant-outline" size={25} color={theme.warning} />
                  )}
                </View>
              );
            })}
            {task.order.lines.length > 4 ? (
              <View
                style={[
                  styles.product,
                  { borderColor: theme.border, backgroundColor: theme.surfaceAlt },
                ]}
              >
                <Text style={[styles.more, { color: theme.text }]}>
                  +{task.order.lines.length - 4}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.rule, { backgroundColor: theme.border }]} />
          <Text style={[styles.section, { color: theme.text }]}>
            {arOrEn(lang, "التقدم", "Progress")}
          </Text>
          <View style={styles.timeline}>
            {steps.map((step, index) => {
              const stepRank = order.indexOf(step.key);
              const done = currentRank >= stepRank && currentRank > 0;
              return (
                <View key={step.key} style={styles.step}>
                  <View style={styles.markerColumn}>
                    <View
                      style={[
                        styles.marker,
                        {
                          backgroundColor: done ? theme.primaryStrong : theme.surface,
                          borderColor: done ? theme.primaryStrong : theme.border,
                        },
                      ]}
                    >
                      {done ? <Ionicons name="checkmark" size={18} color="#FFFFFF" /> : null}
                    </View>
                    {index < steps.length - 1 ? (
                      <View
                        style={[
                          styles.line,
                          { backgroundColor: done ? theme.primaryStrong : theme.border },
                        ]}
                      />
                    ) : null}
                  </View>
                  <View style={[styles.stepContent, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.stepLabel, { color: done ? theme.text : theme.muted }]}>
                      {step.label}
                    </Text>
                    <Text style={[styles.stepTime, { color: theme.muted }]}>
                      {step.time
                        ? new Date(step.time).toLocaleTimeString(lang, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
        <View
          style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.surface }]}
        >
          {next ? (
            <View style={styles.primary}>
              <PrimaryButton
                theme={theme}
                label={next[1]}
                disabled={busy}
                onPress={() => onAction(next[0])}
              />
            </View>
          ) : null}
          {["PICKED_UP", "OUT_FOR_DELIVERY"].includes(task.status) ? (
            <Pressable
              onPress={onReport}
              style={[styles.issueButton, { backgroundColor: theme.danger }]}
            >
              <Text style={[styles.issueText, { color: "#FFFFFF" }]}>
                {arOrEn(lang, "الإبلاغ عن مشكلة", "Report an issue")}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const statusLabel = (status: DeliveryTask["status"], lang: Lang) =>
  ({
    AVAILABLE: arOrEn(lang, "متاح", "Available"),
    ASSIGNED: arOrEn(lang, "تم القبول", "Accepted"),
    PICKED_UP: arOrEn(lang, "تم الاستلام", "Picked up"),
    OUT_FOR_DELIVERY: arOrEn(lang, "قيد التوصيل", "In progress"),
    ISSUE_REPORTED: arOrEn(lang, "مشكلة", "Issue"),
    DELIVERED: arOrEn(lang, "تم التوصيل", "Delivered"),
    RETURNED: arOrEn(lang, "مرتجع", "Returned"),
    FAILED: arOrEn(lang, "فشل", "Failed"),
  })[status];
const styles = createSnowStyles({
  root: { flex: 1 },
  header: {
    height: 92,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  backSpacer: { width: 42 },
  code: { fontSize: 24, fontWeight: "700" },
  content: { paddingHorizontal: 20, paddingBottom: 170 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusPill: {
    minHeight: 38,
    borderRadius: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: { fontSize: 13, fontWeight: "600" },
  priorityPill: {
    minHeight: 38,
    borderRadius: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  priorityText: { color: "#F36B12", fontSize: 13, fontWeight: "600" },
  remaining: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 6 },
  remainingText: { fontSize: 12 },
  sla: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  slaText: { fontSize: 12 },
  recipient: { gap: 16, paddingVertical: 10 },
  recipientName: { fontSize: 20, fontWeight: "700" },
  meta: { flexDirection: "row", alignItems: "center", gap: 10 },
  metaText: { fontSize: 13 },
  rule: { height: 1, marginVertical: 20 },
  section: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  products: { flexDirection: "row", gap: 10 },
  product: {
    width: 62,
    height: 62,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  productImage: { width: "90%", height: "90%" },
  more: { fontSize: 19, fontWeight: "700" },
  timeline: { gap: 0 },
  step: { minHeight: 64, flexDirection: "row" },
  markerColumn: { width: 44, alignItems: "center" },
  marker: {
    width: 30,
    height: 30,
    borderWidth: 2,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  line: { width: 3, flex: 1 },
  stepContent: {
    flex: 1,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingTop: 5,
  },
  stepLabel: { fontSize: 14, fontWeight: "600" },
  stepTime: { fontSize: 12 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 132,
    borderTopWidth: 1,
    padding: 16,
    flexDirection: "column",
    gap: 10,
  },
  issueButton: {
    width: "100%",
    minHeight: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  issueText: { fontSize: 14, fontWeight: "700" },
  primary: { width: "100%" },
});
