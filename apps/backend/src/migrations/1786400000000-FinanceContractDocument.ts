import { MigrationInterface, QueryRunner } from 'typeorm';

export class FinanceContractDocument1786400000000 implements MigrationInterface {
  name = 'FinanceContractDocument1786400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE finance_contracts ADD COLUMN IF NOT EXISTS document_ref TEXT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE finance_contracts DROP COLUMN IF EXISTS document_ref`,
    );
  }
}
