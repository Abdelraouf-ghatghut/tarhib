import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductAllowedBranches1782500435000 implements MigrationInterface {
  name = 'ProductAllowedBranches1782500435000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS allowed_branches TEXT
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE products
        DROP COLUMN IF EXISTS allowed_branches
    `);
  }
}
