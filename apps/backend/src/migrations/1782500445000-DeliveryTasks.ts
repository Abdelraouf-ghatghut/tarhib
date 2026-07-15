import { MigrationInterface, QueryRunner } from 'typeorm';
export class DeliveryTasks1782500445000 implements MigrationInterface {
  name = 'DeliveryTasks1782500445000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      `CREATE TABLE IF NOT EXISTS delivery_tasks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE, company_id uuid NOT NULL, branch_id uuid NOT NULL, assigned_employee_id uuid NULL REFERENCES employees(id) ON DELETE SET NULL, status varchar(30) NOT NULL DEFAULT 'AVAILABLE', issue_reason text NULL, picked_up_at timestamptz NULL, delivered_at timestamptz NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS idx_delivery_tasks_branch_status ON delivery_tasks(branch_id, status)`,
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS delivery_tasks`);
  }
}
