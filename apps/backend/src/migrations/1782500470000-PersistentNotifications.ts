import { MigrationInterface, QueryRunner } from 'typeorm';
export class PersistentNotifications1782500470000 implements MigrationInterface {
  name = 'PersistentNotifications1782500470000';
  async up(q: QueryRunner) {
    await q.query(
      `CREATE TABLE IF NOT EXISTS notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,domain varchar(40) NOT NULL,title_ar varchar NOT NULL,title_en varchar NOT NULL,body_ar text NOT NULL,body_en text NOT NULL,reference_id varchar NULL,data jsonb NULL,read_at timestamptz NULL,created_at timestamptz NOT NULL DEFAULT now())`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS idx_notifications_employee_created ON notifications(employee_id,created_at DESC)`,
    );
  }
  async down(q: QueryRunner) {
    await q.query(`DROP TABLE IF EXISTS notifications`);
  }
}
