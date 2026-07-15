import { MigrationInterface, QueryRunner } from 'typeorm';
export class MeetingPreparations1782500455000 implements MigrationInterface {
  name = 'MeetingPreparations1782500455000';
  async up(q: QueryRunner) {
    await q.query(
      `CREATE TABLE IF NOT EXISTS meeting_preparations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),booking_id uuid NOT NULL UNIQUE REFERENCES room_bookings(id) ON DELETE CASCADE,company_id uuid NOT NULL,branch_id uuid NOT NULL,assigned_employee_id uuid NULL REFERENCES employees(id) ON DELETE SET NULL,status varchar(20) NOT NULL DEFAULT 'PENDING',checklist jsonb NOT NULL DEFAULT '[]'::jsonb,started_at timestamptz NULL,ready_at timestamptz NULL,completed_at timestamptz NULL,verified_by varchar NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS idx_meeting_preparations_branch_status ON meeting_preparations(branch_id,status)`,
    );
  }
  async down(q: QueryRunner) {
    await q.query(`DROP TABLE IF EXISTS meeting_preparations`);
  }
}
