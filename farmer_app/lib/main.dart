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
  final savedUrl = prefs.getString('backend_url') ?? '';
  if (savedUrl.isNotEmpty) {
    ApiClient.overrideUrl = savedUrl;
  }

  runApp(
    EasyLocalization(
      supportedLocales: const [
        Locale('en'),
        Locale('hi'),
        Locale('bn'),
        Locale('gu'),
        Locale('mr'),
        Locale('ta'),
        Locale('te'),
        Locale('kn'),
      ],
      path: 'assets/translations',
      fallbackLocale: const Locale('en'),
      child: const ProviderScope(
        child: KisanApp(),
      ),
    ),
  );
}

