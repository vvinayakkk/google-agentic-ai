import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_endpoints.dart';

class CropService {
  final ApiClient _client;

  CropService(this._client);

  // ── Crop CRUD ─────────────────────────────────────────────

  /// GET /api/v1/crops/ → list all crops for the current farmer.
  Future<List<Map<String, dynamic>>> listCrops() async {
    final res = await _client.get(ApiEndpoints.crops);
    final list = res.data as List<dynamic>;
    return list.cast<Map<String, dynamic>>();
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
    return res.data as Map<String, dynamic>;
  }

  /// DELETE /api/v1/crops/{id}.
  Future<void> deleteCrop(String id) async {
    await _client.delete(ApiEndpoints.cropById(id));
  }

  // ── Crop cycles ───────────────────────────────────────────

  /// GET /api/v1/crops/cycles → list all cycles.
  Future<List<Map<String, dynamic>>> listCycles() async {
    final res = await _client.get(ApiEndpoints.cropCycles);
    final list = res.data as List<dynamic>;
    return list.cast<Map<String, dynamic>>();
  }

  /// GET /api/v1/crops/cycles/{name} → cycles by crop name.
  Future<List<Map<String, dynamic>>> getCyclesByName(String name) async {
    final res = await _client.get(ApiEndpoints.cropCyclesByName(name));
    final list = res.data as List<dynamic>;
    return list.cast<Map<String, dynamic>>();
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
