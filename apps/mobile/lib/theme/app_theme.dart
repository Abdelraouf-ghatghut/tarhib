import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'snow_colors.dart';
import 'snow_radii.dart';

abstract class AppTheme {
  static TextTheme _textTheme(bool isAr, Color text) {
    final base = isAr
        ? GoogleFonts.cairoTextTheme()
        : GoogleFonts.interTextTheme();
    return base.apply(bodyColor: text, displayColor: text);
  }

  static ThemeData light({required bool isAr}) => clientLight(isAr: isAr);

  static ThemeData clientLight({required bool isAr}) => _build(
        isAr: isAr,
        brightness: Brightness.light,
        primary: SnowColors.primary,
        primarySoft: SnowColors.primarySoft,
        primaryStrong: SnowColors.primaryStrong,
        background: SnowColors.background,
        surface: SnowColors.surface,
        surfaceMuted: SnowColors.surfaceMuted,
        text: SnowColors.textPrimary,
      );

  static ThemeData clientDark({required bool isAr}) => _build(
        isAr: isAr,
        brightness: Brightness.dark,
        primary: SnowColors.primary,
        primarySoft: SnowColors.agentDarkMuted,
        primaryStrong: const Color(0xFF7DE3C1),
        background: SnowColors.agentDarkBackground,
        surface: SnowColors.agentDarkSurface,
        surfaceMuted: SnowColors.agentDarkMuted,
        text: const Color(0xFFF8FAFC),
      );

  static ThemeData agentLight({required bool isAr}) => _build(
        isAr: isAr,
        brightness: Brightness.light,
        primary: SnowColors.agentPrimary,
        primarySoft: SnowColors.agentPrimarySoft,
        primaryStrong: SnowColors.agentPrimaryStrong,
        background: SnowColors.background,
        surface: SnowColors.surface,
        surfaceMuted: SnowColors.surfaceMuted,
        text: SnowColors.textPrimary,
      );

  static ThemeData agentDark({required bool isAr}) => _build(
        isAr: isAr,
        brightness: Brightness.dark,
        primary: SnowColors.agentPrimary,
        primarySoft: SnowColors.agentDarkMuted,
        primaryStrong: const Color(0xFF9AAEFF),
        background: SnowColors.agentDarkBackground,
        surface: SnowColors.agentDarkSurface,
        surfaceMuted: SnowColors.agentDarkMuted,
        text: const Color(0xFFF8FAFC),
      );

  static ThemeData _build({
    required bool isAr,
    required Brightness brightness,
    required Color primary,
    required Color primarySoft,
    required Color primaryStrong,
    required Color background,
    required Color surface,
    required Color surfaceMuted,
    required Color text,
  }) {
    final isDark = brightness == Brightness.dark;
    final textTheme = _textTheme(isAr, text);
    final outline = isDark ? const Color(0xFF334155) : SnowColors.borderMedium;
    final outlineVariant =
        isDark ? const Color(0xFF1E293B) : SnowColors.border;

    final scheme = ColorScheme(
      brightness: brightness,
      primary: primary,
      onPrimary: Colors.white,
      secondary: primaryStrong,
      onSecondary: Colors.white,
      error: SnowColors.dangerStrong,
      onError: Colors.white,
      surface: surface,
      onSurface: text,
      surfaceContainerHighest: surfaceMuted,
      outline: outline,
      outlineVariant: outlineVariant,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: background,
      textTheme: textTheme,
      fontFamily: textTheme.bodyMedium?.fontFamily,
      splashFactory: InkSparkle.splashFactory,
      appBarTheme: AppBarTheme(
        backgroundColor: background,
        foregroundColor: text,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        centerTitle: true,
        titleTextStyle: textTheme.titleMedium?.copyWith(
          color: text,
          fontSize: 16,
          fontWeight: FontWeight.w800,
        ),
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(SnowRadii.lg),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: surface,
        elevation: 0,
        height: 68,
        indicatorColor: primarySoft,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            color: selected ? primaryStrong : SnowColors.textMuted,
            fontSize: 11,
            fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: selected ? primaryStrong : SnowColors.textMuted,
          );
        }),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: primaryStrong,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(52),
          elevation: 0,
          textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(SnowRadii.md),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: text,
          minimumSize: const Size.fromHeight(52),
          side: BorderSide(color: outline),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(SnowRadii.md),
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primaryStrong,
          textStyle: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceMuted,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(SnowRadii.md),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(SnowRadii.md),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(SnowRadii.md),
          borderSide: BorderSide(color: primary, width: 1.6),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(SnowRadii.md),
          borderSide: const BorderSide(color: SnowColors.dangerStrong),
        ),
        hintStyle: const TextStyle(color: SnowColors.textMuted, fontSize: 14),
        labelStyle:
            const TextStyle(color: SnowColors.textSecondary, fontSize: 14),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: surfaceMuted,
        selectedColor: primary,
        labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(SnowRadii.pill),
        ),
      ),
      dividerTheme:
          DividerThemeData(color: outlineVariant, thickness: 1, space: 1),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: surface,
        surfaceTintColor: Colors.transparent,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor:
            isDark ? const Color(0xFFF8FAFC) : SnowColors.textPrimary,
        contentTextStyle:
            TextStyle(color: isDark ? SnowColors.textPrimary : Colors.white),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(SnowRadii.md),
        ),
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(color: primary),
      switchTheme: SwitchThemeData(
        thumbColor: const WidgetStatePropertyAll(Colors.white),
        trackColor: WidgetStateProperty.resolveWith((states) {
          return states.contains(WidgetState.selected) ? primary : outline;
        }),
        trackOutlineColor: const WidgetStatePropertyAll(Colors.transparent),
      ),
    );
  }
}
