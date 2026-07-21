import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Nomenclature (BOM) : un produit vendu composé (ex. "café sucré") consomme
 * des ingrédients (بن, sucre, gobelet) suivis en stock séparément. Le
 * produit composé n'a pas de stock propre — sa disponibilité et sa
 * décrémentation passent par ses lignes de recette.
 *
 * `unit` sur products est purement informatif (affichage "g"/"ml"/"unité")
 * — aucune conversion automatique n'est appliquée : la quantité de recette
 * et le stock de l'ingrédient doivent être exprimés dans la même unité.
 */
export class ProductRecipe1782500490000 implements MigrationInterface {
  name = 'ProductRecipe1782500490000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(20)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_recipe_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        ingredient_product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        quantity INT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT product_recipe_lines_unique UNIQUE (product_id, ingredient_product_id),
        CONSTRAINT product_recipe_lines_not_self CHECK (product_id <> ingredient_product_id)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS product_recipe_lines`);
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS unit`);
  }
}
