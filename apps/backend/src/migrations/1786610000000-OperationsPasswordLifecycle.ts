import { MigrationInterface, QueryRunner } from 'typeorm';

export class OperationsPasswordLifecycle1786610000000 implements MigrationInterface {
  name = 'OperationsPasswordLifecycle1786610000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE employees DROP COLUMN IF EXISTS must_change_password`,
    );
  }
}
