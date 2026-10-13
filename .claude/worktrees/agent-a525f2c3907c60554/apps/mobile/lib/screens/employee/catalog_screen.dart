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

// ── Category accent colours ────────────────────────────────────────────────────

const _kCategoryColors = <String, Color>{
  'Boissons': Color(0xFF29B6F6),
  'Snacks':   Color(0xFFFFCA28),
  'Repas':    Color(0xFF66BB6A),
  'Desserts': Color(0xFFEC407A),
  'Café':     Color(0xFF8D6E63),
};

Color _colorFor(String cat) => _kCategoryColors[cat] ?? const Color(0xFF78909C);

String _emojiFor(String cat) => switch (cat) {
      'Boissons' => '🥤',
      'Café'     => '☕',
      'Snacks'   => '🍿',
      'Repas'    => '🍽️',
      'Desserts' => '🍰',
      _          => '📦',
    };

Color _quotaColor(int remaining, int max) {
  if (max <= 0) return const Color(0xFF6B778C);
  final f = remaining / max;
  if (f > 0.5) return const Color(0xFF36B37E);
  if (f >= 0.1) return const Color(0xFFFF991F);
  return const Color(0xFFFF4D4F);
}

// ── Screen ────────────────────────────────────────────────────────────────────

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

  Widget _buildSkeleton(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A1A1A) : const Color(0xFFEBECF0),
        borderRadius: BorderRadius.circular(12),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final productsAsync = ref.watch(productsProvider);

    return productsAsync.when(
      loading: () => GridView.builder(
        padding: const EdgeInsets.fromLTRB(14, kToolbarHeight + 16, 14, 16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 0.72,
        ),
        itemCount: 6,
        itemBuilder: (ctx, _) => _buildSkeleton(ctx),
      ),
      error: (e, _) => Center(
        child: ErrorCard(
          error: e,
          onRetry: () => ref.invalidate(productsProvider),
          margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 80),
        ),
      ),
      data: (products) {
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

        final displayMap = (_activeCategory != null && _search.isEmpty)
            ? {_activeCategory!: byCategory[_activeCategory!] ?? []}
            : byCategory;

        return CustomScrollView(
          slivers: [
            const SliverPadding(
                padding: EdgeInsets.only(top: kToolbarHeight + 8)),

            // ── Search bar ─────────────────────────────────────────────────
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
                                .onSurface
                                .withValues(alpha: 0.06),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(24),
                              borderSide: BorderSide.none,
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                                vertical: 0, horizontal: 16),
                          ),
                        )
                      : GestureDetector(
                          key: const ValueKey('search-pill'),
                          onTap: () => setState(() => _searchOpen = true),
                          child: Container(
                            height: 44,
                            decoration: BoxDecoration(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurface
                                  .withValues(alpha: 0.06),
                              borderRadius: BorderRadius.circular(24),
                            ),
                            padding:
                                const EdgeInsets.symmetric(horizontal: 16),
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
                                    fontSize: 14,
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurface
                                        .withValues(alpha: 0.4),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                ),
              ),
            ),

            // ── Category chips (hidden while searching) ───────────────────
            if (_search.isEmpty)
              SliverToBoxAdapter(
                child: SizedBox(
                  height: 44,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: categories.length + 1,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (ctx, i) {
                      if (i == 0) {
                        return _CategoryChip(
                          label: l.all,
                          selected: _activeCategory == null,
                          onTap: () =>
                              setState(() => _activeCategory = null),
                        );
                      }
                      final cat = categories[i - 1];
                      return _CategoryChip(
                        label: '${_emojiFor(cat)} $cat',
                        selected: _activeCategory == cat,
                        onTap: () => setState(() => _activeCategory =
                            (_activeCategory == cat) ? null : cat),
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
                // Section header
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
                          '${_emojiFor(entry.key)}  ${entry.key}',
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(fontWeight: FontWeight.w700),
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
                // Product grid
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  sliver: SliverGrid.builder(
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 0.72,
                    ),
                    itemCount: entry.value.length,
                    itemBuilder: (ctx, i) => _ProductCard(
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

// ── Category chip ─────────────────────────────────────────────────────────────

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    final onSurface = Theme.of(context).colorScheme.onSurface;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOut,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: selected
              ? primary.withValues(alpha: 0.10)
              : onSurface.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: selected ? primary : Colors.transparent,
            width: 1.5,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: selected ? primary : onSurface.withValues(alpha: 0.6),
            height: 1,
          ),
        ),
      ),
    );
  }
}

// ── Product card ──────────────────────────────────────────────────────────────

class _ProductCard extends ConsumerWidget {
  const _ProductCard({required this.product, required this.accentColor});

  final ProductDto product;
  final Color accentColor;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primary = Theme.of(context).colorScheme.primary;

    final qty = ref.watch(
      cartProvider.select((lines) => lines
          .where((ln) => ln.productId == product.id)
          .fold(0, (s, ln) => s + ln.quantity)),
    );

