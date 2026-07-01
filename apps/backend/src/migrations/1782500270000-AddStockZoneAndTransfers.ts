import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStockZoneAndTransfers1782500270000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Ajouter la colonne zone avec default BRANCH
    await queryRunner.query(`
      ALTER TABLE inventory_items
      ADD COLUMN IF NOT EXISTS zone VARCHAR(20) NOT NULL DEFAULT 'BRANCH'
        CHECK (zone IN ('CENTRAL', 'BRANCH', 'KITCHEN'))
    `);

    // 2. Remplacer l'ancienne contrainte unique (company_id, branch_id, product_id)
    //    par (company_id, branch_id, product_id, zone)
    await queryRunner.query(`
      ALTER TABLE inventory_items
      DROP CONSTRAINT IF EXISTS "UQ_inventory_items_company_branch_product"
    `);
    await queryRunner.query(`
      DO $$
      DECLARE cname TEXT;
      BEGIN
        SELECT constraint_name INTO cname
        FROM information_schema.table_constraints
        WHERE table_name = 'inventory_items'
          AND constraint_type = 'UNIQUE'
        LIMIT 1;
        IF cname IS NOT NULL THEN
          EXECUTE format('ALTER TABLE inventory_items DROP CONSTRAINT %I', cname);
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE inventory_items
      ADD CONSTRAINT uq_inventory_company_branch_product_zone
      UNIQUE (company_id, branch_id, product_id, zone)
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_inventory_zone ON inventory_items(zone)`,
    );

    // 3. Table inventory_transfers
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS inventory_transfers (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id   UUID NOT NULL,
        branch_id    UUID NOT NULL,
        product_id   UUID NOT NULL REFERENCES products(id),
        from_zone    VARCHAR(20) NOT NULL
                       CHECK (from_zone IN ('CENTRAL', 'BRANCH', 'KITCHEN')),
        to_zone      VARCHAR(20) NOT NULL
                       CHECK (to_zone IN ('CENTRAL', 'BRANCH', 'KITCHEN')),
        quantity     INT NOT NULL CHECK (quantity > 0),
        status       VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                       CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED')),
        requested_by UUID NOT NULL,
        confirmed_by UUID,
        note         TEXT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        confirmed_at TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transfers_branch
        ON inventory_transfers(company_id, branch_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transfers_status
        ON inventory_transfers(status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS inventory_transfers`);
    await queryRunner.query(`
      ALTER TABLE inventory_items
      DROP CONSTRAINT IF EXISTS uq_inventory_company_branch_product_zone
    `);
    await queryRunner.query(`
      ALTER TABLE inventory_items
      DROP COLUMN IF EXISTS zone
    `);
  }
}
