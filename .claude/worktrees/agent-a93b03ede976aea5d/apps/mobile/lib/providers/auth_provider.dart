import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';

import '../api/api_client.dart';

class AuthState {
  final String? token;
  final String? role;
  final String? email;
  final bool isLoading;
  final String? error;

  const AuthState({
    this.token,
    this.role,
    this.email,
    this.isLoading = false,
    this.error,
  });

  bool get isAuthenticated => token != null;
  bool get isAgent => role == 'HOSPITALITY_AGENT';
  bool get isManager => role == 'DEPARTMENT_MANAGER';

  AuthState copyWith({
    String? token,
    String? role,
    String? email,
    bool? isLoading,
    String? error,
  }) =>
      AuthState(
        token: token ?? this.token,
        role: role ?? this.role,
        email: email ?? this.email,
        isLoading: isLoading ?? this.isLoading,
        error: error ?? this.error,
      );
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState());

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await ApiClient.rawDio.post<Map<String, dynamic>>(
        '/auth/login',
        data: {'email': email, 'password': password},
      );
      final data = response.data!;
      final token = data['accessToken'] as String;
      final role = data['role'] as String? ?? 'EMPLOYEE';

      ApiClient.setToken(token);
      state = AuthState(token: token, role: role, email: email, isLoading: false);
      return true;
    } on DioException catch (e) {
      final msg = (e.response?.data as Map?)?['message'] as String? ?? 'error';
      state = state.copyWith(isLoading: false, error: msg);
      return false;
    }
  }

  void logout() {
    ApiClient.clearToken();
    state = const AuthState();
  }

  /// Used by deep-link / token injection (dev/test)
  void setToken(String token, String role, String email) {
    ApiClient.setToken(token);
    state = AuthState(token: token, role: role, email: email);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  (_) => AuthNotifier(),
);

final localeProvider = StateProvider<Locale>((_) => const Locale('ar'));
