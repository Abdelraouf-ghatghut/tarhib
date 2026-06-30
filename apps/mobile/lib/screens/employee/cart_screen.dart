import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:tarhib_api_client/tarhib_api_client.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/cart_provider.dart';
import '../../providers/orders_provider.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_card.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/order_line_tile.dart';

/// TARHIB-13 + TARHIB-14 — Panier multi-produits + note + confirmation + validation ligne par ligne
class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({super.key});

  @override
  ConsumerState<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends ConsumerState<CartScreen>
    with SingleTickerProviderStateMixin {
  bool _submitting = false;
  Object? _error;
  OrderDto? _submittedOrder;
  List<CartLine>? _originalCart;
  late final AnimationController _successCtrl;
  late final Animation<double> _successScale;

  @override
  void initState() {
    super.initState();
    _successCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _successScale = CurvedAnimation(parent: _successCtrl, curve: Curves.elasticOut);
  }

  @override
  void dispose() {
    _successCtrl.dispose();
    super.dispose();
  }

  Future<void> _confirmAndSubmit() async {
    final cart = ref.read(cartProvider.notifier);
    final lines = ref.read(cartProvider);
    if (lines.isEmpty) return;
    final l = AppLocalizations.of(context)!;

    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ConfirmSheet(lines: lines, note: cart.note, l: l),
    );
    if (confirmed != true || !mounted) return;

    HapticFeedback.mediumImpact();

    setState(() {
      _submitting = true;
      _error = null;
      _submittedOrder = null;
      _originalCart = List.from(lines);
    });

    try {
      final dtoLines = lines
          .map((l) => CreateOrderLineDto(
                (b) => b
                  ..productId = l.productId
                  ..quantity = l.quantity,
              ))
          .toList();

      final order = await ref
          .read(ordersNotifierProvider.notifier)
          .createOrder(dtoLines, note: cart.note);

      if (order != null) {
        ref.read(cartProvider.notifier).clear();
        ref.invalidate(ordersProvider);
        setState(() => _submittedOrder = order);
        _successCtrl.forward();
        HapticFeedback.heavyImpact();
      }
    } catch (e) {
      setState(() => _error = e);
      HapticFeedback.vibrate();
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final lines = ref.watch(cartProvider);

    if (_submittedOrder != null) {
      return _ValidationResultView(
        order: _submittedOrder!,
        originalCart: _originalCart ?? [],
        l: l,
        successScale: _successScale,
        onClose: () {
          setState(() {
            _submittedOrder = null;
            _originalCart = null;
          });
          _successCtrl.reset();
          context.go('/employee/orders');
        },
      );
    }

    if (lines.isEmpty) {
      return EmptyState(
        type: EmptyStateType.cart,
        title: l.orderEmpty,
        subtitle: l.catalogEmptySubtitle,
      );
    }

    final locale = Localizations.localeOf(context);
    final scheme = Theme.of(context).colorScheme;

    return Column(
      children: [
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, kToolbarHeight + 16, 16, 16),
            itemCount: lines.length + 1,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (ctx, i) {
              // Note field at the end
              if (i == lines.length) {
                return Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: _NoteField(
                    initialValue: ref.read(cartProvider.notifier).note,
                    onChanged: (v) => ref.read(cartProvider.notifier).setNote(v),
                    l: l,
                  ),
                );
              }
              final line = lines[i];
              final name = locale.languageCode == 'ar' ? line.nameAr : line.nameEn;
              return GlassCard(
                margin: const EdgeInsets.symmetric(vertical: 4),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(name,
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                    ),
                    _CartStepper(
                      quantity: line.quantity,
                      onDecrement: () {
                        HapticFeedback.selectionClick();
                        ref.read(cartProvider.notifier).decrement(line.productId);
                      },
                      onIncrement: () {
                        HapticFeedback.selectionClick();
                        ref.read(cartProvider.notifier).increment(line.productId);
                      },
                      onRemove: () {
                        HapticFeedback.lightImpact();
                        ref.read(cartProvider.notifier).remove(line.productId);
                      },
                    ),
                  ],
                ),
              );
            },
          ),
        ),

        if (_error != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
            child: ErrorCard(error: _error!, onRetry: _confirmAndSubmit),
          ),

        GlassCard(
          borderRadius: 0,
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: SafeArea(
            top: false,
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(l.quantity,
                        style: TextStyle(
                            color: scheme.onSurface.withValues(alpha: 0.55))),
                    Text(
                      '${lines.fold<int>(0, (s, l) => s + l.quantity)} ${l.ordersTotal}',
                      style: TextStyle(
                          fontWeight: FontWeight.w700, color: scheme.primary),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                FilledButton.icon(
                  onPressed: _submitting ? null : _confirmAndSubmit,
                  icon: _submitting
                      ? SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: scheme.onPrimary),
                        )
                      : const Icon(Icons.send_rounded),
                  label: Text(l.submitOrder),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(52),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

// ── Note field ───────────────────────────────────────────────────────────────

class _NoteField extends StatefulWidget {
  const _NoteField({required this.initialValue, required this.onChanged, required this.l});
  final String initialValue;
  final ValueChanged<String> onChanged;
  final AppLocalizations l;

  @override
  State<_NoteField> createState() => _NoteFieldState();
}

class _NoteFieldState extends State<_NoteField> {
  bool _expanded = false;
  late final TextEditingController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.initialValue);
    _expanded = widget.initialValue.isNotEmpty;
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return AnimatedSize(
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOut,
      child: _expanded
          ? GlassCard(
              padding: const EdgeInsets.all(12),
              child: TextField(
                controller: _ctrl,
                maxLines: 3,
                maxLength: 200,
                onChanged: widget.onChanged,
                decoration: InputDecoration(
                  hintText: widget.l.notePlaceholder,
                  hintStyle: TextStyle(
                      color: scheme.onSurface.withValues(alpha: 0.4),
                      fontSize: 13),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.zero,
                  counterStyle: TextStyle(
                      fontSize: 11, color: scheme.onSurface.withValues(alpha: 0.35)),
                ),
              ),
            )
          : TextButton.icon(
              onPressed: () => setState(() => _expanded = true),
              icon: Icon(Icons.note_add_outlined, size: 16, color: scheme.primary),
              label: Text(widget.l.addNote,
                  style: TextStyle(fontSize: 13, color: scheme.primary)),
            ),
    );
  }
}

