-- CreateEnum
CREATE TYPE "code_refus_commande" AS ENUM ('produit_indisponible', 'stock_insuffisant', 'quota_depasse', 'horaire_ferme', 'role_non_autorise');

-- DropIndex
DROP INDEX "categories_produits_nom_key";

-- AlterTable
ALTER TABLE "categories_produits" DROP COLUMN "description",
DROP COLUMN "nom",
ADD COLUMN     "description_ar" VARCHAR(255),
ADD COLUMN     "description_en" VARCHAR(255),
ADD COLUMN     "nom_ar" VARCHAR(100) NOT NULL,
ADD COLUMN     "nom_en" VARCHAR(100) NOT NULL;

-- AlterTable
ALTER TABLE "commandes" DROP COLUMN "motif_refus",
ADD COLUMN     "code_refus" "code_refus_commande";

-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "message",
DROP COLUMN "titre",
ADD COLUMN     "donnees" JSONB;

-- AlterTable
ALTER TABLE "produits" DROP COLUMN "description",
DROP COLUMN "nom",
ADD COLUMN     "description_ar" VARCHAR(255),
ADD COLUMN     "description_en" VARCHAR(255),
ADD COLUMN     "nom_ar" VARCHAR(150) NOT NULL,
ADD COLUMN     "nom_en" VARCHAR(150) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "categories_produits_nom_ar_key" ON "categories_produits"("nom_ar");

-- CreateIndex
CREATE UNIQUE INDEX "categories_produits_nom_en_key" ON "categories_produits"("nom_en");
