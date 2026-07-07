import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompanyBilingualNames1782500300000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS name_ar VARCHAR(200)`,
    );
    await qr.query(
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS name_en VARCHAR(200)`,
    );
    // Backfill des sociétés existantes à partir du nom canonique
    await qr.query(`UPDATE companies SET name_ar = name WHERE name_ar IS NULL`);
    await qr.query(`UPDATE companies SET name_en = name WHERE name_en IS NULL`);
    await qr.query(`ALTER TABLE companies ALTER COLUMN name_ar SET NOT NULL`);
    await qr.query(`ALTER TABLE companies ALTER COLUMN name_en SET NOT NULL`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE companies DROP COLUMN IF EXISTS name_ar`);
    await qr.query(`ALTER TABLE companies DROP COLUMN IF EXISTS name_en`);
  }
}
