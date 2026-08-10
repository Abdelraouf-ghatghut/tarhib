import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';

final favoriteProductIdsProvider =
    StateNotifierProvider<FavoriteProductIdsNotifier, AsyncValue<Set<String>>>(
  (ref) => FavoriteProductIdsNotifier()..load(),
);

class FavoriteProductIdsNotifier extends StateNotifier<AsyncValue<Set<String>>> {
  FavoriteProductIdsNotifier() : super(const AsyncValue.loading());

  Future<void> load() async {
    state = const AsyncValue.loading();
    try {
      final resp = await ApiClient.rawDio.get<List<dynamic>>(
        '/products/favorites/ids',
      );
      final ids = (resp.data ?? const [])
          .map((value) => value.toString())
          .where((value) => value.isNotEmpty)
          .toSet();
      state = AsyncValue.data(ids);
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }

  Future<void> toggle(String productId) async {
    final current = state.value ?? const <String>{};
    final isFavorite = current.contains(productId);
    final optimistic = {...current};
    if (isFavorite) {
      optimistic.remove(productId);
    } else {
      optimistic.add(productId);
    }
    state = AsyncValue.data(optimistic);

    try {
      final resp = isFavorite
          ? await ApiClient.rawDio.delete<List<dynamic>>(
              '/products/$productId/favorite',
            )
          : await ApiClient.rawDio.post<List<dynamic>>(
              '/products/$productId/favorite',
            );
      final ids = (resp.data ?? const [])
          .map((value) => value.toString())
          .where((value) => value.isNotEmpty)
          .toSet();
      state = AsyncValue.data(ids);
    } catch (_) {
      state = AsyncValue.data(current);
    }
  }
}
