import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/auth_provider.dart';
import '../../providers/orders_provider.dart';

/// TARHIB-20 — Gestionnaire : liste des commandes en attente d'approbation
class ManagerOrdersScreen extends ConsumerWidget {
  const ManagerOrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final pendingAsync = ref.watch(pendingApprovalProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l.pendingApproval),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => ref.read(authProvider.notifier).logout(),
            tooltip: l.logout,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(pendingApprovalProvider),
        child: pendingAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(e.toString()),
                FilledButton(
                  onPressed: () => ref.invalidate(pendingApprovalProvider),
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
                    Text(l.noOrders),
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
                return Card(
                  child: ListTile(
                    onTap: () => context.go('/manager/orders/${o.id}'),
                    leading: CircleAvatar(
                      backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                      child: Text(
                        o.priority.name,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onPrimaryContainer,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    title: Text(
                      o.id.substring(0, 8).toUpperCase(),
                      style: const TextStyle(fontFamily: 'monospace'),
                    ),
                    subtitle: Text(o.createdAt.substring(0, 16).replaceAll('T', ' ')),
                    trailing: const Icon(Icons.chevron_right),
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
