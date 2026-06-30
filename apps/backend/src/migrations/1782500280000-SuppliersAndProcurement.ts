import { MigrationInterface, QueryRunner } from 'typeorm';

export class SuppliersAndProcurement1782500280000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Coût interne produit (jamais exposé côté catalogue employé)
    await queryRunner.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10, 2)
    `);

    // Fournisseurs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id   UUID NOT NULL,
        name_ar      VARCHAR(255) NOT NULL,
        name_en      VARCHAR(255) NOT NULL,
        contact_name VARCHAR(255),
        email        VARCHAR(255),
        phone        VARCHAR(50),
        address      TEXT,
        active       BOOLEAN NOT NULL DEFAULT true,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_suppliers_company
        ON suppliers(company_id)
    `);

    // Bons de commande fournisseur
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id  UUID NOT NULL,
        branch_id   UUID NOT NULL,
        supplier_id UUID NOT NULL REFERENCES suppliers(id),
        status      VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
                      CHECK (status IN ('DRAFT','SENT','PARTIALLY_RECEIVED','RECEIVED','CANCELLED')),
        notes       TEXT,
        created_by  UUID NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_po_company_branch
        ON purchase_orders(company_id, branch_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_po_status
        ON purchase_orders(status)
    `);

    // Lignes du bon de commande
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchase_order_lines (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        product_id        UUID NOT NULL REFERENCES products(id),
        ordered_qty       INT NOT NULL DEFAULT 1,
        received_qty      INT NOT NULL DEFAULT 0,
        unit_cost         DECIMAL(10, 2),
        notes             TEXT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pol_order
        ON purchase_order_lines(purchase_order_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS purchase_order_lines`);
    await queryRunner.query(`DROP TABLE IF EXISTS purchase_orders`);
    await queryRunner.query(`DROP TABLE IF EXISTS suppliers`);
    await queryRunner.query(`
      ALTER TABLE products DROP COLUMN IF EXISTS unit_cost
    `);
  }
}
