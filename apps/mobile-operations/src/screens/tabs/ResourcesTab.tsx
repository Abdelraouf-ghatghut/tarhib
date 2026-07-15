import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Text, View } from "react-native";
import {
  Card,
  PrimaryButton,
  completeVipTask,
  confirmInventoryTransfer,
  createSnowStyles,
  fetchInventoryTransfers,
  fetchPurchaseOrders,
  fetchReplenishmentRequests,
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
import { arOrEn, operationsStatusLabel } from "../../lib/format";

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
                : `${Array.isArray(row.lines) ? row.lines.length : 0} ${arOrEn(lang, "بنود", "lines")} · ${arOrEn(lang, "المورد", "supplier")} ${String(row.supplierId).slice(0, 8)}`;
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
          <Card
            key={id}
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
                onPress={() => mutation.mutate({ id, action: action.action, order: purchaseOrder })}
              />
            ) : null}
          </Card>
        );
      })}
      {!query.isLoading && rows.length === 0 ? (
        <EmptyText
          theme={theme}
          text={arOrEn(lang, "لا توجد عناصر للمعالجة.", "Nothing to process.")}
        />
      ) : null}
    </>
  );
};

const styles = createSnowStyles({ card: { borderWidth: 1, borderRadius: 16, gap: spacing.md } });
