import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Restructuration VIP self-service : un "emplacement VIP" était jusqu'ici
 * une ligne inventory_items (1 produit = 1 emplacement). On introduit
 * vip_locations (le lieu physique) + vip_location_products (produit ×
 * quantité/seuils dans ce lieu), pour permettre plusieurs produits par
 * emplacement (ex. un frigo VIP contenant plusieurs boissons).
 *
 * Types alignés sur inventory_items existant : company_id/branch_id/
 * product_id y sont VARCHAR (pas UUID natif, incohérence historique du
 * schéma) — vip_locations/vip_location_products suivent la même
 * convention pour rester cohérents avec le reste de la base (evite les
 * casts partout ailleurs dans le code). department_id/assigned_employee_id
 * restent UUID, comme sur inventory_items.
 *
 * Astuce de migration : on réutilise l'id de chaque inventory_item comme
 * id de la nouvelle vip_locations ET comme id de la vip_location_products
 * correspondante (tables différentes, donc pas de collision de clé). Ça
 * donne une correspondance stable et directe : l'ancien
 * inventory_item.id == le nouveau vip_location_products.id, donc
 * vip_replenishment_tasks.inventory_item_id peut simplement être renommé
 * en vip_location_product_id SANS aucune valeur à réécrire.
 *
 * Contrat mobile préservé : GET /vip-self-service/locations reste un
 * tableau plat (1 ligne par produit), PATCH .../locations/:id/replenish
 * continue de cibler cet id — cf. apps/mobile/lib/screens/agent/
 * vip_stock_screen.dart, non modifié par ce lot.
 */
export class CreateVipLocationEntities1782500380000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE vip_locations (
        id UUID PRIMARY KEY,
        company_id VARCHAR NOT NULL,
        branch_id VARCHAR NOT NULL,
        department_id UUID NULL,
        assigned_employee_id UUID NULL,
        location_name VARCHAR NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await qr.query(`
      CREATE TABLE vip_location_products (
        id UUID PRIMARY KEY,
        vip_location_id UUID NOT NULL REFERENCES vip_locations(id) ON DELETE CASCADE,
        product_id VARCHAR NOT NULL,
        quantity INT NOT NULL DEFAULT 0,
        min_threshold INT NOT NULL DEFAULT 0,
        max_threshold INT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (vip_location_id, product_id)
      )
    `);

    // Données existantes : chaque inventory_item VIP devient une location
    // (id réutilisé) + son unique produit dans vip_location_products (id
    // réutilisé aussi — cf. astuce ci-dessus). products.id est UUID natif,
    // d'où le cast pour le JOIN sur inventory_items.product_id (varchar).
    await qr.query(`
      INSERT INTO vip_locations
        (id, company_id, branch_id, department_id, assigned_employee_id, location_name, created_at, updated_at)
      SELECT ii.id, ii.company_id, ii.branch_id, ii.department_id, ii.assigned_employee_id,
             ii.location_name, ii.updated_at, ii.updated_at
      FROM inventory_items ii
      JOIN products p ON p.id::varchar = ii.product_id
      WHERE p.type = 'LIBRE_SERVICE_VIP'
    `);

    await qr.query(`
      INSERT INTO vip_location_products
        (id, vip_location_id, product_id, quantity, min_threshold, max_threshold, created_at, updated_at)
      SELECT ii.id, ii.id, ii.product_id, ii.quantity, ii.min_threshold, ii.max_threshold,
             ii.updated_at, ii.updated_at
      FROM inventory_items ii
      JOIN products p ON p.id::varchar = ii.product_id
      WHERE p.type = 'LIBRE_SERVICE_VIP'
    `);

    // Le stock VIP ne vit plus dans inventory_items (séparation "emplacement
    // dédié" — CLAUDE.md §3.2) : évite aussi qu'un produit VIP apparaisse
    // par erreur dans la page Gestion du stock générale.
    await qr.query(`
      DELETE FROM inventory_items ii
      USING products p
      WHERE p.id::varchar = ii.product_id AND p.type = 'LIBRE_SERVICE_VIP'
    `);

    // Renommage pur (mêmes valeurs, cf. astuce d'id ci-dessus) : aucune
    // réécriture de données nécessaire.
    await qr.query(`
      ALTER TABLE vip_replenishment_tasks
        RENAME COLUMN inventory_item_id TO vip_location_product_id
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE vip_replenishment_tasks
        RENAME COLUMN vip_location_product_id TO inventory_item_id
    `);

    // Reconstruction best-effort : un emplacement qui aurait reçu un 2e
    // produit après cette migration ne peut pas revenir proprement au
    // modèle "1 item = 1 produit" (limite inhérente à un rollback après
    // écriture de nouvelles données sous le nouveau schéma).
    await qr.query(`
      INSERT INTO inventory_items
        (id, company_id, branch_id, product_id, zone, quantity, min_threshold, max_threshold, location_name, department_id, assigned_employee_id, updated_at)
      SELECT lp.id, l.company_id, l.branch_id, lp.product_id, 'BRANCH', lp.quantity, lp.min_threshold,
             lp.max_threshold, l.location_name, l.department_id, l.assigned_employee_id, lp.updated_at
      FROM vip_location_products lp
      JOIN vip_locations l ON l.id = lp.vip_location_id
    `);

    await qr.query(`DROP TABLE vip_location_products`);
    await qr.query(`DROP TABLE vip_locations`);
  }
}
