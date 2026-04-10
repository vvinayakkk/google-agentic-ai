import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/foundation.dart';
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
    const androidNetworkMode = String.fromEnvironment(
      'ANDROID_NETWORK_MODE',
      defaultValue: 'lan',
    );
    const androidLanHost = String.fromEnvironment(
      'ANDROID_LAN_HOST',
      defaultValue: '192.168.0.103',
    );
    final isAndroidLanMode =
        !kIsWeb &&
        defaultTargetPlatform == TargetPlatform.android &&
        androidNetworkMode.toLowerCase() == 'lan';

    final expectedLanBase = 'http://$androidLanHost:8000';
    final isLoopback =
        lowered.contains('127.0.0.1') || lowered.contains('localhost');
    final isStaleLanOverride =
        isAndroidLanMode && lowered != expectedLanBase.toLowerCase();

    if (isLoopback || isStaleLanOverride) {
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

