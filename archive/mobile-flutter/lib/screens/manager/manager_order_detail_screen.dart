import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../api/api_client.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/orders_provider.dart';
import '../../widgets/error_card.dart';
import '../../widgets/glass_app_bar.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/order_line_tile.dart';
import '../../widgets/tarhib_scaffold.dart';

/// Quota context for a given employee (fetched from manager's perspective).
final _employeeQuotasProvider = FutureProvider.autoDispose
    .family<Map<String, ({int used, int max})>, String>(
  (ref, employeeId) async {
    if (employeeId.isEmpty) return {};
    try {
      final resp = await ApiClient.rawDio.get<Map<String, dynamic>>(
        '/quotas',
        queryParameters: {'employeeId': employeeId},
      );
      final list = (resp.data?['data'] ?? resp.data?['items'] ?? []) as List;
      final map = <String, ({int used, int max})>{};
      for (final q in list) {
        final productId = q['productId'] as String?;
        final used = (q['usedQuantity'] as num?)?.round() ?? 0;
        final max = (q['maxQuantity'] as num?)?.round() ?? 0;
        if (productId != null) map[productId] = (used: used, max: max);
      }
      return map;
    } catch (_) {
      return {};
    }
  },
);

/// TARHIB-20 — Gestionnaire : approuver/rejeter + contexte quotas employé
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
      if (mounted) {
        context.canPop() ? context.pop() : context.go('/manager/orders');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final orderAsync = ref.watch(orderByIdProvider(widget.orderId));
    final scheme = Theme.of(context).colorScheme;

    return TarhibScaffold(
      appBar: GlassAppBar(
        title: Text(l.orderDetail),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/manager/orders'),
        ),
      ),
      child: orderAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: ErrorCard(
            error: e,
            onRetry: () =>
                ref.invalidate(orderByIdProvider(widget.orderId)),
            margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 80),
          ),
        ),
        data: (order) {
          if (order == null) return Center(child: Text(l.noOrders));

          final sla = DateTime.tryParse(order.slaDeadline);
          final slaFmt = sla != null
              ? DateFormat.yMd().add_Hm().format(sla.toLocal())
              : order.slaDeadline;

          // Try to get employee id from order (field may vary by API)
          final employeeId = order.employeeId;

          return Column(
            children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, kToolbarHeight + 8, 20, 16),
                  children: [
                    // Info card
                    GlassCard(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        children: [
                          _InfoRow(
                              label: l.orderDetail,
                              value:
                                  '#${order.id.substring(0, 8).toUpperCase()}'),
                          const Divider(height: 24),
                          _InfoRow(label: l.priority, value: order.priority.name),
                          const Divider(height: 24),
                          _InfoRow(label: l.slaDeadline, value: slaFmt),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Product lines
                    Text(l.product,
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
                    const SizedBox(height: 20),

                    // Quota context panel
                    _QuotaContextPanel(
                      employeeId: employeeId,
                      productIds: order.lines.map((ln) => ln.productId).toList(),
                      l: l,
                    ),
                  ],
                ),
              ),

              // Decision bar
              GlassCard(
                borderRadius: 0,
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                child: SafeArea(
                  top: false,
                  child: _busy
                      ? const Center(child: CircularProgressIndicator())
                      : Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () => _decide('REJECTED'),
                                icon: Icon(Icons.close_rounded,
                                    color: scheme.error),
                                label: Text(l.reject,
                                    style: TextStyle(color: scheme.error)),
                                style: OutlinedButton.styleFrom(
                                  minimumSize: const Size.fromHeight(52),
                                  side: BorderSide(color: scheme.error),
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(14)),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              flex: 2,
                              child: FilledButton.icon(
                                onPressed: () => _decide('APPROVED'),
                                icon: const Icon(Icons.check_rounded),
                                label: Text(l.approve),
                                style: FilledButton.styleFrom(
                                  minimumSize: const Size.fromHeight(52),
                                  backgroundColor: Colors.green,
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(14)),
                                ),
                              ),
                            ),
                          ],
                        ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

// ── Quota context panel ───────────────────────────────────────────────────────

class _QuotaContextPanel extends ConsumerWidget {
  const _QuotaContextPanel({
    required this.employeeId,
    required this.productIds,
    required this.l,
  });
  final String employeeId;
  final List<String> productIds;
  final AppLocalizations l;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final quotasAsync = ref.watch(_employeeQuotasProvider(employeeId));

    return quotasAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
      data: (quotaMap) {
        if (quotaMap.isEmpty) return const SizedBox.shrink();

        final relevant = productIds.where((id) => quotaMap.containsKey(id)).toList();
        if (relevant.isEmpty) return const SizedBox.shrink();

        final scheme = Theme.of(context).colorScheme;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(l.employeeQuotas,
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            GlassCard(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: relevant.map((productId) {
                  final q = quotaMap[productId]!;
                  final pct = q.max > 0 ? q.used / q.max : 0.0;
                  final barColor = pct >= 0.9
                      ? scheme.error
                      : pct >= 0.7
                          ? Colors.orange
                          : scheme.primary;

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              productId.length > 20
                                  ? '${productId.substring(0, 12)}…'
                                  : productId,
                              style: const TextStyle(
                                  fontFamily: 'monospace', fontSize: 12),
                            ),
                            Text(
                              l.quotaUsed(q.used, q.max),
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: barColor,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: pct.clamp(0.0, 1.0),
                            minHeight: 6,
                            backgroundColor:
                                barColor.withValues(alpha: 0.12),
                            valueColor: AlwaysStoppedAnimation(barColor),
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        );
      },
    );
  }
}

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
