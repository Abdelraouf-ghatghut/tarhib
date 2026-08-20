import { Ionicons } from "@expo/vector-icons";
import { AxiosError } from "axios";
import React from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { PrimaryButton } from "./components";
import { createSnowStyles, spacing, type SnowTheme } from "./theme";

export function RequiredPasswordChangeScreen({
  theme,
  onSubmit,
  required = true,
  onCancel,
}: {
  theme: SnowTheme;
  onSubmit: (currentPassword: string, newPassword: string) => Promise<void>;
  required?: boolean;
  onCancel?: () => void;
}) {
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmation, setConfirmation] = React.useState("");
  const [visible, setVisible] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const valid =
    currentPassword.length >= 8 &&
    newPassword.length >= 12 &&
    newPassword === confirmation &&
    newPassword !== currentPassword;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      await onSubmit(currentPassword, newPassword);
    } catch (caught) {
      if (caught instanceof AxiosError && caught.response?.status === 401) {
        setError("كلمة المرور الحالية غير صحيحة");
      } else {
        setError("تعذر تغيير كلمة المرور. حاول مرة أخرى.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.viewport, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.root}
      >
        {!required && onCancel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="إغلاق"
            onPress={onCancel}
            style={[styles.close, { backgroundColor: theme.surface }]}
          >
            <Ionicons name="close" size={24} color={theme.text} />
          </Pressable>
        ) : null}
        <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="shield-checkmark-outline" size={42} color={theme.primaryStrong} />
        </View>
        <View style={styles.heading}>
          <Text style={[styles.title, { color: theme.text }]}>
            {required ? "أنشئ كلمة مرور جديدة" : "تغيير كلمة المرور"}
          </Text>
          <Text style={[styles.description, { color: theme.muted }]}>
            {required
              ? "لحماية حسابك، يجب تغيير كلمة المرور المؤقتة قبل الوصول إلى مهام العمليات."
              : "استخدم كلمة مرور قوية لا تقل عن 12 حرفاً. سيتم تسجيل خروجك من جميع الأجهزة بعد الحفظ."}
          </Text>
        </View>

        <PasswordField
          theme={theme}
          label="كلمة المرور الحالية"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          visible={visible}
        />
        <PasswordField
          theme={theme}
          label="كلمة المرور الجديدة"
          value={newPassword}
          onChangeText={setNewPassword}
          visible={visible}
        />
        <PasswordField
          theme={theme}
          label="تأكيد كلمة المرور الجديدة"
          value={confirmation}
          onChangeText={setConfirmation}
          visible={visible}
        />

        <Pressable style={styles.visibility} onPress={() => setVisible((value) => !value)}>
          <Ionicons
            name={visible ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={theme.primaryStrong}
          />
          <Text style={[styles.visibilityText, { color: theme.primaryStrong }]}>
            {visible ? "إخفاء كلمات المرور" : "إظهار كلمات المرور"}
          </Text>
        </Pressable>

        {confirmation && confirmation !== newPassword ? (
          <Text style={[styles.error, { color: theme.danger }]}>كلمتا المرور غير متطابقتين</Text>
        ) : null}
        {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}

        <View style={styles.action}>
          <PrimaryButton
            label={busy ? "جارٍ الحفظ..." : "حفظ وتسجيل الدخول مجدداً"}
            theme={theme}
            disabled={!valid || busy}
            onPress={() => void submit()}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function PasswordField({
  theme,
  label,
  visible,
  ...props
}: {
  theme: SnowTheme;
  label: string;
  visible: boolean;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <View style={[styles.field, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name="lock-closed-outline" size={19} color={theme.muted} />
        <TextInput
          {...props}
          secureTextEntry={!visible}
          autoCapitalize="none"
          textContentType="password"
          placeholder="••••••••"
          placeholderTextColor={theme.muted}
          style={[styles.input, { color: theme.text }]}
        />
      </View>
    </View>
  );
}

const styles = createSnowStyles({
  viewport: { flex: 1, alignItems: "center" },
  root: {
    flex: 1,
    width: "100%",
    maxWidth: 430,
    padding: spacing.xl,
    justifyContent: "center",
    gap: spacing.md,
  },
  close: {
    position: "absolute",
    top: spacing.xl,
    left: spacing.xl,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  icon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  heading: { alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  title: { fontSize: 24, lineHeight: 32, fontWeight: "700", textAlign: "center" },
  description: { fontSize: 14, lineHeight: 22, textAlign: "center" },
  fieldGroup: { gap: spacing.sm },
  label: { fontSize: 13, fontWeight: "600", textAlign: "right" },
  field: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
  },
  input: { flex: 1, fontSize: 15, textAlign: "right", writingDirection: "rtl" },
  visibility: {
    minHeight: 44,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  visibilityText: { fontSize: 13, fontWeight: "600" },
  error: { fontSize: 13, lineHeight: 20, textAlign: "center" },
  action: { marginTop: spacing.md },
});
