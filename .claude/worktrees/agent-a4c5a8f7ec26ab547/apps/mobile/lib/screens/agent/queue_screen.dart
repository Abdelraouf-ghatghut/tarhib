import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/auth_provider.dart';
import '../../providers/orders_provider.dart';

/// TARHIB-17 — File des commandes agent, triée par priorité + heure
class QueueScreen extends ConsumerWidget {
  const QueueScreen({super.key});

  Color _priorityColor(String p) => switch (p) {
        'P1' => Colors.red,
        'P2' => Colors.deepOrange,
        'P3' => Colors.orange,
        'P4' => Colors.amber,
        _ => Colors.grey,
      };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final queueAsync = ref.watch(agentQueueProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l.orderQueue),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => ref.read(authProvider.notifier).logout(),
            tooltip: l.logout,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(ordersProvider);
          ref.invalidate(agentQueueProvider);
        },
        child: queueAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(e.toString()),
                FilledButton(
                  onPressed: () => ref.invalidate(agentQueueProvider),
                  child: Text(l.errorRetry),
                ),
              ],
            ),
          ),
          data: (orders) {
            if (orders.isEmpty) {
              return Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.inbox_outlined, size: 64, color: Colors.grey),
                    const SizedBox(height: 16),
                    Text(l.noOrdersInQueue),
                  ],
                ),
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.all(12),
              itemCount: orders.length,
              separatorBuilder: (_, __) => const SizedBox(height: 4),
              itemBuilder: (ctx, i) {
                final o = orders[i];
                final color = _priorityColor(o.priority.name);
                final sla = DateTime.tryParse(o.slaDeadline);
                final isLate = sla != null && sla.isBefore(DateTime.now());

                return Card(
                  color: isLate
                      ? Theme.of(context).colorScheme.errorContainer
                      : null,
                  child: ListTile(
                    onTap: () => context.go('/agent/orders/${o.id}'),
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
                    subtitle: Text(o.createdAt.substring(11, 16)),
                    trailing: isLate
                        ? const Icon(Icons.warning_amber, color: Colors.red)
                        : Text(o.status.name,
                            style: const TextStyle(color: Colors.grey)),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
