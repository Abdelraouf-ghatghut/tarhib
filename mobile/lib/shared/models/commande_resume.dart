/// Statuts pour lesquels une commande est encore active du point de vue de
/// l'Employé (cf. `statut_commande` côté backend) — les autres (livrée,
/// refusée, annulée) sont des états terminaux, affichés dans l'historique,
/// pas dans le dashboard.
const statutsCommandeEnCours = {
  'en_attente',
  'en_attente_approbation',
  'validee',
  'en_preparation',
  'en_livraison',
};

class LigneCommandeResume {
  const LigneCommandeResume({
    required this.id,
    required this.produitId,
    required this.nomAr,
    required this.nomEn,
    required this.quantite,
    required this.prixUnitaireSnapshot,
  });

  final String id;
  final String produitId;
  final String nomAr;
  final String nomEn;
  final double quantite;
  final double prixUnitaireSnapshot;

  factory LigneCommandeResume.fromJson(Map<String, dynamic> json) {
    return LigneCommandeResume(
      id: json['id'] as String,
      produitId: json['produit_id'] as String,
      nomAr: json['nom_ar'] as String,
      nomEn: json['nom_en'] as String,
      quantite: (json['quantite'] as num).toDouble(),
      prixUnitaireSnapshot: (json['prix_unitaire_snapshot'] as num).toDouble(),
    );
  }
}

/// Miroir de `CommandeDetail` (backend `commandes.types.ts`, réponses de
/// `POST /orders`, `PATCH /orders/:id/status` et
/// `GET /orders/mine`).
class CommandeResume {
  const CommandeResume({
    required this.id,
    required this.statut,
    required this.priorite,
    required this.lieuLivraison,
    required this.salle,
    required this.heureSouhaitee,
    required this.commentaire,
    required this.createdAt,
    required this.lignes,
  });

  final String id;
  final String statut;
  final int priorite;
  final String? lieuLivraison;
  final String? salle;
  final DateTime? heureSouhaitee;
  final String? commentaire;
  final DateTime createdAt;
  final List<LigneCommandeResume> lignes;

  bool get estEnCours => statutsCommandeEnCours.contains(statut);

  factory CommandeResume.fromJson(Map<String, dynamic> json) {
    return CommandeResume(
      id: json['id'] as String,
      statut: json['statut'] as String,
      priorite: json['priorite'] as int,
      lieuLivraison: json['lieu_livraison'] as String?,
      salle: json['salle'] as String?,
      heureSouhaitee: json['heure_souhaitee'] == null
          ? null
          : DateTime.parse(json['heure_souhaitee'] as String),
      commentaire: json['commentaire'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      lignes: (json['lignes'] as List<dynamic>)
          .map((l) => LigneCommandeResume.fromJson(l as Map<String, dynamic>))
          .toList(),
    );
  }
}
