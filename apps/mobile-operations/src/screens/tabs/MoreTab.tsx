import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Card, createSnowStyles, spacing, type Lang, type SnowTheme } from "@tarhib/mobile-shared";
import { CenteredTitle, ui } from "../../components/ui";
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
  onSelect,
}: {
  theme: SnowTheme;
  lang: Lang;
  modules: OperationsModuleItem[];
  onSelect: (key: string) => void;
}) => (
  <>
    <CenteredTitle title={arOrEn(lang, "كل الوحدات", "All modules")} theme={theme} />
    <View style={styles.grid}>
      {modules.map((module) => (
        <Pressable key={module.key} onPress={() => onSelect(module.key)} style={styles.cell}>
          <Card
            theme={theme}
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name={module.icon} size={24} color={theme.primaryStrong} />
              {module.badge ? (
                <View style={[styles.badge, { backgroundColor: theme.danger }]}>
                  <Text style={styles.badgeText}>{module.badge > 99 ? "99+" : module.badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[ui.orderId, styles.label, { color: theme.text }]}>{module.label}</Text>
          </Card>
        </Pressable>
      ))}
    </View>
  </>
);

const styles = createSnowStyles({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  cell: { width: "47%" },
  card: {
    minHeight: 132,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  icon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  label: { textAlign: "center" },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
});
