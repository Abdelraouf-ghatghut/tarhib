import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RoleAdminUiConfig1786620000000 implements MigrationInterface {
  name = 'RoleAdminUiConfig1786620000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "roles"
      ADD COLUMN "admin_ui_config" jsonb NOT NULL DEFAULT '{}'::jsonb
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "roles" DROP COLUMN "admin_ui_config"
    `);
  }
}
