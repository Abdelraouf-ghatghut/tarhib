import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductSupplierPrices1782500320000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE product_supplier_prices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        unit_cost DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (product_id, supplier_id)
      )
    `);
    await qr.query(
      `CREATE INDEX idx_product_supplier_prices_product ON product_supplier_prices(product_id)`,
    );
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS product_supplier_prices`);
  }
}
