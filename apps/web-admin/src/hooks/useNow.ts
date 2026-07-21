import { useEffect, useState } from "react";

/**
 * Horloge partagée pour forcer le recalcul d'un compte à rebours (SLA) à
 * intervalle régulier, même sans nouvelle donnée serveur entre deux refetch.
 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
