import { MigrationInterface, QueryRunner } from 'typeorm';

export class FinancePeriodLock1782500530000 implements MigrationInterface {
  name = 'FinancePeriodLock1782500530000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS finance_periods (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        period VARCHAR(7) UNIQUE NOT NULL,
        status VARCHAR(10) NOT NULL DEFAULT 'OPEN',
        closed_at TIMESTAMPTZ,
        closed_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      ALTER TABLE finance_expenses
        ADD COLUMN IF NOT EXISTS reversal_of_id UUID REFERENCES finance_expenses(id)
    `);

    // Les lignes liées à une correction (reversal_of_id non nul) sont
    // exemptées de la contrainte "une ligne par (employé, mois)" — sinon la
    // ligne de remplacement datée du mois courant entrerait en conflit avec
    // une ligne déjà existante pour ce même mois courant.
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_finance_expenses_employee_payroll_period`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_expenses_employee_payroll_period
        ON finance_expenses(employee_id, payroll_period)
        WHERE employee_id IS NOT NULL AND reversal_of_id IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_finance_expenses_employee_payroll_period`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_expenses_employee_payroll_period
        ON finance_expenses(employee_id, payroll_period) WHERE employee_id IS NOT NULL
    `);
    await queryRunner.query(
      `ALTER TABLE finance_expenses DROP COLUMN IF EXISTS reversal_of_id`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS finance_periods`);
  }
}
