-- CreateTable
CREATE TABLE "categories_produits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nom" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),

    CONSTRAINT "categories_produits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "categorie_id" UUID,
    "nom" VARCHAR(150) NOT NULL,
    "description" VARCHAR(255),
    "unite_mesure" VARCHAR(20) NOT NULL DEFAULT 'unite',
    "prix_unitaire" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "image_url" VARCHAR(255),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "produits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produits_roles" (
    "produit_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,

    CONSTRAINT "produits_roles_pkey" PRIMARY KEY ("produit_id","role_id")
);

-- CreateTable
CREATE TABLE "produits_sites" (
    "produit_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "disponible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "produits_sites_pkey" PRIMARY KEY ("produit_id","site_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_produits_nom_key" ON "categories_produits"("nom");

-- CreateIndex
CREATE INDEX "idx_produits_categorie" ON "produits"("categorie_id");

-- AddForeignKey
ALTER TABLE "produits" ADD CONSTRAINT "produits_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categories_produits"("id") ON DELETE SET NULL;

-- AddForeignKey
ALTER TABLE "produits_roles" ADD CONSTRAINT "produits_roles_produit_id_fkey" FOREIGN KEY ("produit_id") REFERENCES "produits"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "produits_roles" ADD CONSTRAINT "produits_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "produits_sites" ADD CONSTRAINT "produits_sites_produit_id_fkey" FOREIGN KEY ("produit_id") REFERENCES "produits"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "produits_sites" ADD CONSTRAINT "produits_sites_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE;

-- CreateTrigger (mise à jour automatique de updated_at, cf. set_updated_at())
CREATE TRIGGER trg_produits_updated_at BEFORE UPDATE ON produits
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
