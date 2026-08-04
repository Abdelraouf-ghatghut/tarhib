import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * D13 — statut CANCELLED distinct de REJECTED.
 *
 * Annulation VOLONTAIRE par l'employé propriétaire (avant IN_PROGRESS), à
 * distinguer du rejet métier/stock/quota/opérationnel (REJECTED) pour le
 * reporting. Colonnes cancelled_at/cancelled_by dédiées plutôt que de
 * réutiliser rejected_at/rejected_by : sinon une requête `WHERE rejected_at
 * IS NOT NULL` inclurait à tort les annulations, ce qui viderait le sens
 * même de cette distinction.
 */
export class CancelledOrderStatus1782500700000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE orders
        DROP CONSTRAINT IF EXISTS orders_status_check
    `);
    await qr.query(`
      ALTER TABLE orders
        ADD CONSTRAINT orders_status_check
        CHECK (status IN ('PENDING','APPROVED','IN_PROGRESS','READY','DELIVERED','REJECTED','CANCELLED'))
    `);
    await qr.query(
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at timestamptz NULL`,
    );
    await qr.query(
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_by uuid NULL`,
    );
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE orders DROP COLUMN IF EXISTS cancelled_by`);
    await qr.query(`ALTER TABLE orders DROP COLUMN IF EXISTS cancelled_at`);
    await qr.query(`
      ALTER TABLE orders
        DROP CONSTRAINT IF EXISTS orders_status_check
    `);
    await qr.query(`
      ALTER TABLE orders
        ADD CONSTRAINT orders_status_check
        CHECK (status IN ('PENDING','APPROVED','IN_PROGRESS','READY','DELIVERED','REJECTED'))
    `);
  }
}
