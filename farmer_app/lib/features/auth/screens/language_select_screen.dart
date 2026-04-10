import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/providers/locale_provider.dart';
import '../../../shared/providers/theme_provider.dart';

class LanguageSelectScreen extends ConsumerWidget {
  const LanguageSelectScreen({super.key});

  static const _englishNames = {
    'en': 'English',
    'hi': 'Hindi',
    'mr': 'Marathi',
    'gu': 'Gujarati',
    'pa': 'Punjabi',
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentLocale = ref.watch(localeProvider);
    final themeMode = ref.watch(themeProvider);
    final isDark = context.isDark;
    final supported = AppConstants.supportedLocales.toSet();
    final languageCodes = _englishNames.keys.where(supported.contains).toList();

    final textColor = isDark ? AppColors.darkText : AppColors.lightText;
    final subColor =
        isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;
    final surface = isDark
        ? AppColors.darkCard.withValues(alpha: 0.96)
        : Colors.white.withValues(alpha: 0.55);

    return Scaffold(
      body: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? const [AppColors.darkBackground, AppColors.darkSurface]
                : const [AppColors.lightBackground, AppColors.lightSurface],
          ),
        ),
        child: SafeArea(
          child: Stack(
            children: [
              Positioned(
                top: 8,
                left: 8,
                child: IconButton(
                  onPressed: () => context.go(RoutePaths.splash),
                  icon: const Icon(Icons.arrow_back_rounded),
                  color: isDark ? AppColors.primary : textColor,
                  style: IconButton.styleFrom(
                    backgroundColor: isDark ? Colors.transparent : surface,
                    side: isDark
                        ? null
                        : const BorderSide(color: Colors.white),
                  ),
                ),
              ),
              Positioned(
                top: 8,
                right: 8,
                child: IconButton(
                  onPressed: () => ref.read(themeProvider.notifier).toggle(),
                  icon: Icon(
                    themeMode == ThemeMode.dark
                        ? Icons.dark_mode
                        : Icons.light_mode,
                  ),
                  color: isDark ? AppColors.primary : textColor,
                  style: IconButton.styleFrom(
                    backgroundColor: isDark ? Colors.transparent : surface,
                    side: isDark
                        ? null
                        : const BorderSide(color: Colors.white),
                  ),
                ),
              ),
              Center(
                child: Container(
                  width: 360,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 26),
                  decoration: BoxDecoration(
                    color: surface,
                    borderRadius: BorderRadius.circular(26),
                    border: Border.all(
                      color: isDark ? AppColors.darkBorder : Colors.white,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primaryDark.withValues(alpha: 0.12),
                        blurRadius: 30,
                        spreadRadius: 1,
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'language_select.title'.tr(),
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w700,
                          color: textColor,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'language_select.subtitle'.tr(),
                        style: TextStyle(
                          fontSize: 16,
                          color: subColor,
                        ),
                      ),
                      const SizedBox(height: 24),
                      ...languageCodes.map((code) {
                        final native = AppConstants.languageNames[code] ?? code;
                        final englishName = _englishNames[code] ?? code;
                        final selected = currentLocale.languageCode == code;
                        final label = code == 'en'
                            ? englishName
                            : '$native ($englishName)';

                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: GestureDetector(
                            onTap: () async {
                              await ref
                                  .read(localeProvider.notifier)
                                  .setLocale(context, code);
                            },
                            child: Container(
                              width: double.infinity,
                              padding: const EdgeInsets.symmetric(
                                vertical: 14,
                                horizontal: 16,
                              ),
                              decoration: BoxDecoration(
                                color: selected
                                    ? AppColors.primaryLight.withValues(alpha: 0.22)
                                    : (isDark
                                          ? AppColors.darkBackground
                                          : Colors.white.withValues(alpha: 0.6)),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: isDark
                                      ? AppColors.darkBorder
                                      : Colors.white.withValues(alpha: 0.8),
                                ),
                              ),
                              child: Center(
                                child: Text(
                                  label,
                                  style: TextStyle(
                                    fontSize: 17,
                                    fontWeight: FontWeight.w600,
                                    color: textColor,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        );
                      }),
                      const SizedBox(height: 8),
                      SizedBox(
                        width: 160,
                        height: 50,
                        child: ElevatedButton(
                          onPressed: () => context.go(RoutePaths.login),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(40),
                            ),
                          ),
                          child: Text(
                            'common.next'.tr(),
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}