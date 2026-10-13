import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Stockage des tokens de session. Jamais `shared_preferences` pour ces
/// valeurs (cf. cahier des charges §13 — Keychain/Keystore uniquement).
class SecureStorageService {
  SecureStorageService(this._storage);

  final FlutterSecureStorage _storage;

  static const _cleAccessToken = 'access_token';
  static const _cleRefreshToken = 'refresh_token';

  Future<void> enregistrerTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _storage.write(key: _cleAccessToken, value: accessToken);
    await _storage.write(key: _cleRefreshToken, value: refreshToken);
  }

  Future<String?> lireAccessToken() => _storage.read(key: _cleAccessToken);

  Future<String?> lireRefreshToken() => _storage.read(key: _cleRefreshToken);

  Future<void> effacer() async {
    await _storage.delete(key: _cleAccessToken);
    await _storage.delete(key: _cleRefreshToken);
  }
}

final secureStorageProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService(const FlutterSecureStorage());
});
