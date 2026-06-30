import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tarhib_api_client/tarhib_api_client.dart';

import '../../api/api_client.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/cart_provider.dart';
import '../../providers/products_provider.dart';
import '../../providers/quotas_provider.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_card.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/skeleton_loader.dart';

const _categoryColors = {
  'Boissons': Color(0xFF29B6F6),
  'Snacks': Color(0xFFFFCA28),
  'Repas': Color(0xFF66BB6A),
  'Desserts': Color(0xFFEC407A),
  'Café': Color(0xFF8D6E63),
};

Color _colorFor(String cat) =>
    _categoryColors[cat] ?? const Color(0xFF78909C);

String _emojiFor(String cat) => switch (cat) {
      'Boissons' => '🥤',
      'Café' => '☕',
      'Snacks' => '🍿',
      'Repas' => '🍽️',
      'Desserts' => '🍰',
      _ => '📦',
    };

/// TARHIB-12 — Catalogue + recherche + quotas + fiche produit (bottom sheet)
class CatalogScreen extends ConsumerStatefulWidget {
  const CatalogScreen({super.key});

  @override
  ConsumerState<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends ConsumerState<CatalogScreen> {
  String? _activeCategory;
  String _search = '';
  bool _searchOpen = false;
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final productsAsync = ref.watch(productsProvider);

    return productsAsync.when(
      loading: () => const CatalogSkeletonGrid(),
      error: (e, _) => ErrorCard(
        error: e,
        onRetry: () => ref.invalidate(productsProvider),
      ),
      data: (products) {
        // Apply search filter
        final filtered = _search.isEmpty
            ? products
            : products.where((p) {
                final q = _search.toLowerCase();
                return p.nameAr.toLowerCase().contains(q) ||
                    p.nameEn.toLowerCase().contains(q);
              }).toList();

        if (filtered.isEmpty && products.isEmpty) {
          return EmptyState(
            type: EmptyStateType.catalog,
            title: l.catalogEmpty,
            subtitle: l.catalogEmptySubtitle,
          );
        }

        final byCategory = <String, List<ProductDto>>{};
        for (final p in filtered) {
          byCategory.putIfAbsent(p.category, () => []).add(p);
        }
        final categories = byCategory.keys.toList();

        final displayMap = _activeCategory != null && _search.isEmpty
            ? {_activeCategory!: byCategory[_activeCategory!] ?? []}
            : byCategory;

        return CustomScrollView(
          slivers: [
            const SliverPadding(padding: EdgeInsets.only(top: kToolbarHeight + 8)),

            // ── Search bar ───────────────────────────────────────────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 200),
                  child: _searchOpen
                      ? TextField(
                          key: const ValueKey('search'),
                          controller: _searchCtrl,
                          autofocus: true,
                          onChanged: (v) => setState(() => _search = v),
                          decoration: InputDecoration(
                            hintText: l.searchHint,
                            prefixIcon: const Icon(Icons.search_rounded),
                            suffixIcon: IconButton(
                              icon: const Icon(Icons.close_rounded),
                              onPressed: () {
                                _searchCtrl.clear();
                                setState(() {
                                  _search = '';
                                  _searchOpen = false;
                                });
                              },
                            ),
                            filled: true,
                            fillColor: Theme.of(context)
                                .colorScheme
                                .surface
                                .withValues(alpha: 0.7),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(14),
                              borderSide: BorderSide.none,
                            ),
                            contentPadding:
                                const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                          ),
                        )
                      : GestureDetector(
                          key: const ValueKey('search-pill'),
                          onTap: () => setState(() => _searchOpen = true),
                          child: Container(
                            height: 42,
                            decoration: BoxDecoration(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurface
                                  .withValues(alpha: 0.06),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            alignment: AlignmentDirectional.centerStart,
                            child: Row(
                              children: [
                                Icon(
                                  Icons.search_rounded,
                                  size: 18,
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onSurface
                                      .withValues(alpha: 0.4),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  l.searchHint,
                                  style: TextStyle(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurface
                                        .withValues(alpha: 0.4),
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                ),
              ),
            ),

            // ── Category chips (hidden during search) ───────────────────────
            if (_search.isEmpty)
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
                        return _CategoryChip(
                          label: l.all,
                          color: Theme.of(context).colorScheme.primary,
                          selected: _activeCategory == null,
                          onTap: () => setState(() => _activeCategory = null),
                        );
                      }
                      final cat = categories[i - 1];
                      return _CategoryChip(
                        label: cat,
                        color: _colorFor(cat),
                        selected: _activeCategory == cat,
                        onTap: () => setState(() =>
                            _activeCategory = (_activeCategory == cat) ? null : cat),
                      );
                    },
                  ),
                ),
              ),
            const SliverPadding(padding: EdgeInsets.only(top: 12)),

            if (displayMap.isEmpty)
              SliverFillRemaining(
                child: Center(
                  child: Text(
                    l.noOrders,
                    style: TextStyle(
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withValues(alpha: 0.5),
                    ),
                  ),
                ),
              )
            else
              for (final entry in displayMap.entries) ...[
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 4, 20, 10),
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
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  sliver: SliverGrid.builder(
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 14,
                      crossAxisSpacing: 14,
                      childAspectRatio: 0.78,
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
                padding:
                    EdgeInsets.only(bottom: kBottomNavigationBarHeight + 24)),
          ],
        );
      },
    );
  }
}

