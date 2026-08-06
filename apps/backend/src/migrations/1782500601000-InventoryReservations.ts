import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PR-0.1c — Registre de réservation de stock (D1=B).
 *
 * Source de vérité de l'allocation par commande / ligne / zone / ingrédient :
 * une colonne `inventory_items.reserved` seule ne dirait pas QUI a réservé QUOI.
 * `reserved` reste un compteur dénormalisé, invariant :
 *     inventory_items.reserved = SUM(inventory_reservations.quantity WHERE status='HELD')
 *
 * Noms non ambigus :
 *   ordered_product_id = produit vendu (ligne de commande)
 *   stock_product_id   = ingrédient/produit simple réellement décrémenté en stock
 *                        (= ordered_product_id pour un produit sans recette)
 *
 * FK sans ON DELETE : une commande/ligne référencée par une réservation ne peut
 * pas être supprimée en dur (préserve l'historique de stock — échec bruyant).
 */
export class InventoryReservations1782500601000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS inventory_reservations (
        id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id            uuid NOT NULL REFERENCES orders(id),
        order_line_id       uuid NOT NULL REFERENCES order_lines(id),
        inventory_item_id   uuid NOT NULL REFERENCES inventory_items(id),
        ordered_product_id  uuid NOT NULL,
        stock_product_id    uuid NOT NULL,
        zone                varchar(20) NOT NULL,
        quantity            integer NOT NULL,
        status              varchar(20) NOT NULL DEFAULT 'HELD',
        created_at          timestamptz NOT NULL DEFAULT now(),
        consumed_at         timestamptz NULL,
        released_at         timestamptz NULL,
        CONSTRAINT chk_inv_reservation_quantity CHECK (quantity > 0),
        CONSTRAINT chk_inv_reservation_status   CHECK (status IN ('HELD','CONSUMED','RELEASED')),
        CONSTRAINT uq_inv_reservation_alloc UNIQUE (order_line_id, inventory_item_id, stock_product_id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_inv_reservations_order_status ON inventory_reservations(order_id, status)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_inv_reservations_item_status ON inventory_reservations(inventory_item_id, status)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS inventory_reservations`);
  }
}
