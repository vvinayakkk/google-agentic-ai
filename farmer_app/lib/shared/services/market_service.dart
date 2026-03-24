import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_endpoints.dart';

class MarketService {
  final ApiClient _client;

  MarketService(this._client);

  // ── Prices ────────────────────────────────────────────────

  /// GET /api/v1/market/prices/ → paginated prices.
  Future<Map<String, dynamic>> listPrices({
    String? crop,
    String? state,
    String? mandi,
    int? page,
    int? perPage,
  }) async {
    final res = await _client.get(
      ApiEndpoints.marketPrices,
      queryParameters: {
        if (crop != null) 'crop': crop,
        if (state != null) 'state': state,
        if (mandi != null) 'mandi': mandi,
        if (page != null) 'page': page,
        if (perPage != null) 'per_page': perPage,
      },
    );
    return res.data as Map<String, dynamic>;
  }

  /// GET /api/v1/market/prices/{id}.
  Future<Map<String, dynamic>> getPriceById(String id) async {
    final res = await _client.get(ApiEndpoints.marketPriceById(id));
    return res.data as Map<String, dynamic>;
  }

  // ── Mandis ────────────────────────────────────────────────

  /// GET /api/v1/market/mandis/ → paginated mandis.
  Future<Map<String, dynamic>> listMandis({
    String? state,
    String? district,
    int? page,
    int? perPage,
  }) async {
    final res = await _client.get(
      ApiEndpoints.marketMandis,
      queryParameters: {
        if (state != null) 'state': state,
        if (district != null) 'district': district,
        if (page != null) 'page': page,
        if (perPage != null) 'per_page': perPage,
      },
    );
    return res.data as Map<String, dynamic>;
  }

  /// GET /api/v1/market/mandis/{id}.
  Future<Map<String, dynamic>> getMandiById(String id) async {
    final res = await _client.get(ApiEndpoints.marketMandiById(id));
    return res.data as Map<String, dynamic>;
  }

  // ── Government schemes ────────────────────────────────────

  /// GET /api/v1/market/schemes/ → paginated schemes.
  Future<Map<String, dynamic>> listSchemes({
    String? state,
    String? category,
    bool? isActive,
    int? page,
    int? perPage,
  }) async {
    final res = await _client.get(
      ApiEndpoints.marketSchemes,
      queryParameters: {
        if (state != null) 'state': state,
        if (category != null) 'category': category,
        if (isActive != null) 'is_active': isActive,
        if (page != null) 'page': page,
        if (perPage != null) 'per_page': perPage,
      },
    );
    return res.data as Map<String, dynamic>;
  }

  /// GET /api/v1/market/schemes/{id}.
  Future<Map<String, dynamic>> getSchemeById(String id) async {
    final res = await _client.get(ApiEndpoints.marketSchemeById(id));
    return res.data as Map<String, dynamic>;
  }

  /// POST /api/v1/market/schemes/check-eligibility.
  Future<Map<String, dynamic>> checkEligibility(String farmerId) async {
    final res = await _client.post(
      ApiEndpoints.marketSchemeEligibility,
      data: {'farmer_id': farmerId},
    );
    return res.data as Map<String, dynamic>;
  }
}

// ── Riverpod provider ─────────────────────────────────────────
final marketServiceProvider = Provider<MarketService>((ref) {
  return MarketService(ref.watch(apiClientProvider));
});
