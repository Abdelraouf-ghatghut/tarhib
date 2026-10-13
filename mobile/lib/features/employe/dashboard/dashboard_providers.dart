import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../../shared/models/commande_resume.dart';
import '../../../shared/models/quota_consommation.dart';

final quotasMoiProvider = FutureProvider<List<QuotaConsommation>>((ref) async {
  final dio = ref.watch(dioProvider);
  final reponse = await dio.get<List<dynamic>>('/quotas/me');
  return reponse.data!
      .map((json) => QuotaConsommation.fromJson(json as Map<String, dynamic>))
      .toList();
});

final mesCommandesProvider = FutureProvider<List<CommandeResume>>((ref) async {
  final dio = ref.watch(dioProvider);
  final reponse = await dio.get<List<dynamic>>('/orders/mine');
  return reponse.data!
      .map((json) => CommandeResume.fromJson(json as Map<String, dynamic>))
      .toList();
});

/// Sous-ensemble de [mesCommandesProvider] pertinent pour le dashboard —
/// l'historique (statuts terminaux) est hors périmètre de cet écran.
final commandesEnCoursProvider = Provider<AsyncValue<List<CommandeResume>>>((
  ref,
) {
  return ref
      .watch(mesCommandesProvider)
      .whenData((liste) => liste.where((c) => c.estEnCours).toList());
});
