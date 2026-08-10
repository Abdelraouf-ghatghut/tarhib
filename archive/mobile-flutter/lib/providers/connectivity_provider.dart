import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// `true` = connecté à Internet, `false` = hors ligne.
final connectivityProvider = StreamProvider<bool>((ref) {
  return Connectivity().onConnectivityChanged.map(
    (results) => results.any(
      (r) => r != ConnectivityResult.none,
    ),
  );
});

/// Check ponctuel (non-stream) — utile pour les FutureProvider.
Future<bool> isOnline() async {
  final results = await Connectivity().checkConnectivity();
  return results.any((r) => r != ConnectivityResult.none);
}
