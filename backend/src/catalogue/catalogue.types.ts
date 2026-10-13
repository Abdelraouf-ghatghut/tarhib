export interface ProduitCatalogue {
  id: string;
  nom_ar: string;
  nom_en: string;
  description_ar: string | null;
  description_en: string | null;
  unite_mesure: string;
  prix_unitaire: number;
  image_url: string | null;
  categorie: {
    id: string;
    nom_ar: string;
    nom_en: string;
  } | null;
}
