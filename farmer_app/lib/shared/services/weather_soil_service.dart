import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../../core/network/api_endpoints.dart';
import '../../core/utils/app_cache.dart';

class WeatherSoilService {
  final ApiClient _client;

  WeatherSoilService(this._client);

  String _coordKey(double? lat, double? lon) {
    if (lat == null || lon == null) return 'profile';
    return '${lat.toStringAsFixed(4)},${lon.toStringAsFixed(4)}';
  }

  Map<String, dynamic>? _mapFromCache(dynamic cached) {
    if (cached is! Map) return null;
    return Map<String, dynamic>.from(cached.cast<dynamic, dynamic>());
  }

  Future<Map<String, dynamic>> getFullWeather({
    double? lat,
    double? lon,
    bool forceRefresh = false,
    int ttlSeconds = 3600,
  }) async {
    final cacheKey = 'weather_full_${_coordKey(lat, lon)}';
    if (!forceRefresh) {
      final cached = _mapFromCache(await AppCache.get(cacheKey));
      if (cached != null) return cached;
    }

    final res = await _client.get(
      ApiEndpoints.marketWeatherFull,
      queryParameters: <String, dynamic>{
        'lat': lat,
        'lon': lon,
      }..removeWhere((_, value) => value == null),
    );
    final data = res.data as Map<String, dynamic>;
    await AppCache.put(cacheKey, data, ttlSeconds: ttlSeconds);
    return data;
  }

  Future<Map<String, dynamic>> getSoilComposition({
    double? lat,
    double? lon,
    bool forceRefresh = false,
    int ttlSeconds = 3600,
  }) async {
    final coord = _coordKey(lat, lon);
    final cacheKey = 'soil_composition_$coord';
    final lastGoodKey = 'soil_composition_last_good_$coord';
    final negativeKey = 'soil_composition_negative_$coord';

    bool hasUsableMetrics(Map<String, dynamic>? data) {
      if (data == null) return false;
      if (data['available'] != true) return false;
      final metrics = data['metrics'];
      return metrics is Map && metrics.isNotEmpty;
    }

    Map<String, dynamic>? withStaleFlag(Map<String, dynamic>? data, String reason) {
      if (data == null) return null;
      return <String, dynamic>{
        ...data,
        'stale': true,
        'stale_reason': reason,
      };
    }

    if (!forceRefresh) {
      final cached = _mapFromCache(await AppCache.get(cacheKey));
      if (hasUsableMetrics(cached)) return cached!;

      final negative = _mapFromCache(await AppCache.get(negativeKey));
      if (negative != null) {
        final lastGood = _mapFromCache(await AppCache.get(lastGoodKey));
        final fallback = withStaleFlag(lastGood, 'last_good_fallback');
        if (fallback != null) return fallback;
        return negative;
      }
    }

    try {
      final res = await _client.get(
        ApiEndpoints.marketWeatherSoilComposition,
        queryParameters: <String, dynamic>{
          'lat': lat,
          'lon': lon,
        }..removeWhere((_, value) => value == null),
      );
      final data = res.data as Map<String, dynamic>;

      if (hasUsableMetrics(data)) {
        await AppCache.put(cacheKey, data, ttlSeconds: ttlSeconds);
        await AppCache.put(lastGoodKey, data, ttlSeconds: 30 * 24 * 3600);
        await AppCache.invalidate(negativeKey);
        return data;
      }

      // Keep negative responses short-lived to avoid stale empty chemistry state.
      await AppCache.put(negativeKey, data, ttlSeconds: 300);
      final lastGood = _mapFromCache(await AppCache.get(lastGoodKey));
      return withStaleFlag(lastGood, 'soilgrids_unavailable') ?? data;
    } catch (_) {
      final lastGood = _mapFromCache(await AppCache.get(lastGoodKey));
      if (lastGood != null) {
        return withStaleFlag(lastGood, 'network_error')!;
      }
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getWeatherByCity({required String city}) async {
    final res = await _client.get(
      ApiEndpoints.marketWeatherCity,
      queryParameters: {'city': city},
    );
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getWeatherForecastByCity({required String city}) async {
    final res = await _client.get(
      ApiEndpoints.marketWeatherForecastCity,
      queryParameters: {'city': city},
    );
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getSoilMoisture({
    required String state,
    String? district,
    int limit = 100,
    bool forceRefresh = false,
    int ttlSeconds = 3600,
  }) async {
    final districtKey = (district ?? '').trim().toLowerCase();
    final cacheKey =
        'soil_moisture_${state.trim().toLowerCase()}_${districtKey}_$limit';
    if (!forceRefresh) {
      final cached = _mapFromCache(await AppCache.get(cacheKey));
      if (cached != null) return cached;
    }

    final res = await _client.get(
      ApiEndpoints.marketSoilMoisture,
      queryParameters: {
        'state': state,
        if (district != null && district.isNotEmpty) 'district': district,
        'limit': limit,
      },
    );
    final data = res.data as Map<String, dynamic>;
    await AppCache.put(cacheKey, data, ttlSeconds: ttlSeconds);
    return data;
  }
}

final weatherSoilServiceProvider = Provider<WeatherSoilService>((ref) {
  return WeatherSoilService(ref.watch(apiClientProvider));
});
