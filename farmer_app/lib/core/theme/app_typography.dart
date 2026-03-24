import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Typography scale matching the React Native app.
abstract final class AppTypography {
  static const double _xs = 12;
  static const double _sm = 14;
  static const double _md = 16;
  static const double _lg = 18;
  static const double _xl = 22;
  static const double _xxl = 28;
  static const double _display = 52;

  static TextTheme textTheme(Color defaultColor) {
    final base = GoogleFonts.notoSansTextTheme();
    return base.copyWith(
      displayLarge: base.displayLarge?.copyWith(
        fontSize: _display,
        fontWeight: FontWeight.w700,
        color: defaultColor,
      ),
      headlineLarge: base.headlineLarge?.copyWith(
        fontSize: _xxl,
        fontWeight: FontWeight.w700,
        color: defaultColor,
      ),
      headlineMedium: base.headlineMedium?.copyWith(
        fontSize: _xl,
        fontWeight: FontWeight.w600,
        color: defaultColor,
      ),
      titleLarge: base.titleLarge?.copyWith(
        fontSize: _lg,
        fontWeight: FontWeight.w600,
        color: defaultColor,
      ),
      titleMedium: base.titleMedium?.copyWith(
        fontSize: _md,
        fontWeight: FontWeight.w500,
        color: defaultColor,
      ),
      bodyLarge: base.bodyLarge?.copyWith(
        fontSize: _md,
        fontWeight: FontWeight.w400,
        color: defaultColor,
      ),
      bodyMedium: base.bodyMedium?.copyWith(
        fontSize: _sm,
        fontWeight: FontWeight.w400,
        color: defaultColor,
      ),
      bodySmall: base.bodySmall?.copyWith(
        fontSize: _xs,
        fontWeight: FontWeight.w400,
        color: defaultColor,
      ),
      labelLarge: base.labelLarge?.copyWith(
        fontSize: _md,
        fontWeight: FontWeight.w600,
        color: defaultColor,
      ),
      labelMedium: base.labelMedium?.copyWith(
        fontSize: _sm,
        fontWeight: FontWeight.w500,
        color: defaultColor,
      ),
      labelSmall: base.labelSmall?.copyWith(
        fontSize: _xs,
        fontWeight: FontWeight.w500,
        color: defaultColor,
      ),
    );
  }
}
