-- CreateTable
CREATE TABLE "entreprises" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nom" VARCHAR(150) NOT NULL,
    "identifiant_legal" VARCHAR(50),
    "adresse" VARCHAR(255),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entreprises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entreprise_id" UUID NOT NULL,
    "nom" VARCHAR(150) NOT NULL,
    "adresse" VARCHAR(255),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" UUID NOT NULL,
    "nom" VARCHAR(150) NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "departement_id" UUID NOT NULL,
    "nom" VARCHAR(150) NOT NULL,
    "heure_ouverture" TIME(6),
    "heure_fermeture" TIME(6),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_sites_entreprise" ON "sites"("entreprise_id");

-- CreateIndex
CREATE UNIQUE INDEX "sites_entreprise_id_nom_key" ON "sites"("entreprise_id", "nom");

-- CreateIndex
CREATE INDEX "idx_departements_site" ON "departements"("site_id");

-- CreateIndex
CREATE UNIQUE INDEX "departements_site_id_nom_key" ON "departements"("site_id", "nom");

-- CreateIndex
CREATE INDEX "idx_services_departement" ON "services"("departement_id");

-- CreateIndex
CREATE UNIQUE INDEX "services_departement_id_nom_key" ON "services"("departement_id", "nom");

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_entreprise_id_fkey" FOREIGN KEY ("entreprise_id") REFERENCES "entreprises"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "departements" ADD CONSTRAINT "departements_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_departement_id_fkey" FOREIGN KEY ("departement_id") REFERENCES "departements"("id") ON DELETE CASCADE;

-- CreateTrigger (mise à jour automatique de updated_at, cf. set_updated_at())
CREATE TRIGGER trg_entreprises_updated_at BEFORE UPDATE ON entreprises
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sites_updated_at BEFORE UPDATE ON sites
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_departements_updated_at BEFORE UPDATE ON departements
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
