import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'l10n/app_localizations.dart';
import 'providers/auth_provider.dart';
import 'providers/offline_queue_provider.dart';
import 'providers/theme_provider.dart';
import 'router.dart';
import 'theme.dart';

/// Handler de messages FCM en arrière-plan (top-level, obligatoire)
@pragma('vm:entry-point')
Future<void> _fcmBackgroundHandler(RemoteMessage message) async {
  // Pas besoin d'initialiser Firebase ici — déjà fait par le framework
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Firebase — nécessite google-services.json (Android) / GoogleService-Info.plist (iOS)
  // Ignorer silencieusement si non configuré (dev sans Firebase)
  try {
    await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(_fcmBackgroundHandler);
  } catch (_) {
    // Firebase non configuré — FCM désactivé
  }

  runApp(const ProviderScope(child: TarhibApp()));
}

class TarhibApp extends ConsumerWidget {
  const TarhibApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final locale = ref.watch(localeProvider);
    final themeMode = ref.watch(themeModeProvider);
    // Active le re-sync auto de la file au retour de connectivité
    ref.watch(syncQueueProvider);

    return MaterialApp.router(
      title: 'Tarhib',
      debugShowCheckedModeBanner: false,

      // ── Localisation (TARHIB-47, 48, 49) ──────────────────────────────
      locale: locale,
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],

      // ── Thème ──────────────────────────────────────────────────────────
      theme: buildLightTheme(),
      darkTheme: buildDarkTheme(),
      themeMode: themeMode,

      // ── Routing ────────────────────────────────────────────────────────
      routerConfig: router,
    );
  }
}
