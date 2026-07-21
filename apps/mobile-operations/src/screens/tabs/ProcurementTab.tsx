import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  Card,
  PrimaryButton,
  createPurchaseOrder,
  createSnowStyles,
  fetchEmployeeCatalog,
  fetchPurchaseOrders,
  fetchSuppliers,
  receivePurchaseOrder,
  rejectPurchaseOrder,
  spacing,
  transitionPurchaseOrder,
  updatePurchaseOrder,
  useAuthStore,
  type Lang,
  type PurchaseOrder,
  type PurchaseOrderInput,
  type SnowTheme,
} from "@tarhib/mobile-shared";
import { CenteredTitle, EmptyText, LoadingCard, ui } from "../../components/ui";
import { arOrEn } from "../../lib/format";

type DraftLine = { productId: string; quantity: string; unitCost: string };
const emptyLine = (): DraftLine => ({ productId: "", quantity: "1", unitCost: "" });

export const ProcurementTab = ({
  theme,
  lang,
  permissions,
}: {
  theme: SnowTheme;
  lang: Lang;
  permissions: string[];
}) => {
  const companyId = useAuthStore((state) => state.companyId);
  const branchId = useAuthStore((state) => state.branchId);
  const queryClient = useQueryClient();
  const orders = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: fetchPurchaseOrders,
    refetchInterval: 30_000,
  });
  const suppliers = useQuery({ queryKey: ["suppliers"], queryFn: fetchSuppliers });
  const products = useQuery({ queryKey: ["ops-products"], queryFn: fetchEmployeeCatalog });
  const [editing, setEditing] = useState<PurchaseOrder | "new" | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [receiveOrder, setReceiveOrder] = useState<PurchaseOrder | null>(null);
  const [receiveQty, setReceiveQty] = useState<Record<string, string>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [selector, setSelector] = useState<{
    kind: "supplier" | "product";
    lineIndex?: number;
  } | null>(null);

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
  const showSuccess = () =>
    setFeedback({
      ok: true,
      text: arOrEn(lang, "تم حفظ الإجراء بنجاح.", "Action completed successfully."),
    });
  const showError = () =>
    setFeedback({
      ok: false,
      text: arOrEn(
        lang,
        "تعذر إكمال الإجراء. حاول مرة أخرى.",
        "The action could not be completed. Try again.",
      ),
    });
  const mutation = useMutation({
    mutationFn: async (operation: () => Promise<unknown>) => operation(),
    onSuccess: () => {
      refresh();
      showSuccess();
      setEditing(null);
      setReceiveOrder(null);
      setRejectingId(null);
      setReason("");
    },
    onError: showError,
  });

  const canCreate = permissions.some((permission) =>
    ["procurement.create", "procurement.manage"].includes(permission),
  );
  const supplierNames = useMemo(
    () =>
      new Map(
        (suppliers.data ?? []).map((supplier) => [
          supplier.id,
          lang === "ar" ? supplier.nameAr : supplier.nameEn,
        ]),
      ),
    [suppliers.data, lang],
  );
  const productNames = useMemo(
    () =>
      new Map(
        (products.data ?? []).map((product) => [
          product.id,
          lang === "ar" ? product.nameAr : (product.nameEn ?? product.nameAr),
        ]),
      ),
    [products.data, lang],
  );

  const beginEdit = (order: PurchaseOrder | "new") => {
    setEditing(order);
    setSupplierId(order === "new" ? "" : order.supplierId);
    setNotes(order === "new" ? "" : "");
    setLines(
      order === "new"
        ? [emptyLine()]
        : order.lines.map((line) => ({
            productId: line.productId,
            quantity: String(line.orderedQty),
            unitCost: "",
          })),
    );
    setFeedback(null);
  };
  const saveDraft = () => {
    if (!companyId || !branchId || !supplierId) return;
    const normalizedLines = lines
      .filter((line) => line.productId && Number(line.quantity) > 0)
      .map((line) => ({
        productId: line.productId,
        orderedQty: Number(line.quantity),
        ...(line.unitCost ? { unitCost: Number(line.unitCost) } : {}),
      }));
    if (!normalizedLines.length) return;
    const input: PurchaseOrderInput = {
      companyId,
      branchId,
      supplierId,
      notes: notes.trim() || undefined,
      lines: normalizedLines,
    };
    mutation.mutate(() =>
      editing === "new"
        ? createPurchaseOrder(input)
        : updatePurchaseOrder(editing!.id, { supplierId, notes: input.notes, lines: input.lines }),
    );
  };

  if (orders.isLoading || suppliers.isLoading || products.isLoading)
    return <LoadingCard theme={theme} />;
  return (
    <>
      <CenteredTitle title={arOrEn(lang, "المشتريات", "Purchasing")} theme={theme} />
      {feedback ? (
        <Card
          theme={theme}
          style={[
            styles.feedback,
            { backgroundColor: feedback.ok ? `${theme.success}12` : `${theme.danger}12` },
          ]}
        >
          <Text style={[ui.small, { color: feedback.ok ? theme.success : theme.danger }]}>
            {feedback.text}
          </Text>
        </Card>
      ) : null}
      {canCreate && !editing ? (
        <PrimaryButton
          theme={theme}
          label={arOrEn(lang, "إنشاء أمر شراء", "Create purchase order")}
          onPress={() => beginEdit("new")}
        />
      ) : null}
      {editing ? (
        <Modal visible animationType="slide" onRequestClose={() => setEditing(null)}>
          <SafeAreaView style={[styles.editorRoot, { backgroundColor: theme.background }]}>
            <View style={styles.editorHeader}>
              <Pressable onPress={() => setEditing(null)} style={styles.backButton}>
                <Ionicons
                  name={lang === "ar" ? "chevron-forward" : "chevron-back"}
                  size={27}
                  color={theme.text}
                />
              </Pressable>
              <Text style={[styles.editorTitle, { color: theme.text }]}>
                {editing === "new"
                  ? arOrEn(lang, "أمر شراء جديد", "New purchase order")
                  : arOrEn(lang, "تعديل المسودة", "Edit draft")}
              </Text>
              <View style={styles.backButton} />
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.editorContent}
              keyboardShouldPersistTaps="handled"
            >
              <Card
                theme={theme}
                style={[
                  styles.editorCard,
                  { borderColor: theme.border, backgroundColor: theme.surface },
                ]}
              >
                <Text style={[ui.sectionTitle, styles.hidden, { color: theme.text }]}>
                  {editing === "new"
                    ? arOrEn(lang, "أمر شراء جديد", "New purchase order")
                    : arOrEn(lang, "تعديل المسودة", "Edit draft")}
                </Text>
                <Text style={[ui.small, { color: theme.muted }]}>
                  {arOrEn(lang, "اختر المورد", "Select supplier")}
                </Text>
                <Pressable
                  onPress={() => setSelector({ kind: "supplier" })}
                  style={[styles.select, { borderColor: theme.border }]}
                >
                  <Text
                    style={[styles.selectText, { color: supplierId ? theme.text : theme.muted }]}
                  >
                    {supplierId
                      ? (supplierNames.get(supplierId) ??
                        arOrEn(lang, "مورد غير معروف", "Unknown supplier"))
                      : arOrEn(lang, "اختر المورد", "Select supplier")}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={theme.muted} />
                </Pressable>
                {lines.map((line, index) => (
                  <View key={index} style={[styles.line, { borderColor: theme.border }]}>
                    <Text style={[ui.small, { color: theme.muted }]}>
                      {arOrEn(lang, "المنتج", "Product")} {index + 1}
                    </Text>
                    <Pressable
                      onPress={() => setSelector({ kind: "product", lineIndex: index })}
                      style={[styles.select, { borderColor: theme.border }]}
                    >
                      <Text
                        style={[
                          styles.selectText,
                          { color: line.productId ? theme.text : theme.muted },
                        ]}
                      >
                        {line.productId
                          ? (productNames.get(line.productId) ??
                            arOrEn(lang, "منتج غير معروف", "Unknown product"))
                          : arOrEn(lang, "اختر المنتج", "Select product")}
                      </Text>
                      <Ionicons name="chevron-down" size={18} color={theme.muted} />
                    </Pressable>
                    <View style={styles.inputs}>
                      <TextInput
                        keyboardType="number-pad"
                        value={line.quantity}
                        onChangeText={(value) =>
                          setLines((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, quantity: value } : item,
                            ),
                          )
                        }
                        placeholder={arOrEn(lang, "الكمية", "Quantity")}
                        placeholderTextColor={theme.muted}
                        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                      />
                      <TextInput
                        keyboardType="decimal-pad"
                        value={line.unitCost}
                        onChangeText={(value) =>
                          setLines((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, unitCost: value } : item,
                            ),
                          )
                        }
                        placeholder={arOrEn(lang, "سعر الوحدة", "Unit cost")}
                        placeholderTextColor={theme.muted}
                        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                      />
                    </View>
                  </View>
                ))}
                <Pressable
                  onPress={() => setLines((current) => [...current, emptyLine()])}
                  style={styles.secondary}
                >
                  <Text style={[ui.small, { color: theme.primaryStrong }]}>
                    {arOrEn(lang, "+ إضافة بند", "+ Add line")}
                  </Text>
                </Pressable>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={arOrEn(lang, "ملاحظات", "Notes")}
                  placeholderTextColor={theme.muted}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                />
                <PrimaryButton
                  theme={theme}
                  label={arOrEn(lang, "حفظ المسودة", "Save draft")}
                  disabled={
                    mutation.isPending ||
                    !supplierId ||
                    !lines.some((line) => line.productId && Number(line.quantity) > 0)
                  }
                  onPress={saveDraft}
                />
                <Pressable onPress={() => setEditing(null)} style={styles.secondary}>
                  <Text style={[ui.small, { color: theme.muted }]}>
                    {arOrEn(lang, "إلغاء", "Cancel")}
                  </Text>
                </Pressable>
              </Card>
            </ScrollView>
            {selector ? (
              <View style={styles.selectorOverlay}>
                <Pressable style={styles.selectorDismissArea} onPress={() => setSelector(null)} />
                <View style={[styles.selectorSheet, { backgroundColor: theme.surface }]}>
                  <View style={styles.selectorHeader}>
                    <Text style={[styles.selectorTitle, { color: theme.text }]}>
                      {selector.kind === "supplier"
                        ? arOrEn(lang, "اختر المورد", "Select supplier")
                        : arOrEn(lang, "اختر المنتج", "Select product")}
                    </Text>
                    <Pressable onPress={() => setSelector(null)} style={styles.selectorClose}>
                      <Ionicons name="close" size={22} color={theme.text} />
                    </Pressable>
                  </View>
                  <ScrollView style={styles.selectorList} keyboardShouldPersistTaps="handled">
                    {(selector.kind === "supplier"
                      ? (suppliers.data ?? [])
                      : (products.data ?? [])
                    ).map((option) => {
                      const selected =
                        selector.kind === "supplier"
                          ? option.id === supplierId
                          : option.id === lines[selector.lineIndex ?? 0]?.productId;
                      const label =
                        selector.kind === "supplier"
                          ? supplierNames.get(option.id)
                          : productNames.get(option.id);
                      return (
                        <Pressable
                          key={option.id}
                          onPress={() => {
                            if (selector.kind === "supplier") {
                              setSupplierId(option.id);
                            } else {
                              const lineIndex = selector.lineIndex ?? 0;
                              setLines((current) =>
                                current.map((line, index) =>
                                  index === lineIndex ? { ...line, productId: option.id } : line,
                                ),
                              );
                            }
                            setSelector(null);
                          }}
                          style={[styles.selectorOption, { borderBottomColor: theme.border }]}
                        >
                          <Text
                            style={[
                              styles.selectorOptionText,
                              { color: selected ? theme.primaryStrong : theme.text },
                            ]}
                          >
                            {label}
                          </Text>
                          {selected ? (
                            <Ionicons name="checkmark" size={20} color={theme.primaryStrong} />
                          ) : null}
                        </Pressable>
                      );
                    })}
                    {(selector.kind === "supplier" ? suppliers.data : products.data)?.length ===
                    0 ? (
                      <Text style={[ui.small, styles.selectorEmpty, { color: theme.muted }]}>
                        {arOrEn(lang, "لا توجد خيارات متاحة.", "No options available.")}
                      </Text>
                    ) : null}
                  </ScrollView>
                </View>
              </View>
            ) : null}
          </SafeAreaView>
        </Modal>
      ) : null}
      {selectedOrder ? (
        <Modal visible animationType="slide" onRequestClose={() => setSelectedOrder(null)}>
          <SafeAreaView style={[styles.editorRoot, { backgroundColor: theme.background }]}>
            <View style={styles.editorHeader}>
              <Pressable onPress={() => setSelectedOrder(null)} style={styles.backButton}>
                <Ionicons
                  name={lang === "ar" ? "chevron-forward" : "chevron-back"}
                  size={27}
                  color={theme.text}
                />
              </Pressable>
              <Text style={[styles.editorTitle, { color: theme.text }]}>
                {arOrEn(lang, "تفاصيل أمر الشراء", "Purchase order details")}
              </Text>
              <View style={styles.backButton} />
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.editorContent}
            >
              <View
                style={[
                  styles.detailHero,
                  { borderColor: theme.border, backgroundColor: theme.surface },
                ]}
              >
                <View style={styles.detailHeading}>
                  <Text style={[styles.detailCode, { color: theme.text }]}>
                    #{selectedOrder.id.slice(0, 8).toUpperCase()}
                  </Text>
                  <View
                    style={[styles.statusBadge, { backgroundColor: `${theme.primaryStrong}12` }]}
                  >
                    <Text style={[ui.badgeText, { color: theme.primaryStrong }]}>
                      {statusLabel(selectedOrder.status, lang)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.detailMetaRow, { borderTopColor: theme.border }]}>
                  <View style={[styles.detailIcon, { backgroundColor: theme.primarySoft }]}>
                    <Ionicons name="business-outline" size={20} color={theme.primaryStrong} />
                  </View>
                  <View style={ui.rowInfo}>
                    <Text style={[ui.small, { color: theme.muted }]}>
                      {arOrEn(lang, "المورد", "Supplier")}
                    </Text>
                    <Text style={[ui.orderId, { color: theme.text }]}>
                      {supplierNames.get(selectedOrder.supplierId) ??
                        arOrEn(lang, "مورد غير معروف", "Unknown supplier")}
                    </Text>
                  </View>
                </View>
                <View style={[styles.detailMetaRow, { borderTopColor: theme.border }]}>
                  <View style={[styles.detailIcon, { backgroundColor: theme.surfaceAlt }]}>
                    <Ionicons name="calendar-outline" size={20} color={theme.muted} />
                  </View>
                  <View style={ui.rowInfo}>
                    <Text style={[ui.small, { color: theme.muted }]}>
                      {arOrEn(lang, "تاريخ الإنشاء", "Created on")}
                    </Text>
                    <Text style={[ui.orderId, { color: theme.text }]}>
                      {new Date(selectedOrder.createdAt).toLocaleString(
                        lang === "ar" ? "ar" : "en",
                      )}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={[styles.detailSectionTitle, { color: theme.text }]}>
                {arOrEn(
                  lang,
                  `المنتجات (${selectedOrder.lines.length})`,
                  `Products (${selectedOrder.lines.length})`,
                )}
              </Text>
              <View
                style={[
                  styles.detailLines,
                  { borderColor: theme.border, backgroundColor: theme.surface },
                ]}
              >
                {selectedOrder.lines.map((line, index) => {
                  const progress = line.orderedQty > 0 ? line.receivedQty / line.orderedQty : 0;
                  return (
                    <View
                      key={line.id}
                      style={[
                        styles.detailLine,
                        index < selectedOrder.lines.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: theme.border,
                        },
                      ]}
                    >
                      <View style={[styles.productIndex, { backgroundColor: theme.surfaceAlt }]}>
                        <Text style={[ui.badgeText, { color: theme.text }]}>{index + 1}</Text>
                      </View>
                      <View style={ui.rowInfo}>
                        <Text style={[ui.orderId, { color: theme.text }]}>
                          {productNames.get(line.productId) ??
                            arOrEn(lang, "منتج غير معروف", "Unknown product")}
                        </Text>
                        <Text style={[ui.small, { color: theme.muted }]}>
                          {arOrEn(
                            lang,
                            `تم استلام ${line.receivedQty} من ${line.orderedQty}`,
                            `${line.receivedQty} of ${line.orderedQty} received`,
                          )}
                        </Text>
                        <View style={[styles.progressTrack, { backgroundColor: theme.surfaceAlt }]}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                backgroundColor:
                                  progress >= 1 ? theme.success : theme.primaryStrong,
                                width: `${Math.min(100, progress * 100)}%`,
                              },
                            ]}
                          />
                        </View>
                      </View>
                      <Text style={[styles.quantity, { color: theme.text }]}>
                        × {line.orderedQty}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      ) : null}
      {(orders.data ?? []).map((order) => (
        <Pressable key={order.id} onPress={() => setSelectedOrder(order)}>
          <Card
            theme={theme}
            style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}
          >
            <Text style={[ui.orderId, { color: theme.text }]}>
              #{order.id.slice(0, 8).toUpperCase()}
            </Text>
            <Text style={[ui.small, { color: theme.text }]}>
              {supplierNames.get(order.supplierId) ??
                arOrEn(lang, "مورد غير معروف", "Unknown supplier")}
            </Text>
            <Text style={[ui.badgeText, { color: theme.primaryStrong }]}>
              {statusLabel(order.status, lang)}
            </Text>
            {order.lines.map((line) => (
              <Text key={line.id} style={[ui.small, { color: theme.muted }]}>
                {productNames.get(line.productId) ??
                  arOrEn(lang, "منتج غير معروف", "Unknown product")}
                : {line.receivedQty}/{line.orderedQty}
              </Text>
            ))}
            {order.status === "DRAFT" && canCreate ? (
              <>
                <PrimaryButton
                  theme={theme}
                  label={arOrEn(lang, "تعديل المسودة", "Edit draft")}
                  disabled={mutation.isPending}
                  onPress={() => beginEdit(order)}
                />
                <PrimaryButton
                  theme={theme}
                  label={arOrEn(lang, "إرسال للموافقة", "Submit for approval")}
                  disabled={mutation.isPending}
                  onPress={() => mutation.mutate(() => transitionPurchaseOrder(order.id, "submit"))}
                />
              </>
            ) : null}
            {order.status === "PENDING_VALIDATION" &&
            permissions.some((p) => ["procurement.validate", "procurement.manage"].includes(p)) ? (
              <>
                <PrimaryButton
                  theme={theme}
                  label={arOrEn(lang, "اعتماد", "Approve")}
                  disabled={mutation.isPending}
                  onPress={() =>
                    mutation.mutate(() => transitionPurchaseOrder(order.id, "validate"))
                  }
                />
                {rejectingId === order.id ? (
                  <>
                    <TextInput
                      value={reason}
                      onChangeText={setReason}
                      placeholder={arOrEn(lang, "سبب الرفض", "Rejection reason")}
                      placeholderTextColor={theme.muted}
                      style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                    />
                    <PrimaryButton
                      theme={theme}
                      label={arOrEn(lang, "تأكيد الرفض", "Confirm rejection")}
                      disabled={mutation.isPending || !reason.trim()}
                      onPress={() =>
                        mutation.mutate(() => rejectPurchaseOrder(order.id, reason.trim()))
                      }
                    />
                  </>
                ) : (
                  <Pressable onPress={() => setRejectingId(order.id)} style={styles.secondary}>
                    <Text style={[ui.small, { color: theme.danger }]}>
                      {arOrEn(lang, "رفض", "Reject")}
                    </Text>
                  </Pressable>
                )}
              </>
            ) : null}
            {order.status === "VALIDATED" &&
            permissions.some((p) => ["procurement.send", "procurement.manage"].includes(p)) ? (
              <PrimaryButton
                theme={theme}
                label={arOrEn(lang, "إرسال للمورد", "Send to supplier")}
                disabled={mutation.isPending}
                onPress={() => mutation.mutate(() => transitionPurchaseOrder(order.id, "send"))}
              />
            ) : null}
            {["SENT", "PARTIALLY_RECEIVED"].includes(order.status) &&
            permissions.some((p) => ["procurement.receive", "procurement.manage"].includes(p)) ? (
              <PrimaryButton
                theme={theme}
                label={arOrEn(lang, "استلام بنود", "Receive lines")}
                disabled={mutation.isPending}
                onPress={() => {
                  setReceiveOrder(order);
                  setReceiveQty(Object.fromEntries(order.lines.map((line) => [line.id, "0"])));
                }}
              />
            ) : null}
            {!["RECEIVED", "CANCELLED"].includes(order.status) &&
            permissions.some((p) => ["procurement.cancel", "procurement.manage"].includes(p)) ? (
              <Pressable
                onPress={() => mutation.mutate(() => transitionPurchaseOrder(order.id, "cancel"))}
                disabled={mutation.isPending}
                style={styles.secondary}
              >
                <Text style={[ui.small, { color: theme.danger }]}>
                  {arOrEn(lang, "إلغاء أمر الشراء", "Cancel purchase order")}
                </Text>
              </Pressable>
            ) : null}
          </Card>
        </Pressable>
      ))}
      {receiveOrder ? (
        <Card
          theme={theme}
          style={[
            styles.card,
            { borderColor: theme.primaryStrong, backgroundColor: theme.surface },
          ]}
        >
          <Text style={[ui.sectionTitle, { color: theme.text }]}>
            {arOrEn(lang, "الكميات المستلمة", "Received quantities")}
          </Text>
          {receiveOrder.lines.map((line) => {
            const remaining = line.orderedQty - line.receivedQty;
            return (
              <View key={line.id} style={styles.receiveRow}>
                <Text style={[ui.small, styles.receiveName, { color: theme.text }]}>
                  {productNames.get(line.productId) ??
                    arOrEn(lang, "منتج غير معروف", "Unknown product")}{" "}
                  · {arOrEn(lang, `المتبقي ${remaining}`, `${remaining} remaining`)}
                </Text>
                <TextInput
                  keyboardType="number-pad"
                  value={receiveQty[line.id] ?? "0"}
                  onChangeText={(value) =>
                    setReceiveQty((current) => ({ ...current, [line.id]: value }))
                  }
                  style={[styles.qtyInput, { color: theme.text, borderColor: theme.border }]}
                />
              </View>
            );
          })}
          <PrimaryButton
            theme={theme}
            label={arOrEn(lang, "تأكيد الاستلام", "Confirm receipt")}
            disabled={
              mutation.isPending ||
              !receiveOrder.lines.some((line) => Number(receiveQty[line.id]) > 0)
            }
            onPress={() =>
              mutation.mutate(() =>
                receivePurchaseOrder(
                  receiveOrder.id,
                  receiveOrder.lines
                    .map((line) => ({
                      lineId: line.id,
                      receivedQty: Math.min(
                        Math.max(0, Number(receiveQty[line.id]) || 0),
                        line.orderedQty - line.receivedQty,
                      ),
                    }))
                    .filter((line) => line.receivedQty > 0),
                ),
              )
            }
          />
          <Pressable onPress={() => setReceiveOrder(null)} style={styles.secondary}>
            <Text style={[ui.small, { color: theme.muted }]}>{arOrEn(lang, "إغلاق", "Close")}</Text>
          </Pressable>
        </Card>
      ) : null}
      {!orders.data?.length ? (
        <EmptyText
          theme={theme}
          text={arOrEn(lang, "لا توجد أوامر شراء.", "No purchase orders.")}
        />
      ) : null}
    </>
  );
};

