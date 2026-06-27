import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/orders_provider.dart';

/// TARHIB-15 — Suivi commande en temps réel + compte à rebours SLA
class OrderTrackingScreen extends ConsumerStatefulWidget {
  final String orderId;
  const OrderTrackingScreen({super.key, required this.orderId});

  @override
  ConsumerState<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
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

    return Scaffold(
      appBar: AppBar(title: Text(l.orderDetail)),
      body: orderAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(e.toString())),
        data: (order) {
          if (order == null) return Center(child: Text(l.noOrders));
          final sla = DateTime.tryParse(order.slaDeadline);
          final isDone =
              order.status.name == 'DELIVERED' || order.status.name == 'REJECTED';
          if (isDone) _refreshTimer?.cancel();

          return ListView(
            padding: const EdgeInsets.all(24),
            children: [
              _StatusStepper(statusName: order.status.name),
              const SizedBox(height: 24),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      _row(l.priority, order.priority.name),
                      const Divider(),
                      _row(l.slaDeadline,
                          sla != null ? _fmt(sla) : order.slaDeadline),
                      if (sla != null && !isDone) ...[
                        const Divider(),
                        _SlaCountdown(deadline: sla),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(l.validationResult,
                  style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              ...order.lines.map(
                (ln) => ListTile(
                  leading: const Icon(Icons.check_circle_outline, color: Colors.green),
                  title: Text(ln.productId),
                  trailing: Text('x${ln.quantity}'),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _row(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(color: Colors.grey)),
            Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
          ],
        ),
      );

  String _fmt(DateTime dt) {
    final d = dt.difference(DateTime.now());
    if (d.isNegative) return '--';
    return '${d.inMinutes} min ${d.inSeconds % 60} s';
  }
}

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
      if (!mounted) return;
      setState(() => _remaining = widget.deadline.difference(DateTime.now()));
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
        Icon(Icons.timer_outlined, color: color, size: 20),
        const SizedBox(width: 8),
        Text(
          expired
              ? l.slaExpired
              : '${_remaining.inMinutes.abs()} min ${_remaining.inSeconds.abs() % 60} s',
          style: TextStyle(color: color, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }
}

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
        leading: const Icon(Icons.cancel, color: Colors.red, size: 32),
        title: Text(AppLocalizations.of(context)!.orderStatus_REJECTED,
            style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
      );
    }
    return Stepper(
      currentStep: _idx,
      physics: const NeverScrollableScrollPhysics(),
      controlsBuilder: (_, __) => const SizedBox.shrink(),
      steps: _steps
          .map((s) => Step(
                title: Text(_label(context, s)),
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
