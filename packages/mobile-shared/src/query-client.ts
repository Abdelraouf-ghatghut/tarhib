import { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { focusManager, QueryClient } from "@tanstack/react-query";

/** Politique commune : lectures rejouées seulement sur erreurs transitoires,
 * mutations jamais rejouées automatiquement (évite les doubles écritures). */
export function createMobileQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          const status = (error as { response?: { status?: number } })?.response?.status;
          if (status && status >= 400 && status < 500 && status !== 408 && status !== 429)
            return false;
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
        refetchOnReconnect: true,
      },
      mutations: { retry: false },
    },
  });
}

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
