import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_endpoints.dart';
import '../../core/utils/app_cache.dart';

/// Service for real-time mandi prices from data.gov.in API.
class LiveMarketService {
  final ApiClient _client;
  static const int _ttlLive = 1800;
  static const int _ttlLastGood = 30 * 24 * 3600;

  static const List<String> _offlineStates = <String>[
    'Maharashtra',
    'Gujarat',
    'Punjab',
    'Haryana',
    'Rajasthan',
    'Madhya Pradesh',
    'Uttar Pradesh',
    'Karnataka',
    'Telangana',
    'Tamil Nadu',
  ];

  static const List<String> _offlineCommodities = <String>[
    'Wheat',
    'Rice',
    'Cotton',
    'Soybean',
    'Maize',
    'Bajra',
    'Groundnut',
    'Mustard',
    'Tur',
    'Gram',
  ];

  static const Map<String, dynamic> _offlineMspPrices = <String, dynamic>{
    'Wheat': 2275,
    'Paddy': 2300,
    'Cotton': 7121,
    'Maize': 2225,
    'Soybean': 4892,
    'Bajra': 2625,
  };

  LiveMarketService(this._client);

  String _lastGoodKey(String key) => '${key}_last_good';

  Future<void> _cacheValue(String key, dynamic data) async {
    await AppCache.put(key, data, ttlSeconds: _ttlLive);
    await AppCache.put(_lastGoodKey(key), data, ttlSeconds: _ttlLastGood);
  }

  Future<Map<String, dynamic>?> _cachedMap(
    String key, {
    bool allowExpired = false,
  }) async {
    final raw = allowExpired ? await AppCache.getStale(key) : await AppCache.get(key);
    if (raw is! Map) return null;
    return Map<String, dynamic>.from(raw.cast<dynamic, dynamic>());
  }

  Future<List<String>?> _cachedStringList(
    String key, {
    bool allowExpired = false,
  }) async {
    final raw = allowExpired ? await AppCache.getStale(key) : await AppCache.get(key);
    if (raw is! List) return null;
    return raw.map((e) => e.toString()).toList(growable: false);
  }

  /// GET /api/v1/market/live-market/prices → live prices by filters.
  Future<Map<String, dynamic>> getLivePrices({
    String? state,
    String? commodity,
    String? district,
    int limit = 100,
  }) async {
    final key =
        'live_prices:${state ?? ''}:${commodity ?? ''}:${district ?? ''}:$limit';
    final cached = await _cachedMap(key);
    if (cached != null && (cached['prices'] as List?)?.isNotEmpty == true) {
      return cached;
    }

    try {
      final res = await _client.get(
        ApiEndpoints.liveMarketPrices,
        queryParameters: {
          if (state != null) 'state': state,
          if (commodity != null) 'commodity': commodity,
          if (district != null) 'district': district,
          'limit': limit,
        },
      );
      final data = Map<String, dynamic>.from(
        (res.data as Map).cast<dynamic, dynamic>(),
      );
      await _cacheValue(key, data);
      return data;
    } catch (_) {
      final stale = await _cachedMap(key, allowExpired: true) ??
          await _cachedMap(_lastGoodKey(key), allowExpired: true);
      if (stale != null) {
        return <String, dynamic>{
          ...stale,
          'stale': true,
          'source': stale['source'] ?? 'cache_fallback',
        };
      }

      final offline = <String, dynamic>{
        'prices': <Map<String, dynamic>>[],
        'total': 0,
        'stale': true,
        'source': 'offline_fallback',
      };
      await _cacheValue(key, offline);
      return offline;
    }
  }

  /// GET /api/v1/market/live-market/prices/all-india → all-India for one crop.
  Future<Map<String, dynamic>> getAllIndiaPrices(String commodity,
      {int limit = 500}) async {
    final key = 'live_all_india:${commodity.trim().toLowerCase()}:$limit';
    final cached = await _cachedMap(key);
    if (cached != null && (cached['prices'] as List?)?.isNotEmpty == true) {
      return cached;
    }

    try {
      final res = await _client.get(
        ApiEndpoints.liveMarketPricesAllIndia,
        queryParameters: {'commodity': commodity, 'limit': limit},
      );
      final data = Map<String, dynamic>.from(
        (res.data as Map).cast<dynamic, dynamic>(),
      );
      await _cacheValue(key, data);
      return data;
    } catch (_) {
      final stale = await _cachedMap(key, allowExpired: true) ??
          await _cachedMap(_lastGoodKey(key), allowExpired: true);
      if (stale != null) {
        return <String, dynamic>{...stale, 'stale': true};
      }
      final offline = <String, dynamic>{
        'commodity': commodity,
        'prices': <Map<String, dynamic>>[],
        'total': 0,
        'stale': true,
        'source': 'offline_fallback',
      };
      await _cacheValue(key, offline);
      return offline;
    }
  }

