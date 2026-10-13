const UNITES_EN_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/** Convertit une durée style "15m", "7d" (format utilisé par @nestjs/jwt) en millisecondes. */
export function dureeEnMs(duree: string): number {
  const correspondance = /^(\d+)(s|m|h|d)$/.exec(duree.trim());
  if (!correspondance) {
    throw new Error(
      `Format de durée invalide: "${duree}" (attendu ex: "15m", "7d")`,
    );
  }
  const [, valeur, unite] = correspondance;
  return Number(valeur) * UNITES_EN_MS[unite];
}
