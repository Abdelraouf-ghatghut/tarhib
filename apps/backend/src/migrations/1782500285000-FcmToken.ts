import { MigrationInterface, QueryRunner } from 'typeorm';

export class FcmToken1782500285000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE employees
      ADD COLUMN IF NOT EXISTS fcm_token TEXT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE employees DROP COLUMN IF EXISTS fcm_token
    `);
  }
}
