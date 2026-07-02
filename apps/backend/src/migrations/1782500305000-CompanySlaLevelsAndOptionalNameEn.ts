import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompanySlaLevelsAndOptionalNameEn1782500305000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE roles ALTER COLUMN name_en DROP NOT NULL`);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS company_sla_levels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        code VARCHAR(2) NOT NULL,
        name_ar VARCHAR(100),
        name_en VARCHAR(100),
        target_minutes INT NOT NULL,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT uq_company_sla_levels_company_code UNIQUE (company_id, code)
      )
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS company_sla_levels`);
    await qr.query(`UPDATE roles SET name_en = name_ar WHERE name_en IS NULL`);
    await qr.query(`ALTER TABLE roles ALTER COLUMN name_en SET NOT NULL`);
  }
}
