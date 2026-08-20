import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompanySelfRegistration1786600000000 implements MigrationInterface {
  name = 'CompanySelfRegistration1786600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS registration_mode varchar(30) NOT NULL DEFAULT 'CLOSED'`,
    );
    await queryRunner.query(
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS registration_code_hash varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS registration_code_rotated_at timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS registration_code_expires_at timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE companies ADD CONSTRAINT chk_companies_registration_mode CHECK (registration_mode IN ('CLOSED', 'APPROVAL_REQUIRED', 'AUTO_APPROVED', 'INVITE_ONLY'))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_registration_code_hash ON companies(registration_code_hash) WHERE registration_code_hash IS NOT NULL`,
    );
    await queryRunner.query(`
      CREATE TABLE company_registration_options (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
        role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_company_registration_option UNIQUE (company_id, branch_id, department_id, role_id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_company_registration_options_company ON company_registration_options(company_id) WHERE active = true`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS company_registration_options`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS uq_companies_registration_code_hash`,
    );
    await queryRunner.query(
      `ALTER TABLE companies DROP CONSTRAINT IF EXISTS chk_companies_registration_mode`,
    );
    await queryRunner.query(
      `ALTER TABLE companies DROP COLUMN IF EXISTS registration_code_expires_at`,
    );
    await queryRunner.query(
      `ALTER TABLE companies DROP COLUMN IF EXISTS registration_code_rotated_at`,
    );
    await queryRunner.query(
      `ALTER TABLE companies DROP COLUMN IF EXISTS registration_code_hash`,
    );
    await queryRunner.query(
      `ALTER TABLE companies DROP COLUMN IF EXISTS registration_mode`,
    );
  }
}
