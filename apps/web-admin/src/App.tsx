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
import { useSystemDark } from "./hooks/useSystemDark";
import { router } from "./router";

/**
 * Mapping du design system (tokens.css) vers les tokens antd.
 * antd a besoin de valeurs concrètes pour dériver les états hover/actif,
 * donc les deux palettes sont déclarées ici avec les MÊMES valeurs que les
 * CSS custom properties — la bascule light/dark suit prefers-color-scheme.
 */
const LIGHT = {
  colorPrimary: "#2E2E2E", // brand (zinc monochrome)
  colorLink: "#2E2E2E", // fg-brand
  colorSuccess: "#16A34A", // success
  colorWarning: "#F59E0B", // warning
  colorError: "#DC2626", // danger
  colorInfo: "#2E2E2E",
  colorTextHeading: "#09090B", // heading
  colorText: "#09090B", // heading (contrôles / valeurs)
  colorTextSecondary: "#71717A", // body
  colorTextTertiary: "#A1A1AA", // body-subtle
  colorTextDisabled: "#A1A1AA", // fg-disabled
  colorBgLayout: "#FAFAFA", // neutral-secondary-soft
  colorBgContainer: "#FFFFFF", // neutral-primary-soft
  colorBgElevated: "#FFFFFF", // neutral-primary
  colorBorder: "#E4E4E7", // border-default
  colorBorderSecondary: "#E4E4E7",
  colorBgContainerDisabled: "#F4F4F5", // disabled
};

const DARK = {
  colorPrimary: "#D4D4D4",
  colorLink: "#D4D4D4",
  colorSuccess: "#22C55E",
  colorWarning: "#F59E0B",
  colorError: "#EF4444",
  colorInfo: "#D4D4D4",
  colorTextHeading: "#FAFAFA",
  colorText: "#FAFAFA",
  colorTextSecondary: "#A1A1AA",
  colorTextTertiary: "#71717A",
  colorTextDisabled: "#52525B",
  colorBgLayout: "#09090B", // neutral-secondary-soft (dark)
  colorBgContainer: "#09090B", // neutral-primary-soft (dark)
  colorBgElevated: "#18181B", // neutral-primary-medium (dropdowns, modals)
  colorBorder: "#27272A",
  colorBorderSecondary: "#27272A",
  colorBgContainerDisabled: "#18181B",
};

const SHADOW_SM = "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)";
const SHADOW_MD = "0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.08)";
const SHADOW_LG = "0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.08)";

function AppInner() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const isDark = useSystemDark();
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
          borderRadius: 8, // radius base (boutons, cartes, modals)
          borderRadiusSM: 6, // radius default (inputs, badges, petits contrôles)
          borderRadiusXS: 4, // radius sm (checkboxes)
          borderRadiusLG: 8,
          // Thmanyah = police produit (CLAUDE.md §18) ; Cairo/Inter en fallback
          fontFamily: isAr
            ? "'Thmanyah', 'Cairo', 'Inter', system-ui, sans-serif"
            : "'Thmanyah', 'Inter', 'Cairo', system-ui, sans-serif",
          fontWeightStrong: 600, // headings semibold
          boxShadow: SHADOW_SM,
          boxShadowSecondary: SHADOW_MD, // dropdowns / popovers
          motionDurationMid: "0.15s",
          motionDurationSlow: "0.2s",
        },
        components: {
          Menu: {
            itemBg: "transparent",
            itemSelectedBg: isDark ? "#27272A" : "#F4F4F5", // neutral-secondary-strong
            itemSelectedColor: isDark ? "#E5E5E5" : "#1A1A1A", // fg-brand-strong
            itemHoverBg: isDark ? "#18181B" : "#F4F4F5", // neutral-secondary-medium
            groupTitleColor: palette.colorTextTertiary,
            groupTitleFontSize: 11,
          },
          Table: {
            headerBg: isDark ? "#09090B" : "#FAFAFA", // neutral-secondary-soft
            headerColor: palette.colorTextSecondary,
            rowHoverBg: isDark ? "#09090B" : "#FAFAFA",
            cellPaddingInline: 16,
            cellPaddingBlock: 12,
          },
          Card: {
            boxShadow: SHADOW_SM,
          },
          Input: {
            borderRadius: 6,
          },
          Select: {
            borderRadius: 6,
          },
          InputNumber: {
            borderRadius: 6,
          },
          Button: {
            primaryShadow: "none",
            fontWeight: 500,
            // Brand monochrome : texte contrasté sur le bouton primaire
            primaryColor: isDark ? "#09090B" : "#FFFFFF",
          },
          Layout: {
            siderBg: palette.colorBgContainer,
            headerBg: palette.colorBgContainer,
            bodyBg: palette.colorBgLayout,
          },
          Modal: {
            boxShadow: SHADOW_LG,
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
          <AppInner />
        </ScopeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
