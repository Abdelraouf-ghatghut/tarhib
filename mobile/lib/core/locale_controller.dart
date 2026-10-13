import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Arabe = langue par défaut au premier lancement (cf. cahier des charges
/// §12). Le choix est persisté localement (pas besoin de toucher au token de
/// session) et appliqué immédiatement, sans redémarrage.
const localeParDefaut = Locale('ar');

class LocaleController extends Notifier<Locale> {
  static const _clePreference = 'langue_active';

  @override
  Locale build() {
    _restaurerLocale();
    return localeParDefaut;
  }

  Future<void> _restaurerLocale() async {
    final prefs = await SharedPreferences.getInstance();
    final code = prefs.getString(_clePreference);
    if (code == 'en') {
      state = const Locale('en');
    }
  }

  Future<void> changerLangue(Locale locale) async {
    state = locale;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_clePreference, locale.languageCode);
  }
}

final localeControllerProvider = NotifierProvider<LocaleController, Locale>(
  LocaleController.new,
);
