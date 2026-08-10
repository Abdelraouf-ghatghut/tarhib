import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../api/api_client.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_card.dart';
import '../../widgets/glass_app_bar.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/tarhib_scaffold.dart';

// ── DTOs ──────────────────────────────────────────────────────────────────────

class _VipLocation {
  final String id;
  final String name;
  final String productName;
  final int currentStock;
  final int minThreshold;
  final int maxThreshold;
  final bool belowThreshold;
  final String? openTaskId;

  const _VipLocation({
    required this.id,
    required this.name,
    required this.productName,
    required this.currentStock,
    required this.minThreshold,
    required this.maxThreshold,
    required this.belowThreshold,
    this.openTaskId,
  });

  factory _VipLocation.fromJson(Map<String, dynamic> j) {
    final current = (j['currentStock'] as num?)?.round() ?? 0;
    final min = (j['minThreshold'] as num?)?.round() ?? 0;
    final max = (j['maxThreshold'] as num?)?.round() ?? 0;
    return _VipLocation(
      id: j['id']?.toString() ?? '',
      name: j['locationName']?.toString() ?? j['name']?.toString() ?? '',
      productName: j['productNameEn']?.toString() ??
          j['product']?['nameEn']?.toString() ?? '',
      currentStock: current,
      minThreshold: min,
      maxThreshold: max,
      belowThreshold: j['belowThreshold'] as bool? ?? current <= min,
      openTaskId: j['openTaskId']?.toString(),
    );
  }
}

class _VipTask {
  final String id;
  final String? locationName;
  final int requestedQty;
  final String status;
  final DateTime createdAt;

  const _VipTask({
    required this.id,
    required this.locationName,
    required this.requestedQty,
    required this.status,
    required this.createdAt,
  });

  factory _VipTask.fromJson(Map<String, dynamic> j) => _VipTask(
        id: j['id']?.toString() ?? '',
        locationName: j['locationName']?.toString(),
        requestedQty: (j['requestedQty'] as num?)?.round() ?? 0,
        status: j['status']?.toString() ?? 'OPEN',
        createdAt: j['createdAt'] != null
            ? DateTime.tryParse(j['createdAt'].toString()) ?? DateTime.now()
            : DateTime.now(),
      );
}

// ── Providers ─────────────────────────────────────────────────────────────────

final _vipLocationsProvider =
    FutureProvider.autoDispose<List<_VipLocation>>((ref) async {
  final resp =
      await ApiClient.rawDio.get<dynamic>('/vip-self-service/locations');
  final raw = resp.data is List
      ? resp.data as List
      : (resp.data as Map<String, dynamic>?)?['data'] ?? [];
  return (raw as List)
      .map((e) => _VipLocation.fromJson(e as Map<String, dynamic>))
      .toList();
});

final _vipOpenTasksProvider =
    FutureProvider.autoDispose<List<_VipTask>>((ref) async {
  final resp = await ApiClient.rawDio.get<dynamic>(
    '/vip-self-service/tasks',
    queryParameters: {'status': 'OPEN'},
  );
  final raw = resp.data is List
      ? resp.data as List
      : (resp.data as Map<String, dynamic>?)?['data'] ?? [];
  return (raw as List)
      .map((e) => _VipTask.fromJson(e as Map<String, dynamic>))
      .toList();
});

// ── Screen ────────────────────────────────────────────────────────────────────

/// TARHIB-41 — Agent: tableau de bord stock VIP libre-service
class VipStockScreen extends ConsumerStatefulWidget {
  const VipStockScreen({super.key});

  @override
  ConsumerState<VipStockScreen> createState() => _VipStockScreenState();
}

