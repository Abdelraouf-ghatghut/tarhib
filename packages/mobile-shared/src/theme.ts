import { I18nManager, Platform, StyleSheet } from "react-native";

export type AppMode = "employee" | "operations";
export type ThemeMode = "light" | "dark";
export type Lang = "en" | "ar";

export type StatTone = "brand" | "danger" | "success" | "violet";

// Carte stat du dashboard web (tokens --stat-card-* / --stat-icon-* / --stat-glow-*) :
// light = carte pastel teintée sans bordure ; dark = carte sombre + halo néon sur l'icône.
export type StatToneStyle = {
  card: string;
  iconBg: string;
  icon: string;
  glow?: string;
};

export type SnowTheme = {
  mode: ThemeMode;
  app: AppMode;
  primary: string;
  primarySoft: string;
  primaryStrong: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  overlay: string;
  text: string;
  muted: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  shadow: string;
  stat: Record<StatTone, StatToneStyle>;
};

// Statuts identiques aux tokens du web admin (colorSuccess/Warning/Error).
const shared = {
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#F43F5E",
};

// Neutres = mêmes tokens SnowUI que le web admin (apps/web-admin/src/App.tsx
// + styles/tokens.css) pour les DEUX apps : fond blanc, cartes blanches
// bordées hairline, texte #0F172A. Seule la couleur de marque diffère :
// Employee vert #009B55 (CLAUDE.md §2), Operations #5B8CFF (bleu du CDC) —
// le web admin utilise son propre indigo #6C7CFF, jamais mêlé aux apps mobiles.
export const makeTheme = (app: AppMode, mode: ThemeMode): SnowTheme => {
  const isDark = mode === "dark";
  const isEmployee = app === "employee";
  const primary = isEmployee ? "#009B55" : "#159455";
  const primarySoft = isEmployee ? "#EAF7F0" : "#EAF6EF";
  const primaryStrong = isEmployee
    ? isDark
      ? "#34D399"
      : "#008F4C"
    : isDark
      ? "#5FD195"
      : "#11814A";

  // Tons des cartes stats = mêmes valeurs que tokens.css du web admin
  // (--stat-card-*, --stat-icon-*-bg, --stat-glow-*). Le ton "brand" suit la
  // couleur de marque de l'app (Employee indigo / Operations bleu).
  const stat: Record<StatTone, StatToneStyle> = isDark
    ? {
        brand: {
          card: "#111827",
          iconBg: isEmployee ? "rgba(52,211,153,0.20)" : "rgba(127,163,255,0.20)",
          icon: primaryStrong,
          glow: primaryStrong,
        },
        danger: {
          card: "#111827",
          iconBg: "rgba(251,113,133,0.18)",
          icon: "#FB7185",
          glow: "#FB7185",
        },
        success: {
          card: "#111827",
          iconBg: "rgba(52,211,153,0.18)",
          icon: "#34D399",
          glow: "#34D399",
        },
        violet: {
          card: "#111827",
          iconBg: "rgba(165,180,252,0.18)",
          icon: "#A5B4FC",
          glow: "#A5B4FC",
        },
      }
    : {
        brand: {
          card: primarySoft,
          iconBg: isEmployee ? "#D7F2E4" : "#DCE8FF",
          icon: primaryStrong,
        },
        danger: { card: "#FFF1F3", iconBg: "#FFE0E5", icon: "#E11D48" },
        success: { card: "#ECFDF3", iconBg: "#D1FAE0", icon: "#16A34A" },
        violet: { card: "#EEF2FF", iconBg: "#E0E7FF", icon: "#6366F1" },
      };

  return {
    mode,
    app,
    primary,
    primarySoft: isDark ? `${primary}24` : primarySoft,
    primaryStrong,
    // Fond de page du dashboard web : --neutral-secondary-soft #F7F8FC —
    // les cartes blanches ressortent dessus, comme sur le web admin.
    background: isDark ? "#0B1220" : "#FFFFFF",
    surface: isDark ? "#111827" : "#FFFFFF",
    surfaceAlt: isDark ? "#1E293B" : "#F6F7F8",
    overlay: isDark ? "#1E293B" : "#FBFCFE",
    text: isDark ? "#E5E7EB" : "#0F172A",
    muted: isDark ? "#94A3B8" : "#64748B",
    border: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)",
    shadow: isDark ? "#000000" : "#0F172A",
    stat,
    ...shared,
  };
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

