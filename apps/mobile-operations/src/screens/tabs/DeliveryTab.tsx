import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  Card,
  PrimaryButton,
  createSnowStyles,
  spacing,
  transitionDeliveryTask,
  resolveDeliveryIssue,
  type DeliveryTask,
  type Lang,
  type SnowTheme,
} from "@tarhib/mobile-shared";
import { CenteredTitle, EmptyText, PriorityBadge, ui } from "../../components/ui";
import { arOrEn, operationsStatusLabel, orderCode } from "../../lib/format";

type DeliveryAction = "accept" | "pickup" | "depart" | "deliver";

export const DeliveryTab = ({
  theme,
  lang,
  tasks,
  loading,
  canManage,
}: {
  theme: SnowTheme;
  lang: Lang;
  tasks: DeliveryTask[];
  loading: boolean;
  canManage: boolean;
}) => {
  const queryClient = useQueryClient();
  const [issueTaskId, setIssueTaskId] = useState<string | null>(null);
  const [issueReason, setIssueReason] = useState("");
  const mutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: DeliveryAction }) =>
      transitionDeliveryTask(id, action),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["delivery-queue"] }),
  });
  const issueMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      transitionDeliveryTask(id, "issue", reason),
    onSuccess: () => {
      setIssueTaskId(null);
      setIssueReason("");
      void queryClient.invalidateQueries({ queryKey: ["delivery-queue"] });
    },
  });
  const resolveMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "resume" | "return" | "fail" }) =>
      resolveDeliveryIssue(id, action),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["delivery-queue"] }),
  });

  const actionFor = (status: DeliveryTask["status"]): readonly [DeliveryAction, string] | null => {
    if (status === "AVAILABLE") return ["accept", arOrEn(lang, "استلام المهمة", "Accept delivery")];
    if (status === "ASSIGNED")
      return ["pickup", arOrEn(lang, "تم استلام الطلب", "Order picked up")];
    if (status === "PICKED_UP") return ["depart", arOrEn(lang, "بدء التوصيل", "Start delivery")];
    if (status === "OUT_FOR_DELIVERY")
      return ["deliver", arOrEn(lang, "تم التوصيل", "Mark delivered")];
    return null;
  };

  return (
    <>
      <CenteredTitle title={arOrEn(lang, "جولة التوصيل", "My delivery route")} theme={theme} />
      {tasks.map((task) => {
        const next = actionFor(task.status);
        return (
          <Card
            key={task.id}
            theme={theme}
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Text style={[ui.orderId, { color: theme.text }]}>{orderCode(task.orderId)}</Text>
            {task.destination ? (
              <View style={styles.destination}>
                <Text style={[ui.orderId, { color: theme.text }]}>
                  {lang === "ar"
                    ? task.destination.recipientNameAr
                    : task.destination.recipientNameEn}
                </Text>
                <Text style={[ui.small, { color: theme.muted }]}>
                  {lang === "ar" ? task.destination.companyNameAr : task.destination.companyNameEn}{" "}
                  · {lang === "ar" ? task.destination.branchNameAr : task.destination.branchNameEn}
                </Text>
                <Text style={[ui.small, { color: theme.muted }]}>
                  {arOrEn(lang, "الطابق", "Floor")}: {task.destination.floor ?? "—"} ·{" "}
                  {arOrEn(lang, "المكتب", "Office")}: {task.destination.officeNumber ?? "—"}
                </Text>
              </View>
            ) : null}
            <Text style={[ui.small, { color: theme.muted }]}>
              {arOrEn(lang, `${task.order.lines.length} أصناف`, `${task.order.lines.length} items`)}{" "}
              · {arOrEn(lang, "الموعد", "due")}{" "}
              {new Date(task.order.slaDeadline).toLocaleTimeString(lang === "ar" ? "ar" : "en", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            <PriorityBadge priority={task.order.priority} theme={theme} lang={lang} />
            <Text style={[ui.badgeText, { color: theme.primaryStrong }]}>
              {operationsStatusLabel(task.status, lang)}
            </Text>
            {next ? (
              <PrimaryButton
                theme={theme}
                label={next[1]}
                disabled={mutation.isPending}
                onPress={() => mutation.mutate({ id: task.id, action: next[0] })}
              />
            ) : null}
            {["PICKED_UP", "OUT_FOR_DELIVERY"].includes(task.status) ? (
              issueTaskId === task.id ? (
                <View style={styles.issueForm}>
                  <TextInput
                    value={issueReason}
                    onChangeText={setIssueReason}
                    placeholder={arOrEn(lang, "صف المشكلة", "Describe the issue")}
                    placeholderTextColor={theme.muted}
                    multiline
                    style={[
                      styles.input,
                      {
                        color: theme.text,
                        borderColor: theme.border,
                        backgroundColor: theme.background,
                      },
                    ]}
                  />
                  <PrimaryButton
                    theme={theme}
                    label={arOrEn(lang, "إرسال البلاغ", "Submit issue")}
                    disabled={!issueReason.trim() || issueMutation.isPending}
                    onPress={() =>
                      issueMutation.mutate({ id: task.id, reason: issueReason.trim() })
                    }
                  />
                  <Pressable
                    onPress={() => {
                      setIssueTaskId(null);
                      setIssueReason("");
                    }}
                    style={styles.cancel}
                  >
                    <Text style={[ui.small, { color: theme.muted }]}>
                      {arOrEn(lang, "إلغاء", "Cancel")}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => setIssueTaskId(task.id)}
                  style={[styles.issueButton, { borderColor: theme.danger }]}
                >
                  <Text style={[ui.small, { color: theme.danger }]}>
                    {arOrEn(lang, "الإبلاغ عن مشكلة", "Report an issue")}
                  </Text>
                </Pressable>
              )
            ) : null}
            {canManage && task.status === "ISSUE_REPORTED" ? (
              <View style={styles.issueForm}>
                <Text style={[ui.small, { color: theme.danger }]}>{task.issueReason}</Text>
                <PrimaryButton
                  theme={theme}
                  label={arOrEn(lang, "استئناف التوصيل", "Resume delivery")}
                  disabled={resolveMutation.isPending}
                  onPress={() => resolveMutation.mutate({ id: task.id, action: "resume" })}
                />
                <Pressable
                  disabled={resolveMutation.isPending}
                  onPress={() => resolveMutation.mutate({ id: task.id, action: "return" })}
                  style={[styles.issueButton, { borderColor: theme.primaryStrong }]}
                >
                  <Text style={[ui.small, { color: theme.primaryStrong }]}>
                    {arOrEn(lang, "إرجاع إلى الفرع", "Return to branch")}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={resolveMutation.isPending}
                  onPress={() => resolveMutation.mutate({ id: task.id, action: "fail" })}
                  style={[styles.issueButton, { borderColor: theme.danger }]}
                >
                  <Text style={[ui.small, { color: theme.danger }]}>
                    {arOrEn(lang, "إغلاق كفشل", "Close as failed")}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </Card>
        );
      })}
      {!loading && tasks.length === 0 ? (
        <EmptyText
          theme={theme}
          text={arOrEn(lang, "لا توجد طلبات جاهزة للتوصيل.", "No deliveries are ready.")}
        />
      ) : null}
    </>
  );
};

const styles = createSnowStyles({
  card: { borderWidth: 1, borderRadius: 16, gap: spacing.md },
  issueForm: { gap: spacing.sm },
  input: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    textAlignVertical: "top",
  },
  issueButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancel: { minHeight: 40, alignItems: "center", justifyContent: "center" },
  destination: { gap: spacing.xs },
});
