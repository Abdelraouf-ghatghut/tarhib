import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeliveryArrivalProof1786590000000 implements MigrationInterface {
  name = 'DeliveryArrivalProof1786590000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE delivery_tasks ADD COLUMN IF NOT EXISTS arrived_at timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE delivery_tasks ADD COLUMN IF NOT EXISTS recipient_name varchar(150)`,
    );
    await queryRunner.query(
      `ALTER TABLE delivery_tasks ADD COLUMN IF NOT EXISTS recipient_code varchar(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE delivery_tasks ADD COLUMN IF NOT EXISTS delivery_request_id varchar(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE delivery_tasks ADD COLUMN IF NOT EXISTS delivered_client_at timestamptz`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_delivery_tasks_request_id ON delivery_tasks(delivery_request_id) WHERE delivery_request_id IS NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS uq_delivery_tasks_request_id`,
    );
    await queryRunner.query(
      `ALTER TABLE delivery_tasks DROP COLUMN IF EXISTS delivered_client_at`,
    );
    await queryRunner.query(
      `ALTER TABLE delivery_tasks DROP COLUMN IF EXISTS delivery_request_id`,
    );
    await queryRunner.query(
      `ALTER TABLE delivery_tasks DROP COLUMN IF EXISTS recipient_code`,
    );
    await queryRunner.query(
      `ALTER TABLE delivery_tasks DROP COLUMN IF EXISTS recipient_name`,
    );
    await queryRunner.query(
      `ALTER TABLE delivery_tasks DROP COLUMN IF EXISTS arrived_at`,
    );
  }
}
