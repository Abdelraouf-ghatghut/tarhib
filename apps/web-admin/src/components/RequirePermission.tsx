import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/**
 * Garde de route : au-delà du masquage du menu (AdminLayout), certaines pages
 * exposent des données sensibles (stock, employés, rôles...) et ne doivent
 * pas être atteignables par URL directe sans la permission correspondante.
 * `anyOf` doit rester synchronisé avec la logique de navGroups d'AdminLayout.
 */
export function RequirePermission({ anyOf, children }: { anyOf: string[]; children: ReactNode }) {
  const { hasPermission } = useAuth();
  const allowed = anyOf.some((key) => hasPermission(key));
  return allowed ? <>{children}</> : <Navigate to="/" replace />;
}
