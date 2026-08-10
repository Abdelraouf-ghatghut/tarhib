import 'package:flutter/material.dart';

// ── Color constants ────────────────────────────────────────────────────────────
const Color kPrimary = Color(0xFF0052CC);
const Color kAccent = Color(0xFF00A3BF);
const Color kSuccess = Color(0xFF36B37E);
const Color kWarning = Color(0xFFFF991F);
const Color kError = Color(0xFFFF4D4F);
const Color kTextPrimary = Color(0xFF172B4D);
const Color kTextSecondary = Color(0xFF6B778C);

// ── Status color helper ────────────────────────────────────────────────────────
Color statusColor(String status) {
  switch (status.toUpperCase()) {
    case 'PENDING':
      return kWarning;
    case 'APPROVED':
      return kPrimary;
    case 'IN_PROGRESS':
      return kAccent;
    case 'DELIVERED':
      return kSuccess;
    case 'REJECTED':
      return kError;
    default:
      return kTextSecondary;
  }
}

// ── Light theme ────────────────────────────────────────────────────────────────
ThemeData buildLightTheme() {
  const primary = kPrimary;
  const secondary = kAccent;

  return ThemeData(
    useMaterial3: true,
    fontFamily: 'Cairo',
    scaffoldBackgroundColor: Colors.white,
    colorScheme: const ColorScheme.light(
      primary: primary,
      secondary: secondary,
      surface: Colors.white,
      onSurface: kTextPrimary,
      onPrimary: Colors.white,
      onSecondary: Colors.white,
      error: kError,
      onError: Colors.white,
      outline: Color(0xFFEBECF0),
      outlineVariant: Color(0xFFF4F5F7),
      surfaceContainerHighest: Color(0xFFF4F5F7),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      foregroundColor: kTextPrimary,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      surfaceTintColor: Colors.transparent,
      centerTitle: false,
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      margin: EdgeInsets.zero,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.white,
      indicatorColor: primary.withValues(alpha: 0.1),
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      height: 68,
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final bool selected = states.contains(WidgetState.selected);
        return TextStyle(
          fontFamily: 'Cairo',
          fontSize: 11,
          fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
          color: selected ? primary : kTextSecondary,
        );
      }),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        textStyle: const TextStyle(
          fontFamily: 'Cairo',
          fontWeight: FontWeight.w600,
          fontSize: 15,
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: primary,
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        side: const BorderSide(color: primary, width: 1.5),
        textStyle: const TextStyle(
          fontFamily: 'Cairo',
          fontWeight: FontWeight.w600,
          fontSize: 15,
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: primary,
        textStyle: const TextStyle(
          fontFamily: 'Cairo',
          fontWeight: FontWeight.w500,
          fontSize: 14,
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFFF4F5F7),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: primary, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: kError, width: 1),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: kError, width: 2),
      ),
      disabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide.none,
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      labelStyle: const TextStyle(
        fontFamily: 'Cairo',
        color: kTextSecondary,
        fontSize: 14,
      ),
      hintStyle: const TextStyle(
        fontFamily: 'Cairo',
        color: kTextSecondary,
        fontSize: 14,
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: const Color(0xFFF4F5F7),
      selectedColor: primary.withValues(alpha: 0.1),
      side: BorderSide.none,
      labelPadding: const EdgeInsets.symmetric(horizontal: 4),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      labelStyle: const TextStyle(
        fontFamily: 'Cairo',
        fontSize: 13,
        color: kTextPrimary,
      ),
    ),
    dividerTheme: const DividerThemeData(
      color: Color(0xFFEBECF0),
      thickness: 1,
      space: 1,
    ),
    listTileTheme: const ListTileThemeData(
      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
    ),
    textTheme: const TextTheme(
      displayLarge:
          TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, color: kTextPrimary),
      displayMedium:
          TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, color: kTextPrimary),
      displaySmall:
          TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, color: kTextPrimary),
      headlineLarge:
          TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, color: kTextPrimary),
      headlineMedium:
          TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, color: kTextPrimary),
      headlineSmall:
          TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600, color: kTextPrimary),
      titleLarge:
          TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600, color: kTextPrimary),
      titleMedium:
          TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600, color: kTextPrimary),
      titleSmall:
          TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w500, color: kTextPrimary),
      bodyLarge: TextStyle(fontFamily: 'Cairo', color: kTextPrimary),
      bodyMedium: TextStyle(fontFamily: 'Cairo', color: kTextPrimary),
      bodySmall: TextStyle(fontFamily: 'Cairo', color: kTextSecondary),
      labelLarge:
          TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600, color: kTextPrimary),
      labelMedium: TextStyle(fontFamily: 'Cairo', color: kTextSecondary),
      labelSmall: TextStyle(fontFamily: 'Cairo', color: kTextSecondary),
    ),
  );
}

