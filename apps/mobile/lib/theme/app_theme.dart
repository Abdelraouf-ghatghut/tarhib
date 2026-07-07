import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'snow_colors.dart';
import 'snow_radii.dart';

/// Design system SnowUI Light — version mobile officielle du thème Web Admin.
/// Thmanyah (police produit du Web) n'existe pas en .ttf redistribuable ; on
/// reproduit la même pile de fallback (Cairo pour l'arabe, Inter pour le
/// latin) via google_fonts pour préserver l'identité visuelle.
abstract class AppTheme {
  static TextTheme _textTheme(bool isAr) {
    final base = isAr
        ? GoogleFonts.cairoTextTheme()
        : GoogleFonts.interTextTheme();
    return base.apply(
      bodyColor: SnowColors.textPrimary,
      displayColor: SnowColors.textPrimary,
    );
  }

  static ThemeData light({required bool isAr}) {
    final colorScheme = const ColorScheme.light(
      brightness: Brightness.light,
      primary: SnowColors.primary,
      onPrimary: Colors.white,
      secondary: SnowColors.primaryStrong,
      onSecondary: Colors.white,
      error: SnowColors.dangerStrong,
      onError: Colors.white,
      surface: SnowColors.surface,
      onSurface: SnowColors.textPrimary,
      surfaceContainerHighest: SnowColors.surfaceMuted,
      outline: SnowColors.borderMedium,
      outlineVariant: SnowColors.border,
    );

    final textTheme = _textTheme(isAr);

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: SnowColors.background,
      textTheme: textTheme,
      fontFamily: textTheme.bodyMedium?.fontFamily,
      splashFactory: InkSparkle.splashFactory,

      appBarTheme: AppBarTheme(
        backgroundColor: SnowColors.background,
        foregroundColor: SnowColors.textPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        centerTitle: false,
        titleTextStyle: textTheme.titleMedium?.copyWith(
          fontWeight: FontWeight.w700,
          color: SnowColors.textPrimary,
        ),
      ),

      cardTheme: CardThemeData(
        color: SnowColors.card,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(SnowRadii.lg),
        ),
      ),

      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: SnowColors.surface,
        elevation: 0,
        height: 68,
        indicatorColor: SnowColors.primarySoft,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 11,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? SnowColors.primaryStrong : SnowColors.textMuted,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: selected ? SnowColors.primaryStrong : SnowColors.textMuted,
          );
        }),
      ),

      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: SnowColors.primary,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(48),
          elevation: 0,
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(SnowRadii.md),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: SnowColors.textPrimary,
          minimumSize: const Size.fromHeight(48),
          side: const BorderSide(color: SnowColors.borderMedium),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(SnowRadii.md),
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: SnowColors.primaryStrong,
          textStyle: const TextStyle(fontWeight: FontWeight.w600),
        ),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: SnowColors.surfaceMuted,
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
          borderSide: const BorderSide(color: SnowColors.primary, width: 1.6),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(SnowRadii.md),
          borderSide: const BorderSide(color: SnowColors.dangerStrong),
        ),
        hintStyle: const TextStyle(color: SnowColors.textMuted, fontSize: 14),
        labelStyle: const TextStyle(color: SnowColors.textSecondary, fontSize: 14),
      ),

      chipTheme: ChipThemeData(
        backgroundColor: SnowColors.surfaceMuted,
        selectedColor: SnowColors.primary,
        labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(SnowRadii.pill),
        ),
      ),

      dividerTheme: const DividerThemeData(
        color: SnowColors.border,
        thickness: 1,
        space: 1,
      ),

      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: SnowColors.surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
      ),

      snackBarTheme: SnackBarThemeData(
        backgroundColor: SnowColors.textPrimary,
        contentTextStyle: const TextStyle(color: Colors.white),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(SnowRadii.md),
        ),
      ),

      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: SnowColors.primary,
      ),

      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((s) =>
            s.contains(WidgetState.selected) ? Colors.white : Colors.white),
        trackColor: WidgetStateProperty.resolveWith((s) =>
            s.contains(WidgetState.selected)
                ? SnowColors.primary
                : SnowColors.borderMedium),
        trackOutlineColor:
            const WidgetStatePropertyAll(Colors.transparent),
      ),
    );
  }
}
