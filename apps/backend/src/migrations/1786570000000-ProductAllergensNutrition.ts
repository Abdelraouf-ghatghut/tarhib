import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductAllergensNutrition1786570000000 implements MigrationInterface {
  name = 'ProductAllergensNutrition1786570000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS allergens text`,
    );
    await queryRunner.query(
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS nutrition jsonb`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE products DROP COLUMN IF EXISTS nutrition`,
    );
    await queryRunner.query(
      `ALTER TABLE products DROP COLUMN IF EXISTS allergens`,
    );
  }
}
