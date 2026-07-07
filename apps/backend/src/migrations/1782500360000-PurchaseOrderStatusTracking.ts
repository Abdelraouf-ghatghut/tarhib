import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * purchase_orders n'avait que created_by/validated_by comme traçage
 * d'acteur — SENT/RECEIVED/CANCELLED/REJECTED (retour DRAFT) n'avaient
 * aucun acteur/date. Le détail d'un BdC affiche désormais un historique de
 * statut (stepper), il faut donc ces colonnes pour chaque transition.
 */
export class PurchaseOrderStatusTracking1782500360000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE purchase_orders
        ADD COLUMN rejected_by VARCHAR NULL,
        ADD COLUMN sent_by VARCHAR NULL,
        ADD COLUMN sent_at TIMESTAMPTZ NULL,
        ADD COLUMN received_by VARCHAR NULL,
        ADD COLUMN received_at TIMESTAMPTZ NULL,
        ADD COLUMN cancelled_by VARCHAR NULL,
        ADD COLUMN cancelled_at TIMESTAMPTZ NULL
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE purchase_orders
        DROP COLUMN rejected_by,
        DROP COLUMN sent_by,
        DROP COLUMN sent_at,
        DROP COLUMN received_by,
        DROP COLUMN received_at,
        DROP COLUMN cancelled_by,
        DROP COLUMN cancelled_at
    `);
  }
}