// ── Inline stepper ────────────────────────────────────────────────────────────

class _CartStepper extends StatelessWidget {
  const _CartStepper({
    required this.quantity,
    required this.onDecrement,
    required this.onIncrement,
    required this.onRemove,
  });
  final int quantity;
  final VoidCallback onDecrement;
  final VoidCallback onIncrement;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        GestureDetector(
          onTap: quantity <= 1 ? onRemove : onDecrement,
          child: Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: quantity <= 1
                  ? scheme.error.withValues(alpha: 0.10)
                  : scheme.primary.withValues(alpha: 0.10),
              shape: BoxShape.circle,
            ),
            child: Icon(
              quantity <= 1 ? Icons.delete_outline_rounded : Icons.remove,
              size: 16,
              color: quantity <= 1 ? scheme.error : scheme.primary,
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Text('$quantity',
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        ),
        GestureDetector(
          onTap: onIncrement,
          child: Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: scheme.primary,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                    color: scheme.primary.withValues(alpha: 0.35),
                    blurRadius: 6)
              ],
            ),
            child: Icon(Icons.add, size: 16, color: scheme.onPrimary),
          ),
        ),
      ],
    );
  }
}

// ── Confirmation bottom sheet ─────────────────────────────────────────────────

class _ConfirmSheet extends StatelessWidget {
  const _ConfirmSheet({required this.lines, required this.note, required this.l});
  final List<CartLine> lines;
  final String note;
  final AppLocalizations l;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final locale = Localizations.localeOf(context);
    final total = lines.fold<int>(0, (s, ln) => s + ln.quantity);

