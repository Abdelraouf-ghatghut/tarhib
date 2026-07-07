import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart';

import '../api/api_client.dart';

const _storage = FlutterSecureStorage();
const _keyToken = 'auth_token';
const _keyRefreshToken = 'auth_refresh_token';
const _keyRole = 'auth_role';
const _keyEmail = 'auth_email';
const _keyRoleId = 'auth_role_id';
const _keyPermissions = 'auth_permissions';
const _keyScope = 'auth_scope';

class AuthState {
  final String? token;
  final String? refreshToken;
  final String? role;
  final String? roleId;
  final String? email;
  final String? scope;
  final List<String> permissions;
  final bool isLoading;
  final String? error;

  const AuthState({
    this.token,
    this.refreshToken,
    this.role,
    this.roleId,
    this.email,
    this.scope,
    this.permissions = const [],
    this.isLoading = false,
    this.error,
  });

  bool get isAuthenticated => token != null;

  /// Permission-based access check (new RBAC system)
  bool hasPermission(String key) => permissions.contains(key);

  /// Legacy helpers — kept for backward compat with existing screens
  bool get isAgent =>
      role == 'HOSPITALITY_AGENT' ||
      hasPermission('order.prepare') ||
      hasPermission('order.deliver');

  bool get isManager =>
      role == 'DEPARTMENT_MANAGER' || hasPermission('order.approve');

  bool get isTarhibStaff => scope == 'TARHIB';

  AuthState copyWith({
    String? token,
    String? refreshToken,
    String? role,
    String? roleId,
    String? email,
    String? scope,
    List<String>? permissions,
    bool? isLoading,
    String? error,
  }) =>
      AuthState(
        token: token ?? this.token,
        refreshToken: refreshToken ?? this.refreshToken,
        role: role ?? this.role,
        roleId: roleId ?? this.roleId,
        email: email ?? this.email,
        scope: scope ?? this.scope,
        permissions: permissions ?? this.permissions,
        isLoading: isLoading ?? this.isLoading,
        error: error ?? this.error,
      );
}

/// Le token d'accès est de courte durée. Sans rafraîchissement automatique,
/// toute session de plus de quelques minutes déclenchait une cascade de 401
/// (catalogue, commandes…). ApiClient rafraîchit désormais la session en
/// silence via /auth/refresh ; ce notifier se contente de persister les
/// nouveaux tokens ([_onTokenRefreshed]) et de se déconnecter proprement si
/// le refresh token est lui-même expiré ([_onSessionExpired]).
class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState()) {
    ApiClient.onSessionExpired = logout;
    ApiClient.onTokenRefreshed = _onTokenRefreshed;
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    final token = await _storage.read(key: _keyToken);
    if (token == null) return;
    final refreshToken = await _storage.read(key: _keyRefreshToken) ?? '';
    final role = await _storage.read(key: _keyRole) ?? 'EMPLOYEE';
    final roleId = await _storage.read(key: _keyRoleId);
    final email = await _storage.read(key: _keyEmail) ?? '';
    final scope = await _storage.read(key: _keyScope) ?? 'CLIENT';
    final permsRaw = await _storage.read(key: _keyPermissions) ?? '';
    final permissions = permsRaw.isEmpty ? <String>[] : permsRaw.split(',');
    ApiClient.setSession(token, refreshToken);
    state = AuthState(
      token: token,
      refreshToken: refreshToken,
      role: role,
      roleId: roleId,
      email: email,
      scope: scope,
      permissions: permissions,
    );
  }

  Future<void> _persist(AuthState s) async {
    if (s.token != null) {
      await _storage.write(key: _keyToken, value: s.token);
      await _storage.write(key: _keyRefreshToken, value: s.refreshToken ?? '');
      await _storage.write(key: _keyRole, value: s.role ?? '');
      await _storage.write(key: _keyRoleId, value: s.roleId ?? '');
      await _storage.write(key: _keyEmail, value: s.email ?? '');
      await _storage.write(key: _keyScope, value: s.scope ?? 'CLIENT');
      await _storage.write(key: _keyPermissions, value: s.permissions.join(','));
    }
  }

  /// Callback ApiClient : un rafraîchissement silencieux a réussi — on garde
  /// l'état (et le stockage sécurisé) synchronisés avec les nouveaux tokens.
  void _onTokenRefreshed(String accessToken, String refreshToken) {
    state = state.copyWith(token: accessToken, refreshToken: refreshToken);
    _persist(state);
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await ApiClient.rawDio.post<Map<String, dynamic>>(
        '/auth/login',
        data: {'email': email, 'password': password},
      );
      final data = response.data!;
      final token = data['accessToken'] as String;
      final refreshToken = data['refreshToken'] as String? ?? '';
      final role = data['role'] as String? ?? 'EMPLOYEE';
      final roleId = data['roleId'] as String?;
      final scope = data['scope'] as String? ?? 'CLIENT';
      final rawPerms = data['permissions'];
      final permissions = rawPerms is List
          ? rawPerms.cast<String>()
          : <String>[];

      ApiClient.setSession(token, refreshToken);
      final next = AuthState(
        token: token,
        refreshToken: refreshToken,
        role: role,
        roleId: roleId,
        email: email,
        scope: scope,
        permissions: permissions,
      );
      await _persist(next);
      state = next;
      _registerFcmToken();
      return true;
    } on DioException catch (e) {
      final msg = (e.response?.data as Map?)?['message'] as String? ?? 'error';
      state = state.copyWith(isLoading: false, error: msg);
      return false;
    }
  }

  /// Utilisé par le flux OTP — pas de refresh token disponible dans ce
  /// parcours, la session n'est donc pas rafraîchie automatiquement.
  Future<void> loginWithToken(String token) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      ApiClient.setToken(token);
      final resp = await ApiClient.rawDio.get<Map<String, dynamic>>('/auth/me');
      final data = resp.data ?? {};
      final role = data['role'] as String? ?? 'EMPLOYEE';
      final roleId = data['roleId'] as String?;
      final email = data['email'] as String? ?? data['phone'] as String? ?? '';
      final scope = data['scope'] as String? ?? 'CLIENT';
      final rawPerms = data['permissions'];
      final permissions = rawPerms is List ? rawPerms.cast<String>() : <String>[];

      final next = AuthState(
        token: token,
        role: role,
        roleId: roleId,
        email: email,
        scope: scope,
        permissions: permissions,
      );
      await _persist(next);
      state = next;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void setToken(String token, String role, String email) {
    ApiClient.setToken(token);
    final next = AuthState(token: token, role: role, email: email);
    _persist(next);
    state = next;
  }

  Future<void> logout() async {
    ApiClient.clearToken();
    await _storage.deleteAll();
    state = const AuthState();
  }

  /// Enregistre le token FCM de l'appareil côté backend.
  /// Appelé silencieusement après login — échec non bloquant.
  void _registerFcmToken() {
    FirebaseMessaging.instance.getToken().then((token) {
      if (token == null) return;
      ApiClient.rawDio
          .patch<void>('/auth/device-token', data: {'token': token})
          .catchError((_) {});
    }).catchError((_) {});
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  (_) => AuthNotifier(),
);

final localeProvider = StateProvider<Locale>((_) => const Locale('ar'));