  /// GET /api/v1/market/live-market/msp → MSP for a crop.
  Future<Map<String, dynamic>> getMsp(String crop) async {
    final key = 'live_msp:${crop.trim().toLowerCase()}';
    final cached = await _cachedMap(key);
    if (cached != null) return cached;

    try {
      final res = await _client.get(
        ApiEndpoints.liveMarketMsp,
        queryParameters: {'crop': crop},
      );
      final data = Map<String, dynamic>.from(
        (res.data as Map).cast<dynamic, dynamic>(),
      );
      await _cacheValue(key, data);
      return data;
    } catch (_) {
      final stale = await _cachedMap(key, allowExpired: true) ??
          await _cachedMap(_lastGoodKey(key), allowExpired: true);
      if (stale != null) return <String, dynamic>{...stale, 'stale': true};

      final allMsp = await getAllMsp();
      final prices = (allMsp['msp_prices'] as Map?) ?? const <String, dynamic>{};
      dynamic resolved;
      for (final entry in prices.entries) {
        if (entry.key.toString().toLowerCase() == crop.toLowerCase()) {
          resolved = entry.value;
          break;
        }
      }
      return <String, dynamic>{
        'commodity': crop,
        'msp': resolved,
        'unit': 'INR/quintal',
        'season': allMsp['season'] ?? '2024-25',
        'stale': true,
        'source': 'offline_fallback',
      };
    }
  }

  /// GET /api/v1/market/live-market/msp/all → all MSP prices.
  Future<Map<String, dynamic>> getAllMsp() async {
    const key = 'live_msp_all_v1';
    final cached = await _cachedMap(key);
    if (cached != null && (cached['msp_prices'] as Map?)?.isNotEmpty == true) {
      return cached;
    }

    try {
      final res = await _client.get(ApiEndpoints.liveMarketMspAll);
      final data = Map<String, dynamic>.from(
        (res.data as Map).cast<dynamic, dynamic>(),
      );
      await _cacheValue(key, data);
      return data;
    } catch (_) {
      final stale = await _cachedMap(key, allowExpired: true) ??
          await _cachedMap(_lastGoodKey(key), allowExpired: true);
      if (stale != null) return <String, dynamic>{...stale, 'stale': true};

      final offline = <String, dynamic>{
        'msp_prices': _offlineMspPrices,
        'season': '2024-25',
        'total': _offlineMspPrices.length,
        'note': 'Prices in INR per quintal',
        'stale': true,
        'source': 'offline_fallback',
      };
      await _cacheValue(key, offline);
      return offline;
    }
  }

  /// GET /api/v1/market/live-market/commodities → list of tradeable crops.
  Future<List<String>> getCommodities() async {
    const key = 'live_commodities_v1';
    final cached = await _cachedStringList(key);
    if (cached != null && cached.isNotEmpty) return cached;

    try {
      final res = await _client.get(ApiEndpoints.liveMarketCommodities);
      final data = res.data;
      if (data is Map && data['commodities'] is List) {
        final commodities = (data['commodities'] as List)
            .map((e) => e.toString())
            .toList(growable: false);
        await _cacheValue(key, commodities);
        return commodities;
      }
    } catch (_) {
      final stale = await _cachedStringList(key, allowExpired: true) ??
          await _cachedStringList(_lastGoodKey(key), allowExpired: true);
      if (stale != null && stale.isNotEmpty) return stale;
    }

    await _cacheValue(key, _offlineCommodities);
    return _offlineCommodities;
  }

  /// GET /api/v1/market/live-market/states → list of states.
  Future<List<String>> getStates() async {
    const key = 'live_states_v1';
    final cached = await _cachedStringList(key);
    if (cached != null && cached.isNotEmpty) return cached;

    try {
      final res = await _client.get(ApiEndpoints.liveMarketStates);
      final data = res.data;
      if (data is Map && data['states'] is List) {
        final states = (data['states'] as List)
            .map((e) => e.toString())
            .toList(growable: false);
        await _cacheValue(key, states);
        return states;
      }
    } catch (_) {
      final stale = await _cachedStringList(key, allowExpired: true) ??
          await _cachedStringList(_lastGoodKey(key), allowExpired: true);
      if (stale != null && stale.isNotEmpty) return stale;
    }

    await _cacheValue(key, _offlineStates);
    return _offlineStates;
  }

  /// GET /api/v1/market/live-market/mandis → mandi directory with live fallback.
  Future<List<Map<String, dynamic>>> getLiveMandis({
    String? state,
    int limit = 200,
  }) async {
    final key = 'live_mandis:${state ?? ''}:$limit';
    final cached = await _cachedMap(key);
    if (cached != null && cached['mandis'] is List) {
      final rows = (cached['mandis'] as List)
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList(growable: false);
      if (rows.isNotEmpty) return rows;
    }

    try {
      final res = await _client.get(
        ApiEndpoints.liveMarketMandis,
        queryParameters: {
          if (state != null && state.trim().isNotEmpty) 'state': state,
          'limit': limit,
        },
      );
      final data = res.data;
      if (data is Map && data['mandis'] is List) {
        final rows = (data['mandis'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList(growable: false);
        await _cacheValue(key, <String, dynamic>{
          'mandis': rows,
          'total': rows.length,
        });
        return rows;
      }
    } catch (_) {
      final stale = await _cachedMap(key, allowExpired: true) ??
          await _cachedMap(_lastGoodKey(key), allowExpired: true);
      if (stale != null && stale['mandis'] is List) {
        return (stale['mandis'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList(growable: false);
      }
    }

    return <Map<String, dynamic>>[];
  }
}

final liveMarketServiceProvider = Provider<LiveMarketService>((ref) {
  return LiveMarketService(ref.watch(apiClientProvider));
});
