import { MigrationInterface, QueryRunner } from 'typeorm';
export class CleaningStockRequests1782500465000 implements MigrationInterface {
  name = 'CleaningStockRequests1782500465000';
  async up(q: QueryRunner) {
    await q.query(
      `CREATE TABLE IF NOT EXISTS cleaning_stock_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL,branch_id uuid NOT NULL,cleaning_product_id uuid NOT NULL REFERENCES cleaning_products(id),requested_qty int NOT NULL CHECK(requested_qty>0),requested_by varchar NOT NULL,status varchar(20) NOT NULL DEFAULT 'REQUESTED',note text NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS idx_cleaning_stock_requests_branch_status ON cleaning_stock_requests(branch_id,status)`,
    );
  }
  async down(q: QueryRunner) {
    await q.query(`DROP TABLE IF EXISTS cleaning_stock_requests`);
  }
}
