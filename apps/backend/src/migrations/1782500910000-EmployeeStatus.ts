import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmployeeStatus1782500910000 implements MigrationInterface {
  name = 'EmployeeStatus1782500910000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE employees
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'employees_status_check'
        ) THEN
          ALTER TABLE employees
          ADD CONSTRAINT employees_status_check
          CHECK (status IN ('ACTIVE', 'PENDING', 'INVITED'));
        END IF;
      END
      $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE employees
      DROP CONSTRAINT IF EXISTS employees_status_check
    `);

    await queryRunner.query(`
      ALTER TABLE employees
      DROP COLUMN IF EXISTS status
    `);
  }
}
