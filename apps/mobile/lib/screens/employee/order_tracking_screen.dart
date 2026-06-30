import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/orders_provider.dart';
import '../../widgets/error_card.dart';
import '../../widgets/glass_app_bar.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/order_line_tile.dart';
import '../../widgets/tarhib_scaffold.dart';

/// TARHIB-15 — Suivi commande en temps réel + compte à rebours SLA
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
          final isDone = order.status.name == 'DELIVERED' ||
              order.status.name == 'REJECTED';
          if (isDone) _refreshTimer?.cancel();

          return ListView(
            padding: const EdgeInsets.fromLTRB(20, kToolbarHeight + 16, 20, 32),
            children: [
              // ── Status stepper ────────────────────────────────────────────
              GlassCard(
                padding: const EdgeInsets.all(16),
                child: _StatusStepper(statusName: order.status.name),
              ),
              const SizedBox(height: 16),

              // ── Priority / SLA card ───────────────────────────────────────
              GlassCard(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    _InfoRow(label: l.priority, value: order.priority.name),
                    const Divider(height: 24),
                    _InfoRow(
                      label: l.slaDeadline,
                      value: sla != null
                          ? DateFormat.yMd().add_Hm().format(sla.toLocal())
                          : order.slaDeadline,
                    ),
                    if (sla != null && !isDone) ...[
                      const Divider(height: 24),
                      _SlaCountdown(deadline: sla),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // ── Lines ─────────────────────────────────────────────────────
              Text(l.validationResult,
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 10),
              GlassCard(
                padding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 8),
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
        Text(label,
            style: TextStyle(
                color: Theme.of(context)
                    .colorScheme
                    .onSurface
                    .withValues(alpha: 0.55),
                fontSize: 13)),
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
        ? Theme.of(context).colorScheme.error
        : _remaining.inMinutes < 5
            ? Colors.orange
            : Colors.green;

    return Row(
      children: [
        Icon(Icons.timer_rounded, color: color, size: 20),
        const SizedBox(width: 8),
        Text(
          expired
              ? l.slaExpired
              : '${_remaining.inMinutes.abs()} m ${_remaining.inSeconds.abs() % 60} s',
          style: TextStyle(
              color: color,
              fontWeight: FontWeight.w700,
              fontSize: 15,
              fontFamily: 'monospace'),
        ),
      ],
    );
  }
}

// ── Status stepper ────────────────────────────────────────────────────────────

class _StatusStepper extends StatelessWidget {
  final String statusName;
  const _StatusStepper({required this.statusName});

  static const _steps = ['PENDING', 'APPROVED', 'IN_PROGRESS', 'DELIVERED'];
  int get _idx => _steps.indexOf(statusName).clamp(0, _steps.length - 1);

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
    if (statusName == 'REJECTED') {
      return ListTile(
        leading: Icon(Icons.cancel_rounded,
            color: Theme.of(context).colorScheme.error, size: 32),
        title: Text(
          AppLocalizations.of(context)!.orderStatus_REJECTED,
          style: TextStyle(
              color: Theme.of(context).colorScheme.error,
              fontWeight: FontWeight.bold),
        ),
      );
    }
    return Stepper(
      currentStep: _idx,
      physics: const NeverScrollableScrollPhysics(),
      controlsBuilder: (_, __) => const SizedBox.shrink(),
      steps: _steps
          .map((s) => Step(
                title: Text(_label(context, s),
                    style: const TextStyle(fontSize: 13)),
                content: const SizedBox.shrink(),
                isActive: _steps.indexOf(s) <= _idx,
                state: _steps.indexOf(s) < _idx
                    ? StepState.complete
                    : _steps.indexOf(s) == _idx
                        ? StepState.indexed
                        : StepState.disabled,
              ))
          .toList(),
    );
  }
}
