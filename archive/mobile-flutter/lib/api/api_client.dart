import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart'
    show VoidCallback, debugPrint, kDebugMode, kIsWeb;
import 'package:tarhib_api_client/tarhib_api_client.dart';

/// Le token d'accès est de courte durée (quelques minutes, comme côté Web
/// Admin). Sans rafraîchissement, chaque requête après expiration renvoyait
/// un 401 — d'où le flot d'exceptions. Ce client rafraîchit désormais la
/// session automatiquement via /auth/refresh (même contrat que le Web
/// Admin, en passant refreshToken dans le corps plutôt que par cookie),
/// puis rejoue la requête d'origine. Si le refresh échoue, [onSessionExpired]
/// déclenche une déconnexion propre au lieu de laisser les 401 s'accumuler.
class ApiClient {
  static String _jwtToken = '';
  static String _refreshToken = '';

  /// Appelé quand le refresh token est lui-même invalide/expiré — l'appelant
  /// doit se reconnecter (AuthNotifier.logout, câblé au démarrage).
  static VoidCallback? onSessionExpired;

  /// Appelé après un rafraîchissement silencieux réussi, pour persister les
  /// nouveaux tokens (sinon un redémarrage de l'app utiliserait l'ancien
  /// access token déjà expiré).
  static void Function(String accessToken, String refreshToken)? onTokenRefreshed;

  static Future<String>? _refreshing;

  static final Dio _dio = _buildDio();

  static Dio _buildDio() {
    final dio = Dio(BaseOptions(
      baseUrl: kIsWeb ? 'http://localhost:3000' : 'http://10.0.2.2:3000',
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
    ));

    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (_jwtToken.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $_jwtToken';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (kDebugMode) {
          final status = error.response?.statusCode;
          final method = error.requestOptions.method;
          final uri = error.requestOptions.uri;
          debugPrint('[API] $method $uri -> $status ${error.type}');
          final data = error.response?.data;
          if (data != null) {
            debugPrint('[API] response: $data');
          }
        }

        final path = error.requestOptions.path;
        final isAuthCall = path.contains('/auth/login') ||
            path.contains('/auth/refresh') ||
            path.contains('/auth/otp/');

        if (error.response?.statusCode != 401 ||
            isAuthCall ||
            _refreshToken.isEmpty) {
          return handler.next(error);
        }

        try {
          final newAccessToken = await _refreshAccessToken();
          final retryOptions = error.requestOptions;
          retryOptions.headers['Authorization'] = 'Bearer $newAccessToken';
          final response = await dio.fetch<dynamic>(retryOptions);
          return handler.resolve(response);
        } catch (_) {
          setSession('', '');
          onSessionExpired?.call();
          return handler.next(error);
        }
      },
    ));

    return dio;
  }

  /// Un seul refresh en vol même si plusieurs requêtes 401 arrivent en même
  /// temps (évite d'invalider N fois le même refresh token en parallèle).
  static Future<String> _refreshAccessToken() {
    return _refreshing ??= _doRefresh().whenComplete(() => _refreshing = null);
  }

  static Future<String> _doRefresh() async {
    final plain = Dio(BaseOptions(baseUrl: _dio.options.baseUrl));
    final resp = await plain.post<Map<String, dynamic>>(
      '/auth/refresh',
      data: {'refreshToken': _refreshToken},
    );
    final data = resp.data!;
    final accessToken = data['accessToken'] as String;
    final refreshToken = data['refreshToken'] as String? ?? _refreshToken;
    setSession(accessToken, refreshToken);
    onTokenRefreshed?.call(accessToken, refreshToken);
    return accessToken;
  }

  /// Définit la session (access + refresh token) après login ou refresh.
  static void setSession(String accessToken, String refreshToken) {
    _jwtToken = accessToken;
    _refreshToken = refreshToken;
  }

  /// Conservé pour compat — préférer [setSession] (nécessite le refresh token
  /// pour que le rafraîchissement automatique fonctionne).
  static void setToken(String token) => _jwtToken = token;

  static void clearToken() {
    _jwtToken = '';
    _refreshToken = '';
  }

  static String get baseUrl =>
      kIsWeb ? 'http://localhost:3000' : 'http://10.0.2.2:3000';

  /// Raw Dio for endpoints not in the generated client (status patch, login)
  static Dio get rawDio => _dio;

  static ProductsApi get products => ProductsApi(_dio, standardSerializers);
  static OrdersApi get orders => OrdersApi(_dio, standardSerializers);
  static QuotasApi get quotas => QuotasApi(_dio, standardSerializers);
}