class _VipStockScreenState extends ConsumerState<VipStockScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  bool _showOnlyAlert = true;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _markReplenished(String locationId) async {
    HapticFeedback.mediumImpact();
    try {
      await ApiClient.rawDio
          .patch('/vip-self-service/locations/$locationId/replenish');
      ref.invalidate(_vipLocationsProvider);
      ref.invalidate(_vipOpenTasksProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context)!.markReplenished),
            behavior: SnackBarBehavior.floating,
            backgroundColor: const Color(0xFF36B37E),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            backgroundColor: Theme.of(context).colorScheme.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _completeTask(String taskId) async {
    HapticFeedback.mediumImpact();
    try {
      await ApiClient.rawDio
          .patch('/vip-self-service/tasks/$taskId/complete');
      ref.invalidate(_vipOpenTasksProvider);
      ref.invalidate(_vipLocationsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context)!.replenishTask),
            behavior: SnackBarBehavior.floating,
            backgroundColor: const Color(0xFF36B37E),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            backgroundColor: Theme.of(context).colorScheme.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final locationsAsync = ref.watch(_vipLocationsProvider);
    final tasksAsync = ref.watch(_vipOpenTasksProvider);
    final scheme = Theme.of(context).colorScheme;

    return TarhibScaffold(
      appBar: GlassAppBar(
        title: Text(l.vipStock,
            style: const TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/agent/queue'),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () {
              ref.invalidate(_vipLocationsProvider);
              ref.invalidate(_vipOpenTasksProvider);
            },
          ),
          const SizedBox(width: 4),
        ],
        bottom: TabBar(
          controller: _tabs,
          tabs: [
            Tab(text: l.vipStock),
            Tab(
              child: tasksAsync.maybeWhen(
                data: (tasks) => tasks.isEmpty
                    ? Text(l.replenishTask)
                    : Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(l.replenishTask),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 1),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFF4D4F),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '${tasks.length}',
                              style: const TextStyle(
                                  fontSize: 11,
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700),
                            ),
                          ),
                        ],
                      ),
                orElse: () => Text(l.replenishTask),
              ),
            ),
          ],
        ),
      ),
      child: TabBarView(
        controller: _tabs,
        children: [
          _buildLocationsTab(l, locationsAsync, scheme),
          _buildTasksTab(l, tasksAsync, scheme),
        ],
      ),
    );
  }

  // ── Onglet 1 : emplacements ───────────────────────────────────────────────

  Widget _buildLocationsTab(
    AppLocalizations l,
    AsyncValue<List<_VipLocation>> locationsAsync,
    ColorScheme scheme,
  ) {
    return locationsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(
        child: ErrorCard(
          error: e,
          onRetry: () => ref.invalidate(_vipLocationsProvider),
          margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 80),
        ),
      ),
      data: (all) {
        final alertCount = all.where((loc) => loc.belowThreshold).length;
        final displayed = _showOnlyAlert
            ? all.where((loc) => loc.belowThreshold).toList()
            : all;

        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(_vipLocationsProvider),
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
                  child: GlassCard(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 14),
                    child: Row(
                      children: [
                        Expanded(
                          child: _StatItem(
                            label: l.vipLocations,
                            value: all.length,
                            color: scheme.primary,
                          ),
                        ),
                        Container(
                            width: 1,
                            height: 32,
                            color: scheme.outline.withValues(alpha: 0.2)),
                        Expanded(
                          child: _StatItem(
                            label: l.stockBelowThreshold,
                            value: alertCount,
                            color: alertCount > 0
                                ? const Color(0xFFFF4D4F)
                                : const Color(0xFF36B37E),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                  child: FilterChip(
                    label: Text(l.stockBelowThreshold),
                    selected: _showOnlyAlert,
                    selectedColor:
                        const Color(0xFFFF4D4F).withValues(alpha: 0.12),
                    checkmarkColor: const Color(0xFFFF4D4F),
                    side: BorderSide(
                      color: _showOnlyAlert
                          ? const Color(0xFFFF4D4F).withValues(alpha: 0.5)
                          : scheme.outline.withValues(alpha: 0.3),
                    ),
                    onSelected: (v) => setState(() => _showOnlyAlert = v),
                  ),
                ),
              ),

              if (displayed.isEmpty)
                SliverFillRemaining(
                  child: EmptyState(
                    type: EmptyStateType.generic,
                    title: l.allClear,
                    subtitle: l.vipStock,
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                  sliver: SliverList.separated(
                    itemCount: displayed.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (ctx, i) => _LocationCard(
                      loc: displayed[i],
                      scheme: scheme,
                      l: l,
                      onReplenish: _markReplenished,
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  // ── Onglet 2 : tâches ouvertes ───────────────────────────────────────────

  Widget _buildTasksTab(
    AppLocalizations l,
    AsyncValue<List<_VipTask>> tasksAsync,
    ColorScheme scheme,
  ) {
    return tasksAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(
        child: ErrorCard(
          error: e,
          onRetry: () => ref.invalidate(_vipOpenTasksProvider),
          margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 80),
        ),
      ),
      data: (tasks) {
        if (tasks.isEmpty) {
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(_vipOpenTasksProvider),
            child: ListView(
              children: [
                const SizedBox(height: 120),
                EmptyState(
                  type: EmptyStateType.generic,
                  title: l.allClear,
                  subtitle: l.replenishTask,
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(_vipOpenTasksProvider),
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            itemCount: tasks.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (ctx, i) {
              final task = tasks[i];
              return GlassCard(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFF991F).withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                                color:
                                    const Color(0xFFFF991F).withValues(alpha: 0.4)),
                          ),
                          child: const Text(
                            'OPEN',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFFFF991F),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            task.locationName ?? '—',
                            style: const TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 15),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(Icons.inventory_2_rounded,
                            size: 14,
                            color: scheme.onSurface.withValues(alpha: 0.5)),
                        const SizedBox(width: 4),
                        Text(
                          '${task.requestedQty} unités à réapprovisionner',
                          style: TextStyle(
                            fontSize: 13,
                            color: scheme.onSurface.withValues(alpha: 0.7),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    FilledButton.icon(
                      onPressed: () => _completeTask(task.id),
                      icon: const Icon(Icons.check_rounded, size: 16),
                      label: Text(l.markReplenished),
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(40),
                        backgroundColor: const Color(0xFF36B37E),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        );
      },
    );
  }
}

// ── Sous-widgets ──────────────────────────────────────────────────────────────

class _LocationCard extends StatelessWidget {
  const _LocationCard({
    required this.loc,
    required this.scheme,
    required this.l,
    required this.onReplenish,
  });

  final _VipLocation loc;
  final ColorScheme scheme;
  final AppLocalizations l;
  final void Function(String locationId) onReplenish;

  @override
  Widget build(BuildContext context) {
    final pct =
        loc.maxThreshold > 0 ? loc.currentStock / loc.maxThreshold : 0.0;
    final barColor = loc.belowThreshold
        ? const Color(0xFFFF4D4F)
        : pct < 0.5
            ? const Color(0xFFFF991F)
            : const Color(0xFF36B37E);

    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(loc.name,
                        style: const TextStyle(
                            fontWeight: FontWeight.w700, fontSize: 15)),
                    const SizedBox(height: 2),
                    Text(loc.productName,
                        style: TextStyle(
                          fontSize: 12,
                          color: scheme.onSurface.withValues(alpha: 0.5),
                        )),
                  ],
                ),
              ),
              if (loc.belowThreshold)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFF4D4F).withValues(alpha: 0.10),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(
                        color:
                            const Color(0xFFFF4D4F).withValues(alpha: 0.3)),
                  ),
                  child: Text(
                    l.replenishTask,
                    style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFFFF4D4F),
                        fontWeight: FontWeight.w600),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                l.currentStock,
                style: TextStyle(
                    fontSize: 11,
                    color: scheme.onSurface.withValues(alpha: 0.5)),
              ),
              Text(
                l.stockLevel(
                  loc.currentStock,
                  loc.minThreshold,
                  loc.maxThreshold,
                ),
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: barColor),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: pct.clamp(0.0, 1.0),
              minHeight: 8,
              backgroundColor: barColor.withValues(alpha: 0.12),
              valueColor: AlwaysStoppedAnimation(barColor),
            ),
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                l.threshold,
                style: TextStyle(
                    fontSize: 10,
                    color: scheme.onSurface.withValues(alpha: 0.4)),
              ),
              Text(
                '${loc.minThreshold}',
                style: TextStyle(
                    fontSize: 10,
                    color: const Color(0xFFFF4D4F).withValues(alpha: 0.7)),
              ),
            ],
          ),
          if (loc.belowThreshold) ...[
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: () => onReplenish(loc.id),
              icon: const Icon(Icons.inventory_2_rounded, size: 16),
              label: Text(l.markReplenished),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(40),
                backgroundColor: const Color(0xFF36B37E),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  const _StatItem(
      {required this.label, required this.value, required this.color});
  final String label;
  final int value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text('$value',
            style: TextStyle(
                fontSize: 28, fontWeight: FontWeight.w900, color: color)),
        const SizedBox(height: 2),
        Text(label,
            style: TextStyle(
                fontSize: 11,
                color: Theme.of(context)
                    .colorScheme
                    .onSurface
                    .withValues(alpha: 0.55)),
            textAlign: TextAlign.center),
      ],
    );
  }
}
