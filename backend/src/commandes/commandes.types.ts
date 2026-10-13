export interface LigneCommandeDetail {
  id: string;
  produit_id: string;
  nom_ar: string;
  nom_en: string;
  quantite: number;
  prix_unitaire_snapshot: number;
}

export interface CommandeDetail {
  id: string;
  statut: string;
  priorite: number;
  site_id: string;
  departement_id: string | null;
  service_id: string | null;
  lieu_livraison: string | null;
  salle: string | null;
  heure_souhaitee: Date | null;
  commentaire: string | null;
  created_at: Date;
  lignes: LigneCommandeDetail[];
}
