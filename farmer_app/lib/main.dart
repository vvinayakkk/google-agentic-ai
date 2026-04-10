import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'core/network/api_client.dart';
import 'app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await EasyLocalization.ensureInitialized();

  // Pre-load backend URL so real devices don't need a rebuild when WiFi changes
  final prefs = await SharedPreferences.getInstance();
  final savedUrl = (prefs.getString('backend_url') ?? '').trim();
  final savedLocaleCode = (prefs.getString('locale') ?? '').trim().toLowerCase();
  const localeCodes = <String>{'en', 'hi', 'mr', 'gu', 'pa'};
  final Locale? startLocale =
      localeCodes.contains(savedLocaleCode) ? Locale(savedLocaleCode) : null;

  if (savedUrl.isNotEmpty) {
    final lowered = savedUrl.toLowerCase();
    if (lowered.contains('127.0.0.1') || lowered.contains('localhost')) {
      await prefs.remove('backend_url');
      ApiClient.overrideUrl = null;
    } else {
      ApiClient.overrideUrl = savedUrl;
    }
  }

  runApp(
    EasyLocalization(
      supportedLocales: const [
        Locale('en'),
        Locale('hi'),
        Locale('mr'),
        Locale('gu'),
        Locale('pa'),
      ],
      path: 'assets/translations',
      fallbackLocale: const Locale('en'),
      startLocale: startLocale,
      child: const ProviderScope(
        child: KisanApp(),
      ),
    ),
  );
}

