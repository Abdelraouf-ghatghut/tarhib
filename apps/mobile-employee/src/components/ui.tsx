import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import {
  Card,
  IconBubble,
  PrimaryButton,
  createSnowStyles,
  directionalIcon,
  spacing,
  t,
  type Lang,
  type SnowTheme,
} from "@tarhib/mobile-shared";

import { type IconName } from "../lib/format";

/**
 * Styles transverses (typo, badges, boutons ronds) partagés entre onglets et modales.
 * Mise en page écrite en LTR neutre : le RTL arabe est assuré par le framework
 * (dir="rtl" sur le web, I18nManager sur natif) — jamais de textAlign
 * 'right'/'left' ni de flex-end en dur pour simuler l'arabe.
 */
export const ui = createSnowStyles({
  screenTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
  },
  small: {
    fontSize: 12,
    fontWeight: "400",
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "400",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  centerText: {
    textAlign: "center",
  },
  errorText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  roundButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  roundButtonPlaceholder: {
    width: 38,
    height: 38,
  },
  rowInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
});

export const ChipRow = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.chips}>{children}</View>
);

export const SectionTitle = ({
  title,
  action,
  theme,
  onAction,
}: {
  title: string;
  action?: string;
  theme: SnowTheme;
  onAction?: () => void;
}) => (
  <View style={styles.sectionTitleRow}>
    <Text style={[ui.sectionTitle, { color: theme.text }]}>{title}</Text>
    {action ? (
      <Pressable onPress={onAction}>
        <Text style={[styles.sectionAction, { color: theme.primaryStrong }]}>{action}</Text>
      </Pressable>
    ) : (
      <View />
    )}
  </View>
);

export const CenteredTitle = ({
  title,
  subtitle,
  theme,
}: {
  title: string;
  subtitle?: string;
  theme: SnowTheme;
}) => (
  <View style={styles.centeredTitle}>
    <Text style={[ui.screenTitle, { color: theme.text }]}>{title}</Text>
    {subtitle ? <Text style={[ui.headerSubtitle, { color: theme.muted }]}>{subtitle}</Text> : null}
  </View>
);

export const ModalHeader = ({
  theme,
  lang,
  title,
  onBack,
}: {
  theme: SnowTheme;
  lang: Lang;
  title: string;
  onBack: () => void;
}) => (
  <View style={styles.modalHeader}>
    <Pressable onPress={onBack} style={[ui.roundButton, { backgroundColor: theme.surface }]}>
      <Ionicons name={directionalIcon("arrow-back")} size={18} color={theme.text} />
    </Pressable>
    <Text style={[ui.screenTitle, { color: theme.text }]}>{title}</Text>
    <View style={ui.roundButtonPlaceholder} />
  </View>
);

export const LoadingState = ({ theme, lang }: { theme: SnowTheme; lang: Lang }) => (
  <Card theme={theme} style={styles.stateCard}>
    <ActivityIndicator color={theme.primaryStrong} />
    <Text style={[ui.small, { color: theme.muted }]}>{t(lang).loading}</Text>
  </Card>
);

export const ErrorState = ({
  theme,
  lang,
  label,
  onRetry,
}: {
  theme: SnowTheme;
  lang: Lang;
  label: string;
  onRetry: () => void;
}) => (
  <Card theme={theme} style={styles.stateCard}>
    <Ionicons name="cloud-offline-outline" size={24} color={theme.danger} />
    <Text style={[ui.productName, { color: theme.text }]}>{label}</Text>
    <PrimaryButton label={t(lang).retry} icon="refresh" theme={theme} onPress={onRetry} />
  </Card>
);

export const EmptyState = ({
  theme,
  icon,
  title,
  text,
  ctaLabel,
  ctaIcon,
  onPress,
}: {
  theme: SnowTheme;
  icon: IconName;
  title: string;
  text: string;
  ctaLabel: string;
  ctaIcon: IconName;
  onPress: () => void;
}) => (
  <Card theme={theme} style={styles.emptyState}>
    <View style={[styles.emptyStateIcon, { backgroundColor: theme.primarySoft }]}>
      <Ionicons name={icon} size={34} color={theme.muted} />
    </View>
    <Text style={[ui.screenTitle, { color: theme.text }]}>{title}</Text>
    <Text style={[styles.emptyStateText, { color: theme.muted }]}>{text}</Text>
    <PrimaryButton label={ctaLabel} icon={ctaIcon} theme={theme} onPress={onPress} />
  </Card>
);

