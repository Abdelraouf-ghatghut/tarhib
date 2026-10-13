import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/models/utilisateur_profil.dart';
import '../network/dio_client.dart';
import '../storage/secure_storage_service.dart';
import 'auth_exceptions.dart';
import 'auth_state.dart';

/// Session de l'utilisateur. La restauration au démarrage (lecture du secure
/// storage + récupération du profil) est asynchrone, d'où `AsyncNotifier`
/// plutôt que `Notifier`.
class AuthController extends AsyncNotifier<AuthState> {
  @override
  Future<AuthState> build() async {
    final secureStorage = ref.read(secureStorageProvider);
    final accessToken = await secureStorage.lireAccessToken();
    final refreshToken = await secureStorage.lireRefreshToken();

    if (accessToken == null || refreshToken == null) {
      return AuthState.nonAuthentifie;
    }

    // L'access token a pu expirer depuis le dernier lancement : on ne vérifie
    // pas son expiration ici. Si l'appel échoue en 401, l'intercepteur dio
    // tente un refresh automatique (cf. AuthInterceptor) avant qu'on échoue ici.
    try {
      final profil = await _recupererProfil();
      return AuthState.authentifie(profil);
    } catch (_) {
      await secureStorage.effacer();
      return AuthState.nonAuthentifie;
    }
  }

  Future<void> connecter({
    required String identifiant,
    required String motDePasse,
  }) async {
    state = const AsyncLoading();

    final dioPublic = ref.read(dioPublicProvider);
    final secureStorage = ref.read(secureStorageProvider);

    try {
      final reponse = await dioPublic.post<Map<String, dynamic>>(
        '/auth/login',
        data: {'identifiant': identifiant, 'mot_de_passe': motDePasse},
      );

      // Les tokens doivent être enregistrés avant l'appel du profil : c'est
      // l'intercepteur dio (cf. dio_client.dart) qui lit le secure storage
      // pour ajouter l'en-tête Authorization.
      await secureStorage.enregistrerTokens(
        accessToken: reponse.data!['access_token'] as String,
        refreshToken: reponse.data!['refresh_token'] as String,
      );

      final profil = await _recupererProfil();
      final nouvelEtat = AuthState.authentifie(profil);

      if (nouvelEtat.role == null) {
        await secureStorage.effacer();
        state = const AsyncData(AuthState.nonAuthentifie);
        throw RoleNonSupporteParAppException(profil.role.code);
      }

      state = AsyncData(nouvelEtat);
    } catch (erreur, pile) {
      if (erreur is! RoleNonSupporteParAppException) {
        await secureStorage.effacer();
        state = AsyncError(erreur, pile);
      }
      rethrow;
    }
  }

  Future<void> deconnecter() async {
    await ref.read(secureStorageProvider).effacer();
    state = const AsyncData(AuthState.nonAuthentifie);
  }

  Future<UtilisateurProfil> _recupererProfil() async {
    final dio = ref.read(dioProvider);
    final reponse = await dio.get<Map<String, dynamic>>('/users/me');
    return UtilisateurProfil.fromJson(reponse.data!);
  }
}

final authControllerProvider = AsyncNotifierProvider<AuthController, AuthState>(
  AuthController.new,
);
