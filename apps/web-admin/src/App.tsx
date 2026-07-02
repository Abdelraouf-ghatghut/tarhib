import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, App as AntApp } from "antd";
import { RouterProvider } from "react-router-dom";
import { useTranslation } from "react-i18next";
import arEG from "antd/locale/ar_EG";
import enUS from "antd/locale/en_US";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./contexts/AuthContext";
import { ScopeProvider } from "./contexts/ScopeContext";
import { router } from "./router";

function AppInner() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";

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
        // Palette du guide UI 2026 : une seule couleur principale (#2563EB),
        // fonds clairs, ombres discrètes, grille 8px
        token: {
          colorPrimary: "#2563EB",
          colorLink: "#2563EB",
          colorSuccess: "#22C55E",
          colorWarning: "#F59E0B",
          colorError: "#EF4444",
          colorInfo: "#2563EB",
          borderRadius: 8,
          borderRadiusLG: 12,
          fontFamily: "'Inter', 'Cairo', system-ui, sans-serif",
          colorBgContainer: "#FFFFFF",
          colorBgLayout: "#F8FAFC",
          colorText: "#0F172A",
          colorTextSecondary: "#64748B",
          colorBorder: "#E2E8F0",
          colorBorderSecondary: "#E2E8F0",
          boxShadow: "0 1px 2px rgba(15,23,42,0.06)",
          boxShadowSecondary: "0 4px 12px rgba(15,23,42,0.08)",
          colorBgElevated: "#FFFFFF",
          motionDurationMid: "0.18s",
          motionDurationSlow: "0.2s",
        },
        components: {
          Menu: {
            itemBg: "transparent",
            itemSelectedBg: "rgba(37, 99, 235, 0.08)",
            itemSelectedColor: "#2563EB",
            itemHoverBg: "rgba(37, 99, 235, 0.04)",
            groupTitleColor: "#64748B",
            groupTitleFontSize: 11,
          },
          Table: {
            rowHoverBg: "#F8FAFC",
            cellPaddingBlock: 16,
          },
          Card: {
            boxShadow: "0 1px 2px rgba(15,23,42,0.06)",
          },
          Button: {
            primaryShadow: "none",
          },
          Layout: {
            siderBg: "#FFFFFF",
            headerBg: "#FFFFFF",
            bodyBg: "#F8FAFC",
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
