import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Card,
  PrimaryButton,
  createSnowStyles,
  directionalIcon,
  spacing,
  type DeliveryTask,
  type Lang,
  type SnowTheme,
} from "@tarhib/mobile-shared";
import { arOrEn } from "../lib/format";

const issueTypes = [
  { key: "RECIPIENT_UNAVAILABLE", ar: "المستلم غير متاح", en: "Recipient unavailable" },
  { key: "WRONG_ADDRESS", ar: "عنوان غير صحيح", en: "Wrong address" },
  { key: "DAMAGED_ORDER", ar: "الطلب تالف", en: "Damaged order" },
  { key: "INCOMPLETE_ORDER", ar: "الطلب غير مكتمل", en: "Incomplete order" },
  { key: "OTHER", ar: "أخرى", en: "Other" },
];

export const DeliveryIssueReportModal = ({
  visible,
  task,
  theme,
  lang,
  busy,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  task: DeliveryTask | null;
  theme: SnowTheme;
  lang: Lang;
  busy: boolean;
  onClose: () => void;
  onSubmit: (reason: string, description: string) => void;
}) => {
  const [issueType, setIssueType] = useState("RECIPIENT_UNAVAILABLE");
  const [description, setDescription] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  if (!task) return null;
  const selected = issueTypes.find((item) => item.key === issueType)!;
  const close = () => {
    setDescription("");
    setPickerOpen(false);
    onClose();
  };
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <Pressable onPress={close} style={styles.back}>
            <Ionicons name={directionalIcon("chevron-back")} size={29} color={theme.text} />
          </Pressable>
          <Text style={[styles.title, { color: theme.text }]}>
            {arOrEn(lang, "الإبلاغ عن مشكلة", "Report an issue")}
          </Text>
          <View style={styles.back} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card theme={theme} style={styles.card}>
            <Text style={[styles.label, { color: theme.muted }]}>
              {arOrEn(lang, "التوصيل", "Delivery")}
            </Text>
            <Text style={[styles.code, { color: theme.text }]}>
              #D-{task.id.replace(/-/g, "").slice(0, 4).toUpperCase()}
            </Text>
            <View style={[styles.rule, { backgroundColor: theme.border }]} />
            <Text style={[styles.fieldLabel, { color: theme.muted }]}>
              {arOrEn(lang, "نوع المشكلة", "Issue type")}
            </Text>
            <Pressable
              onPress={() => setPickerOpen(true)}
              style={[styles.select, { borderColor: theme.border }]}
            >
              <Text style={[styles.selectText, { color: theme.text }]}>
                {lang === "ar" ? selected.ar : selected.en}
              </Text>
              <Ionicons name="chevron-down" size={20} color={theme.text} />
            </Pressable>
            <Text style={[styles.fieldLabel, { color: theme.muted }]}>
              {arOrEn(lang, "الوصف", "Description")}
            </Text>
            <TextInput
              value={description}
              onChangeText={(value) => setDescription(value.slice(0, 250))}
              maxLength={250}
              multiline
              textAlignVertical="top"
              placeholder={arOrEn(lang, "اكتب وصف المشكلة...", "Describe the issue...")}
              placeholderTextColor={theme.muted}
              style={[styles.description, { borderColor: theme.border, color: theme.text }]}
            />
            <Text style={[styles.limit, { color: theme.muted }]}>
              {arOrEn(
                lang,
                `الحد الأقصى 250 حرفاً · ${description.length}/250`,
                `Max 250 characters · ${description.length}/250`,
              )}
            </Text>
            <View style={styles.actions}>
              <Pressable onPress={close} style={[styles.cancel, { borderColor: theme.border }]}>
                <Text style={[styles.cancelText, { color: theme.text }]}>
                  {arOrEn(lang, "إلغاء", "Cancel")}
                </Text>
              </Pressable>
              <View style={styles.submit}>
                <PrimaryButton
                  theme={theme}
                  label={arOrEn(lang, "إرسال", "Submit")}
                  disabled={busy || !description.trim()}
                  onPress={() => {
                    onSubmit(issueType, description.trim());
                    setDescription("");
                  }}
                />
              </View>
            </View>
          </Card>
        </ScrollView>
        {pickerOpen ? (
          <View style={styles.overlay}>
            <Pressable style={styles.dismiss} onPress={() => setPickerOpen(false)} />
            <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>
                {arOrEn(lang, "نوع المشكلة", "Issue type")}
              </Text>
              {issueTypes.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    setIssueType(item.key);
                    setPickerOpen(false);
                  }}
                  style={[styles.option, { borderBottomColor: theme.border }]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: item.key === issueType ? theme.primaryStrong : theme.text },
                    ]}
                  >
                    {lang === "ar" ? item.ar : item.en}
                  </Text>
                  {item.key === issueType ? (
                    <Ionicons name="checkmark" size={20} color={theme.primaryStrong} />
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
};

const styles = createSnowStyles({
  root: { flex: 1 },
  header: {
    minHeight: 76,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: { width: 42, height: 42, alignItems: "flex-start", justifyContent: "center" },
  title: { fontSize: 19, fontWeight: "700" },
  content: { padding: 20, paddingBottom: 36 },
  card: { minHeight: 610, padding: 24, borderRadius: 13, gap: 18 },
  label: { fontSize: 13 },
  code: { fontSize: 28, fontWeight: "700" },
  rule: { height: 1, marginVertical: 4 },
  fieldLabel: { fontSize: 14, fontWeight: "600" },
  select: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: { fontSize: 14, fontWeight: "500" },
  description: { minHeight: 220, borderWidth: 1, borderRadius: 9, padding: 14, fontSize: 14 },
  limit: { fontSize: 12 },
  actions: { marginTop: "auto", flexDirection: "row", gap: 12 },
  cancel: {
    flex: 1,
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontSize: 14, fontWeight: "700" },
  submit: { flex: 1 },
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(15,23,42,0.35)",
    justifyContent: "flex-end",
  },
  dismiss: { flex: 1 },
  sheet: { borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, paddingBottom: 30 },
  sheetTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  option: {
    minHeight: 54,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionText: { flex: 1, fontSize: 13, fontWeight: "500" },
});
