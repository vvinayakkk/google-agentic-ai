import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_endpoints.dart';

/// Service for real-time mandi prices from data.gov.in API.
class LiveMarketService {
  final ApiClient _client;

  LiveMarketService(this._client);

  /// GET /api/v1/market/live-market/prices → live prices by filters.
  Future<Map<String, dynamic>> getLivePrices({
    String? state,
    String? commodity,
    String? district,
    int limit = 100,
  }) async {
    final res = await _client.get(
      ApiEndpoints.liveMarketPrices,
      queryParameters: {
        if (state != null) 'state': state,
        if (commodity != null) 'commodity': commodity,
        if (district != null) 'district': district,
        'limit': limit,
      },
    );
    return res.data as Map<String, dynamic>;
  }

  /// GET /api/v1/market/live-market/prices/all-india → all-India for one crop.
  Future<Map<String, dynamic>> getAllIndiaPrices(String commodity,
      {int limit = 500}) async {
    final res = await _client.get(
      ApiEndpoints.liveMarketPricesAllIndia,
      queryParameters: {'commodity': commodity, 'limit': limit},
    );
    return res.data as Map<String, dynamic>;
  }

  /// GET /api/v1/market/live-market/msp → MSP for a crop.
  Future<Map<String, dynamic>> getMsp(String crop) async {
    final res = await _client.get(
      ApiEndpoints.liveMarketMsp,
      queryParameters: {'crop': crop},
    );
    return res.data as Map<String, dynamic>;
  }

  /// GET /api/v1/market/live-market/msp/all → all MSP prices.
  Future<Map<String, dynamic>> getAllMsp() async {
    final res = await _client.get(ApiEndpoints.liveMarketMspAll);
    return res.data as Map<String, dynamic>;
  }

  /// GET /api/v1/market/live-market/commodities → list of tradeable crops.
  Future<List<String>> getCommodities() async {
    final res = await _client.get(ApiEndpoints.liveMarketCommodities);
    final data = res.data;
    if (data is Map && data['commodities'] is List) {
      return (data['commodities'] as List).cast<String>();
    }
    return [];
  }

  /// GET /api/v1/market/live-market/states → list of states.
  Future<List<String>> getStates() async {
    final res = await _client.get(ApiEndpoints.liveMarketStates);
    final data = res.data;
    if (data is Map && data['states'] is List) {
      return (data['states'] as List).cast<String>();
    }
    return [];
  }

  /// GET /api/v1/market/live-market/mandis → mandi directory with live fallback.
  Future<List<Map<String, dynamic>>> getLiveMandis({
    String? state,
    int limit = 200,
  }) async {
    final res = await _client.get(
      ApiEndpoints.liveMarketMandis,
      queryParameters: {
        if (state != null && state.trim().isNotEmpty) 'state': state,
        'limit': limit,
      },
    );
    final data = res.data;
    if (data is Map && data['mandis'] is List) {
      return (data['mandis'] as List)
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    }
    return [];
  }
}

final liveMarketServiceProvider = Provider<LiveMarketService>((ref) {
  return LiveMarketService(ref.watch(apiClientProvider));
});
