import 'dart:convert';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

class MergedJsonAssetLoader extends AssetLoader {
  const MergedJsonAssetLoader();

  @override
  Future<Map<String, dynamic>> load(String path, Locale locale) async {
    final code = locale.languageCode.toLowerCase();

    final base = await _readJson('$path/$code.json');
    final screens = await _readJson('$path/${code}_screens_multilingual_full.json');

    if (screens.isEmpty) return base;
    return <String, dynamic>{...base, ...screens};
  }

  Future<Map<String, dynamic>> _readJson(String assetPath) async {
    try {
      final raw = await rootBundle.loadString(assetPath);
      final parsed = jsonDecode(raw);
      if (parsed is Map) {
        return Map<String, dynamic>.from(parsed.cast<dynamic, dynamic>());
      }
      return <String, dynamic>{};
    } catch (_) {
      return <String, dynamic>{};
    }
  }
}
