import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Socle du modèle produit unifié (achat/vente/VIP indépendants du type),
 * préparation du chantier nomenclature (product_recipe, phase suivante) :
 * un même produit pourra être un ingrédient acheté/stocké sans jamais être
 * vendu, ou un produit vendu composé sans stock propre.
 *
 * `type` (COMMANDABLE/LIBRE_SERVICE_VIP) reste en place le temps de la
 * transition des points de lecture (moteur de validation, catalogue, VIP) —
 * à retirer une fois ce chantier terminé.
 */
export class ProductFlags1782500485000 implements MigrationInterface {
  name = 'ProductFlags1782500485000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS is_purchased BOOLEAN NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS is_sold BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS is_vip_self_service BOOLEAN NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      UPDATE products SET is_sold = true, is_purchased = true, is_vip_self_service = false
      WHERE type = 'COMMANDABLE'
    `);
    await queryRunner.query(`
      UPDATE products SET is_sold = false, is_purchased = true, is_vip_self_service = true
      WHERE type = 'LIBRE_SERVICE_VIP'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE products
        DROP COLUMN IF EXISTS is_purchased,
        DROP COLUMN IF EXISTS is_sold,
        DROP COLUMN IF EXISTS is_vip_self_service
    `);
  }
}
