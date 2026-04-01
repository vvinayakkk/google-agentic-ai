import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_endpoints.dart';
import '../../core/utils/app_cache.dart';

class CropService {
  final ApiClient _client;

  static const int _ttlShort = 900;
  static const int _ttlMedium = 1800;

  CropService(this._client);

  List<Map<String, dynamic>> _listFromCache(dynamic cached) {
    if (cached is! List) return const <Map<String, dynamic>>[];
    return cached
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList(growable: false);
  }

  Future<void> _invalidateCropCaches() async {
    await AppCache.invalidatePrefix('crops:list');
    await AppCache.invalidatePrefix('crops:cycles');
  }

  // ── Crop CRUD ─────────────────────────────────────────────

  /// GET /api/v1/crops/ → list all crops for the current farmer.
  Future<List<Map<String, dynamic>>> listCrops({
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    const key = 'crops:list';
    if (!forceRefresh && preferCache) {
      final cached = await AppCache.get(key);
      if (cached != null) return _listFromCache(cached);
    }

    try {
      final res = await _client.get(ApiEndpoints.crops);
      final list = (res.data as List<dynamic>).cast<Map<String, dynamic>>();
      await AppCache.put(key, list, ttlSeconds: _ttlShort);
      return list;
    } catch (_) {
      if (!forceRefresh) {
        final cached = await AppCache.get(key);
        if (cached != null) return _listFromCache(cached);
      }
      rethrow;
    }
  }

  /// POST /api/v1/crops/ → create a new crop.
  Future<Map<String, dynamic>> createCrop({
    required String name,
    required String season,
    required double areaAcres,
    String? sowingDate,
    String? expectedHarvestDate,
    String? variety,
  }) async {
    final res = await _client.post(
      ApiEndpoints.crops,
      data: {
        'name': name,
        'season': season,
        'area_acres': areaAcres,
        if (sowingDate != null) 'sowing_date': sowingDate,
        if (expectedHarvestDate != null)
          'expected_harvest_date': expectedHarvestDate,
        if (variety != null) 'variety': variety,
      },
    );
    await _invalidateCropCaches();
    return res.data as Map<String, dynamic>;
  }

  /// GET /api/v1/crops/{id} → single crop.
  Future<Map<String, dynamic>> getCropById(String id) async {
    final res = await _client.get(ApiEndpoints.cropById(id));
    return res.data as Map<String, dynamic>;
  }

  /// PUT /api/v1/crops/{id} → update crop.
  Future<Map<String, dynamic>> updateCrop(
      String id, Map<String, dynamic> data) async {
    final res = await _client.put(ApiEndpoints.cropById(id), data: data);
    await _invalidateCropCaches();
    return res.data as Map<String, dynamic>;
  }

  /// DELETE /api/v1/crops/{id}.
  Future<void> deleteCrop(String id) async {
    await _client.delete(ApiEndpoints.cropById(id));
    await _invalidateCropCaches();
  }

  // ── Crop cycles ───────────────────────────────────────────

  /// GET /api/v1/crops/cycles → list all cycles.
  Future<List<Map<String, dynamic>>> listCycles({
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    const key = 'crops:cycles:list';
    if (!forceRefresh && preferCache) {
      final cached = await AppCache.get(key);
      if (cached != null) return _listFromCache(cached);
    }

    try {
      final res = await _client.get(ApiEndpoints.cropCycles);
      final list = (res.data as List<dynamic>).cast<Map<String, dynamic>>();
      await AppCache.put(key, list, ttlSeconds: _ttlMedium);
      return list;
    } catch (_) {
      if (!forceRefresh) {
        final cached = await AppCache.get(key);
        if (cached != null) return _listFromCache(cached);
      }
      rethrow;
    }
  }

  /// GET /api/v1/crops/cycles/{name} → cycles by crop name.
  Future<List<Map<String, dynamic>>> getCyclesByName(
    String name, {
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    final key = 'crops:cycles:name:${name.toLowerCase().trim()}';
    if (!forceRefresh && preferCache) {
      final cached = await AppCache.get(key);
      if (cached != null) return _listFromCache(cached);
    }

    try {
      final res = await _client.get(ApiEndpoints.cropCyclesByName(name));
      final list = (res.data as List<dynamic>).cast<Map<String, dynamic>>();
      await AppCache.put(key, list, ttlSeconds: _ttlMedium);
      return list;
    } catch (_) {
      if (!forceRefresh) {
        final cached = await AppCache.get(key);
        if (cached != null) return _listFromCache(cached);
      }
      rethrow;
    }
  }

  // ── Recommendations ───────────────────────────────────────

  /// POST /api/v1/crops/recommendations → get AI crop recommendations.
  Future<Map<String, dynamic>> getRecommendations({
    required String soilType,
    required String season,
    String? state,
  }) async {
    final res = await _client.post(
      ApiEndpoints.cropRecommendations,
      data: {
        'soil_type': soilType,
        'season': season,
        if (state != null) 'state': state,
      },
    );
    return res.data as Map<String, dynamic>;
  }

  // ── Disease detection ─────────────────────────────────────

  /// POST /api/v1/crops/disease/detect → upload image for disease detection.
  /// Returns detection result with bounding boxes.
  Future<Map<String, dynamic>> detectDisease(String imagePath) async {
    final formData = FormData.fromMap({
      'image': await MultipartFile.fromFile(imagePath),
    });
    final res = await _client.upload(
      ApiEndpoints.cropDiseaseDetect,
      formData: formData,
    );
    return res.data as Map<String, dynamic>;
  }
}

// ── Riverpod provider ─────────────────────────────────────────
final cropServiceProvider = Provider<CropService>((ref) {
  return CropService(ref.watch(apiClientProvider));
});
