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

// ── DTO ───────────────────────────────────────────────────────────────────────

class _VipLocation {
  final String id;
  final String name;
  final String productName;
  final int currentStock;
  final int minThreshold;
  final int maxThreshold;
  final bool belowThreshold;

  const _VipLocation({
    required this.id,
    required this.name,
    required this.productName,
    required this.currentStock,
    required this.minThreshold,
    required this.maxThreshold,
    required this.belowThreshold,
  });

  factory _VipLocation.fromJson(Map<String, dynamic> j) => _VipLocation(
        id: j['id']?.toString() ?? '',
        name: j['name']?.toString() ?? j['locationName']?.toString() ?? '',
        productName: j['product']?['nameEn']?.toString() ??
            j['productName']?.toString() ?? '',
        currentStock: (j['currentStock'] as num?)?.round() ?? 0,
        minThreshold: (j['minThreshold'] as num?)?.round() ?? 0,
        maxThreshold: (j['maxThreshold'] as num?)?.round() ?? 0,
        belowThreshold: j['belowThreshold'] as bool? ??
            ((j['currentStock'] as num?)?.round() ?? 0) <
                ((j['minThreshold'] as num?)?.round() ?? 0),
      );
}

// ── Provider ──────────────────────────────────────────────────────────────────

final _vipLocationsProvider =
    FutureProvider.autoDispose<List<_VipLocation>>((ref) async {
  final resp = await ApiClient.rawDio
      .get<Map<String, dynamic>>('/vip-self-service/locations');
  final raw = resp.data?['data'] ?? resp.data?['items'] ?? resp.data ?? [];
  return (raw as List)
      .map((e) => _VipLocation.fromJson(e as Map<String, dynamic>))
      .toList();
});

// ── Screen ────────────────────────────────────────────────────────────────────

/// TARHIB-41 — Agent: tableau de bord stock VIP libre-service
class VipStockScreen extends ConsumerStatefulWidget {
  const VipStockScreen({super.key});

  @override
  ConsumerState<VipStockScreen> createState() => _VipStockScreenState();
}

class _VipStockScreenState extends ConsumerState<VipStockScreen> {
  bool _showOnlyAlert = true;

  Future<void> _markReplenished(String locationId) async {
    HapticFeedback.mediumImpact();
    try {
      await ApiClient.rawDio.patch(
        '/vip-self-service/locations/$locationId/replenish',
      );
      ref.invalidate(_vipLocationsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context)!.markReplenished),
            behavior: SnackBarBehavior.floating,
            backgroundColor: Colors.green,
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
            onPressed: () => ref.invalidate(_vipLocationsProvider),
          ),
          const SizedBox(width: 4),
        ],
      ),
      child: locationsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: ErrorCard(
            error: e,
            onRetry: () => ref.invalidate(_vipLocationsProvider),
            margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 80),
          ),
        ),
        data: (all) {
          final alertCount = all.where((l) => l.belowThreshold).length;
          final displayed = _showOnlyAlert
              ? all.where((l) => l.belowThreshold).toList()
              : all;

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(_vipLocationsProvider),
            child: CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, kToolbarHeight + 12, 16, 12),
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
                            color: scheme.outline.withValues(alpha: 0.2),
                          ),
                          Expanded(
                            child: _StatItem(
                              label: l.stockBelowThreshold,
                              value: alertCount,
                              color: alertCount > 0 ? Colors.red : Colors.green,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                // Filter toggle
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                    child: Row(
                      children: [
                        FilterChip(
                          label: Text(l.stockBelowThreshold),
                          selected: _showOnlyAlert,
                          selectedColor: Colors.red.withValues(alpha: 0.12),
                          checkmarkColor: Colors.red,
                          side: BorderSide(
                            color: _showOnlyAlert
                                ? Colors.red.withValues(alpha: 0.5)
                                : scheme.outline.withValues(alpha: 0.3),
                          ),
                          onSelected: (v) =>
                              setState(() => _showOnlyAlert = v),
                        ),
                      ],
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
                      separatorBuilder: (_, __) =>
                          const SizedBox(height: 10),
                      itemBuilder: (ctx, i) {
                        final loc = displayed[i];
                        final pct = loc.maxThreshold > 0
                            ? loc.currentStock / loc.maxThreshold
                            : 0.0;
                        final barColor = loc.belowThreshold
                            ? Colors.red
                            : pct < 0.5
                                ? Colors.orange
                                : Colors.green;

                        return GlassCard(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(loc.name,
                                            style: const TextStyle(
                                                fontWeight: FontWeight.w700,
                                                fontSize: 15)),
                                        const SizedBox(height: 2),
                                        Text(loc.productName,
                                            style: TextStyle(
                                              fontSize: 12,
                                              color: scheme.onSurface
                                                  .withValues(alpha: 0.5),
                                            )),
                                      ],
                                    ),
                                  ),
                                  if (loc.belowThreshold)
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: Colors.red
                                            .withValues(alpha: 0.10),
                                        borderRadius:
                                            BorderRadius.circular(999),
                                        border: Border.all(
                                            color: Colors.red
                                                .withValues(alpha: 0.3)),
                                      ),
                                      child: Text(
                                        l.replenishTask,
                                        style: const TextStyle(
                                            fontSize: 11,
                                            color: Colors.red,
                                            fontWeight: FontWeight.w600),
                                      ),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 12),

                              // Stock level bar
                              Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              l.currentStock,
                                              style: TextStyle(
                                                  fontSize: 11,
                                                  color: scheme.onSurface
                                                      .withValues(alpha: 0.5)),
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
                                                color: barColor,
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 6),
                                        ClipRRect(
                                          borderRadius:
                                              BorderRadius.circular(4),
                                          child: LinearProgressIndicator(
                                            value: pct.clamp(0.0, 1.0),
                                            minHeight: 8,
                                            backgroundColor: barColor
                                                .withValues(alpha: 0.12),
                                            valueColor:
                                                AlwaysStoppedAnimation(barColor),
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              l.threshold,
                                              style: TextStyle(
                                                  fontSize: 10,
                                                  color: scheme.onSurface
                                                      .withValues(alpha: 0.4)),
                                            ),
                                            Text(
                                              '${loc.minThreshold}',
                                              style: TextStyle(
                                                  fontSize: 10,
                                                  color: Colors.red
                                                      .withValues(alpha: 0.7)),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),

                              if (loc.belowThreshold) ...[
                                const SizedBox(height: 12),
                                FilledButton.icon(
                                  onPressed: () =>
                                      _markReplenished(loc.id),
                                  icon: const Icon(
                                      Icons.inventory_2_rounded, size: 16),
                                  label: Text(l.markReplenished),
                                  style: FilledButton.styleFrom(
                                    minimumSize: const Size.fromHeight(40),
                                    backgroundColor: Colors.green,
                                    shape: RoundedRectangleBorder(
                                        borderRadius:
                                            BorderRadius.circular(12)),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        );
                      },
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  const _StatItem({required this.label, required this.value, required this.color});
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
