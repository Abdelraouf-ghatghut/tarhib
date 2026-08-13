import React, { useEffect, useMemo } from "react";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAvoidingView, Platform } from "react-native";
import {
  RootNavigator,
  createMobileQueryClient,
  makeTheme,
  registerPushToken,
  registerThmanyahFonts,
  useAppPreferences,
  useAuthStore,
  useReactQueryAppStateFocus,
} from "@tarhib/mobile-shared";

import { OperationsApp } from "./screens/OperationsApp";

registerThmanyahFonts();

const queryClient = createMobileQueryClient();
const PREFS_KEY = "tarhib_operations_preferences";

export default function App() {
  const { lang, setLang, themeMode, setThemeMode } = useAppPreferences(PREFS_KEY, "en");
  const logout = useAuthStore((s) => s.logout);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const theme = useMemo(() => makeTheme("operations", themeMode), [themeMode]);

  const toggleTheme = () => setThemeMode(themeMode === "light" ? "dark" : "light");
  const toggleLang = () => setLang(lang === "en" ? "ar" : "en");

  useReactQueryAppStateFocus();

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
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <RootNavigator
              appMode="operations"
              theme={theme}
              lang={lang}
              renderMain={() => (
                <OperationsApp
                  lang={lang}
                  theme={theme}
                  onLogout={() => void logout()}
                  onToggleTheme={toggleTheme}
                  onToggleLang={toggleLang}
                />
              )}
            />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
