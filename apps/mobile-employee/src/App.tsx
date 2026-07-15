import React, { useEffect, useMemo } from "react";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  RootNavigator,
  makeTheme,
  registerPushToken,
  registerThmanyahFonts,
  useAppPreferences,
  useAuthStore,
} from "@tarhib/mobile-shared";

import { EmployeeApp } from "./screens/EmployeeApp";

registerThmanyahFonts();

const queryClient = new QueryClient();
const PREFS_KEY = "tarhib_employee_preferences";

export default function App() {
  const { lang, setLang, themeMode, setThemeMode } = useAppPreferences(PREFS_KEY, "ar");
  const logout = useAuthStore((s) => s.logout);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const theme = useMemo(() => makeTheme("employee", themeMode), [themeMode]);

  useEffect(() => {
    if (isAuthenticated) void registerPushToken();
  }, [isAuthenticated]);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <SafeAreaView
          style={{ flex: 1, backgroundColor: theme.background }}
          edges={["top", "left", "right"]}
        >
          <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
          <RootNavigator
            appMode="employee"
            theme={theme}
            lang={lang}
            renderMain={() => (
              <EmployeeApp
                lang={lang}
                theme={theme}
                onLogout={() => void logout()}
                onSetTheme={setThemeMode}
                onSetLang={setLang}
              />
            )}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
