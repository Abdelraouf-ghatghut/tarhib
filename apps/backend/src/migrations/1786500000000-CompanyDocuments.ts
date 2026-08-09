import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompanyDocuments1786500000000 implements MigrationInterface {
  name = 'CompanyDocuments1786500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS company_documents (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        document_ref TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS company_documents`);
  }
}
