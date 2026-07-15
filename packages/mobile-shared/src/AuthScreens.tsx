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

import { Card, PrimaryButton } from "./components";
import type { OtpChannel } from "./api/auth";
import { t } from "./legacy-i18n";
import {
  appShadow,
  createSnowStyles,
  directionalIcon,
  spacing,
  type AppMode,
  type Lang,
  type SnowTheme,
} from "./theme";

type IconName = keyof typeof Ionicons.glyphMap;

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export const LoginScreen = ({
  lang,
  theme,
  onLogin,
  onRequestOtp,
  onOtpLogin,
}: {
  lang: Lang;
  theme: SnowTheme;
  onLogin: (email: string, password: string) => Promise<void>;
  onRequestOtp: (phoneNumber: string, channel: OtpChannel) => Promise<void>;
  onOtpLogin: (phoneNumber: string, code: string) => Promise<void>;
}) => {
  const copy = t(lang);
  const isArabic = lang === "ar";
  const [mode, setMode] = React.useState<"email" | "phone">("email");
  const [step, setStep] = React.useState<"form" | "otp">("form");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [otpChannel, setOtpChannel] = React.useState<OtpChannel>("whatsapp");
  const [otpCode, setOtpCode] = React.useState("");
  const [resendIn, setResendIn] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [requestingOtp, setRequestingOtp] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const otpInputRef = React.useRef<TextInput>(null);

  const counting = step === "otp" && resendIn > 0;
  React.useEffect(() => {
    if (!counting) return;
    const id = setInterval(() => setResendIn((value) => Math.max(value - 1, 0)), 1000);
    return () => clearInterval(id);
  }, [counting]);

  const handleEmailLogin = async () => {
    if (!email || !password || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onLogin(email.trim(), password);
    } catch (err) {
      setError(authErrorMessage(err, isArabic));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendCode = async () => {
    if (!phoneNumber || requestingOtp) return;
    setRequestingOtp(true);
    setError(null);
    setNotice(null);
    try {
      await onRequestOtp(phoneNumber.trim(), otpChannel);
      setOtpCode("");
      setResendIn(RESEND_SECONDS);
      setStep("otp");
    } catch (err) {
      setError(authErrorMessage(err, isArabic));
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleResend = async () => {
    if (requestingOtp || resendIn > 0) return;
    setRequestingOtp(true);
    setError(null);
    try {
      await onRequestOtp(phoneNumber.trim(), otpChannel);
      setOtpCode("");
      setResendIn(RESEND_SECONDS);
      setNotice(isArabic ? "تم إرسال الرمز من جديد" : "A new code was sent");
    } catch (err) {
      setError(authErrorMessage(err, isArabic));
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleVerify = async () => {
    if (otpCode.length !== OTP_LENGTH || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onOtpLogin(phoneNumber.trim(), otpCode);
    } catch (err) {
      setError(authErrorMessage(err, isArabic));
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (nextMode: "email" | "phone") => {
    setMode(nextMode);
    setError(null);
    setNotice(null);
  };

  if (step === "otp") {
    return (
      <View style={[styles.viewport, { backgroundColor: theme.background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.authRoot, { borderColor: theme.border }]}
        >
          <View style={[styles.otpBadge, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="chatbubble-ellipses-outline" size={36} color={theme.primaryStrong} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={[styles.heroTitle, { color: theme.text }]}>
              {isArabic ? "أدخل رمز التحقق" : "Enter the verification code"}
            </Text>
            <Text style={[styles.heroText, { color: theme.muted }]}>
              {isArabic ? "تم إرسال رمز تحقق إلى" : "A verification code was sent to"}
            </Text>
            <Text style={[styles.otpPhone, { color: theme.text }]}>{phoneNumber}</Text>
            <View style={[styles.channelBadge, { backgroundColor: theme.primarySoft }]}>
              <Ionicons
                name={otpChannel === "whatsapp" ? "logo-whatsapp" : "chatbubble-outline"}
                size={16}
                color={theme.primaryStrong}
              />
              <Text style={[styles.channelBadgeText, { color: theme.primaryStrong }]}>
                {otpChannel === "whatsapp" ? "WhatsApp" : "SMS"}
              </Text>
            </View>
          </View>

          <Pressable style={styles.otpBoxes} onPress={() => otpInputRef.current?.focus()}>
            {Array.from({ length: OTP_LENGTH }).map((_, index) => {
              const digit = otpCode[index] ?? "";
              const isActive = index === otpCode.length;
              return (
                <View
                  key={index}
                  style={[
                    styles.otpBox,
                    {
                      backgroundColor: theme.surface,
                      borderColor: isActive ? theme.primaryStrong : theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.otpDigit, { color: digit ? theme.text : theme.muted }]}>
                    {digit || "–"}
                  </Text>
                </View>
              );
            })}
            <TextInput
              ref={otpInputRef}
              value={otpCode}
              onChangeText={(value) => setOtpCode(value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              maxLength={OTP_LENGTH}
              autoFocus
              style={styles.otpHiddenInput}
            />
          </Pressable>

          {resendIn > 0 ? (
            <Text style={[styles.otpResendHint, { color: theme.muted }]}>
              {isArabic ? "لم يصلك الرمز؟ إعادة الإرسال خلال " : "Didn't get the code? Resend in "}
              <Text style={{ color: theme.primaryStrong, fontWeight: "600" }}>
                {formatCountdown(resendIn)}
              </Text>
            </Text>
          ) : (
            <Pressable onPress={() => void handleResend()}>
              <Text style={[styles.otpResendLink, { color: theme.primaryStrong }]}>
                {requestingOtp
                  ? isArabic
                    ? "جار الإرسال..."
                    : "Sending..."
                  : isArabic
                    ? "إعادة إرسال الرمز"
                    : "Resend code"}
              </Text>
            </Pressable>
          )}

          {notice ? (
            <Text style={[styles.feedback, { color: theme.success }]}>{notice}</Text>
          ) : null}
          {error ? <Text style={[styles.feedback, { color: theme.danger }]}>{error}</Text> : null}

          <Pressable
            disabled={requestingOtp || resendIn > 0}
            onPress={() => {
              setOtpChannel((value) => (value === "whatsapp" ? "sms" : "whatsapp"));
              setStep("form");
              setError(null);
              setNotice(null);
            }}
          >
            <Text style={[styles.otpResendLink, { color: theme.primaryStrong }]}>
              {isArabic
                ? otpChannel === "whatsapp"
                  ? "استخدام الرسائل النصية بدلاً من ذلك"
                  : "استخدام واتساب بدلاً من ذلك"
                : otpChannel === "whatsapp"
                  ? "Use SMS instead"
                  : "Use WhatsApp instead"}
            </Text>
          </Pressable>

          <PrimaryButton
            label={submitting ? "..." : isArabic ? "تأكيد الرمز" : "Confirm code"}
            theme={theme}
            disabled={otpCode.length !== OTP_LENGTH}
            onPress={() => void handleVerify()}
          />
          <Pressable
            onPress={() => {
              setStep("form");
              setError(null);
              setNotice(null);
            }}
          >
            <Text style={[styles.otpResendLink, { color: theme.primaryStrong }]}>
              {isArabic ? "تغيير رقم الجوال" : "Change phone number"}
            </Text>
          </Pressable>
        </KeyboardAvoidingView>
      </View>
    );
  }

  const segments: Array<{ key: "email" | "phone"; label: string }> = [
    { key: "email", label: isArabic ? "البريد الإلكتروني" : "Email" },
    { key: "phone", label: isArabic ? "رقم الجوال" : "Phone number" },
  ];
  const orderedSegments = isArabic ? [...segments].reverse() : segments;

  return (
    <View style={[styles.viewport, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.authRoot, { borderColor: theme.border }]}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.loginScroll}>
          <View style={styles.loginHeader}>
            <View style={[styles.logoMark, { backgroundColor: theme.primary }, appShadow(theme)]}>
              <Ionicons name="bag-handle" size={30} color="#FFFFFF" />
            </View>
            <View style={styles.brandRow}>
              <Text style={[styles.brandAr, { color: theme.text }]}>{copy.appName}</Text>
              <Text style={[styles.brandEn, { color: theme.muted }]}>Tarhib</Text>
            </View>
            <Text style={[styles.heroTitle, { color: theme.text }]}>
              {isArabic ? "مرحباً بك في ترحيب 👋" : "Welcome to Tarhib 👋"}
            </Text>
            <Text style={[styles.heroText, { color: theme.muted }]}>
              {isArabic
                ? "تجربة ضيافة راقية تبدأ من هنا"
                : "A refined hospitality experience starts here"}
            </Text>
          </View>

          <View style={[styles.authTabs, { backgroundColor: theme.surfaceAlt }]}>
            {orderedSegments.map((segment) => (
              <AuthModeTab
                key={segment.key}
                label={segment.label}
                active={mode === segment.key}
                theme={theme}
                onPress={() => switchMode(segment.key)}
              />
            ))}
          </View>

          {mode === "email" ? (
            <View style={styles.fieldGroup}>
              <Text
                style={[
                  styles.label,
                  { color: theme.text, textAlign: isArabic ? "right" : "left" },
                ]}
              >
                {copy.email}
              </Text>
              <Field
                theme={theme}
                isArabic={isArabic}
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                placeholder={isArabic ? "أدخل بريدك الإلكتروني" : "Enter your email"}
                keyboardType="email-address"
              />
              <Text
                style={[
                  styles.label,
                  { color: theme.text, textAlign: isArabic ? "right" : "left" },
                ]}
              >
                {copy.password}
              </Text>
              <Field
                theme={theme}
                isArabic={isArabic}
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                placeholder={isArabic ? "أدخل كلمة المرور" : "Enter your password"}
                secureTextEntry={!showPassword}
                trailing={
                  <Pressable onPress={() => setShowPassword((value) => !value)} hitSlop={8}>
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={19}
                      color={theme.muted}
                    />
                  </Pressable>
                }
              />
              <Pressable
                onPress={() =>
                  setNotice(
                    isArabic
                      ? "تواصل مع مسؤول الشركة لإعادة تعيين كلمة المرور"
                      : "Contact your company admin to reset your password",
                  )
                }
                style={styles.forgotLinkWrap}
              >
                <Text style={[styles.forgotLink, { color: theme.primaryStrong }]}>
                  {isArabic ? "نسيت كلمة المرور؟" : "Forgot your password?"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.fieldGroup}>
              <Text
                style={[
                  styles.label,
                  { color: theme.text, textAlign: isArabic ? "right" : "left" },
                ]}
              >
                {isArabic ? "رقم الجوال" : "Phone number"}
              </Text>
              <Field
                theme={theme}
                isArabic={isArabic}
                icon="call-outline"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="+218912345678"
                keyboardType="phone-pad"
              />
              <View style={[styles.channelSelector, { backgroundColor: theme.surfaceAlt }]}>
                {(["whatsapp", "sms"] as const).map((channel) => {
                  const selected = otpChannel === channel;
                  return (
                    <Pressable
                      key={channel}
                      onPress={() => setOtpChannel(channel)}
                      style={[
                        styles.channelOption,
                        selected ? { backgroundColor: theme.primaryStrong } : null,
                      ]}
                    >
                      <Ionicons
                        name={channel === "whatsapp" ? "logo-whatsapp" : "chatbubble-outline"}
                        size={18}
                        color={selected ? "#FFFFFF" : theme.muted}
                      />
                      <Text
                        style={[
                          styles.channelOptionText,
                          { color: selected ? "#FFFFFF" : theme.muted },
                        ]}
                      >
                        {channel === "whatsapp" ? "WhatsApp" : "SMS"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {notice ? (
            <Text style={[styles.feedback, { color: theme.success }]}>{notice}</Text>
          ) : null}
          {error ? <Text style={[styles.feedback, { color: theme.danger }]}>{error}</Text> : null}

          <PrimaryButton
            label={
              mode === "email"
                ? submitting
                  ? "..."
                  : copy.signIn
                : requestingOtp
                  ? "..."
                  : isArabic
                    ? "إرسال رمز التحقق"
                    : otpChannel === "whatsapp"
                      ? "Send code via WhatsApp"
                      : "Send code via SMS"
            }
            theme={theme}
            onPress={() => void (mode === "email" ? handleEmailLogin() : handleSendCode())}
          />

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            <Text style={[styles.dividerText, { color: theme.muted }]}>
              {isArabic ? "أو" : "or"}
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          </View>

          <Pressable
            onPress={() => switchMode(mode === "email" ? "phone" : "email")}
            style={[
              styles.altButton,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Ionicons
              name={mode === "email" ? "call-outline" : "mail-outline"}
              size={18}
              color={theme.text}
            />
            <Text style={[styles.altButtonText, { color: theme.text }]}>
              {mode === "email"
                ? isArabic
                  ? "تسجيل الدخول برقم الجوال"
                  : "Sign in with phone number"
                : isArabic
                  ? "تسجيل الدخول بالبريد الإلكتروني"
                  : "Sign in with email"}
            </Text>
          </Pressable>

          <Text style={[styles.footerHint, { color: theme.muted }]}>
            {isArabic ? "ليس لديك حساب؟ " : "Don't have an account? "}
            <Text style={{ color: theme.primaryStrong, fontWeight: "600" }}>
              {isArabic ? "تواصل مع مسؤول الشركة" : "Contact your company admin"}
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const Field = ({
  theme,
  isArabic,
  icon,
  trailing,
  ...inputProps
}: {
  theme: SnowTheme;
  isArabic: boolean;
  icon: IconName;
  trailing?: React.ReactNode;
} & React.ComponentProps<typeof TextInput>) => {
  const leading = <Ionicons name={icon} size={19} color={theme.muted} />;
  return (
    <View style={[styles.field, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {isArabic ? trailing : leading}
      <TextInput
        autoCapitalize="none"
        placeholderTextColor={theme.muted}
        {...inputProps}
        style={[styles.fieldInput, { color: theme.text, textAlign: isArabic ? "right" : "left" }]}
      />
      {isArabic ? leading : trailing}
    </View>
  );
};

const AuthModeTab = ({
  label,
  active,
  theme,
  onPress,
}: {
  label: string;
  active: boolean;
  theme: SnowTheme;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={[
      styles.authTab,
      { backgroundColor: active ? theme.primary : "transparent" },
      active ? appShadow(theme) : null,
    ]}
  >
    <Text style={[styles.authTabText, { color: active ? "#FFFFFF" : theme.muted }]}>{label}</Text>
  </Pressable>
);

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function authErrorMessage(err: unknown, isArabic: boolean): string {
  if (err instanceof AxiosError) {
    const status = err.response?.status;
    const serverMessage =
      typeof err.response?.data === "object" && err.response?.data && "message" in err.response.data
        ? String((err.response.data as { message?: unknown }).message)
        : "";
    if (serverMessage.includes("otpChannelUnavailable")) {
      return isArabic
        ? "قناة التحقق غير متاحة حالياً"
        : "This verification channel is currently unavailable";
    }
    if (serverMessage.includes("tooManyOtpAttempts")) {
      return isArabic
        ? "تم تجاوز عدد المحاولات. اطلب رمزاً جديداً"
        : "Too many attempts. Request a new code";
    }
    if (serverMessage.includes("otpExpiredOrNotRequested")) {
      return isArabic
        ? "انتهت صلاحية الرمز. اطلب رمزاً جديداً"
        : "The code expired. Request a new one";
    }
    if (serverMessage.includes("invalidOtpCode")) {
      return isArabic ? "رمز التحقق غير صحيح" : "The verification code is incorrect";
    }
    if (
      serverMessage.includes("otpProviderNotConfigured") ||
      serverMessage.includes("otpDeliveryFailed") ||
      serverMessage.includes("otpVerificationFailed")
    ) {
      return isArabic ? "خدمة التحقق غير متاحة حالياً" : "The verification service is unavailable";
    }
    if (serverMessage.includes("E.164") || status === 400) {
      return isArabic
        ? "استخدم صيغة الهاتف الدولية مثل +218912345678"
        : "Use the international phone format, for example +218912345678";
    }
    if (status === 401) {
      return isArabic
        ? "بيانات الدخول أو رمز التحقق غير صحيح"
        : "Invalid credentials or verification code";
    }
    if (status === 429) {
      return isArabic ? "محاولات كثيرة. حاول مرة أخرى لاحقا" : "Too many attempts. Try again later";
    }
    if (!err.response) {
      return isArabic
        ? "تعذر الوصول إلى الخادم. تحقق من الاتصال"
        : "Unable to reach the server. Check your connection";
    }
  }
  return isArabic
    ? "تعذر إكمال العملية. حاول مرة أخرى"
    : "Unable to complete the action. Try again";
}

const styles = createSnowStyles({
  viewport: {
    flex: 1,
    alignItems: "center",
  },
  authRoot: {
    flex: 1,
    width: "100%",
    maxWidth: 430,
    padding: spacing.xl,
    justifyContent: "center",
    gap: spacing.lg,
    borderLeftWidth: Platform.OS === "web" ? 1 : 0,
    borderRightWidth: Platform.OS === "web" ? 1 : 0,
  },
  loginScroll: {
    flexGrow: 1,
    justifyContent: "center",
    gap: spacing.lg,
    paddingVertical: spacing.xl,
  },
  logoMark: {
    width: 68,
    height: 68,
    borderRadius: 16,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  brandRow: {
    alignItems: "center",
    gap: 2,
  },
  brandAr: {
    fontSize: 22,
    fontWeight: "700",
  },
  brandEn: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 1,
  },
  heroCopy: {
    gap: spacing.sm,
    alignItems: "center",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 30,
  },
  heroText: {
    fontSize: 14,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 22,
  },
  loginHeader: {
    gap: spacing.sm,
    alignItems: "center",
  },
  authTabs: {
    minHeight: 48,
    borderRadius: 12,
    padding: spacing.xs,
    flexDirection: "row",
    gap: spacing.xs,
  },
  authTab: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  authTabText: {
    fontSize: 13,
    fontWeight: "600",
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  field: {
    minHeight: 52,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "400",
    paddingVertical: 0,
  },
  // alignSelf flex-start = côté de départ : gauche en LTR, droite en RTL.
  forgotLinkWrap: {
    alignSelf: "flex-start",
  },
  forgotLink: {
    fontSize: 13,
    fontWeight: "600",
    paddingVertical: spacing.xs,
  },
  feedback: {
    fontSize: 12,
    fontWeight: "400",
    textAlign: "center",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: "500",
  },
  altButton: {
    minHeight: 50,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  altButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  footerHint: {
    fontSize: 13,
    fontWeight: "400",
    textAlign: "center",
  },
  otpBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  otpPhone: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    writingDirection: "ltr",
  },
  channelBadge: {
    minHeight: 32,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  channelBadgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  channelSelector: {
    minHeight: 52,
    borderRadius: 12,
    padding: spacing.xs,
    flexDirection: "row",
    gap: spacing.xs,
  },
  channelOption: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  channelOptionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  otpBoxes: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
  },
  otpBox: {
    width: 46,
    height: 56,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  otpDigit: {
    fontSize: 20,
    fontWeight: "700",
  },
  otpHiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
  otpResendHint: {
    fontSize: 13,
    fontWeight: "400",
    textAlign: "center",
  },
  otpResendLink: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: spacing.xs,
  },
});
