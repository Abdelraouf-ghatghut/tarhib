import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'tarhib_database.dart';

/// Singleton de la base Drift — partagé dans toute l'appli.
final databaseProvider = Provider<TarhibDatabase>((ref) {
  final db = TarhibDatabase();
  ref.onDispose(db.close);
  return db;
});
