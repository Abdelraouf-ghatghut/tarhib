-- CreateTable
CREATE TABLE "commandes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "utilisateur_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "departement_id" UUID,
    "service_id" UUID,
    "lieu_livraison" VARCHAR(150),
    "salle" VARCHAR(100),
    "heure_souhaitee" TIMESTAMPTZ(6),
    "commentaire" VARCHAR(500),
    "statut" "statut_commande" NOT NULL DEFAULT 'en_attente',
    "priorite" SMALLINT NOT NULL DEFAULT 4,
    "motif_refus" VARCHAR(255),
    "valide_par_id" UUID,
    "agent_id" UUID,
    "date_validation" TIMESTAMPTZ(6),
    "date_preparation" TIMESTAMPTZ(6),
    "date_livraison" TIMESTAMPTZ(6),
    "date_confirmation" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commandes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_commande" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "commande_id" UUID NOT NULL,
    "produit_id" UUID NOT NULL,
    "quantite" DECIMAL(10,2) NOT NULL,
    "prix_unitaire_snapshot" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "lignes_commande_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "lignes_commande_quantite_check" CHECK (quantite > 0)
);

-- CreateIndex
CREATE INDEX "idx_commandes_utilisateur" ON "commandes"("utilisateur_id");

-- CreateIndex
CREATE INDEX "idx_commandes_site" ON "commandes"("site_id");

-- CreateIndex
CREATE INDEX "idx_commandes_statut" ON "commandes"("statut");

-- CreateIndex
CREATE INDEX "idx_commandes_agent" ON "commandes"("agent_id");

-- CreateIndex
CREATE INDEX "idx_lignes_commande_commande" ON "lignes_commande"("commande_id");

-- CreateIndex
CREATE INDEX "idx_lignes_commande_produit" ON "lignes_commande"("produit_id");

-- AddForeignKey (FK différée, cf. docs/schema.sql section 6)
ALTER TABLE "mouvements_stock" ADD CONSTRAINT "fk_mouvements_commande" FOREIGN KEY ("commande_id") REFERENCES "commandes"("id") ON DELETE SET NULL;

-- AddForeignKey
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT;

-- AddForeignKey
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT;

-- AddForeignKey
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_departement_id_fkey" FOREIGN KEY ("departement_id") REFERENCES "departements"("id") ON DELETE SET NULL;

-- AddForeignKey
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL;

-- AddForeignKey
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_valide_par_id_fkey" FOREIGN KEY ("valide_par_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL;

-- AddForeignKey
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL;

-- AddForeignKey
ALTER TABLE "lignes_commande" ADD CONSTRAINT "lignes_commande_commande_id_fkey" FOREIGN KEY ("commande_id") REFERENCES "commandes"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_commande" ADD CONSTRAINT "lignes_commande_produit_id_fkey" FOREIGN KEY ("produit_id") REFERENCES "produits"("id") ON DELETE RESTRICT;

-- CreateTrigger (mise à jour automatique de updated_at, cf. set_updated_at())
CREATE TRIGGER trg_commandes_updated_at BEFORE UPDATE ON commandes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
