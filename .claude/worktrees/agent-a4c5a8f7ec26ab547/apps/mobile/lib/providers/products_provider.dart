import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tarhib_api_client/tarhib_api_client.dart';

import '../api/api_client.dart';

final productsProvider = FutureProvider<List<ProductDto>>((ref) async {
  final response = await ApiClient.products.productsControllerFindAll();
  return response.data?.toList() ?? [];
});
