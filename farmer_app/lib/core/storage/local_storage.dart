import 'package:shared_preferences/shared_preferences.dart';

/// Thin wrapper around [SharedPreferences] for tokens, locale, theme.
class LocalStorage {
  static const _keyAccessToken = 'access_token';
  static const _keyRefreshToken = 'refresh_token';
  static const _keyUserId = 'user_id';
  static const _keyPhone = 'phone';
  static const _keyRole = 'role';
  static const _keyLocale = 'locale';
  static const _keyThemeMode = 'theme_mode';

  Future<SharedPreferences> get _prefs => SharedPreferences.getInstance();

  // ── Tokens ───────────────────────────────────────────────

  Future<String?> get accessToken async =>
      (await _prefs).getString(_keyAccessToken);

  Future<String?> get refreshToken async =>
      (await _prefs).getString(_keyRefreshToken);

  Future<void> saveTokens({
    required String accessToken,
    String? refreshToken,
  }) async {
    final prefs = await _prefs;
    await prefs.setString(_keyAccessToken, accessToken);
    if (refreshToken != null) {
      await prefs.setString(_keyRefreshToken, refreshToken);
    }
  }

  Future<void> clearTokens() async {
    final prefs = await _prefs;
    await prefs.remove(_keyAccessToken);
    await prefs.remove(_keyRefreshToken);
  }

  // ── User info ────────────────────────────────────────────

  Future<String?> get userId async => (await _prefs).getString(_keyUserId);
  Future<String?> get phone async => (await _prefs).getString(_keyPhone);
  Future<String?> get role async => (await _prefs).getString(_keyRole);

  Future<void> saveUser({
    required String userId,
    required String phone,
    required String role,
  }) async {
    final prefs = await _prefs;
    await prefs.setString(_keyUserId, userId);
    await prefs.setString(_keyPhone, phone);
    await prefs.setString(_keyRole, role);
  }

  Future<void> clearUser() async {
    final prefs = await _prefs;
    await prefs.remove(_keyUserId);
    await prefs.remove(_keyPhone);
    await prefs.remove(_keyRole);
  }

  // ── Preferences ──────────────────────────────────────────

  Future<String> get locale async =>
      (await _prefs).getString(_keyLocale) ?? 'en';

  Future<void> saveLocale(String code) async =>
      (await _prefs).setString(_keyLocale, code);

  Future<String> get themeMode async =>
      (await _prefs).getString(_keyThemeMode) ?? 'system';

  Future<void> saveThemeMode(String mode) async =>
      (await _prefs).setString(_keyThemeMode, mode);

  // ── Auth status ──────────────────────────────────────────

  Future<bool> get isLoggedIn async {
    final token = await accessToken;
    return token != null && token.isNotEmpty;
  }

  Future<void> clearAll() async {
    await clearTokens();
    await clearUser();
  }
}
