-- CreateTable
CREATE TABLE "fournisseurs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entreprise_id" UUID NOT NULL,
    "nom" VARCHAR(150) NOT NULL,
    "contact" VARCHAR(150),
    "email" VARCHAR(150),
    "telephone" VARCHAR(30),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fournisseurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commandes_fournisseur" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fournisseur_id" UUID NOT NULL,
    "emplacement_id" UUID NOT NULL,
    "statut" "statut_commande_fournisseur" NOT NULL DEFAULT 'brouillon',
    "cree_par_id" UUID,
    "date_creation" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_reception" TIMESTAMPTZ(6),

    CONSTRAINT "commandes_fournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_commande_fournisseur" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "commande_fournisseur_id" UUID NOT NULL,
    "produit_id" UUID NOT NULL,
    "quantite_commandee" DECIMAL(12,2) NOT NULL,
    "quantite_recue" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "lignes_commande_fournisseur_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "lignes_commande_fournisseur_quantite_commandee_check" CHECK (quantite_commandee > 0)
);

-- CreateIndex
CREATE INDEX "idx_lignes_cf_commande" ON "lignes_commande_fournisseur"("commande_fournisseur_id");

-- AddForeignKey
ALTER TABLE "fournisseurs" ADD CONSTRAINT "fournisseurs_entreprise_id_fkey" FOREIGN KEY ("entreprise_id") REFERENCES "entreprises"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "commandes_fournisseur" ADD CONSTRAINT "commandes_fournisseur_fournisseur_id_fkey" FOREIGN KEY ("fournisseur_id") REFERENCES "fournisseurs"("id") ON DELETE RESTRICT;

-- AddForeignKey
ALTER TABLE "commandes_fournisseur" ADD CONSTRAINT "commandes_fournisseur_emplacement_id_fkey" FOREIGN KEY ("emplacement_id") REFERENCES "emplacements_stock"("id") ON DELETE RESTRICT;

-- AddForeignKey
ALTER TABLE "commandes_fournisseur" ADD CONSTRAINT "commandes_fournisseur_cree_par_id_fkey" FOREIGN KEY ("cree_par_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL;

-- AddForeignKey
ALTER TABLE "lignes_commande_fournisseur" ADD CONSTRAINT "lignes_commande_fournisseur_commande_fournisseur_id_fkey" FOREIGN KEY ("commande_fournisseur_id") REFERENCES "commandes_fournisseur"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_commande_fournisseur" ADD CONSTRAINT "lignes_commande_fournisseur_produit_id_fkey" FOREIGN KEY ("produit_id") REFERENCES "produits"("id") ON DELETE RESTRICT;
