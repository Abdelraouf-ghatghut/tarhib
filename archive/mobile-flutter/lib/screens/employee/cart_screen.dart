import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:tarhib_api_client/tarhib_api_client.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/availability_provider.dart';
import '../../providers/cart_provider.dart';
import '../../providers/orders_provider.dart';
import '../../providers/quotas_provider.dart';
import '../../theme/snow_colors.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_card.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/status_badge.dart';

/// TARHIB-13 + TARHIB-14 — Panier multi-produits + note + confirmation.
///
/// Il n'existe plus d'écran "commande partiellement rejetée" après l'envoi :
/// la disponibilité stock et le quota sont vérifiés EN AMONT, directement
/// dans le panier (badge مقبولة/مرفوضة par ligne, bouton d'envoi désactivé
/// si une ligne est invalide). Une commande valide passe donc automatiquement
/// (le moteur de validation serveur reste l'arbitre final — §3.3/§3.4
/// CLAUDE.md — mais ne devrait jamais contredire ce qui est déjà affiché ici,
/// sauf cas rare de concurrence).
class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({super.key});

  @override
  ConsumerState<CartScreen> createState() => _CartScreenState();
}

/// Statut de validité d'une ligne, calculé côté client à partir des mêmes
/// données que le moteur de validation serveur (§3.3 CLAUDE.md, étapes 2-3 —
/// l'étape 1 rôle/commandable est déjà garantie par le catalogue filtré).
enum _LineIssue { none, unavailable, quotaExceeded }

class _LineCheck {
  final _LineIssue issue;
  const _LineCheck(this.issue);
  bool get isValid => issue == _LineIssue.none;
}

