import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_endpoints.dart';
import '../../core/utils/app_cache.dart';

class MarketService {
  final ApiClient _client;

  static const int _ttlShort = 300;
  static const int _ttlMedium = 900;
  static const int _ttlLastGood = 30 * 24 * 3600;

  MarketService(this._client);

  String _cacheKey(String base, Map<String, dynamic> params) {
    final entries = params.entries.where((e) => e.value != null).toList()
      ..sort((a, b) => a.key.compareTo(b.key));
    if (entries.isEmpty) return base;
    final suffix = entries.map((e) => '${e.key}=${e.value}').join('&');
    return '$base?$suffix';
  }

  Map<String, dynamic>? _mapFromCache(dynamic cached) {
    if (cached is! Map) return null;
    return Map<String, dynamic>.from(cached.cast<dynamic, dynamic>());
  }

  String _lastGoodKey(String key) => '${key}_last_good';

  Future<Map<String, dynamic>?> _cachedMap(
    String key, {
    bool allowExpired = false,
  }) async {
    final raw = allowExpired ? await AppCache.getStale(key) : await AppCache.get(key);
    return _mapFromCache(raw);
  }

  Future<void> _cacheMap(
    String key,
    Map<String, dynamic> data, {
    required int ttlSeconds,
  }) async {
    await AppCache.put(key, data, ttlSeconds: ttlSeconds);
    await AppCache.put(_lastGoodKey(key), data, ttlSeconds: _ttlLastGood);
  }

  Future<Map<String, dynamic>?> _staleFallback(String key) async {
    final stalePrimary = await _cachedMap(key, allowExpired: true);
    if (stalePrimary != null) {
      return <String, dynamic>{
        ...stalePrimary,
        'stale': true,
        'cache_fallback': true,
      };
    }

    final staleLastGood = await _cachedMap(
      _lastGoodKey(key),
      allowExpired: true,
    );
    if (staleLastGood != null) {
      return <String, dynamic>{
        ...staleLastGood,
        'stale': true,
        'cache_fallback': true,
      };
    }

    return null;
  }

  // ── Prices ────────────────────────────────────────────────

  /// GET /api/v1/market/prices/ → paginated prices.
  Future<Map<String, dynamic>> listPrices({
    String? crop,
    String? state,
    String? mandi,
    int? page,
    int? perPage,
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    final params = {
      if (crop != null) 'crop': crop,
      if (state != null) 'state': state,
      if (mandi != null) 'mandi': mandi,
      if (page != null) 'page': page,
      if (perPage != null) 'per_page': perPage,
    };
    final key = _cacheKey('market:prices', params);
    if (!forceRefresh && preferCache) {
      final cached = await _cachedMap(key);
      if (cached != null) return cached;

      final stale = await _staleFallback(key);
      if (stale != null) return stale;
    }

    try {
      final res = await _client.get(
        ApiEndpoints.marketPrices,
        queryParameters: params,
      );
      final data = Map<String, dynamic>.from(
        (res.data as Map).cast<dynamic, dynamic>(),
      );
      await _cacheMap(key, data, ttlSeconds: _ttlShort);
      return data;
    } catch (_) {
      final fallback = await _staleFallback(key);
      if (fallback != null) return fallback;
      return <String, dynamic>{
        'items': <Map<String, dynamic>>[],
        'prices': <Map<String, dynamic>>[],
        'data': <Map<String, dynamic>>[],
        'page': page ?? 1,
        'per_page': perPage ?? 20,
        'count': 0,
        'source': 'offline_fallback',
        'stale': true,
      };
    }
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
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    final params = {
      if (state != null) 'state': state,
      if (district != null) 'district': district,
      if (page != null) 'page': page,
      if (perPage != null) 'per_page': perPage,
    };
    final key = _cacheKey('market:mandis', params);
    if (!forceRefresh && preferCache) {
      final cached = await _cachedMap(key);
      if (cached != null) return cached;

      final stale = await _staleFallback(key);
      if (stale != null) return stale;
    }

    try {
      final res = await _client.get(
        ApiEndpoints.marketMandis,
        queryParameters: params,
      );
      final data = Map<String, dynamic>.from(
        (res.data as Map).cast<dynamic, dynamic>(),
      );
      await _cacheMap(key, data, ttlSeconds: _ttlShort);
      return data;
    } catch (_) {
      final fallback = await _staleFallback(key);
      if (fallback != null) return fallback;
      return <String, dynamic>{
        'items': <Map<String, dynamic>>[],
        'mandis': <Map<String, dynamic>>[],
        'data': <Map<String, dynamic>>[],
        'page': page ?? 1,
        'per_page': perPage ?? 20,
        'count': 0,
        'source': 'offline_fallback',
        'stale': true,
      };
    }
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
    String? searchQuery,
    bool? isActive,
    int? page,
    int? perPage,
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    final params = {
      if (state != null) 'state': state,
      if (category != null) 'category': category,
      if (searchQuery != null && searchQuery.trim().isNotEmpty)
        'q': searchQuery.trim(),
      if (isActive != null) 'is_active': isActive,
      if (page != null) 'page': page,
      if (perPage != null) 'per_page': perPage,
    };
    final key = _cacheKey('market:schemes', params);
    if (!forceRefresh && preferCache) {
      final cached = await _cachedMap(key);
      if (cached != null) return cached;

      final stale = await _staleFallback(key);
      if (stale != null) return stale;
    }

    try {
      final res = await _client.get(
        ApiEndpoints.marketSchemes,
        queryParameters: params,
      );
      final data = Map<String, dynamic>.from(
        (res.data as Map).cast<dynamic, dynamic>(),
      );
      await _cacheMap(key, data, ttlSeconds: _ttlMedium);
      return data;
    } catch (_) {
      final fallback = await _staleFallback(key);
      if (fallback != null) return fallback;
      return <String, dynamic>{
        'items': <Map<String, dynamic>>[],
        'schemes': <Map<String, dynamic>>[],
        'data': <Map<String, dynamic>>[],
        'page': page ?? 1,
        'per_page': perPage ?? 20,
        'count': 0,
        'source': 'offline_fallback',
        'stale': true,
      };
    }
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
