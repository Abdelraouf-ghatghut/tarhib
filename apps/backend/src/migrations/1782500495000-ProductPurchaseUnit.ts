import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Conversion d'unité à la réception fournisseur : un produit peut être
 * acheté dans une unité différente de celle utilisée en stock/recette
 * (ex. acheté au sac de 1kg, stocké/consommé en grammes). `unitsPerPurchase`
 * = combien d'unités de stock (`products.unit`) contient une unité d'achat
 * (`purchase_unit`). Défaut 1 = aucune conversion (comportement historique).
 */
export class ProductPurchaseUnit1782500495000 implements MigrationInterface {
  name = 'ProductPurchaseUnit1782500495000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS purchase_unit VARCHAR(20),
        ADD COLUMN IF NOT EXISTS units_per_purchase INT NOT NULL DEFAULT 1
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE products
        DROP COLUMN IF EXISTS purchase_unit,
        DROP COLUMN IF EXISTS units_per_purchase
    `);
  }
}
