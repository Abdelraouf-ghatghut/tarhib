import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeliveryIssueDescription1782500480000 implements MigrationInterface {
  name = 'DeliveryIssueDescription1782500480000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE delivery_tasks ADD COLUMN IF NOT EXISTS issue_description text NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE delivery_tasks DROP COLUMN IF EXISTS issue_description`,
    );
  }
}
