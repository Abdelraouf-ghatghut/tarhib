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

  static const _priorityMeta = {
    'P1': _PriorityMeta(Color(0xFFEF5350), '🔴', 'Critique'),
    'P2': _PriorityMeta(Color(0xFFFF7043), '🟠', 'Urgent'),
    'P3': _PriorityMeta(Color(0xFFFFA726), '🟡', 'Normal'),
    'P4': _PriorityMeta(Color(0xFF42A5F5), '🔵', 'Bas'),
    'P5': _PriorityMeta(Color(0xFF78909C), '⚪', 'Très bas'),
  };

  _PriorityMeta _meta(String p) =>
      _priorityMeta[p] ??
      const _PriorityMeta(Color(0xFF78909C), '⚪', '—');

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
          loading: () =>
              const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(
            child: GlassCard(
              margin: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('⚠️', style: TextStyle(fontSize: 48)),
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
                  margin: const EdgeInsets.symmetric(horizontal: 32),
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('📭',
                          style: TextStyle(fontSize: 56)),
                      const SizedBox(height: 16),
                      Text(
                        l.noOrdersInQueue,
                        style: Theme.of(context)
                            .textTheme
                            .titleMedium
                            ?.copyWith(fontWeight: FontWeight.w600),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        l.allClear,
                        style: TextStyle(
                          color: Theme.of(context)
                              .colorScheme
                              .onSurface
                              .withValues(alpha: 0.5),
                          fontSize: 13,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              );
            }

            final lateCount =
                orders.where((o) {
              final sla = DateTime.tryParse(o.slaDeadline);
              return sla != null && sla.isBefore(DateTime.now());
            }).length;

            return ListView.builder(
              padding: EdgeInsets.only(
                top: kToolbarHeight + 16,
                left: 16,
                right: 16,
                bottom: 32,
              ),
              itemCount: orders.length + 1,
              itemBuilder: (ctx, i) {
                // Header summary card
                if (i == 0) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: GlassCard(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 24, vertical: 16),
                      child: Row(
                        children: [
                          _StatChip(
                            value: '${orders.length}',
                            label: l.ordersTotal,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                          const SizedBox(width: 16),
                          if (lateCount > 0)
                            _StatChip(
                              value: '$lateCount',
                              label: l.late,
                              color: const Color(0xFFEF5350),
                            ),
                        ],
                      ),
                    ),
                  );
                }

                final o = orders[i - 1];
                final meta = _meta(o.priority.name);
                final sla = DateTime.tryParse(o.slaDeadline);
                final isLate =
                    sla != null && sla.isBefore(DateTime.now());
                final timeLeft = sla != null
                    ? sla.difference(DateTime.now())
                    : Duration.zero;

                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: GestureDetector(
                    onTap: () => context.go('/agent/orders/${o.id}'),
                    child: GlassCard(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          // Priority badge — emoji + color ring
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: meta.color.withValues(alpha: 0.12),
                              border: Border.all(
                                color: meta.color.withValues(alpha: 0.45),
                                width: 2,
                              ),
                            ),
                            child: Center(
                              child: Text(meta.emoji,
                                  style: const TextStyle(fontSize: 18)),
                            ),
                          ),
                          const SizedBox(width: 14),

                          // Info
                          Expanded(
                            child: Column(
                              crossAxisAlignment:
                                  CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      '#${o.id.substring(0, 8).toUpperCase()}',
                                      style: const TextStyle(
                                        fontFamily: 'monospace',
                                        fontWeight: FontWeight.w700,
                                        fontSize: 14,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: meta.color
                                            .withValues(alpha: 0.12),
                                        borderRadius:
                                            BorderRadius.circular(999),
                                      ),
                                      child: Text(
                                        meta.label,
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w600,
                                          color: meta.color,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  o.createdAt
                                      .substring(0, 16)
                                      .replaceFirst('T', ' '),
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurface
                                        .withValues(alpha: 0.5),
                                  ),
                                ),
                              ],
                            ),
                          ),

                          // SLA countdown — visual emphasis
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              isLate
                                  ? Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFEF5350),
                                        borderRadius:
                                            BorderRadius.circular(999),
                                      ),
                                      child: const Text(
                                        '⏰ Late',
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    )
                                  : Text(
                                      _fmt(timeLeft),
                                      style: TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w700,
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
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onSurface
                                      .withValues(alpha: 0.45),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(width: 8),
                          Icon(
                            Icons.chevron_right_rounded,
                            color: Theme.of(context)
                                .colorScheme
                                .onSurface
                                .withValues(alpha: 0.25),
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

  String _fmt(Duration d) {
    if (d.isNegative) return '0m';
    final h = d.inHours;
    final m = d.inMinutes % 60;
    if (h > 0) return '${h}h ${m}m';
    return '${m}m';
  }
}

class _PriorityMeta {
  final Color color;
  final String emoji;
  final String label;
  const _PriorityMeta(this.color, this.emoji, this.label);
}

class _StatChip extends StatelessWidget {
  const _StatChip(
      {required this.value, required this.label, required this.color});
  final String value;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w800,
            color: color,
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Theme.of(context)
                .colorScheme
                .onSurface
                .withValues(alpha: 0.6),
          ),
        ),
      ],
    );
  }
}
