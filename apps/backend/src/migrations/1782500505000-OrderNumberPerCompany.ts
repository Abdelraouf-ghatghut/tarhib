import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Numéro de commande court, propre à chaque société (1, 2, 3… par
 * company_id) au lieu de l'UUID complet affiché côté admin. Attribué de
 * façon atomique via company_order_counters (upsert + incrément), dans la
 * même transaction que la création de la commande — pas de risque de
 * doublon sous concurrence.
 */
export class OrderNumberPerCompany1782500505000 implements MigrationInterface {
  name = 'OrderNumberPerCompany1782500505000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE company_order_counters (
        company_id uuid PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
        next_number integer NOT NULL DEFAULT 1
      )
    `);

    await queryRunner.query(
      `ALTER TABLE orders ADD COLUMN order_number integer`,
    );

    await queryRunner.query(`
      WITH numbered AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at, id) AS rn
        FROM orders
      )
      UPDATE orders o SET order_number = numbered.rn
      FROM numbered WHERE o.id = numbered.id
    `);

    await queryRunner.query(
      `ALTER TABLE orders ALTER COLUMN order_number SET NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE orders
        ADD CONSTRAINT uq_orders_company_order_number UNIQUE (company_id, order_number)
    `);

    await queryRunner.query(`
      INSERT INTO company_order_counters (company_id, next_number)
      SELECT company_id::uuid, COALESCE(MAX(order_number), 0) + 1
      FROM orders GROUP BY company_id
      ON CONFLICT (company_id) DO UPDATE SET next_number = EXCLUDED.next_number
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE orders DROP CONSTRAINT uq_orders_company_order_number`,
    );
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN order_number`);
    await queryRunner.query(`DROP TABLE company_order_counters`);
  }
}
