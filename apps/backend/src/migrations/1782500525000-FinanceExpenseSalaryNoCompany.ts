import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Le site d'affectation d'un employé (companyId) est une mission, pas un
 * lien financier : le salaire d'un employé Tarhib ne dépend d'aucune société
 * cliente. Les lignes SALARIES existantes ont pu être créées avec un
 * companyId hérité de l'affectation de l'employé (bug corrigé côté service) —
 * ce backfill les remet à null.
 */
export class FinanceExpenseSalaryNoCompany1782500525000 implements MigrationInterface {
  name = 'FinanceExpenseSalaryNoCompany1782500525000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE finance_expenses SET company_id = NULL
        WHERE category = 'SALARIES' AND company_id IS NOT NULL
    `);
  }

  public async down(): Promise<void> {
    // Irréversible par nature (l'ancien companyId n'est pas conservé) — pas
    // de rollback de données, comme les autres migrations de backfill du repo.
  }
}
