import type { EntityManager } from 'typeorm';

/**
 * Réservation de stock atomique (D1=B, PR-0.2).
 *
 * Incrémente `inventory_items.reserved` UNIQUEMENT si l'available
 * (quantity - reserved) le permet — en une seule instruction, donc sans
 * sur-réservation sous concurrence : le verrou de ligne sérialise les
 * réservations concurrentes sur le même item, et la garde `quantity - reserved
 * >= qty` maintient l'invariant `reserved <= quantity`.
 *
 * true = réservé ; false = available insuffisant (aucune écriture).
 */
export async function reserveInventoryAtomic(
  manager: EntityManager,
  inventoryItemId: string,
  quantity: number,
): Promise<boolean> {
  // TypeORM renvoie [rows, affectedCount] pour un UPDATE ... RETURNING
  // (contrairement à un INSERT qui renvoie directement les rows) → on se fie au
  // nombre de lignes affectées : 1 = réservé, 0 = available insuffisant.
  const result = await manager.query<[unknown[], number]>(
    `UPDATE inventory_items
       SET reserved = reserved + $2::int
     WHERE id = $1 AND quantity - reserved >= $2::int
     RETURNING reserved`,
    [inventoryItemId, quantity],
  );
  return result[1] > 0;
}