class _CartScreenState extends ConsumerState<CartScreen>
    with SingleTickerProviderStateMixin {
  bool _submitting = false;
  Object? _error;
  OrderDto? _submittedOrder;
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

  _LineCheck _checkLine(
    CartLine line,
    Map<String, ProductAvailability> availability,
    Map<String, ({int remaining, int max})> quotas,
  ) {
    final avail = availability[line.productId];
    if (avail != null && !avail.available) {
      return const _LineCheck(_LineIssue.unavailable);
    }
    final quota = quotas[line.productId];
    if (quota != null && line.quantity > quota.remaining) {
      return const _LineCheck(_LineIssue.quotaExceeded);
    }
    return const _LineCheck(_LineIssue.none);
  }

  Future<void> _confirmAndSubmit(bool allValid) async {
    if (!allValid) return;
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
        ref.invalidate(quotaCacheProvider);
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
      return _AutoConfirmedView(
        order: _submittedOrder!,
        l: l,
        successScale: _successScale,
        onClose: () {
          setState(() => _submittedOrder = null);
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

    final availability = ref.watch(availabilityProvider).value ?? {};
    final quotas = ref.watch(quotaCacheProvider).value ?? {};
    final checks = {
      for (final line in lines) line.productId: _checkLine(line, availability, quotas),
    };
    final allValid = checks.values.every((c) => c.isValid);

    final locale = Localizations.localeOf(context);
    final scheme = Theme.of(context).colorScheme;

    return Column(
      children: [
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, kToolbarHeight + 16, 16, 16),
            itemCount: lines.length + 1,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (ctx, i) {
              // Note field at the end
              if (i == lines.length) {
                return Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: _NoteField(
                    initialValue: ref.read(cartProvider.notifier).note,
                    onChanged: (v) => ref.read(cartProvider.notifier).setNote(v),
                    l: l,
                  ),
                );
              }
              final line = lines[i];
              final check = checks[line.productId]!;
              final name = locale.languageCode == 'ar' ? line.nameAr : line.nameEn;
              final quota = quotas[line.productId];

              return GlassCard(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(name,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w600, fontSize: 15)),
                        ),
                        _CartStepper(
                          quantity: line.quantity,
                          canIncrement: check.issue != _LineIssue.unavailable &&
                              (quota == null || line.quantity < quota.remaining),
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
                    const SizedBox(height: 8),
                    StatusBadge(
                      dense: true,
                      label: check.isValid
                          ? l.lineAcceptedBadge
                          : check.issue == _LineIssue.unavailable
                              ? l.notAvailable
                              : l.lineRejectionReason_QUOTA_EXCEEDED,
                      tone: check.isValid
                          ? SnowStatusTone.success
                          : SnowStatusTone.danger,
                      icon: check.isValid
                          ? Icons.check_circle_rounded
                          : Icons.error_rounded,
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
            child: ErrorCard(error: _error!, onRetry: () => _confirmAndSubmit(allValid)),
          ),

        Container(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          decoration: BoxDecoration(
            color: scheme.surface,
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF0F172A).withValues(alpha: 0.06),
                blurRadius: 16,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: SafeArea(
            top: false,
            child: Column(
              children: [
                if (!allValid) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: SnowColors.dangerSoft,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.info_rounded,
                            size: 16, color: SnowColors.dangerStrong),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            l.cartHasInvalidLines,
                            style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: SnowColors.dangerStrong),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
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
                  onPressed: (_submitting || !allValid)
                      ? null
                      : () => _confirmAndSubmit(allValid),
                  icon: _submitting
                      ? SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: scheme.onPrimary),
                        )
                      : const Icon(Icons.send_rounded),
                  label: Text(l.submitOrder),
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
                  filled: false,
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
    required this.canIncrement,
    required this.onDecrement,
    required this.onIncrement,
    required this.onRemove,
  });
  final int quantity;
  final bool canIncrement;
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
          onTap: canIncrement ? onIncrement : null,
          child: Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: canIncrement
                  ? scheme.primary
                  : scheme.onSurface.withValues(alpha: 0.15),
              shape: BoxShape.circle,
              boxShadow: canIncrement
                  ? [
                      BoxShadow(
                          color: scheme.primary.withValues(alpha: 0.35),
                          blurRadius: 6),
                    ]
                  : null,
            ),
            child: Icon(Icons.add,
                size: 16,
                color: canIncrement ? scheme.onPrimary : scheme.onSurface.withValues(alpha: 0.4)),
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
                color: SnowColors.successSoft,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle_rounded,
                      size: 16, color: SnowColors.successStrong),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(l.orderWillAutoConfirm,
                        style: const TextStyle(
                            fontSize: 12,
                            color: SnowColors.successStrong,
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
                    child: Text(l.cancel),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: FilledButton(
                    onPressed: () => Navigator.pop(context, true),
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

// ── Confirmation automatique (plus d'écran "partiellement rejeté") ──────────

class _AutoConfirmedView extends StatelessWidget {
  const _AutoConfirmedView({
    required this.order,
    required this.l,
    required this.successScale,
    required this.onClose,
  });
  final OrderDto order;
  final AppLocalizations l;
  final Animation<double> successScale;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, kToolbarHeight + 16, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Spacer(),
          ScaleTransition(
            scale: successScale,
            child: Container(
              width: 96,
              height: 96,
              alignment: Alignment.center,
              decoration: const BoxDecoration(
                color: SnowColors.successSoft,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_rounded,
                  size: 52, color: SnowColors.successStrong),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            l.orderSubmitted,
            style: Theme.of(context)
                .textTheme
                .titleLarge
                ?.copyWith(fontWeight: FontWeight.w800),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          Text(
            l.orderAutoConfirmedSubtitle,
            textAlign: TextAlign.center,
            style: const TextStyle(color: SnowColors.textMuted, fontSize: 13, height: 1.4),
          ),
          const SizedBox(height: 24),
          GlassCard(
            child: Row(
              children: [
                Expanded(
                  child: _StatColumn(
                    label: '#',
                    value: order.id.substring(0, 8).toUpperCase(),
                  ),
                ),
                Container(width: 1, height: 32, color: SnowColors.border),
                Expanded(
                  child: _StatColumn(label: l.priority, value: order.priority.name),
                ),
              ],
            ),
          ),
          const Spacer(),
          FilledButton(
            onPressed: onClose,
            child: Text(l.myOrders),
          ),
        ],
      ),
    );
  }
}

class _StatColumn extends StatelessWidget {
  const _StatColumn({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(fontSize: 11, color: SnowColors.textMuted)),
      ],
    );
  }
}
