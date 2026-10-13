class EntrepriseResume {
  const EntrepriseResume({required this.id, required this.nom});

  final String id;
  final String nom;

  factory EntrepriseResume.fromJson(Map<String, dynamic> json) =>
      EntrepriseResume(id: json['id'] as String, nom: json['nom'] as String);
}

class SiteResume {
  const SiteResume({required this.id, required this.nom});

  final String id;
  final String nom;

  factory SiteResume.fromJson(Map<String, dynamic> json) =>
      SiteResume(id: json['id'] as String, nom: json['nom'] as String);
}

class DepartementResume {
  const DepartementResume({required this.id, required this.nom});

  final String id;
  final String nom;

  factory DepartementResume.fromJson(Map<String, dynamic> json) =>
      DepartementResume(id: json['id'] as String, nom: json['nom'] as String);
}

class RoleResume {
  const RoleResume({
    required this.id,
    required this.code,
    required this.nom,
    required this.niveauPriorite,
  });

  final String id;
  final String code;
  final String nom;
  final int niveauPriorite;

  factory RoleResume.fromJson(Map<String, dynamic> json) => RoleResume(
    id: json['id'] as String,
    code: json['code'] as String,
    nom: json['nom'] as String,
    niveauPriorite: json['niveau_priorite'] as int,
  );
}

/// Miroir de `ProfilUtilisateur` (backend `utilisateurs.service.ts`,
/// réponse de `GET /utilisateurs/moi`).
class UtilisateurProfil {
  const UtilisateurProfil({
    required this.id,
    required this.nom,
    required this.prenom,
    required this.email,
    required this.telephone,
    required this.actif,
    required this.entreprise,
    required this.site,
    required this.departement,
    required this.role,
    required this.permissions,
  });

  final String id;
  final String nom;
  final String prenom;
  final String? email;
  final String? telephone;
  final bool actif;
  final EntrepriseResume entreprise;
  final SiteResume? site;
  final DepartementResume? departement;
  final RoleResume role;
  final List<String> permissions;

  factory UtilisateurProfil.fromJson(Map<String, dynamic> json) {
    return UtilisateurProfil(
      id: json['id'] as String,
      nom: json['nom'] as String,
      prenom: json['prenom'] as String,
      email: json['email'] as String?,
      telephone: json['telephone'] as String?,
      actif: json['actif'] as bool,
      entreprise: EntrepriseResume.fromJson(
        json['entreprise'] as Map<String, dynamic>,
      ),
      site: json['site'] == null
          ? null
          : SiteResume.fromJson(json['site'] as Map<String, dynamic>),
      departement: json['departement'] == null
          ? null
          : DepartementResume.fromJson(
              json['departement'] as Map<String, dynamic>,
            ),
      role: RoleResume.fromJson(json['role'] as Map<String, dynamic>),
      permissions: (json['permissions'] as List<dynamic>).cast<String>(),
    );
  }
}
