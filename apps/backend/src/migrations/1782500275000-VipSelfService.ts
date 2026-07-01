import { MigrationInterface, QueryRunner } from 'typeorm';

export class VipSelfService1782500275000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ajouter location_name sur inventory_items (emplacement physique VIP : ex. "Frigo — Bureau CFO")
    await queryRunner.query(`
      ALTER TABLE inventory_items
      ADD COLUMN IF NOT EXISTS location_name VARCHAR(255)
    `);

    // Table des tâches de réapprovisionnement VIP
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vip_replenishment_tasks (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
        product_id        UUID NOT NULL REFERENCES products(id),
        branch_id         UUID NOT NULL,
        company_id        UUID NOT NULL,
        location_name     VARCHAR(255),
        requested_qty     INT NOT NULL DEFAULT 0,
        status            VARCHAR(20) NOT NULL DEFAULT 'OPEN'
                            CHECK (status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED')),
        assigned_agent_id UUID,
        completed_by      UUID,
        completed_at      TIMESTAMPTZ,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_vip_tasks_status
        ON vip_replenishment_tasks(status)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_vip_tasks_branch
        ON vip_replenishment_tasks(company_id, branch_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_vip_tasks_item
        ON vip_replenishment_tasks(inventory_item_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS vip_replenishment_tasks`);
    await queryRunner.query(`
      ALTER TABLE inventory_items DROP COLUMN IF EXISTS location_name
    `);
  }
}
