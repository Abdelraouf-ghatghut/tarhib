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
        token: {
          colorPrimary: "#0052CC",
          colorLink: "#0052CC",
          colorSuccess: "#36B37E",
          colorWarning: "#FF991F",
          colorError: "#FF4D4F",
          colorInfo: "#00A3BF",
          borderRadius: 8,
          borderRadiusLG: 12,
          fontFamily: "'Inter', 'Cairo', system-ui, sans-serif",
          colorBgContainer: "#FFFFFF",
          colorBgLayout: "#F8F9FC",
          colorText: "#172B4D",
          colorTextSecondary: "#6B778C",
          colorBorder: "#EBECF0",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          boxShadowSecondary: "0 4px 16px rgba(0,0,0,0.1)",
          colorBgElevated: "#FFFFFF",
        },
        components: {
          Menu: {
            itemBg: "transparent",
            itemSelectedBg: "rgba(0, 82, 204, 0.08)",
            itemSelectedColor: "#0052CC",
            itemHoverBg: "rgba(0, 82, 204, 0.04)",
            groupTitleColor: "#6B778C",
            groupTitleFontSize: 11,
          },
          Table: {
            rowHoverBg: "#F8F9FC",
          },
          Card: {
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          },
          Button: {
            primaryShadow: "none",
          },
          Layout: {
            siderBg: "#FFFFFF",
            headerBg: "#FFFFFF",
            bodyBg: "#F8F9FC",
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
