import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tarhib_api_client/tarhib_api_client.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/cart_provider.dart';
import '../../providers/products_provider.dart';
import '../../widgets/glass_card.dart';

// Category accent colors — 10% rule: brand accent only on key UI elements
const _categoryColors = {
  'Boissons': Color(0xFF29B6F6),
  'Snacks': Color(0xFFFFCA28),
  'Repas': Color(0xFF66BB6A),
  'Desserts': Color(0xFFEC407A),
  'Café': Color(0xFF8D6E63),
};

Color _colorFor(String cat) =>
    _categoryColors[cat] ?? const Color(0xFF78909C);

/// TARHIB-12 — Catalogue produits commandables filtrés par rôle (backend)
class CatalogScreen extends ConsumerStatefulWidget {
  const CatalogScreen({super.key});

  @override
  ConsumerState<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends ConsumerState<CatalogScreen> {
  String? _activeCategory;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final productsAsync = ref.watch(productsProvider);

    return productsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => _ErrorState(
        message: e.toString(),
        onRetry: () => ref.invalidate(productsProvider),
        l: l,
      ),
      data: (products) {
        if (products.isEmpty) return _EmptyState(l: l);

        final byCategory = <String, List<ProductDto>>{};
        for (final p in products) {
          byCategory.putIfAbsent(p.category, () => []).add(p);
        }
        final categories = byCategory.keys.toList();

        final displayMap = _activeCategory != null
            ? {_activeCategory!: byCategory[_activeCategory!]!}
            : byCategory;

        return CustomScrollView(
          slivers: [
            // Top padding for glass app bar
            const SliverPadding(
                padding: EdgeInsets.only(top: kToolbarHeight + 16)),

            // ── Category filter chips ──
            SliverToBoxAdapter(
              child: SizedBox(
                height: 40,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: categories.length + 1,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (ctx, i) {
                    if (i == 0) {
                      final allSelected = _activeCategory == null;
                      return _CategoryChip(
                        label: l.all,
                        color: Theme.of(context).colorScheme.primary,
                        selected: allSelected,
                        onTap: () =>
                            setState(() => _activeCategory = null),
                      );
                    }
                    final cat = categories[i - 1];
                    return _CategoryChip(
                      label: cat,
                      color: _colorFor(cat),
                      selected: _activeCategory == cat,
                      onTap: () => setState(
                        () => _activeCategory =
                            (_activeCategory == cat) ? null : cat,
                      ),
                    );
                  },
                ),
              ),
            ),
            const SliverPadding(padding: EdgeInsets.only(top: 16)),

            // ── Product grid per category ──
            for (final entry in displayMap.entries) ...[
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
                  child: Row(
                    children: [
                      Container(
                        width: 4,
                        height: 18,
                        decoration: BoxDecoration(
                          color: _colorFor(entry.key),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        entry.key,
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.3,
                                ),
                      ),
                      const SizedBox(width: 8),
                      // item count — secondary, 60% opacity
                      Text(
                        '${entry.value.length}',
                        style: TextStyle(
                          fontSize: 13,
                          color: Theme.of(context)
                              .colorScheme
                              .onSurface
                              .withValues(alpha: 0.45),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              SliverPadding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14),
                sliver: SliverGrid.builder(
                  gridDelegate:
                      const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 14,
                    crossAxisSpacing: 14,
                    childAspectRatio: 0.80,
                  ),
                  itemCount: entry.value.length,
                  itemBuilder: (context, i) => _ProductCard(
                    product: entry.value[i],
                    accentColor: _colorFor(entry.key),
                  ),
                ),
              ),
              const SliverPadding(padding: EdgeInsets.only(top: 8)),
            ],
            const SliverPadding(
                padding: EdgeInsets.only(
                    bottom: kBottomNavigationBarHeight + 24)),
          ],
        );
      },
    );
  }
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({
    required this.label,
    required this.color,
    required this.selected,
    required this.onTap,
  });
  final String label;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOut,
        padding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: selected
              ? color
              : color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: selected
                ? color
                : color.withValues(alpha: 0.3),
            width: selected ? 0 : 1,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: selected
                ? Colors.white
                : color,
            height: 1,
          ),
        ),
      ),
    );
  }
}

class _ProductCard extends ConsumerWidget {
  final ProductDto product;
  final Color accentColor;
  const _ProductCard(
      {required this.product, required this.accentColor});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = Localizations.localeOf(context);
    final name =
        locale.languageCode == 'ar' ? product.nameAr : product.nameEn;
    final qty = ref.watch(
      cartProvider.select((lines) => lines
          .where((l) => l.productId == product.id)
          .fold(0, (s, l) => s + l.quantity)),
    );
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GlassCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Icon zone — soft tinted background per category
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: accentColor.withValues(
                    alpha: isDark ? 0.22 : 0.10),
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(19),
                ),
              ),
              child: Stack(
                children: [
                  Center(
                    child: Text(
                      _emojiFor(product.category),
                      style: const TextStyle(fontSize: 48),
                    ),
                  ),
                  // Cart quantity badge (top-right)
                  if (qty > 0)
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        width: 24,
                        height: 24,
                        decoration: BoxDecoration(
                          color: accentColor,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: accentColor.withValues(alpha: 0.4),
                              blurRadius: 8,
                            ),
                          ],
                        ),
                        child: Center(
                          child: Text(
                            '$qty',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),

          // Name + controls — 8pt internal padding
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
                const SizedBox(height: 10),
                // Stepper row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    if (qty > 0) ...[
                      _StepButton(
                        icon: Icons.remove,
                        color: accentColor,
                        onTap: () => ref
                            .read(cartProvider.notifier)
                            .decrement(product.id),
                      ),
                      Text(
                        '$qty',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: accentColor,
                          fontSize: 16,
                        ),
                      ),
                    ] else
                      const Spacer(),
                    _StepButton(
                      icon: Icons.add,
                      color: accentColor,
                      filled: true,
                      onTap: () =>
                          ref.read(cartProvider.notifier).add(product),
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

  static String _emojiFor(String cat) {
    switch (cat) {
      case 'Boissons':
        return '🥤';
      case 'Café':
        return '☕';
      case 'Snacks':
        return '🍿';
      case 'Repas':
        return '🍽️';
      case 'Desserts':
        return '🍰';
      default:
        return '📦';
    }
  }
}

class _StepButton extends StatelessWidget {
  const _StepButton({
    required this.icon,
    required this.color,
    required this.onTap,
    this.filled = false,
  });
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: filled ? color : color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(999),
          boxShadow: filled
              ? [
                  BoxShadow(
                    color: color.withValues(alpha: 0.35),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
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

// ── Stateful empty / error states ──

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.l});
  final AppLocalizations l;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: GlassCard(
        margin: const EdgeInsets.symmetric(horizontal: 32),
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('🛒', style: TextStyle(fontSize: 56)),
            const SizedBox(height: 16),
            Text(
              l.noOrders,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState(
      {required this.message,
      required this.onRetry,
      required this.l});
  final String message;
  final VoidCallback onRetry;
  final AppLocalizations l;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: GlassCard(
        margin: const EdgeInsets.symmetric(horizontal: 24),
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('⚠️', style: TextStyle(fontSize: 48)),
            const SizedBox(height: 16),
            Text(message,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 13)),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded),
              label: Text(l.errorRetry),
            ),
          ],
        ),
      ),
    );
  }
}
