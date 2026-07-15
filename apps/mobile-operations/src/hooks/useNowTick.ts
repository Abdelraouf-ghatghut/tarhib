import { useEffect, useState } from "react";

/**
 * Horloge locale qui force un re-render chaque `intervalMs` — utilisée pour
 * que les compteurs SLA (formatMinutesUntil) restent vivants à l'écran sans
 * dépendre uniquement du polling react-query (20-30s, trop lent pour un
 * compte à rebours perçu comme "temps réel").
 */
export function useNowTick(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
