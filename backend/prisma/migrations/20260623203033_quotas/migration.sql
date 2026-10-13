-- CreateTable
CREATE TABLE "quotas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "role_id" UUID,
    "produit_id" UUID,
    "periode" "periode_quota" NOT NULL,
    "valeur_max" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotas_consommation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "utilisateur_id" UUID NOT NULL,
    "quota_id" UUID NOT NULL,
    "periode_debut" DATE NOT NULL,
    "periode_fin" DATE NOT NULL,
    "valeur_consommee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotas_consommation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_quotas_conso_utilisateur" ON "quotas_consommation"("utilisateur_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotas_consommation_utilisateur_id_quota_id_periode_debut_key" ON "quotas_consommation"("utilisateur_id", "quota_id", "periode_debut");

-- AddForeignKey
ALTER TABLE "quotas" ADD CONSTRAINT "quotas_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "quotas" ADD CONSTRAINT "quotas_produit_id_fkey" FOREIGN KEY ("produit_id") REFERENCES "produits"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "quotas_consommation" ADD CONSTRAINT "quotas_consommation_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "quotas_consommation" ADD CONSTRAINT "quotas_consommation_quota_id_fkey" FOREIGN KEY ("quota_id") REFERENCES "quotas"("id") ON DELETE CASCADE;

-- CreateTrigger (mise à jour automatique de updated_at, cf. set_updated_at())
CREATE TRIGGER trg_quotas_conso_updated_at BEFORE UPDATE ON quotas_consommation
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
