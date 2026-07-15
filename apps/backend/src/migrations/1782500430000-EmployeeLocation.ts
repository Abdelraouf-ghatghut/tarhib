import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmployeeLocation1782500430000 implements MigrationInterface {
  name = 'EmployeeLocation1782500430000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE employees
        ADD COLUMN IF NOT EXISTS floor VARCHAR(50),
        ADD COLUMN IF NOT EXISTS office_number VARCHAR(50)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE employees
        DROP COLUMN IF EXISTS floor,
        DROP COLUMN IF EXISTS office_number
    `);
  }
}
