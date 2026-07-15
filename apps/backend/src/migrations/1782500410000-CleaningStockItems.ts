import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleaningStockItems1782500410000 implements MigrationInterface {
  name = 'CleaningStockItems1782500410000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cleaning_stock_items (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id            UUID NOT NULL REFERENCES companies(id),
        branch_id             UUID NOT NULL REFERENCES branches(id),
        cleaning_product_id   UUID NOT NULL REFERENCES cleaning_products(id),
        quantity              INT NOT NULL DEFAULT 0,
        min_threshold         INT NOT NULL DEFAULT 0,
        max_threshold         INT,
        location_name         VARCHAR,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_cleaning_stock_items_company_branch ON cleaning_stock_items(company_id, branch_id)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS cleaning_stock_items`);
  }
}
