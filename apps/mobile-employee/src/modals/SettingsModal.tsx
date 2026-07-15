import React from "react";
import { Modal, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  createSnowStyles,
  spacing,
  type Lang,
  type SnowTheme,
  type ThemeMode,
} from "@tarhib/mobile-shared";

import { ModalHeader, NoteBanner, RadioRow, ui } from "../components/ui";
import { arOrEn } from "../lib/format";

export const SettingsModal = ({
  visible,
  lang,
  theme,
  onClose,
  onSetLang,
  onSetTheme,
}: {
  visible: boolean;
  lang: Lang;
  theme: SnowTheme;
  onClose: () => void;
  onSetLang: (lang: Lang) => void;
  onSetTheme: (mode: ThemeMode) => void;
}) => (
  <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.root, { backgroundColor: theme.background }]}
    >
      <ModalHeader
        theme={theme}
        lang={lang}
        title={arOrEn(lang, "اللغة والمظهر", "Language and appearance")}
        onBack={onClose}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={[ui.sectionTitle, { color: theme.text }]}>
          {arOrEn(lang, "اللغة / Language", "Language / اللغة")}
        </Text>
        <RadioRow
          theme={theme}
          title="العربية"
          subtitle={arOrEn(lang, "اللغة الافتراضية", "Default language")}
          icon="globe-outline"
          active={lang === "ar"}
          onPress={() => onSetLang("ar")}
        />
        <RadioRow
          theme={theme}
          title="English"
          subtitle={arOrEn(lang, "الإنجليزية", "English")}
          icon="globe-outline"
          active={lang === "en"}
          onPress={() => onSetLang("en")}
        />
        <Text style={[ui.sectionTitle, { color: theme.text }]}>
          {arOrEn(lang, "المظهر", "Appearance")}
        </Text>
        <RadioRow
          theme={theme}
          title={arOrEn(lang, "الوضع الفاتح", "Light mode")}
          subtitle="Light Mode"
          icon="sunny-outline"
          active={theme.mode === "light"}
          onPress={() => onSetTheme("light")}
        />
        <RadioRow
          theme={theme}
          title={arOrEn(lang, "الوضع الداكن", "Dark mode")}
          subtitle="Dark Mode"
          icon="moon-outline"
          active={theme.mode === "dark"}
          onPress={() => onSetTheme("dark")}
        />
        <NoteBanner
          theme={theme}
          color={theme.primaryStrong}
          icon="sparkles-outline"
          text={arOrEn(lang, "سيتم تطبيق التغييرات فوراً", "Changes apply instantly")}
        />
      </ScrollView>
    </SafeAreaView>
  </Modal>
);

const styles = createSnowStyles({
  root: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
});
