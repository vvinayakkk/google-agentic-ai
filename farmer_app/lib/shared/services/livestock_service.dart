import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_endpoints.dart';
import '../../core/utils/app_cache.dart';

class LivestockService {
  final ApiClient _client;

  static const int _ttlShort = 900;
  static const String _listKey = 'livestock:list';

  LivestockService(this._client);

  List<Map<String, dynamic>> _listFromCache(dynamic cached) {
    if (cached is! List) return const <Map<String, dynamic>>[];
    return cached
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList(growable: false);
  }

  /// GET /api/v1/equipment/livestock/ → list livestock.
  Future<List<Map<String, dynamic>>> listLivestock({
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    if (!forceRefresh && preferCache) {
      final cached = await AppCache.get(_listKey);
      if (cached != null) return _listFromCache(cached);
    }

    try {
      final res = await _client.get(ApiEndpoints.livestock);
      final data = res.data;
      // API may return {"items": [...]} or a bare [...].
      List<Map<String, dynamic>> result;
      if (data is Map && data['items'] is List) {
        result = (data['items'] as List).cast<Map<String, dynamic>>();
      } else if (data is List) {
        result = data.cast<Map<String, dynamic>>();
      } else {
        result = <Map<String, dynamic>>[];
      }

      await AppCache.put(_listKey, result, ttlSeconds: _ttlShort);
      return result;
    } catch (_) {
      if (!forceRefresh) {
        final cached = await AppCache.get(_listKey);
        if (cached != null) return _listFromCache(cached);
      }
      rethrow;
    }
  }

  /// POST /api/v1/equipment/livestock/ → create livestock entry.
  Future<Map<String, dynamic>> createLivestock({
    required String animalType,
    String? breed,
    required int count,
    int? ageMonths,
    String? healthStatus,
  }) async {
    final res = await _client.post(
      ApiEndpoints.livestock,
      data: {
        'animal_type': animalType,
        if (breed != null) 'breed': breed,
        'count': count,
        if (ageMonths != null) 'age_months': ageMonths,
        if (healthStatus != null) 'health_status': healthStatus,
      },
    );
    await AppCache.invalidate(_listKey);
    return res.data as Map<String, dynamic>;
  }

  /// GET /api/v1/equipment/livestock/{id}.
  Future<Map<String, dynamic>> getLivestockById(String id) async {
    final res = await _client.get(ApiEndpoints.livestockById(id));
    return res.data as Map<String, dynamic>;
  }

  /// PUT /api/v1/equipment/livestock/{id} → update livestock entry.
  Future<Map<String, dynamic>> updateLivestock(
      String id, Map<String, dynamic> data) async {
    final res = await _client.put(
      ApiEndpoints.livestockById(id),
      data: data,
    );
    await AppCache.invalidate(_listKey);
    return res.data as Map<String, dynamic>;
  }

  /// DELETE /api/v1/equipment/livestock/{id}.
  Future<void> deleteLivestock(String id) async {
    await _client.delete(ApiEndpoints.livestockById(id));
    await AppCache.invalidate(_listKey);
  }
}

// ── Riverpod provider ─────────────────────────────────────────
final livestockServiceProvider = Provider<LivestockService>((ref) {
  return LivestockService(ref.watch(apiClientProvider));
});
