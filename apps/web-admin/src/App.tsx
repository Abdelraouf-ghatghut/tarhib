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
  colorPrimary: "#1447E6", // brand
  colorLink: "#1447E6", // fg-brand
  colorSuccess: "#007A55", // success
  colorWarning: "#F97316", // warning
  colorError: "#C70036", // danger
  colorInfo: "#1447E6",
  colorTextHeading: "#111827", // heading
  colorText: "#111827", // heading (contrôles / valeurs)
  colorTextSecondary: "#4B5563", // body
  colorTextTertiary: "#6B7280", // body-subtle
  colorTextDisabled: "#9CA3AF", // fg-disabled
  colorBgLayout: "#F9FAFB", // neutral-secondary-soft
  colorBgContainer: "#FFFFFF", // neutral-primary-soft
  colorBgElevated: "#FFFFFF", // neutral-primary
  colorBorder: "#E5E7EB", // border-default
  colorBorderSecondary: "#E5E7EB",
  colorBgContainerDisabled: "#F3F4F6", // disabled
};

const DARK = {
  colorPrimary: "#155DFC",
  colorLink: "#51A2FF",
  colorSuccess: "#009966",
  colorWarning: "#F97316",
  colorError: "#C70036",
  colorInfo: "#155DFC",
  colorTextHeading: "#FFFFFF",
  colorText: "#FFFFFF",
  colorTextSecondary: "#9CA3AF",
  colorTextTertiary: "#9CA3AF",
  colorTextDisabled: "#6B7280",
  colorBgLayout: "#030712", // neutral-secondary (dark)
  colorBgContainer: "#101828", // neutral-primary-soft (dark)
  colorBgElevated: "#101828",
  colorBorder: "#1F2937",
  colorBorderSecondary: "#1F2937",
  colorBgContainerDisabled: "#1F2937",
};

const SHADOW_XS = "0 1px 2px 0 rgb(0 0 0 / 0.05)";
const SHADOW_LG = "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)";

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
          borderRadius: 8, // radius base
          borderRadiusSM: 4, // radius sm (checkboxes, petits éléments)
          borderRadiusLG: 8, // le DS n'a qu'un seul rayon de base
          fontFamily: "'Inter', 'Cairo', system-ui, sans-serif",
          fontWeightStrong: 600, // headings semibold
          boxShadow: SHADOW_XS,
          boxShadowSecondary: SHADOW_LG, // dropdowns / popovers
          motionDurationMid: "0.15s",
          motionDurationSlow: "0.2s",
        },
        components: {
          Menu: {
            itemBg: "transparent",
            itemSelectedBg: isDark ? "#333E4F" : "#F9FAFB", // neutral-secondary-strong / soft
            itemSelectedColor: isDark ? "#BEDBFF" : "#193CB8", // fg-brand-strong
            itemHoverBg: isDark ? "#1E2939" : "#F9FAFB", // neutral-secondary-medium
            groupTitleColor: palette.colorTextTertiary,
            groupTitleFontSize: 11,
          },
          Table: {
            headerBg: isDark ? "#101828" : "#F9FAFB", // neutral-secondary-soft
            headerColor: palette.colorTextSecondary,
            rowHoverBg: isDark ? "#101828" : "#F9FAFB",
            cellPaddingInline: 24,
            cellPaddingBlock: 16,
          },
          Card: {
            boxShadow: SHADOW_XS,
          },
          Input: {
            colorBgContainer: isDark ? "#1E2939" : "#F9FAFB", // neutral-secondary-medium
          },
          Select: {
            colorBgContainer: isDark ? "#1E2939" : "#F9FAFB",
          },
          InputNumber: {
            colorBgContainer: isDark ? "#1E2939" : "#F9FAFB",
          },
          Button: {
            primaryShadow: "none",
            fontWeight: 500,
          },
          Layout: {
            siderBg: palette.colorBgContainer,
            headerBg: palette.colorBgContainer,
            bodyBg: palette.colorBgLayout,
          },
          Modal: {
            boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)", // shadow-xl
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
