import { isAxiosError } from "axios";
import type { TFunction } from "i18next";

// Anciens messages bruts encore renvoyés par certains endpoints (français/anglais
// non traduits côté backend) — mappés vers des clés i18n pour compat descendante.
const LEGACY_MESSAGE_KEYS: Record<string, string> = {
  "Email already registered": "errors.emailAlreadyRegistered",
  "Phone number already registered": "errors.phoneAlreadyRegistered",
  "System roles cannot be deleted": "errors.roleInUseCannotDelete",
  "fromZone et toZone doivent être différents": "errors.transferZonesMustDiffer",
};

/**
 * Extrait un message d'erreur lisible et localisé depuis une erreur API.
 * Le backend renvoie soit une clé machine courte (ex. "phoneAlreadyRegistered")
 * traduite via errors.<clé>, soit un message déjà humain (validation
 * class-validator, erreurs métier avec valeurs dynamiques) affiché tel quel.
 */
export function getErrorMessage(err: unknown, t: TFunction): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { message?: string | string[]; error?: string } | undefined;
    const raw = data?.message;
    const first = Array.isArray(raw) ? raw[0] : raw;
    if (first) {
      if (LEGACY_MESSAGE_KEYS[first]) return t(LEGACY_MESSAGE_KEYS[first]);
      // Clé machine = un seul mot camelCase sans espace ni ponctuation
      if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(first)) {
        return t(`errors.${first}`, { defaultValue: first });
      }
      return first;
    }
    if (!err.response) return t("errors.networkError");
  }
  return t("errorOccurred");
}
