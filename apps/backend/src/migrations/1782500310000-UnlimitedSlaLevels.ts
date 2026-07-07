import { MigrationInterface, QueryRunner } from 'typeorm';

export class UnlimitedSlaLevels1782500310000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    // Codes SLA libres et illimités par entreprise (plus limités à P1..P5)
    await qr.query(
      `ALTER TABLE company_sla_levels ALTER COLUMN code TYPE VARCHAR(20)`,
    );
    await qr.query(
      `ALTER TABLE company_sla_levels ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0`,
    );
    await qr.query(
      `ALTER TABLE roles ALTER COLUMN sla_priority TYPE VARCHAR(20)`,
    );
    await qr.query(`ALTER TABLE orders ALTER COLUMN priority TYPE VARCHAR(20)`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE orders ALTER COLUMN priority TYPE VARCHAR(2)`);
    await qr.query(
      `ALTER TABLE roles ALTER COLUMN sla_priority TYPE VARCHAR(2)`,
    );
    await qr.query(
      `ALTER TABLE company_sla_levels DROP COLUMN IF EXISTS sort_order`,
    );
    await qr.query(
      `ALTER TABLE company_sla_levels ALTER COLUMN code TYPE VARCHAR(2)`,
    );
  }
}
