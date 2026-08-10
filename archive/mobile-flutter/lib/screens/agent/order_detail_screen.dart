import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

import '../../api/api_client.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/orders_provider.dart';
import '../../widgets/error_card.dart';
import '../../widgets/glass_app_bar.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/order_line_tile.dart';
import '../../widgets/tarhib_scaffold.dart';

/// Holds the ordered list of IDs when the agent drills into the queue.
final queueNavProvider = StateProvider<List<String>>((ref) => []);

/// TARHIB-18 + TARHIB-19 — Agent: prise en charge, livraison (avec photo), rupture
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
  XFile? _photo;
  bool _uploadingPhoto = false;

  // ── Photo capture ──────────────────────────────────────────────────────────

  Future<void> _pickPhoto() async {
    final picker = ImagePicker();
    final photo = await picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 80,
      maxWidth: 1280,
    );
    if (photo != null) setState(() => _photo = photo);
  }

  Future<void> _uploadPhoto(String orderId, AppLocalizations l) async {
    if (_photo == null) return;
    setState(() => _uploadingPhoto = true);
    try {
      final form = FormData.fromMap({
        'photo': await MultipartFile.fromFile(
          _photo!.path,
          filename: 'delivery_${orderId.substring(0, 8)}.jpg',
        ),
      });
      await ApiClient.rawDio.post('/orders/$orderId/delivery-photo', data: form);
    } catch (_) {
      // photo upload is best-effort
    } finally {
      if (mounted) setState(() => _uploadingPhoto = false);
    }
  }

  // ── Status transition ──────────────────────────────────────────────────────

  Future<void> _transition(String newStatus) async {
    setState(() => _busy = true);
    try {
      if (newStatus == 'DELIVERED' && _photo != null) {
        await _uploadPhoto(widget.orderId, AppLocalizations.of(context)!);
      }
      await ref
          .read(ordersNotifierProvider.notifier)
          .updateStatus(widget.orderId, newStatus);
      HapticFeedback.heavyImpact();
      ref.invalidate(orderByIdProvider(widget.orderId));
      ref.invalidate(ordersProvider);
      ref.invalidate(agentQueueProvider);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _reportOutOfStock(
      BuildContext context, String productId, AppLocalizations l) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(l.outOfStockTitle),
        content: Text(l.outOfStockBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(l.cancel),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.error),
            child: Text(l.confirmAction),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    try {
      await ApiClient.rawDio.patch('/inventory/report-stockout', data: {
        'productId': productId,
        'orderId': widget.orderId,
      });
    } catch (_) {}
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(l.outOfStockReported),
          backgroundColor: Colors.orange,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  // ── Prev / next navigation ─────────────────────────────────────────────────

  void _goToAdjacentOrder(int delta) {
    final ids = ref.read(queueNavProvider);
    if (ids.isEmpty) return;
    final idx = ids.indexOf(widget.orderId);
    if (idx == -1) return;
    final next = idx + delta;
    if (next < 0 || next >= ids.length) return;
    context.go('/agent/orders/${ids[next]}');
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final orderAsync = ref.watch(orderByIdProvider(widget.orderId));
    final scheme = Theme.of(context).colorScheme;
    final ids = ref.watch(queueNavProvider);
    final idx = ids.indexOf(widget.orderId);
    final hasPrev = idx > 0;
    final hasNext = idx >= 0 && idx < ids.length - 1;

    return TarhibScaffold(
      appBar: GlassAppBar(
        title: Text(l.orderDetail),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/agent/queue'),
        ),
        actions: [
          if (hasPrev)
            IconButton(
              icon: const Icon(Icons.chevron_left_rounded),
              tooltip: l.previousOrder,
              onPressed: () => _goToAdjacentOrder(-1),
            ),
          if (hasNext)
            IconButton(
              icon: const Icon(Icons.chevron_right_rounded),
              tooltip: l.nextOrder,
              onPressed: () => _goToAdjacentOrder(1),
            ),
        ],
      ),
      child: orderAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: ErrorCard(
            error: e,
            onRetry: () => ref.invalidate(orderByIdProvider(widget.orderId)),
            margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 80),
          ),
        ),
        data: (order) {
          if (order == null) return Center(child: Text(l.noOrders));

          final status = order.status.name;
          final sla = DateTime.tryParse(order.slaDeadline);
          final isLate = sla != null && sla.isBefore(DateTime.now());

          return Column(
            children: [
              if (isLate)
                MaterialBanner(
                  backgroundColor: scheme.errorContainer,
                  content: Text(
                    l.slaExpired,
                    style: TextStyle(color: scheme.onErrorContainer),
                  ),
                  actions: [
                    TextButton(onPressed: () {}, child: const SizedBox.shrink()),
                  ],
                ),

              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, kToolbarHeight + 8, 20, 16),
                  children: [
                    // Nav chip
                    if (ids.length > 1)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            _NavArrow(
                              icon: Icons.chevron_left_rounded,
                              enabled: hasPrev,
                              onTap: () => _goToAdjacentOrder(-1),
                            ),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              child: Text(
                                '${idx + 1} / ${ids.length}',
                                style: TextStyle(
                                    fontWeight: FontWeight.w700,
                                    color: scheme.onSurface
                                        .withValues(alpha: 0.55)),
                              ),
                            ),
                            _NavArrow(
                              icon: Icons.chevron_right_rounded,
                              enabled: hasNext,
                              onTap: () => _goToAdjacentOrder(1),
                            ),
                          ],
                        ),
                      ),

                    // Info card
                    GlassCard(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        children: [
                          _InfoRow(label: l.priority, value: order.priority.name),
                          const Divider(height: 24),
                          _InfoRow(
                              label: l.orderDetail,
                              value:
                                  '#${order.id.substring(0, 8).toUpperCase()}'),
                          if (sla != null) ...[
                            const Divider(height: 24),
                            _InfoRow(
                              label: l.slaDeadline,
                              value: DateFormat.yMd()
                                  .add_Hm()
                                  .format(sla.toLocal()),
                              valueColor: isLate ? scheme.error : null,
                            ),
                          ],
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
                        children: order.lines.map((ln) {
                          return OrderLineTile(
                            productId: ln.productId,
                            quantity: ln.quantity.toInt(),
                            trailing: IconButton(
                              icon: Icon(Icons.remove_shopping_cart_rounded,
                                  color: Colors.orange.shade700, size: 20),
                              tooltip: l.reportOutOfStock,
                              onPressed: () =>
                                  _reportOutOfStock(context, ln.productId, l),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Delivery photo section (only when IN_PROGRESS)
                    if (status == 'IN_PROGRESS') ...[
                      Text(l.deliveryPhoto,
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 10),
                      GlassCard(
                        padding: const EdgeInsets.all(16),
                        child: _PhotoSection(
                          photo: _photo,
                          uploading: _uploadingPhoto,
                          l: l,
                          onTake: _pickPhoto,
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              _ActionBar(
                status: status,
                busy: _busy,
                hasPhoto: _photo != null,
                l: l,
                onTransition: _transition,
              ),
            ],
          );
        },
      ),
    );
  }
}

// ── Photo section ─────────────────────────────────────────────────────────────

class _PhotoSection extends StatelessWidget {
  const _PhotoSection({
    required this.photo,
    required this.uploading,
    required this.l,
    required this.onTake,
  });
  final XFile? photo;
  final bool uploading;
  final AppLocalizations l;
  final VoidCallback onTake;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    if (uploading) {
      return Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            const SizedBox(width: 12),
            Text(l.photoUploading, style: TextStyle(color: scheme.onSurface.withValues(alpha: 0.6))),
          ],
        ),
      );
    }

    if (photo != null) {
      return Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Image.file(
              File(photo!.path),
              width: 72,
              height: 72,
              fit: BoxFit.cover,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l.takePhoto,
                    style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Text(l.photoOptional,
                    style: TextStyle(
                        fontSize: 12,
                        color: scheme.onSurface.withValues(alpha: 0.5))),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: onTake,
                  icon: const Icon(Icons.camera_alt_rounded, size: 14),
                  label: Text(l.takePhoto, style: const TextStyle(fontSize: 13)),
                  style: OutlinedButton.styleFrom(
                    visualDensity: VisualDensity.compact,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return InkWell(
      onTap: onTake,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        height: 100,
        decoration: BoxDecoration(
          border: Border.all(color: scheme.outline.withValues(alpha: 0.3), style: BorderStyle.solid),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.camera_alt_outlined, size: 32, color: scheme.primary),
              const SizedBox(height: 8),
              Text(l.takePhoto,
                  style: TextStyle(color: scheme.primary, fontWeight: FontWeight.w600)),
              const SizedBox(height: 4),
              Text(l.photoOptional,
                  style: TextStyle(fontSize: 12, color: scheme.onSurface.withValues(alpha: 0.45))),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Nav arrow ─────────────────────────────────────────────────────────────────

class _NavArrow extends StatelessWidget {
  const _NavArrow({required this.icon, required this.enabled, required this.onTap});
  final IconData icon;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: enabled
              ? scheme.primary.withValues(alpha: 0.10)
              : scheme.onSurface.withValues(alpha: 0.05),
        ),
        child: Icon(
          icon,
          size: 20,
          color: enabled
              ? scheme.primary
              : scheme.onSurface.withValues(alpha: 0.2),
        ),
      ),
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value, this.valueColor});
  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style: TextStyle(
                color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.55),
                fontSize: 13)),
        Text(value,
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: valueColor)),
      ],
    );
  }
}

class _ActionBar extends StatelessWidget {
  const _ActionBar({
    required this.status,
    required this.busy,
    required this.hasPhoto,
    required this.l,
    required this.onTransition,
  });
  final String status;
  final bool busy;
  final bool hasPhoto;
  final AppLocalizations l;
  final Future<void> Function(String) onTransition;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return GlassCard(
      borderRadius: 0,
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (status == 'PENDING' || status == 'APPROVED')
              FilledButton.icon(
                onPressed: busy ? null : () => onTransition('IN_PROGRESS'),
                icon: busy
                    ? SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: scheme.onPrimary))
                    : const Icon(Icons.play_arrow_rounded),
                label: Text(l.markInProgress),
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(52),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16)),
                ),
              ),
            if (status == 'IN_PROGRESS')
              FilledButton.icon(
                onPressed: busy ? null : () => onTransition('DELIVERED'),
                icon: busy
                    ? SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.check_circle_rounded),
                label: Text(l.markDelivered),
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(52),
                  backgroundColor: Colors.green,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16)),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
