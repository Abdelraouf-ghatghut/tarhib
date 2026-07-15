import React from "react";
import { Text, View } from "react-native";

import {
  PrimaryButton,
  createSnowStyles,
  spacing,
  type Copy,
  type Lang,
  type SnowTheme,
} from "@tarhib/mobile-shared";

import { SettingsRow, ui } from "../../components/ui";

export const ProfileTab = ({
  theme,
  lang,
  copy,
  employeeName,
  permissionsCount,
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
  permissionsCount: number;
  canSeeMeetingPrep: boolean;
  onToggleTheme: () => void;
  onToggleLang: () => void;
  onOpenNotifications: () => void;
  onOpenHistory: () => void;
  onOpenMeetingPrep: () => void;
  onLogout: () => void;
}) => (
  <>
    <ProfileBlock
      theme={theme}
      copy={copy}
      employeeName={employeeName}
      permissionsCount={permissionsCount}
    />
    <SettingsRow
      theme={theme}
      icon="time-outline"
      title={copy.history}
      subtitle={copy.performance}
      onPress={onOpenHistory}
    />
    {canSeeMeetingPrep ? (
      <SettingsRow
        theme={theme}
        icon="business-outline"
        title={copy.meetingPrep}
        subtitle={copy.upcomingMeetings}
        onPress={onOpenMeetingPrep}
      />
    ) : null}
    <SettingsRow
      theme={theme}
      icon="moon-outline"
      title={copy.darkMode}
      subtitle={theme.mode === "dark" ? copy.darkMode : copy.lightMode}
      onPress={onToggleTheme}
    />
    <SettingsRow
      theme={theme}
      icon="language-outline"
      title={copy.language}
      subtitle={lang === "ar" ? copy.arabic : copy.english}
      onPress={onToggleLang}
    />
    <SettingsRow
      theme={theme}
      icon="notifications-outline"
      title={copy.notifications}
      subtitle={copy.notificationsSubtitle}
      onPress={onOpenNotifications}
    />
    <PrimaryButton label={copy.logout} icon="log-out" theme={theme} onPress={onLogout} />
  </>
);

const ProfileBlock = ({
  theme,
  copy,
  employeeName,
  permissionsCount,
}: {
  theme: SnowTheme;
  copy: Copy;
  employeeName: string;
  permissionsCount: number;
}) => (
  <View style={styles.profileHeader}>
    <View style={[styles.profileAvatar, { backgroundColor: theme.primarySoft }]}>
      <Text style={[styles.profileAvatarText, { color: theme.primaryStrong }]}>
        {employeeName.slice(0, 2).toUpperCase()}
      </Text>
    </View>
    <Text style={[ui.screenTitle, { color: theme.text }]}>{employeeName}</Text>
    <Text style={[ui.small, { color: theme.muted }]}>{copy.operationsProfile}</Text>
    <View style={[styles.memberBadge, { backgroundColor: `${theme.primary}16` }]}>
      <Text style={[ui.badgeText, { color: theme.primaryStrong }]}>
        {permissionsCount} {copy.permissionsSuffix}
      </Text>
    </View>
  </View>
);

const styles = createSnowStyles({
  profileHeader: { paddingTop: spacing.xl, alignItems: "center", gap: spacing.sm },
  profileAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: { fontSize: 24, fontWeight: "700" },
  memberBadge: { borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
});
