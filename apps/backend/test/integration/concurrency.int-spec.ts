import { DataSource } from 'typeorm';
import {
  closeTestDataSource,
  count,
  getTestDataSource,
  runConcurrently,
  truncate,
} from './harness';
import { consumeQuotaAtomic } from '../../src/quotas/quota-consumption';

/**
 * Tests d'intégrité/concurrence sur un VRAI PostgreSQL.
 *
 * P01/P02 (quota) : CORRIGÉS par PR-0.2 — ils appellent le vrai
 * `consumeQuotaAtomic` et sont des `it` verts (garantie actée).
 *
 * P03/P06 : baseline encore `it.failing` — reproduisent le bug du code actuel
 * (rebranchés sur le vrai service quand PR-0.3 / la contrainte EXCLUDE de PR-0.1
 * les corrigent ; `it.failing` bascule alors et signale le flip vers `it`).
 *
 * Reproductions déterministes (barrière/deux phases) pour éviter le flaky.
 */

describe('Concurrence — intégrité commandes/stock/quotas (baseline rouge)', () => {
  let ds: DataSource;

  beforeAll(async () => {
    ds = await getTestDataSource();
  });
  afterAll(async () => {
    await closeTestDataSource();
  });

  async function seedCompany(tag: string): Promise<string> {
    const [row] = await ds.query<Array<{ id: string }>>(
      `INSERT INTO companies (name, slug, name_ar, name_en)
       VALUES ($1, $2, $1, $1) RETURNING id`,
      [`co-${tag}`, `co-${tag}`],
    );
    return row.id;
  }
  async function seedProduct(): Promise<string> {
    const [row] = await ds.query<Array<{ id: string }>>(
      `INSERT INTO products (name_ar, name_en, category, type)
       VALUES ('p', 'p', 'cat', 'COMMANDABLE') RETURNING id`,
    );
    return row.id;
  }

  // ── P01 — consumeQuotaAtomic additionne (corrige l'écrasement orUpdate).
  // 4 puis 3 unités → used = 7 (au lieu de 3 avant correction).
  it("P01 — la consommation de quota s'additionne (corrigé)", async () => {
    await truncate(ds, ['employee_quota_usage', 'products', 'companies']);
    const companyId = await seedCompany('p01');
    const productId = await seedProduct();
    const employeeId = '11111111-1111-1111-1111-111111111111';
    const base = {
      employeeId,
      productId,
      companyId,
      periodStart: '2020-01-01',
      periodEnd: '2999-12-31',
      maxQuantity: 10,
    };

    expect(await consumeQuotaAtomic(ds.manager, { ...base, quantity: 4 })).toBe(
      true,
    );
    expect(await consumeQuotaAtomic(ds.manager, { ...base, quantity: 3 })).toBe(
      true,
    );

    const used = await count(
      ds,
      `SELECT used_quantity FROM employee_quota_usage WHERE employee_id = $1`,
      [employeeId],
    );
    expect(used).toBe(7);
  });

  // ── P02 — consumeQuotaAtomic garde le max dans UNE instruction (corrige le
  // check-then-write). Quota=1, 20 appels concurrents → exactement 1 consommé.
  it("P02 — un quota de 1 n'approuve qu'UNE commande sous concurrence (corrigé)", async () => {
    await truncate(ds, ['employee_quota_usage', 'products', 'companies']);
    const companyId = await seedCompany('p02');
    const productId = await seedProduct();
    const employeeId = '22222222-2222-2222-2222-222222222222';
    const base = {
      employeeId,
      productId,
      companyId,
      periodStart: '2020-01-01',
      periodEnd: '2999-12-31',
      quantity: 1,
      maxQuantity: 1,
    };

    const results = await runConcurrently(20, () =>
      consumeQuotaAtomic(ds.manager, base),
    );

    const approvals = results.filter((r) => r.ok && r.value === true).length;
    const used = await count(
      ds,
      `SELECT used_quantity FROM employee_quota_usage WHERE employee_id = $1`,
      [employeeId],
    );
    expect(approvals).toBe(1);
    expect(used).toBe(1);
  });

  // ── P03 — orders.service.ts:453 : updateStatus lit la commande SANS verrou,
  // et la décrémentation de stock est une transaction séparée → deux « démarrer »
  // concurrents passent tous deux le gate APPROVED et décrémentent deux fois.
  it.failing(
    "P03 — démarrer deux fois la même commande ne doit décrémenter le stock qu'une fois",
    async () => {
      await truncate(ds, [
        'orders',
        'inventory_items',
        'products',
        'companies',
      ]);
      const companyId = await seedCompany('p03');
      const productId = await seedProduct();
      const branchId = '33333333-3333-3333-3333-333333333333';
      const [order] = await ds.query<Array<{ id: string }>>(
        `INSERT INTO orders (employee_id, branch_id, company_id, status, priority, sla_deadline)
       VALUES ($1, $2, $3, 'APPROVED', 'P5', NOW() + INTERVAL '1 hour') RETURNING id`,
        ['44444444-4444-4444-4444-444444444444', branchId, companyId],
      );
      await ds.query(
        `INSERT INTO inventory_items (company_id, branch_id, product_id, zone, quantity)
       VALUES ($1, $2, $3, 'BRANCH', 2)`,
        [companyId, branchId, productId],
      );

      await runConcurrently(2, async () => {
        const runner = ds.createQueryRunner();
        await runner.connect();
        await runner.startTransaction();
        try {
          const rows = (await runner.query(
            `SELECT status FROM orders WHERE id = $1`,
            [order.id],
          )) as unknown as Array<{ status: string }>;
          if (rows[0].status === 'APPROVED') {
            await runner.query(
              `UPDATE inventory_items SET quantity = quantity - 1
               WHERE product_id = $1 AND branch_id = $2 AND zone = 'BRANCH' AND quantity >= 1`,
              [productId, branchId],
            );
            await runner.query(
              `UPDATE orders SET status = 'IN_PROGRESS' WHERE id = $1`,
              [order.id],
            );
          }
          await runner.commitTransaction();
        } catch (e) {
          await runner.rollbackTransaction();
          throw e;
        } finally {
          await runner.release();
        }
      });

      const qty = await count(
        ds,
        `SELECT quantity FROM inventory_items WHERE product_id = $1 AND branch_id = $2`,
        [productId, branchId],
      );
      expect(qty).toBe(1); // ROUGE : vaut 0 (décrémenté deux fois pour une commande)
    },
  );

  // ── P06 — CORRIGÉ par la contrainte EXCLUDE de PR-0.1 : la 2e insertion
  // chevauchante est rejetée par la base → une seule réservation CONFIRMED.
  it('P06 — deux réservations chevauchantes de la même salle : une seule réussit (corrigé)', async () => {
    await truncate(ds, ['room_bookings', 'meeting_rooms', 'companies']);
    const companyId = await seedCompany('p06');
    const [room] = await ds.query<Array<{ id: string }>>(
      `INSERT INTO meeting_rooms (branch_id, company_id, name_ar, name_en)
       VALUES ($1, $2, 'r', 'r') RETURNING id`,
      ['55555555-5555-5555-5555-555555555555', companyId],
    );
    const start = "'2026-09-01T10:00:00Z'";
    const end = "'2026-09-01T11:00:00Z'";

    await runConcurrently(2, async (i) => {
      const runner = ds.createQueryRunner();
      await runner.connect();
      await runner.startTransaction();
      try {
        const conflict = await runner.query<unknown[]>(
          `SELECT 1 FROM room_bookings
             WHERE room_id = $1 AND status = 'CONFIRMED'
               AND start_time < ${end} AND end_time > ${start}`,
          [room.id],
        );
        if (conflict.length === 0) {
          await runner.query(
            `INSERT INTO room_bookings (room_id, employee_id, company_id, start_time, end_time, status)
             VALUES ($1, $2, $3, ${start}, ${end}, 'CONFIRMED')`,
            [room.id, `66666666-6666-6666-6666-66666666666${i}`, companyId],
          );
        }
        await runner.commitTransaction();
      } catch (e) {
        await runner.rollbackTransaction();
        throw e;
      } finally {
        await runner.release();
      }
    });

    const confirmed = await count(
      ds,
      `SELECT COUNT(*) FROM room_bookings WHERE room_id = $1 AND status = 'CONFIRMED'`,
      [room.id],
    );
    expect(confirmed).toBe(1); // contrainte EXCLUDE : la 2e est rejetée
  });

  // Nécessitent le schéma de PR-0.1/0.1c (colonnes/tables pas encore créées) :
  it.todo(
    "P04 — deux POST idempotents (même clé) ne créent qu'une commande [PR-0.1/0.4]",
  );
  it.todo(
    'sur-réservation de stock impossible (reserved = SUM(HELD)) [PR-0.1c/0.2]',
  );
});
