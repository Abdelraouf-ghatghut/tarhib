import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PR-0.1 — Schéma d'intégrité additif (Phase 0).
 *
 *  - Réservation de stock (D1=B)  : inventory_items.reserved + bornes.
 *  - Idempotence création (D8)    : orders.client_request_id/_hash + index unique partiel.
 *  - Barrières d'intégrité (P07)  : CHECK quantités/seuils/lignes (NOT VALID —
 *                                   VALIDATE en étape d'exploitation après audit,
 *                                   cf. runbook ; sur base fraîche/CI c'est instantané).
 *  - Anti-double-réservation salle (P06) : EXCLUDE gist (verrou ACCESS EXCLUSIVE
 *                                   bref, inévitable ; précédé du nettoyage en prod).
 *
 * Additif et rétrocompatible : l'ancien code continue de fonctionner.
 */
export class IntegritySchema1782500600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`SET LOCAL lock_timeout = '3s'`);

    // --- Réservation de stock (D1=B) : reserved par défaut 0 → bornes valides
    // sur tout l'existant, donc validables immédiatement.
    await queryRunner.query(
      `ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS reserved integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE inventory_items ADD CONSTRAINT chk_inv_reserved_non_negative CHECK (reserved >= 0) NOT VALID`,
    );
    await queryRunner.query(
      `ALTER TABLE inventory_items ADD CONSTRAINT chk_inv_reserved_le_quantity CHECK (reserved <= quantity) NOT VALID`,
    );
    await queryRunner.query(
      `ALTER TABLE inventory_items VALIDATE CONSTRAINT chk_inv_reserved_non_negative`,
    );
    await queryRunner.query(
      `ALTER TABLE inventory_items VALIDATE CONSTRAINT chk_inv_reserved_le_quantity`,
    );

    // --- Idempotence création commande (D8) ---
    await queryRunner.query(
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_request_id uuid NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_request_hash varchar(64) NULL`,
    );
    // Non-CONCURRENTLY : la table est petite avant lancement. Si `orders` a déjà
    // du volume, créer cet index via script d'ops en CONCURRENTLY et retirer
    // cette ligne (une migration transactionnelle interdit CONCURRENTLY).
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_employee_client_request
         ON orders(employee_id, client_request_id) WHERE client_request_id IS NOT NULL`,
    );

    // --- Barrières d'intégrité (P07), NOT VALID ; VALIDATE = étape d'ops post-audit ---
    await queryRunner.query(
      `ALTER TABLE inventory_items ADD CONSTRAINT chk_inv_quantity_non_negative CHECK (quantity >= 0) NOT VALID`,
    );
    await queryRunner.query(
      `ALTER TABLE inventory_items ADD CONSTRAINT chk_inv_min_threshold_non_negative CHECK (min_threshold >= 0) NOT VALID`,
    );
    await queryRunner.query(
      `ALTER TABLE inventory_items ADD CONSTRAINT chk_inv_max_ge_min CHECK (max_threshold IS NULL OR max_threshold >= min_threshold) NOT VALID`,
    );
    await queryRunner.query(
      `ALTER TABLE employee_quota_usage ADD CONSTRAINT chk_quota_usage_non_negative CHECK (used_quantity >= 0) NOT VALID`,
    );
    // order_lines.quantity a déjà CHECK (quantity > 0) depuis InitOrdersQuotas.

    // --- Anti-double-réservation salle (P06). Précondition prod : 0 chevauchement
    // CONFIRMED (voir runbook). EXCLUDE ne supporte pas NOT VALID.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);
    await queryRunner.query(
      `ALTER TABLE room_bookings ADD CONSTRAINT excl_confirmed_room_booking_overlap
         EXCLUDE USING gist (
           room_id WITH =,
           tstzrange(start_time, end_time, '[)') WITH &&
         ) WHERE (status = 'CONFIRMED')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE room_bookings DROP CONSTRAINT IF EXISTS excl_confirmed_room_booking_overlap`,
    );
    await queryRunner.query(
      `ALTER TABLE employee_quota_usage DROP CONSTRAINT IF EXISTS chk_quota_usage_non_negative`,
    );
    await queryRunner.query(
      `ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS chk_inv_max_ge_min`,
    );
    await queryRunner.query(
      `ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS chk_inv_min_threshold_non_negative`,
    );
    await queryRunner.query(
      `ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS chk_inv_quantity_non_negative`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS uq_orders_employee_client_request`,
    );
    await queryRunner.query(
      `ALTER TABLE orders DROP COLUMN IF EXISTS client_request_hash`,
    );
    await queryRunner.query(
      `ALTER TABLE orders DROP COLUMN IF EXISTS client_request_id`,
    );
    await queryRunner.query(
      `ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS chk_inv_reserved_le_quantity`,
    );
    await queryRunner.query(
      `ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS chk_inv_reserved_non_negative`,
    );
    await queryRunner.query(
      `ALTER TABLE inventory_items DROP COLUMN IF EXISTS reserved`,
    );
  }
}
