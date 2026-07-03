import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, App as AntApp, theme as antdTheme } from "antd";
import { RouterProvider } from "react-router-dom";
import { useTranslation } from "react-i18next";
import arEG from "antd/locale/ar_EG";
import enUS from "antd/locale/en_US";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./contexts/AuthContext";
import { ScopeProvider } from "./contexts/ScopeContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useTheme } from "./hooks/useTheme";
import { router } from "./router";

/**
 * Mapping SnowUI (tokens.css) vers les tokens antd.
 * antd a besoin de valeurs concrètes pour dériver les états hover/actif,
 * donc les deux ambiances sont déclarées ici avec les MÊMES valeurs que les
 * CSS custom properties — la bascule light/dark suit <html data-theme>.
 * Règle pastel : primary/success/warning/danger restent pastel dans les
 * deux modes, seule la luminosité s'adapte.
 */
const LIGHT = {
  colorPrimary: "#6C7CFF", // brand pastel
  colorLink: "#5A6AF0", // fg-brand
  colorSuccess: "#22C55E", // success-strong (texte lisible, fills pastel via tokens)
  colorWarning: "#F59E0B",
  colorError: "#F43F5E", // danger-strong
  colorInfo: "#6C7CFF",
  colorTextHeading: "#0F172A", // text
  colorText: "#0F172A",
  colorTextSecondary: "#475569", // body
  colorTextTertiary: "#94A3B8", // muted
  colorTextDisabled: "#A3AEC2",
  colorBgLayout: "#F7F8FC", // bg
  colorBgContainer: "#FFFFFF", // surface / card
  colorBgElevated: "#FFFFFF",
  colorBorder: "rgba(15, 23, 42, 0.10)",
  colorBorderSecondary: "rgba(15, 23, 42, 0.06)", // border
  colorBgContainerDisabled: "#EEF1F8",
};

const DARK = {
  colorPrimary: "#7C8BFF",
  colorLink: "#7C8BFF",
  colorSuccess: "#34D399",
  colorWarning: "#FBBF24",
  colorError: "#FB7185",
  colorInfo: "#7C8BFF",
  colorTextHeading: "#E5E7EB",
  colorText: "#E5E7EB",
  colorTextSecondary: "#94A3B8",
  colorTextTertiary: "#64748B",
  colorTextDisabled: "#475569",
  colorBgLayout: "#0B1220", // bg
  colorBgContainer: "#111827", // card
  colorBgElevated: "#1E293B",
  colorBorder: "rgba(255, 255, 255, 0.10)",
  colorBorderSecondary: "rgba(255, 255, 255, 0.06)",
  colorBgContainerDisabled: "#1E293B",
};

const CARD_SHADOW_LIGHT = "0 6px 16px rgba(15, 23, 42, 0.06)";
const CARD_SHADOW_DARK = "0 0 0 1px rgba(255, 255, 255, 0.04), 0 8px 24px rgba(0, 0, 0, 0.35)";
const SHADOW_MD_LIGHT =
  "0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.07)";
const SHADOW_MD_DARK = "0 4px 6px -1px rgba(0, 0, 0, 0.35), 0 2px 4px -2px rgba(0, 0, 0, 0.35)";
const SHADOW_LG_LIGHT =
  "0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.08)";
const SHADOW_LG_DARK = "0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.4)";

function AppInner() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { isDark } = useTheme();
  const palette = isDark ? DARK : LIGHT;

  // TARHIB-8/50: sync HTML dir + lang so CSS logical properties and browser layout apply RTL
  useEffect(() => {
    document.documentElement.dir = isAr ? "rtl" : "ltr";
    document.documentElement.lang = isAr ? "ar" : "en";
  }, [isAr]);

  return (
    <ConfigProvider
      direction={isAr ? "rtl" : "ltr"}
      locale={isAr ? arEG : enUS}
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          ...palette,
          borderRadius: 8,
          borderRadiusSM: 6,
          borderRadiusXS: 4,
          borderRadiusLG: 12, // cartes SnowUI plus douces
          // Thmanyah = police produit (CLAUDE.md §18) ; Cairo/Inter en fallback
          fontFamily: isAr
            ? "'Thmanyah', 'Cairo', 'Inter', system-ui, sans-serif"
            : "'Thmanyah', 'Inter', 'Cairo', system-ui, sans-serif",
          fontWeightStrong: 600,
          boxShadow: isDark ? CARD_SHADOW_DARK : CARD_SHADOW_LIGHT,
          boxShadowSecondary: isDark ? SHADOW_MD_DARK : SHADOW_MD_LIGHT,
          motionDurationMid: "0.15s",
          motionDurationSlow: "0.2s",
        },
        components: {
          Menu: {
            itemBg: "transparent",
            // Actif : remplissage pastel (light) / lueur bleu-violet (dark)
            itemSelectedBg: isDark ? "rgba(124, 139, 255, 0.16)" : "rgba(108, 124, 255, 0.12)",
            itemSelectedColor: isDark ? "#A5B0FF" : "#5A6AF0",
            itemHoverBg: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(108, 124, 255, 0.06)",
            groupTitleColor: palette.colorTextTertiary,
            groupTitleFontSize: 11,
          },
          Table: {
            headerBg: isDark ? "#0F172A" : "#F7F8FC",
            headerColor: palette.colorTextSecondary,
            rowHoverBg: isDark ? "#1E293B" : "#F1F3FA",
            cellPaddingInline: 16,
            cellPaddingBlock: 12,
          },
          Card: {
            boxShadow: isDark ? CARD_SHADOW_DARK : CARD_SHADOW_LIGHT,
          },
          Input: {
            borderRadius: 8,
          },
          Select: {
            borderRadius: 8,
          },
          InputNumber: {
            borderRadius: 8,
          },
          Button: {
            primaryShadow: "none",
            fontWeight: 500,
          },
          Layout: {
            // Sidebar = fond de page (SnowUI §5), header géré en glass dans AdminLayout
            siderBg: palette.colorBgLayout,
            headerBg: "transparent",
            bodyBg: palette.colorBgLayout,
          },
          Modal: {
            boxShadow: isDark ? SHADOW_LG_DARK : SHADOW_LG_LIGHT,
          },
          Tag: {
            borderRadiusSM: 6,
          },
        },
      }}
    >
      <AntApp>
        <RouterProvider router={router} />
      </AntApp>
    </ConfigProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ScopeProvider>
          <ThemeProvider>
            <AppInner />
          </ThemeProvider>
        </ScopeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
