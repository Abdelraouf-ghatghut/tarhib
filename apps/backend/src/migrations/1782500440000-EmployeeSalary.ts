import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmployeeSalary1782500440000 implements MigrationInterface {
  name = 'EmployeeSalary1782500440000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE employees
        ADD COLUMN IF NOT EXISTS salary DECIMAL(10, 2)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE employees
        DROP COLUMN IF EXISTS salary
    `);
  }
}
