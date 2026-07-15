import { MigrationInterface, QueryRunner } from 'typeorm';
export class InventoryReplenishments1782500450000 implements MigrationInterface {
  name = 'InventoryReplenishments1782500450000';
  async up(q: QueryRunner) {
    await q.query(
      `CREATE TABLE IF NOT EXISTS inventory_replenishment_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL, branch_id uuid NOT NULL, product_id uuid NOT NULL, requested_qty int NOT NULL CHECK (requested_qty > 0), requested_by varchar NOT NULL, approved_by varchar NULL, transfer_id uuid NULL REFERENCES inventory_transfers(id) ON DELETE SET NULL, status varchar(20) NOT NULL DEFAULT 'REQUESTED', note text NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS idx_replenishments_branch_status ON inventory_replenishment_requests(branch_id,status)`,
    );
  }
  async down(q: QueryRunner) {
    await q.query(`DROP TABLE IF EXISTS inventory_replenishment_requests`);
  }
}
