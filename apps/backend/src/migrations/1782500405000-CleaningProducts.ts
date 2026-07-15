import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleaningProducts1782500405000 implements MigrationInterface {
  name = 'CleaningProducts1782500405000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cleaning_products (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name_ar     VARCHAR NOT NULL,
        name_en     VARCHAR NOT NULL,
        category    VARCHAR(100) NOT NULL,
        unit        VARCHAR(20) NOT NULL,
        unit_cost   DECIMAL(10,2),
        image_url   TEXT,
        active      BOOLEAN NOT NULL DEFAULT true,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS cleaning_products`);
  }
}
