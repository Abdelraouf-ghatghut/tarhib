import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Horodatage + acteur de préparation/livraison sur les commandes — nécessaire
 * pour les rapports de performance agents et les temps moyens de
 * préparation/livraison (module KPI & Reporting). prepared_by/delivered_by
 * stockent l'identité Keycloak de l'appelant (JwtPayload.sub, cf.
 * orders.employeeId/createdBy ailleurs dans le code) : simple identifiant
 * opaque, pas de FK vers employees(id).
 */
export class OrderPrepDeliveryTracking1782500345000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE orders
        ADD COLUMN prep_started_at TIMESTAMPTZ NULL,
        ADD COLUMN prepared_by UUID NULL,
        ADD COLUMN ready_at TIMESTAMPTZ NULL,
        ADD COLUMN delivered_at TIMESTAMPTZ NULL,
        ADD COLUMN delivered_by UUID NULL
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE orders
        DROP COLUMN IF EXISTS prep_started_at,
        DROP COLUMN IF EXISTS prepared_by,
        DROP COLUMN IF EXISTS ready_at,
        DROP COLUMN IF EXISTS delivered_at,
        DROP COLUMN IF EXISTS delivered_by
    `);
  }
}
