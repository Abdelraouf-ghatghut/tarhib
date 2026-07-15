import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductFavorites1782500400000 implements MigrationInterface {
  name = 'ProductFavorites1782500400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_favorites (
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT pk_product_favorites PRIMARY KEY (employee_id, product_id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_product_favorites_employee ON product_favorites(employee_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_product_favorites_product ON product_favorites(product_id)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS product_favorites`);
  }
}
