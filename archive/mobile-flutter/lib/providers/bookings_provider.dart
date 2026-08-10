import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';

/// Nombre de réservations de salles de l'employé — utilisé par la carte KPI
/// du profil. Pas encore dans le client généré : appel brut (même pattern
/// que meeting_rooms_screen).
final myBookingsCountProvider = FutureProvider.autoDispose<int>((ref) async {
  final resp = await ApiClient.rawDio.get<Map<String, dynamic>>(
    '/meeting-rooms/bookings/me',
  );
  final raw = resp.data?['data'] ?? resp.data?['items'] ?? resp.data ?? [];
  return (raw as List).length;
});
