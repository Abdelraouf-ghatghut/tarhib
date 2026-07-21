import { MigrationInterface, QueryRunner } from 'typeorm';

export class FinancePayrollPeriod1782500520000 implements MigrationInterface {
  name = 'FinancePayrollPeriod1782500520000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS hire_date DATE
    `);
    await queryRunner.query(`
      ALTER TABLE finance_expenses ADD COLUMN IF NOT EXISTS payroll_period VARCHAR(7)
    `);

    // Backfill : les lignes SALARIES existantes (une par employé, créées au
    // tour précédent) deviennent la ligne du mois de leur expense_date.
    await queryRunner.query(`
      UPDATE finance_expenses SET payroll_period = to_char(expense_date, 'YYYY-MM')
        WHERE category = 'SALARIES' AND employee_id IS NOT NULL AND payroll_period IS NULL
    `);

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_finance_expenses_employee_salary`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_expenses_employee_payroll_period
        ON finance_expenses(employee_id, payroll_period) WHERE employee_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_finance_expenses_employee_payroll_period`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_expenses_employee_salary
        ON finance_expenses(employee_id) WHERE employee_id IS NOT NULL
    `);
    await queryRunner.query(
      `ALTER TABLE finance_expenses DROP COLUMN IF EXISTS payroll_period`,
    );
    await queryRunner.query(
      `ALTER TABLE employees DROP COLUMN IF EXISTS hire_date`,
    );
  }
}
