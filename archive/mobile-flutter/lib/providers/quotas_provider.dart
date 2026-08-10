import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tarhib_api_client/tarhib_api_client.dart';

import '../api/api_client.dart';

final quotasProvider = FutureProvider<List<QuotaDto>>((ref) async {
  final response = await ApiClient.quotas.quotasControllerFindAll();
  return response.data?.toList() ?? [];
});

/// productId → (remaining, max) for the current period
final quotaCacheProvider =
    FutureProvider<Map<String, ({int remaining, int max})>>((ref) async {
  final quotas = await ref.watch(quotasProvider.future);
  final map = <String, ({int remaining, int max})>{};
  for (final q in quotas) {
    final remaining = (q.maxQuantity - q.usedQuantity).round().clamp(0, q.maxQuantity.round());
    map[q.productId] = (remaining: remaining, max: q.maxQuantity.round());
  }
  return map;
});
