import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';

import 'core/theme/app_theme.dart';
import 'core/router/app_router.dart';
import 'shared/providers/theme_provider.dart';
import 'shared/providers/locale_provider.dart';

/// Root widget – wires theme, locale, and router.
class KisanApp extends ConsumerWidget {
  const KisanApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeProvider);
    final locale = ref.watch(localeProvider);
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'KisanKiAwaaz',
      debugShowCheckedModeBanner: false,

      // ── Theme ──────────────────────────────────────
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: themeMode,

      // ── Localization ───────────────────────────────
      localizationsDelegates: context.localizationDelegates,
      supportedLocales: context.supportedLocales,
      locale: locale,

      // ── Routing ────────────────────────────────────
      routerConfig: router,
    );
  }
}
