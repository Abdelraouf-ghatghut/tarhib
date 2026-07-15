import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleaningTaskMeetingContext1782500460000 implements MigrationInterface {
  name = 'CleaningTaskMeetingContext1782500460000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE cleaning_tasks ADD COLUMN IF NOT EXISTS source_booking_id uuid NULL REFERENCES room_bookings(id) ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE cleaning_tasks ADD COLUMN IF NOT EXISTS room_id uuid NULL REFERENCES meeting_rooms(id) ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE cleaning_tasks ADD COLUMN IF NOT EXISTS scheduled_start_at timestamptz NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE cleaning_tasks ADD COLUMN IF NOT EXISTS scheduled_end_at timestamptz NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_cleaning_tasks_source_booking ON cleaning_tasks(source_booking_id) WHERE source_booking_id IS NOT NULL`,
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS uq_cleaning_tasks_source_booking`,
    );
    await queryRunner.query(
      `ALTER TABLE cleaning_tasks DROP COLUMN IF EXISTS scheduled_end_at, DROP COLUMN IF EXISTS scheduled_start_at, DROP COLUMN IF EXISTS room_id, DROP COLUMN IF EXISTS source_booking_id`,
    );
  }
}
