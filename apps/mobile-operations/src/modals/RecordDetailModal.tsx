import { Ionicons } from "@expo/vector-icons";
import React, { type ReactNode } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createSnowStyles, spacing, type Lang, type SnowTheme } from "@tarhib/mobile-shared";

import { ui } from "../components/ui";

export type DetailField = {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export const RecordDetailModal = ({
  visible,
  title,
  reference,
  status,
  fields,
  theme,
  lang,
  children,
  onClose,
}: {
  visible: boolean;
  title: string;
  reference: string;
  status?: string;
  fields: DetailField[];
  theme: SnowTheme;
  lang: Lang;
  children?: ReactNode;
  onClose: () => void;
}) => (
  <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.back}>
          <Ionicons
            name={lang === "ar" ? "chevron-forward" : "chevron-back"}
            size={27}
            color={theme.text}
          />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <View style={styles.back} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.hero, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <View style={styles.heading}>
            <Text style={[styles.reference, { color: theme.text }]}>{reference}</Text>
            {status ? (
              <View style={[styles.badge, { backgroundColor: `${theme.primaryStrong}12` }]}>
                <Text style={[ui.badgeText, { color: theme.primaryStrong }]}>{status}</Text>
              </View>
            ) : null}
          </View>
          {fields.map((field, index) => (
            <View
              key={`${field.label}-${index}`}
              style={[styles.row, { borderTopColor: theme.border }]}
            >
              <View
                style={[
                  styles.icon,
                  { backgroundColor: index === 0 ? theme.primarySoft : theme.surfaceAlt },
                ]}
              >
                <Ionicons
                  name={field.icon ?? "information-circle-outline"}
                  size={20}
                  color={index === 0 ? theme.primaryStrong : theme.muted}
                />
              </View>
              <View style={ui.rowInfo}>
                <Text style={[ui.small, { color: theme.muted }]}>{field.label}</Text>
                <Text style={[ui.orderId, { color: theme.text }]}>{field.value}</Text>
              </View>
            </View>
          ))}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  </Modal>
);

const styles = createSnowStyles({
  root: { flex: 1 },
  header: {
    minHeight: 76,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: { width: 42, height: 42, alignItems: "flex-start", justifyContent: "center" },
  title: { fontSize: 19, fontWeight: "700" },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 36 },
  hero: { borderWidth: 1, borderRadius: 13, padding: spacing.lg, gap: spacing.md },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  reference: { flex: 1, fontSize: 22, lineHeight: 29, fontWeight: "700" },
  badge: { borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  row: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  icon: { width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
