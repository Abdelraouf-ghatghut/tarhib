import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * inventory_transfers avait confirmed_by/confirmed_at mais rien pour
 * l'annulation — la page transferts affiche désormais un historique de
 * statut (qui a annulé, quand), il faut donc tracer cette transition
 * comme confirm() le fait déjà.
 */
export class InventoryTransferCancelledTracking1782500355000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE inventory_transfers
        ADD COLUMN cancelled_by VARCHAR NULL,
        ADD COLUMN cancelled_at TIMESTAMPTZ NULL
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE inventory_transfers
        DROP COLUMN cancelled_by,
        DROP COLUMN cancelled_at
    `);
  }
}
