import { MigrationInterface, QueryRunner } from 'typeorm';

export class FinanceExpenseEmployeeLink1782500515000 implements MigrationInterface {
  name = 'FinanceExpenseEmployeeLink1782500515000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Lien nominatif vers l'employé pour une dépense "salaire" — la
    // suppression de l'employé supprime sa ligne de salaire.
    await queryRunner.query(`
      ALTER TABLE finance_expenses
        ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id) ON DELETE CASCADE
    `);
    // Au plus une ligne "salaire" vivante par employé (upsert bidirectionnel
    // employee.salary <-> finance_expenses, jamais de doublon).
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_expenses_employee_salary
        ON finance_expenses(employee_id) WHERE employee_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_finance_expenses_employee_salary`,
    );
    await queryRunner.query(
      `ALTER TABLE finance_expenses DROP COLUMN IF EXISTS employee_id`,
    );
  }
}
