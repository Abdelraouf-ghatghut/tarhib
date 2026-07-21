import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Card,
  PrimaryButton,
  completeVipTask,
  confirmInventoryTransfer,
  createSnowStyles,
  fetchEmployeeCatalog,
  fetchInventoryTransfers,
  fetchPurchaseOrders,
  fetchReplenishmentRequests,
  fetchSuppliers,
  fetchVipTasks,
  receivePurchaseOrder,
  spacing,
  transitionPurchaseOrder,
  transitionReplenishment,
  type Lang,
  type PurchaseOrder,
  type PurchaseOrderAction,
  type SnowTheme,
} from "@tarhib/mobile-shared";
import { CenteredTitle, EmptyText, LoadingCard, ui } from "../../components/ui";
import { arOrEn, operationsStatusLabel, productName } from "../../lib/format";
import { RecordDetailModal } from "../../modals/RecordDetailModal";

type Kind = "transfers" | "replenishments" | "vip" | "procurement";

export const ResourcesTab = ({
  kind,
  theme,
  lang,
  canWrite,
}: {
  kind: Kind;
  theme: SnowTheme;
  lang: Lang;
  canWrite: boolean;
}) => {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const suppliersQuery = useQuery({
    queryKey: ["operations-suppliers"],
    queryFn: fetchSuppliers,
    staleTime: 300_000,
  });
  const productsQuery = useQuery({
    queryKey: ["operations-products"],
    queryFn: fetchEmployeeCatalog,
    staleTime: 300_000,
  });
  const supplierNames = new Map(
    (suppliersQuery.data ?? []).map((item) => [
      item.id,
      lang === "ar" ? item.nameAr : item.nameEn || item.nameAr,
    ]),
  );
  const productNames = new Map(
    (productsQuery.data ?? []).map((item) => [item.id, productName(item, lang, item.id)]),
  );
  const query = useQuery<Array<Record<string, unknown>>>({
    queryKey: ["operations-resource", kind],
    queryFn: async () => {
      const data =
        kind === "transfers"
          ? await fetchInventoryTransfers()
          : kind === "replenishments"
            ? await fetchReplenishmentRequests()
            : kind === "vip"
              ? await fetchVipTasks()
              : await fetchPurchaseOrders();
      return data as unknown as Array<Record<string, unknown>>;
    },
    refetchInterval: 30_000,
  });
  const mutation = useMutation({
    mutationFn: async ({
      id,
      action,
      order,
    }: {
      id: string;
      action: string;
      order?: PurchaseOrder;
    }) => {
      if (kind === "transfers") return confirmInventoryTransfer(id);
      if (kind === "replenishments")
        return transitionReplenishment(id, action as "approve" | "fulfill");
      if (kind === "vip") return completeVipTask(id);
      if (action === "receive" && order) {
        return receivePurchaseOrder(
          id,
          order.lines
            .map((line) => ({ lineId: line.id, receivedQty: line.orderedQty - line.receivedQty }))
            .filter((line) => line.receivedQty > 0),
        );
      }
      return transitionPurchaseOrder(id, action as PurchaseOrderAction);
    },
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["operations-resource", kind] }),
  });

  const title =
    kind === "transfers"
      ? arOrEn(lang, "التحويلات", "Transfers")
      : kind === "replenishments"
        ? arOrEn(lang, "طلبات المطبخ", "Kitchen requests")
        : kind === "vip"
          ? arOrEn(lang, "إعادة تزويد كبار الشخصيات", "VIP replenishment")
          : arOrEn(lang, "المشتريات", "Purchasing");
  const rows = query.data ?? [];

  return (
    <>
      <CenteredTitle title={title} theme={theme} />
      {query.isLoading ? <LoadingCard theme={theme} /> : null}
      {rows.map((row) => {
        const id = String(row.id);
        const status = String(row.status ?? "");
        const purchaseOrder =
          kind === "procurement" ? (row as unknown as PurchaseOrder) : undefined;
        const subtitle =
          kind === "transfers"
            ? `${String(row.fromZone)} → ${String(row.toZone)} · ${String(row.quantity)} ${arOrEn(lang, "وحدة", "units")}`
            : kind === "replenishments"
              ? `${String(row.requestedQty)} ${arOrEn(lang, "وحدة مطلوبة", "units requested")}`
              : kind === "vip"
                ? `${String(row.locationName ?? "VIP")} · ${String(row.requestedQty)} ${arOrEn(lang, "وحدة", "units")}`
                : `${Array.isArray(row.lines) ? row.lines.length : 0} ${arOrEn(lang, "بنود", "lines")} · ${arOrEn(lang, "المورد", "supplier")} ${supplierNames.get(String(row.supplierId)) ?? arOrEn(lang, "غير معروف", "Unknown")}`;
        const basicAction =
          kind === "transfers" && status === "PENDING"
            ? { action: "confirm", label: arOrEn(lang, "تأكيد التحويل", "Confirm transfer") }
            : kind === "replenishments" && status === "REQUESTED"
              ? {
                  action: "approve",
                  label: arOrEn(lang, "الموافقة وإنشاء التحويل", "Approve and create transfer"),
                }
              : kind === "replenishments" && status === "APPROVED"
                ? { action: "fulfill", label: arOrEn(lang, "تأكيد الاستلام", "Confirm receipt") }
                : kind === "vip" && ["OPEN", "IN_PROGRESS"].includes(status)
                  ? {
                      action: "complete",
                      label: arOrEn(lang, "إنهاء إعادة التزويد", "Complete replenishment"),
                    }
                  : null;
        const purchaseAction =
          status === "DRAFT"
            ? { action: "submit", label: arOrEn(lang, "إرسال للموافقة", "Submit for approval") }
            : status === "PENDING_VALIDATION"
              ? {
                  action: "validate",
                  label: arOrEn(lang, "اعتماد أمر الشراء", "Approve purchase order"),
                }
              : status === "VALIDATED"
                ? { action: "send", label: arOrEn(lang, "إرسال إلى المورد", "Send to supplier") }
                : ["SENT", "PARTIALLY_RECEIVED"].includes(status)
                  ? {
                      action: "receive",
                      label: arOrEn(lang, "استلام الكمية المتبقية", "Receive remaining items"),
                    }
                  : null;
        const action = kind === "procurement" ? purchaseAction : basicAction;

        return (
          <Pressable key={id} onPress={() => setSelected(row)}>
            <Card
              theme={theme}
              style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}
            >
              <View style={ui.rowInfo}>
                <Text style={[ui.orderId, { color: theme.text }]}>
                  #{id.slice(0, 8).toUpperCase()}
                </Text>
                <Text style={[ui.small, { color: theme.muted }]}>{subtitle}</Text>
                <Text style={[ui.badgeText, { color: theme.primaryStrong }]}>
                  {operationsStatusLabel(status, lang)}
                </Text>
              </View>
              {canWrite && action ? (
                <PrimaryButton
                  theme={theme}
                  label={action.label}
                  disabled={mutation.isPending}
                  onPress={() =>
                    mutation.mutate({ id, action: action.action, order: purchaseOrder })
                  }
                />
              ) : null}
            </Card>
          </Pressable>
        );
      })}
      {!query.isLoading && rows.length === 0 ? (
        <EmptyText
          theme={theme}
          text={arOrEn(lang, "لا توجد عناصر للمعالجة.", "Nothing to process.")}
        />
      ) : null}
      {selected ? (
        <RecordDetailModal
          visible
          theme={theme}
          lang={lang}
          title={title}
          reference={`#${String(selected.id).slice(0, 8).toUpperCase()}`}
          status={operationsStatusLabel(String(selected.status ?? ""), lang)}
          fields={Object.entries(selected)
            .filter(
              ([key, value]) =>
                !["id", "status", "lines", "companyId", "branchId"].includes(key) &&
                (!key.endsWith("Id") ||
                  ["supplierId", "productId", "cleaningProductId", "transferId"].includes(key)) &&
                value != null &&
                typeof value !== "object",
            )
            .map(([key, value]) => ({
              label: key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()),
              value:
                key === "supplierId"
                  ? (supplierNames.get(String(value)) ??
                    arOrEn(lang, "مورد غير معروف", "Unknown supplier"))
                  : key === "productId" || key === "cleaningProductId"
                    ? (productNames.get(String(value)) ??
                      arOrEn(lang, "منتج غير معروف", "Unknown product"))
                    : key.endsWith("EmployeeId")
                      ? arOrEn(lang, "موظف غير معروف", "Unknown employee")
                      : String(value),
            }))}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </>
  );
};

const styles = createSnowStyles({
  card: { borderWidth: 1, borderRadius: 13, gap: spacing.md, marginBottom: spacing.md },
});
