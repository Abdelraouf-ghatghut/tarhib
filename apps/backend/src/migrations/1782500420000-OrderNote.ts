import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Commentaire libre de l'employé sur sa commande (CDC §7 — panier :
 * « commentaire libre »). Saisi côté app Employee, affiché côté cuisine.
 */
export class OrderNote1782500420000 implements MigrationInterface {
  name = 'OrderNote1782500420000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS note VARCHAR(500)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN IF EXISTS note`);
  }
}
