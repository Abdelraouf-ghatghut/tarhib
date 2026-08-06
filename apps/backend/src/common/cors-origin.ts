/**
 * Liste blanche d'origines CORS, partagée entre l'API HTTP (main.ts) et le
 * gateway WebSocket (notifications.gateway.ts) — une seule définition pour ne
 * pas laisser les deux dériver l'une de l'autre.
 *
 * `CORS_ORIGIN` = liste séparée par des virgules ; tout `localhost:<port>`
 * est toujours autorisé (Flutter/Expo web en debug utilise un port aléatoire).
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  const corsOrigins = (
    process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://localhost:4173'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  return (
    !origin ||
    corsOrigins.includes(origin) ||
    /^https?:\/\/localhost:\d+$/.test(origin)
  );
}
