import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../../core/network/api_endpoints.dart';
import '../../core/utils/app_cache.dart';
import '../models/equipment_model.dart';

class EquipmentService {
  final ApiClient _client;

  EquipmentService(this._client);

  static const int _ttlShort = 300;
  static const int _ttlMedium = 900;
  static const int _ttlLong = 21600;

  String _cacheKey(String base, [Map<String, dynamic>? params]) {
    if (params == null || params.isEmpty) return base;
    final normalized =
        params.entries
            .where(
              (e) => e.value != null && e.value.toString().trim().isNotEmpty,
            )
            .toList(growable: false)
          ..sort((a, b) => a.key.compareTo(b.key));
    if (normalized.isEmpty) return base;
    final suffix = normalized
        .map(
          (e) =>
              '${Uri.encodeQueryComponent(e.key)}=${Uri.encodeQueryComponent(e.value.toString())}',
        )
        .join('&');
    return '$base?$suffix';
  }

  Future<T> _cachedRequest<T>({
    required String key,
    required Future<T> Function() request,
    required T Function(dynamic raw) fromCache,
    required dynamic Function(T value) toCache,
    bool preferCache = true,
    bool forceRefresh = false,
    int ttlSeconds = _ttlMedium,
  }) async {
    if (!forceRefresh && preferCache) {
      final cached = await AppCache.get(key);
      if (cached != null) {
        return fromCache(cached);
      }
    }

    try {
      final fresh = await request();
      await AppCache.put(key, toCache(fresh), ttlSeconds: ttlSeconds);
      return fresh;
    } catch (_) {
      if (!forceRefresh) {
        final cached = await AppCache.get(key);
        if (cached != null) {
          return fromCache(cached);
        }
      }
      rethrow;
    }
  }

  List<Map<String, dynamic>> _listFromResponse(
    dynamic data, {
    String? primaryField,
    String? secondaryField,
  }) {
    if (data is Map) {
      if (primaryField != null && data[primaryField] is List) {
        return _listFromResponse(data[primaryField]);
      }
      if (secondaryField != null && data[secondaryField] is List) {
        return _listFromResponse(data[secondaryField]);
      }
      return const <Map<String, dynamic>>[];
    }

    if (data is List) {
      return data
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList(growable: false);
    }

    return const <Map<String, dynamic>>[];
  }

  Map<String, dynamic> _mapFromResponse(dynamic data) {
    if (data is Map) {
      return Map<String, dynamic>.from(data);
    }
    return <String, dynamic>{};
  }

  Future<void> _invalidateEquipmentCaches({String? equipmentId}) async {
    await AppCache.invalidatePrefix('equipment:list');
    await AppCache.invalidatePrefix('equipment:browse');
    await AppCache.invalidatePrefix('equipment:rates');
    await AppCache.invalidatePrefix('equipment:mechanization');
    if (equipmentId != null && equipmentId.isNotEmpty) {
      await AppCache.invalidate('equipment:item:$equipmentId');
    }
  }

  Future<void> _invalidateRentalCaches({String? rentalId}) async {
    await AppCache.invalidatePrefix('equipment:rentals');
    await AppCache.invalidatePrefix('equipment:rental:');
    await AppCache.invalidatePrefix('equipment:history');
    await AppCache.invalidatePrefix('equipment:rates');
    if (rentalId != null && rentalId.isNotEmpty) {
      await AppCache.invalidate('equipment:rental:$rentalId');
    }
  }

  // ── Equipment CRUD ────────────────────────────────────────

