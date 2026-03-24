import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_endpoints.dart';

class FarmerService {
  final ApiClient _client;

  FarmerService(this._client);

  // ── Profile CRUD ──────────────────────────────────────────

  /// GET /api/v1/farmers/me/profile → farmer profile.
  Future<Map<String, dynamic>> getMyProfile() async {
    final res = await _client.get(ApiEndpoints.farmerProfile);
    return res.data as Map<String, dynamic>;
  }

  /// POST /api/v1/farmers/me/profile → create profile.
  Future<Map<String, dynamic>> createProfile({
    required String village,
    required String district,
    required String state,
    required String pinCode,
    required double landSizeAcres,
    String? soilType,
    String? irrigationType,
    String? language,
  }) async {
    final res = await _client.post(
      ApiEndpoints.farmerProfile,
      data: {
        'village': village,
        'district': district,
        'state': state,
        'pin_code': pinCode,
        'land_size_acres': landSizeAcres,
        if (soilType != null) 'soil_type': soilType,
        if (irrigationType != null) 'irrigation_type': irrigationType,
        if (language != null) 'language': language,
      },
    );
    return res.data as Map<String, dynamic>;
  }

  /// PUT /api/v1/farmers/me/profile → update profile (all fields optional).
  Future<Map<String, dynamic>> updateProfile(
      Map<String, dynamic> data) async {
    final res = await _client.put(ApiEndpoints.farmerProfile, data: data);
    return res.data as Map<String, dynamic>;
  }

  /// DELETE /api/v1/farmers/me/profile.
  Future<void> deleteProfile() async {
    await _client.delete(ApiEndpoints.farmerProfile);
  }

  // ── Dashboard ─────────────────────────────────────────────

  /// GET /api/v1/farmers/me/dashboard → dashboard summary.
  Future<Map<String, dynamic>> getDashboard() async {
    final res = await _client.get(ApiEndpoints.farmerDashboard);
    return res.data as Map<String, dynamic>;
  }
}

// ── Riverpod provider ─────────────────────────────────────────
final farmerServiceProvider = Provider<FarmerService>((ref) {
  return FarmerService(ref.watch(apiClientProvider));
});
