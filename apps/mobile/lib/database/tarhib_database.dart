import 'dart:io';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

part 'tarhib_database.g.dart';

// ── Tables ────────────────────────────────────────────────────────────────────

/// Cache local de la file d'attente Agent (offline-first).
class CachedOrders extends Table {
  TextColumn get id => text()();
  TextColumn get status => text()();
  TextColumn get priority => text()();
  TextColumn get branchId => text().nullable()();
  TextColumn get companyId => text().nullable()();
  TextColumn get rawJson => text()(); // sérialisation JSON complète
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get cachedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

/// Cache local du catalogue produits (offline-first employé).
class CachedProducts extends Table {
  TextColumn get id => text()();
  TextColumn get nameAr => text()();
  TextColumn get nameEn => text()();
  TextColumn get category => text()();
  TextColumn get type => text()();
  BoolColumn get active => boolean().withDefault(const Constant(true))();
  TextColumn get rawJson => text()();
  DateTimeColumn get cachedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

// ── Database ──────────────────────────────────────────────────────────────────

@DriftDatabase(tables: [CachedOrders, CachedProducts])
class TarhibDatabase extends _$TarhibDatabase {
  TarhibDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 1;

  // ── Orders cache ───────────────────────────────────────────────────────────

  Future<List<CachedOrder>> getAllCachedOrders() =>
      (select(cachedOrders)
            ..orderBy([
              (t) => OrderingTerm(expression: t.createdAt, mode: OrderingMode.desc),
            ]))
          .get();

  Future<List<CachedOrder>> getActiveOrders() =>
      (select(cachedOrders)
            ..where((t) => t.status.isIn(['PENDING', 'APPROVED', 'IN_PROGRESS']))
            ..orderBy([
              (t) => OrderingTerm(expression: t.priority),
              (t) => OrderingTerm(expression: t.createdAt),
            ]))
          .get();

  Future<void> upsertOrders(List<CachedOrdersCompanion> orders) async {
    await batch((batch) {
      batch.insertAllOnConflictUpdate(cachedOrders, orders);
    });
  }

  Future<void> clearOrderCache() => delete(cachedOrders).go();

  // ── Products cache ─────────────────────────────────────────────────────────

  Future<List<CachedProduct>> getAllCachedProducts() =>
      (select(cachedProducts)
            ..where((t) => t.active.equals(true))
            ..orderBy([
              (t) => OrderingTerm(expression: t.nameEn),
            ]))
          .get();

  Future<void> upsertProducts(List<CachedProductsCompanion> products) async {
    await batch((batch) {
      batch.insertAllOnConflictUpdate(cachedProducts, products);
    });
  }

  Future<void> clearProductCache() => delete(cachedProducts).go();
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'tarhib.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}
