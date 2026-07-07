import 'package:flutter/material.dart';

/// Palette SnowUI Light — identique au Web Admin (tokens.css), reformulée en
/// constantes Dart. Toute nouvelle couleur en dur dans l'app doit venir d'ici,
/// jamais d'un Colors.xxx ou d'un hex ad-hoc (cohérence Web ⇄ Mobile).
abstract class SnowColors {
  // ── Surfaces ────────────────────────────────────────────────────────────
  static const background = Color(0xFFF7F8FC);
  static const surface = Color(0xFFFFFFFF);
  static const card = Color(0xFFFFFFFF);
  static const surfaceMuted = Color(0xFFEEF1F8);

  // ── Marque ──────────────────────────────────────────────────────────────
  static const primary = Color(0xFF6C7CFF);
  static const primarySoft = Color(0xFFEEF0FF);
  static const primaryStrong = Color(0xFF5A6AF0);

  // ── Statuts (pastel) ──────────────────────────────────────────────────────
  static const success = Color(0xFF4ADE80);
  static const successStrong = Color(0xFF22C55E);
  static const successSoft = Color(0xFFECFDF3);
  static const warning = Color(0xFFFBBF24);
  static const warningStrong = Color(0xFFF59E0B);
  static const warningSoft = Color(0xFFFFF8E6);
  static const danger = Color(0xFFFB7185);
  static const dangerStrong = Color(0xFFF43F5E);
  static const dangerSoft = Color(0xFFFFF1F3);
  static const info = Color(0xFF38BDF8);
  static const infoSoft = Color(0xFFE0F6FF);

  // ── Texte ───────────────────────────────────────────────────────────────
  static const textPrimary = Color(0xFF0F172A);
  static const textSecondary = Color(0xFF475569);
  static const textMuted = Color(0xFF94A3B8);

  // ── Bordures / ombres ────────────────────────────────────────────────────
  static const border = Color(0x0F0F172A); // rgba(15,23,42,.06)
  static const borderMedium = Color(0x1A0F172A); // rgba(15,23,42,.10)
  static const shadow = Color(0x0F0F172A);

  /// Accents catégories (catalogue) — mêmes teintes que les charts Web Admin.
  static const accents = <Color>[
    Color(0xFF29B6F6),
    Color(0xFFFFCA28),
    Color(0xFF66BB6A),
    Color(0xFFEC407A),
    Color(0xFF8D6E63),
    Color(0xFF7C8BFF),
  ];
}
