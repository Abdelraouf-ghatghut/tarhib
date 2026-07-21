import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Card,
  PrimaryButton,
  createSnowStyles,
  resolveDeliveryIssue,
  spacing,
  type DeliveryTask,
  type Lang,
  type SnowTheme,
} from "@tarhib/mobile-shared";

import { CenteredTitle, EmptyText, ui } from "../../components/ui";
import { arOrEn } from "../../lib/format";
import { RecordDetailModal } from "../../modals/RecordDetailModal";

export const IncidentsTab = ({
  theme,
  lang,
  tasks,
}: {
  theme: SnowTheme;
  lang: Lang;
  tasks: DeliveryTask[];
}) => {
  const [filter, setFilter] = useState<"OPEN" | "CLOSED">("OPEN");
  const [selected, setSelected] = useState<DeliveryTask | null>(null);
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "resume" | "return" | "fail" }) =>
      resolveDeliveryIssue(id, action),
    onSettled: () => void client.invalidateQueries({ queryKey: ["delivery-queue"] }),
  });
  const incidents = tasks.filter((task) =>
    filter === "OPEN"
      ? task.status === "ISSUE_REPORTED"
      : ["RETURNED", "FAILED"].includes(task.status),
  );

  return (
    <>
      <CenteredTitle title={arOrEn(lang, "الحوادث", "Incidents")} theme={theme} />
      <View
        style={[styles.filters, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
      >
        {(["OPEN", "CLOSED"] as const).map((value) => {
          const active = filter === value;
          return (
            <Pressable
              key={value}
              onPress={() => setFilter(value)}
              style={[
                styles.filter,
                { backgroundColor: active ? theme.primaryStrong : "transparent" },
              ]}
            >
              <Text
                style={[ui.small, { color: active ? "#FFFFFF" : theme.muted, fontWeight: "600" }]}
              >
                {value === "OPEN"
                  ? arOrEn(lang, "مفتوحة", "Open")
                  : arOrEn(lang, "مغلقة", "Closed")}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {incidents.map((task) => (
        <Pressable key={task.id} onPress={() => setSelected(task)}>
          <Card
            theme={theme}
            style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}
          >
            <View style={styles.row}>
              <Text style={[ui.orderId, { color: theme.text }]}>
                INC-{task.id.slice(0, 4).toUpperCase()}
              </Text>
              <Text style={[ui.small, { color: theme.muted }]}>
                {new Date(task.createdAt).toLocaleDateString(lang === "ar" ? "ar" : "en")}
              </Text>
            </View>
            <Text style={[styles.reason, { color: theme.text }]}>
              {task.issueDescription ||
                task.issueReason ||
                arOrEn(lang, "مشكلة توصيل", "Delivery issue")}
            </Text>
            {task.status === "ISSUE_REPORTED" ? (
              <>
                <PrimaryButton
                  theme={theme}
                  label={arOrEn(lang, "استئناف", "Resume")}
                  disabled={mutation.isPending}
                  onPress={() => mutation.mutate({ id: task.id, action: "resume" })}
                />
                <View style={styles.actions}>
                  <Pressable
                    disabled={mutation.isPending}
                    onPress={() => mutation.mutate({ id: task.id, action: "return" })}
                    style={[styles.secondaryAction, { borderColor: theme.border }]}
                  >
                    <Text style={[ui.small, { color: theme.warning, fontWeight: "600" }]}>
                      {arOrEn(lang, "إرجاع للفرع", "Return")}
                    </Text>
                  </Pressable>
                  <Pressable
                    disabled={mutation.isPending}
                    onPress={() => mutation.mutate({ id: task.id, action: "fail" })}
                    style={[
                      styles.secondaryAction,
                      { borderColor: `${theme.danger}40`, backgroundColor: `${theme.danger}08` },
                    ]}
                  >
                    <Text style={[ui.small, { color: theme.danger, fontWeight: "600" }]}>
                      {arOrEn(lang, "إغلاق كفشل", "Fail")}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </Card>
        </Pressable>
      ))}
      {!incidents.length ? (
        <EmptyText theme={theme} text={arOrEn(lang, "لا توجد حوادث.", "No incidents.")} />
      ) : null}
      {selected ? (
        <RecordDetailModal
          visible
          theme={theme}
          lang={lang}
          title={arOrEn(lang, "تفاصيل الحادث", "Incident details")}
          reference={`INC-${selected.id.slice(0, 4).toUpperCase()}`}
          status={selected.status}
          fields={[
            {
              label: arOrEn(lang, "النوع", "Type"),
              value: selected.issueReason || arOrEn(lang, "مشكلة توصيل", "Delivery issue"),
              icon: "warning-outline",
            },
            {
              label: arOrEn(lang, "الوصف", "Description"),
              value: selected.issueDescription || arOrEn(lang, "لا يوجد وصف", "No description"),
              icon: "document-text-outline",
            },
            {
              label: arOrEn(lang, "الطلب", "Order"),
              value: `#${selected.order.id.slice(0, 8).toUpperCase()}`,
              icon: "receipt-outline",
            },
            {
              label: arOrEn(lang, "تاريخ البلاغ", "Reported on"),
              value: new Date(selected.createdAt).toLocaleString(lang === "ar" ? "ar" : "en"),
              icon: "calendar-outline",
            },
          ]}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </>
  );
};

const styles = createSnowStyles({
  filters: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 10,
    padding: 3,
    flexDirection: "row",
    gap: 3,
    marginBottom: spacing.lg,
  },
  filter: { flex: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  card: { borderWidth: 1, borderRadius: 13, gap: spacing.md, marginBottom: spacing.md },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reason: { fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: "row", gap: spacing.sm },
  secondaryAction: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
