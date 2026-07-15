import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'l10n/app_localizations.dart';
import 'providers/auth_provider.dart';
import 'providers/theme_provider.dart';
import 'theme/app_theme.dart';
import 'agent/router_agent.dart';

void main() {
  runApp(const ProviderScope(child: TarhibAgentApp()));
}

class TarhibAgentApp extends ConsumerWidget {
  const TarhibAgentApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(agentRouterProvider);
    final locale = ref.watch(localeProvider);
    final themeMode = ref.watch(themeModeProvider);
    final isAr = locale.languageCode == 'ar';

    return MaterialApp.router(
      title: 'Tarhib Agent',
      debugShowCheckedModeBanner: false,
      locale: locale,
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: AppTheme.agentLight(isAr: isAr),
      darkTheme: AppTheme.agentDark(isAr: isAr),
      themeMode: themeMode,
      routerConfig: router,
    );
  }
}
