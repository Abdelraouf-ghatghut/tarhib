import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/auth_provider.dart';
import '../../providers/orders_provider.dart';
import '../../widgets/glass_app_bar.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/tarhib_scaffold.dart';

/// TARHIB-17 — File des commandes agent, triée par priorité + heure
class QueueScreen extends ConsumerWidget {
  const QueueScreen({super.key});

  static const _priorityColors = {
    'P1': Color(0xFFEF5350),
    'P2': Color(0xFFFF7043),
    'P3': Color(0xFFFFA726),
    'P4': Color(0xFFFFCA28),
  };

  Color _priorityColor(String p) =>
      _priorityColors[p] ?? const Color(0xFF9E9E9E);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final queueAsync = ref.watch(agentQueueProvider);

    return TarhibScaffold(
      appBar: GlassAppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.view_list_rounded,
                color: Theme.of(context).colorScheme.primary, size: 22),
            const SizedBox(width: 8),
            Text(l.orderQueue,
                style: const TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            onPressed: () => ref.read(authProvider.notifier).logout(),
            tooltip: l.logout,
          ),
          const SizedBox(width: 4),
        ],
      ),
      child: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(ordersProvider);
          ref.invalidate(agentQueueProvider);
        },
        child: queueAsync.when(
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
                    onPressed: () => ref.invalidate(agentQueueProvider),
                    icon: const Icon(Icons.refresh),
                    label: Text(l.errorRetry),
                  ),
                ],
              ),
            ),
          ),
          data: (orders) {
            if (orders.isEmpty) {
              return Center(
                child: GlassCard(
                  margin: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.inbox_outlined,
                          size: 64, color: Colors.grey),
                      const SizedBox(height: 16),
                      Text(l.noOrdersInQueue,
                          style: const TextStyle(color: Colors.grey),
                          textAlign: TextAlign.center),
                    ],
                  ),
                ),
              );
            }

            return ListView.builder(
              padding: EdgeInsets.only(
                top: kToolbarHeight + 24,
                left: 14,
                right: 14,
                bottom: 24,
              ),
              itemCount: orders.length,
              itemBuilder: (ctx, i) {
                final o = orders[i];
                final priorityColor = _priorityColor(o.priority.name);
                final sla = DateTime.tryParse(o.slaDeadline);
                final isLate = sla != null && sla.isBefore(DateTime.now());
                final timeLeft = sla != null
                    ? sla.difference(DateTime.now())
                    : Duration.zero;

                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: GestureDetector(
                    onTap: () => context.go('/agent/orders/${o.id}'),
                    child: GlassCard(
                      padding: const EdgeInsets.all(14),
                      child: Row(
                        children: [
                          // Priority badge
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: priorityColor.withValues(alpha: 0.18),
                              border: Border.all(
                                color: priorityColor.withValues(alpha: 0.5),
                                width: 1.5,
                              ),
                            ),
                            child: Center(
                              child: Text(
                                o.priority.name,
                                style: TextStyle(
                                  color: priorityColor,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),
                          // Order info
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '#${o.id.substring(0, 8).toUpperCase()}',
                                  style: const TextStyle(
                                    fontFamily: 'monospace',
                                    fontWeight: FontWeight.w600,
                                    fontSize: 15,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  o.createdAt.substring(0, 16).replaceFirst('T', ' '),
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurface
                                        .withValues(alpha: 0.55),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          // Status / SLA
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              if (isLate)
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: const Color(0x1FEF5350),
                                    borderRadius: BorderRadius.circular(999),
                                    border: Border.all(
                                        color: const Color(0x50EF5350)),
                                  ),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.warning_amber_rounded,
                                          size: 12,
                                          color: Color(0xFFEF5350)),
                                      SizedBox(width: 4),
                                      Text('Late',
                                          style: TextStyle(
                                              fontSize: 11,
                                              color: Color(0xFFEF5350),
                                              fontWeight: FontWeight.bold)),
                                    ],
                                  ),
                                )
                              else
                                Text(
                                  _formatDuration(timeLeft),
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: timeLeft.inMinutes < 10
                                        ? const Color(0xFFFFA726)
                                        : Theme.of(context)
                                            .colorScheme
                                            .primary,
                                  ),
                                ),
                              const SizedBox(height: 4),
                              Text(
                                o.status.name,
                                style: const TextStyle(
                                    fontSize: 11, color: Colors.grey),
                              ),
                            ],
                          ),
                          const SizedBox(width: 4),
                          Icon(
                            Icons.chevron_right_rounded,
                            color: Theme.of(context)
                                .colorScheme
                                .onSurface
                                .withValues(alpha: 0.3),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }

  String _formatDuration(Duration d) {
    if (d.isNegative) return '0m';
    final h = d.inHours;
    final m = d.inMinutes % 60;
    if (h > 0) return '${h}h ${m}m';
    return '${m}m';
  }
}
