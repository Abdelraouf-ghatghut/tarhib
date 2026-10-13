class CategorieResume {
  const CategorieResume({
    required this.id,
    required this.nomAr,
    required this.nomEn,
  });

  final String id;
  final String nomAr;
  final String nomEn;

  factory CategorieResume.fromJson(Map<String, dynamic> json) =>
      CategorieResume(
        id: json['id'] as String,
        nomAr: json['nom_ar'] as String,
        nomEn: json['nom_en'] as String,
      );
}

/// Miroir de `ProduitCatalogue` (backend `catalogue.types.ts`, réponse de
/// `GET /catalogue`).
class Produit {
  const Produit({
    required this.id,
    required this.nomAr,
    required this.nomEn,
    required this.descriptionAr,
    required this.descriptionEn,
    required this.uniteMesure,
    required this.prixUnitaire,
    required this.imageUrl,
    required this.categorie,
  });

  final String id;
  final String nomAr;
  final String nomEn;
  final String? descriptionAr;
  final String? descriptionEn;
  final String uniteMesure;
  final double prixUnitaire;
  final String? imageUrl;
  final CategorieResume? categorie;

  factory Produit.fromJson(Map<String, dynamic> json) {
    return Produit(
      id: json['id'] as String,
      nomAr: json['nom_ar'] as String,
      nomEn: json['nom_en'] as String,
      descriptionAr: json['description_ar'] as String?,
      descriptionEn: json['description_en'] as String?,
      uniteMesure: json['unite_mesure'] as String,
      prixUnitaire: (json['prix_unitaire'] as num).toDouble(),
      imageUrl: json['image_url'] as String?,
      categorie: json['categorie'] == null
          ? null
          : CategorieResume.fromJson(json['categorie'] as Map<String, dynamic>),
    );
  }
}
