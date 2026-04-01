import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_endpoints.dart';
import '../../core/utils/app_cache.dart';

class FarmerService {
  final ApiClient _client;

  static const int _ttlProfile = 3600;
  static const int _ttlDashboard = 900;
  static const String _profileKey = 'farmer:profile';
  static const String _dashboardKey = 'farmer:dashboard';

  FarmerService(this._client);

  Map<String, dynamic>? _mapFromCache(dynamic cached) {
    if (cached is! Map) return null;
    return Map<String, dynamic>.from(cached.cast<dynamic, dynamic>());
  }

  Future<void> _invalidateFarmerCaches() async {
    await AppCache.invalidate(_profileKey);
    await AppCache.invalidate(_dashboardKey);
  }

  // ── Profile CRUD ──────────────────────────────────────────

  /// GET /api/v1/farmers/me/profile → farmer profile.
  Future<Map<String, dynamic>> getMyProfile({
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    if (!forceRefresh && preferCache) {
      final cached = _mapFromCache(await AppCache.get(_profileKey));
      if (cached != null) return cached;
    }

    try {
      final res = await _client.get(ApiEndpoints.farmerProfile);
      final data = Map<String, dynamic>.from((res.data as Map).cast<dynamic, dynamic>());
      await AppCache.put(_profileKey, data, ttlSeconds: _ttlProfile);
      return data;
    } catch (_) {
      if (!forceRefresh) {
        final cached = _mapFromCache(await AppCache.get(_profileKey));
        if (cached != null) return cached;
      }
      rethrow;
    }
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
    final data = Map<String, dynamic>.from((res.data as Map).cast<dynamic, dynamic>());
    await AppCache.put(_profileKey, data, ttlSeconds: _ttlProfile);
    await AppCache.invalidate(_dashboardKey);
    return data;
  }

  /// PUT /api/v1/farmers/me/profile → update profile (all fields optional).
  Future<Map<String, dynamic>> updateProfile(
      Map<String, dynamic> data) async {
    final res = await _client.put(ApiEndpoints.farmerProfile, data: data);
    final updated = Map<String, dynamic>.from((res.data as Map).cast<dynamic, dynamic>());
    await AppCache.put(_profileKey, updated, ttlSeconds: _ttlProfile);
    await AppCache.invalidate(_dashboardKey);
    return updated;
  }

  /// DELETE /api/v1/farmers/me/profile.
  Future<void> deleteProfile() async {
    await _client.delete(ApiEndpoints.farmerProfile);
    await _invalidateFarmerCaches();
  }

  // ── Dashboard ─────────────────────────────────────────────

  /// GET /api/v1/farmers/me/dashboard → dashboard summary.
  Future<Map<String, dynamic>> getDashboard({
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    if (!forceRefresh && preferCache) {
      final cached = _mapFromCache(await AppCache.get(_dashboardKey));
      if (cached != null) return cached;
    }

    try {
      final res = await _client.get(ApiEndpoints.farmerDashboard);
      final data = Map<String, dynamic>.from((res.data as Map).cast<dynamic, dynamic>());
      await AppCache.put(_dashboardKey, data, ttlSeconds: _ttlDashboard);
      return data;
    } catch (_) {
      if (!forceRefresh) {
        final cached = _mapFromCache(await AppCache.get(_dashboardKey));
        if (cached != null) return cached;
      }
      rethrow;
    }
  }
}

// ── Riverpod provider ─────────────────────────────────────────
final farmerServiceProvider = Provider<FarmerService>((ref) {
  return FarmerService(ref.watch(apiClientProvider));
});
