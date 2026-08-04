import { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { focusManager } from "@tanstack/react-query";

/**
 * TanStack Query ne connaît nativement que le focus du DOM (web) — sans ce
 * pont vers AppState, `refetchIntervalInBackground: false` (le défaut) n'a
 * aucun effet côté React Native : tout `refetchInterval` (file cuisine,
 * dashboard opérateur, etc. — 20-30s) continue de tourner écran éteint ou
 * app en arrière-plan, pour rien (PR-1.8). À appeler une fois au montage de
 * chaque app (Employee/Operations).
 */
export function useReactQueryAppStateFocus(): void {
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status: AppStateStatus) => {
      focusManager.setFocused(status === "active");
    });
    return () => subscription.remove();
  }, []);
}
