export interface DeltaInfo {
  text: string;
  up: boolean;
  favorable: boolean;
}

/**
 * Comparaison fonctionnelle même sans historique : période précédente vide
 * → variation absolue (+N) ; sinon pourcentage signé.
 */
export function deltaInfo(
  cur: number | undefined,
  prev: number | undefined,
  options: { lowerIsBetter?: boolean } = {},
): DeltaInfo | null {
  if (cur === undefined || prev === undefined) return null;
  const result = (text: string, up: boolean): DeltaInfo => ({
    text,
    up,
    favorable: options.lowerIsBetter ? !up : up,
  });
  if (prev === 0 && cur === 0) return result("0%", true);
  if (prev === 0) return result(`+${cur}`, true);
  const pct = ((cur - prev) / prev) * 100;
  return result(`${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, pct >= 0);
}