  /// GET /api/v1/equipment/ → list equipment.
  Future<List<Map<String, dynamic>>> listEquipment({
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    return _cachedRequest<List<Map<String, dynamic>>>(
      key: 'equipment:list',
      preferCache: preferCache,
      forceRefresh: forceRefresh,
      ttlSeconds: _ttlShort,
      request: () async {
        final res = await _client.get(ApiEndpoints.equipment);
        return _listFromResponse(res.data, primaryField: 'items');
      },
      fromCache: _listFromResponse,
      toCache: (value) => value,
    );
  }

  /// POST /api/v1/equipment/ → create equipment.
  Future<Map<String, dynamic>> createEquipment({
    required String name,
    String? type,
    String? status,
    String? description,
    required double ratePerHour,
    double? ratePerDay,
    String? location,
    String? contactPhone,
    bool? available,
  }) async {
    final resolvedStatus =
        status ?? (available == false ? 'unavailable' : 'available');
    final res = await _client.post(
      ApiEndpoints.equipment,
      data: {
        'name': name,
        if (type != null) 'type': type,
        'status': resolvedStatus,
        if (description != null) 'description': description,
        'rate_per_hour': ratePerHour,
        if (ratePerDay != null) 'rate_per_day': ratePerDay,
        if (location != null) 'location': location,
        if (contactPhone != null) 'contact_phone': contactPhone,
      },
    );
    await _invalidateEquipmentCaches();
    return _mapFromResponse(res.data);
  }

  /// GET /api/v1/equipment/{id}.
  Future<Map<String, dynamic>> getEquipmentById(
    String id, {
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    return _cachedRequest<Map<String, dynamic>>(
      key: 'equipment:item:$id',
      preferCache: preferCache,
      forceRefresh: forceRefresh,
      ttlSeconds: _ttlShort,
      request: () async {
        final res = await _client.get(ApiEndpoints.equipmentById(id));
        return _mapFromResponse(res.data);
      },
      fromCache: _mapFromResponse,
      toCache: (value) => value,
    );
  }

  /// PUT /api/v1/equipment/{id} → update equipment.
  Future<Map<String, dynamic>> updateEquipment(
    String id,
    Map<String, dynamic> data,
  ) async {
    final res = await _client.put(ApiEndpoints.equipmentById(id), data: data);
    await _invalidateEquipmentCaches(equipmentId: id);
    await _invalidateRentalCaches();
    return _mapFromResponse(res.data);
  }

  /// DELETE /api/v1/equipment/{id}.
  Future<void> deleteEquipment(String id) async {
    await _client.delete(ApiEndpoints.equipmentById(id));
    await _invalidateEquipmentCaches(equipmentId: id);
    await _invalidateRentalCaches();
  }

  // ── Rentals ───────────────────────────────────────────────

  /// GET /api/v1/equipment/rentals/ → list rentals.
  Future<List<Map<String, dynamic>>> listRentals({
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    return _cachedRequest<List<Map<String, dynamic>>>(
      key: 'equipment:rentals:list',
      preferCache: preferCache,
      forceRefresh: forceRefresh,
      ttlSeconds: _ttlShort,
      request: () async {
        final res = await _client.get(ApiEndpoints.rentals);
        return _listFromResponse(res.data, primaryField: 'items');
      },
      fromCache: _listFromResponse,
      toCache: (value) => value,
    );
  }

  /// POST /api/v1/equipment/rentals/ → create rental.
  Future<Map<String, dynamic>> createRental(Map<String, dynamic> data) async {
    final res = await _client.post(ApiEndpoints.rentals, data: data);
    final payload = _mapFromResponse(res.data);
    await _invalidateRentalCaches(rentalId: payload['id']?.toString());
    await _invalidateEquipmentCaches();
    return payload;
  }

  /// GET /api/v1/equipment/rentals/{id}.
  Future<Map<String, dynamic>> getRentalById(
    String id, {
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    return _cachedRequest<Map<String, dynamic>>(
      key: 'equipment:rental:$id',
      preferCache: preferCache,
      forceRefresh: forceRefresh,
      ttlSeconds: _ttlShort,
      request: () async {
        final res = await _client.get(ApiEndpoints.rentalById(id));
        return _mapFromResponse(res.data);
      },
      fromCache: _mapFromResponse,
      toCache: (value) => value,
    );
  }

  /// PUT /api/v1/equipment/rentals/{id}/approve.
  Future<Map<String, dynamic>> approveRental(String id) async {
    final res = await _client.put(ApiEndpoints.rentalApprove(id));
    await _invalidateRentalCaches(rentalId: id);
    return _mapFromResponse(res.data);
  }

  /// PUT /api/v1/equipment/rentals/{id}/reject.
  Future<Map<String, dynamic>> rejectRental(String id) async {
    final res = await _client.put(ApiEndpoints.rentalReject(id));
    await _invalidateRentalCaches(rentalId: id);
    return _mapFromResponse(res.data);
  }

  /// PUT /api/v1/equipment/rentals/{id}/complete.
  Future<Map<String, dynamic>> completeRental(String id) async {
    final res = await _client.put(ApiEndpoints.rentalComplete(id));
    await _invalidateRentalCaches(rentalId: id);
    return _mapFromResponse(res.data);
  }

  /// PUT /api/v1/equipment/rentals/{id}/cancel.
  Future<Map<String, dynamic>> cancelRental(String id) async {
    final res = await _client.put(ApiEndpoints.rentalCancel(id));
    await _invalidateRentalCaches(rentalId: id);
    return _mapFromResponse(res.data);
  }

  // ── Rental Rates (Reference Data) ────────────────────────

  /// GET /api/v1/equipment/rental-rates/ → all equipment with standard rates.
  Future<List<Map<String, dynamic>>> listRentalRates({
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    return _cachedRequest<List<Map<String, dynamic>>>(
      key: 'equipment:rates:list',
      preferCache: preferCache,
      forceRefresh: forceRefresh,
      ttlSeconds: _ttlMedium,
      request: () async {
        final res = await _client.get(ApiEndpoints.equipmentRentalRates);
        return _listFromResponse(
          res.data,
          primaryField: 'rows',
          secondaryField: 'equipment',
        );
      },
      fromCache: _listFromResponse,
      toCache: (value) => value,
    );
  }

  /// GET /api/v1/equipment/rental-rates/categories → list categories.
  Future<List<String>> listRentalCategories({
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    return _cachedRequest<List<String>>(
      key: 'equipment:rates:categories',
      preferCache: preferCache,
      forceRefresh: forceRefresh,
      ttlSeconds: _ttlLong,
      request: () async {
        final res = await _client.get(ApiEndpoints.equipmentRentalCategories);
        final data = res.data;
        if (data is Map && data['categories'] is List) {
          return (data['categories'] as List)
              .map((e) => e.toString())
              .toList(growable: false);
        }
        if (data is Map && data['categories'] is Map) {
          return (data['categories'] as Map).keys
              .map((e) => e.toString())
              .toList(growable: false);
        }
        return const <String>[];
      },
      fromCache: (raw) {
        if (raw is List) {
          return raw.map((e) => e.toString()).toList(growable: false);
        }
        return const <String>[];
      },
      toCache: (value) => value,
    );
  }

  /// GET /api/v1/equipment/rental-rates/category/{cat} → filter by category.
  Future<List<Map<String, dynamic>>> getRentalsByCategory(
    String category, {
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    return _cachedRequest<List<Map<String, dynamic>>>(
      key: _cacheKey('equipment:rates:category', {'category': category}),
      preferCache: preferCache,
      forceRefresh: forceRefresh,
      ttlSeconds: _ttlMedium,
      request: () async {
        final res = await _client.get(
          ApiEndpoints.equipmentRentalByCategory(category),
        );
        return _listFromResponse(res.data, primaryField: 'equipment');
      },
      fromCache: _listFromResponse,
      toCache: (value) => value,
    );
  }

  /// GET /api/v1/equipment/rental-rates/state/{state} → state-wise pricing.
  Future<List<Map<String, dynamic>>> getRentalsByState(
    String state, {
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    return _cachedRequest<List<Map<String, dynamic>>>(
      key: _cacheKey('equipment:rates:state', {'state': state}),
      preferCache: preferCache,
      forceRefresh: forceRefresh,
      ttlSeconds: _ttlMedium,
      request: () async {
        final res = await _client.get(
          ApiEndpoints.equipmentRentalByState(state),
        );
        return _listFromResponse(res.data, primaryField: 'equipment');
      },
      fromCache: _listFromResponse,
      toCache: (value) => value,
    );
  }

  Future<Map<String, dynamic>> listRentalRatesFiltered({
    String? category,
    String? state,
    String? district,
    String? equipmentName,
    String? search,
    int limit = 50,
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    final params = <String, dynamic>{
      'limit': limit,
      if (category != null && category.isNotEmpty) 'category': category,
      if (state != null && state.isNotEmpty) 'state': state,
      if (district != null && district.isNotEmpty) 'district': district,
      if (equipmentName != null && equipmentName.isNotEmpty)
        'equipment_name': equipmentName,
      if (search != null && search.isNotEmpty) 'search': search,
    };
    return _cachedRequest<Map<String, dynamic>>(
      key: _cacheKey('equipment:rates:filtered', params),
      preferCache: preferCache,
      forceRefresh: forceRefresh,
      ttlSeconds: _ttlMedium,
      request: () async {
        final res = await _client.get(
          ApiEndpoints.equipmentRentalRates,
          queryParameters: params,
        );
        return _mapFromResponse(res.data);
      },
      fromCache: _mapFromResponse,
      toCache: (value) => value,
    );
  }

  Future<Map<String, dynamic>> getRentalRateDetail({
    required String equipmentName,
    String? state,
    String? district,
    int limit = 20,
    Duration receiveTimeout = const Duration(seconds: 25),
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    final params = <String, dynamic>{
      'equipment_name': equipmentName,
      'limit': limit,
      if (state != null && state.isNotEmpty) 'state': state,
      if (district != null && district.isNotEmpty) 'district': district,
    };

    return _cachedRequest<Map<String, dynamic>>(
      key: _cacheKey('equipment:rates:detail', params),
      preferCache: preferCache,
      forceRefresh: forceRefresh,
      ttlSeconds: _ttlMedium,
      request: () async {
        final res = await _client.get(
          ApiEndpoints.equipmentRentalByName(equipmentName),
          queryParameters: {
            'limit': limit,
            if (state != null && state.isNotEmpty) 'state': state,
            if (district != null && district.isNotEmpty) 'district': district,
          },
          options: Options(receiveTimeout: receiveTimeout),
        );
        return _mapFromResponse(res.data);
      },
      fromCache: _mapFromResponse,
      toCache: (value) => value,
    );
  }

  Future<List<EquipmentProvider>> searchProviders({
    required String query,
    String? state,
    String? district,
    int limit = 50,
  }) async {
    final res = await _client.get(
      '/api/v1/equipment/rental-rates/search',
      queryParameters: {
        'q': query,
        'limit': limit,
        if (state != null && state.isNotEmpty) 'state': state,
        if (district != null && district.isNotEmpty) 'district': district,
      },
    );
    final map = _mapFromResponse(res.data);
    final rows = _listFromResponse(map, primaryField: 'results');
    return rows.map(EquipmentProvider.fromJson).toList(growable: false);
  }

  Future<Map<String, dynamic>> getChcInfo({
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    return _cachedRequest<Map<String, dynamic>>(
      key: 'equipment:chc:info',
      preferCache: preferCache,
      forceRefresh: forceRefresh,
      ttlSeconds: _ttlLong,
      request: () async {
        final res = await _client.get(
          '/api/v1/equipment/rental-rates/chc-info',
        );
        return _mapFromResponse(res.data);
      },
      fromCache: _mapFromResponse,
      toCache: (value) => value,
    );
  }

  Future<List<Map<String, dynamic>>> browseAllEquipment({
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    return _cachedRequest<List<Map<String, dynamic>>>(
      key: 'equipment:browse:list',
      preferCache: preferCache,
      forceRefresh: forceRefresh,
      ttlSeconds: _ttlShort,
      request: () async {
        final res = await _client.get(ApiEndpoints.equipmentBrowse);
        return _listFromResponse(res.data, primaryField: 'items');
      },
      fromCache: _listFromResponse,
      toCache: (value) => value,
    );
  }

  Future<Map<String, dynamic>> getMechanizationStats({
    String? state,
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    final params = <String, dynamic>{
      if (state != null && state.isNotEmpty) 'state': state,
    };

    return _cachedRequest<Map<String, dynamic>>(
      key: _cacheKey('equipment:mechanization:stats', params),
      preferCache: preferCache,
      forceRefresh: forceRefresh,
      ttlSeconds: _ttlLong,
      request: () async {
        final res = await _client.get(
          '/api/v1/equipment/rental-rates/mechanization-stats',
          queryParameters: params,
        );
        return _mapFromResponse(res.data);
      },
      fromCache: _mapFromResponse,
      toCache: (value) => value,
    );
  }

  Future<Map<String, dynamic>> getRateHistory(
    String equipmentName, {
    String? state,
    Duration receiveTimeout = const Duration(seconds: 20),
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    final params = <String, dynamic>{
      'equipment_name': equipmentName,
      if (state != null && state.isNotEmpty) 'state': state,
    };

    return _cachedRequest<Map<String, dynamic>>(
      key: _cacheKey('equipment:history:rates', params),
      preferCache: preferCache,
      forceRefresh: forceRefresh,
      ttlSeconds: _ttlLong,
      request: () async {
        final res = await _client.get(
          '/api/v1/equipment/rental-rates/rate-history',
          queryParameters: params,
          options: Options(receiveTimeout: receiveTimeout),
        );
        return _mapFromResponse(res.data);
      },
      fromCache: _mapFromResponse,
      toCache: (value) => value,
    );
  }

  Future<void> warmRentalRateDetailBundle({
    required String equipmentName,
    String? state,
    String? district,
  }) async {
    try {
      await Future.wait([
        getRentalRateDetail(
          equipmentName: equipmentName,
          state: state,
          district: district,
          limit: 50,
          preferCache: true,
          forceRefresh: false,
        ),
        getRateHistory(
          equipmentName,
          state: state,
          preferCache: true,
          forceRefresh: false,
        ),
        getChcInfo(preferCache: true, forceRefresh: false),
      ]);
    } catch (_) {
      // Best-effort prefetch should never block UI navigation.
    }
  }

  Future<void> warmEquipmentListingDetail(String equipmentId) async {
    if (equipmentId.trim().isEmpty) return;
    try {
      await getEquipmentById(
        equipmentId,
        preferCache: true,
        forceRefresh: false,
      );
    } catch (_) {
      // Best-effort prefetch should never block UI navigation.
    }
  }
}

// ── Riverpod provider ─────────────────────────────────────────
final equipmentServiceProvider = Provider<EquipmentService>((ref) {
  return EquipmentService(ref.watch(apiClientProvider));
});
