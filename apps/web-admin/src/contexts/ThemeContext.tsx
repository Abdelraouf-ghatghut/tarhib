import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { THEME_STORAGE_KEY, ThemeContext, applyTheme, resolveInitialTheme } from "./theme-context";
import type { ThemeMode } from "./theme-context";

/**
 * Bascule light/dark manuelle (règle SnowUI §11) : même UI, deux ambiances.
 * Persistance localStorage, application instantanée via <html data-theme>,
 * défaut = préférence système au premier lancement.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const initial = resolveInitialTheme();
    applyTheme(initial);
    return initial;
  });

  const toggle = useCallback(() => {
    setMode((prev) => {
      const next: ThemeMode = prev === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_STORAGE_KEY, next);
      applyTheme(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ mode, isDark: mode === "dark", toggle }), [mode, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
