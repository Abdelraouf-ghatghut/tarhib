import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Card, createSnowStyles, spacing, type Lang, type SnowTheme } from "@tarhib/mobile-shared";
import { arOrEn } from "../../lib/format";

export interface OperationsModuleItem {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  badge?: number;
}

export const MoreTab = ({
  theme,
  lang,
  modules,
  unreadNotifications = 0,
  onOpenNotifications,
  onSelect,
}: {
  theme: SnowTheme;
  lang: Lang;
  modules: OperationsModuleItem[];
  unreadNotifications?: number;
  onOpenNotifications?: () => void;
  onSelect: (key: string) => void;
}) => (
  <>
    <View style={styles.brandHeader}>
      <View style={styles.brand}>
        <View style={[styles.logoMark, { backgroundColor: theme.primaryStrong }]}>
          <View style={styles.logoCut} />
        </View>
        <View>
          <Text style={[styles.brandAr, { color: theme.primaryStrong }]}>ترحيب</Text>
          <Text style={[styles.brandEn, { color: theme.primaryStrong }]}>Tarhib</Text>
          <Text style={[styles.operations, { color: theme.primaryStrong }]}>OPERATIONS</Text>
        </View>
      </View>
      <Pressable onPress={onOpenNotifications} style={[styles.bell, { borderColor: theme.border }]}>
        <Ionicons name="notifications-outline" size={27} color={theme.text} />
        {unreadNotifications > 0 ? (
          <View style={[styles.bellDot, { backgroundColor: theme.danger }]} />
        ) : null}
      </Pressable>
    </View>
    <Text style={[styles.title, { color: theme.text }]}>{arOrEn(lang, "كل الوحدات", "More")}</Text>
    <View style={styles.grid}>
      {modules.map((module) => (
        <Pressable key={module.key} onPress={() => onSelect(module.key)} style={styles.cell}>
          <Card theme={theme} style={styles.card}>
            <View
              style={[
                styles.icon,
                { backgroundColor: module.key === "procurement" ? theme.primarySoft : "#F3F6FB" },
              ]}
            >
              <Ionicons
                name={module.icon}
                size={31}
                color={module.key === "procurement" ? theme.primaryStrong : "#1459B8"}
              />
            </View>
            {module.badge ? (
              <View style={[styles.badge, { backgroundColor: theme.danger }]}>
                <Text style={styles.badgeText}>{module.badge > 99 ? "99+" : module.badge}</Text>
              </View>
            ) : null}
            <Ionicons
              name={lang === "ar" ? "chevron-back" : "chevron-forward"}
              size={21}
              color="#A0A8B5"
              style={styles.chevron}
            />
            <Text numberOfLines={2} style={[styles.label, { color: theme.text }]}>
              {module.label}
            </Text>
          </Card>
        </Pressable>
      ))}
    </View>
  </>
);

const styles = createSnowStyles({
  brandHeader: {
    minHeight: 172,
    paddingTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoMark: {
    width: 40,
    height: 58,
    borderRadius: 3,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  logoCut: {
    width: 18,
    height: 26,
    backgroundColor: "rgba(255,255,255,0.24)",
    alignSelf: "flex-end",
  },
  brandAr: { fontSize: 25, lineHeight: 27, fontWeight: "700" },
  brandEn: { fontSize: 23, lineHeight: 25, fontWeight: "700" },
  operations: { fontSize: 10, fontWeight: "700", letterSpacing: 2.2, marginTop: 6 },
  bell: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  bellDot: { position: "absolute", top: 5, right: 5, width: 13, height: 13, borderRadius: 7 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 22 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingBottom: spacing.lg },
  cell: { width: "48.2%" },
  card: { minHeight: 148, padding: 18, borderRadius: 14, justifyContent: "space-between" },
  icon: { width: 56, height: 56, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 16, lineHeight: 20, fontWeight: "700" },
  chevron: { position: "absolute", right: 15, top: 76 },
  badge: {
    position: "absolute",
    top: 16,
    right: 16,
    minWidth: 29,
    height: 29,
    borderRadius: 15,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});
