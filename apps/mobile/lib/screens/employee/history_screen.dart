import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/orders_provider.dart';

/// TARHIB-16 — Historique des commandes de l'employé
class HistoryScreen extends ConsumerWidget {
  const HistoryScreen({super.key});

  Color _statusColor(String s) => switch (s) {
        'DELIVERED' => Colors.green,
        'REJECTED' => Colors.red,
        'IN_PROGRESS' => Colors.orange,
        _ => Colors.grey,
      };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final ordersAsync = ref.watch(ordersProvider);

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(ordersProvider),
      child: ordersAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(e.toString()),
              FilledButton(
                onPressed: () => ref.invalidate(ordersProvider),
                child: Text(l.errorRetry),
              ),
            ],
          ),
        ),
        data: (orders) {
          if (orders.isEmpty) {
            return Center(child: Text(l.noOrders));
          }
          return ListView.separated(
            padding: const EdgeInsets.all(12),
            itemCount: orders.length,
            separatorBuilder: (_, __) => const SizedBox(height: 4),
            itemBuilder: (context, i) {
              final o = orders[i];
              final statusName = o.status.name;
              final color = _statusColor(statusName);
              return Card(
                child: ListTile(
                  onTap: () => context.go('/employee/orders/${o.id}'),
                  leading: CircleAvatar(
                    backgroundColor: color.withOpacity(0.15),
                    child: Text(
                      o.priority.name,
                      style: TextStyle(
                          color: color, fontWeight: FontWeight.bold),
                    ),
                  ),
                  title: Text(
                    o.id.substring(0, 8).toUpperCase(),
                    style: const TextStyle(fontFamily: 'monospace'),
                  ),
                  subtitle: Text(o.createdAt.substring(0, 10)),
                  trailing: Chip(
                    label: Text(
                      _statusLabel(context, statusName),
                      style: TextStyle(color: color, fontSize: 12),
                    ),
                    backgroundColor: color.withOpacity(0.1),
                    side: BorderSide(color: color.withOpacity(0.3)),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  String _statusLabel(BuildContext ctx, String s) {
    final l = AppLocalizations.of(ctx)!;
    return switch (s) {
      'PENDING' => l.orderStatus_PENDING,
      'APPROVED' => l.orderStatus_APPROVED,
      'IN_PROGRESS' => l.orderStatus_IN_PROGRESS,
      'DELIVERED' => l.orderStatus_DELIVERED,
      'REJECTED' => l.orderStatus_REJECTED,
      _ => s,
    };
  }
}
