import { MigrationInterface, QueryRunner } from 'typeorm';

export class MeetingRooms1782500265000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS meeting_rooms (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        branch_id  UUID NOT NULL,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name_ar    VARCHAR(200) NOT NULL,
        name_en    VARCHAR(200) NOT NULL,
        capacity   INT NOT NULL DEFAULT 10,
        amenities  JSONB,
        active     BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_meeting_rooms_company ON meeting_rooms(company_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS room_bookings (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id     UUID NOT NULL REFERENCES meeting_rooms(id) ON DELETE CASCADE,
        employee_id UUID NOT NULL,
        company_id  UUID NOT NULL,
        start_time  TIMESTAMPTZ NOT NULL,
        end_time    TIMESTAMPTZ NOT NULL,
        status      VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED'
                      CHECK (status IN ('CONFIRMED','CANCELLED','COMPLETED')),
        services    JSONB,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_room_bookings_room ON room_bookings(room_id, start_time, end_time)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_room_bookings_employee ON room_bookings(employee_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS room_bookings`);
    await queryRunner.query(`DROP TABLE IF EXISTS meeting_rooms`);
  }
}
