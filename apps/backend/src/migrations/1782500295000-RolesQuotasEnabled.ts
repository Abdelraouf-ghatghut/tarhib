import { MigrationInterface, QueryRunner } from 'typeorm';

export class RolesQuotasEnabled1782500295000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE roles
        ADD COLUMN IF NOT EXISTS quotas_enabled BOOLEAN NOT NULL DEFAULT false
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE roles DROP COLUMN IF EXISTS quotas_enabled`);
  }
}
