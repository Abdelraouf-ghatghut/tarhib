import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * La migration précédente (PurchaseOrderStatusTracking) a ajouté
 * rejected_by mais a oublié rejected_at — sans timestamp, le stepper de
 * statut ne peut pas afficher l'étape "Rejeté" comme atteinte.
 */
export class PurchaseOrderRejectedAt1782500370000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE purchase_orders ADD COLUMN rejected_at TIMESTAMPTZ NULL
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE purchase_orders DROP COLUMN rejected_at
    `);
  }
}
