import { MigrationInterface, QueryRunner } from 'typeorm';

/** Index manquants sur les colonnes filtrées par HrService (employee_id,
 * status) — voir apps/backend/src/hr/hr.service.ts. Sans ça, findAllLeaveRequests/
 * findAllContracts/findAllReviews font un seq scan dès que la table grossit. */
export class HrIndexes1782500900000 implements MigrationInterface {
  name = 'HrIndexes1782500900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_contracts_employee ON employment_contracts(employee_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_reviews_employee ON performance_reviews(employee_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reviews_employee`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_contracts_employee`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_leave_requests_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_leave_requests_employee`);
  }
}
