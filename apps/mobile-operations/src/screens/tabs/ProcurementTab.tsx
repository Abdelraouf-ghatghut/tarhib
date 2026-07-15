import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
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
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [receiveOrder, setReceiveOrder] = useState<PurchaseOrder | null>(null);
  const [receiveQty, setReceiveQty] = useState<Record<string, string>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

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
        <Card
          theme={theme}
          style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}
        >
          <Text style={[ui.sectionTitle, { color: theme.text }]}>
            {editing === "new"
              ? arOrEn(lang, "أمر شراء جديد", "New purchase order")
              : arOrEn(lang, "تعديل المسودة", "Edit draft")}
          </Text>
          <Text style={[ui.small, { color: theme.muted }]}>
            {arOrEn(lang, "اختر المورد", "Select supplier")}
          </Text>
          <View style={styles.chips}>
            {(suppliers.data ?? []).map((supplier) => (
              <Pressable
                key={supplier.id}
                onPress={() => setSupplierId(supplier.id)}
                style={[
                  styles.chip,
                  {
                    borderColor: supplierId === supplier.id ? theme.primaryStrong : theme.border,
                    backgroundColor:
                      supplierId === supplier.id ? theme.primarySoft : theme.background,
                  },
                ]}
              >
                <Text style={[ui.small, { color: theme.text }]}>
                  {supplierNames.get(supplier.id)}
                </Text>
              </Pressable>
            ))}
          </View>
          {lines.map((line, index) => (
            <View key={index} style={[styles.line, { borderColor: theme.border }]}>
              <Text style={[ui.small, { color: theme.muted }]}>
                {arOrEn(lang, "المنتج", "Product")} {index + 1}
              </Text>
              <View style={styles.chips}>
                {(products.data ?? []).map((product) => (
                  <Pressable
                    key={product.id}
                    onPress={() =>
                      setLines((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, productId: product.id } : item,
                        ),
                      )
                    }
                    style={[
                      styles.chip,
                      {
                        borderColor:
                          line.productId === product.id ? theme.primaryStrong : theme.border,
                      },
                    ]}
                  >
                    <Text style={[ui.small, { color: theme.text }]}>
                      {productNames.get(product.id)}
                    </Text>
                  </Pressable>
                ))}
              </View>
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
      ) : null}
      {(orders.data ?? []).map((order) => (
        <Card
          key={order.id}
          theme={theme}
          style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}
        >
          <Text style={[ui.orderId, { color: theme.text }]}>
            #{order.id.slice(0, 8).toUpperCase()}
          </Text>
          <Text style={[ui.small, { color: theme.text }]}>
            {supplierNames.get(order.supplierId) ?? order.supplierId}
          </Text>
          <Text style={[ui.badgeText, { color: theme.primaryStrong }]}>
            {statusLabel(order.status, lang)}
          </Text>
          {order.lines.map((line) => (
            <Text key={line.id} style={[ui.small, { color: theme.muted }]}>
              {productNames.get(line.productId) ?? line.productId}: {line.receivedQty}/
              {line.orderedQty}
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
                onPress={() => mutation.mutate(() => transitionPurchaseOrder(order.id, "validate"))}
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
                  {productNames.get(line.productId) ?? line.productId} ·{" "}
                  {arOrEn(lang, `المتبقي ${remaining}`, `${remaining} remaining`)}
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
  card: { borderWidth: 1, borderRadius: 16, gap: spacing.md },
  feedback: { padding: spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  line: { borderTopWidth: 1, paddingTop: spacing.md, gap: spacing.sm },
  inputs: { flexDirection: "row", gap: spacing.sm },
  input: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
  },
  secondary: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  receiveRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  receiveName: { flex: 1 },
  qtyInput: { width: 72, minHeight: 44, borderWidth: 1, borderRadius: 10, textAlign: "center" },
});
