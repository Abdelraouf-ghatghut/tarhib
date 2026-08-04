import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PR-0.1d — Registre de consommation de quota par commande (D12 = restitution).
 *
 * Une ligne UNIQUEMENT si un quota a réellement été consommé (produit sous
 * quota). Permet une restitution EXACTE et idempotente à l'annulation/rejet
 * avant IN_PROGRESS : un simple `used -= quantité` depuis order_lines ne
 * distinguerait pas « aucun quota à la création » (D3=illimité) de « consommé ».
 *
 * Période figée à la création → la restitution décrémente la BONNE fenêtre,
 * même si l'annulation tombe une période plus tard.
 * Invariant (pré-lancement, sans usage historique) :
 *     employee_quota_usage.used_quantity
 *       = SUM(order_quota_consumptions.quantity WHERE status='CONSUMED' … période)
 */
export class OrderQuotaConsumptions1782500602000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS order_quota_consumptions (
        id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id       uuid NOT NULL REFERENCES orders(id),
        order_line_id  uuid NOT NULL REFERENCES order_lines(id),
        employee_id    uuid NOT NULL,
        product_id     uuid NOT NULL,
        company_id     uuid NOT NULL,
        period_start   date NOT NULL,
        period_end     date NOT NULL,
        quantity       integer NOT NULL,
        status         varchar(20) NOT NULL DEFAULT 'CONSUMED',
        created_at     timestamptz NOT NULL DEFAULT now(),
        restored_at    timestamptz NULL,
        CONSTRAINT chk_order_quota_consumption_quantity CHECK (quantity > 0),
        CONSTRAINT chk_order_quota_consumption_status   CHECK (status IN ('CONSUMED','RESTORED')),
        CONSTRAINT uq_order_quota_consumption_line UNIQUE (order_line_id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_order_quota_consumptions_order_status ON order_quota_consumptions(order_id, status)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS order_quota_consumptions`);
  }
}