const statusLabel = (status: string, lang: Lang): string =>
  ({
    DRAFT: arOrEn(lang, "مسودة", "Draft"),
    PENDING_VALIDATION: arOrEn(lang, "بانتظار الموافقة", "Pending approval"),
    VALIDATED: arOrEn(lang, "معتمد", "Approved"),
    SENT: arOrEn(lang, "مرسل للمورد", "Sent"),
    PARTIALLY_RECEIVED: arOrEn(lang, "مستلم جزئياً", "Partially received"),
    RECEIVED: arOrEn(lang, "مستلم", "Received"),
    CANCELLED: arOrEn(lang, "ملغي", "Cancelled"),
  })[status] ?? status;
const styles = createSnowStyles({
  editorRoot: { flex: 1 },
  editorHeader: {
    minHeight: 76,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: { width: 42, height: 42, alignItems: "flex-start", justifyContent: "center" },
  editorTitle: { fontSize: 19, fontWeight: "700" },
  editorContent: { paddingHorizontal: spacing.lg, paddingBottom: 36 },
  editorCard: { borderWidth: 1, borderRadius: 13, gap: spacing.lg, padding: spacing.lg },
  hidden: { display: "none" },
  card: { borderWidth: 1, borderRadius: 13, gap: spacing.md, marginBottom: spacing.md },
  feedback: { padding: spacing.md, borderRadius: 10, marginBottom: spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  select: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: { flex: 1, fontSize: 13, fontWeight: "500" },
  line: { borderTopWidth: 1, paddingTop: spacing.lg, gap: spacing.sm },
  inputs: { flexDirection: "row", gap: spacing.sm },
  input: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: spacing.md,
  },
  secondary: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  receiveRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  receiveName: { flex: 1 },
  qtyInput: { width: 72, minHeight: 44, borderWidth: 1, borderRadius: 10, textAlign: "center" },
  selectorOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15,23,42,0.35)",
  },
  selectorDismissArea: { flex: 1 },
  selectorSheet: {
    maxHeight: "70%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing.lg,
    paddingBottom: 30,
  },
  selectorHeader: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorClose: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  selectorTitle: { fontSize: 16, fontWeight: "700" },
  selectorList: {},
  selectorOption: {
    minHeight: 54,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorOptionText: { flex: 1, fontSize: 13, fontWeight: "500" },
  selectorEmpty: { paddingVertical: spacing.xl, textAlign: "center" },
  detailHero: { borderWidth: 1, borderRadius: 13, padding: spacing.lg, gap: spacing.md },
  detailHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  detailCode: { fontSize: 22, lineHeight: 29, fontWeight: "700" },
  statusBadge: { borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  detailMetaRow: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  detailIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  detailSectionTitle: { fontSize: 17, lineHeight: 23, fontWeight: "700", marginTop: spacing.xl },
  detailLines: { borderWidth: 1, borderRadius: 13, overflow: "hidden" },
  detailLine: {
    minHeight: 92,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  productIndex: {
    width: 38,
    height: 38,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  quantity: { fontSize: 14, fontWeight: "700" },
  progressTrack: { height: 5, borderRadius: 3, overflow: "hidden", marginTop: spacing.xs },
  progressFill: { height: 5, borderRadius: 3 },
});
