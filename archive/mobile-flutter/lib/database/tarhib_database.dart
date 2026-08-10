import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

const _ordersCacheKey = 'tarhib_cached_orders';
const _productsCacheKey = 'tarhib_cached_products';

class CachedOrder {
  CachedOrder({
    required this.id,
    required this.status,
    required this.priority,
    required this.rawJson,
    required this.createdAt,
    this.branchId,
    this.companyId,
    DateTime? cachedAt,
  }) : cachedAt = cachedAt ?? createdAt;

  final String id;
  final String status;
  final String priority;
  final String? branchId;
  final String? companyId;
  final String rawJson;
  final DateTime createdAt;
  final DateTime cachedAt;

  Map<String, dynamic> toJson() => {
        'id': id,
        'status': status,
        'priority': priority,
        'branchId': branchId,
        'companyId': companyId,
        'rawJson': rawJson,
        'createdAt': createdAt.toIso8601String(),
        'cachedAt': cachedAt.toIso8601String(),
      };

  static CachedOrder fromJson(Map<String, dynamic> json) => CachedOrder(
        id: json['id']?.toString() ?? '',
        status: json['status']?.toString() ?? '',
        priority: json['priority']?.toString() ?? '',
        branchId: json['branchId']?.toString(),
        companyId: json['companyId']?.toString(),
        rawJson: json['rawJson']?.toString() ?? '{}',
        createdAt:
            DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
                DateTime.now(),
        cachedAt: DateTime.tryParse(json['cachedAt']?.toString() ?? ''),
      );
}

class CachedProduct {
  CachedProduct({
    required this.id,
    required this.nameAr,
    required this.nameEn,
    required this.category,
    required this.type,
    required this.rawJson,
    this.active = true,
    DateTime? cachedAt,
  }) : cachedAt = cachedAt ?? DateTime.now();

  final String id;
  final String nameAr;
  final String nameEn;
  final String category;
  final String type;
  final bool active;
  final String rawJson;
  final DateTime cachedAt;

  Map<String, dynamic> toJson() => {
        'id': id,
        'nameAr': nameAr,
        'nameEn': nameEn,
        'category': category,
        'type': type,
        'active': active,
        'rawJson': rawJson,
        'cachedAt': cachedAt.toIso8601String(),
      };

  static CachedProduct fromJson(Map<String, dynamic> json) => CachedProduct(
        id: json['id']?.toString() ?? '',
        nameAr: json['nameAr']?.toString() ?? '',
        nameEn: json['nameEn']?.toString() ?? '',
        category: json['category']?.toString() ?? '',
        type: json['type']?.toString() ?? '',
        active: json['active'] != false,
        rawJson: json['rawJson']?.toString() ?? '{}',
        cachedAt: DateTime.tryParse(json['cachedAt']?.toString() ?? ''),
      );
}

class TarhibDatabase {
  Future<void> close() async {}

  Future<List<CachedOrder>> getAllCachedOrders() async {
    final orders = await _readList(_ordersCacheKey, CachedOrder.fromJson);
    orders.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return orders;
  }

  Future<List<CachedOrder>> getActiveOrders() async {
    final orders = await getAllCachedOrders();
    final activeStatuses = {'PENDING', 'APPROVED', 'IN_PROGRESS'};
    return orders
        .where((order) => activeStatuses.contains(order.status))
        .toList()
      ..sort((a, b) {
        final priority = a.priority.compareTo(b.priority);
        if (priority != 0) return priority;
        return a.createdAt.compareTo(b.createdAt);
      });
  }

  Future<void> upsertOrders(List<CachedOrder> orders) async {
    final current = {
      for (final order in await getAllCachedOrders()) order.id: order,
    };
    for (final order in orders) {
      if (order.id.isNotEmpty) current[order.id] = order;
    }
    await _writeList(_ordersCacheKey, current.values.map((o) => o.toJson()));
  }

  Future<void> clearOrderCache() => _writeList(_ordersCacheKey, const []);

  Future<List<CachedProduct>> getAllCachedProducts() async {
    final products = await _readList(_productsCacheKey, CachedProduct.fromJson);
    return products.where((product) => product.active).toList()
      ..sort((a, b) => a.nameEn.compareTo(b.nameEn));
  }

  Future<void> upsertProducts(List<CachedProduct> products) async {
    final current = {
      for (final product in await getAllCachedProducts()) product.id: product,
    };
    for (final product in products) {
      if (product.id.isNotEmpty) current[product.id] = product;
    }
    await _writeList(_productsCacheKey, current.values.map((p) => p.toJson()));
  }

  Future<void> clearProductCache() => _writeList(_productsCacheKey, const []);
}

Future<List<T>> _readList<T>(
  String key,
  T Function(Map<String, dynamic>) fromJson,
) async {
  final prefs = await SharedPreferences.getInstance();
  final raw = prefs.getString(key);
  if (raw == null || raw.isEmpty) return [];
  try {
    final decoded = jsonDecode(raw);
    if (decoded is! List) return [];
    return decoded
        .whereType<Map>()
        .map((item) => fromJson(Map<String, dynamic>.from(item)))
        .toList();
  } catch (_) {
    return [];
  }
}

Future<void> _writeList(
  String key,
  Iterable<Map<String, dynamic>> values,
) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(key, jsonEncode(values.toList()));
}
