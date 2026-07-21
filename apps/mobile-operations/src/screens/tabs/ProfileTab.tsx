import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";
import {
  createSnowStyles,
  spacing,
  type AccessProfile,
  type AccessRoleSummary,
  type Copy,
  type Lang,
  type SnowTheme,
} from "@tarhib/mobile-shared";

export const ProfileTab = ({
  theme,
  lang,
  copy,
  employeeName,
  employee,
  roles,
  canSeeMeetingPrep,
  onToggleTheme,
  onToggleLang,
  onOpenNotifications,
  onOpenHistory,
  onOpenMeetingPrep,
  onLogout,
}: {
  theme: SnowTheme;
  lang: Lang;
  copy: Copy;
  employeeName: string;
  employee: AccessProfile["employee"] | null;
  roles: AccessRoleSummary[];
  canSeeMeetingPrep: boolean;
  onToggleTheme: () => void;
  onToggleLang: () => void;
  onOpenNotifications: () => void;
  onOpenHistory: () => void;
  onOpenMeetingPrep: () => void;
  onLogout: () => void;
}) => {
  const role = roles.find((item) => item.primary);
  const roleName = role
    ? lang === "ar"
      ? role.nameAr
      : role.nameEn || role.nameAr
    : lang === "ar"
      ? "موظف العمليات"
      : "Operations staff";
  const branch = employee?.branch
    ? lang === "ar"
      ? employee.branch.nameAr
      : employee.branch.nameEn
    : "—";
  return (
    <>
      <Text style={[styles.title, { color: theme.text }]}>{copy.profile}</Text>
      <View style={styles.identity}>
        <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="person" size={36} color={theme.primaryStrong} />
          <View style={[styles.edit, { backgroundColor: theme.surface }]}>
            <Ionicons name="pencil" size={11} color={theme.muted} />
          </View>
        </View>
        <Text style={[styles.name, { color: theme.text }]}>{employeeName}</Text>
        <Text style={[styles.role, { color: theme.muted }]}>{roleName}</Text>
      </View>
      <View style={[styles.rows, { borderColor: theme.border }]}>
        <Row theme={theme} label={lang === "ar" ? "الفرع" : "Branch"} value={branch} />
        <Row
          theme={theme}
          label={lang === "ar" ? "الهاتف" : "Phone"}
          value={employee?.phoneNumber || "—"}
        />
        <Row
          theme={theme}
          label={copy.language}
          value={lang === "ar" ? copy.arabic : copy.english}
          onPress={onToggleLang}
        />
        <Row
          theme={theme}
          label={lang === "ar" ? "المظهر" : "Theme"}
          value={theme.mode === "dark" ? copy.darkMode : copy.lightMode}
          onPress={onToggleTheme}
        />
        <Row theme={theme} label={copy.notifications} value="" onPress={onOpenNotifications} />
        <Row theme={theme} label={copy.history} value="" onPress={onOpenHistory} />
        {canSeeMeetingPrep ? (
          <Row theme={theme} label={copy.meetingPrep} value="" onPress={onOpenMeetingPrep} />
        ) : null}
      </View>
      <Pressable onPress={onLogout} style={styles.logout}>
        <Text style={[styles.logoutText, { color: theme.danger }]}>{copy.logout}</Text>
      </Pressable>
    </>
  );
};
const Row = ({
  theme,
  label,
  value,
  onPress,
}: {
  theme: SnowTheme;
  label: string;
  value: string;
  onPress?: () => void;
}) => (
  <Pressable
    disabled={!onPress}
    onPress={onPress}
    style={[styles.row, { borderBottomColor: theme.border }]}
  >
    <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
    <Text numberOfLines={1} style={[styles.value, { color: theme.text }]}>
      {value}
    </Text>
    {onPress ? <Ionicons name="chevron-forward" size={16} color={theme.muted} /> : null}
  </Pressable>
);
const styles = createSnowStyles({
  title: { fontSize: 20, fontWeight: "700", paddingTop: spacing.xl, paddingBottom: spacing.lg },
  identity: { alignItems: "center", paddingVertical: spacing.md },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  edit: {
    position: "absolute",
    right: 0,
    bottom: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 18, fontWeight: "700", marginTop: spacing.sm },
  role: { fontSize: 11, marginTop: 3 },
  rows: { marginTop: spacing.lg, borderTopWidth: 1 },
  row: {
    minHeight: 54,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  label: { width: 88, fontSize: 11 },
  value: { flex: 1, textAlign: "right", fontSize: 11 },
  logout: { minHeight: 54, justifyContent: "center" },
  logoutText: { fontSize: 12, fontWeight: "600" },
});