    final quotaCache = ref.watch(quotaCacheProvider).value;
    final quota = quotaCache?[product.id];
    final quotaExhausted = quota != null && quota.remaining <= 0;

    return GestureDetector(
      onTap: () => _showDetail(context, ref, l),
      child: Container(
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF141414) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: isDark
              ? null
              : const [
                  BoxShadow(
                    color: Color(0x0A000000),
                    blurRadius: 8,
                    offset: Offset(0, 2),
                  ),
                ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Top coloured band (80px) ──────────────────────────────
            SizedBox(
              height: 80,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Container(
                    color: accentColor
                        .withValues(alpha: isDark ? 0.16 : 0.08),
                    child: Image.network(
                      '${ApiClient.baseUrl}/products/${product.id}/image',
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Center(
                        child: Text(
                          _emojiFor(product.category),
                          style: const TextStyle(fontSize: 32),
                        ),
                      ),
                      loadingBuilder: (_, child, progress) =>
                          progress == null
                              ? child
                              : Center(
                                  child: Text(
                                    _emojiFor(product.category),
                                    style: const TextStyle(fontSize: 32),
                                  ),
                                ),
                    ),
                  ),
                  // Quota exhausted overlay
                  if (quotaExhausted)
                    Container(
                      color: Colors.black.withValues(alpha: 0.45),
                      child: Center(
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.65),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            l.quotaOf(0, quota.max),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
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
                        width: 22,
                        height: 22,
                        decoration: BoxDecoration(
                          color: primary,
                          shape: BoxShape.circle,
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

            // ── Info zone ─────────────────────────────────────────────
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.nameAr,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        height: 1.3,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      product.nameEn,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        color: Theme.of(context)
                            .colorScheme
                            .onSurface
                            .withValues(alpha: 0.6),
                      ),
                    ),
                    if (quota != null) ...[
                      const SizedBox(height: 8),
                      _QuotaBadge(
                          remaining: quota.remaining, max: quota.max),
                    ],
                    const Spacer(),
                    // Add / stepper
                    if (qty == 0)
                      SizedBox(
                        height: 36,
                        width: double.infinity,
                        child: FilledButton.tonal(
                          onPressed: quotaExhausted
                              ? null
                              : () {
                                  HapticFeedback.lightImpact();
                                  ref
                                      .read(cartProvider.notifier)
                                      .add(product);
                                },
                          style: FilledButton.styleFrom(
                            padding: EdgeInsets.zero,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          child: Text(
                            l.addToCart,
                            style: const TextStyle(fontSize: 13),
                          ),
                        ),
                      )
                    else
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          _StepIcon(
                            icon: Icons.remove,
                            onTap: () {
                              HapticFeedback.selectionClick();
                              ref
                                  .read(cartProvider.notifier)
                                  .decrement(product.id);
                            },
                          ),
                          Padding(
                            padding:
                                const EdgeInsets.symmetric(horizontal: 14),
                            child: Text(
                              '$qty',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: primary,
                              ),
                            ),
                          ),
                          _StepIcon(
                            icon: Icons.add,
                            filled: true,
                            onTap: quotaExhausted
                                ? null
                                : () {
                                    HapticFeedback.selectionClick();
                                    ref
                                        .read(cartProvider.notifier)
                                        .add(product);
                                  },
                          ),
                        ],
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showDetail(
      BuildContext context, WidgetRef ref, AppLocalizations l) {
    final quotaCache = ref.read(quotaCacheProvider).value;
    final quota = quotaCache?[product.id];

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ProductDetailSheet(
        product: product,
        accentColor: accentColor,
        quota: quota,
        onAddQty: (qty) {
          for (var i = 0; i < qty; i++) {
            ref.read(cartProvider.notifier).add(product);
          }
          Navigator.pop(context);
        },
        l: l,
      ),
    );
  }
}

// ── Quota badge (coloured dot + text) ─────────────────────────────────────────

class _QuotaBadge extends StatelessWidget {
  const _QuotaBadge({required this.remaining, required this.max});

  final int remaining;
  final int max;

  @override
  Widget build(BuildContext context) {
    final color = _quotaColor(remaining, max);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 6,
          height: 6,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 5),
        Text(
          '$remaining / $max',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: color,
          ),
        ),
      ],
    );
  }
}

// ── Small step icon (in-card stepper) ────────────────────────────────────────

class _StepIcon extends StatelessWidget {
  const _StepIcon({
    required this.icon,
    required this.onTap,
    this.filled = false,
  });

  final IconData icon;
  final VoidCallback? onTap;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    final onSurface = Theme.of(context).colorScheme.onSurface;
    final disabled = onTap == null;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 28,
        height: 28,
        decoration: BoxDecoration(
          color: filled
              ? (disabled ? onSurface.withValues(alpha: 0.12) : primary)
              : primary.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          icon,
          size: 14,
          color: filled
              ? (disabled
                  ? onSurface.withValues(alpha: 0.4)
                  : Colors.white)
              : (disabled
                  ? onSurface.withValues(alpha: 0.4)
                  : primary),
        ),
      ),
    );
  }
}

