import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_endpoints.dart';

class LivestockService {
  final ApiClient _client;

  LivestockService(this._client);

  /// GET /api/v1/equipment/livestock/ → list livestock.
  Future<List<Map<String, dynamic>>> listLivestock() async {
    final res = await _client.get(ApiEndpoints.livestock);
    final data = res.data;
    // API may return {"items": [...]} or a bare [...].
    if (data is Map && data['items'] is List) {
      return (data['items'] as List).cast<Map<String, dynamic>>();
    }
    if (data is List) return data.cast<Map<String, dynamic>>();
    return [];
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
    return res.data as Map<String, dynamic>;
  }

  /// DELETE /api/v1/equipment/livestock/{id}.
  Future<void> deleteLivestock(String id) async {
    await _client.delete(ApiEndpoints.livestockById(id));
  }
}

// ── Riverpod provider ─────────────────────────────────────────
final livestockServiceProvider = Provider<LivestockService>((ref) {
  return LivestockService(ref.watch(apiClientProvider));
});
