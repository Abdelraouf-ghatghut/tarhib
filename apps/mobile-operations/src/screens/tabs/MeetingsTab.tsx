import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Card,
  PrimaryButton,
  assignMeetingPreparation,
  createSnowStyles,
  fetchMeetingPreparations,
  fetchOperationsTeam,
  spacing,
  toggleMeetingChecklist,
  transitionMeetingPreparation,
  type Lang,
  type MeetingPreparation,
  type SnowTheme,
} from "@tarhib/mobile-shared";
import { CenteredTitle, EmptyText, LoadingCard, ui } from "../../components/ui";
import { arOrEn, operationsStatusLabel } from "../../lib/format";
import { RecordDetailModal } from "../../modals/RecordDetailModal";

export const MeetingsTab = ({
  theme,
  lang,
  canManage,
}: {
  theme: SnowTheme;
  lang: Lang;
  canManage: boolean;
}) => {
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<MeetingPreparation | null>(null);
  const query = useQuery({
    queryKey: ["meeting-preparations"],
    queryFn: fetchMeetingPreparations,
    refetchInterval: 30_000,
  });
  const team = useQuery({
    queryKey: ["operations-team"],
    queryFn: fetchOperationsTeam,
    enabled: canManage,
  });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["meeting-preparations"] });
  const transition = useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: "start" | "ready" | "complete" | "verify";
    }) => transitionMeetingPreparation(id, action),
    onSuccess: refresh,
  });
  const toggle = useMutation({
    mutationFn: ({ id, key }: { id: string; key: string }) => toggleMeetingChecklist(id, key),
    onSuccess: refresh,
  });
  const assign = useMutation({
    mutationFn: ({ id, employeeId }: { id: string; employeeId: string }) =>
      assignMeetingPreparation(id, employeeId),
    onSuccess: () => {
      refresh();
      void queryClient.invalidateQueries({ queryKey: ["operations-team"] });
    },
  });
  const employeeName = (employee: NonNullable<typeof team.data>[number]) =>
    lang === "ar"
      ? `${employee.firstNameAr} ${employee.lastNameAr}`
      : `${employee.firstNameEn} ${employee.lastNameEn}`;
  const checklistLabel = (key: string, fallback: string) =>
    ({
      room: arOrEn(lang, "تجهيز الغرفة", "Room set up"),
      equipment: arOrEn(lang, "اختبار المعدات", "Equipment tested"),
      service: arOrEn(lang, "تحضير المشروبات والخدمة", "Drinks and service prepared"),
      control: arOrEn(lang, "الفحص النهائي", "Final check"),
    })[key] ?? fallback;

  return (
    <>
      <CenteredTitle
        title={arOrEn(lang, "تحضير الاجتماعات", "Meeting preparation")}
        theme={theme}
      />
      {query.isLoading ? <LoadingCard theme={theme} /> : null}
      {(query.data ?? []).map((task) => (
        <Pressable key={task.id} onPress={() => setSelectedTask(task)}>
          <Card
            theme={theme}
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Text style={[ui.orderId, { color: theme.text }]}>
              {arOrEn(lang, "اجتماع", "Meeting")}{" "}
              {task.booking
                ? new Date(task.booking.startTime).toLocaleString(lang === "ar" ? "ar" : "en")
                : `#${task.bookingId.slice(0, 8)}`}
            </Text>
            <Text style={[ui.badgeText, { color: theme.primaryStrong }]}>
              {operationsStatusLabel(task.status, lang)}
            </Text>
            {canManage && !["COMPLETED", "VERIFIED"].includes(task.status) ? (
              <View style={styles.list}>
                <Text style={[ui.small, { color: theme.muted }]}>
                  {arOrEn(lang, "إسناد المهمة حسب عبء العمل", "Assign by workload")}
                </Text>
                {(team.data ?? []).map((employee) => (
                  <Pressable
                    key={employee.id}
                    disabled={assign.isPending}
                    onPress={() => assign.mutate({ id: task.id, employeeId: employee.id })}
                    style={[
                      styles.person,
                      {
                        borderColor:
                          task.assignedEmployeeId === employee.id
                            ? theme.primaryStrong
                            : theme.border,
                      },
                    ]}
                  >
                    <Text style={[ui.small, { color: theme.text }]}>{employeeName(employee)}</Text>
                    <Text style={[ui.badgeText, { color: theme.muted }]}>
                      {arOrEn(
                        lang,
                        `${employee.activeTaskCount} مهام`,
                        `${employee.activeTaskCount} active`,
                      )}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <View style={styles.list}>
              {task.checklist.map((item) => (
                <Pressable
                  key={item.key}
                  disabled={task.status !== "IN_PROGRESS"}
                  onPress={() => toggle.mutate({ id: task.id, key: item.key })}
                  style={styles.row}
                >
                  <Text style={{ color: item.done ? theme.success : theme.muted, fontSize: 18 }}>
                    {item.done ? "✓" : "○"}
                  </Text>
                  <Text style={[ui.small, { color: theme.text }]}>
                    {checklistLabel(item.key, item.label)}
                  </Text>
                </Pressable>
              ))}
            </View>
            {["PENDING", "ASSIGNED"].includes(task.status) ? (
              <PrimaryButton
                theme={theme}
                label={arOrEn(lang, "بدء التحضير", "Start preparation")}
                disabled={transition.isPending}
                onPress={() => transition.mutate({ id: task.id, action: "start" })}
              />
            ) : null}
            {task.status === "IN_PROGRESS" ? (
              <PrimaryButton
                theme={theme}
                label={arOrEn(lang, "الغرفة جاهزة", "Room ready")}
                disabled={transition.isPending || task.checklist.some((item) => !item.done)}
                onPress={() => transition.mutate({ id: task.id, action: "ready" })}
              />
            ) : null}
            {task.status === "READY" ? (
              <PrimaryButton
                theme={theme}
                label={arOrEn(lang, "اكتملت الخدمة", "Service completed")}
                disabled={transition.isPending}
                onPress={() => transition.mutate({ id: task.id, action: "complete" })}
              />
            ) : null}
            {canManage && task.status === "COMPLETED" ? (
              <PrimaryButton
                theme={theme}
                label={arOrEn(lang, "اعتماد المهمة", "Verify task")}
                disabled={transition.isPending}
                onPress={() => transition.mutate({ id: task.id, action: "verify" })}
              />
            ) : null}
          </Card>
        </Pressable>
      ))}
      {!query.isLoading && !query.data?.length ? (
        <EmptyText
          theme={theme}
          text={arOrEn(lang, "لا توجد اجتماعات للتحضير.", "No meetings to prepare.")}
        />
      ) : null}
      {selectedTask ? (
        <RecordDetailModal
          visible
          theme={theme}
          lang={lang}
          title={arOrEn(lang, "تفاصيل تحضير الاجتماع", "Meeting preparation details")}
          reference={`#${selectedTask.bookingId.slice(0, 8).toUpperCase()}`}
          status={operationsStatusLabel(selectedTask.status, lang)}
          fields={[
            {
              label: arOrEn(lang, "بداية الاجتماع", "Meeting starts"),
              value: selectedTask.booking
                ? new Date(selectedTask.booking.startTime).toLocaleString(
                    lang === "ar" ? "ar" : "en",
                  )
                : arOrEn(lang, "غير محدد", "Not specified"),
              icon: "time-outline",
            },
            {
              label: arOrEn(lang, "نهاية الاجتماع", "Meeting ends"),
              value: selectedTask.booking
                ? new Date(selectedTask.booking.endTime).toLocaleString(lang === "ar" ? "ar" : "en")
                : arOrEn(lang, "غير محدد", "Not specified"),
              icon: "calendar-outline",
            },
            {
              label: arOrEn(lang, "الغرفة", "Room"),
              value: selectedTask.booking?.roomId ?? arOrEn(lang, "غير محددة", "Not specified"),
              icon: "business-outline",
            },
            {
              label: arOrEn(lang, "قائمة التحقق", "Checklist"),
              value: arOrEn(
                lang,
                `${selectedTask.checklist.filter((item) => item.done).length} من ${selectedTask.checklist.length}`,
                `${selectedTask.checklist.filter((item) => item.done).length} of ${selectedTask.checklist.length}`,
              ),
              icon: "checkbox-outline",
            },
          ]}
          onClose={() => setSelectedTask(null)}
        />
      ) : null}
    </>
  );
};

const styles = createSnowStyles({
  card: { borderWidth: 1, borderRadius: 13, gap: spacing.md, marginBottom: spacing.md },
  list: { gap: spacing.sm },
  row: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  person: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
});
