import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

import { applyLayoutDirection, type Lang, type ThemeMode } from "../theme";

interface StoredPreferences {
  lang?: Lang;
  themeMode?: ThemeMode;
}

/**
 * Préférences persistées (langue + thème) communes aux deux apps mobiles.
 * La sauvegarde attend la fin du chargement initial pour ne pas écraser
 * les préférences stockées avec les valeurs par défaut.
 */
export function useAppPreferences(storageKey: string, defaultLang: Lang) {
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [lang, setLang] = useState<Lang>(defaultLang);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (!raw) return;
        const prefs = JSON.parse(raw) as StoredPreferences;
        if (prefs.lang === "ar" || prefs.lang === "en") setLang(prefs.lang);
        if (prefs.themeMode === "light" || prefs.themeMode === "dark") {
          setThemeMode(prefs.themeMode);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    void AsyncStorage.setItem(storageKey, JSON.stringify({ lang, themeMode }));
  }, [storageKey, lang, themeMode, loaded]);

  // Appliqué de façon synchrone (pas en effect) pour que le premier rendu et
  // chaque changement de langue voient déjà le bon dir : idempotent, et les
  // composants lisent isLayoutRtl()/directionalIcon() pendant le rendu.
  applyLayoutDirection(lang);

  return { lang, setLang, themeMode, setThemeMode };
}
