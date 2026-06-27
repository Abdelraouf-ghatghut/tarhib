import 'package:built_collection/built_collection.dart';
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

  Future<OrderDto?> createOrder(List<CreateOrderLineDto> lines) async {
    final dto = CreateOrderDto(
      (b) => b..lines = ListBuilder(lines),
    );
    final response = await ApiClient.orders.ordersControllerCreate(
      createOrderDto: dto,
    );
    return response.data;
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
