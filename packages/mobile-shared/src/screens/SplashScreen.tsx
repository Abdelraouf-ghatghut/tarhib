import React from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { productFontFamily, spacing, type SnowTheme } from "../theme";

export const SplashScreen = ({ theme, label }: { theme: SnowTheme; label: string }) => (
  <View
    style={{
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.md,
      backgroundColor: theme.background,
    }}
  >
    <ActivityIndicator size="large" color={theme.primary} />
    <Text style={{ color: theme.muted, fontWeight: "500", fontFamily: productFontFamily }}>
      {label}
    </Text>
  </View>
);
