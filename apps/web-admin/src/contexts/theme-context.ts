import { createContext } from "react";

export type ThemeMode = "light" | "dark";

export interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  toggle: () => void;
}

export const THEME_STORAGE_KEY = "tarhib_theme";

export const ThemeContext = createContext<ThemeState>({
  mode: "light",
  isDark: false,
  toggle: () => undefined,
});

/** Préférence stockée, sinon préférence système (premier lancement). */
export function resolveInitialTheme(): ThemeMode {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Applique le thème sur <html data-theme> — les tokens CSS suivent. */
export function applyTheme(mode: ThemeMode) {
  document.documentElement.dataset.theme = mode;
}
