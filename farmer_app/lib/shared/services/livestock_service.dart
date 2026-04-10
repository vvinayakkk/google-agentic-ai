import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_endpoints.dart';
import '../../core/utils/app_cache.dart';

class LivestockService {
  final ApiClient _client;

  static const int _ttlShort = 900;
  static const String _listKey = 'livestock:list';

  String _detailKey(String id) => 'livestock:item:$id';

  String _extractId(Map<String, dynamic> row) {
    return (row['livestock_id'] ?? row['id'] ?? '').toString().trim();
  }

  Future<void> _cacheDetailRows(List<Map<String, dynamic>> rows) async {
    for (final row in rows) {
      final id = _extractId(row);
      if (id.isEmpty) continue;
      await AppCache.put(_detailKey(id), row, ttlSeconds: _ttlShort);
    }
  }

  LivestockService(this._client);

  Map<String, dynamic> _normalizeRow(Map<String, dynamic> row) {
    final out = Map<String, dynamic>.from(row);

    final id = (out['livestock_id'] ?? out['id'] ?? '').toString().trim();
    if (id.isNotEmpty) {
      out['id'] = id;
      out['livestock_id'] = id;
    }

    final type = (out['animal_type'] ?? out['type'] ?? out['name'] ?? '')
        .toString()
        .trim();
    if (type.isNotEmpty) {
      out['animal_type'] = type;
      out['type'] = type;
      if ((out['name'] ?? '').toString().trim().isEmpty) {
        out['name'] = type;
      }
    }

    return out;
  }

  List<Map<String, dynamic>> _listFromCache(dynamic cached) {
    if (cached is! List) return const <Map<String, dynamic>>[];
    return cached
        .whereType<Map>()
        .map((e) => _normalizeRow(Map<String, dynamic>.from(e)))
        .toList(growable: false);
  }

  /// GET /api/v1/equipment/livestock/ → list livestock.
  Future<List<Map<String, dynamic>>> listLivestock({
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    if (!forceRefresh && preferCache) {
      final cached = await AppCache.get(_listKey);
      if (cached != null) return _listFromCache(cached);
    }

    try {
      final res = await _client.get(ApiEndpoints.livestock);
      final data = res.data;
      // API may return {"items": [...]} or a bare [...].
      List<Map<String, dynamic>> result;
      if (data is Map && data['items'] is List) {
        result = (data['items'] as List).cast<Map<String, dynamic>>();
      } else if (data is List) {
        result = data.cast<Map<String, dynamic>>();
      } else {
        result = <Map<String, dynamic>>[];
      }

      result = result.map(_normalizeRow).toList(growable: false);

      await AppCache.put(_listKey, result, ttlSeconds: _ttlShort);
      await _cacheDetailRows(result);
      return result;
    } catch (_) {
      if (!forceRefresh) {
        final cached = await AppCache.get(_listKey);
        if (cached != null) return _listFromCache(cached);
      }
      rethrow;
    }
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
        'type': animalType.trim(),
        'breed': (breed != null && breed.trim().isNotEmpty)
            ? breed.trim()
            : 'Mixed',
        'count': count,
        if (healthStatus != null) 'health_status': healthStatus,
      },
    );
    await AppCache.invalidate(_listKey);
    return _normalizeRow(
      Map<String, dynamic>.from((res.data as Map).cast<dynamic, dynamic>()),
    );
  }

  /// GET /api/v1/equipment/livestock/{id}.
  Future<Map<String, dynamic>> getLivestockById(
    String id, {
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    final normId = id.trim();
    if (normId.isEmpty) {
      throw Exception('Invalid livestock id');
    }

    if (!forceRefresh && preferCache) {
      final cached = await AppCache.get(_detailKey(normId));
      if (cached is Map) {
        return Map<String, dynamic>.from(cached.cast<dynamic, dynamic>());
      }
    }

    try {
      final res = await _client.get(
        ApiEndpoints.livestockById(normId),
        options: Options(receiveTimeout: const Duration(seconds: 10)),
      );
      final payload = (res.data is Map)
          ? _normalizeRow(
              Map<String, dynamic>.from(
                (res.data as Map).cast<dynamic, dynamic>(),
              ),
            )
          : <String, dynamic>{};
      if (payload.isNotEmpty) {
        await AppCache.put(_detailKey(normId), payload, ttlSeconds: _ttlShort);
      }
      return payload;
    } catch (_) {
      // Fallback to cached list row to keep profile screen usable during transient gateway/network errors.
      final listCached = await AppCache.get(_listKey);
      final rows = _listFromCache(listCached);
      for (final row in rows) {
        if (_extractId(row) == normId) {
          await AppCache.put(_detailKey(normId), row, ttlSeconds: _ttlShort);
          return row;
        }
      }
      rethrow;
    }
  }

  /// PUT /api/v1/equipment/livestock/{id} → update livestock entry.
  Future<Map<String, dynamic>> updateLivestock(
    String id,
    Map<String, dynamic> data,
  ) async {
    final payload = <String, dynamic>{};

    final type = (data['type'] ?? data['animal_type'] ?? data['name'] ?? '')
        .toString()
        .trim();
    if (type.isNotEmpty) payload['type'] = type;

    final breed = (data['breed'] ?? '').toString().trim();
    if (breed.isNotEmpty) payload['breed'] = breed;

    final count = int.tryParse((data['count'] ?? '').toString());
    if (count != null && count > 0) payload['count'] = count;

    final health = (data['health_status'] ?? '').toString().trim();
    if (health.isNotEmpty) payload['health_status'] = health;

    if (payload.isEmpty) {
      throw Exception('No valid fields to update');
    }

    final res = await _client.put(
      ApiEndpoints.livestockById(id),
      data: payload,
    );
    await AppCache.invalidate(_listKey);
    return _normalizeRow(
      Map<String, dynamic>.from((res.data as Map).cast<dynamic, dynamic>()),
    );
  }

  /// DELETE /api/v1/equipment/livestock/{id}.
  Future<void> deleteLivestock(String id) async {
    await _client.delete(ApiEndpoints.livestockById(id));
    await AppCache.invalidate(_listKey);
    await AppCache.invalidate(_detailKey(id));
  }

  Future<void> warmAnimalProfile({String? livestockId}) async {
    try {
      final id = (livestockId ?? '').trim();
      if (id.isNotEmpty) {
        await getLivestockById(id, preferCache: true, forceRefresh: false);
        return;
      }

      final rows = await listLivestock(preferCache: true, forceRefresh: false);
      if (rows.isEmpty) return;
      final firstId = _extractId(rows.first);
      if (firstId.isEmpty) return;
      await getLivestockById(firstId, preferCache: true, forceRefresh: false);
    } catch (_) {
      // Best-effort warmup.
    }
  }
}

// ── Riverpod provider ─────────────────────────────────────────
final livestockServiceProvider = Provider<LivestockService>((ref) {
  return LivestockService(ref.watch(apiClientProvider));
});
