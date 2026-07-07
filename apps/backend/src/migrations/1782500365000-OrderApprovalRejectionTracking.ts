import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * orders traçait déjà prep_started_at/prepared_by, ready_at (sans acteur),
 * delivered_at/delivered_by — mais rien pour APPROVED/REJECTED, les deux
 * premières transitions du cycle. Le détail commande affiche désormais un
 * historique de statut complet (stepper) : il faut ces colonnes, plus
 * ready_by pour la symétrie avec les autres étapes.
 */
export class OrderApprovalRejectionTracking1782500365000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE orders
        ADD COLUMN approved_at TIMESTAMPTZ NULL,
        ADD COLUMN approved_by UUID NULL,
        ADD COLUMN rejected_at TIMESTAMPTZ NULL,
        ADD COLUMN rejected_by UUID NULL,
        ADD COLUMN ready_by UUID NULL
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE orders
        DROP COLUMN approved_at,
        DROP COLUMN approved_by,
        DROP COLUMN rejected_at,
        DROP COLUMN rejected_by,
        DROP COLUMN ready_by
    `);
  }
}
