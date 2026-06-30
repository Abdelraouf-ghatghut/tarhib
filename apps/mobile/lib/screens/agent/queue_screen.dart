import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/auth_provider.dart';
import '../../providers/orders_provider.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_card.dart';
import '../../widgets/glass_app_bar.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/tarhib_scaffold.dart';
import 'order_detail_screen.dart' show queueNavProvider;

/// TARHIB-17 — File agent avec filtres, sélection multiple, et navigation
class QueueScreen extends ConsumerStatefulWidget {
  const QueueScreen({super.key});

  @override
  ConsumerState<QueueScreen> createState() => _QueueScreenState();
}

class _QueueScreenState extends ConsumerState<QueueScreen> {
  Timer? _slaTimer;
  Timer? _refreshTimer;

  // Filtres
  String? _priorityFilter; // null = all
  String? _statusFilter;   // null = all

  // Sélection multiple
  bool _selecting = false;
  final Set<String> _selected = {};

  @override
  void initState() {
    super.initState();
    _slaTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
    _refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      ref.invalidate(ordersProvider);
      ref.invalidate(agentQueueProvider);
    });
  }

  @override
  void dispose() {
    _slaTimer?.cancel();
    _refreshTimer?.cancel();
    super.dispose();
  }

  static const _priorityMeta = {
    'P1': _PriorityMeta(Color(0xFFEF5350), '🔴'),
    'P2': _PriorityMeta(Color(0xFFFF7043), '🟠'),
    'P3': _PriorityMeta(Color(0xFFFFA726), '🟡'),
    'P4': _PriorityMeta(Color(0xFF42A5F5), '🔵'),
    'P5': _PriorityMeta(Color(0xFF78909C), '⚪'),
  };

  _PriorityMeta _meta(String p) =>
      _priorityMeta[p] ?? const _PriorityMeta(Color(0xFF78909C), '⚪');

  Future<void> _batchTransition(String newStatus) async {
    if (_selected.isEmpty) return;
    HapticFeedback.mediumImpact();
    final notifier = ref.read(ordersNotifierProvider.notifier);
    await Future.wait(_selected.map((id) => notifier.updateStatus(id, newStatus)));
    ref.invalidate(ordersProvider);
    ref.invalidate(agentQueueProvider);
    setState(() {
      _selected.clear();
      _selecting = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final locale = ref.watch(localeProvider);
    final queueAsync = ref.watch(agentQueueProvider);

    return TarhibScaffold(
      appBar: GlassAppBar(
        title: _selecting
            ? Text(l.nSelected(_selected.length),
                style: const TextStyle(fontWeight: FontWeight.bold))
            : Text(l.orderQueue,
                style: const TextStyle(fontWeight: FontWeight.bold)),
        actions: _selecting
            ? [
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => setState(() {
                    _selecting = false;
                    _selected.clear();
                  }),
                ),
              ]
            : [
                IconButton(
                  icon: Text(
                    locale.languageCode == 'ar' ? 'EN' : 'ع',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                  onPressed: () {
                    final next = locale.languageCode == 'ar' ? 'en' : 'ar';
                    ref.read(localeProvider.notifier).state = Locale(next);
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.checklist_rounded),
                  tooltip: l.selectAll,
                  onPressed: () => setState(() => _selecting = true),
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
                  tooltip: AppLocalizations.of(context)!.vipStock,
                  onPressed: () => context.push('/agent/vip-stock'),
                ),
                IconButton(
                  icon: const Icon(Icons.person_outline_rounded),
                  onPressed: () => context.push('/profile'),
                ),
                const SizedBox(width: 4),
              ],
      ),
      child: Column(
        children: [
          // Batch action bar
          if (_selecting && _selected.isNotEmpty)
            _BatchBar(
              count: _selected.length,
              l: l,
              onStart: () => _batchTransition('IN_PROGRESS'),
              onDeliver: () => _batchTransition('DELIVERED'),
            ),

          // Filter chips
          _FilterRow(
            priorityFilter: _priorityFilter,
            statusFilter: _statusFilter,
            onPriorityChanged: (p) => setState(() => _priorityFilter = p),
            onStatusChanged: (s) => setState(() => _statusFilter = s),
            l: l,
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
                  // Apply filters
                  var displayed = orders.where((o) {
                    if (_priorityFilter != null &&
                        o.priority.name != _priorityFilter) return false;
                    if (_statusFilter != null &&
                        o.status.name != _statusFilter) return false;
                    return true;
                  }).toList();

                  if (displayed.isEmpty) {
                    return EmptyState(
                      type: EmptyStateType.queue,
                      title: l.noOrdersInQueue,
                      subtitle: l.allClear,
                    );
                  }

                  final now = DateTime.now();
                  final lateCount = orders.where((o) {
                    final sla = DateTime.tryParse(o.slaDeadline);
                    return sla != null && sla.isBefore(now);
                  }).length;

                  return ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                    itemCount: displayed.length + 1,
                    itemBuilder: (ctx, i) {
                      if (i == 0) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: GlassCard(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 24, vertical: 14),
                            child: Row(
                              children: [
                                _StatChip(
                                  value: '${displayed.length}',
                                  label: l.ordersTotal,
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                                if (lateCount > 0) ...[
                                  const SizedBox(width: 24),
                                  _StatChip(
                                    value: '$lateCount',
                                    label: l.late,
                                    color: const Color(0xFFEF5350),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        );
                      }

                      final o = displayed[i - 1];
                      final meta = _meta(o.priority.name);
                      final sla = DateTime.tryParse(o.slaDeadline);
                      final isLate = sla != null && sla.isBefore(now);
                      final isSelected = _selected.contains(o.id);

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: GestureDetector(
                          onTap: () {
                            if (_selecting) {
                              HapticFeedback.selectionClick();
                              setState(() {
                                if (isSelected) {
                                  _selected.remove(o.id);
                                } else {
                                  _selected.add(o.id);
                                }
                              });
                            } else {
                              // Store ordered IDs for prev/next navigation
                              ref.read(queueNavProvider.notifier).state =
                                  displayed.map((d) => d.id).toList();
                              context.go('/agent/orders/${o.id}');
                            }
                          },
                          onLongPress: () {
                            HapticFeedback.mediumImpact();
                            setState(() {
                              _selecting = true;
                              _selected.add(o.id);
                            });
                          },
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 150),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(20),
                              border: isSelected
                                  ? Border.all(
                                      color: Theme.of(context).colorScheme.primary,
                                      width: 2)
                                  : null,
                            ),
                            child: GlassCard(
                              padding: const EdgeInsets.all(16),
                              child: Row(
                                children: [
                                  if (_selecting)
                                    Padding(
                                      padding: const EdgeInsets.only(right: 12),
                                      child: Icon(
                                        isSelected
                                            ? Icons.check_circle_rounded
                                            : Icons.radio_button_unchecked_rounded,
                                        color: isSelected
                                            ? Theme.of(context).colorScheme.primary
                                            : Theme.of(context)
                                                .colorScheme
                                                .onSurface
                                                .withValues(alpha: 0.3),
                                      ),
                                    ),
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
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
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
                                                color: meta.color.withValues(alpha: 0.12),
                                                borderRadius: BorderRadius.circular(999),
                                              ),
                                              child: Text(
                                                o.priority.name,
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
                                          o.status.name,
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
                                              child: Text(
                                                l.slaExpired,
                                                style: const TextStyle(
                                                    fontSize: 11,
                                                    color: Colors.white,
                                                    fontWeight: FontWeight.bold),
                                              ),
                                            )
                                          : sla != null
                                              ? _LiveCountdown(deadline: sla)
                                              : const SizedBox.shrink(),
                                    ],
                                  ),
                                  if (!_selecting) ...[
                                    const SizedBox(width: 8),
                                    Icon(
                                      Icons.chevron_right_rounded,
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurface
                                          .withValues(alpha: 0.25),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Filter row ────────────────────────────────────────────────────────────────

class _FilterRow extends StatelessWidget {
  const _FilterRow({
    required this.priorityFilter,
    required this.statusFilter,
    required this.onPriorityChanged,
    required this.onStatusChanged,
    required this.l,
  });
  final String? priorityFilter;
  final String? statusFilter;
  final ValueChanged<String?> onPriorityChanged;
  final ValueChanged<String?> onStatusChanged;
  final AppLocalizations l;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return SizedBox(
      height: 44,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
        children: [
          // All filter
          _Chip(
            label: l.filterAll,
            selected: priorityFilter == null && statusFilter == null,
            color: scheme.primary,
            onTap: () {
              onPriorityChanged(null);
              onStatusChanged(null);
            },
          ),
          const SizedBox(width: 8),
          // Priority filters
          for (final p in ['P1', 'P2', 'P3']) ...[
            _Chip(
              label: p,
              selected: priorityFilter == p,
              color: const {
                'P1': Color(0xFFEF5350),
                'P2': Color(0xFFFF7043),
                'P3': Color(0xFFFFA726),
              }[p]!,
              onTap: () => onPriorityChanged(priorityFilter == p ? null : p),
            ),
            const SizedBox(width: 8),
          ],
          // Status filters
          _Chip(
            label: l.orderStatus_PENDING,
            selected: statusFilter == 'PENDING',
            color: Colors.orange,
            onTap: () => onStatusChanged(statusFilter == 'PENDING' ? null : 'PENDING'),
          ),
          const SizedBox(width: 8),
          _Chip(
            label: l.orderStatus_IN_PROGRESS,
            selected: statusFilter == 'IN_PROGRESS',
            color: Colors.blue,
            onTap: () =>
                onStatusChanged(statusFilter == 'IN_PROGRESS' ? null : 'IN_PROGRESS'),
          ),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({
    required this.label,
    required this.selected,
    required this.color,
    required this.onTap,
  });
  final String label;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? color : color.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
              color: selected ? color : color.withValues(alpha: 0.3),
              width: selected ? 0 : 1),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: selected ? Colors.white : color,
          ),
        ),
      ),
    );
  }
}

// ── Batch action bar ──────────────────────────────────────────────────────────

class _BatchBar extends StatelessWidget {
  const _BatchBar({
    required this.count,
    required this.l,
    required this.onStart,
    required this.onDeliver,
  });
  final int count;
  final AppLocalizations l;
  final VoidCallback onStart;
  final VoidCallback onDeliver;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      color: scheme.primaryContainer,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton.icon(
              onPressed: onStart,
              icon: const Icon(Icons.play_arrow_rounded, size: 16),
              label: Text(l.batchStart, style: const TextStyle(fontSize: 12)),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(0, 36),
                padding: const EdgeInsets.symmetric(horizontal: 12),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: FilledButton.icon(
              onPressed: onDeliver,
              icon: const Icon(Icons.check_circle_rounded, size: 16),
              label: Text(l.batchMarkDelivered, style: const TextStyle(fontSize: 12)),
              style: FilledButton.styleFrom(
                minimumSize: const Size(0, 36),
                backgroundColor: Colors.green,
                padding: const EdgeInsets.symmetric(horizontal: 12),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Live countdown ────────────────────────────────────────────────────────────

class _LiveCountdown extends StatelessWidget {
  const _LiveCountdown({required this.deadline});
  final DateTime deadline;

  @override
  Widget build(BuildContext context) {
    final remaining = deadline.difference(DateTime.now());
    final color = remaining.inMinutes < 5
        ? Colors.orange
        : Theme.of(context).colorScheme.primary;
    final h = remaining.inHours;
    final m = remaining.inMinutes % 60;
    final s = remaining.inSeconds % 60;
    final text = h > 0 ? '${h}h ${m}m' : '${m}m ${s}s';

    return Text(
      text,
      style: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w700,
        color: color,
        fontFamily: 'monospace',
      ),
    );
  }
}

class _PriorityMeta {
  final Color color;
  final String emoji;
  const _PriorityMeta(this.color, this.emoji);
}

class _StatChip extends StatelessWidget {
  const _StatChip({required this.value, required this.label, required this.color});
  final String value;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(value,
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: color)),
        const SizedBox(width: 6),
        Text(label,
            style: TextStyle(
                fontSize: 12,
                color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6))),
      ],
    );
  }
}
