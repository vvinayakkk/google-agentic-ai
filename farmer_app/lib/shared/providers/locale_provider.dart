import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../core/constants/app_constants.dart';
import 'auth_provider.dart';
import '../services/auth_service.dart';
import '../../core/network/api_client.dart';

class LocaleNotifier extends Notifier<Locale> {
  @override
  Locale build() {
    _init();
    return const Locale('en');
  }

  Future<void> _init() async {
    final storage = ref.read(localStorageProvider);
    final saved = await storage.locale;
    final normalized = AppConstants.supportedLocales.contains(saved)
        ? saved
        : 'en';
    state = Locale(normalized);
  }

  Future<void> setLocale(BuildContext context, String code) async {
    final normalized = AppConstants.supportedLocales.contains(code)
        ? code
        : 'en';
    final next = Locale(normalized);
    await context.setLocale(next);
    state = next;
    final storage = ref.read(localStorageProvider);
    await storage.saveLocale(normalized);
    // If user is logged in, persist language to backend profile and refresh auth state.
    try {
      final authState = ref.read(authStateProvider);
      if (authState.value?.isLoggedIn ?? false) {
        final service = ref.read(authServiceProvider);
        await service.updateMe({'language': normalized});
        // Refresh auth provider so UI reflects updated profile
        ref.invalidate(authStateProvider);
      }
    } catch (_) {
      // Ignore failures here; preference saved locally regardless.
    }
  }
}

final localeProvider =
    NotifierProvider<LocaleNotifier, Locale>(LocaleNotifier.new);
