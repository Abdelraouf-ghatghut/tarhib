-- CheckConstraint
-- nom_en NOT NULL n'empêche pas une chaîne vide/blanche : sans ce CHECK, un produit
-- sans traduction anglaise passe inaperçu jusqu'au test de l'app (cf. règle bilinguisme, docs/schema.sql).
ALTER TABLE "produits" ADD CONSTRAINT "chk_produits_nom_en_non_vide" CHECK (btrim(nom_en) <> '');
