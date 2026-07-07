import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProcurementApprovalWorkflow1782500330000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    // Rôles de la chaîne d'achat, définis par branche : responsable stock
    // (crée la demande), validateur (approuve), responsable achats (achète
    // et livre à la branche). Tous optionnels — la notification associée
    // n'est envoyée que si le rôle est renseigné.
    await qr.query(`
      ALTER TABLE branches
        ADD COLUMN stock_responsible_id UUID NULL REFERENCES employees(id) ON DELETE SET NULL,
        ADD COLUMN order_validator_id UUID NULL REFERENCES employees(id) ON DELETE SET NULL,
        ADD COLUMN purchasing_manager_id UUID NULL REFERENCES employees(id) ON DELETE SET NULL
    `);

    await qr.query(`
      ALTER TABLE purchase_orders
        ADD COLUMN validated_by UUID NULL REFERENCES employees(id) ON DELETE SET NULL,
        ADD COLUMN rejection_reason TEXT NULL
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE branches
        DROP COLUMN IF EXISTS stock_responsible_id,
        DROP COLUMN IF EXISTS order_validator_id,
        DROP COLUMN IF EXISTS purchasing_manager_id
    `);
    await qr.query(`
      ALTER TABLE purchase_orders
        DROP COLUMN IF EXISTS validated_by,
        DROP COLUMN IF EXISTS rejection_reason
    `);
  }
}
