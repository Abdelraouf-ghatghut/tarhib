import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/orders_provider.dart';

/// TARHIB-20 — Gestionnaire : approuver ou rejeter une commande
class ManagerOrderDetailScreen extends ConsumerStatefulWidget {
  final String orderId;
  const ManagerOrderDetailScreen({super.key, required this.orderId});

  @override
  ConsumerState<ManagerOrderDetailScreen> createState() =>
      _ManagerOrderDetailScreenState();
}

class _ManagerOrderDetailScreenState
    extends ConsumerState<ManagerOrderDetailScreen> {
  bool _busy = false;

  Future<void> _decide(String status) async {
    setState(() => _busy = true);
    try {
      await ref
          .read(ordersNotifierProvider.notifier)
          .updateStatus(widget.orderId, status);
      ref.invalidate(orderByIdProvider(widget.orderId));
      ref.invalidate(pendingApprovalProvider);
      if (mounted) context.go('/manager/orders');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final orderAsync = ref.watch(orderByIdProvider(widget.orderId));

    return Scaffold(
      appBar: AppBar(
        title: Text(l.orderDetail),
        leading: BackButton(onPressed: () => context.go('/manager/orders')),
      ),
      body: orderAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(e.toString())),
        data: (order) {
          if (order == null) return Center(child: Text(l.noOrders));

          return Column(
            children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          children: [
                            _row(l.priority, order.priority.name),
                            const Divider(),
                            _row(l.slaDeadline, order.slaDeadline.substring(0, 16)),
                            const Divider(),
                            _row(l.orderDetail, order.id.substring(0, 8).toUpperCase()),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(l.product, style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    ...order.lines.map(
                      (ln) => Card(
                        child: ListTile(
                          title: Text(ln.productId),
                          trailing: Text('×${ln.quantity}',
                              style: const TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              if (!_busy)
                SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => _decide('REJECTED'),
                            icon: const Icon(Icons.close, color: Colors.red),
                            label: Text(l.reject,
                                style: const TextStyle(color: Colors.red)),
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size.fromHeight(48),
                              side: const BorderSide(color: Colors.red),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: FilledButton.icon(
                            onPressed: () => _decide('APPROVED'),
                            icon: const Icon(Icons.check),
                            label: Text(l.approve),
                            style: FilledButton.styleFrom(
                              minimumSize: const Size.fromHeight(48),
                              backgroundColor: Colors.green,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              else
                const Padding(
                  padding: EdgeInsets.all(24),
                  child: CircularProgressIndicator(),
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
}
