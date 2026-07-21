import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  Card,
  PrimaryButton,
  completeCleaningTask,
  createCleaningTask,
  assignCleaningTask,
  createSnowStyles,
  fetchCleaningTasks,
  fetchCleaningProducts,
  fetchCleaningStock,
  requestCleaningStock,
  fetchCleaningStockRequests,
  transitionCleaningStockRequest,
  fetchOperationsTeam,
  spacing,
  startCleaningTask,
  useAuthStore,
  type CleaningTask,
  type Lang,
  type SnowTheme,
} from "@tarhib/mobile-shared";
import { CenteredTitle, EmptyText, LoadingCard, ui } from "../../components/ui";
import { arOrEn, operationsStatusLabel } from "../../lib/format";
import { RecordDetailModal } from "../../modals/RecordDetailModal";

export const CleaningTab = ({
  theme,
  lang,
  canComplete,
  canManage,
  canViewProducts,
  canRequestStock,
}: {
  theme: SnowTheme;
  lang: Lang;
  canComplete: boolean;
  canManage: boolean;
  canViewProducts: boolean;
  canRequestStock: boolean;
}) => {
  const queryClient = useQueryClient();
  const companyId = useAuthStore((state) => state.companyId);
  const branchId = useAuthStore((state) => state.branchId);
  const [creating, setCreating] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CleaningTask | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const query = useQuery({
    queryKey: ["cleaning-tasks"],
    queryFn: fetchCleaningTasks,
    refetchInterval: 30_000,
  });
  const team = useQuery({
    queryKey: ["operations-team"],
    queryFn: fetchOperationsTeam,
    enabled: canManage,
  });
  const products = useQuery({
    queryKey: ["cleaning-products"],
    queryFn: fetchCleaningProducts,
    enabled: canViewProducts,
  });
  const stock = useQuery({
    queryKey: ["cleaning-stock"],
    queryFn: fetchCleaningStock,
    enabled: canViewProducts,
  });
  const stockRequests = useQuery({
    queryKey: ["cleaning-stock-requests"],
    queryFn: fetchCleaningStockRequests,
    enabled: canManage,
  });
  const mutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "start" | "complete" }) =>
      action === "start" ? startCleaningTask(id) : completeCleaningTask(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["cleaning-tasks"] }),
  });
  const managementMutation = useMutation({
    mutationFn: ({
      action,
      taskId,
      employeeId,
    }: {
      action: "create" | "assign";
      taskId?: string;
      employeeId?: string;
    }) => {
      if (action === "assign") return assignCleaningTask(taskId!, employeeId!);
      return createCleaningTask({
        companyId: companyId!,
        branchId: branchId!,
        title: title.trim(),
        description: description.trim() || undefined,
        assignedEmployeeId: assigneeId || undefined,
      });
    },
    onSuccess: () => {
      setCreating(false);
      setTitle("");
      setDescription("");
      setAssigneeId("");
      void queryClient.invalidateQueries({ queryKey: ["cleaning-tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["operations-team"] });
    },
  });
  const employeeName = (employee: NonNullable<typeof team.data>[number]) =>
    lang === "ar"
      ? `${employee.firstNameAr} ${employee.lastNameAr}`
      : `${employee.firstNameEn} ${employee.lastNameEn}`;
  const stockRequest = useMutation({
    mutationFn: (productId: string) =>
      requestCleaningStock({
        companyId: companyId!,
        branchId: branchId!,
        cleaningProductId: productId,
        requestedQty: 1,
        note: arOrEn(lang, "طلب من موظف النظافة", "Requested by cleaning agent"),
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["cleaning-stock-requests"] }),
  });
  const stockRequestTransition = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "fulfill" }) =>
      transitionCleaningStockRequest(id, action),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["cleaning-stock-requests"] }),
  });

  return (
    <>
      <CenteredTitle title={arOrEn(lang, "مهام التنظيف", "My cleaning tasks")} theme={theme} />
      {canManage && !creating ? (
        <PrimaryButton
          theme={theme}
          label={arOrEn(lang, "إنشاء مهمة", "Create task")}
          onPress={() => setCreating(true)}
        />
      ) : null}
      {canManage && creating ? (
        <Card
          theme={theme}
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.primaryStrong },
          ]}
        >
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={arOrEn(lang, "عنوان المهمة", "Task title")}
            placeholderTextColor={theme.muted}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={arOrEn(lang, "الموقع والتفاصيل", "Location and details")}
            placeholderTextColor={theme.muted}
            multiline
            style={[
              styles.input,
              styles.multiline,
              { color: theme.text, borderColor: theme.border },
            ]}
          />
          <Text style={[ui.small, { color: theme.muted }]}>
            {arOrEn(lang, "إسناد اختياري", "Optional assignee")}
          </Text>
          <View style={styles.team}>
            {(team.data ?? []).map((employee) => (
              <Pressable
                key={employee.id}
                onPress={() => setAssigneeId(employee.id)}
                style={[
                  styles.person,
                  { borderColor: assigneeId === employee.id ? theme.primaryStrong : theme.border },
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
          <PrimaryButton
            theme={theme}
            label={arOrEn(lang, "حفظ المهمة", "Save task")}
            disabled={!title.trim() || !companyId || !branchId || managementMutation.isPending}
            onPress={() => managementMutation.mutate({ action: "create" })}
          />
          <Pressable onPress={() => setCreating(false)} style={styles.cancel}>
            <Text style={[ui.small, { color: theme.muted }]}>
              {arOrEn(lang, "إلغاء", "Cancel")}
            </Text>
          </Pressable>
        </Card>
      ) : null}
      {query.isLoading ? <LoadingCard theme={theme} /> : null}
      {(query.data ?? []).map((task) => (
        <Pressable key={task.id} onPress={() => setSelectedTask(task)}>
          <Card
            theme={theme}
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Text style={[ui.orderId, { color: theme.text }]}>{task.title}</Text>
            {task.description ? (
              <Text style={[ui.small, { color: theme.muted }]}>{task.description}</Text>
            ) : null}
            <Text style={[ui.badgeText, { color: theme.primaryStrong }]}>
              {operationsStatusLabel(task.status, lang)}
              {task.dueDate ? ` · ${task.dueDate}` : ""}
            </Text>
            {canComplete && task.status === "ASSIGNED" ? (
              <PrimaryButton
                theme={theme}
                label={arOrEn(lang, "بدء المهمة", "Start task")}
                disabled={mutation.isPending}
                onPress={() => mutation.mutate({ id: task.id, action: "start" })}
              />
            ) : null}
            {canComplete && task.status === "IN_PROGRESS" ? (
              <PrimaryButton
                theme={theme}
                label={arOrEn(lang, "تحديد كمكتملة", "Mark completed")}
                disabled={mutation.isPending}
                onPress={() => mutation.mutate({ id: task.id, action: "complete" })}
              />
            ) : null}
            {canManage && !["DONE", "VERIFIED", "CANCELLED"].includes(task.status) ? (
              <View style={styles.team}>
                {(team.data ?? []).map((employee) => (
                  <Pressable
                    key={employee.id}
                    disabled={managementMutation.isPending}
                    onPress={() =>
                      managementMutation.mutate({
                        action: "assign",
                        taskId: task.id,
                        employeeId: employee.id,
                      })
                    }
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
                      {employee.activeTaskCount}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </Card>
        </Pressable>
      ))}
      {!query.isLoading && !query.data?.length ? (
        <EmptyText theme={theme} text={arOrEn(lang, "لا توجد مهام مسندة.", "No assigned tasks.")} />
      ) : null}
      {selectedTask ? (
        <RecordDetailModal
          visible
          theme={theme}
          lang={lang}
          title={arOrEn(lang, "تفاصيل مهمة التنظيف", "Cleaning task details")}
          reference={selectedTask.title}
          status={operationsStatusLabel(selectedTask.status, lang)}
          fields={[
            {
              label: arOrEn(lang, "الوصف", "Description"),
              value: selectedTask.description || arOrEn(lang, "لا يوجد وصف", "No description"),
              icon: "document-text-outline",
            },
            {
              label: arOrEn(lang, "الموعد", "Due date"),
              value: selectedTask.dueDate
                ? new Date(selectedTask.dueDate).toLocaleString(lang === "ar" ? "ar" : "en")
                : arOrEn(lang, "غير محدد", "Not specified"),
              icon: "calendar-outline",
            },
            {
              label: arOrEn(lang, "الموظف المسند إليه", "Assigned employee"),
              value: selectedTask.assignedEmployeeId
                ? (() => {
                    const employee = (team.data ?? []).find(
                      (entry) => entry.id === selectedTask.assignedEmployeeId,
                    );
                    return employee
                      ? employeeName(employee)
                      : arOrEn(lang, "موظف غير معروف", "Unknown employee");
                  })()
                : arOrEn(lang, "غير مسندة", "Unassigned"),
              icon: "person-outline",
            },
          ]}
          onClose={() => setSelectedTask(null)}
        />
      ) : null}
      {canViewProducts ? (
        <>
          <Text style={[ui.sectionTitle, { color: theme.text }]}>
            {arOrEn(lang, "منتجات النظافة", "Cleaning supplies")}
          </Text>
          {(stock.data ?? []).map((item) => {
            const product = (products.data ?? []).find(
              (entry) => entry.id === item.cleaningProductId,
            );
            return (
              <Card
                key={item.id}
                theme={theme}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.surface,
                    borderColor: item.quantity <= item.minThreshold ? theme.danger : theme.border,
                  },
                ]}
              >
                <Text style={[ui.orderId, { color: theme.text }]}>
                  {product
                    ? lang === "ar"
                      ? product.nameAr
                      : product.nameEn
                    : arOrEn(lang, "منتج غير معروف", "Unknown product")}
                </Text>
                <Text style={[ui.small, { color: theme.muted }]}>
                  {arOrEn(lang, "الكمية", "Quantity")}: {item.quantity} · {item.locationName ?? "—"}
                </Text>
                {canRequestStock && item.quantity <= item.minThreshold ? (
                  <PrimaryButton
                    theme={theme}
                    label={arOrEn(lang, "طلب إعادة تزويد", "Request replenishment")}
                    disabled={stockRequest.isPending}
                    onPress={() => stockRequest.mutate(item.cleaningProductId)}
                  />
                ) : null}
              </Card>
            );
          })}
        </>
      ) : null}
      {canManage && (stockRequests.data ?? []).length ? (
        <>
          <Text style={[ui.sectionTitle, { color: theme.text }]}>
            {arOrEn(lang, "طلبات المنتجات", "Supply requests")}
          </Text>
          {(stockRequests.data ?? []).map((request) => {
            const product = (products.data ?? []).find(
              (entry) => entry.id === request.cleaningProductId,
            );
            return (
              <Card
                key={request.id}
                theme={theme}
                style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <Text style={[ui.orderId, { color: theme.text }]}>
                  {product
                    ? lang === "ar"
                      ? product.nameAr
                      : product.nameEn
                    : arOrEn(lang, "منتج غير معروف", "Unknown product")}
                </Text>
                <Text style={[ui.small, { color: theme.muted }]}>
                  {request.requestedQty} · {operationsStatusLabel(request.status, lang)}
                </Text>
                {request.status === "REQUESTED" ? (
                  <PrimaryButton
                    theme={theme}
                    label={arOrEn(lang, "موافقة", "Approve")}
                    disabled={stockRequestTransition.isPending}
                    onPress={() =>
                      stockRequestTransition.mutate({ id: request.id, action: "approve" })
                    }
                  />
                ) : null}
                {request.status === "APPROVED" ? (
                  <PrimaryButton
                    theme={theme}
                    label={arOrEn(lang, "تأكيد التزويد", "Confirm fulfillment")}
                    disabled={stockRequestTransition.isPending}
                    onPress={() =>
                      stockRequestTransition.mutate({ id: request.id, action: "fulfill" })
                    }
                  />
                ) : null}
              </Card>
            );
          })}
        </>
      ) : null}
    </>
  );
};

const styles = createSnowStyles({
  card: { borderWidth: 1, borderRadius: 13, gap: spacing.md, marginBottom: spacing.md },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 9, paddingHorizontal: spacing.md },
  multiline: { minHeight: 88, textAlignVertical: "top", paddingTop: spacing.md },
  team: { gap: spacing.sm },
  person: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
  cancel: { minHeight: 44, alignItems: "center", justifyContent: "center" },
});
