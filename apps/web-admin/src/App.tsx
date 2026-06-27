import { QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, App as AntApp } from "antd";
import { RouterProvider } from "react-router-dom";
import { useTranslation } from "react-i18next";
import arEG from "antd/locale/ar_EG";
import enUS from "antd/locale/en_US";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./contexts/AuthContext";
import { router } from "./router";

function AppInner() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  return (
    <ConfigProvider
      direction={isAr ? "rtl" : "ltr"}
      locale={isAr ? arEG : enUS}
      theme={{
        token: {
          colorPrimary: "#1b5e20",
          borderRadius: 8,
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
        <AppInner />
      </AuthProvider>
    </QueryClientProvider>
  );
}
