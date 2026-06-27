import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/orders_provider.dart';

/// TARHIB-18 + TARHIB-19 — Agent: prendre en charge, livrer, signaler rupture
class AgentOrderDetailScreen extends ConsumerStatefulWidget {
  final String orderId;
  const AgentOrderDetailScreen({super.key, required this.orderId});

  @override
  ConsumerState<AgentOrderDetailScreen> createState() =>
      _AgentOrderDetailScreenState();
}

class _AgentOrderDetailScreenState
    extends ConsumerState<AgentOrderDetailScreen> {
  bool _busy = false;

  Future<void> _transition(String newStatus) async {
    setState(() => _busy = true);
    try {
      await ref
          .read(ordersNotifierProvider.notifier)
          .updateStatus(widget.orderId, newStatus);
      ref.invalidate(orderByIdProvider(widget.orderId));
      ref.invalidate(ordersProvider);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _reportOutOfStock(String productId) async {
    // TARHIB-19: decrement inventory via PATCH /inventory/:id
    // Placeholder — wires to InventoryController once routes are added
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Out-of-stock reported for $productId')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final orderAsync = ref.watch(orderByIdProvider(widget.orderId));

    return Scaffold(
      appBar: AppBar(
        title: Text(l.orderDetail),
        leading: BackButton(onPressed: () => context.go('/agent/queue')),
      ),
      body: orderAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(e.toString())),
        data: (order) {
          if (order == null) return Center(child: Text(l.noOrders));

          final status = order.status.name;
          final sla = DateTime.tryParse(order.slaDeadline);
          final isLate = sla != null && sla.isBefore(DateTime.now());

          return Column(
            children: [
              if (isLate)
                MaterialBanner(
                  backgroundColor:
                      Theme.of(context).colorScheme.errorContainer,
                  content: Text(
                    l.slaExpired,
                    style: TextStyle(
                        color: Theme.of(context).colorScheme.onErrorContainer),
                  ),
                  actions: [
                    TextButton(
                        onPressed: () {},
                        child: const SizedBox.shrink())
                  ],
                ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    _infoCard(context, order, sla, l),
                    const SizedBox(height: 16),
                    Text(l.product,
                        style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    ...order.lines.map(
                      (ln) => Card(
                        child: ListTile(
                          title: Text(ln.productId),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text('x${ln.quantity}'),
                              const SizedBox(width: 8),
                              IconButton(
                                icon: const Icon(Icons.remove_shopping_cart,
                                    color: Colors.orange),
                                tooltip: l.reportOutOfStock,
                                onPressed: () =>
                                    _reportOutOfStock(ln.productId),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              _actionBar(context, status, l),
            ],
          );
        },
      ),
    );
  }

  Widget _infoCard(
      BuildContext ctx, order, DateTime? sla, AppLocalizations l) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            _row(l.priority, order.priority.name),
            const Divider(),
            _row(l.orderStatus_PENDING, order.status.name),
            if (sla != null) ...[
              const Divider(),
              _row(l.slaDeadline, _fmt(sla)),
            ],
          ],
        ),
      ),
    );
  }

  Widget _actionBar(BuildContext ctx, String status, AppLocalizations l) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (status == 'PENDING' || status == 'APPROVED')
              FilledButton.icon(
                onPressed: _busy ? null : () => _transition('IN_PROGRESS'),
                icon: const Icon(Icons.play_arrow),
                label: Text(l.markInProgress),
                style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(48)),
              ),
            if (status == 'IN_PROGRESS') ...[
              FilledButton.icon(
                onPressed: _busy ? null : () => _transition('DELIVERED'),
                icon: const Icon(Icons.check),
                label: Text(l.markDelivered),
                style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(48),
                    backgroundColor: Colors.green),
              ),
            ],
            if (_busy)
              const Padding(
                padding: EdgeInsets.only(top: 12),
                child: CircularProgressIndicator(),
              ),
          ],
        ),
      ),
    );
  }

  Widget _row(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(color: Colors.grey)),
            Text(value,
                style: const TextStyle(fontWeight: FontWeight.w600)),
          ],
        ),
      );

  String _fmt(DateTime dt) {
    final d = dt.difference(DateTime.now());
    if (d.isNegative) return 'EXPIRED';
    return '${d.inMinutes} min ${d.inSeconds % 60} s';
  }
}
