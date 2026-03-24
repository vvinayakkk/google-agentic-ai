import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/providers/locale_provider.dart';

class LanguageSelectScreen extends ConsumerWidget {
  const LanguageSelectScreen({super.key});

  static const _englishNames = {
    'en': 'English',
    'hi': 'Hindi',
    'bn': 'Bengali',
    'te': 'Telugu',
    'mr': 'Marathi',
    'ta': 'Tamil',
    'gu': 'Gujarati',
    'kn': 'Kannada',
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentLocale = ref.watch(localeProvider);
    final supported = AppConstants.supportedLocales.toSet();
    final languageCodes = _englishNames.keys.where(supported.contains).toList();

    return Scaffold(
      body: Container(
        width: double.infinity,

        /// SAME BACKGROUND AS SPLASH
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              AppColors.lightBackground,
              AppColors.lightSurface,
            ],
          ),
        ),

        child: SafeArea(
          child: Stack(
            children: [
              Positioned(
                top: 8,
                left: 8,
                child: IconButton(
                  onPressed: () {
                    context.go(RoutePaths.splash);
                  },
                  icon: const Icon(Icons.arrow_back_rounded),
                  color: AppColors.lightText,
                  style: IconButton.styleFrom(
                    backgroundColor: Colors.white.withValues(alpha: 0.45),
                    side: BorderSide(color: Colors.white.withValues(alpha: 0.75)),
                  ),
                ),
              ),
              Center(
                child: Container(
                  width: 360,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 26),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        AppColors.lightBackground,
                        AppColors.lightSurface,
                      ],
                    ),
                    borderRadius: BorderRadius.circular(26),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.75)),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primaryDark.withValues(alpha: 0.12),
                        blurRadius: 30,
                        spreadRadius: 1,
                      )
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [

                  /// Title
                  const Text(
                    "Hello Farmer,",
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      color: AppColors.lightText,
                    ),
                  ),

                  const SizedBox(height: 6),

                  const Text(
                    "Please choose your language",
                    style: TextStyle(
                      fontSize: 16,
                      color: AppColors.lightTextSecondary,
                    ),
                  ),

                  const SizedBox(height: 24),

                  /// Language buttons
                  ...languageCodes.map((code) {
                    final native = AppConstants.languageNames[code] ?? code;
                    final englishName = _englishNames[code] ?? code;

                    final selected =
                        currentLocale.languageCode == code;

                    final label = code == 'en'
                        ? englishName
                        : "$native ($englishName)";

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: GestureDetector(
                        onTap: () {
                          ref
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
                                : Colors.white.withValues(alpha: 0.55),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.8),
                            ),
                          ),
                          child: Center(
                            child: Text(
                              label,
                              style: TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w600,
                                color: AppColors.lightText,
                              ),
                            ),
                          ),
                        ),
                      ),
                    );
                  }),

                  const SizedBox(height: 8),

                  /// Next Button
                  SizedBox(
                    width: 160,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: () {
                        context.go(RoutePaths.login);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white.withValues(alpha: 0.85),
                        foregroundColor: AppColors.lightText,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(40),
                        ),
                      ),
                      child: Text(
                        "common.next".tr(),
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