import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * validated_by existait déjà mais sans validated_at — même lacune que
 * rejected_at, nécessaire pour que le stepper de statut affiche la bonne
 * date de validation plutôt que de retomber sur created_at.
 */
export class PurchaseOrderValidatedAt1782500375000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE purchase_orders ADD COLUMN validated_at TIMESTAMPTZ NULL
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE purchase_orders DROP COLUMN validated_at
    `);
  }
}
