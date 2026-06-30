import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../providers/product_name_cache_provider.dart';

/// Shared tile for displaying an order line with resolved product name.
/// Falls back to short UUID while the name cache is loading.
class OrderLineTile extends ConsumerWidget {
  const OrderLineTile({
    super.key,
    required this.productId,
    required this.quantity,
    this.rejectionReason,
    this.trailing,
  });

  final String productId;
  final int quantity;

  /// If non-null, this line was rejected. Value is the rejection reason key.
  final String? rejectionReason;

  /// Optional extra trailing widget (e.g. a report-stockout button).
  final Widget? trailing;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context);
    final scheme = Theme.of(context).colorScheme;

    final nameCache = ref.watch(productNameCacheProvider).value;
    final info = nameCache?[productId];
    final name = info != null
        ? (locale.languageCode == 'ar' ? info.nameAr : info.nameEn)
        : '#${productId.length >= 8 ? productId.substring(0, 8) : productId}';

    final isRejected = rejectionReason != null;
    final statusColor = isRejected ? scheme.error : Colors.green;

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 0),
      leading: Icon(
        isRejected ? Icons.cancel_rounded : Icons.check_circle_rounded,
        color: statusColor,
        size: 22,
      ),
      title: Text(
        name,
        style: TextStyle(
          fontWeight: FontWeight.w600,
          color: isRejected
              ? scheme.onSurface.withValues(alpha: 0.55)
              : null,
          decoration: isRejected ? TextDecoration.lineThrough : null,
        ),
      ),
      subtitle: isRejected
          ? Text(
              _rejectionLabel(rejectionReason!, l),
              style: TextStyle(color: scheme.error, fontSize: 12),
            )
          : null,
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '×$quantity',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
          ),
          if (trailing != null) ...[
            const SizedBox(width: 4),
            trailing!,
          ],
        ],
      ),
    );
  }

  static String _rejectionLabel(String reason, AppLocalizations l) =>
      switch (reason) {
        'PRODUCT_NOT_COMMANDABLE' => l.lineRejectionReason_PRODUCT_NOT_COMMANDABLE,
        'ROLE_NOT_ALLOWED' => l.lineRejectionReason_ROLE_NOT_ALLOWED,
        'INSUFFICIENT_STOCK' => l.lineRejectionReason_INSUFFICIENT_STOCK,
        'QUOTA_EXCEEDED' => l.lineRejectionReason_QUOTA_EXCEEDED,
        _ => reason,
      };
}
