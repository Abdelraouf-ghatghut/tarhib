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
export interface StockAllocation {
  inventoryItemId: string;
  zone: string;
  quantity: number;
}

interface LockedItem {
  id: string;
  zone: string;
  quantity: number;
  reserved: number;
}

/**
 * Réserve `quantity` d'un produit à travers ses zones CUISINE puis BRANCHE
 * (mirroir de decrementForPreparation), dans la transaction de l'appelant.
 *
 * Verrou stable KITCHEN→BRANCH (E1) : lit les items sous FOR UPDATE, vérifie
 * l'available TOTAL, puis alloue cuisine d'abord, le déficit en branche. Aucune
 * écriture si l'available total est insuffisant (la ligne sera rejetée). Renvoie
 * les allocations à matérialiser en inventory_reservations (après le save order).
 *
 * DOIT tourner dans une transaction (le verrou FOR UPDATE doit tenir jusqu'au
 * commit pour sérialiser les réservations concurrentes du même produit).
 */
export async function reserveStockForProduct(
  manager: EntityManager,
  params: {
    productId: string;
    branchId: string;
    companyId: string;
    quantity: number;
  },
): Promise<{ ok: boolean; allocations: StockAllocation[] }> {
  const { productId, branchId, companyId, quantity } = params;
  const items = await manager.query<LockedItem[]>(
    `SELECT id, zone, quantity, reserved FROM inventory_items
       WHERE product_id = $1 AND branch_id = $2 AND company_id = $3
         AND zone IN ('KITCHEN', 'BRANCH')
       ORDER BY CASE zone WHEN 'KITCHEN' THEN 1 ELSE 2 END
       FOR UPDATE`,
    [productId, branchId, companyId],
  );

  const available = items.reduce(
    (sum, i) => sum + (Number(i.quantity) - Number(i.reserved)),
    0,
  );
  if (available < quantity) return { ok: false, allocations: [] };

  let remaining = quantity;
  const allocations: StockAllocation[] = [];
  for (const item of items) {
    if (remaining <= 0) break;
    const itemAvailable = Number(item.quantity) - Number(item.reserved);
    const alloc = Math.min(itemAvailable, remaining);
    if (alloc <= 0) continue;
    // Verrou déjà tenu (FOR UPDATE) → increment sûr, pas besoin de re-garde.
    await manager.query(
      `UPDATE inventory_items SET reserved = reserved + $2::int WHERE id = $1`,
      [item.id, alloc],
    );
    allocations.push({
      inventoryItemId: item.id,
      zone: item.zone,
      quantity: alloc,
    });
    remaining -= alloc;
  }
  return { ok: true, allocations };
}

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
