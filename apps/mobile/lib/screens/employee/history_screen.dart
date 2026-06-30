import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/cart_provider.dart';
import '../../providers/orders_provider.dart';
import '../../providers/product_name_cache_provider.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_card.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/skeleton_loader.dart';

/// TARHIB-16 — Historique des commandes + récommande rapide
class HistoryScreen extends ConsumerStatefulWidget {
  const HistoryScreen({super.key});

  @override
  ConsumerState<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends ConsumerState<HistoryScreen> {
  String? _activeFilter;

  static const _filterStatuses = [null, 'IN_PROGRESS', 'DELIVERED', 'REJECTED'];

  Color _statusColor(String s) => switch (s) {
        'DELIVERED' => Colors.green,
        'REJECTED' => Colors.red,
        'IN_PROGRESS' => Colors.orange,
        'APPROVED' => Colors.blue,
        _ => Colors.grey,
      };

  String _fmtDate(String iso) {
    final dt = DateTime.tryParse(iso);
    if (dt == null) return iso;
    return DateFormat.yMd().add_Hm().format(dt.toLocal());
  }

  Future<void> _quickReorder(BuildContext context, dynamic order) async {
    final l = AppLocalizations.of(context)!;
    final cache = ref.read(productNameCacheProvider).value ?? {};

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(l.quickReorder),
        content: Text(l.reorderConfirm),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(l.cancel)),
          FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(l.confirmAction)),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    HapticFeedback.mediumImpact();

    final cart = ref.read(cartProvider.notifier);
    for (final ln in order.lines) {
      final pid = ln.productId as String;
      final info = cache[pid];
      final nameAr = info?.nameAr ?? pid;
      final nameEn = info?.nameEn ?? pid;
      cart.addByName(pid, nameAr, nameEn, ln.quantity as int);
    }

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(l.reorderConfirm),
          behavior: SnackBarBehavior.floating,
          backgroundColor: Theme.of(context).colorScheme.primary,
        ),
      );
      context.go('/employee/cart');
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final ordersAsync = ref.watch(ordersProvider);

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(ordersProvider),
      child: ordersAsync.when(
        loading: () => const OrderListSkeleton(),
        error: (e, _) => Center(
          child: ErrorCard(
            error: e,
            onRetry: () => ref.invalidate(ordersProvider),
            margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 80),
          ),
        ),
        data: (all) {
          final filtered = _activeFilter == null
              ? all
              : all.where((o) => o.status.name == _activeFilter).toList();

          return CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(0, kToolbarHeight + 8, 0, 4),
                  child: SizedBox(
                    height: 40,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: _filterStatuses.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 8),
                      itemBuilder: (_, i) {
                        final f = _filterStatuses[i];
                        final label = _filterLabel(f, l);
                        final color = f == null
                            ? Theme.of(context).colorScheme.primary
                            : _statusColor(f);
                        final selected = _activeFilter == f;
                        return GestureDetector(
                          onTap: () => setState(() => _activeFilter = f),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 180),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 8),
                            decoration: BoxDecoration(
                              color: selected
                                  ? color
                                  : color.withValues(alpha: 0.10),
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
                                color: selected ? Colors.white : color,
                                height: 1,
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ),
              const SliverPadding(padding: EdgeInsets.only(top: 8)),

              if (filtered.isEmpty)
                SliverFillRemaining(
                  child: EmptyState(
                    type: EmptyStateType.orders,
                    title: l.noOrders,
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(14, 0, 14, 32),
                  sliver: SliverList.separated(
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (ctx, i) {
                      final o = filtered[i];
                      final statusName = o.status.name;
                      final color = _statusColor(statusName);
                      final isDelivered = statusName == 'DELIVERED';

                      return GestureDetector(
                        onTap: () => context.go('/employee/orders/${o.id}'),
                        child: GlassCard(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: color.withValues(alpha: 0.12),
                                  border: Border.all(
                                      color: color.withValues(alpha: 0.35)),
                                ),
                                child: Center(
                                  child: Text(
                                    o.priority.name,
                                    style: TextStyle(
                                        fontWeight: FontWeight.w800,
                                        color: color,
                                        fontSize: 12),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '#${o.id.substring(0, 8).toUpperCase()}',
                                      style: const TextStyle(
                                        fontFamily: 'monospace',
                                        fontWeight: FontWeight.w700,
                                        fontSize: 13,
                                      ),
                                    ),
                                    const SizedBox(height: 3),
                                    Text(
                                      _fmtDate(o.createdAt),
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Theme.of(context)
                                            .colorScheme
                                            .onSurface
                                            .withValues(alpha: 0.45),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: color.withValues(alpha: 0.10),
                                  borderRadius: BorderRadius.circular(999),
                                  border: Border.all(
                                      color: color.withValues(alpha: 0.3)),
                                ),
                                child: Text(
                                  _statusLabel(ctx, statusName),
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: color,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 4),
                              // Quick reorder button for delivered orders
                              if (isDelivered)
                                IconButton(
                                  icon: const Icon(Icons.replay_rounded, size: 18),
                                  color: Theme.of(context).colorScheme.primary,
                                  tooltip: l.quickReorder,
                                  onPressed: () => _quickReorder(context, o),
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(),
                                )
                              else
                                Icon(
                                  Icons.chevron_right_rounded,
                                  size: 18,
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onSurface
                                      .withValues(alpha: 0.25),
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  String _filterLabel(String? f, AppLocalizations l) => switch (f) {
        'IN_PROGRESS' => l.orderStatus_IN_PROGRESS,
        'DELIVERED' => l.orderStatus_DELIVERED,
        'REJECTED' => l.orderStatus_REJECTED,
        _ => l.all,
      };

  String _statusLabel(BuildContext ctx, String s) {
    final l = AppLocalizations.of(ctx)!;
    return switch (s) {
      'PENDING' => l.orderStatus_PENDING,
      'APPROVED' => l.orderStatus_APPROVED,
      'IN_PROGRESS' => l.orderStatus_IN_PROGRESS,
      'DELIVERED' => l.orderStatus_DELIVERED,
      'REJECTED' => l.orderStatus_REJECTED,
      _ => s,
    };
  }
}
