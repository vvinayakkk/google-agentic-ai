import 'package:flutter/material.dart';

/// Consistent spacing tokens used across the entire app.
abstract final class AppSpacing {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double xxl = 32;
  static const double xxxl = 48;

  // Padding helpers
  static const allXs = EdgeInsets.all(xs);
  static const allSm = EdgeInsets.all(sm);
  static const allMd = EdgeInsets.all(md);
  static const allLg = EdgeInsets.all(lg);
  static const allXl = EdgeInsets.all(xl);
  static const allXxl = EdgeInsets.all(xxl);

  static const hSm = EdgeInsets.symmetric(horizontal: sm);
  static const hMd = EdgeInsets.symmetric(horizontal: md);
  static const hLg = EdgeInsets.symmetric(horizontal: lg);
  static const hXl = EdgeInsets.symmetric(horizontal: xl);

  static const vSm = EdgeInsets.symmetric(vertical: sm);
  static const vMd = EdgeInsets.symmetric(vertical: md);
  static const vLg = EdgeInsets.symmetric(vertical: lg);
  static const vXl = EdgeInsets.symmetric(vertical: xl);
}

/// Consistent border radius tokens.
abstract final class AppRadius {
  static const double sm = 6;
  static const double md = 12;
  static const double lg = 20;
  static const double xl = 28;
  static const double full = 999;

  static final smAll = BorderRadius.circular(sm);
  static final mdAll = BorderRadius.circular(md);
  static final lgAll = BorderRadius.circular(lg);
  static final xlAll = BorderRadius.circular(xl);
  static final fullAll = BorderRadius.circular(full);
}
