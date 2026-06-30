import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../api/api_client.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/glass_app_bar.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/tarhib_scaffold.dart';

// ── Provider ──────────────────────────────────────────────────────────────────

class _DashboardStats {
  final int todayOrders;
  final int pendingCount;
  final int deliveredToday;
  final double avgSlaMinutes;
  final List<({String name, int count})> mostOrdered;

  const _DashboardStats({
    required this.todayOrders,
    required this.pendingCount,
    required this.deliveredToday,
    required this.avgSlaMinutes,
    required this.mostOrdered,
  });
}

final _dashboardStatsProvider =
    FutureProvider.autoDispose<_DashboardStats>((ref) async {
  try {
    final resp = await ApiClient.rawDio
        .get<Map<String, dynamic>>('/orders/dashboard/stats');
    final data = resp.data ?? {};
    final most = <({String name, int count})>[];
    for (final item in (data['mostOrdered'] as List? ?? [])) {
      most.add((
        name: item['name']?.toString() ?? item['productId']?.toString() ?? '?',
        count: (item['count'] as num?)?.round() ?? 0,
      ));
    }
    return _DashboardStats(
      todayOrders: (data['todayOrders'] as num?)?.round() ?? 0,
      pendingCount: (data['pendingCount'] as num?)?.round() ?? 0,
      deliveredToday: (data['deliveredToday'] as num?)?.round() ?? 0,
      avgSlaMinutes: (data['avgSlaMinutes'] as num?)?.toDouble() ?? 0,
      mostOrdered: most,
    );
  } catch (_) {
    return const _DashboardStats(
      todayOrders: 0,
      pendingCount: 0,
      deliveredToday: 0,
      avgSlaMinutes: 0,
      mostOrdered: [],
    );
  }
});

// ── Screen ────────────────────────────────────────────────────────────────────

/// TARHIB-20 — Manager dashboard: KPIs + commandes du jour
class ManagerDashboardScreen extends ConsumerWidget {
  const ManagerDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final statsAsync = ref.watch(_dashboardStatsProvider);
    final scheme = Theme.of(context).colorScheme;

    return TarhibScaffold(
      appBar: GlassAppBar(
        title: Text(l.managerDashboard,
            style: const TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/manager/orders'),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.invalidate(_dashboardStatsProvider),
          ),
          const SizedBox(width: 4),
        ],
      ),
      child: statsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => const Center(child: Icon(Icons.error_outline_rounded)),
        data: (stats) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(_dashboardStatsProvider),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, kToolbarHeight + 16, 20, 32),
            children: [
              // KPI grid
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.4,
                children: [
                  _KpiCard(
                    label: l.todayOrders,
                    value: stats.todayOrders,
                    icon: Icons.receipt_long_rounded,
                    color: scheme.primary,
                  ),
                  _KpiCard(
                    label: l.pendingCount,
                    value: stats.pendingCount,
                    icon: Icons.pending_actions_rounded,
                    color: Colors.orange,
                  ),
                  _KpiCard(
                    label: l.deliveredToday,
                    value: stats.deliveredToday,
                    icon: Icons.check_circle_outline_rounded,
                    color: Colors.green,
                  ),
                  _KpiCard(
                    label: l.avgSlaMinutes,
                    value: stats.avgSlaMinutes.round(),
                    icon: Icons.timer_outlined,
                    color: Colors.purple,
                    suffix: 'min',
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Pending shortcut
              if (stats.pendingCount > 0) ...[
                FilledButton.icon(
                  onPressed: () => context.go('/manager/orders'),
                  icon: const Icon(Icons.approval_rounded),
                  label: Text(l.pendingApproval),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(52),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16)),
                  ),
                ),
                const SizedBox(height: 24),
              ],

              // Most ordered
              if (stats.mostOrdered.isNotEmpty) ...[
                Text(l.mostOrdered,
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 10),
                GlassCard(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: stats.mostOrdered.asMap().entries.map((e) {
                      final rank = e.key + 1;
                      final item = e.value;
                      final medalColor = switch (rank) {
                        1 => const Color(0xFFFFD700),
                        2 => const Color(0xFFC0C0C0),
                        3 => const Color(0xFFCD7F32),
                        _ => scheme.onSurface.withValues(alpha: 0.3),
                      };
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Row(
                          children: [
                            Container(
                              width: 28,
                              height: 28,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: medalColor.withValues(alpha: 0.15),
                              ),
                              child: Center(
                                child: Text(
                                  '$rank',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w800,
                                    color: medalColor,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(item.name,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600)),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 3),
                              decoration: BoxDecoration(
                                color: scheme.primary.withValues(alpha: 0.10),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                '×${item.count}',
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: scheme.primary,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  const _KpiCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    this.suffix,
  });
  final String label;
  final int value;
  final IconData icon;
  final Color color;
  final String? suffix;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 22, color: color),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                '$value',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  color: color,
                  height: 1,
                ),
              ),
              if (suffix != null) ...[
                const SizedBox(width: 4),
                Text(suffix!,
                    style: TextStyle(
                        fontSize: 12,
                        color: color.withValues(alpha: 0.7))),
              ],
            ],
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.55),
            ),
          ),
        ],
      ),
    );
  }
}
