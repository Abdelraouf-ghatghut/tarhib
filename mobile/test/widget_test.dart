import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:tarhib_app/core/network/dio_client.dart';
import 'package:tarhib_app/core/storage/secure_storage_service.dart';
import 'package:tarhib_app/features/employe/catalogue/catalogue_screen.dart';
import 'package:tarhib_app/l10n/generated/app_localizations.dart';
import 'package:tarhib_app/main.dart';

/// Évite tout appel au plugin natif `flutter_secure_storage` (indisponible
/// dans l'environnement de test) en surchargeant [secureStorageProvider].
class _SecureStorageDeTest extends SecureStorageService {
  _SecureStorageDeTest() : super(const FlutterSecureStorage());

  @override
  Future<String?> lireAccessToken() async => null;

  @override
  Future<String?> lireRefreshToken() async => null;

  @override
  Future<void> enregistrerTokens({
    required String accessToken,
    required String refreshToken,
  }) async {}

  @override
  Future<void> effacer() async {}
}

/// Simule un backend minimal. Chaque clé de `reponses` est de la forme
/// "METHODE fragment-de-chemin" (ex. "POST /orders"), vérifiée dans
/// l'ordre d'insertion (premier match gagnant) — les fragments les plus
/// spécifiques doivent donc être déclarés avant les plus génériques.
class _AdaptateurHttpDeTest implements HttpClientAdapter {
  _AdaptateurHttpDeTest(this.reponses);

  final Map<String, dynamic> reponses;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    for (final entree in reponses.entries) {
      final espace = entree.key.indexOf(' ');
      final methode = entree.key.substring(0, espace);
      final fragment = entree.key.substring(espace + 1);
      if (options.method == methode && options.path.contains(fragment)) {
        final valeur = entree.value;
        if (valeur is _ReponseErreur) {
          return ResponseBody.fromString(
            jsonEncode(valeur.corps),
            valeur.statut,
            headers: {
              Headers.contentTypeHeader: [Headers.jsonContentType],
            },
          );
        }
        return ResponseBody.fromString(
          jsonEncode(valeur),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      }
    }
    throw UnimplementedError(
      'Route non simulée dans le test : ${options.method} ${options.path}',
    );
  }

  @override
  void close({bool force = false}) {}
}

class _ReponseErreur {
  const _ReponseErreur(this.statut, this.corps);

  final int statut;
  final Map<String, dynamic> corps;
}

Map<String, dynamic> _profilFixture(String codeRole) => {
  'id': 'u1',
  'nom': 'Test',
  'prenom': 'Prenom',
  'email': 'test@tarhib.ly',
  'telephone': null,
  'actif': true,
  'entreprise': {'id': 'e1', 'nom': 'Entreprise Test'},
  'site': null,
  'departement': null,
  'role': {'id': 'r1', 'code': codeRole, 'nom': codeRole, 'niveau_priorite': 4},
  'permissions': <String>[],
};

const _produitFixture = {
  'id': 'p1',
  'nom_ar': 'قهوة عربية',
  'nom_en': 'Arabic Coffee',
  'description_ar': null,
  'description_en': null,
  'unite_mesure': 'tasse',
  'prix_unitaire': 5,
  'image_url': null,
  'categorie': {'id': 'c1', 'nom_ar': 'مشروبات', 'nom_en': 'Beverages'},
};

final _quotaFixture = {
  'quota_id': 'q1',
  'produit_id': null,
  'produit': null,
  'periode': 'jour',
  'periode_debut': DateTime.now().toIso8601String(),
  'periode_fin': DateTime.now().toIso8601String(),
  'valeur_max': 10,
  'valeur_consommee': 4,
  'valeur_restante': 6,
};

Map<String, dynamic> _commandeFixture({
  required String id,
  required String statut,
}) => {
  'id': id,
  'statut': statut,
  'priorite': 4,
  'lieu_livraison': null,
  'salle': null,
  'heure_souhaitee': null,
  'commentaire': null,
  'created_at': DateTime.now().toIso8601String(),
  'lignes': [
    {
      'id': 'l1',
      'produit_id': 'p1',
      'nom_ar': 'قهوة عربية',
      'nom_en': 'Arabic Coffee',
      'quantite': 2,
      'prix_unitaire_snapshot': 5,
    },
  ],
};

