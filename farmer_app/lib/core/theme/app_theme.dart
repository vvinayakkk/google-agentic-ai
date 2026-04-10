import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_spacing.dart';
import 'app_typography.dart';

/// Builds the Material 3 [ThemeData] for light and dark modes.
abstract final class AppTheme {
  static ThemeData light() => _build(
        brightness: Brightness.light,
        background: AppColors.lightBackground,
        surface: AppColors.lightSurface,
        card: AppColors.lightCard,
        text: AppColors.lightText,
        textSecondary: AppColors.lightTextSecondary,
        border: AppColors.lightBorder,
      );

  static ThemeData dark() => _build(
        brightness: Brightness.dark,
        background: AppColors.darkBackground,
        surface: AppColors.darkSurface,
        card: AppColors.darkCard,
        text: AppColors.darkText,
        textSecondary: AppColors.darkTextSecondary,
        border: AppColors.darkBorder,
      );

  static ThemeData _build({
    required Brightness brightness,
    required Color background,
    required Color surface,
    required Color card,
    required Color text,
    required Color textSecondary,
    required Color border,
  }) {
    final isDark = brightness == Brightness.dark;
    final primary = isDark ? AppColors.darkPrimary : AppColors.brandPrimary;
    final primaryLight = isDark
      ? AppColors.darkPrimaryLight
      : AppColors.brandPrimaryLight;
    final primaryDark = isDark
      ? AppColors.darkPrimaryDark
      : AppColors.brandPrimaryDark;
    final success = isDark ? AppColors.darkSuccess : AppColors.brandSuccess;
    final info = isDark ? AppColors.darkInfo : AppColors.brandInfo;
    final accent = isDark ? AppColors.darkAccent : AppColors.brandAccent;

    final colorScheme = brightness == Brightness.dark
      ? ColorScheme.dark(
        primary: primary,
        onPrimary: Colors.black,
        secondary: primaryLight,
        onSecondary: Colors.black,
            error: AppColors.danger,
            onError: Colors.white,
            surface: AppColors.darkSurface,
            onSurface: AppColors.darkText,
            outline: AppColors.darkBorder,
          ).copyWith(surfaceContainerHighest: card)
        : const ColorScheme.light(
          primary: AppColors.brandPrimary,
            onPrimary: Colors.white,
          secondary: AppColors.brandPrimaryLight,
            onSecondary: Colors.white,
            error: AppColors.danger,
            onError: Colors.white,
            surface: AppColors.lightSurface,
            onSurface: AppColors.lightText,
            outline: AppColors.lightBorder,
          ).copyWith(surfaceContainerHighest: card);

    final textTheme = AppTypography.textTheme(text);

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: background,
      iconTheme: IconThemeData(
        color: isDark ? primary : null,
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(
          foregroundColor: isDark ? primary : AppColors.primaryDark,
        ),
      ),
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: background,
        foregroundColor: text,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: textTheme.titleLarge,
      ),
      cardTheme: CardThemeData(
        color: card,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: AppRadius.mdAll,
          side: BorderSide(color: border, width: 0.5),
        ),
        margin: EdgeInsets.zero,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: isDark ? primary : AppColors.primary,
          foregroundColor: isDark ? Colors.black : Colors.white,
          minimumSize: const Size(0, 52),
          shape: RoundedRectangleBorder(borderRadius: AppRadius.mdAll),
          textStyle: textTheme.labelLarge,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: isDark ? primary : AppColors.primary,
          minimumSize: const Size(0, 52),
          shape: RoundedRectangleBorder(borderRadius: AppRadius.mdAll),
          side: BorderSide(color: isDark ? primary : AppColors.primary),
          textStyle: textTheme.labelLarge,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: card,
        contentPadding: AppSpacing.allLg,
        border: OutlineInputBorder(
          borderRadius: AppRadius.mdAll,
          borderSide: BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: AppRadius.mdAll,
          borderSide: BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: AppRadius.mdAll,
          borderSide: BorderSide(color: isDark ? primary : AppColors.primary, width: 2),
        ),
        hintStyle: textTheme.bodyMedium?.copyWith(color: textSecondary),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: card,
        selectedItemColor: isDark ? primary : AppColors.primary,
        unselectedItemColor: textSecondary,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
      ),
      dividerTheme: DividerThemeData(color: border, thickness: 0.5),
      chipTheme: ChipThemeData(
        backgroundColor: surface,
        selectedColor: (isDark ? primary : AppColors.primary).withValues(alpha: 0.15),
        labelStyle: textTheme.labelMedium,
        shape: RoundedRectangleBorder(borderRadius: AppRadius.smAll),
        side: BorderSide(color: border),
      ),
      extensions: [
        AppColorsExtension(
          card: card,
          border: border,
          textSecondary: textSecondary,
          success: success,
          warning: isDark ? AppColors.darkWarning : AppColors.warning,
          info: info,
          accent: accent,
        ),
      ],
    );
  }
}

/// Custom theme extension so widgets can access semantic colors easily.
class AppColorsExtension extends ThemeExtension<AppColorsExtension> {
  final Color card;
  final Color border;
  final Color textSecondary;
  final Color success;
  final Color warning;
  final Color info;
  final Color accent;

  const AppColorsExtension({
    required this.card,
    required this.border,
    required this.textSecondary,
    required this.success,
    required this.warning,
    required this.info,
    required this.accent,
  });

  @override
  AppColorsExtension copyWith({
    Color? card,
    Color? border,
    Color? textSecondary,
    Color? success,
    Color? warning,
    Color? info,
    Color? accent,
  }) =>
      AppColorsExtension(
        card: card ?? this.card,
        border: border ?? this.border,
        textSecondary: textSecondary ?? this.textSecondary,
        success: success ?? this.success,
        warning: warning ?? this.warning,
        info: info ?? this.info,
        accent: accent ?? this.accent,
      );

  @override
  AppColorsExtension lerp(covariant AppColorsExtension? other, double t) {
    if (other == null) return this;
    return AppColorsExtension(
      card: Color.lerp(card, other.card, t)!,
      border: Color.lerp(border, other.border, t)!,
      textSecondary: Color.lerp(textSecondary, other.textSecondary, t)!,
      success: Color.lerp(success, other.success, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      info: Color.lerp(info, other.info, t)!,
      accent: Color.lerp(accent, other.accent, t)!,
    );
  }
}

/// Convenience extension on [BuildContext] for quick theme access.
extension ThemeX on BuildContext {
  ThemeData get theme => Theme.of(this);
  ColorScheme get colors => theme.colorScheme;
  TextTheme get textTheme => theme.textTheme;
  AppColorsExtension get appColors => theme.extension<AppColorsExtension>()!;
  bool get isDark => theme.brightness == Brightness.dark;
}
