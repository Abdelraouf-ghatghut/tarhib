import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Les fournisseurs sont une ressource propre à Tarhib (le prestataire), pas
 * à une société cliente — un même fournisseur sert l'achat pour toutes les
 * branches de toutes les sociétés. On retire donc le scoping par
 * company_id sur suppliers, et sa colonne dénormalisée sur
 * product_supplier_prices (qui n'a plus de sens une fois le fournisseur
 * lui-même non scopé).
 */
export class SuppliersGlobalNotCompanyScoped1782500340000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP INDEX IF EXISTS idx_suppliers_company`);
    await qr.query(`ALTER TABLE suppliers DROP COLUMN IF EXISTS company_id`);
    await qr.query(
      `ALTER TABLE product_supplier_prices DROP COLUMN IF EXISTS company_id`,
    );
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(
      `ALTER TABLE product_supplier_prices ADD COLUMN company_id UUID`,
    );
    await qr.query(`ALTER TABLE suppliers ADD COLUMN company_id UUID`);
    await qr.query(
      `CREATE INDEX idx_suppliers_company ON suppliers(company_id)`,
    );
  }
}
