import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'l10n/app_localizations.dart';
import 'providers/auth_provider.dart';
import 'theme/app_theme.dart';
import 'client/router_client.dart';

void main() {
  runApp(const ProviderScope(child: TarhibClientApp()));
}

/// Tarhib Employee — version mobile officielle du Design System SnowUI Light
/// du Web Admin (voir lib/theme/). Un seul thème, toujours clair : la
/// continuité visuelle Web ⇄ Mobile est la règle absolue du guide fourni.
class TarhibClientApp extends ConsumerWidget {
  const TarhibClientApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(clientRouterProvider);
    final locale = ref.watch(localeProvider);
    final isAr = locale.languageCode == 'ar';

    return MaterialApp.router(
      title: 'Tarhib',
      debugShowCheckedModeBanner: false,
      locale: locale,
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: AppTheme.light(isAr: isAr),
      routerConfig: router,
    );
  }
}
