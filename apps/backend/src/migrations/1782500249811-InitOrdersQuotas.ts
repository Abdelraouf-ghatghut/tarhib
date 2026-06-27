import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitOrdersQuotas1782500249811 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id  UUID NOT NULL,
        branch_id    UUID NOT NULL,
        company_id   UUID NOT NULL,
        status       VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                       CHECK (status IN ('PENDING','APPROVED','IN_PROGRESS','DELIVERED','REJECTED')),
        priority     VARCHAR(2)   NOT NULL
                       CHECK (priority IN ('P1','P2','P3','P4','P5')),
        sla_deadline TIMESTAMPTZ  NOT NULL,
        created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_orders_company_employee ON orders(company_id, employee_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS order_lines (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id        UUID NOT NULL,
        quantity          INT  NOT NULL CHECK (quantity > 0),
        validation_status VARCHAR(20) NOT NULL DEFAULT 'APPROVED'
                            CHECK (validation_status IN ('APPROVED','REJECTED','PENDING_APPROVAL')),
        rejection_reason  VARCHAR(50)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_order_lines_order_id ON order_lines(order_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS quotas (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id   UUID NOT NULL,
        product_id    UUID NOT NULL,
        company_id    UUID NOT NULL,
        period_start  DATE NOT NULL,
        period_end    DATE NOT NULL,
        max_quantity  INT  NOT NULL CHECK (max_quantity > 0),
        used_quantity INT  NOT NULL DEFAULT 0 CHECK (used_quantity >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_quotas_employee_product_period
        ON quotas(employee_id, product_id, company_id, period_start, period_end)
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_quotas_company ON quotas(company_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS quotas`);
    await queryRunner.query(`DROP TABLE IF EXISTS order_lines`);
    await queryRunner.query(`DROP TABLE IF EXISTS orders`);
  }
}
