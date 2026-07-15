import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { ar, en } from "../legacy-i18n";
import { applyLayoutDirection, type Lang } from "../theme";

// i18next partage le dictionnaire de legacy-i18n.ts (source unique).
// New screens should use useTranslation() / t('key') from this module
// once they are ported.
void i18n.use(initReactI18next).init({
  compatibilityJSON: "v4",
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: "ar",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function setAppLanguage(lang: Lang): void {
  void i18n.changeLanguage(lang);
  applyLayoutDirection(lang);
}

export default i18n;
