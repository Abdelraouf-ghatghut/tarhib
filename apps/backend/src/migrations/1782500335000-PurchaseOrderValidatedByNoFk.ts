import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `createdBy`/`validatedBy` sur PurchaseOrder stockent l'identité de
 * l'appelant (JwtPayload.sub = ID Keycloak, cf. JwtStrategy — convention déjà
 * utilisée pour `orders.employeeId`, `bookings.employeeId`, etc. dans tout le
 * code), PAS le employees.id. Une contrainte FK vers employees(id) rejetait
 * donc systématiquement l'écriture — colonne gardée en simple identifiant
 * opaque, cohérent avec createdBy.
 */
export class PurchaseOrderValidatedByNoFk1782500335000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE purchase_orders
        DROP CONSTRAINT IF EXISTS purchase_orders_validated_by_fkey
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE purchase_orders
        ADD CONSTRAINT purchase_orders_validated_by_fkey
        FOREIGN KEY (validated_by) REFERENCES employees(id) ON DELETE SET NULL
    `);
  }
}