// Rayons alignés sur le web admin (styles/tokens.css) : xs/chips 6, contrôles
// 8, cartes 12, stat-cards 16. `lg` valait 8 par erreur (cartes rendues avec
// le même rayon que les contrôles) — corrigé à 12 pour matcher --radius-lg.
export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
};

// Équivalent mobile de --shadow-card : 0 6px 16px rgb(15 23 42 / 0.06).
export const appShadow = (theme: SnowTheme) => ({
  shadowColor: theme.shadow,
  shadowOpacity: theme.mode === "dark" ? 0.24 : 0.035,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 1,
});

/**
 * Thmanyah (police produit, CLAUDE.md §18) n'est fournie qu'en woff2 par le
 * pack du web admin : elle n'est donc appliquée que sur le web (RNW passe la
 * pile CSS telle quelle). Sur iOS/Android la police système reste en place
 * tant qu'un pack ttf/otf sous licence n'est pas disponible.
 */
export const productFontFamily =
  Platform.OS === "web" ? "Thmanyah, 'Segoe UI', Tahoma, Arial, sans-serif" : undefined;

/**
 * Équivalent de StyleSheet.create qui injecte la police produit dans chaque
 * style texte (détecté par fontSize/fontWeight) sans toucher aux styles de
 * layout — les icônes vectorielles gardent leur propre fontFamily.
 */
export function createSnowStyles<T extends StyleSheet.NamedStyles<T>>(styles: T): T {
  if (!productFontFamily) return StyleSheet.create(styles);
  const patched = {} as Record<string, unknown>;
  for (const [key, style] of Object.entries(styles)) {
    const textStyle = style as { fontSize?: unknown; fontWeight?: unknown; fontFamily?: unknown };
    const isTextStyle =
      textStyle &&
      (textStyle.fontSize !== undefined || textStyle.fontWeight !== undefined) &&
      textStyle.fontFamily === undefined;
    patched[key] = isTextStyle ? { ...(style as object), fontFamily: productFontFamily } : style;
  }
  return StyleSheet.create(patched as T);
}

export const isRtl = (lang: Lang) => lang === "ar";

export const applyLayoutDirection = (lang: Lang) => {
  const shouldBeRtl = isRtl(lang);
  // Web (RNW) : forceRTL seul ne retourne pas la mise en page — c'est
  // l'attribut dir du document qui pilote le sens des flex rows et du texte.
  if (Platform.OS === "web" && typeof document !== "undefined") {
    document.documentElement.setAttribute("dir", shouldBeRtl ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", lang);
  }
  if (I18nManager.isRTL !== shouldBeRtl) {
    I18nManager.allowRTL(shouldBeRtl);
    I18nManager.forceRTL(shouldBeRtl);
    // iOS/Android : le retournement ne prend effet qu'au prochain démarrage
    // de l'app (limitation React Native) ; la préférence est persistée.
  }
};

/**
 * Icône directionnelle cohérente avec la mise en page réellement active
 * (I18nManager.isRTL), pas avec la langue : sur natif, tant que l'app n'a
 * pas redémarré après un changement de langue, la mise en page reste LTR
 * et les flèches doivent le rester aussi.
 */
export const isLayoutRtl = () =>
  Platform.OS === "web" && typeof document !== "undefined"
    ? document.documentElement.getAttribute("dir") === "rtl"
    : I18nManager.isRTL;

export const directionalIcon = (
  ltrIcon: "arrow-back" | "chevron-back" | "arrow-forward" | "chevron-forward",
) => {
  if (!isLayoutRtl()) return ltrIcon;
  const mirrored = {
    "arrow-back": "arrow-forward",
    "arrow-forward": "arrow-back",
    "chevron-back": "chevron-forward",
    "chevron-forward": "chevron-back",
  } as const;
  return mirrored[ltrIcon];
};

export const globalStyles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
});
