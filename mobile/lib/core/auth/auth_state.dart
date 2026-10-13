import '../../shared/models/utilisateur_profil.dart';
import 'app_role.dart';

enum AuthStatus { authentifie, nonAuthentifie }

/// État de session exposé par [AuthController]. `role == null` alors que
/// `statut == authentifie` signifie : le serveur a authentifié l'utilisateur
/// (profil récupéré avec succès) mais son rôle n'est pas pris en charge par
/// l'app mobile (cf. [AppRole]) — l'accès doit être refusé côté app malgré
/// l'authentification réussie.
class AuthState {
  const AuthState({required this.statut, this.role, this.profil});

  final AuthStatus statut;
  final AppRole? role;
  final UtilisateurProfil? profil;

  bool get estAuthentifie => statut == AuthStatus.authentifie && role != null;

  static const AuthState nonAuthentifie = AuthState(
    statut: AuthStatus.nonAuthentifie,
  );

  /// Le rôle utilisé pour le routage est celui renvoyé par l'API
  /// (`profil.role.code`, via `GET /utilisateurs/moi`), jamais une donnée
  /// déduite côté app seule.
  factory AuthState.authentifie(UtilisateurProfil profil) {
    return AuthState(
      statut: AuthStatus.authentifie,
      role: AppRole.depuisCodeRole(profil.role.code),
      profil: profil,
    );
  }
}
