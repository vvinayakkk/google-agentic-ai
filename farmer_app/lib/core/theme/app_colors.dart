import 'package:flutter/material.dart';

/// Centralized color palette for KisanKiAwaaz.
/// Light/dark variants mirror the React Native theme exactly.
abstract final class AppColors {
  // ── Brand ──────────────────────────────────────────────
  static const brandPrimary = Color(0xFF10B981);
  static const brandPrimaryLight = Color(0xFF34D399);
  static const brandPrimaryDark = Color(0xFF059669);
  static const primary = Color(0xFFFFFFFF);
  static const primaryLight = Color(0xFFFFFFFF);
  static const primaryDark = Color(0xFFFFFFFF);
  static const darkPrimary = Color(0xFFFFFFFF);
  static const darkPrimaryLight = Color(0xFFFFFFFF);
  static const darkPrimaryDark = Color(0xFFFFFFFF);

  // ── Semantic ───────────────────────────────────────────
  static const brandSuccess = Color(0xFF22C55E);
  static const success = Color(0xFFFFFFFF);
  static const danger = Color(0xFFFF5722);
  static const warning = Color(0xFFF59E0B);
  static const brandInfo = Color(0xFF16A34A);
  static const brandAccent = Color(0xFF34D399);
  static const info = Color(0xFFFFFFFF);
  static const accent = Color(0xFFFFFFFF);
  static const darkSuccess = Color(0xFFFFFFFF);
  static const darkWarning = Color(0xFFFFFFFF);
  static const darkInfo = Color(0xFFFFFFFF);
  static const darkAccent = Color(0xFFFFFFFF);

  // ── Light theme ────────────────────────────────────────
  static const lightBackground = Color(0xFFC8E6C9);
  static const lightSurface = Color(0xFFF6F7F9);
  static const lightCard = Color(0xFFFFFFFF);
  static const lightText = Color(0xFF111827);
  static const lightTextSecondary = Color(0xFF6B7280);
  static const lightBorder = Color(0xFFE2E8F0);

  // ── Dark theme ─────────────────────────────────────────
  static const darkBackground = Color(0xFF000000);
  static const darkSurface = Color(0xFF000000);
  static const darkCard = Color(0xFF000000);
  static const darkText = Color(0xFFFFFFFF);
  static const darkTextSecondary = Color(0xFFFFFFFF);
  static const darkBorder = Color(0xFFFFFFFF);
}
