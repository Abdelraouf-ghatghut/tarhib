import 'package:dio/dio.dart';
import 'package:tarhib_api_client/tarhib_api_client.dart';

class ApiClient {
  /// JWT token injecté dans chaque requête si non vide.
  /// Appeler [ApiClient.setToken] après connexion Keycloak/OTP.
  static String _jwtToken = '';

  static final Dio _dio = _buildDio();

  static Dio _buildDio() {
    final dio = Dio(BaseOptions(
      baseUrl: 'http://localhost:3000',
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
    ));

    return dio;
  }

  static void setToken(String token) => _jwtToken = token;
  static void clearToken() => _jwtToken = '';

  static ProductsApi get products => ProductsApi(_dio, standardSerializers);
  static OrdersApi get orders => OrdersApi(_dio, standardSerializers);
  static QuotasApi get quotas => QuotasApi(_dio, standardSerializers);
}
