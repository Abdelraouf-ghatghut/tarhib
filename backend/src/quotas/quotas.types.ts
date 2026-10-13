export interface QuotaConsommationResume {
  quota_id: string;
  produit_id: string | null;
  produit: { id: string; nom_ar: string; nom_en: string } | null;
  periode: string;
  periode_debut: Date;
  periode_fin: Date;
  valeur_max: number;
  valeur_consommee: number;
  valeur_restante: number;
}
