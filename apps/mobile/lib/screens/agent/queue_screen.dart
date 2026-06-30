import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/auth_provider.dart';
import '../../providers/connectivity_provider.dart';
import '../../providers/orders_provider.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_card.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/tarhib_scaffold.dart';
import 'order_detail_screen.dart' show queueNavProvider;

/// TARHIB-17 — Agent order queue: status filters, batch actions, SLA countdown
class QueueScreen extends ConsumerStatefulWidget {
  const QueueScreen({super.key});

  @override
  ConsumerState<QueueScreen> createState() => _QueueScreenState();
}

class _QueueScreenState extends ConsumerState<QueueScreen> {
  String _filter = 'ALL';
  final Set<String> _selected = {};
  Timer? _refreshTimer;

  bool get _isSelecting => _selected.isNotEmpty;

  @override
  void initState() {
    super.initState();
    _refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) {
        ref.invalidate(ordersProvider);
        ref.invalidate(agentQueueProvider);
      }
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  Color _priorityColor(String p) => switch (p) {
        'P1' => const Color(0xFFFF4D4F),
        'P2' => const Color(0xFFFF991F),
        'P3' => const Color(0xFFFF991F),
        'P4' => const Color(0xFF0052CC),
        'P5' => const Color(0xFF6B778C),
        _ => const Color(0xFF6B778C),
      };

  Color _statusColor(String s) => switch (s) {
        'PENDING' => const Color(0xFFFF991F),
        'APPROVED' => const Color(0xFF0052CC),
        'IN_PROGRESS' => const Color(0xFF00A3BF),
        'DELIVERED' => const Color(0xFF36B37E),
        'REJECTED' => const Color(0xFFFF4D4F),
        _ => const Color(0xFF6B778C),
      };

  String _statusLabel(String s, AppLocalizations l) => switch (s) {
        'PENDING' => l.orderStatus_PENDING,
        'APPROVED' => l.orderStatus_APPROVED,
        'IN_PROGRESS' => l.orderStatus_IN_PROGRESS,
        'DELIVERED' => l.orderStatus_DELIVERED,
        'REJECTED' => l.orderStatus_REJECTED,
        _ => s,
      };

