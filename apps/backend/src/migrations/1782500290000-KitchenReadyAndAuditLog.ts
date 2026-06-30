import { MigrationInterface, QueryRunner } from 'typeorm';

export class KitchenReadyAndAuditLog1782500290000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    // 1 — Étendre les valeurs autorisées du statut commande avec READY
    await qr.query(`
      ALTER TABLE orders
        DROP CONSTRAINT IF EXISTS orders_status_check
    `);
    await qr.query(`
      ALTER TABLE orders
        ADD CONSTRAINT orders_status_check
        CHECK (status IN ('PENDING','APPROVED','IN_PROGRESS','READY','DELIVERED','REJECTED'))
    `);

    // 2 — Table des logs d'audit
    await qr.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     VARCHAR(255) NOT NULL,
        user_email  VARCHAR(255),
        action      VARCHAR(100) NOT NULL,
        entity      VARCHAR(100) NOT NULL,
        entity_id   VARCHAR(255),
        metadata    JSONB,
        ip_address  VARCHAR(45),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await qr.query(
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id)`,
    );
    await qr.query(
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity)`,
    );
    await qr.query(
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC)`,
    );
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS audit_logs`);
    await qr.query(`
      ALTER TABLE orders
        DROP CONSTRAINT IF EXISTS orders_status_check
    `);
    await qr.query(`
      ALTER TABLE orders
        ADD CONSTRAINT orders_status_check
        CHECK (status IN ('PENDING','APPROVED','IN_PROGRESS','DELIVERED','REJECTED'))
    `);
  }
}
