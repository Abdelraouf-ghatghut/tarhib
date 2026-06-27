import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tarhib_api_client/tarhib_api_client.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/cart_provider.dart';
import '../../providers/products_provider.dart';

/// TARHIB-12 — Catalogue produits commandables filtrés par rôle (backend)
class CatalogScreen extends ConsumerWidget {
  const CatalogScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final productsAsync = ref.watch(productsProvider);

    return productsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 12),
            Text(e.toString()),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () => ref.invalidate(productsProvider),
              child: Text(l.errorRetry),
            ),
          ],
        ),
      ),
      data: (products) {
        if (products.isEmpty) {
          return Center(child: Text(l.noOrders));
        }

        final byCategory = <String, List<ProductDto>>{};
        for (final p in products) {
          byCategory.putIfAbsent(p.category, () => []).add(p);
        }

        return CustomScrollView(
          slivers: [
            for (final entry in byCategory.entries) ...[
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
                  child: Text(
                    entry.key,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                sliver: SliverGrid.builder(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 0.85,
                  ),
                  itemCount: entry.value.length,
                  itemBuilder: (context, i) =>
                      _ProductCard(product: entry.value[i]),
                ),
              ),
            ],
          ],
        );
      },
    );
  }
}

class _ProductCard extends ConsumerWidget {
  final ProductDto product;
  const _ProductCard({required this.product});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context);
    final name = locale.languageCode == 'ar' ? product.nameAr : product.nameEn;
    final qty = ref.watch(
      cartProvider.select((lines) => lines
          .where((l) => l.productId == product.id)
          .fold(0, (s, l) => s + l.quantity)),
    );

    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: product.allowedRoles != null
                ? Container(
                    color: Theme.of(context).colorScheme.surfaceContainerHighest,
                    child: const Icon(Icons.local_cafe_outlined, size: 48),
                  )
                : Container(
                    color: Theme.of(context).colorScheme.primaryContainer,
                    child: const Icon(Icons.fastfood_outlined, size: 48),
                  ),
          ),
          Padding(
            padding: const EdgeInsets.all(8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    if (qty > 0) ...[
                      IconButton.filled(
                        iconSize: 18,
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(minWidth: 30, minHeight: 30),
                        onPressed: () =>
                            ref.read(cartProvider.notifier).decrement(product.id),
                        icon: const Icon(Icons.remove),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 6),
                        child: Text('$qty',
                            style: const TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ],
                    IconButton.filled(
                      iconSize: 18,
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(minWidth: 30, minHeight: 30),
                      onPressed: () =>
                          ref.read(cartProvider.notifier).add(product),
                      icon: const Icon(Icons.add),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
