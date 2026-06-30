import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/auth_provider.dart';
import '../../providers/orders_provider.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_card.dart';
import '../../widgets/glass_app_bar.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/tarhib_scaffold.dart';

/// TARHIB-20 — Manager: approbation avec swipe et accès au dashboard
class ManagerOrdersScreen extends ConsumerStatefulWidget {
  const ManagerOrdersScreen({super.key});

  @override
  ConsumerState<ManagerOrdersScreen> createState() => _ManagerOrdersScreenState();
}

class _ManagerOrdersScreenState extends ConsumerState<ManagerOrdersScreen> {
  static const _priorityColors = {
    'P1': Color(0xFFEF5350),
    'P2': Color(0xFFFF7043),
    'P3': Color(0xFFFFA726),
    'P4': Color(0xFF42A5F5),
    'P5': Color(0xFF78909C),
  };

  Color _priorityColor(String p) =>
      _priorityColors[p] ?? const Color(0xFF78909C);

  String _fmtDate(String iso) {
    final dt = DateTime.tryParse(iso);
    if (dt == null) return iso;
    return DateFormat.yMd().add_Hm().format(dt.toLocal());
  }

  Future<void> _decide(String orderId, String newStatus) async {
    HapticFeedback.mediumImpact();
    try {
      await ref
          .read(ordersNotifierProvider.notifier)
          .updateStatus(orderId, newStatus);
      ref.invalidate(pendingApprovalProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            backgroundColor: Theme.of(context).colorScheme.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final locale = ref.watch(localeProvider);
    final pendingAsync = ref.watch(pendingApprovalProvider);
    final scheme = Theme.of(context).colorScheme;

    return TarhibScaffold(
      appBar: GlassAppBar(
        title: Text(l.pendingApproval,
            style: const TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          // Dashboard shortcut
          IconButton(
            icon: const Icon(Icons.dashboard_rounded),
            tooltip: l.managerDashboard,
            onPressed: () => context.push('/manager/dashboard'),
          ),
          // Language toggle
          IconButton(
            icon: Text(
              locale.languageCode == 'ar' ? 'EN' : 'ع',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: scheme.primary,
              ),
            ),
            onPressed: () {
              final next = locale.languageCode == 'ar' ? 'en' : 'ar';
              ref.read(localeProvider.notifier).state = Locale(next);
            },
          ),
          IconButton(
            icon: const Icon(Icons.person_outline_rounded),
            onPressed: () => context.push('/profile'),
            tooltip: l.profile,
          ),
          const SizedBox(width: 4),
        ],
      ),
      child: RefreshIndicator(
        onRefresh: () async => ref.invalidate(pendingApprovalProvider),
        child: pendingAsync.when(
          loading: () => const OrderListSkeleton(),
          error: (e, _) => Center(
            child: ErrorCard(
              error: e,
              onRetry: () => ref.invalidate(pendingApprovalProvider),
              margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 80),
            ),
          ),
          data: (orders) {
            if (orders.isEmpty) {
              return EmptyState(
                type: EmptyStateType.orders,
                title: l.noOrders,
                subtitle: l.allClear,
              );
            }

            return Column(
              children: [
                // Swipe hint banner
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, kToolbarHeight + 12, 16, 0),
                  child: GlassCard(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    child: Row(
                      children: [
                        Icon(Icons.swipe_rounded,
                            size: 16, color: scheme.onSurface.withValues(alpha: 0.5)),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            '← ${l.reject}  /  ${l.approve} →',
                            style: TextStyle(
                              fontSize: 12,
                              color: scheme.onSurface.withValues(alpha: 0.55),
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 8),

                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                    itemCount: orders.length,
                    itemBuilder: (ctx, i) {
                      final o = orders[i];
                      final color = _priorityColor(o.priority.name);

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Dismissible(
                          key: ValueKey(o.id),
                          dismissThresholds: const {
                            DismissDirection.startToEnd: 0.35,
                            DismissDirection.endToStart: 0.35,
                          },
                          background: Container(
                            decoration: BoxDecoration(
                              color: scheme.error.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            alignment: AlignmentDirectional.centerStart,
                            padding: const EdgeInsetsDirectional.only(start: 24),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.close_rounded, color: scheme.error),
                                const SizedBox(width: 6),
                                Text(l.reject,
                                    style: TextStyle(
                                        color: scheme.error,
                                        fontWeight: FontWeight.w700)),
                              ],
                            ),
                          ),
                          secondaryBackground: Container(
                            decoration: BoxDecoration(
                              color: Colors.green.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            alignment: AlignmentDirectional.centerEnd,
                            padding: const EdgeInsetsDirectional.only(end: 24),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                Text('Approve',
                                    style: TextStyle(
                                        color: Colors.green,
                                        fontWeight: FontWeight.w700)),
                                SizedBox(width: 6),
                                Icon(Icons.check_rounded, color: Colors.green),
                              ],
                            ),
                          ),
                          onDismissed: (direction) {
                            final newStatus =
                                direction == DismissDirection.endToStart
                                    ? 'REJECTED'
                                    : 'APPROVED';
                            _decide(o.id, newStatus);
                          },
                          child: GestureDetector(
                            onTap: () => context.go('/manager/orders/${o.id}'),
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
                                          color: color.withValues(alpha: 0.4)),
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
                                            fontSize: 14,
                                          ),
                                        ),
                                        const SizedBox(height: 3),
                                        Text(
                                          _fmtDate(o.createdAt),
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: scheme.onSurface
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
                                      color: Colors.orange.withValues(alpha: 0.10),
                                      borderRadius: BorderRadius.circular(999),
                                      border: Border.all(
                                          color:
                                              Colors.orange.withValues(alpha: 0.35)),
                                    ),
                                    child: Text(
                                      l.orderStatus_PENDING,
                                      style: const TextStyle(
                                          fontSize: 11,
                                          color: Colors.orange,
                                          fontWeight: FontWeight.w600),
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Icon(Icons.chevron_right_rounded,
                                      size: 18,
                                      color: scheme.onSurface
                                          .withValues(alpha: 0.25)),
                                ],
                              ),
                            ),
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
      ),
    );
  }
}
