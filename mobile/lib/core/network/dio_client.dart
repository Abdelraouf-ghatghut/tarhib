import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_controller.dart';
import '../storage/secure_storage_service.dart';
import 'api_config.dart';
import 'auth_interceptor.dart';

/// Dio « nu », sans intercepteur : utilisé pour `/auth/login` et pour le
/// mécanisme de refresh lui-même (cf. [AuthInterceptor]).
final dioPublicProvider = Provider<Dio>((ref) {
  return Dio(BaseOptions(baseUrl: ApiConfig.baseUrl));
});

/// Dio applicatif : ajoute le JWT et déclenche le refresh automatique sur
/// 401. À utiliser pour tous les appels authentifiés (catalogue, commandes...).
final dioProvider = Provider<Dio>((ref) {
  final secureStorage = ref.watch(secureStorageProvider);
  final dioRefresh = ref.watch(dioPublicProvider);

  final dio = Dio(BaseOptions(baseUrl: ApiConfig.baseUrl));
  dio.interceptors.add(
    AuthInterceptor(
      secureStorage: secureStorage,
      dioRefresh: dioRefresh,
      onSessionExpiree: () =>
          ref.read(authControllerProvider.notifier).deconnecter(),
    ),
  );
  return dio;
});
