import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';

class ProductAvailability {
  final int quantity;
  final bool available;
  const ProductAvailability({required this.quantity, required this.available});
}

/// Disponibilité stock (branche de l'employé) — pas encore dans le client
/// généré (endpoint additif), appel brut comme pour les salles de réunion.
/// productId → disponibilité. Absence de clé = produit non trouvé en stock
/// pour cette branche (traité comme indisponible côté UI, par prudence).
final availabilityProvider =
    FutureProvider<Map<String, ProductAvailability>>((ref) async {
  final resp = await ApiClient.rawDio.get<List<dynamic>>('/products/availability');
  final raw = resp.data ?? [];
  return {
    for (final item in raw.cast<Map<String, dynamic>>())
      item['productId'] as String: ProductAvailability(
        quantity: (item['quantity'] as num?)?.round() ?? 0,
        available: item['available'] as bool? ?? false,
      ),
  };
});
