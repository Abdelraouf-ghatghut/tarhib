import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitProductsInventory1782500246482 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS products (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name_ar      VARCHAR(255) NOT NULL,
        name_en      VARCHAR(255) NOT NULL,
        category     VARCHAR(100) NOT NULL,
        type         VARCHAR(50)  NOT NULL
                       CHECK (type IN ('COMMANDABLE', 'LIBRE_SERVICE_VIP')),
        allowed_roles TEXT,
        image_url    TEXT,
        active       BOOLEAN NOT NULL DEFAULT true,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_products_type ON products(type)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_products_active ON products(active)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id    UUID NOT NULL,
        branch_id     UUID NOT NULL,
        product_id    UUID NOT NULL REFERENCES products(id),
        quantity      INT  NOT NULL DEFAULT 0,
        min_threshold INT  NOT NULL DEFAULT 0,
        max_threshold INT,
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (company_id, branch_id, product_id)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_inventory_branch ON inventory_items(company_id, branch_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS inventory_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS products`);
  }
}
