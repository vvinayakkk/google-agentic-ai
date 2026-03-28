import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Design system for Krishi Sarthi marketplace screens.
abstract final class MarketColors {
  static const bgColor = Color(0xFFF2F5F0);
  static const heroDark = Color(0xFF2D3D1E);
  static const heroDeep = Color(0xFF1C3A1C);
  static const primaryGreen = Color(0xFF4CAF50);
  static const primaryDark = Color(0xFF2E7D32);
  static const textPrimary = Color(0xFF1A1A1A);
  static const textSecondary = Color(0xFF6B7280);
  static const cardBg = Color(0xFFFFFFFF);
  static const tagGreenBg = Color(0xFFE8F5E9);
  static const tagGreenText = Color(0xFF2E7D32);
  static const deltaRed = Color(0xFFC62828);
  static const deltaRedBg = Color(0xFFFFEBEE);
  static const amber = Color(0xFFFF8F00);
}

abstract final class MarketTextStyles {
  static TextStyle get heroTitle => GoogleFonts.playfairDisplay(
    fontSize: 30,
    fontWeight: FontWeight.w700,
    fontStyle: FontStyle.italic,
    color: Colors.white,
  );

  static TextStyle get heroSubtitle =>
      GoogleFonts.nunito(fontSize: 12, color: Colors.white.withOpacity(0.7));

  static TextStyle get sectionTitle => GoogleFonts.nunito(
    fontSize: 16,
    fontWeight: FontWeight.w700,
    color: MarketColors.textPrimary,
  );

  static TextStyle get label =>
      GoogleFonts.nunito(fontSize: 12, color: MarketColors.textSecondary);

  static TextStyle get priceText => GoogleFonts.nunito(
    fontSize: 16,
    fontWeight: FontWeight.w700,
    color: MarketColors.primaryDark,
    fontFeatures: const [FontFeature.tabularFigures()],
  );

  static TextStyle get bodyMd =>
      GoogleFonts.nunito(fontSize: 14, color: MarketColors.textPrimary);

  static TextStyle get bodySm =>
      GoogleFonts.nunito(fontSize: 13, color: MarketColors.textSecondary);

  static TextStyle tabular(TextStyle base) =>
      base.copyWith(fontFeatures: const [FontFeature.tabularFigures()]);
}

abstract final class MarketDecorations {
  static BoxDecoration get cardDecor => BoxDecoration(
    color: MarketColors.cardBg,
    borderRadius: BorderRadius.circular(16),
    boxShadow: [
      BoxShadow(
        color: Colors.black.withOpacity(0.08),
        blurRadius: 12,
        offset: const Offset(0, 2),
      ),
    ],
  );

  static BoxDecoration get heroDecor => BoxDecoration(
    color: MarketColors.heroDark,
    borderRadius: BorderRadius.circular(20),
  );

  static BoxDecoration pill(Color color) =>
      BoxDecoration(color: color, borderRadius: BorderRadius.circular(999));
}
