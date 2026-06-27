import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:tarhib_api_client/tarhib_api_client.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/cart_provider.dart';
import '../../providers/orders_provider.dart';

/// TARHIB-13 + TARHIB-14 — Panier multi-produits + résultat de validation ligne par ligne
class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({super.key});

  @override
  ConsumerState<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends ConsumerState<CartScreen> {
  bool _submitting = false;
  String? _error;
  OrderDto? _submittedOrder;

  Future<void> _submit() async {
    final lines = ref.read(cartProvider);
    if (lines.isEmpty) return;

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

      final order =
          await ref.read(ordersNotifierProvider.notifier).createOrder(dtoLines);

      if (order != null) {
        ref.read(cartProvider.notifier).clear();
        ref.invalidate(ordersProvider);
        setState(() => _submittedOrder = order);
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context);
    final lines = ref.watch(cartProvider);

    if (_submittedOrder != null) {
      return _ValidationResultView(
        order: _submittedOrder!,
        onClose: () {
          setState(() => _submittedOrder = null);
          context.go('/employee/orders');
        },
      );
    }

    if (lines.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.shopping_cart_outlined, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            Text(l.orderEmpty, style: Theme.of(context).textTheme.titleMedium),
          ],
        ),
      );
    }

    return Column(
      children: [
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: lines.length,
            separatorBuilder: (_, __) => const Divider(),
            itemBuilder: (context, i) {
              final line = lines[i];
              final name =
                  locale.languageCode == 'ar' ? line.nameAr : line.nameEn;
              return ListTile(
                title: Text(name),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.remove_circle_outline),
                      onPressed: () => ref
                          .read(cartProvider.notifier)
                          .decrement(line.productId),
                    ),
                    Text(
                      '${line.quantity}',
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    IconButton(
                      icon: const Icon(Icons.add_circle_outline),
                      onPressed: () => ref.read(cartProvider.notifier).add(
                            _stub(line),
                          ),
                    ),
                    IconButton(
                      icon:
                          const Icon(Icons.delete_outline, color: Colors.red),
                      onPressed: () => ref
                          .read(cartProvider.notifier)
                          .remove(line.productId),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              _error!,
              style:
                  TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: FilledButton.icon(
            onPressed: _submitting ? null : _submit,
            icon: _submitting
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.send),
            label: Text(l.submitOrder),
            style:
                FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          ),
        ),
      ],
    );
  }

  ProductDto _stub(CartLine line) => ProductDto(
        (b) => b
          ..id = line.productId
          ..nameAr = line.nameAr
          ..nameEn = line.nameEn
          ..category = ''
          ..type = ProductDtoTypeEnum.COMMANDABLE
          ..active = true,
      );
}

class _ValidationResultView extends StatelessWidget {
  final OrderDto order;
  final VoidCallback onClose;
  const _ValidationResultView({required this.order, required this.onClose});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 24),
          Icon(Icons.check_circle_outline,
              size: 72,
              color: Theme.of(context).colorScheme.primary),
          const SizedBox(height: 16),
          Text(l.orderSubmitted,
              style: Theme.of(context).textTheme.titleLarge,
              textAlign: TextAlign.center),
          const SizedBox(height: 8),
          Text('${l.priority}: ${order.priority.name}',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.grey)),
          const SizedBox(height: 24),
          Text(l.validationResult,
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Expanded(
            child: ListView.builder(
              itemCount: order.lines.length,
              itemBuilder: (_, i) {
                final line = order.lines[i];
                return ListTile(
                  leading:
                      const Icon(Icons.check_circle, color: Colors.green),
                  title: Text(line.productId),
                  trailing: Text('×${line.quantity}'),
                );
              },
            ),
          ),
          FilledButton(onPressed: onClose, child: Text(l.myOrders)),
        ],
      ),
    );
  }
}
