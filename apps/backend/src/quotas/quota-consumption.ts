import type { EntityManager } from 'typeorm';

/**
 * Consommation atomique de quota (PR-0.2, corrige P01 + P02).
 *
 * Une seule instruction SQL = atomique : additionne la consommation (corrige
 * l'écrasement `orUpdate` — P01) ET n'autorise l'écriture que si le total reste
 * sous le max (corrige le check-then-write non atomique — P02). Sous concurrence,
 * l'INSERT ... ON CONFLICT sérialise sur l'index unique
 * (employee_id, product_id, company_id, period_start, period_end) : la 1re
 * insertion gagne, les suivantes réévaluent la garde sur la valeur committée.
 *
 * Retour : true = consommé (quota OK) ; false = quota dépassé (RETURNING vide),
 * SANS erreur SQL provoquée.
 */
export interface QuotaConsumeParams {
  employeeId: string;
  productId: string;
  companyId: string;
  periodStart: string; // 'YYYY-MM-DD'
  periodEnd: string; // 'YYYY-MM-DD'
  quantity: number;
  maxQuantity: number;
}

export async function consumeQuotaAtomic(
  manager: EntityManager,
  p: QuotaConsumeParams,
): Promise<boolean> {
  const rows = await manager.query<unknown[]>(
    `INSERT INTO employee_quota_usage
       (employee_id, product_id, company_id, period_start, period_end, used_quantity)
     SELECT $1, $2, $3, $4, $5, $6::int WHERE $6::int <= $7::int
     ON CONFLICT (employee_id, product_id, company_id, period_start, period_end)
     DO UPDATE SET used_quantity = employee_quota_usage.used_quantity + EXCLUDED.used_quantity
       WHERE employee_quota_usage.used_quantity + EXCLUDED.used_quantity <= $7::int
     RETURNING used_quantity`,
    [
      p.employeeId,
      p.productId,
      p.companyId,
      p.periodStart,
      p.periodEnd,
      p.quantity,
      p.maxQuantity,
    ],
  );
  return rows.length > 0;
}

interface ConsumedQuotaRow {
  id: string;
  employee_id: string;
  product_id: string;
  company_id: string;
  period_start: string;
  period_end: string;
  quantity: number;
}

/**
 * Restitution de quota (D12) — annulation/rejet AVANT préparation. Lit le
 * registre order_quota_consumptions (précis : quantité + période EXACTES
 * consommées à la création, pas un recalcul depuis order_lines qui ne
 * distinguerait pas "aucun quota au moment de la commande" de "consommé"),
 * décrémente employee_quota_usage en conséquence, marque RESTORED.
 *
 * Filtré sur status='CONSUMED' (idempotent — un second appel ne fait rien) ;
 * l'appelant est responsable de ne PAS invoquer cette fonction si la commande
 * a déjà atteint IN_PROGRESS (le quota reste consommé une fois la préparation
 * commencée, D12 : "non rendu si IN_PROGRESS+").
 */
export async function restoreQuotaConsumptionsForOrder(
  manager: EntityManager,
  orderId: string,
): Promise<void> {
  const consumed = await manager.query<ConsumedQuotaRow[]>(
    `SELECT id, employee_id, product_id, company_id, period_start, period_end, quantity
       FROM order_quota_consumptions
      WHERE order_id = $1 AND status = 'CONSUMED'
      FOR UPDATE`,
    [orderId],
  );
  for (const c of consumed) {
    // GREATEST(0, ...) : garde-fou, ne devrait jamais être nécessaire (la
    // ligne CONSUMED garantit qu'au moins `quantity` a été ajoutée un jour).
    await manager.query(
      `UPDATE employee_quota_usage
         SET used_quantity = GREATEST(0, used_quantity - $1::int)
       WHERE employee_id = $2 AND product_id = $3 AND company_id = $4
         AND period_start = $5 AND period_end = $6`,
      [
        c.quantity,
        c.employee_id,
        c.product_id,
        c.company_id,
        c.period_start,
        c.period_end,
      ],
    );
    await manager.query(
      `UPDATE order_quota_consumptions
         SET status = 'RESTORED', restored_at = now()
       WHERE id = $1`,
      [c.id],
    );
  }
}