void main() {
  testWidgets(
    "Affiche l'écran de connexion en arabe par défaut quand aucune session n'est restaurée",
    (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            secureStorageProvider.overrideWithValue(_SecureStorageDeTest()),
          ],
          child: const TarhibApp(),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('تسجيل الدخول'), findsWidgets);
    },
  );

  Future<void> seConnecter(WidgetTester tester) async {
    await tester.enterText(
      find.byType(TextFormField).first,
      'employe@tarhib.ly',
    );
    await tester.enterText(find.byType(TextFormField).last, 'password123');
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();
  }

  testWidgets(
    'Redirige vers /home/employe après connexion et affiche quota + commandes en cours',
    (tester) async {
      final dioDeTest = Dio(BaseOptions(baseUrl: 'http://test.local'))
        ..httpClientAdapter = _AdaptateurHttpDeTest({
          'POST /auth/login': {
            'access_token': 'jeton-acces-factice',
            'refresh_token': 'jeton-refresh-factice',
          },
          'GET /users/me': _profilFixture('EMPLOYE'),
          'GET /quotas/me': [_quotaFixture],
          'GET /orders/mine': [
            _commandeFixture(id: 'cmd1', statut: 'en_attente'),
          ],
        });

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            secureStorageProvider.overrideWithValue(_SecureStorageDeTest()),
            dioPublicProvider.overrideWithValue(dioDeTest),
            dioProvider.overrideWithValue(dioDeTest),
          ],
          child: const TarhibApp(),
        ),
      );
      await tester.pumpAndSettle();
      await seConnecter(tester);

      expect(find.textContaining('لوحة الموظف'), findsWidgets);
      expect(find.textContaining('6'), findsWidgets);
      expect(find.textContaining('10'), findsWidgets);
      expect(find.text('قيد الانتظار'), findsOneWidget);
      expect(find.textContaining('قهوة عربية'), findsWidgets);
    },
  );

  testWidgets(
    'Création de commande réussie : redirige vers le détail et affiche ses données',
    (tester) async {
      final dioDeTest = Dio(BaseOptions(baseUrl: 'http://test.local'))
        ..httpClientAdapter = _AdaptateurHttpDeTest({
          'POST /auth/login': {
            'access_token': 'jeton-acces-factice',
            'refresh_token': 'jeton-refresh-factice',
          },
          'GET /users/me': _profilFixture('EMPLOYE'),
          'GET /quotas/me': <dynamic>[],
          'GET /orders/mine': <dynamic>[],
          'GET /catalog': [_produitFixture],
          'POST /orders': _commandeFixture(
            id: 'cmd-cree',
            statut: 'en_attente',
          ),
          'GET /orders/cmd-cree': _commandeFixture(
            id: 'cmd-cree',
            statut: 'en_attente',
          ),
        });

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            secureStorageProvider.overrideWithValue(_SecureStorageDeTest()),
            dioPublicProvider.overrideWithValue(dioDeTest),
            dioProvider.overrideWithValue(dioDeTest),
          ],
          child: const TarhibApp(),
        ),
      );
      await tester.pumpAndSettle();
      await seConnecter(tester);

      await tester.tap(find.byType(FloatingActionButton));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('champ_produit')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('قهوة عربية').last);
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(FilledButton, 'إرسال الطلب'));
      await tester.pumpAndSettle();

      expect(find.text('تفاصيل الطلب'), findsOneWidget);
      expect(find.text('قيد الانتظار'), findsOneWidget);
      expect(find.textContaining('قهوة عربية'), findsWidgets);
    },
  );

  testWidgets(
    'Création de commande refusée (stock insuffisant) : affiche le message traduit depuis le seul code_refus',
    (tester) async {
      final dioDeTest = Dio(BaseOptions(baseUrl: 'http://test.local'))
        ..httpClientAdapter = _AdaptateurHttpDeTest({
          'POST /auth/login': {
            'access_token': 'jeton-acces-factice',
            'refresh_token': 'jeton-refresh-factice',
          },
          'GET /users/me': _profilFixture('EMPLOYE'),
          'GET /quotas/me': <dynamic>[],
          'GET /orders/mine': <dynamic>[],
          'GET /catalog': [_produitFixture],
          'POST /orders': const _ReponseErreur(422, {
            'code_refus': 'stock_insuffisant',
          }),
        });

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            secureStorageProvider.overrideWithValue(_SecureStorageDeTest()),
            dioPublicProvider.overrideWithValue(dioDeTest),
            dioProvider.overrideWithValue(dioDeTest),
          ],
          child: const TarhibApp(),
        ),
      );
      await tester.pumpAndSettle();
      await seConnecter(tester);

      await tester.tap(find.byType(FloatingActionButton));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('champ_produit')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('قهوة عربية').last);
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(FilledButton, 'إرسال الطلب'));
      await tester.pumpAndSettle();

      expect(
        find.text('الكمية المطلوبة غير متوفرة في المخزون'),
        findsOneWidget,
      );
      // Toujours sur le formulaire : pas de redirection en cas de refus.
      expect(find.text('طلب جديد'), findsOneWidget);
    },
  );

  testWidgets('Catalogue affiche les produits renvoyés par GET /catalog', (
    tester,
  ) async {
    final dioDeTest = Dio(BaseOptions(baseUrl: 'http://test.local'))
      ..httpClientAdapter = _AdaptateurHttpDeTest({
        'GET /catalog': [_produitFixture],
      });

    await tester.pumpWidget(
      ProviderScope(
        overrides: [dioProvider.overrideWithValue(dioDeTest)],
        child: MaterialApp(
          locale: const Locale('ar'),
          supportedLocales: AppLocalizations.supportedLocales,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          home: const CatalogueScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('قهوة عربية'), findsOneWidget);
    expect(find.textContaining('مشروبات'), findsOneWidget);
  });
}
