import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * orders.created_at était `timestamp without time zone` (défaut de
 * @CreateDateColumn sans type explicite) alors que sla_deadline/
 * prep_started_at/ready_at/delivered_at sont `timestamptz` — l'écart de
 * type corrompt silencieusement toute soustraction entre les deux dès que
 * le driver pg relit la colonne naïve dans le fuseau local du process
 * plutôt qu'en UTC (constaté : moyenne de temps de livraison négative
 * dans les rapports). La session DB est en Etc/UTC, donc la valeur
 * naïve stockée représente déjà de l'UTC — conversion directe sans
 * décalage de données.
 */
export class OrderCreatedAtTimestamptz1782500350000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE orders
        ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC'
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE orders
        ALTER COLUMN created_at TYPE TIMESTAMP USING created_at AT TIME ZONE 'UTC'
    `);
  }
}
