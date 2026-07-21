export interface DeltaInfo {
  text: string;
  up: boolean;
}

/**
 * Comparaison fonctionnelle même sans historique : période précédente vide
 * → variation absolue (+N) ; sinon pourcentage signé.
 */
export function deltaInfo(cur: number | undefined, prev: number | undefined): DeltaInfo | null {
  if (cur === undefined || prev === undefined) return null;
  if (prev === 0 && cur === 0) return { text: "0%", up: true };
  if (prev === 0) return { text: `+${cur}`, up: true };
  const pct = ((cur - prev) / prev) * 100;
  return { text: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, up: pct >= 0 };
}
