-- CreateEnum
CREATE TYPE "statut_commande" AS ENUM ('en_attente', 'en_attente_approbation', 'validee', 'refusee', 'en_preparation', 'en_livraison', 'livree', 'annulee');

-- CreateEnum
CREATE TYPE "type_mouvement_stock" AS ENUM ('entree', 'sortie', 'ajustement');

-- CreateEnum
CREATE TYPE "type_emplacement_stock" AS ENUM ('cuisine', 'stockage_site', 'entrepot_general');

-- CreateEnum
CREATE TYPE "type_notification" AS ENUM ('nouvelle_commande', 'validation', 'refus', 'preparation', 'livraison', 'quota_depasse', 'rupture_stock', 'reapprovisionnement');

-- CreateEnum
CREATE TYPE "periode_quota" AS ENUM ('jour', 'semaine', 'mois');

-- CreateEnum
CREATE TYPE "statut_commande_fournisseur" AS ENUM ('brouillon', 'envoyee', 'partiellement_recue', 'recue', 'annulee');

-- CreateTable
CREATE TABLE "emplacements_stock" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entreprise_id" UUID NOT NULL,
    "site_id" UUID,
    "type" "type_emplacement_stock" NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emplacements_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "emplacement_id" UUID NOT NULL,
    "produit_id" UUID NOT NULL,
    "quantite" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "seuil_minimal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "seuil_reapprovisionnement" DECIMAL(12,2),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mouvements_stock" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "stock_id" UUID NOT NULL,
    "type" "type_mouvement_stock" NOT NULL,
    "quantite" DECIMAL(12,2) NOT NULL,
    "motif" VARCHAR(255),
    "utilisateur_id" UUID,
    "commande_id" UUID,
    "date_mouvement" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mouvements_stock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_emplacements_site" ON "emplacements_stock"("site_id");

-- CreateIndex
CREATE INDEX "idx_stocks_produit" ON "stocks"("produit_id");

-- CreateIndex
CREATE UNIQUE INDEX "stocks_emplacement_id_produit_id_key" ON "stocks"("emplacement_id", "produit_id");

-- CreateIndex
CREATE INDEX "idx_mouvements_stock_stock" ON "mouvements_stock"("stock_id");

-- CreateIndex
CREATE INDEX "idx_mouvements_stock_date" ON "mouvements_stock"("date_mouvement");

-- AddForeignKey
ALTER TABLE "emplacements_stock" ADD CONSTRAINT "emplacements_stock_entreprise_id_fkey" FOREIGN KEY ("entreprise_id") REFERENCES "entreprises"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "emplacements_stock" ADD CONSTRAINT "emplacements_stock_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_emplacement_id_fkey" FOREIGN KEY ("emplacement_id") REFERENCES "emplacements_stock"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_produit_id_fkey" FOREIGN KEY ("produit_id") REFERENCES "produits"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_stock" ADD CONSTRAINT "mouvements_stock_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "stocks"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_stock" ADD CONSTRAINT "mouvements_stock_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL;

-- CheckConstraint
ALTER TABLE "emplacements_stock" ADD CONSTRAINT "chk_site_coherent" CHECK (
    (type = 'entrepot_general' AND site_id IS NULL)
    OR (type IN ('cuisine', 'stockage_site') AND site_id IS NOT NULL)
);

-- CheckConstraint
ALTER TABLE "stocks" ADD CONSTRAINT "chk_quantite_positive" CHECK (quantite >= 0);

-- CreateTrigger (mise à jour automatique de updated_at, cf. set_updated_at())
CREATE TRIGGER trg_stocks_updated_at BEFORE UPDATE ON stocks
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