// ── Dark theme ─────────────────────────────────────────────────────────────────
ThemeData buildDarkTheme() {
  const primary = Color(0xFF4D9FFF);
  const secondary = Color(0xFF00C8E8);
  const onSurface = Color(0xFFE8EDF2);

  return ThemeData(
    useMaterial3: true,
    fontFamily: 'Cairo',
    scaffoldBackgroundColor: Colors.black,
    colorScheme: ColorScheme.dark(
      primary: primary,
      secondary: secondary,
      surface: const Color(0xFF141414),
      onSurface: onSurface,
      onPrimary: Colors.white,
      onSecondary: Colors.black,
      error: kError,
      onError: Colors.white,
      outline: const Color(0xFF2D2D2D),
      outlineVariant: const Color(0xFF1E1E1E),
      surfaceContainerHighest: const Color(0xFF1E1E1E),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.black,
      foregroundColor: onSurface,
      elevation: 0,
      scrolledUnderElevation: 0,
      surfaceTintColor: Colors.transparent,
      centerTitle: false,
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      color: const Color(0xFF141414),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      margin: EdgeInsets.zero,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: const Color(0xFF0A0A0A),
      indicatorColor: primary.withValues(alpha: 0.15),
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      height: 68,
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final bool selected = states.contains(WidgetState.selected);
        return TextStyle(
          fontFamily: 'Cairo',
          fontSize: 11,
          fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
          color: selected ? primary : kTextSecondary,
        );
      }),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        textStyle: const TextStyle(
          fontFamily: 'Cairo',
          fontWeight: FontWeight.w600,
          fontSize: 15,
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: primary,
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        side: const BorderSide(color: primary, width: 1.5),
        textStyle: const TextStyle(
          fontFamily: 'Cairo',
          fontWeight: FontWeight.w600,
          fontSize: 15,
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: primary,
        textStyle: const TextStyle(
          fontFamily: 'Cairo',
          fontWeight: FontWeight.w500,
          fontSize: 14,
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFF1A1A1A),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFF2D2D2D), width: 1),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFF2D2D2D), width: 1),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: primary, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: kError, width: 1),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: kError, width: 2),
      ),
      disabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFF1E1E1E), width: 1),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      labelStyle: const TextStyle(
        fontFamily: 'Cairo',
        color: kTextSecondary,
        fontSize: 14,
      ),
      hintStyle: const TextStyle(
        fontFamily: 'Cairo',
        color: kTextSecondary,
        fontSize: 14,
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: const Color(0xFF1A1A1A),
      selectedColor: primary.withValues(alpha: 0.2),
      side: BorderSide.none,
      labelPadding: const EdgeInsets.symmetric(horizontal: 4),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      labelStyle: const TextStyle(
        fontFamily: 'Cairo',
        fontSize: 13,
        color: onSurface,
      ),
    ),
    dividerTheme: const DividerThemeData(
      color: Color(0xFF1E1E1E),
      thickness: 1,
      space: 1,
    ),
    listTileTheme: const ListTileThemeData(
      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
    ),
    textTheme: const TextTheme(
      displayLarge:
          TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, color: onSurface),
      displayMedium:
          TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, color: onSurface),
      displaySmall:
          TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, color: onSurface),
      headlineLarge:
          TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, color: onSurface),
      headlineMedium:
          TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, color: onSurface),
      headlineSmall:
          TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600, color: onSurface),
      titleLarge:
          TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600, color: onSurface),
      titleMedium:
          TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600, color: onSurface),
      titleSmall:
          TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w500, color: onSurface),
      bodyLarge: TextStyle(fontFamily: 'Cairo', color: onSurface),
      bodyMedium: TextStyle(fontFamily: 'Cairo', color: onSurface),
      bodySmall: TextStyle(fontFamily: 'Cairo', color: kTextSecondary),
      labelLarge:
          TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600, color: onSurface),
      labelMedium: TextStyle(fontFamily: 'Cairo', color: kTextSecondary),
      labelSmall: TextStyle(fontFamily: 'Cairo', color: kTextSecondary),
    ),
  );
}
