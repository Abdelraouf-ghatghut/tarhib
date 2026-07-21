import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Pressable,
  Platform,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import {
  appShadow,
  createSnowStyles,
  radii,
  spacing,
  type SnowTheme,
  type StatTone,
} from "./theme";

type IconName = keyof typeof Ionicons.glyphMap;

const outlineIcon = (icon: IconName): IconName => {
  if (String(icon).endsWith("-outline")) return icon;
  const candidate = `${String(icon)}-outline` as IconName;
  return Object.prototype.hasOwnProperty.call(Ionicons.glyphMap, candidate) ? candidate : icon;
};

export const Screen = ({ children, theme }: { children: React.ReactNode; theme: SnowTheme }) => {
  const { width, height } = useWindowDimensions();
  const shortestSide = Math.min(width, height);
  const isTablet = shortestSide >= 600;
  const isLandscapePhone = width > height && !isTablet;
  const maxWidth = isTablet ? 900 : isLandscapePhone ? 680 : 480;
  const horizontalPadding = isTablet
    ? 30
    : width <= 360
      ? 14
      : theme.app === "operations"
        ? 20
        : spacing.lg;

  return (
    <View style={[styles.viewport, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.screen,
          {
            maxWidth,
            backgroundColor: theme.background,
            borderColor: theme.border,
            paddingHorizontal: horizontalPadding,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
};

/**
 * Conteneur plat : plus de fond/bordure/ombre — le contenu s'affiche
 * directement sur le fond de la page, seul le padding/gap est conservé
 * pour la mise en page (demande explicite : plus de rectangles visibles).
 */
export const Card = ({
  children,
  theme,
  style,
}: {
  children: React.ReactNode;
  theme: SnowTheme;
  style?: StyleProp<ViewStyle>;
}) => (
  <View
    style={[
      styles.card,
      theme.app === "operations"
        ? {
            padding: spacing.md,
            backgroundColor: theme.surface,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 12,
          }
        : null,
      style,
    ]}
  >
    {children}
  </View>
);

export const IconBubble = ({
  icon,
  theme,
  color,
}: {
  icon: IconName;
  theme: SnowTheme;
  color?: string;
}) => (
  <View style={[styles.iconBubble, { backgroundColor: "transparent", borderColor: theme.border }]}>
    <Ionicons name={outlineIcon(icon)} size={20} color={color ?? theme.muted} />
  </View>
);

export const Header = ({
  title,
  subtitle,
  theme,
  action,
}: {
  title: string;
  subtitle?: string;
  theme: SnowTheme;
  action?: React.ReactNode;
}) => (
  <View style={styles.header}>
    <View>
      {subtitle ? <Text style={[styles.subtitle, { color: theme.muted }]}>{subtitle}</Text> : null}
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
    </View>
    {action}
  </View>
);

export type ButtonVariant = "solid" | "soft" | "danger" | "outline";

export const PrimaryButton = ({
  label,
  icon,
  theme,
  onPress,
  variant = "solid",
  disabled,
  pill,
}: {
  label: string;
  icon?: IconName;
  theme: SnowTheme;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  pill?: boolean;
}) => {
  // Bouton plein = colorPrimary pastel, comme les boutons antd du web admin.
  const background =
    variant === "solid"
      ? theme.primary
      : variant === "soft"
        ? theme.primarySoft
        : variant === "outline"
          ? theme.surface
          : `${theme.danger}14`;
  const content =
    variant === "solid" ? "#FFFFFF" : variant === "danger" ? theme.danger : theme.primaryStrong;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        theme.app === "operations" ? { minHeight: 44, borderRadius: 8 } : null,
        pill ? { borderRadius: 999 } : null,
        variant === "outline" ? { borderWidth: 1, borderColor: theme.primary } : null,
        {
          backgroundColor: background,
          opacity: disabled ? 0.5 : pressed ? 0.82 : 1,
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={content} /> : null}
      <Text style={[styles.primaryButtonText, { color: content }]}>{label}</Text>
    </Pressable>
  );
};

export const PillButton = ({
  label,
  icon,
  active,
  theme,
  onPress,
}: {
  label: string;
  icon?: IconName;
  active?: boolean;
  theme: SnowTheme;
  onPress?: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={[
      styles.pill,
      {
        backgroundColor: active ? theme.primary : theme.surfaceAlt,
        borderColor: active ? theme.primary : theme.border,
      },
    ]}
  >
    {icon ? <Ionicons name={icon} size={16} color={active ? "#FFFFFF" : theme.muted} /> : null}
    <Text style={[styles.pillText, { color: active ? "#FFFFFF" : theme.text }]}>{label}</Text>
  </Pressable>
);

export const SearchField = ({ placeholder, theme }: { placeholder: string; theme: SnowTheme }) => (
  <View style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.border }]}>
    <Ionicons name="search" size={18} color={theme.muted} />
    <TextInput
      placeholder={placeholder}
      placeholderTextColor={theme.muted}
      style={[styles.searchInput, { color: theme.text }]}
    />
    <Ionicons name="options-outline" size={18} color={theme.muted} />
  </View>
);

/**
 * Carte stat du dashboard web admin (StatCard de DashboardPage.tsx) :
 * light = fond pastel teinté sans bordure, chip icône 44px pastel plus soutenu ;
 * dark = carte sombre bordée hairline, halo néon derrière l'icône.
 */
export const MetricCard = ({
  label,
  value,
  icon,
  theme,
  tone = "brand",
  delta,
  deltaLabel,
  compact,
}: {
  label: string;
  value: string | number;
  icon: IconName;
  theme: SnowTheme;
  tone?: StatTone;
  delta?: { text: string; up: boolean };
  deltaLabel?: string;
  /** Variante empilée/centrée pour les rangées de 3 cartes (largeur réduite). */
  compact?: boolean;
}) => {
  const toneStyle = theme.stat[tone];
  const isDark = theme.mode === "dark";
  const deltaColor = delta?.up ? theme.stat.success.icon : theme.stat.danger.icon;
  return (
    <View
      style={[
        styles.statCard,
        theme.app === "operations" ? { minHeight: 92, borderRadius: 12, padding: 12 } : null,
        {
          backgroundColor: theme.app === "operations" ? theme.surface : toneStyle.card,
          borderWidth: theme.app === "operations" || isDark ? 1 : 0,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={compact ? styles.statTopCompact : styles.statTopRow}>
        <View
          style={[
            styles.statIcon,
            theme.app === "operations" ? { width: 34, height: 34, borderRadius: 9 } : null,
            compact ? styles.statIconCompact : null,
            { backgroundColor: toneStyle.iconBg },
            isDark && toneStyle.glow
              ? {
                  shadowColor: toneStyle.glow,
                  shadowOpacity: 0.45,
                  shadowRadius: 11,
                  shadowOffset: { width: 0, height: 0 },
                }
              : null,
          ]}
        >
          <Ionicons name={outlineIcon(icon)} size={compact ? 18 : 20} color={theme.muted} />
        </View>
        <View style={compact ? styles.statTextColCompact : styles.statTextCol}>
          <Text numberOfLines={1} style={[styles.statLabel, { color: theme.muted }]}>
            {label}
          </Text>
          <Text
            style={[compact ? styles.statValueCompact : styles.statValue, { color: theme.text }]}
          >
            {value}
          </Text>
        </View>
      </View>
      {delta ? (
        <View style={styles.statDeltaRow}>
          <Ionicons
            name={delta.up ? "trending-up" : "trending-down"}
            size={13}
            color={deltaColor}
          />
          <Text style={[styles.statDeltaText, { color: deltaColor }]}>{delta.text}</Text>
          {deltaLabel ? (
            <Text style={[styles.statDeltaLabel, { color: theme.muted }]}>{deltaLabel}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

export const BottomTabs = ({
  tabs,
  active,
  theme,
  onChange,
}: {
  tabs: Array<{ key: string; label: string; icon: IconName; badge?: number }>;
  active: string;
  theme: SnowTheme;
  onChange: (key: string) => void;
}) => (
  <View
    style={[
      styles.tabs,
      { backgroundColor: theme.surface, borderColor: theme.border },
      appShadow(theme),
    ]}
  >
    {tabs.map((tab) => {
      const selected = tab.key === active;
      return (
        <Pressable key={tab.key} onPress={() => onChange(tab.key)} style={styles.tab}>
          <View>
            <Ionicons
              name={outlineIcon(tab.icon)}
              size={21}
              color={selected ? theme.primaryStrong : theme.muted}
            />
            {tab.badge ? (
              <View
                style={[
                  styles.tabBadge,
                  { backgroundColor: theme.danger, borderColor: theme.surface },
                ]}
              >
                <Text style={styles.tabBadgeText}>{tab.badge > 9 ? "9+" : tab.badge}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.tabText, { color: selected ? theme.primaryStrong : theme.muted }]}>
            {tab.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

const styles = createSnowStyles({
  viewport: {
    flex: 1,
    alignItems: "center",
  },
  screen: {
    flex: 1,
    width: "100%",
    paddingHorizontal: spacing.lg,
    borderLeftWidth: Platform.OS === "web" ? 1 : 0,
    borderRightWidth: Platform.OS === "web" ? 1 : 0,
  },
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "400",
    marginBottom: spacing.xs,
  },
  card: {
    padding: spacing.md,
  },
  iconBubble: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  pill: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "500",
  },
  search: {
    height: 46,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  statCard: {
    flex: 1,
    minHeight: 104,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    justifyContent: "center",
  },
  statTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  statTopCompact: {
    alignItems: "center",
    gap: spacing.sm,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statTextCol: {
    flex: 1,
    gap: 2,
  },
  statTextColCompact: {
    alignItems: "center",
    gap: 2,
  },
  statIconCompact: {
    width: 38,
    height: 38,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "400",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  statValueCompact: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  statDeltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  statDeltaText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statDeltaLabel: {
    fontSize: 12,
    fontWeight: "400",
  },
  tabs: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 84,
    borderRadius: 0,
    borderWidth: 0,
    borderTopWidth: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  tab: {
    minWidth: 58,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  tabText: {
    fontSize: 11,
    fontWeight: "500",
  },
  tabBadge: {
    position: "absolute",
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
