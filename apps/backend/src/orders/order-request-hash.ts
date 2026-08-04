import { createHash } from 'crypto';

/**
 * Empreinte canonique d'une intention de commande (D8, idempotence PR-0.4).
 *
 * Deux appels avec la MÊME clientRequestId doivent porter la MÊME empreinte
 * pour être considérés comme le même retry (sinon 409 — réutilisation de clé
 * avec un panier différent). Volontairement PAS d'employeeId/branche/société
 * dans l'empreinte (D8) : l'unicité (employeeId, clientRequestId) est déjà
 * portée par l'index DB ; l'empreinte identifie seulement le PANIER.
 */
export function computeOrderRequestHash(
  lines: Array<{ productId: string; quantity: number }>,
  note: string | null,
): string {
  const sorted = [...lines].sort((a, b) =>
    a.productId.localeCompare(b.productId),
  );
  const canonical = JSON.stringify({
    lines: sorted.map((l) => `${l.productId}:${l.quantity}`),
    note: note?.trim() || '',
  });
  return createHash('sha256').update(canonical).digest('hex');
}