/** Points de confettis décoratifs, positions fixes (pas d'aléatoire pour éviter un flicker au re-render). */
const CONFETTI_DOTS: Array<{
  top: number;
  left: number;
  size: number;
  color: "success" | "warning" | "danger" | "primary";
}> = [
  { top: -6, left: 8, size: 6, color: "warning" },
  { top: 4, left: -14, size: 5, color: "primary" },
  { top: 22, left: 106, size: 6, color: "danger" },
  { top: 92, left: -10, size: 5, color: "success" },
  { top: 100, left: 100, size: 7, color: "warning" },
  { top: -12, left: 78, size: 5, color: "primary" },
];

export const ConfettiDots = ({ theme }: { theme: SnowTheme }) => (
  <>
    {CONFETTI_DOTS.map((dot, index) => (
      <View
        key={index}
        style={[
          styles.confettiDot,
          {
            top: dot.top,
            left: dot.left,
            width: dot.size,
            height: dot.size,
            borderRadius: dot.size / 2,
            backgroundColor: dot.color === "primary" ? theme.primary : theme[dot.color],
          },
        ]}
      />
    ))}
  </>
);

/**
 * Icône isolée d'un côté, paire libellé+valeur groupée de l'autre — JSX
 * = [groupe texte, icône] pour que, sous RTL, le groupe (1er enfant) se
 * place au bord de départ (droite) et l'icône (2e enfant) au bord d'arrivée
 * (gauche), comme la maquette. Idem à l'intérieur du groupe : JSX =
 * [libellé, valeur] place le libellé en premier lu (droite) et la valeur
 * juste après (gauche).
 */
export const SummaryRow = ({
  theme,
  icon,
  label,
  value,
  copyValue,
}: {
  theme: SnowTheme;
  icon: IconName;
  label: string;
  value: string;
  /** Si fourni, l'icône devient pressable et copie cette valeur dans le presse-papiers. */
  copyValue?: string;
}) => {
  const [copied, setCopied] = useState(false);
  const iconChip = (
    <View
      style={[
        styles.summaryIconChip,
        { backgroundColor: copied ? `${theme.success}22` : theme.surfaceAlt },
      ]}
    >
      <Ionicons
        name={copied ? "checkmark" : icon}
        size={16}
        color={copied ? theme.success : theme.text}
      />
    </View>
  );

  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryTextGroup}>
        <Text style={[ui.small, styles.summaryLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[ui.small, styles.summaryValue, { color: theme.muted }]}>{value}</Text>
      </View>
      {copyValue ? (
        <Pressable
          onPress={() => {
            Clipboard.setStringAsync(copyValue)
              .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              })
              .catch(() => {
                // ponytail: échec silencieux (permission presse-papiers refusée sur web) — pas de feedback trompeur.
              });
          }}
          hitSlop={8}
        >
          {iconChip}
        </Pressable>
      ) : (
        iconChip
      )}
    </View>
  );
};

export const NoteBanner = ({
  theme,
  color,
  text,
  icon,
}: {
  theme: SnowTheme;
  color: string;
  text: string;
  icon?: IconName;
}) => (
  <View style={[styles.noteBanner, { backgroundColor: `${color}14` }]}>
    {icon ? <Ionicons name={icon} size={16} color={color} /> : null}
    <Text style={[styles.noteBannerText, { color }]}>{text}</Text>
  </View>
);

export const Stepper = ({
  theme,
  quantity,
  onAdd,
  onRemove,
}: {
  theme: SnowTheme;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}) => (
  <View style={styles.stepper}>
    <Pressable onPress={onRemove} style={[styles.stepperButton, { borderColor: theme.border }]}>
      <Ionicons name="remove" size={16} color={theme.muted} />
    </Pressable>
    <Text style={[styles.stepperText, { color: theme.text }]}>{quantity}</Text>
    <Pressable onPress={onAdd} style={[styles.stepperButton, { borderColor: theme.border }]}>
      <Ionicons name="add" size={16} color={theme.muted} />
    </Pressable>
  </View>
);

