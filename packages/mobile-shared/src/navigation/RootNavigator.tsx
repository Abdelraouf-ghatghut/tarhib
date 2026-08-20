import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { AcceptInviteScreen, LoginScreen } from "../AuthScreens";
import { EmployeeRegistrationScreen } from "../EmployeeRegistrationScreen";
import { RequiredPasswordChangeScreen } from "../RequiredPasswordChangeScreen";
import { authApi } from "../api/auth";
import { SplashScreen } from "../screens/SplashScreen";
import { PrimaryButton } from "../components";
import { ReliabilityBanner, useConnectivityMonitor } from "../reliability";
import { useAuthStore } from "../store/auth-store";
import { type AppMode, type Lang, type SnowTheme } from "../theme";

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Top-level auth-gated navigation shared by both apps — mirrors go_router's
 * redirect logic (not logged in → auth stack; logged in → Main) without the
 * capability-based sub-routing yet (that lands screen-by-screen in R2+, once
 * Main stops being a single placeholder route).
 */
export function RootNavigator({
  appMode,
  theme,
  lang,
  renderMain,
}: {
  appMode: AppMode;
  theme: SnowTheme;
  lang: Lang;
  renderMain: () => React.ReactElement;
}) {
  const isBooting = useAuthStore((s) => s.isBooting);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const login = useAuthStore((s) => s.login);
  const loginWithOtp = useAuthStore((s) => s.loginWithOtp);
  const acceptInvite = useAuthStore((s) => s.acceptInvite);
  const logout = useAuthStore((s) => s.logout);
  const scope = useAuthStore((s) => s.scope);
  const employee = useAuthStore((s) => s.employee);
  const changePassword = useAuthStore((s) => s.changePassword);
  // Pas d'écran de stack dédié : juste un toggle local dans l'écran non
  // authentifié (login ↔ acceptation d'invitation), plus simple que de
  // plomber une route de navigation pour un aller-retour aussi ponctuel.
  const [authView, setAuthView] = useState<"login" | "acceptInvite" | "register">("login");

  useEffect(() => {
    void restoreSession(appMode);
    // Only ever needs to run once, at mount — restoreSession is stable (Zustand action).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useConnectivityMonitor();

  const appAllowed = !scope || (appMode === "employee" ? scope === "CLIENT" : scope === "TARHIB");

  if (isBooting) {
    return (
      <SplashScreen theme={theme} label={appMode === "employee" ? "Tarhib" : "Tarhib Operations"} />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ReliabilityBanner lang={lang} theme={theme} />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <Stack.Screen name="Main">
              {() =>
                appMode === "operations" && employee?.mustChangePassword ? (
                  <RequiredPasswordChangeScreen
                    theme={theme}
                    onSubmit={(currentPassword, newPassword) =>
                      changePassword(currentPassword, newPassword)
                    }
                  />
                ) : appAllowed ? (
                  renderMain()
                ) : (
                  <View
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 24,
                      gap: 16,
                      backgroundColor: theme.background,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.text,
                        fontSize: 20,
                        fontWeight: "800",
                        textAlign: "center",
                      }}
                    >
                      {lang === "ar"
                        ? "هذا الحساب غير مخصص لهذا التطبيق"
                        : "This account cannot use this application"}
                    </Text>
                    <Text style={{ color: theme.muted, fontSize: 15, textAlign: "center" }}>
                      {lang === "ar"
                        ? appMode === "employee"
                          ? "استخدم تطبيق عمليات ترحيب."
                          : "استخدم تطبيق موظفي الشركات."
                        : appMode === "employee"
                          ? "Use the Tarhib Operations app."
                          : "Use the company Employee app."}
                    </Text>
                    <PrimaryButton
                      label={lang === "ar" ? "تسجيل الخروج" : "Sign out"}
                      theme={theme}
                      onPress={() => void logout()}
                    />
                  </View>
                )
              }
            </Stack.Screen>
          ) : (
            <Stack.Screen name="Login">
              {() =>
                authView === "acceptInvite" ? (
                  <AcceptInviteScreen
                    lang={lang}
                    theme={theme}
                    onSubmit={(payload) => acceptInvite(appMode, payload)}
                    onBack={() => setAuthView("login")}
                  />
                ) : authView === "register" && appMode === "employee" ? (
                  <EmployeeRegistrationScreen
                    theme={theme}
                    onBack={() => setAuthView("login")}
                    onActivationRequired={() => setAuthView("acceptInvite")}
                  />
                ) : (
                  <LoginScreen
                    lang={lang}
                    theme={theme}
                    onLogin={(email, password) => login(appMode, email, password)}
                    onRequestOtp={(phoneNumber, channel) =>
                      authApi.requestOtp(phoneNumber, channel, appMode).then(() => undefined)
                    }
                    onOtpLogin={(phoneNumber, code) => loginWithOtp(appMode, phoneNumber, code)}
                    onHaveInviteCode={() => setAuthView("acceptInvite")}
                    onCreateAccount={
                      appMode === "employee" ? () => setAuthView("register") : undefined
                    }
                  />
                )
              }
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}
