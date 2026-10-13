import 'dart:async';

import 'package:dio/dio.dart';

import '../storage/secure_storage_service.dart';

/// Ajoute le JWT sur chaque requête et déclenche le refresh automatique sur
/// 401. `QueuedInterceptor` (et non `Interceptor`) est nécessaire : si
/// plusieurs requêtes échouent en 401 simultanément, leurs `onError` sont
/// sérialisés plutôt qu'exécutés en parallèle — sans ça, deux refresh
/// concurrents tenteraient d'utiliser le même refresh token, qui est à usage
/// unique côté backend (rotation, cf. `AuthService.refresh`), et le second
/// échouerait à tort.
class AuthInterceptor extends QueuedInterceptor {
  AuthInterceptor({
    required this.secureStorage,
    required this.dioRefresh,
    required this.onSessionExpiree,
  });

  final SecureStorageService secureStorage;

  /// Dio *sans* intercepteur, dédié à l'appel `/auth/refresh` et à la
  /// ré-émission de la requête initiale — évite toute ré-entrance dans cet
  /// intercepteur depuis lui-même.
  final Dio dioRefresh;

  final FutureOr<void> Function() onSessionExpiree;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final accessToken = await secureStorage.lireAccessToken();
    if (accessToken != null) {
      options.headers['Authorization'] = 'Bearer $accessToken';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final estEchecAuthentification = err.response?.statusCode == 401;
    final cibleUnEndpointAuth =
        err.requestOptions.path.contains('/auth/login') ||
        err.requestOptions.path.contains('/auth/refresh');

    if (!estEchecAuthentification || cibleUnEndpointAuth) {
      handler.next(err);
      return;
    }

    try {
      final refreshToken = await secureStorage.lireRefreshToken();
      if (refreshToken == null) {
        throw err;
      }

      final reponseRefresh = await dioRefresh.post<Map<String, dynamic>>(
        '/auth/refresh',
        data: {'refresh_token': refreshToken},
      );
      final nouvelAccessToken = reponseRefresh.data!['access_token'] as String;
      final nouveauRefreshToken =
          reponseRefresh.data!['refresh_token'] as String;
      await secureStorage.enregistrerTokens(
        accessToken: nouvelAccessToken,
        refreshToken: nouveauRefreshToken,
      );

      final requeteOriginale = err.requestOptions;
      requeteOriginale.headers['Authorization'] = 'Bearer $nouvelAccessToken';
      final reponse = await dioRefresh.fetch<dynamic>(requeteOriginale);
      handler.resolve(reponse);
    } catch (_) {
      await secureStorage.effacer();
      await onSessionExpiree();
      handler.next(err);
    }
  }
}
