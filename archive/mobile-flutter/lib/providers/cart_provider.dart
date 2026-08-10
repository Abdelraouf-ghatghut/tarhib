import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tarhib_api_client/tarhib_api_client.dart';

class CartLine {
  final String productId;
  final String nameAr;
  final String nameEn;
  int quantity;

  CartLine({
    required this.productId,
    required this.nameAr,
    required this.nameEn,
    this.quantity = 1,
  });
}

class CartNotifier extends StateNotifier<List<CartLine>> {
  CartNotifier() : super([]);

  String note = '';

  void add(ProductDto product) {
    final idx = state.indexWhere((l) => l.productId == product.id);
    if (idx >= 0) {
      state = [
        for (final l in state)
          if (l.productId == product.id)
            CartLine(
              productId: l.productId,
              nameAr: l.nameAr,
              nameEn: l.nameEn,
              quantity: l.quantity + 1,
            )
          else
            l,
      ];
    } else {
      state = [
        ...state,
        CartLine(
          productId: product.id,
          nameAr: product.nameAr,
          nameEn: product.nameEn,
        ),
      ];
    }
  }

  void remove(String productId) {
    state = state.where((l) => l.productId != productId).toList();
  }

  void decrement(String productId) {
    final idx = state.indexWhere((l) => l.productId == productId);
    if (idx < 0) return;
    if (state[idx].quantity <= 1) {
      remove(productId);
    } else {
      state = [
        for (final l in state)
          if (l.productId == productId)
            CartLine(
              productId: l.productId,
              nameAr: l.nameAr,
              nameEn: l.nameEn,
              quantity: l.quantity - 1,
            )
          else
            l,
      ];
    }
  }

  /// Increment quantity for an already-present line — avoids building a stub ProductDto.
  void increment(String productId) {
    final idx = state.indexWhere((l) => l.productId == productId);
    if (idx < 0) return;
    state = [
      for (final l in state)
        if (l.productId == productId)
          CartLine(
            productId: l.productId,
            nameAr: l.nameAr,
            nameEn: l.nameEn,
            quantity: l.quantity + 1,
          )
        else
          l,
    ];
  }

  void clear() {
    state = [];
    note = '';
  }

  void setNote(String value) => note = value;

  /// Used by quick-reorder: add a product by name without a ProductDto.
  void addByName(String productId, String nameAr, String nameEn, int quantity) {
    final idx = state.indexWhere((l) => l.productId == productId);
    if (idx >= 0) {
      state = [
        for (final l in state)
          if (l.productId == productId)
            CartLine(
              productId: l.productId,
              nameAr: l.nameAr,
              nameEn: l.nameEn,
              quantity: l.quantity + quantity,
            )
          else
            l,
      ];
    } else {
      state = [
        ...state,
        CartLine(productId: productId, nameAr: nameAr, nameEn: nameEn, quantity: quantity),
      ];
    }
  }

  int quantityFor(String productId) =>
      state.where((l) => l.productId == productId).fold(0, (s, l) => s + l.quantity);
}

final cartProvider = StateNotifierProvider<CartNotifier, List<CartLine>>(
  (_) => CartNotifier(),
);
