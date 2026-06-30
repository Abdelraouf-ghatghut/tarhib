import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tarhib_api_client/tarhib_api_client.dart';

import '../api/api_client.dart';

/// All orders accessible to the current user
final ordersProvider = FutureProvider<List<OrderDto>>((ref) async {
  final response = await ApiClient.orders.ordersControllerFindAll();
  return response.data?.toList() ?? [];
});

/// Single order — used for the employee tracking screen
final orderByIdProvider =
    FutureProvider.family<OrderDto?, String>((ref, id) async {
  final response = await ApiClient.orders.ordersControllerFindOne(id: id);
  return response.data;
});

/// Orders PENDING approval — for Department Manager (TARHIB-20)
final pendingApprovalProvider = FutureProvider<List<OrderDto>>((ref) async {
  final all = await ref.watch(ordersProvider.future);
  return all.where((o) => o.status.name == 'PENDING').toList()
    ..sort((a, b) => a.priority.name.compareTo(b.priority.name));
});

/// Orders pending for the hospitality agent queue (not DELIVERED / REJECTED)
final agentQueueProvider = FutureProvider<List<OrderDto>>((ref) async {
  final all = await ref.watch(ordersProvider.future);
  const active = {'PENDING', 'APPROVED', 'IN_PROGRESS'};
  final filtered =
      all.where((o) => active.contains(o.status.name)).toList()
        ..sort((a, b) {
          // Sort by priority (P1 first) then by createdAt
          final pCmp = a.priority.name.compareTo(b.priority.name);
          if (pCmp != 0) return pCmp;
          return a.createdAt.compareTo(b.createdAt);
        });
  return filtered;
});

class OrdersNotifier extends StateNotifier<AsyncValue<List<OrderDto>>> {
  OrdersNotifier() : super(const AsyncValue.loading());

  Future<OrderDto?> createOrder(List<CreateOrderLineDto> lines, {String? note}) async {
    final resp = await ApiClient.rawDio.post<Map<String, dynamic>>(
      '/orders',
      data: {
        'lines': lines
            .map((l) => {'productId': l.productId, 'quantity': l.quantity})
            .toList(),
        if (note != null && note.isNotEmpty) 'note': note,
      },
    );
    final id = resp.data?['id'] as String?;
    if (id == null) return null;
    final full = await ApiClient.orders.ordersControllerFindOne(id: id);
    return full.data;
  }

  Future<void> updateStatus(String orderId, String newStatus) async {
    await ApiClient.rawDio.patch(
      '/orders/$orderId/status',
      data: {'status': newStatus},
    );
  }
}

final ordersNotifierProvider =
    StateNotifierProvider<OrdersNotifier, AsyncValue<List<OrderDto>>>(
  (_) => OrdersNotifier(),
);
