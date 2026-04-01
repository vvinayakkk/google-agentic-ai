import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/utils/app_cache.dart';
import 'farmer_service.dart';

class PersonalizationService {
  PersonalizationService(this._ref);

  final Ref _ref;

  Future<Map<String, dynamic>> getProfileContext() async {
    final cached = await AppCache.get('profile_context_v1');
    if (cached is Map) {
      return Map<String, dynamic>.from(cached.cast<dynamic, dynamic>());
    }

    try {
      final profile = await _ref.read(farmerServiceProvider).getMyProfile();
      await AppCache.put('profile_context_v1', profile, ttlSeconds: 1800);
      return profile;
    } catch (_) {
      // Cache empty context briefly so repeated 404 profile probes do not spam logs.
      await AppCache.put(
        'profile_context_v1',
        <String, dynamic>{},
        ttlSeconds: 1800,
      );
      return <String, dynamic>{};
    }
  }

  String locationLabel(Map<String, dynamic> profile) {
    final village = (profile['village'] ?? '').toString().trim();
    final district = (profile['district'] ?? '').toString().trim();
    final state = (profile['state'] ?? '').toString().trim();
    final parts = <String>[
      village,
      district,
      state,
    ].where((p) => p.isNotEmpty).toList(growable: false);
    if (parts.isEmpty) return 'Near Mumbai';
    return parts.join(', ');
  }

  double proximityScore({
    required Map<String, dynamic> profile,
    required Map<String, dynamic> item,
  }) {
    final profileDistrict = (profile['district'] ?? '')
        .toString()
        .toLowerCase();
    final profileState = (profile['state'] ?? '').toString().toLowerCase();
    final profileVillage = (profile['village'] ?? '').toString().toLowerCase();

    final district = (item['district'] ?? item['district_name'] ?? '')
        .toString()
        .toLowerCase();
    final state = (item['state'] ?? item['state_name'] ?? '')
        .toString()
        .toLowerCase();
    final village = (item['village'] ?? item['locality'] ?? '')
        .toString()
        .toLowerCase();

    var score = 0.0;
    if (profileState.isNotEmpty && state == profileState) score += 4.0;
    if (profileDistrict.isNotEmpty && district == profileDistrict) score += 7.0;
    if (profileVillage.isNotEmpty && village == profileVillage) score += 10.0;

    // Small tie-breakers for records that at least carry location fields.
    if (state.isNotEmpty) score += 0.2;
    if (district.isNotEmpty) score += 0.2;

    return score;
  }

  List<Map<String, dynamic>> sortNearby({
    required Map<String, dynamic> profile,
    required List<Map<String, dynamic>> items,
  }) {
    final out = List<Map<String, dynamic>>.from(items);
    out.sort((a, b) {
      final sa = proximityScore(profile: profile, item: a);
      final sb = proximityScore(profile: profile, item: b);
      return sb.compareTo(sa);
    });
    return out;
  }

  String compactContext({
    required String pageName,
    required Map<String, dynamic> profile,
    required List<String> snippets,
    int maxSnippets = 8,
    int maxChars = 900,
  }) {
    final name = (profile['name'] ?? 'Farmer').toString();
    final soil = (profile['soil_type'] ?? profile['soilType'] ?? 'unknown')
        .toString();
    final irrigation =
        (profile['irrigation_type'] ?? profile['irrigationType'] ?? 'unknown')
            .toString();
    final crops = (profile['crops'] is List)
        ? (profile['crops'] as List).map((e) => e.toString()).join(', ')
        : '';

    final lines = <String>[
      'Farmer: $name',
      'Location: ${locationLabel(profile)}',
      'Soil: $soil',
      'Irrigation: $irrigation',
      if (crops.trim().isNotEmpty) 'Current crops: $crops',
      'Current page: $pageName',
      'Nearby page data:',
      ...snippets
          .where((s) => s.trim().isNotEmpty)
          .take(maxSnippets)
          .map((s) => '- ${s.trim()}'),
    ];

    var text = lines.join('\n');
    if (text.length > maxChars) {
      text = text.substring(0, maxChars);
    }
    return text;
  }
}

final personalizationServiceProvider = Provider<PersonalizationService>((ref) {
  return PersonalizationService(ref);
});
