import 'package:flutter/material.dart';

/// Thème clair unique au lancement (cf. cahier des charges §11 — le mode
/// sombre est une option ultérieure, hors périmètre de ce socle).
ThemeData buildAppTheme() {
  return ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0F6E5A)),
  );
}