    return Container(
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                margin: const EdgeInsets.symmetric(vertical: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                    color: scheme.onSurface.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(4)),
              ),
            ),
            Text(l.confirmOrderTitle,
                style: Theme.of(context)
                    .textTheme
                    .titleLarge
                    ?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text(l.confirmOrderItems(total),
                style: TextStyle(
                    color: scheme.onSurface.withValues(alpha: 0.5), fontSize: 13)),
            const SizedBox(height: 16),
            ...lines.map((ln) {
              final name = locale.languageCode == 'ar' ? ln.nameAr : ln.nameEn;
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                            color: scheme.primary, shape: BoxShape.circle)),
                    const SizedBox(width: 12),
                    Expanded(child: Text(name)),
                    Text('×${ln.quantity}',
                        style: const TextStyle(fontWeight: FontWeight.w700)),
                  ],
                ),
              );
            }),

            // Note preview
            if (note.isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: scheme.surfaceContainerHighest.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    Icon(Icons.note_outlined, size: 14, color: scheme.onSurface.withValues(alpha: 0.5)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        note,
                        style: TextStyle(
                            fontSize: 12,
                            color: scheme.onSurface.withValues(alpha: 0.7)),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: scheme.primary.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline_rounded, size: 16, color: scheme.primary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(l.estimatedPriority,
                        style: TextStyle(
                            fontSize: 12,
                            color: scheme.primary,
                            fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context, false),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(50),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                    ),
                    child: Text(l.cancel),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: FilledButton(
                    onPressed: () => Navigator.pop(context, true),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(50),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                    ),
                    child: Text(l.confirmAndSubmit),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ── Validation result ─────────────────────────────────────────────────────────

class _ValidationResultView extends StatelessWidget {
  const _ValidationResultView({
    required this.order,
    required this.originalCart,
    required this.l,
    required this.successScale,
    required this.onClose,
  });
  final OrderDto order;
  final List<CartLine> originalCart;
  final AppLocalizations l;
  final Animation<double> successScale;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    final acceptedIds = {for (final ln in order.lines) ln.productId};
    final accepted = originalCart.where((cl) => acceptedIds.contains(cl.productId)).toList();
    final rejected = originalCart.where((cl) => !acceptedIds.contains(cl.productId)).toList();
    final hasRejections = rejected.isNotEmpty;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, kToolbarHeight + 16, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ScaleTransition(
            scale: successScale,
            child: Icon(
              hasRejections
                  ? Icons.warning_amber_rounded
                  : Icons.check_circle_outline_rounded,
              size: 80,
              color: hasRejections ? Colors.orange : scheme.primary,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            hasRejections ? l.partiallyRejected : l.orderSubmitted,
            style: Theme.of(context)
                .textTheme
                .titleLarge
                ?.copyWith(fontWeight: FontWeight.w800),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          Text(
            '${l.priority}: ${order.priority.name}',
            textAlign: TextAlign.center,
            style:
                TextStyle(color: scheme.onSurface.withValues(alpha: 0.5), fontSize: 13),
          ),
          const SizedBox(height: 24),

          if (accepted.isNotEmpty) ...[
            _SectionHeader(label: l.linesAccepted(accepted.length), color: scheme.primary),
            const SizedBox(height: 4),
            GlassCard(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Column(
                children: accepted
                    .map((cl) => OrderLineTile(productId: cl.productId, quantity: cl.quantity))
                    .toList(),
              ),
            ),
          ],
          if (rejected.isNotEmpty) ...[
            const SizedBox(height: 16),
            _SectionHeader(label: l.linesRejected(rejected.length), color: scheme.error),
            const SizedBox(height: 4),
            GlassCard(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Column(
                children: rejected
                    .map((cl) => OrderLineTile(
                          productId: cl.productId,
                          quantity: cl.quantity,
                          rejectionReason: l.lineRejected,
                        ))
                    .toList(),
              ),
            ),
          ],
          const Spacer(),
          FilledButton(
            onPressed: onClose,
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(52),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            child: Text(l.myOrders),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.label, required this.color});
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
            width: 4,
            height: 16,
            decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(4))),
        const SizedBox(width: 10),
        Text(label,
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: color)),
      ],
    );
  }
}