// ── Category chip ───────────────────────────────────────────────────────────

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
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? color : color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: selected ? color : color.withValues(alpha: 0.3),
            width: selected ? 0 : 1,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: selected ? Colors.white : color,
            height: 1,
          ),
        ),
      ),
    );
  }
}

// ── Product card ────────────────────────────────────────────────────────────

class _ProductCard extends ConsumerWidget {
  final ProductDto product;
  final Color accentColor;
  const _ProductCard({required this.product, required this.accentColor});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = Localizations.localeOf(context);
    final l = AppLocalizations.of(context)!;
    final name = locale.languageCode == 'ar' ? product.nameAr : product.nameEn;

    final qty = ref.watch(
      cartProvider.select((lines) => lines
          .where((l) => l.productId == product.id)
          .fold(0, (s, l) => s + l.quantity)),
    );

    // Quota data — non-blocking, shows when available
    final quotaCache = ref.watch(quotaCacheProvider).value;
    final quota = quotaCache?[product.id];
    final quotaExhausted = quota != null && quota.remaining <= 0;

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: () => _showProductDetail(context, ref, l, locale),
      child: GlassCard(
        padding: EdgeInsets.zero,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Icon zone ───────────────────────────────────────────────────
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: accentColor.withValues(alpha: isDark ? 0.22 : 0.10),
                  borderRadius:
                      const BorderRadius.vertical(top: Radius.circular(19)),
                ),
                child: Stack(
                  children: [
                    Center(
                      child: ClipRRect(
                        borderRadius:
                            const BorderRadius.vertical(top: Radius.circular(19)),
                        child: Image.network(
                          '${ApiClient.baseUrl}/products/${product.id}/image',
                          fit: BoxFit.cover,
                          width: double.infinity,
                          height: double.infinity,
                          errorBuilder: (_, __, ___) => Center(
                            child: Text(
                              _emojiFor(product.category),
                              style: const TextStyle(fontSize: 44),
                            ),
                          ),
                          loadingBuilder: (_, child, progress) =>
                              progress == null
                                  ? child
                                  : Center(
                                      child: Text(
                                          _emojiFor(product.category),
                                          style: const TextStyle(fontSize: 44)),
                                    ),
                        ),
                      ),
                    ),
                    // Quota exhausted overlay
                    if (quotaExhausted)
                      Positioned.fill(
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.35),
                            borderRadius: const BorderRadius.vertical(
                                top: Radius.circular(19)),
                          ),
                          child: Center(
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.65),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                l.quotaOf(0, quota!.max),
                                style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700),
                              ),
                            ),
                          ),
                        ),
                      ),
                    // Quantity badge
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
                            child: Text('$qty',
                                style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold)),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),

            // ── Info zone ───────────────────────────────────────────────────
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
                        height: 1.3),
                  ),
                  // Quota bar
                  if (quota != null) ...[
                    const SizedBox(height: 5),
                    _QuotaBar(
                      remaining: quota.remaining,
                      max: quota.max,
                      color: accentColor,
                      l: l,
                    ),
                  ],
                  const SizedBox(height: 8),
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
                        Text('$qty',
                            style: TextStyle(
                                fontWeight: FontWeight.w700,
                                color: accentColor,
                                fontSize: 16)),
                      ] else
                        const Spacer(),
                      _StepButton(
                        icon: Icons.add,
                        color: accentColor,
                        filled: true,
                        disabled: quotaExhausted,
                        onTap: quotaExhausted
                            ? null
                            : () => ref.read(cartProvider.notifier).add(product),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showProductDetail(BuildContext context, WidgetRef ref,
      AppLocalizations l, Locale locale) {
    final name = locale.languageCode == 'ar' ? product.nameAr : product.nameEn;
    final quotaCache = ref.read(quotaCacheProvider).value;
    final quota = quotaCache?[product.id];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ProductDetailSheet(
        product: product,
        name: name,
        accentColor: accentColor,
        quota: quota,
        onAdd: () {
          ref.read(cartProvider.notifier).add(product);
          Navigator.pop(context);
        },
        l: l,
      ),
    );
  }
}

// ── Quota bar ────────────────────────────────────────────────────────────────

class _QuotaBar extends StatelessWidget {
  const _QuotaBar({
    required this.remaining,
    required this.max,
    required this.color,
    required this.l,
  });
  final int remaining;
  final int max;
  final Color color;
  final AppLocalizations l;

