import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Card,
  PrimaryButton,
  createSnowStyles,
  directionalIcon,
  orderStatusLabel,
  priorityRank,
  spacing,
  type CatalogProduct,
  type Copy,
  type Lang,
  type Order,
  type SnowTheme,
} from "@tarhib/mobile-shared";
import { formatMinutesUntil, orderCode, productName } from "../lib/format";
import { operationsProductImage } from "../lib/productImages";

type Props = {
  order: Order | null;
  theme: SnowTheme;
  lang: Lang;
  copy: Copy;
  productsById: Map<string, CatalogProduct>;
  canPrepare: boolean;
  canDeliver: boolean;
  busy: boolean;
  onStart: (id: string) => void;
  onReady: (id: string) => void;
  onDeliver: (id: string) => void;
  onReportIncident: (id: string, reason: string, description: string) => void;
  onClose: () => void;
};

export const OrderDetailModal = ({
  order,
  theme,
  lang,
  copy,
  productsById,
  canPrepare,
  canDeliver,
  busy,
  onStart,
  onReady,
  onDeliver,
  onReportIncident,
  onClose,
}: Props) => {
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [issueType, setIssueType] = useState("MISSING_INGREDIENTS");
  const [issuePickerOpen, setIssuePickerOpen] = useState(false);
  if (!order) return null;
  const rank = priorityRank(order.priority);
  const priorityText =
    rank <= 2
      ? lang === "ar"
        ? "أولوية عالية"
        : "High priority"
      : rank === 3
        ? lang === "ar"
          ? "أولوية عادية"
          : "Normal priority"
        : lang === "ar"
          ? "أولوية منخفضة"
          : "Low priority";
  const deadline = new Date(order.slaDeadline);
  const canAct = ["APPROVED", "IN_PROGRESS", "READY"].includes(order.status);
  const visibleLines = order.lines.slice(0, 4);
  const issueTypes = [
    { key: "MISSING_INGREDIENTS", en: "Missing ingredients", ar: "مكونات ناقصة" },
    { key: "DAMAGED_ITEM", en: "Damaged item", ar: "عنصر تالف" },
    { key: "WRONG_ORDER", en: "Wrong order", ar: "طلب غير صحيح" },
    { key: "OTHER", en: "Other", ar: "أخرى" },
  ];
  const selectedIssue = issueTypes.find((item) => item.key === issueType)!;

  if (reporting) {
    return (
      <Modal visible animationType="slide" onRequestClose={() => setReporting(false)}>
        <SafeAreaView
          edges={["top", "bottom"]}
          style={[styles.root, { backgroundColor: theme.background }]}
        >
          <View style={styles.issueHeader}>
            <Pressable onPress={() => setReporting(false)} style={styles.back}>
              <Ionicons name={directionalIcon("chevron-back")} size={29} color={theme.text} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: theme.text }]}>{copy.reportProblem}</Text>
            <View style={styles.back} />
          </View>

          <ScrollView
            contentContainerStyle={styles.issueContent}
            keyboardShouldPersistTaps="handled"
          >
            <Card theme={theme} style={styles.issueCard}>
              <Text style={[styles.issueLabel, { color: theme.muted }]}>
                {lang === "ar" ? "الطلب" : "Order"}
              </Text>
              <Text style={[styles.issueOrder, { color: theme.text }]}>{orderCode(order.id)}</Text>
              <View style={[styles.issueRule, { backgroundColor: theme.border }]} />

              <Text style={[styles.issueFieldLabel, { color: theme.muted }]}>
                {lang === "ar" ? "نوع المشكلة" : "Issue type"}
              </Text>
              <Pressable
                onPress={() => setIssuePickerOpen(true)}
                style={[styles.issueSelect, { borderColor: theme.border }]}
              >
                <Text style={[styles.issueSelectText, { color: theme.text }]}>
                  {lang === "ar" ? selectedIssue.ar : selectedIssue.en}
                </Text>
                <Ionicons name="chevron-down" size={20} color={theme.text} />
              </Pressable>

              <Text style={[styles.issueFieldLabel, { color: theme.muted }]}>
                {lang === "ar" ? "الوصف" : "Description"}
              </Text>
              <TextInput
                value={reason}
                onChangeText={(value) => setReason(value.slice(0, 250))}
                maxLength={250}
                multiline
                textAlignVertical="top"
                placeholder={lang === "ar" ? "اكتب وصف المشكلة..." : "Describe the issue..."}
                placeholderTextColor={theme.muted}
                style={[styles.issueDescription, { borderColor: theme.border, color: theme.text }]}
              />
              <Text style={[styles.characterLimit, { color: theme.muted }]}>
                {lang === "ar"
                  ? `الحد الأقصى 250 حرفاً · ${reason.length}/250`
                  : `Max 250 characters · ${reason.length}/250`}
              </Text>

              <View style={styles.issueActions}>
                <Pressable
                  onPress={() => {
                    setReporting(false);
                    setReason("");
                  }}
                  style={[styles.cancelButton, { borderColor: theme.border }]}
                >
                  <Text style={[styles.cancelText, { color: theme.text }]}>{copy.cancel}</Text>
                </Pressable>
                <View style={styles.submitButton}>
                  <PrimaryButton
                    label={copy.submitReport}
                    theme={theme}
                    disabled={busy || !reason.trim()}
                    onPress={() => {
                      onReportIncident(order.id, issueType, reason.trim());
                      setReason("");
                      setReporting(false);
                    }}
                  />
                </View>
              </View>
            </Card>
          </ScrollView>

          <Modal
            transparent
            animationType="fade"
            visible={issuePickerOpen}
            onRequestClose={() => setIssuePickerOpen(false)}
          >
            <Pressable style={styles.pickerBackdrop} onPress={() => setIssuePickerOpen(false)}>
              <View style={[styles.pickerSheet, { backgroundColor: theme.surface }]}>
                <Text style={[styles.pickerTitle, { color: theme.text }]}>
                  {lang === "ar" ? "نوع المشكلة" : "Issue type"}
                </Text>
                {issueTypes.map((item) => {
                  const active = item.key === issueType;
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => {
                        setIssueType(item.key);
                        setIssuePickerOpen(false);
                      }}
                      style={[styles.pickerOption, { borderBottomColor: theme.border }]}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          { color: active ? theme.primaryStrong : theme.text },
                        ]}
                      >
                        {lang === "ar" ? item.ar : item.en}
                      </Text>
                      {active ? (
                        <Ionicons name="checkmark" size={20} color={theme.primaryStrong} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </Pressable>
          </Modal>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView
        edges={["top", "bottom"]}
        style={[styles.root, { backgroundColor: theme.background }]}
      >
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.back}>
            <Ionicons name={directionalIcon("chevron-back")} size={29} color={theme.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{copy.orderDetails}</Text>
          <View style={styles.back} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Card theme={theme} style={styles.detailsCard}>
            <View style={styles.referenceRow}>
              <Text style={[styles.reference, { color: theme.text }]}>{orderCode(order.id)}</Text>
              <View style={[styles.status, { backgroundColor: theme.primarySoft }]}>
                <Text style={[styles.statusText, { color: theme.primaryStrong }]}>
                  {orderStatusLabel(order.status, lang)}
                </Text>
              </View>
            </View>

            <View style={styles.priorityRow}>
              <View style={styles.priority}>
                <Ionicons name="star" size={20} color="#F36B12" />
                <Text style={styles.priorityText}>{priorityText}</Text>
              </View>
              <View style={styles.remaining}>
                <Ionicons name="time-outline" size={20} color="#F11B28" />
                <Text style={styles.remainingText}>
                  {formatMinutesUntil(order.slaDeadline, copy)}
                </Text>
              </View>
            </View>

            <View style={[styles.rule, { backgroundColor: theme.border }]} />
            <View style={styles.slaRow}>
              <View style={styles.slaValue}>
                <Text style={[styles.slaStrong, { color: theme.text }]}>
                  {lang === "ar" ? "الموعد التقديري" : "Estimated time"}{" "}
                  {deadline.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" })}
                </Text>
                <Ionicons name="information-circle-outline" size={18} color={theme.muted} />
              </View>
            </View>
            <View style={[styles.rule, { backgroundColor: theme.border }]} />

            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {lang === "ar" ? "العناصر" : "Items"}
            </Text>
            <View style={styles.items}>
              {visibleLines.map((line, index) => {
                const product = productsById.get(line.productId);
                const image = product ? operationsProductImage(product) : null;
                return (
                  <View key={`${line.productId}-${index}`} style={styles.itemRow}>
                    <View style={[styles.itemIcon, { borderColor: theme.border }]}>
                      {image || product?.imageUrl ? (
                        <Image
                          source={image ?? { uri: product!.imageUrl! }}
                          resizeMode="contain"
                          style={styles.image}
                        />
                      ) : (
                        <Ionicons
                          name={
                            index === 0
                              ? "restaurant-outline"
                              : index === 1
                                ? "leaf-outline"
                                : index === 2
                                  ? "cafe-outline"
                                  : "water-outline"
                          }
                          size={22}
                          color={theme.text}
                        />
                      )}
                    </View>
                    <Text numberOfLines={1} style={[styles.itemName, { color: theme.text }]}>
                      {productName(product, lang, line.productId)}
                    </Text>
                    <Text style={[styles.quantity, { color: theme.text }]}>x {line.quantity}</Text>
                  </View>
                );
              })}
            </View>
            {order.lines.length > visibleLines.length ? (
              <Text style={[styles.more, { color: theme.muted }]}>
                + {order.lines.length - visibleLines.length}{" "}
                {lang === "ar" ? "عناصر أخرى" : "more items"}
              </Text>
            ) : null}

            <View style={[styles.rule, styles.noteRule, { backgroundColor: theme.border }]} />
            <Text style={[styles.noteTitle, { color: theme.text }]}>
              {lang === "ar" ? "ملاحظة" : "Note"}
            </Text>
            <Text style={[styles.note, { color: theme.muted }]}>
              {order.note || (lang === "ar" ? "لا توجد ملاحظة" : "No note")}
            </Text>
          </Card>

          {reporting ? (
            <Card theme={theme} style={styles.reportCard}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{copy.reportProblem}</Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                multiline
                placeholder={copy.incidentReasonPlaceholder}
                placeholderTextColor={theme.muted}
                style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              />
              <PrimaryButton
                label={copy.submitReport}
                theme={theme}
                variant="danger"
                disabled={busy || !reason.trim()}
                onPress={() => {
                  onReportIncident(order.id, "OTHER", reason.trim());
                  setReason("");
                  setReporting(false);
                }}
              />
              <Pressable onPress={() => setReporting(false)} style={styles.cancel}>
                <Text style={{ color: theme.muted }}>{copy.cancel}</Text>
              </Pressable>
            </Card>
          ) : (
            <Card theme={theme} style={styles.actionsCard}>
              <Text style={[styles.actionsTitle, { color: theme.text }]}>
                {lang === "ar" ? "الإجراءات" : "Actions"}
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
              {canAct ? (
                <Pressable
                  onPress={() => setReporting(true)}
                  style={[styles.issueButton, { backgroundColor: theme.danger }]}
                >
                  <Text style={[styles.issueText, { color: "#FFFFFF" }]}>{copy.reportProblem}</Text>
                </Pressable>
              ) : null}
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = createSnowStyles({
  root: { flex: 1 },
  header: {
    height: 78,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: { width: 42, height: 42, alignItems: "flex-start", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  content: { paddingHorizontal: 16, paddingBottom: 34, gap: 14 },
  detailsCard: { padding: 20, gap: 18, borderRadius: 14 },
  referenceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reference: { fontSize: 28, fontWeight: "700" },
  status: {
    minHeight: 38,
    borderRadius: 11,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: { fontSize: 14, fontWeight: "700" },
  priorityRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  priority: { flexDirection: "row", alignItems: "center", gap: 9 },
  priorityText: { color: "#F36B12", fontSize: 14, fontWeight: "600" },
  remaining: { flexDirection: "row", alignItems: "center", gap: 8 },
  remainingText: { color: "#F11B28", fontSize: 14, fontWeight: "700" },
  rule: { height: 1 },
  slaRow: { position: "relative", minHeight: 24 },
  slaValue: { position: "absolute", left: 0, flexDirection: "row", alignItems: "center", gap: 5 },
  slaStrong: { fontSize: 13, fontWeight: "700" },
  slaMuted: { fontSize: 13, fontWeight: "600" },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  items: { gap: 12 },
  itemRow: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 12 },
  itemIcon: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: { width: "90%", height: "90%" },
  itemName: { flex: 1, fontSize: 14 },
  quantity: { fontSize: 14, fontWeight: "700" },
  more: { fontSize: 13 },
  noteRule: { marginTop: 4 },
  noteTitle: { fontSize: 15, fontWeight: "700" },
  note: { fontSize: 13, marginTop: -10 },
  actionsCard: { gap: 14, padding: 16, borderRadius: 14 },
  actionsTitle: { fontSize: 20, fontWeight: "700" },
  issueButton: { minHeight: 50, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  issueText: { fontSize: 14, fontWeight: "700" },
  reportCard: { gap: 12, padding: 16 },
  input: { minHeight: 100, borderWidth: 1, borderRadius: 9, padding: 12, textAlignVertical: "top" },
  cancel: { minHeight: 42, alignItems: "center", justifyContent: "center" },
  issueHeader: {
    height: 92,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  issueContent: { flexGrow: 1, paddingHorizontal: 18, paddingBottom: 30 },
  issueCard: { minHeight: 610, padding: 24, borderRadius: 13 },
  issueLabel: { fontSize: 14 },
  issueOrder: { fontSize: 27, fontWeight: "700", marginTop: 10 },
  issueRule: { height: 1, marginTop: 24, marginBottom: 26 },
  issueFieldLabel: { fontSize: 14, fontWeight: "600", marginBottom: 12 },
  issueSelect: {
    height: 52,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  issueSelectText: { fontSize: 14, fontWeight: "500" },
  issueDescription: {
    minHeight: 250,
    borderWidth: 1,
    borderRadius: 9,
    padding: 14,
    fontSize: 14,
    lineHeight: 20,
  },
  characterLimit: { fontSize: 12, marginTop: 10 },
  issueActions: { flexDirection: "row", gap: 14, marginTop: 36 },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontSize: 14, fontWeight: "700" },
  submitButton: { flex: 1 },
  pickerBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.35)", justifyContent: "flex-end" },
  pickerSheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    paddingBottom: 30,
  },
  pickerTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  pickerOption: {
    minHeight: 54,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerOptionText: { fontSize: 14, fontWeight: "500" },
});
