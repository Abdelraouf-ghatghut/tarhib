import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart' as intl;

import 'core/locale_controller.dart';
import 'core/theme/app_theme.dart';
import 'l10n/generated/app_localizations.dart';
import 'routing/app_router.dart';

void main() {
  runApp(const ProviderScope(child: TarhibApp()));
}

class TarhibApp extends ConsumerWidget {
  const TarhibApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);
    final locale = ref.watch(localeControllerProvider);

    return MaterialApp.router(
      onGenerateTitle: (context) => AppLocalizations.of(context)!.appTitle,
      theme: buildAppTheme(),
      routerConfig: router,
      locale: locale,
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        ...AppLocalizations.localizationsDelegates,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      // Arabe = RTL, anglais = LTR (cf. cahier des charges §12) : la
      // direction est dérivée explicitement de la locale active plutôt que
      // de compter sur la détection implicite de `WidgetsApp`.
      builder: (context, child) {
        final direction = intl.Bidi.isRtlLanguage(locale.languageCode)
            ? TextDirection.rtl
            : TextDirection.ltr;
        return Directionality(textDirection: direction, child: child!);
      },
    );
  }
}