  Future<void> _batchTransition(String newStatus) async {
    if (_selected.isEmpty) return;
    HapticFeedback.mediumImpact();
    final notifier = ref.read(ordersNotifierProvider.notifier);
    await Future.wait(_selected.map((id) => notifier.updateStatus(id, newStatus)));
    ref.invalidate(ordersProvider);
    ref.invalidate(agentQueueProvider);
    setState(() => _selected.clear());
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final locale = ref.watch(localeProvider);
    final queueAsync = ref.watch(agentQueueProvider);
    final connectivity = ref.watch(connectivityProvider);
    final isOffline = connectivity.maybeWhen(data: (v) => !v, orElse: () => false);
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return TarhibScaffold(
      appBar: AppBar(
        title: Text(
          _isSelecting ? l.nSelected(_selected.length) : l.orderQueue,
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
        ),
        scrolledUnderElevation: 1,
        actions: _isSelecting
            ? [
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => setState(() => _selected.clear()),
                  tooltip: l.cancel,
                ),
              ]
            : [
                IconButton(
                  icon: Text(
                    locale.languageCode == 'ar' ? 'EN' : 'ع',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: cs.primary,
                    ),
                  ),
                  onPressed: () {
                    final next = locale.languageCode == 'ar' ? 'en' : 'ar';
                    ref.read(localeProvider.notifier).state = Locale(next);
                  },
                  tooltip: l.language,
                ),
                IconButton(
                  icon: const Icon(Icons.refresh_rounded),
                  onPressed: () {
                    ref.invalidate(ordersProvider);
                    ref.invalidate(agentQueueProvider);
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.inventory_2_outlined),
                  tooltip: l.vipStock,
                  onPressed: () => context.push('/agent/vip-stock'),
                ),
                IconButton(
                  icon: const Icon(Icons.person_outline_rounded),
                  onPressed: () => context.push('/profile'),
                  tooltip: l.profile,
                ),
                const SizedBox(width: 4),
              ],
      ),
      child: Column(
        children: [
          if (isOffline)
            Material(
              color: const Color(0xFFFF991F),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                child: Row(
                  children: [
                    const Icon(Icons.wifi_off_rounded,
                        size: 14, color: Colors.white),
                    const SizedBox(width: 8),
                    Text(
                      l.offlineMode,
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
            ),
          _FilterRow(
            filter: _filter,
            onChanged: (f) => setState(() => _filter = f),
            l: l,
            cs: cs,
          ),

          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(ordersProvider);
                ref.invalidate(agentQueueProvider);
              },
              child: queueAsync.when(
                loading: () => const QueueSkeleton(),
                error: (e, _) => Center(
                  child: ErrorCard(
                    error: e,
                    onRetry: () => ref.invalidate(agentQueueProvider),
                    margin: const EdgeInsets.symmetric(
                        horizontal: 24, vertical: 80),
                  ),
                ),
                data: (orders) {
                  final now = DateTime.now();

                  final displayed = orders.where((o) {
                    if (_filter == 'ALL') return true;
                    return o.status.name == _filter;
                  }).toList();

                  if (displayed.isEmpty) {
                    return EmptyState(
                      type: EmptyStateType.queue,
                      title: l.noOrdersInQueue,
                      subtitle: l.allClear,
                    );
                  }

                  final lateCount = orders
                      .where((o) {
                        final sla = DateTime.tryParse(o.slaDeadline);
                        return sla != null && sla.isBefore(now);
                      })
                      .length;

                  return ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                    itemCount: displayed.length + 1,
                    itemBuilder: (ctx, i) {
                      if (i == 0) {
                        return _SummaryBar(
                          total: displayed.length,
                          lateCount: lateCount,
                          l: l,
                          cs: cs,
                          isDark: isDark,
                        );
                      }

                      final o = displayed[i - 1];
                      final isSelected = _selected.contains(o.id);

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _OrderQueueCard(
                          order: o,
                          isSelected: isSelected,
                          isSelecting: _isSelecting,
                          priorityColor: _priorityColor(o.priority.name),
                          statusColor: _statusColor(o.status.name),
                          statusLabel: _statusLabel(o.status.name, l),
                          isDark: isDark,
                          cs: cs,
                          l: l,
                          onTap: () {
                            if (_isSelecting) {
                              HapticFeedback.selectionClick();
                              setState(() {
                                if (isSelected) {
                                  _selected.remove(o.id);
                                } else {
                                  _selected.add(o.id);
                                }
                              });
                            } else {
                              ref.read(queueNavProvider.notifier).state =
                                  displayed.map((d) => d.id).toList();
                              context.go('/agent/orders/${o.id}');
                            }
                          },
                          onLongPress: () {
                            HapticFeedback.mediumImpact();
                            setState(() => _selected.add(o.id));
                          },
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ),

          if (_selected.isNotEmpty)
            _BatchBar(
              count: _selected.length,
              l: l,
              cs: cs,
              onStart: () => _batchTransition('IN_PROGRESS'),
              onDeliver: () => _batchTransition('DELIVERED'),
              onClear: () => setState(() => _selected.clear()),
              onSelectAll: () {
                final orders = ref.read(agentQueueProvider).value ?? [];
                final filtered = orders.where((o) {
                  if (_filter == 'ALL') return true;
                  return o.status.name == _filter;
                });
                setState(() =>
                    _selected.addAll(filtered.map((o) => o.id)));
              },
            ),
        ],
      ),
    );
  }
}

// ── Summary bar ───────────────────────────────────────────────────────────────

class _SummaryBar extends StatelessWidget {
  const _SummaryBar({
    required this.total,
    required this.lateCount,
    required this.l,
    required this.cs,
    required this.isDark,
  });

  final int total;
  final int lateCount;
  final AppLocalizations l;
  final ColorScheme cs;
  final bool isDark;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF141414) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: isDark
            ? const []
            : const [
                BoxShadow(
                  color: Color(0x0A000000),
                  blurRadius: 8,
                  offset: Offset(0, 2),
                ),
              ],
      ),
      child: Row(
        children: [
          _StatItem(
            value: '$total',
            label: l.ordersTotal,
            color: cs.primary,
          ),
          if (lateCount > 0) ...[
            const SizedBox(width: 4),
            Container(
              width: 1,
              height: 28,
              color: cs.onSurface.withValues(alpha: 0.12),
              margin: const EdgeInsets.symmetric(horizontal: 12),
            ),
            _StatItem(
              value: '$lateCount',
              label: l.late,
              color: const Color(0xFFFF4D4F),
              icon: Icons.warning_amber_rounded,
            ),
          ],
        ],
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  const _StatItem({
    required this.value,
    required this.label,
    required this.color,
    this.icon,
  });

  final String value;
  final String label;
  final Color color;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (icon != null) ...[
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 4),
        ],
        Text(
          value,
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: color,
            height: 1,
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.55),
          ),
        ),
      ],
    );
  }
}