  @override
  Widget build(BuildContext context) {
    final fraction = max > 0 ? remaining / max : 0.0;
    final barColor = fraction < 0.2 ? Colors.red : fraction < 0.5 ? Colors.orange : color;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: fraction.clamp(0.0, 1.0),
            minHeight: 4,
            backgroundColor: barColor.withValues(alpha: 0.15),
            color: barColor,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          l.quotaOf(remaining, max),
          style: TextStyle(
            fontSize: 10,
            color: barColor,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

// ── Step button ──────────────────────────────────────────────────────────────

class _StepButton extends StatelessWidget {
  const _StepButton({
    required this.icon,
    required this.color,
    required this.onTap,
    this.filled = false,
    this.disabled = false,
  });
  final IconData icon;
  final Color color;
  final VoidCallback? onTap;
  final bool filled;
  final bool disabled;

  @override
  Widget build(BuildContext context) {
    final effectiveColor = disabled ? Colors.grey : color;
    return GestureDetector(
      onTap: disabled
          ? null
          : () {
              HapticFeedback.lightImpact();
              onTap?.call();
            },
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: filled
              ? effectiveColor
              : effectiveColor.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(999),
          boxShadow: filled && !disabled
              ? [
                  BoxShadow(
                    color: effectiveColor.withValues(alpha: 0.35),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Icon(
          icon,
          size: 16,
          color: filled ? Colors.white : effectiveColor,
        ),
      ),
    );
  }
}

// ── Product detail bottom sheet ──────────────────────────────────────────────

class _ProductDetailSheet extends StatelessWidget {
  const _ProductDetailSheet({
    required this.product,
    required this.name,
    required this.accentColor,
    required this.quota,
    required this.onAdd,
    required this.l,
  });
  final ProductDto product;
  final String name;
  final Color accentColor;
  final ({int remaining, int max})? quota;
  final VoidCallback onAdd;
  final AppLocalizations l;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final quotaExhausted = quota != null && quota!.remaining <= 0;

    return DraggableScrollableSheet(
      initialChildSize: 0.5,
      minChildSize: 0.35,
      maxChildSize: 0.75,
      builder: (_, ctrl) => Container(
        decoration: BoxDecoration(
          color: scheme.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: ListView(
          controller: ctrl,
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
          children: [
            Center(
              child: Container(
                margin: const EdgeInsets.symmetric(vertical: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: scheme.onSurface.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),

            // Product image / emoji fallback
            Center(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.network(
                  '${ApiClient.baseUrl}/products/${product.id}/image',
                  width: 96,
                  height: 96,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    width: 96,
                    height: 96,
                    decoration: BoxDecoration(
                      color: accentColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Center(
                      child: Text(_emojiFor(product.category),
                          style: const TextStyle(fontSize: 52)),
                    ),
                  ),
                  loadingBuilder: (_, child, progress) => progress == null
                      ? child
                      : Container(
                          width: 96,
                          height: 96,
                          decoration: BoxDecoration(
                            color: accentColor.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Center(
                            child: Text(_emojiFor(product.category),
                                style: const TextStyle(fontSize: 52)),
                          ),
                        ),
                ),
              ),
            ),
            const SizedBox(height: 16),

            Text(
              name,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              product.category,
              textAlign: TextAlign.center,
              style: TextStyle(color: accentColor, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 20),

            // Both names
            _DetailRow(label: 'AR', value: product.nameAr),
            _DetailRow(label: 'EN', value: product.nameEn),

            if (quota != null) ...[
              const SizedBox(height: 12),
              _DetailRow(
                label: l.quota,
                value: l.quotaOf(quota!.remaining, quota!.max),
                valueColor: quota!.remaining == 0
                    ? scheme.error
                    : quota!.remaining <= quota!.max * 0.3
                        ? Colors.orange
                        : Colors.green,
              ),
              const SizedBox(height: 4),
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: LinearProgressIndicator(
                  value: quota!.max > 0
                      ? (quota!.remaining / quota!.max).clamp(0.0, 1.0)
                      : 0,
                  minHeight: 8,
                  backgroundColor: accentColor.withValues(alpha: 0.12),
                  color: accentColor,
                ),
              ),
            ],

            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: quotaExhausted ? null : onAdd,
              icon: const Icon(Icons.add_shopping_cart_rounded),
              label: Text(quotaExhausted ? l.quotaOf(0, quota?.max ?? 0) : l.addToCart),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                backgroundColor: accentColor,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value, this.valueColor});
  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          SizedBox(
            width: 48,
            child: Text(label,
                style: TextStyle(
                    fontSize: 12,
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withValues(alpha: 0.45),
                    fontWeight: FontWeight.w600)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: valueColor,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Empty catalog state ───────────────────────────────────────────────────────

class _EmptyCatalog extends StatelessWidget {
  const _EmptyCatalog({required this.l});
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
            Text(l.catalogEmpty,
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w700),
                textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(l.catalogEmptySubtitle,
                style: TextStyle(
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withValues(alpha: 0.55),
                    fontSize: 13,
                    height: 1.5),
                textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
