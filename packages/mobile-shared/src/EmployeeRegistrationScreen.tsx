import { Ionicons } from "@expo/vector-icons";
import { AxiosError } from "axios";
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { authApi, type CompanyRegistrationOption } from "./api/auth";
import { PrimaryButton } from "./components";
import { createSnowStyles, spacing, type SnowTheme } from "./theme";

export function EmployeeRegistrationScreen({
  theme,
  onBack,
  onActivationRequired,
}: {
  theme: SnowTheme;
  onBack: () => void;
  onActivationRequired: () => void;
}) {
  const [code, setCode] = React.useState("");
  const [challenge, setChallenge] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [options, setOptions] = React.useState<CompanyRegistrationOption[]>([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [firstNameAr, setFirstNameAr] = React.useState("");
  const [lastNameAr, setLastNameAr] = React.useState("");
  const [firstNameEn, setFirstNameEn] = React.useState("");
  const [lastNameEn, setLastNameEn] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [otpRequested, setOtpRequested] = React.useState(false);
  const [otpCode, setOtpCode] = React.useState("");
  const [phoneVerificationToken, setPhoneVerificationToken] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [result, setResult] = React.useState<"PENDING" | "ACTIVATION_REQUIRED" | null>(null);

  const resolveCode = async () => {
    if (!code.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const resolution = await authApi.resolveCompanyRegistration(code.trim());
      const available = await authApi.companyRegistrationOptions(resolution.data.challenge);
      setChallenge(resolution.data.challenge);
      setCompanyName(resolution.data.company.nameAr);
      setOptions(available.data);
      setSelectedId(available.data[0]?.id ?? "");
      if (!available.data.length) setError("لا توجد خيارات تسجيل متاحة حالياً");
    } catch (caught) {
      setError(registrationError(caught));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (
      !challenge ||
      !selectedId ||
      !firstNameAr ||
      !lastNameAr ||
      !email ||
      !phoneVerificationToken ||
      busy
    )
      return;
    setBusy(true);
    setError("");
    try {
      const response = await authApi.registerEmployee({
        challenge,
        registrationOptionId: selectedId,
        firstNameAr: firstNameAr.trim(),
        lastNameAr: lastNameAr.trim(),
        firstNameEn: firstNameEn.trim(),
        lastNameEn: lastNameEn.trim(),
        email: email.trim().toLowerCase(),
        phoneNumber: phoneNumber.trim(),
        phoneVerificationToken,
      });
      setResult(response.data.status);
    } catch (caught) {
      setError(registrationError(caught));
    } finally {
      setBusy(false);
    }
  };

  const requestVerification = async () => {
    if (!challenge || !phoneNumber || busy) return;
    setBusy(true);
    setError("");
    try {
      await authApi.requestRegistrationOtp(challenge, phoneNumber.trim());
      setOtpRequested(true);
      setOtpCode("");
    } catch (caught) {
      setError(registrationError(caught));
    } finally {
      setBusy(false);
    }
  };

  const verifyPhone = async () => {
    if (otpCode.length !== 6 || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await authApi.verifyRegistrationOtp(challenge, phoneNumber.trim(), otpCode);
      setPhoneVerificationToken(response.data.verificationToken);
      setOtpRequested(false);
    } catch (caught) {
      setError(registrationError(caught));
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <View style={[styles.successRoot, { backgroundColor: theme.background }]}>
        <View style={[styles.successIcon, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="checkmark" size={42} color={theme.primaryStrong} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>تم استلام طلبك</Text>
        <Text style={[styles.description, { color: theme.muted }]}>
          {result === "PENDING"
            ? "سيقوم مسؤول الشركة بمراجعة طلبك. ستصلك رسالة عند الموافقة."
            : "تم تفعيل طلبك تلقائياً. أرسلنا رمز إنشاء كلمة المرور إلى بريدك الإلكتروني."}
        </Text>
        <PrimaryButton
          label={result === "PENDING" ? "العودة لتسجيل الدخول" : "إدخال رمز التفعيل"}
          theme={theme}
          onPress={result === "PENDING" ? onBack : onActivationRequired}
        />
      </View>
    );
  }

  return (
    <View style={[styles.viewport, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.root}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.heading}>
            <Text style={[styles.title, { color: theme.text }]}>إنشاء حساب موظف</Text>
            <Text style={[styles.description, { color: theme.muted }]}>
              أدخل رمز شركتك ثم اختر بيانات عملك
            </Text>
          </View>

          {!challenge ? (
            <>
              <ArabicField
                theme={theme}
                label="رمز الشركة"
                value={code}
                onChangeText={setCode}
                placeholder="TRHB-XXXX-XXXX-XXXX"
                autoCapitalize="characters"
              />
              {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
              <PrimaryButton
                label={busy ? "جارٍ التحقق..." : "متابعة"}
                theme={theme}
                disabled={!code.trim() || busy}
                onPress={() => void resolveCode()}
              />
            </>
          ) : (
            <>
              <View style={[styles.companyCard, { backgroundColor: theme.primarySoft }]}>
                <Ionicons name="business-outline" size={24} color={theme.primaryStrong} />
                <View style={styles.flex}>
                  <Text style={[styles.companyLabel, { color: theme.muted }]}>الشركة</Text>
                  <Text style={[styles.companyName, { color: theme.text }]}>{companyName}</Text>
                </View>
              </View>

              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                اختر الفرع والقسم والدور
              </Text>
              {options.map((option) => {
                const selected = option.id === selectedId;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => setSelectedId(option.id)}
                    style={[
                      styles.option,
                      {
                        backgroundColor: selected ? theme.primarySoft : theme.surface,
                        borderColor: selected ? theme.primaryStrong : theme.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={selected ? "radio-button-on" : "radio-button-off"}
                      size={23}
                      color={selected ? theme.primaryStrong : theme.muted}
                    />
                    <View style={styles.flex}>
                      <Text style={[styles.optionTitle, { color: theme.text }]}>
                        {option.role.nameAr}
                      </Text>
                      <Text style={[styles.optionMeta, { color: theme.muted }]}>
                        {option.branch.nameAr} · {option.department.nameAr}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}

              <ArabicField
                theme={theme}
                label="الاسم"
                value={firstNameAr}
                onChangeText={setFirstNameAr}
              />
              <ArabicField
                theme={theme}
                label="اللقب"
                value={lastNameAr}
                onChangeText={setLastNameAr}
              />
              <ArabicField
                theme={theme}
                label="الاسم بالإنجليزية (اختياري)"
                value={firstNameEn}
                onChangeText={setFirstNameEn}
              />
              <ArabicField
                theme={theme}
                label="اللقب بالإنجليزية (اختياري)"
                value={lastNameEn}
                onChangeText={setLastNameEn}
              />
              <ArabicField
                theme={theme}
                label="البريد الإلكتروني المهني"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />
              <ArabicField
                theme={theme}
                label="رقم الهاتف"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                placeholder="+218912345678"
              />
              {phoneVerificationToken ? (
                <View style={[styles.verifiedRow, { backgroundColor: theme.primarySoft }]}>
                  <Ionicons name="checkmark-circle" size={22} color={theme.primaryStrong} />
                  <Text style={[styles.verifiedText, { color: theme.primaryStrong }]}>
                    تم التحقق من رقم الهاتف
                  </Text>
                </View>
              ) : otpRequested ? (
                <>
                  <ArabicField
                    theme={theme}
                    label="رمز التحقق"
                    value={otpCode}
                    onChangeText={(value) => setOtpCode(value.replace(/\D/g, "").slice(0, 6))}
                    keyboardType="number-pad"
                    placeholder="000000"
                  />
                  <PrimaryButton
                    label={busy ? "جارٍ التحقق..." : "تأكيد رمز الهاتف"}
                    theme={theme}
                    disabled={otpCode.length !== 6 || busy}
                    onPress={() => void verifyPhone()}
                  />
                </>
              ) : (
                <PrimaryButton
                  label={busy ? "جارٍ الإرسال..." : "التحقق من رقم الهاتف"}
                  theme={theme}
                  disabled={!phoneNumber || busy}
                  onPress={() => void requestVerification()}
                />
              )}
              {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
              <PrimaryButton
                label={busy ? "جارٍ الإرسال..." : "إنشاء الحساب"}
                theme={theme}
                disabled={
                  !selectedId ||
                  !firstNameAr ||
                  !lastNameAr ||
                  !email ||
                  !phoneVerificationToken ||
                  busy
                }
                onPress={() => void submit()}
              />
            </>
          )}

          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={[styles.backText, { color: theme.primaryStrong }]}>
              العودة لتسجيل الدخول
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function ArabicField({
  label,
  theme,
  ...props
}: { label: string; theme: SnowTheme } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <TextInput
        {...props}
        autoCapitalize={props.autoCapitalize ?? "none"}
        placeholderTextColor={theme.muted}
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      />
    </View>
  );
}

function registrationError(error: unknown): string {
  if (error instanceof AxiosError && error.response?.status === 429)
    return "محاولات كثيرة. حاول مرة أخرى لاحقاً";
  if (error instanceof AxiosError && !error.response)
    return "تعذر الاتصال بالخادم. تحقق من الإنترنت";
  return "تعذر إكمال التسجيل. تحقق من البيانات وحاول مجدداً";
}

const styles = createSnowStyles({
  viewport: { flex: 1, alignItems: "center" },
  root: { flex: 1, width: "100%", maxWidth: 430 },
  content: { flexGrow: 1, padding: spacing.xl, paddingVertical: 40, gap: spacing.md },
  heading: { alignItems: "flex-end", gap: spacing.sm, marginBottom: spacing.md },
  title: { fontSize: 24, lineHeight: 32, fontWeight: "700", textAlign: "center" },
  description: { fontSize: 14, lineHeight: 22, textAlign: "center" },
  fieldGroup: { gap: spacing.sm },
  label: { fontSize: 13, fontWeight: "600", textAlign: "right" },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    textAlign: "right",
    writingDirection: "rtl",
  },
  companyCard: {
    minHeight: 72,
    borderRadius: 14,
    padding: spacing.md,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
  },
  flex: { flex: 1, alignItems: "flex-end", gap: 3 },
  companyLabel: { fontSize: 12 },
  companyName: { fontSize: 17, fontWeight: "700" },
  sectionTitle: { fontSize: 16, fontWeight: "700", textAlign: "right", marginTop: spacing.sm },
  option: {
    minHeight: 68,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
  },
  optionTitle: { fontSize: 15, fontWeight: "700", textAlign: "right" },
  optionMeta: { fontSize: 12, textAlign: "right" },
  error: { fontSize: 13, lineHeight: 20, textAlign: "center" },
  backButton: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  backText: { fontSize: 14, fontWeight: "600" },
  successRoot: {
    flex: 1,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedRow: {
    minHeight: 48,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
  },
  verifiedText: { fontSize: 13, fontWeight: "700", textAlign: "right" },
});
