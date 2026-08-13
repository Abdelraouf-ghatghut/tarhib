import { MigrationInterface, QueryRunner } from 'typeorm';

export class KitchenPreparationChecklist1786580000000 implements MigrationInterface {
  name = 'KitchenPreparationChecklist1786580000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE order_lines ADD COLUMN IF NOT EXISTS preparation_status varchar(20) NOT NULL DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `ALTER TABLE order_lines ADD COLUMN IF NOT EXISTS preparation_note varchar(250)`,
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE order_lines DROP COLUMN IF EXISTS preparation_note`,
    );
    await queryRunner.query(
      `ALTER TABLE order_lines DROP COLUMN IF EXISTS preparation_status`,
    );
  }
}