// ── Order queue card ──────────────────────────────────────────────────────────

class _OrderQueueCard extends StatelessWidget {
  const _OrderQueueCard({
    required this.order,
    required this.isSelected,
    required this.isSelecting,
    required this.priorityColor,
    required this.statusColor,
    required this.statusLabel,
    required this.isDark,
    required this.cs,
    required this.l,
    required this.onTap,
    required this.onLongPress,
  });

  final dynamic order;
  final bool isSelected;
  final bool isSelecting;
  final Color priorityColor;
  final Color statusColor;
  final String statusLabel;
  final bool isDark;
  final ColorScheme cs;
  final AppLocalizations l;
  final VoidCallback onTap;
  final VoidCallback onLongPress;

  @override
  Widget build(BuildContext context) {
    final textSecondary = cs.onSurface.withValues(alpha: 0.55);
    final shortId = order.id.length >= 8
        ? order.id.substring(0, 8).toUpperCase()
        : order.id.toUpperCase();

    return GestureDetector(
      onTap: onTap,
      onLongPress: onLongPress,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF141414) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: isSelected
              ? Border.all(color: cs.primary, width: 2)
              : Border.all(color: Colors.transparent, width: 2),
          boxShadow: isDark
              ? const []
              : const [
                  BoxShadow(
                    color: Color(0x0A000000),
                    blurRadius: 8,
                    offset: Offset(0, 2),
                  ),
                ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      color: priorityColor,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      order.priority.name.length > 1
                          ? order.priority.name[1]
                          : order.priority.name,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                        height: 1,
                      ),
                    ),
                  ),

                  const SizedBox(width: 12),

                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '#$shortId',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            fontFamily: 'monospace',
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Flexible(
                              child: Text(
                                order.employeeId,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: textSecondary,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const Spacer(),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: statusColor.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(24),
                              ),
                              child: Text(
                                statusLabel,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: statusColor,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(width: 12),

                  _SlaCountdown(deadline: order.slaDeadline),

                  if (isSelecting) ...[
                    const SizedBox(width: 8),
                    Icon(
                      isSelected
                          ? Icons.check_circle_rounded
                          : Icons.radio_button_unchecked_rounded,
                      size: 22,
                      color: isSelected
                          ? cs.primary
                          : cs.onSurface.withValues(alpha: 0.3),
                    ),
                  ],
                ],
              ),

              const SizedBox(height: 10),

              Text(
                l.confirmOrderItems(order.lines.length as int),
                style: TextStyle(fontSize: 12, color: textSecondary),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── SLA countdown — self-ticking ──────────────────────────────────────────────

class _SlaCountdown extends StatefulWidget {
  const _SlaCountdown({required this.deadline});

  final String deadline;

  @override
  State<_SlaCountdown> createState() => _SlaCountdownState();
}

class _SlaCountdownState extends State<_SlaCountdown> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final deadline = DateTime.tryParse(widget.deadline);
    if (deadline == null) return const SizedBox.shrink();

    final remaining = deadline.difference(DateTime.now());
    final isExpired = remaining.isNegative;
    final isUrgent = !isExpired && remaining.inMinutes <= 5;
    final isWarning = !isExpired && remaining.inMinutes <= 10;

    final color = isExpired || isUrgent
        ? const Color(0xFFFF4D4F)
        : isWarning
            ? const Color(0xFFFF991F)
            : const Color(0xFF36B37E);

    final String text;
    if (isExpired) {
      text = l.slaExpired;
    } else {
      final h = remaining.inHours;
      final m = (remaining.inMinutes % 60).toString().padLeft(2, '0');
      final s = (remaining.inSeconds % 60).toString().padLeft(2, '0');
      text = h > 0 ? '${h}h $m m' : '$m:$s';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
    );
  }
}

