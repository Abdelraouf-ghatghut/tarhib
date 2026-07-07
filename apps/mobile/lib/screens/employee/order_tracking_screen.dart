import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/orders_provider.dart';
import '../../theme/snow_colors.dart';
import '../../widgets/error_card.dart';
import '../../widgets/glass_app_bar.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/order_line_tile.dart';
import '../../widgets/status_badge.dart';
import '../../widgets/tarhib_scaffold.dart';

/// TARHIB-15 — Suivi commande en temps réel + compte à rebours SLA.
/// Timeline verticale SnowUI (icône + couleur + heure par étape) — la
/// commande étant pré-validée dans le panier, il n'y a plus de section
/// "lignes rejetées" ici : les lignes affichées sont toutes acceptées.
class OrderTrackingScreen extends ConsumerStatefulWidget {
  final String orderId;
  const OrderTrackingScreen({super.key, required this.orderId});

  @override
  ConsumerState<OrderTrackingScreen> createState() =>
      _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends ConsumerState<OrderTrackingScreen> {
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _refreshTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      ref.invalidate(orderByIdProvider(widget.orderId));
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final orderAsync = ref.watch(orderByIdProvider(widget.orderId));

    return TarhibScaffold(
      appBar: GlassAppBar(
        title: Text(l.orderDetail),
        centerTitle: true,
      ),
      child: orderAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: ErrorCard(
            error: e,
            onRetry: () => ref.invalidate(orderByIdProvider(widget.orderId)),
            margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 80),
          ),
        ),
        data: (order) {
          if (order == null) {
            return Center(child: Text(l.noOrders));
          }

          final sla = DateTime.tryParse(order.slaDeadline);
          final isRejected = order.status.name == 'REJECTED';
          final isDone = order.status.name == 'DELIVERED' || isRejected;
          if (isDone) _refreshTimer?.cancel();

          return ListView(
            padding: const EdgeInsets.fromLTRB(20, kToolbarHeight + 16, 20, 32),
            children: [
              Row(
                children: [
                  StatusBadge(
                    label: order.priority.name,
                    tone: SnowStatusTone.primary,
                    icon: Icons.bolt_rounded,
                  ),
                  const Spacer(),
                  Text(
                    '#${order.id.substring(0, 8).toUpperCase()}',
                    style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        color: SnowColors.textMuted),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // ── Timeline ─────────────────────────────────────────────────
              GlassCard(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
                child: isRejected
                    ? _RejectedRow(l: l)
                    : _StatusTimeline(statusName: order.status.name),
              ),
              const SizedBox(height: 16),

              // ── SLA card ─────────────────────────────────────────────────
              if (sla != null && !isDone)
                GlassCard(
                  child: _SlaCountdown(deadline: sla),
                )
              else if (sla != null)
                GlassCard(
                  child: _InfoRow(
                    label: l.slaDeadline,
                    value: DateFormat.yMd().add_Hm().format(sla.toLocal()),
                  ),
                ),
              const SizedBox(height: 20),

              // ── Lines ─────────────────────────────────────────────────────
              Text(l.orderLines,
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 10),
              GlassCard(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Column(
                  children: order.lines
                      .map((ln) => OrderLineTile(
                            productId: ln.productId,
                            quantity: ln.quantity.toInt(),
                          ))
                      .toList(),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _RejectedRow extends StatelessWidget {
  const _RejectedRow({required this.l});
  final AppLocalizations l;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: const BoxDecoration(
              color: SnowColors.dangerSoft, shape: BoxShape.circle),
          child: const Icon(Icons.close_rounded,
              color: SnowColors.dangerStrong, size: 24),
        ),
        const SizedBox(width: 14),
        Text(
          l.orderStatus_REJECTED,
          style: const TextStyle(
              color: SnowColors.dangerStrong,
              fontWeight: FontWeight.w700,
              fontSize: 15),
        ),
      ],
    );
  }
}

// ── Info row ─────────────────────────────────────────────────────────────────

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: SnowColors.textMuted, fontSize: 13)),
        Text(value,
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
      ],
    );
  }
}

// ── SLA countdown (ticks every second) ───────────────────────────────────────

