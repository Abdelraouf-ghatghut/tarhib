import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:tarhib_api_client/tarhib_api_client.dart';

class ApiClient {
  static String _jwtToken = '';

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
    ));

    return dio;
  }

  static void setToken(String token) => _jwtToken = token;
  static void clearToken() => _jwtToken = '';

  /// Raw Dio for endpoints not in the generated client (status patch, login)
  static Dio get rawDio => _dio;

  static ProductsApi get products => ProductsApi(_dio, standardSerializers);
  static OrdersApi get orders => OrdersApi(_dio, standardSerializers);
  static QuotasApi get quotas => QuotasApi(_dio, standardSerializers);
}