export const SummaryLine = ({
  label,
  value,
  theme,
}: {
  label: string;
  value: string | number;
  theme: SnowTheme;
}) => (
  <View style={styles.summaryLine}>
    <Text style={[styles.totalLabel, { color: theme.muted }]}>{label}</Text>
    <Text style={[ui.productName, { color: theme.text }]}>{value}</Text>
  </View>
);

export const SettingsRow = ({
  theme,
  icon,
  title,
  subtitle,
  badge,
  onPress,
}: {
  theme: SnowTheme;
  icon: IconName;
  title: string;
  subtitle: string;
  badge?: number;
  onPress?: () => void;
}) => (
  <Pressable onPress={onPress}>
    <Card theme={theme} style={styles.settingsRow}>
      <IconBubble icon={icon} theme={theme} />
      <View style={ui.rowInfo}>
        <Text style={[ui.productName, { color: theme.text }]}>{title}</Text>
        <Text style={[ui.small, { color: theme.muted }]}>{subtitle}</Text>
      </View>
      {badge ? (
        <View style={[styles.settingsBadge, { backgroundColor: theme.danger }]}>
          <Text style={styles.settingsBadgeText}>{badge > 9 ? "9+" : badge}</Text>
        </View>
      ) : null}
      <Ionicons name={directionalIcon("chevron-forward")} size={18} color={theme.muted} />
    </Card>
  </Pressable>
);

export const RadioRow = ({
  theme,
  title,
  subtitle,
  icon,
  active,
  onPress,
}: {
  theme: SnowTheme;
  title: string;
  subtitle: string;
  icon: IconName;
  active: boolean;
  onPress: () => void;
}) => (
  <Pressable onPress={onPress}>
    <Card
      theme={theme}
      style={[styles.settingsRow, active ? { borderColor: theme.primary } : null]}
    >
      <IconBubble icon={icon} theme={theme} />
      <View style={ui.rowInfo}>
        <Text style={[ui.productName, { color: theme.text }]}>{title}</Text>
        <Text style={[ui.small, { color: theme.muted }]}>{subtitle}</Text>
      </View>
      <View
        style={[
          styles.radio,
          {
            borderColor: active ? theme.primary : theme.border,
            backgroundColor: active ? theme.primary : "transparent",
          },
        ]}
      >
        {active ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}
      </View>
    </Card>
  </Pressable>
);

export const CatalogSearch = ({
  value,
  onChangeText,
  placeholder,
  theme,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  theme: SnowTheme;
}) => (
  <View style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.border }]}>
    <Ionicons name="search" size={18} color={theme.muted} />
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.muted}
      style={[styles.searchInput, { color: theme.text }]}
    />
    {value ? (
      <Pressable onPress={() => onChangeText("")}>
        <Ionicons name="close-circle" size={18} color={theme.muted} />
      </Pressable>
    ) : (
      <View style={styles.searchIconSpacer} />
    )}
  </View>
);

const styles = createSnowStyles({
  chips: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionAction: {
    fontSize: 12,
    fontWeight: "600",
  },
  centeredTitle: {
    paddingTop: spacing.lg,
    alignItems: "center",
    gap: spacing.xs,
  },
  modalHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stateCard: {
    minHeight: 132,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  emptyState: {
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  emptyStateIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateText: {
    fontSize: 13,
    fontWeight: "400",
    textAlign: "center",
  },
  noteBanner: {
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  noteBannerText: {
    fontSize: 12,
    fontWeight: "600",
  },
  confettiDot: { position: "absolute" },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  summaryTextGroup: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  summaryIconChip: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryLabel: { fontWeight: "700" },
  summaryValue: { fontWeight: "400" },
  stepper: {
    height: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  stepperButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperText: {
    minWidth: 24,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  summaryLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  settingsBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  search: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  searchIconSpacer: {
    width: 18,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "400",
    paddingVertical: 0,
  },
});
