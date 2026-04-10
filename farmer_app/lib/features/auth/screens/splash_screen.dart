import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/providers/theme_provider.dart';

class SplashScreen extends ConsumerWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final themeMode = ref.watch(themeProvider);
    final auth = ref.watch(authStateProvider);
    final isLoggedIn = auth.value?.isLoggedIn ?? false;

    return Scaffold(
      body: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? [AppColors.darkBackground, AppColors.darkBackground]
                : [AppColors.lightBackground, AppColors.lightSurface],
          ),
        ),
        child: SafeArea(
          child: Stack(
            children: [
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
                  color: isDark ? AppColors.primary : AppColors.lightText,
                  style: IconButton.styleFrom(
                    backgroundColor: isDark
                        ? Colors.transparent
                        : Colors.white.withValues(alpha: 0.6),
                    side: isDark
                        ? null
                        : const BorderSide(color: Colors.white),
                  ),
                ),
              ),
              Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 360),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Image.asset(
                          isDark
                              ? 'assets/images/logo_light.png'
                              : 'assets/images/logo.png',
                          width: 320,
                          height: 320,
                          fit: BoxFit.contain,
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          'welcome'.tr(),
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          'splash.subtitle'.tr(),
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        const SizedBox(height: AppSpacing.xl),
                        SizedBox(
                          width: 220,
                          height: 48,
                          child: ElevatedButton(
                            onPressed: () {
                              HapticFeedback.mediumImpact();
                              GoRouter.of(context).go(
                                isLoggedIn ? RoutePaths.home : RoutePaths.languageSelect,
                              );
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              textStyle: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                            child: Text('splash.get_started'.tr()),
                          ),
                        ),
                      ],
                    ),
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
