import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../../shared/models/commande_resume.dart';

final commandeDetailProvider = FutureProvider.family<CommandeResume, String>((
  ref,
  id,
) async {
  final dio = ref.watch(dioProvider);
  final reponse = await dio.get<Map<String, dynamic>>('/orders/$id');
  return CommandeResume.fromJson(reponse.data!);
});
