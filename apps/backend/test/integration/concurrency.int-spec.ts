import { DataSource } from 'typeorm';
import {
  closeTestDataSource,
  count,
  getTestDataSource,
  runConcurrently,
  truncate,
} from './harness';
import { consumeQuotaAtomic } from '../../src/quotas/quota-consumption';
import {
  consumeReservationsForOrder,
  releaseReservationsForOrder,
  reserveInventoryAtomic,
  reserveStockForProduct,
} from '../../src/inventory/stock-reservation';

/**
 * Tests d'intégrité/concurrence sur un VRAI PostgreSQL.
 *
 * P01/P02 (quota) : CORRIGÉS par PR-0.2 — appellent le vrai `consumeQuotaAtomic`.
 * P03 : CORRIGÉ par PR-0.3 — reproduit le motif verrou→consommation
 * d'orders.service.ts (SELECT...FOR UPDATE, sans jointure, puis
 * consumeReservationsForOrder dans la même transaction).
 * P06 : CORRIGÉ par la contrainte EXCLUDE de PR-0.1.
 * Tous des `it` verts (garanties actées, prouvées sur PostgreSQL réel).
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

  // ── P03 — CORRIGÉ (PR-0.3) : updateStatus verrouille la commande (FOR UPDATE,
  // sans jointure) et consomme les réservations DANS la même transaction. Deux
  // « démarrer » concurrents : le verrou sérialise, le perdant relit le nouveau
  // statut (IN_PROGRESS) sous le verrou et sort en no-op idempotent — reproduit
  // ici le motif exact d'orders.service.ts (lock → check statut → consume).
  it("P03 — démarrer deux fois la même commande ne consomme les réservations qu'une fois (corrigé)", async () => {
    await truncate(ds, [
      'inventory_reservations',
      'order_lines',
      'orders',
      'inventory_items',
      'products',
      'companies',
    ]);
    const { orderId, itemId } = await seedReservedOrder(
      'p03',
      '33333333-3333-3333-3333-333333333333',
    );

    const startAttempt = async () => {
      const runner = ds.createQueryRunner();
      await runner.connect();
      await runner.startTransaction();
      try {
        const rows = (await runner.query(
          `SELECT status FROM orders WHERE id = $1 FOR UPDATE`,
          [orderId],
        )) as unknown as Array<{ status: string }>;
        if (rows[0].status === 'APPROVED') {
          await consumeReservationsForOrder(runner.manager, orderId);
          await runner.query(
            `UPDATE orders SET status = 'IN_PROGRESS' WHERE id = $1`,
            [orderId],
          );
        }
        // sinon : déjà IN_PROGRESS sous le verrou → no-op idempotent.
        await runner.commitTransaction();
      } catch (e) {
        await runner.rollbackTransaction();
        throw e;
      } finally {
        await runner.release();
      }
    };

    await runConcurrently(20, startAttempt);

    const quantity = await count(
      ds,
      `SELECT quantity FROM inventory_items WHERE id = $1`,
      [itemId],
    );
    const reserved = await count(
      ds,
      `SELECT reserved FROM inventory_items WHERE id = $1`,
      [itemId],
    );
    const consumedCount = await count(
      ds,
      `SELECT COUNT(*) FROM inventory_reservations WHERE order_id = $1 AND status = 'CONSUMED'`,
      [orderId],
    );
    expect(quantity).toBe(2); // 5 - 3, UNE seule fois
    expect(reserved).toBe(0); // 3 - 3, UNE seule fois
    expect(consumedCount).toBe(1); // pas 20
  });

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

  // ── Sur-réservation — reserveInventoryAtomic (D1=B) garde l'available :
  // 20 réservations concurrentes de 1 sur un stock de 5 → exactement 5, et
  // `reserved` ne dépasse jamais `quantity`.
  it('sur-réservation de stock impossible (reserved <= quantity)', async () => {
    await truncate(ds, ['inventory_items', 'products', 'companies']);
    const companyId = await seedCompany('rsv');
    const productId = await seedProduct();
    const [item] = await ds.query<Array<{ id: string }>>(
      `INSERT INTO inventory_items (company_id, branch_id, product_id, zone, quantity, reserved)
       VALUES ($1, $2, $3, 'BRANCH', 5, 0) RETURNING id`,
      [companyId, '77777777-7777-7777-7777-777777777777', productId],
    );

    const results = await runConcurrently(20, () =>
      reserveInventoryAtomic(ds.manager, item.id, 1),
    );

    const reservedOk = results.filter((r) => r.ok && r.value === true).length;
    const reserved = await count(
      ds,
      `SELECT reserved FROM inventory_items WHERE id = $1`,
      [item.id],
    );
    const quantity = await count(
      ds,
      `SELECT quantity FROM inventory_items WHERE id = $1`,
      [item.id],
    );
    expect(reservedOk).toBe(5);
    expect(reserved).toBe(5);
    expect(reserved).toBeLessThanOrEqual(quantity);
  });

  // ── Allocation multi-zone : cuisine 3 + branche 4, réserver 5 → cuisine 3
  // (épuisée) + branche 2 (déficit).
  it("réservation multi-zone : cuisine d'abord, déficit en branche", async () => {
    await truncate(ds, ['inventory_items', 'products', 'companies']);
    const companyId = await seedCompany('mz');
    const productId = await seedProduct();
    const branchId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    await ds.query(
      `INSERT INTO inventory_items (company_id, branch_id, product_id, zone, quantity, reserved)
       VALUES ($1, $2, $3, 'KITCHEN', 3, 0), ($1, $2, $3, 'BRANCH', 4, 0)`,
      [companyId, branchId, productId],
    );

    const res = await ds.transaction((m) =>
      reserveStockForProduct(m, {
        productId,
        branchId,
        companyId,
        quantity: 5,
      }),
    );

    expect(res.ok).toBe(true);
    const kitchen = await count(
      ds,
      `SELECT reserved FROM inventory_items WHERE product_id = $1 AND zone = 'KITCHEN'`,
      [productId],
    );
    const branch = await count(
      ds,
      `SELECT reserved FROM inventory_items WHERE product_id = $1 AND zone = 'BRANCH'`,
      [productId],
    );
    expect(kitchen).toBe(3);
    expect(branch).toBe(2);
  });

  // ── Réservations multi-zone concurrentes : stock total 6 (cuisine 3 + branche
  // 3), 20 réservations de 1 → exactement 6, jamais de sur-réservation.
  it('réservations concurrentes multi-zone ne sur-réservent pas', async () => {
    await truncate(ds, ['inventory_items', 'products', 'companies']);
    const companyId = await seedCompany('mzc');
    const productId = await seedProduct();
    const branchId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    await ds.query(
      `INSERT INTO inventory_items (company_id, branch_id, product_id, zone, quantity, reserved)
       VALUES ($1, $2, $3, 'KITCHEN', 3, 0), ($1, $2, $3, 'BRANCH', 3, 0)`,
      [companyId, branchId, productId],
    );

    const results = await runConcurrently(20, () =>
      ds.transaction((m) =>
        reserveStockForProduct(m, {
          productId,
          branchId,
          companyId,
          quantity: 1,
        }),
      ),
    );

    const okCount = results.filter((r) => r.ok && r.value.ok === true).length;
    const totalReserved = await count(
      ds,
      `SELECT COALESCE(SUM(reserved), 0) FROM inventory_items WHERE product_id = $1`,
      [productId],
    );
    expect(okCount).toBe(6);
    expect(totalReserved).toBe(6);
  });

  // ── Cycle de vie des réservations : consommation à la préparation.
  async function seedReservedOrder(
    tag: string,
    branchId: string,
  ): Promise<{ orderId: string; itemId: string; productId: string }> {
    const companyId = await seedCompany(tag);
    const productId = await seedProduct();
    const [item] = await ds.query<Array<{ id: string }>>(
      `INSERT INTO inventory_items (company_id, branch_id, product_id, zone, quantity, reserved)
       VALUES ($1, $2, $3, 'BRANCH', 5, 3) RETURNING id`,
      [companyId, branchId, productId],
    );
    const [order] = await ds.query<Array<{ id: string }>>(
      `INSERT INTO orders (employee_id, branch_id, company_id, order_number, status, priority, sla_deadline)
       VALUES ($1, $2, $3, 1, 'APPROVED', 'P5', NOW() + INTERVAL '1 hour') RETURNING id`,
      ['dddddddd-dddd-dddd-dddd-dddddddddddd', branchId, companyId],
    );
    const [line] = await ds.query<Array<{ id: string }>>(
      `INSERT INTO order_lines (order_id, product_id, quantity) VALUES ($1, $2, 3) RETURNING id`,
      [order.id, productId],
    );
    await ds.query(
      `INSERT INTO inventory_reservations
         (order_id, order_line_id, inventory_item_id, ordered_product_id, stock_product_id, zone, quantity, status)
       VALUES ($1, $2, $3, $4, $4, 'BRANCH', 3, 'HELD')`,
      [order.id, line.id, item.id, productId],
    );
    return { orderId: order.id, itemId: item.id, productId };
  }

  it('consommation : quantity et reserved décrémentés, réservation CONSUMED', async () => {
    await truncate(ds, [
      'inventory_reservations',
      'order_lines',
      'orders',
      'inventory_items',
      'products',
      'companies',
    ]);
    const { orderId, itemId } = await seedReservedOrder(
      'cons',
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
    );

    await ds.transaction((m) => consumeReservationsForOrder(m, orderId));

    const quantity = await count(
      ds,
      `SELECT quantity FROM inventory_items WHERE id = $1`,
      [itemId],
    );
    const reserved = await count(
      ds,
      `SELECT reserved FROM inventory_items WHERE id = $1`,
      [itemId],
    );
    const consumedCount = await count(
      ds,
      `SELECT COUNT(*) FROM inventory_reservations WHERE order_id = $1 AND status = 'CONSUMED'`,
      [orderId],
    );
    expect(quantity).toBe(2); // 5 - 3
    expect(reserved).toBe(0); // 3 - 3
    expect(consumedCount).toBe(1);
  });

  it('release : reserved décrémenté, quantity inchangée, réservation RELEASED', async () => {
    await truncate(ds, [
      'inventory_reservations',
      'order_lines',
      'orders',
      'inventory_items',
      'products',
      'companies',
    ]);
    const { orderId, itemId } = await seedReservedOrder(
      'rel',
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    );

    await ds.transaction((m) => releaseReservationsForOrder(m, orderId));

    const quantity = await count(
      ds,
      `SELECT quantity FROM inventory_items WHERE id = $1`,
      [itemId],
    );
    const reserved = await count(
      ds,
      `SELECT reserved FROM inventory_items WHERE id = $1`,
      [itemId],
    );
    const releasedCount = await count(
      ds,
      `SELECT COUNT(*) FROM inventory_reservations WHERE order_id = $1 AND status = 'RELEASED'`,
      [orderId],
    );
    expect(quantity).toBe(5); // inchangée (rien consommé)
    expect(reserved).toBe(0); // 3 - 3
    expect(releasedCount).toBe(1);
  });

  // ── P04 — CORRIGÉ (PR-0.1 + PR-0.4) : l'index unique partiel
  // uq_orders_employee_client_request (employee_id, client_request_id) sur
  // lequel s'appuie OrdersService.create() (pre-check + catch de la course,
  // cf. orders.service.spec.ts) sérialise réellement les insertions
  // concurrentes — prouvé ici directement contre la contrainte, comme P06
  // pour EXCLUDE. order_number distinct par tentative (i+1) pour ne pas
  // percuter l'AUTRE contrainte unique (company_id, order_number).
  it("P04 — deux commandes concurrentes avec la même clé d'idempotence : une seule est créée", async () => {
    await truncate(ds, ['orders', 'companies']);
    const companyId = await seedCompany('p04');
    const employeeId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    const clientRequestId = 'abcdefab-abcd-abcd-abcd-abcdefabcdef';

    const attempt = (i: number) =>
      ds
        .query(
          `INSERT INTO orders
             (employee_id, branch_id, company_id, order_number, status,
              priority, sla_deadline, client_request_id, client_request_hash)
           VALUES ($1, $2, $3, $4, 'APPROVED', 'P5', NOW() + INTERVAL '1 hour', $5, 'hash')`,
          [
            employeeId,
            '12121212-1212-1212-1212-121212121212',
            companyId,
            i + 1,
            clientRequestId,
          ],
        )
        .then(() => true)
        .catch(() => false);

    const results = await runConcurrently(20, attempt);

    const succeeded = results.filter((r) => r.ok && r.value === true).length;
    const rowsForKey = await count(
      ds,
      `SELECT COUNT(*) FROM orders WHERE employee_id = $1 AND client_request_id = $2`,
      [employeeId, clientRequestId],
    );
    expect(succeeded).toBe(1);
    expect(rowsForKey).toBe(1);
  });
});
