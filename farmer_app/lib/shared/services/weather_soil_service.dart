import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../../core/network/api_endpoints.dart';

class WeatherSoilService {
  final ApiClient _client;

  WeatherSoilService(this._client);

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
  }) async {
    final res = await _client.get(
      ApiEndpoints.marketSoilMoisture,
      queryParameters: {
        'state': state,
        if (district != null && district.isNotEmpty) 'district': district,
        'limit': limit,
      },
    );
    return res.data as Map<String, dynamic>;
  }
}

final weatherSoilServiceProvider = Provider<WeatherSoilService>((ref) {
  return WeatherSoilService(ref.watch(apiClientProvider));
});
