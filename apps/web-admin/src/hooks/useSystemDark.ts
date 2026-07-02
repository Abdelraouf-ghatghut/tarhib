import { useEffect, useState } from "react";

/**
 * Suit prefers-color-scheme afin d'aligner l'algorithme de thème antd sur les
 * tokens CSS (tokens.css), qui résolvent déjà automatiquement en light/dark.
 */
export function useSystemDark(): boolean {
  const [isDark, setIsDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isDark;
}