// ── Product detail bottom sheet ───────────────────────────────────────────────

class _ProductDetailSheet extends StatefulWidget {
  const _ProductDetailSheet({
    required this.product,
    required this.accentColor,
    required this.quota,
    required this.onAddQty,
    required this.l,
  });

  final ProductDto product;
  final Color accentColor;
  final ({int remaining, int max})? quota;
  final void Function(int qty) onAddQty;
  final AppLocalizations l;

  @override
  State<_ProductDetailSheet> createState() => _ProductDetailSheetState();
}

class _ProductDetailSheetState extends State<_ProductDetailSheet> {
  int _qty = 1;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final quota = widget.quota;
    final quotaExhausted = quota != null && quota.remaining <= 0;
    final maxQty =
        (quota != null && quota.remaining > 0) ? quota.remaining : 99;

    return DraggableScrollableSheet(
      initialChildSize: 0.55,
      minChildSize: 0.4,
      maxChildSize: 0.85,
      builder: (_, ctrl) => Container(
        decoration: BoxDecoration(
          color: scheme.surface,
          borderRadius:
              const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: ListView(
          controller: ctrl,
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
          children: [
            // Handle bar
            Center(
              child: Container(
                margin: const EdgeInsets.symmetric(vertical: 12),
                width: 32,
                height: 4,
                decoration: BoxDecoration(
                  color: scheme.onSurface.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 4),

            // Product image with emoji fallback
            Center(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.network(
                  '${ApiClient.baseUrl}/products/${widget.product.id}/image',
                  width: 88,
                  height: 88,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    width: 88,
                    height: 88,
                    decoration: BoxDecoration(
                      color: widget.accentColor.withValues(alpha: 0.10),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Center(
                      child: Text(
                        _emojiFor(widget.product.category),
                        style: const TextStyle(fontSize: 40),
                      ),
                    ),
                  ),
                  loadingBuilder: (_, child, progress) =>
                      progress == null
                          ? child
                          : Container(
                              width: 88,
                              height: 88,
                              decoration: BoxDecoration(
                                color: widget.accentColor
                                    .withValues(alpha: 0.10),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Center(
                                child: Text(
                                  _emojiFor(widget.product.category),
                                  style: const TextStyle(fontSize: 40),
                                ),
                              ),
                            ),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Names
            Text(
              widget.product.nameAr,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  fontSize: 20, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            Text(
              widget.product.nameEn,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: scheme.onSurface.withValues(alpha: 0.6),
              ),
            ),
            const SizedBox(height: 16),
            const Divider(height: 1),
            const SizedBox(height: 16),

            // Info rows
            _InfoRow(label: widget.l.category, value: widget.product.category),
            if (quota != null) ...[
              const SizedBox(height: 8),
              _InfoRow(
                label: widget.l.quota,
                value: widget.l.quotaOf(quota.remaining, quota.max),
                valueColor: _quotaColor(quota.remaining, quota.max),
              ),
            ],

            const SizedBox(height: 24),

            // Quantity stepper
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _SheetStepBtn(
                  icon: Icons.remove,
                  onTap: _qty > 1 ? () => setState(() => _qty--) : null,
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Text(
                    '$_qty',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: scheme.primary,
                    ),
                  ),
                ),
                _SheetStepBtn(
                  icon: Icons.add,
                  onTap: (quotaExhausted || _qty >= maxQty)
                      ? null
                      : () => setState(() => _qty++),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Add to cart button
            FilledButton.icon(
              onPressed:
                  quotaExhausted ? null : () => widget.onAddQty(_qty),
              icon: const Icon(Icons.add_shopping_cart_rounded),
              label: Text(
                quotaExhausted
                    ? widget.l.quotaOf(0, quota?.max ?? 0)
                    : widget.l.addToCart,
              ),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Sheet step button ─────────────────────────────────────────────────────────

class _SheetStepBtn extends StatelessWidget {
  const _SheetStepBtn({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    final onSurface = Theme.of(context).colorScheme.onSurface;
    final disabled = onTap == null;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: disabled
              ? onSurface.withValues(alpha: 0.06)
              : primary.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(
          icon,
          size: 18,
          color: disabled ? onSurface.withValues(alpha: 0.3) : primary,
        ),
      ),
    );
  }
}

// ── Info row ──────────────────────────────────────────────────────────────────

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.label,
    required this.value,
    this.valueColor,
  });

  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 64,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Theme.of(context)
                  .colorScheme
                  .onSurface
                  .withValues(alpha: 0.45),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            value,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: valueColor,
            ),
          ),
        ),
      ],
    );
  }
}
