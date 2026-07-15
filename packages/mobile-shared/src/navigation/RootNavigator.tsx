import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useEffect } from "react";

import { LoginScreen } from "../AuthScreens";
import { authApi } from "../api/auth";
import { SplashScreen } from "../screens/SplashScreen";
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

  useEffect(() => {
    void restoreSession(appMode);
    // Only ever needs to run once, at mount — restoreSession is stable (Zustand action).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isBooting) {
    return (
      <SplashScreen theme={theme} label={appMode === "employee" ? "Tarhib" : "Tarhib Operations"} />
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main">{renderMain}</Stack.Screen>
        ) : (
          <Stack.Screen name="Login">
            {() => (
              <LoginScreen
                lang={lang}
                theme={theme}
                onLogin={(email, password) => login(appMode, email, password)}
                onRequestOtp={(phoneNumber, channel) =>
                  authApi.requestOtp(phoneNumber, channel, appMode).then(() => undefined)
                }
                onOtpLogin={(phoneNumber, code) => loginWithOtp(appMode, phoneNumber, code)}
              />
            )}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
