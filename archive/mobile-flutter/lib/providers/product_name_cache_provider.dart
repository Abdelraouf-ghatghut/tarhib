import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'products_provider.dart';

typedef ProductInfo = ({String nameAr, String nameEn, String category});

/// productId → {nameAr, nameEn, category} — resolved once from /products
final productNameCacheProvider =
    FutureProvider<Map<String, ProductInfo>>((ref) async {
  final products = await ref.watch(productsProvider.future);
  return {
    for (final p in products)
      p.id: (nameAr: p.nameAr, nameEn: p.nameEn, category: p.category),
  };
});