class _SlaCountdown extends StatefulWidget {
  final DateTime deadline;
  const _SlaCountdown({required this.deadline});

  @override
  State<_SlaCountdown> createState() => _SlaCountdownState();
}

class _SlaCountdownState extends State<_SlaCountdown> {
  late Timer _timer;
  late Duration _remaining;

  @override
  void initState() {
    super.initState();
    _remaining = widget.deadline.difference(DateTime.now());
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) {
        setState(
            () => _remaining = widget.deadline.difference(DateTime.now()));
      }
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final expired = _remaining.isNegative;
    final color = expired
        ? SnowColors.dangerStrong
        : _remaining.inMinutes < 5
            ? SnowColors.warningStrong
            : SnowColors.successStrong;
    final bg = expired
        ? SnowColors.dangerSoft
        : _remaining.inMinutes < 5
            ? SnowColors.warningSoft
            : SnowColors.successSoft;

    return Row(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
          child: Icon(Icons.timer_rounded, color: color, size: 22),
        ),
        const SizedBox(width: 14),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(l.timeRemaining,
                style: const TextStyle(fontSize: 12, color: SnowColors.textMuted)),
            const SizedBox(height: 2),
            Text(
              expired
                  ? l.slaExpired
                  : '${_remaining.inMinutes.abs()} ${l.minutesShort} ${_remaining.inSeconds.abs() % 60}s',
              style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 16),
            ),
          ],
        ),
      ],
    );
  }
}

// ── Timeline verticale SnowUI ────────────────────────────────────────────────

class _StatusTimeline extends StatelessWidget {
  final String statusName;
  const _StatusTimeline({required this.statusName});

  static const _steps = ['PENDING', 'APPROVED', 'IN_PROGRESS', 'DELIVERED'];
  int get _idx => _steps.indexOf(statusName).clamp(0, _steps.length - 1);

  IconData _iconFor(String s) => switch (s) {
        'PENDING' => Icons.check_circle_rounded,
        'APPROVED' => Icons.verified_rounded,
        'IN_PROGRESS' => Icons.local_cafe_rounded,
        'DELIVERED' => Icons.done_all_rounded,
        _ => Icons.circle,
      };

  String _label(BuildContext ctx, String s) {
    final l = AppLocalizations.of(ctx)!;
    return switch (s) {
      'PENDING' => l.orderStatus_PENDING,
      'APPROVED' => l.orderStatus_APPROVED,
      'IN_PROGRESS' => l.orderStatus_IN_PROGRESS,
      'DELIVERED' => l.orderStatus_DELIVERED,
      _ => s,
    };
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var i = 0; i < _steps.length; i++)
          _TimelineRow(
            icon: _iconFor(_steps[i]),
            label: _label(context, _steps[i]),
            state: i < _idx
                ? _TimelineState.done
                : i == _idx
                    ? _TimelineState.active
                    : _TimelineState.pending,
            isLast: i == _steps.length - 1,
          ),
      ],
    );
  }
}

enum _TimelineState { done, active, pending }

class _TimelineRow extends StatelessWidget {
  const _TimelineRow({
    required this.icon,
    required this.label,
    required this.state,
    required this.isLast,
  });
  final IconData icon;
  final String label;
  final _TimelineState state;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final done = state != _TimelineState.pending;
    final active = state == _TimelineState.active;
    final color = done ? SnowColors.primary : SnowColors.textMuted;
    final bg = done ? SnowColors.primarySoft : SnowColors.surfaceMuted;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: bg,
                  shape: BoxShape.circle,
                  boxShadow: active
                      ? [
                          BoxShadow(
                              color: SnowColors.primary.withValues(alpha: 0.35),
                              blurRadius: 10),
                        ]
                      : null,
                ),
                child: Icon(icon, size: 18, color: color),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: 2,
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    color: done ? SnowColors.primarySoft : SnowColors.border,
                  ),
                ),
            ],
          ),
          const SizedBox(width: 14),
          Padding(
            padding: const EdgeInsets.only(top: 7, bottom: 20),
            child: Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: active ? FontWeight.w800 : FontWeight.w600,
                color: done ? SnowColors.textPrimary : SnowColors.textMuted,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
