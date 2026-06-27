import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tarhib_api_client/tarhib_api_client.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/cart_provider.dart';
import '../../providers/products_provider.dart';
import '../../widgets/glass_card.dart';

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
        child: GlassCard(
          margin: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 12),
              Text(e.toString(), textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: () => ref.invalidate(productsProvider),
                icon: const Icon(Icons.refresh),
                label: Text(l.errorRetry),
              ),
            ],
          ),
        ),
      ),
      data: (products) {
        if (products.isEmpty) {
          return Center(
            child: GlassCard(
              margin: const EdgeInsets.all(32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.inventory_2_outlined,
                      size: 56, color: Colors.grey),
                  const SizedBox(height: 12),
                  Text(l.noOrders,
                      style: const TextStyle(color: Colors.grey)),
                ],
              ),
            ),
          );
        }

        final byCategory = <String, List<ProductDto>>{};
        for (final p in products) {
          byCategory.putIfAbsent(p.category, () => []).add(p);
        }

        return CustomScrollView(
          slivers: [
            const SliverPadding(padding: EdgeInsets.only(top: kToolbarHeight + 16)),
            for (final entry in byCategory.entries) ...[
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                  child: Text(
                    entry.key,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.primary,
                          letterSpacing: 0.5,
                        ),
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                sliver: SliverGrid.builder(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 14,
                    crossAxisSpacing: 14,
                    childAspectRatio: 0.82,
                  ),
                  itemCount: entry.value.length,
                  itemBuilder: (context, i) =>
                      _ProductCard(product: entry.value[i]),
                ),
              ),
            ],
            const SliverPadding(
                padding: EdgeInsets.only(bottom: kBottomNavigationBarHeight + 16)),
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
    final locale = Localizations.localeOf(context);
    final name = locale.languageCode == 'ar' ? product.nameAr : product.nameEn;
    final qty = ref.watch(
      cartProvider.select((lines) => lines
          .where((l) => l.productId == product.id)
          .fold(0, (s, l) => s + l.quantity)),
    );
    final color = Theme.of(context).colorScheme.primary;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GlassCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Product icon zone
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    color.withValues(alpha: isDark ? 0.3 : 0.12),
                    color.withValues(alpha: isDark ? 0.15 : 0.06),
                  ],
                ),
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(19),
                ),
              ),
              child: Center(
                child: Icon(
                  product.allowedRoles != null
                      ? Icons.local_cafe_rounded
                      : Icons.fastfood_rounded,
                  size: 52,
                  color: color.withValues(alpha: 0.85),
                ),
              ),
            ),
          ),
          // Info + controls
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    if (qty > 0) ...[
                      _SmallIconButton(
                        icon: Icons.remove,
                        onTap: () =>
                            ref.read(cartProvider.notifier).decrement(product.id),
                        color: color,
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: Text(
                          '$qty',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: color,
                            fontSize: 15,
                          ),
                        ),
                      ),
                    ],
                    _SmallIconButton(
                      icon: Icons.add,
                      onTap: () =>
                          ref.read(cartProvider.notifier).add(product),
                      color: color,
                      filled: true,
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

class _SmallIconButton extends StatelessWidget {
  const _SmallIconButton({
    required this.icon,
    required this.onTap,
    required this.color,
    this.filled = false,
  });

  final IconData icon;
  final VoidCallback onTap;
  final Color color;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 30,
        height: 30,
        decoration: BoxDecoration(
          color: filled ? color : color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Icon(
          icon,
          size: 16,
          color: filled ? Colors.white : color,
        ),
      ),
    );
  }
}
