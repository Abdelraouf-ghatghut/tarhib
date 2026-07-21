import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeliveryOrderIncidentHold1782500475000 implements MigrationInterface {
  name = 'DeliveryOrderIncidentHold1782500475000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE delivery_tasks ADD COLUMN IF NOT EXISTS previous_order_status varchar(20) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE delivery_tasks ADD COLUMN IF NOT EXISTS previous_delivery_status varchar(30) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE delivery_tasks ADD COLUMN IF NOT EXISTS issue_description text NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE delivery_tasks DROP COLUMN IF EXISTS issue_description`,
    );
    await queryRunner.query(
      `ALTER TABLE delivery_tasks DROP COLUMN IF EXISTS previous_delivery_status`,
    );
    await queryRunner.query(
      `ALTER TABLE delivery_tasks DROP COLUMN IF EXISTS previous_order_status`,
    );
  }
}