// ── Filter row ────────────────────────────────────────────────────────────────

class _FilterRow extends StatelessWidget {
  const _FilterRow({
    required this.filter,
    required this.onChanged,
    required this.l,
    required this.cs,
  });

  final String filter;
  final ValueChanged<String> onChanged;
  final AppLocalizations l;
  final ColorScheme cs;

  @override
  Widget build(BuildContext context) {
    final chips = [
      ('ALL', l.filterAll),
      ('PENDING', l.orderStatus_PENDING),
      ('IN_PROGRESS', l.orderStatus_IN_PROGRESS),
    ];

    return Container(
      height: 48,
      color: Theme.of(context).scaffoldBackgroundColor,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemCount: chips.length,
        itemBuilder: (_, i) {
          final (value, label) = chips[i];
          final selected = filter == value;
          return ChoiceChip(
            label: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: selected
                    ? cs.onPrimary
                    : cs.onSurface.withValues(alpha: 0.7),
              ),
            ),
            selected: selected,
            onSelected: (_) => onChanged(value),
            selectedColor: cs.primary,
            backgroundColor: cs.onSurface.withValues(alpha: 0.06),
            side: BorderSide.none,
            padding: const EdgeInsets.symmetric(horizontal: 4),
            visualDensity: VisualDensity.compact,
            showCheckmark: false,
          );
        },
      ),
    );
  }
}

// ── Batch action bar ──────────────────────────────────────────────────────────

class _BatchBar extends StatelessWidget {
  const _BatchBar({
    required this.count,
    required this.l,
    required this.cs,
    required this.onStart,
    required this.onDeliver,
    required this.onClear,
    required this.onSelectAll,
  });

  final int count;
  final AppLocalizations l;
  final ColorScheme cs;
  final VoidCallback onStart;
  final VoidCallback onDeliver;
  final VoidCallback onClear;
  final VoidCallback onSelectAll;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A1A1A) : Colors.white,
        border: Border(
          top: BorderSide(
            color: cs.onSurface.withValues(alpha: 0.1),
            width: 1,
          ),
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Text(
            l.nSelected(count),
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
          ),
          const Spacer(),
          TextButton(
            onPressed: onSelectAll,
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: Text(l.selectAll, style: const TextStyle(fontSize: 13)),
          ),
          const SizedBox(width: 8),
          FilledButton(
            onPressed: onStart,
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              minimumSize: const Size(0, 36),
              textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
            ),
            child: Text(l.batchStart),
          ),
          const SizedBox(width: 8),
          FilledButton(
            onPressed: onDeliver,
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF36B37E),
              padding: const EdgeInsets.symmetric(horizontal: 12),
              minimumSize: const Size(0, 36),
              textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
            ),
            child: Text(l.batchMarkDelivered),
          ),
        ],
      ),
    );
  }
}
