import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * La migration CreateVipLocationEntities a créé vip_locations/vip_location_products
 * avec `id UUID PRIMARY KEY` sans DEFAULT (nécessaire pour la ré-utilisation
 * explicite des ids lors de la migration de données) — mais les créations
 * ultérieures via TypeORM (@PrimaryGeneratedColumn('uuid')) s'attendent à ce
 * que Postgres génère l'id, comme sur toutes les autres tables du schéma.
 */
export class VipLocationIdDefaults1782500385000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(
      `ALTER TABLE vip_locations ALTER COLUMN id SET DEFAULT gen_random_uuid()`,
    );
    await qr.query(
      `ALTER TABLE vip_location_products ALTER COLUMN id SET DEFAULT gen_random_uuid()`,
    );
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE vip_locations ALTER COLUMN id DROP DEFAULT`);
    await qr.query(
      `ALTER TABLE vip_location_products ALTER COLUMN id DROP DEFAULT`,
    );
  }
}
