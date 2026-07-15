import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/cart_provider.dart';
import '../../providers/favorites_provider.dart';
import '../../providers/products_provider.dart';
import '../../theme/snow_colors.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_card.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/skeleton_loader.dart';

class FavoritesScreen extends ConsumerWidget {
  const FavoritesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context);
    final productsAsync = ref.watch(productsProvider);
    final favoritesAsync = ref.watch(favoriteProductIdsProvider);

    return productsAsync.when(
      loading: () => const CatalogSkeletonGrid(),
      error: (error, _) => ErrorCard(
        error: error,
        onRetry: () => ref.invalidate(productsProvider),
      ),
      data: (products) {
        final favoriteIds = favoritesAsync.value ?? const <String>{};
        final favorites = products
            .where((product) => favoriteIds.contains(product.id))
            .toList();

        if (favorites.isEmpty) {
          return EmptyState(
            type: EmptyStateType.catalog,
            title: locale.languageCode == 'ar'
                ? 'لا توجد منتجات مفضلة'
                : 'No favorite products',
            subtitle: locale.languageCode == 'ar'
                ? 'أضف المنتجات التي تطلبها كثيرا للوصول إليها بسرعة.'
                : 'Mark products you order often to reach them quickly.',
          );
        }

        return RefreshIndicator(
          onRefresh: () =>
              ref.read(favoriteProductIdsProvider.notifier).load(),
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, kToolbarHeight + 24, 16, 120),
            itemCount: favorites.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final product = favorites[index];
              final name =
                  locale.languageCode == 'ar' ? product.nameAr : product.nameEn;
              final qty = ref.watch(
                cartProvider.select((lines) => lines
                    .where((line) => line.productId == product.id)
                    .fold(0, (sum, line) => sum + line.quantity)),
              );

              return GlassCard(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Container(
                      width: 54,
                      height: 54,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: SnowColors.primarySoft,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Icon(
                        Icons.restaurant_menu_rounded,
                        color: SnowColors.primaryStrong,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            name,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            product.category,
                            style: const TextStyle(
                              color: SnowColors.textMuted,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: 'Favorite',
                      onPressed: () => ref
                          .read(favoriteProductIdsProvider.notifier)
                          .toggle(product.id),
                      icon: const Icon(
                        Icons.favorite_rounded,
                        color: SnowColors.danger,
                      ),
                    ),
                    if (qty > 0)
                      Text(
                        '$qty',
                        style: const TextStyle(
                          color: SnowColors.primaryStrong,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    IconButton.filled(
                      tooltip: l.addToCart,
                      onPressed: () =>
                          ref.read(cartProvider.notifier).add(product),
                      icon: const Icon(Icons.add_shopping_cart_rounded),
                    ),
                  ],
                ),
              );
            },
          ),
        );
      },
    );
  }
}
