import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Lightweight local cache using SharedPreferences for instant UI loads.
class AppCache {
  static SharedPreferences? _prefs;

  static Future<SharedPreferences> get _instance async {
    _prefs ??= await SharedPreferences.getInstance();
    return _prefs!;
  }

  // ── JSON caching ──────────────────────────────────────────

  /// Store a JSON-serializable value with a TTL (seconds).
  static Future<void> put(String key, dynamic data,
      {int ttlSeconds = 3600}) async {
    final prefs = await _instance;
    final wrapper = {
      'data': data,
      'expires': DateTime.now()
          .add(Duration(seconds: ttlSeconds))
          .millisecondsSinceEpoch,
    };
    await prefs.setString('cache_$key', jsonEncode(wrapper));
  }

  /// Retrieve cached data. Returns null if expired or missing.
  static Future<dynamic> get(String key) async {
    final prefs = await _instance;
    final raw = prefs.getString('cache_$key');
    if (raw == null) return null;
    try {
      final wrapper = jsonDecode(raw) as Map<String, dynamic>;
      final expires = wrapper['expires'] as int;
      if (DateTime.now().millisecondsSinceEpoch > expires) {
        await prefs.remove('cache_$key');
        return null;
      }
      return wrapper['data'];
    } catch (_) {
      return null;
    }
  }

  /// Invalidate a single key.
  static Future<void> invalidate(String key) async {
    final prefs = await _instance;
    await prefs.remove('cache_$key');
  }

  /// Invalidate all keys starting with the given prefix.
  static Future<void> invalidatePrefix(String prefix) async {
    final prefs = await _instance;
    final target = 'cache_$prefix';
    final keys = prefs.getKeys().where((k) => k.startsWith(target)).toList(growable: false);
    for (final key in keys) {
      await prefs.remove(key);
    }
  }

  /// Clear all cache entries.
  static Future<void> clearAll() async {
    final prefs = await _instance;
    final keys = prefs.getKeys().where((k) => k.startsWith('cache_'));
    for (final k in keys) {
      await prefs.remove(k);
    }
  }
}

/// Haptic feedback helpers for UI interactions.
class Haptics {
  /// Light tap — for button presses, toggles.
  static void light() => HapticFeedback.lightImpact();

  /// Medium tap — for selections, navigation.
  static void medium() => HapticFeedback.mediumImpact();

  /// Heavy tap — for important actions like submit, delete.
  static void heavy() => HapticFeedback.heavyImpact();

  /// Selection tick — subtle feedback for scrolling / picker.
  static void selection() => HapticFeedback.selectionClick();

  /// Vibrate — for errors / alerts.
  static void vibrate() => HapticFeedback.vibrate();
}
