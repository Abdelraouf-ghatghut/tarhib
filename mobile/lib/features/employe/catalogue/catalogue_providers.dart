import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../../shared/models/produit.dart';

final catalogueProvider = FutureProvider<List<Produit>>((ref) async {
  final dio = ref.watch(dioProvider);
  final reponse = await dio.get<List<dynamic>>('/catalog');
  return reponse.data!
      .map((json) => Produit.fromJson(json as Map<String, dynamic>))
      .toList();
});
