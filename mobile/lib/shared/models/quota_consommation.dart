class QuotaProduitResume {
  const QuotaProduitResume({
    required this.id,
    required this.nomAr,
    required this.nomEn,
  });

  final String id;
  final String nomAr;
  final String nomEn;

  factory QuotaProduitResume.fromJson(Map<String, dynamic> json) =>
      QuotaProduitResume(
        id: json['id'] as String,
        nomAr: json['nom_ar'] as String,
        nomEn: json['nom_en'] as String,
      );
}

/// Miroir de `QuotaConsommationResume` (backend `quotas.types.ts`, réponse de
/// `GET /quotas/moi`). `produit == null` signifie un quota global (toutes
/// catégories), pas une absence de données.
class QuotaConsommation {
  const QuotaConsommation({
    required this.quotaId,
    required this.produitId,
    required this.produit,
    required this.periode,
    required this.periodeDebut,
    required this.periodeFin,
    required this.valeurMax,
    required this.valeurConsommee,
    required this.valeurRestante,
  });

  final String quotaId;
  final String? produitId;
  final QuotaProduitResume? produit;
  final String periode;
  final DateTime periodeDebut;
  final DateTime periodeFin;
  final double valeurMax;
  final double valeurConsommee;
  final double valeurRestante;

  factory QuotaConsommation.fromJson(Map<String, dynamic> json) {
    return QuotaConsommation(
      quotaId: json['quota_id'] as String,
      produitId: json['produit_id'] as String?,
      produit: json['produit'] == null
          ? null
          : QuotaProduitResume.fromJson(
              json['produit'] as Map<String, dynamic>,
            ),
      periode: json['periode'] as String,
      periodeDebut: DateTime.parse(json['periode_debut'] as String),
      periodeFin: DateTime.parse(json['periode_fin'] as String),
      valeurMax: (json['valeur_max'] as num).toDouble(),
      valeurConsommee: (json['valeur_consommee'] as num).toDouble(),
      valeurRestante: (json['valeur_restante'] as num).toDouble(),
    );
  }
}
