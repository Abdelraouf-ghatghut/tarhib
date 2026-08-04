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
