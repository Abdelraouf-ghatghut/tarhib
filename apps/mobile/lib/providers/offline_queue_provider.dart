import 'dart:convert';

import 'package:drift/drift.dart' hide JsonKey;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../database/database_provider.dart';
import '../database/tarhib_database.dart';
import 'connectivity_provider.dart';

/// File d'attente Agent en mode offline-first.
///
/// Comportement :
/// - Connecté : appel API → cache Drift → retourne les données fraîches
/// - Déconnecté : retourne le cache Drift
/// - Si l'API échoue mais cache disponible : retourne le cache (dégradé gracieux)
final offlineAgentQueueProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final db = ref.read(databaseProvider);
  final online = await isOnline();

  if (online) {
    try {
      final resp = await ApiClient.rawDio.get<dynamic>('/orders');
      final raw = resp.data is List
          ? resp.data as List
          : (resp.data as Map<String, dynamic>?)?['data'] ?? <dynamic>[];

      final orders = (raw as List)
          .cast<Map<String, dynamic>>()
          .where((o) {
            final status = o['status']?.toString() ?? '';
            return {'PENDING', 'APPROVED', 'IN_PROGRESS'}.contains(status);
          })
          .toList()
        ..sort((a, b) {
          final pCmp = (a['priority']?.toString() ?? '').compareTo(
            b['priority']?.toString() ?? '',
          );
          if (pCmp != 0) return pCmp;
          return (a['createdAt']?.toString() ?? '').compareTo(
            b['createdAt']?.toString() ?? '',
          );
        });

      // Mettre à jour le cache Drift (upsert)
      await db.upsertOrders(
        orders.map((o) {
          return CachedOrdersCompanion(
            id: Value(o['id']?.toString() ?? ''),
            status: Value(o['status']?.toString() ?? ''),
            priority: Value(o['priority']?.toString() ?? ''),
            branchId: Value(
              (o['employee'] as Map?)?['branchId']?.toString() ??
                  o['branchId']?.toString(),
            ),
            companyId: Value(
              (o['employee'] as Map?)?['companyId']?.toString() ??
                  o['companyId']?.toString(),
            ),
            rawJson: Value(jsonEncode(o)),
            createdAt: Value(
              DateTime.tryParse(o['createdAt']?.toString() ?? '') ??
                  DateTime.now(),
            ),
          );
        }).toList(),
      );

      return orders;
    } catch (_) {
      // L'API a échoué malgré la connectivité → fallback cache
    }
  }

  // Mode dégradé — données du cache Drift
  final cached = await db.getActiveOrders();
  return cached
      .map((c) => jsonDecode(c.rawJson) as Map<String, dynamic>)
      .toList();
});

/// Invalide le cache et force un refresh depuis l'API.
/// Appelé au retour de connectivité.
final syncQueueProvider = Provider<AsyncValue<void>>((ref) {
  ref.listen(connectivityProvider, (prev, next) {
    next.whenData((online) {
      if (online && prev?.value == false) {
        ref.invalidate(offlineAgentQueueProvider);
      }
    });
  });
  return const AsyncValue.data(null);
});
