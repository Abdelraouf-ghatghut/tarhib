import { DataSource } from 'typeorm';
import {
  closeTestDataSource,
  count,
  getTestDataSource,
  runConcurrently,
  truncate,
} from './harness';

/**
 * Tests « rouges » PR-0.0 — reproduisent, contre un VRAI PostgreSQL, les bugs
 * de concurrence/intégrité du code ACTUEL (avant les correctifs Phase 0).
 *
 * Chaque test affirme le comportement CORRECT attendu, mais est déclaré en
 * `it.failing` : tant que le bug existe, le test échoue → `it.failing` PASSE
 * (CI verte, bug documenté et prouvé sur un vrai Postgres). Quand le correctif
 * (PR-0.2/0.3/0.1…) rend le comportement correct, le test réussit → `it.failing`
 * ÉCHOUE : c'est le signal pour retirer `.failing` et acter la garantie.
 *
 * Le SQL exécuté reproduit fidèlement le motif du code de production (référence
 * de fichier en commentaire au-dessus de chaque cas). Reproductions rendues
 * DÉTERMINISTES (barrière/deux phases) pour ne pas devenir des tests flaky.
 */

const PERIOD = ["'2020-01-01'", "'2999-12-31'"]; // fenêtre toujours active

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

  // ── P01 — orders.service.ts:661 : orUpdate(['used_quantity']) ÉCRASE ──────
  // Le ON CONFLICT DO UPDATE SET used_quantity = EXCLUDED.used_quantity remplace
  // au lieu d'additionner. 4 puis 3 unités → devrait donner 7, donne 3.
  it.failing(
    "P01 — la consommation de quota doit s'additionner (pas s'écraser)",
    async () => {
      await truncate(ds, ['employee_quota_usage', 'products', 'companies']);
      const companyId = await seedCompany('p01');
      const productId = await seedProduct();
      const employeeId = '11111111-1111-1111-1111-111111111111';

      const buggyUpsert = (qty: number) =>
        ds.query(
          `INSERT INTO employee_quota_usage
           (employee_id, product_id, company_id, period_start, period_end, used_quantity)
         VALUES ($1, $2, $3, ${PERIOD[0]}, ${PERIOD[1]}, $4)
         ON CONFLICT (employee_id, product_id, company_id, period_start, period_end)
         DO UPDATE SET used_quantity = EXCLUDED.used_quantity`,
          [employeeId, productId, companyId, qty],
        );

      await buggyUpsert(4);
      await buggyUpsert(3);

      const used = await count(
        ds,
        `SELECT used_quantity FROM employee_quota_usage WHERE employee_id = $1`,
        [employeeId],
      );
      expect(used).toBe(7); // ROUGE aujourd'hui : vaut 3 (écrasement)
    },
  );

  // ── P02 — orders.service.ts / quotas.service.ts : check-then-write NON atomique
  // Le snapshot du quota est lu hors transaction, l'incrément est séparé et sans
  // verrou → sous concurrence, plusieurs commandes passent le contrôle max.
  it.failing(
    "P02 — un quota de 1 ne doit approuver qu'UNE commande sous concurrence",
    async () => {
      await truncate(ds, ['employee_quota_usage', 'products', 'companies']);
      const companyId = await seedCompany('p02');
      const productId = await seedProduct();
      const employeeId = '22222222-2222-2222-2222-222222222222';
      const MAX = 1;
      await ds.query(
        `INSERT INTO employee_quota_usage
         (employee_id, product_id, company_id, period_start, period_end, used_quantity)
       VALUES ($1, $2, $3, ${PERIOD[0]}, ${PERIOD[1]}, 0)`,
        [employeeId, productId, companyId],
      );

      // Motif actuel : lire used (hors verrou) → décider → écrire, en 3 temps.
      // Reproduction DÉTERMINISTE du pire entrelacement : les 20 transactions
      // lisent toutes le snapshot AVANT que la moindre écriture n'ait lieu (ce
      // que la concurrence réelle produit), puis chacune décide et incrémente.
      const N = 20;
      const opened = await Promise.all(
        Array.from({ length: N }, async () => {
          const runner = ds.createQueryRunner();
          await runner.connect();
          await runner.startTransaction();
          const rows = (await runner.query(
            `SELECT used_quantity FROM employee_quota_usage
             WHERE employee_id = $1 AND product_id = $2 AND company_id = $3`,
            [employeeId, productId, companyId],
          )) as unknown as Array<{ used_quantity: number }>;
          return { runner, used: Number(rows[0].used_quantity) };
        }),
      );

      let approvals = 0;
      for (const { runner, used } of opened) {
        const approved = used + 1 <= MAX; // décision sur le snapshot lu (0)
        if (approved) {
          approvals += 1;
          await runner.query(
            `UPDATE employee_quota_usage SET used_quantity = used_quantity + 1
             WHERE employee_id = $1 AND product_id = $2 AND company_id = $3`,
            [employeeId, productId, companyId],
          );
        }
        await runner.commitTransaction();
        await runner.release();
      }

      const finalUsed = await count(
        ds,
        `SELECT used_quantity FROM employee_quota_usage WHERE employee_id = $1`,
        [employeeId],
      );
      expect(approvals).toBe(1); // ROUGE : plusieurs passent le contrôle
      expect(finalUsed).toBeLessThanOrEqual(MAX); // ROUGE : used dépasse le max
    },
  );

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

  // ── P06 — meeting-rooms.service.ts:135 : find-then-insert sans contrainte
  // d'exclusion → deux réservations chevauchantes concurrentes réussissent.
  it.failing(
    'P06 — deux réservations chevauchantes de la même salle : une seule doit réussir',
    async () => {
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
      expect(confirmed).toBe(1); // ROUGE : vaut 2 (double réservation)
    },
  );

  // Nécessitent le schéma de PR-0.1/0.1c (colonnes/tables pas encore créées) :
  it.todo(
    "P04 — deux POST idempotents (même clé) ne créent qu'une commande [PR-0.1/0.4]",
  );
  it.todo(
    'sur-réservation de stock impossible (reserved = SUM(HELD)) [PR-0.1c/0.2]',
  );
});
