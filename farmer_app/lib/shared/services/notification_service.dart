import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_endpoints.dart';
import '../../core/utils/app_cache.dart';

class NotificationService {
  final ApiClient _client;

  static const int _ttlList = 300;
  static const int _ttlUnread = 120;

  NotificationService(this._client);

  Map<String, dynamic>? _mapFromCache(dynamic cached) {
    if (cached is! Map) return null;
    return Map<String, dynamic>.from(cached.cast<dynamic, dynamic>());
  }

  String _listKey({bool? isRead, int? page, int? perPage}) {
    return 'notifications:list:isRead=${isRead?.toString() ?? 'any'}:p=${page ?? 1}:pp=${perPage ?? 20}';
  }

  // ── List / read ───────────────────────────────────────────

  /// GET /api/v1/notifications/ → paginated list.
  Future<Map<String, dynamic>> list({
    bool? isRead,
    int? page,
    int? perPage,
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    final key = _listKey(isRead: isRead, page: page, perPage: perPage);
    if (!forceRefresh && preferCache) {
      final cached = _mapFromCache(await AppCache.get(key));
      if (cached != null) return cached;
    }

    final res = await _client.get(
      ApiEndpoints.notifications,
      queryParameters: {
        if (isRead != null) 'is_read': isRead,
        if (page != null) 'page': page,
        if (perPage != null) 'per_page': perPage,
      },
    );
    final data = Map<String, dynamic>.from((res.data as Map).cast<dynamic, dynamic>());
    await AppCache.put(key, data, ttlSeconds: _ttlList);
    return data;
  }

  /// GET /api/v1/notifications/unread/count → {count}.
  Future<int> getUnreadCount({
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    const key = 'notifications:unread_count';
    if (!forceRefresh && preferCache) {
      final cached = await AppCache.get(key);
      if (cached is int) return cached;
      if (cached is num) return cached.toInt();
    }

    final res = await _client.get(ApiEndpoints.notificationsUnreadCount);
    final data = res.data as Map<String, dynamic>;
    final count = (data['count'] as num?)?.toInt() ?? 0;
    await AppCache.put(key, count, ttlSeconds: _ttlUnread);
    return count;
  }

  /// GET /api/v1/notifications/{id}.
  Future<Map<String, dynamic>> getById(String id) async {
    final res = await _client.get(ApiEndpoints.notificationById(id));
    return res.data as Map<String, dynamic>;
  }

  // ── Mark read ─────────────────────────────────────────────

  /// PUT /api/v1/notifications/{id}/read → mark single as read.
  Future<Map<String, dynamic>> markRead(String id) async {
    final res = await _client.put(ApiEndpoints.notificationRead(id));
    await AppCache.invalidatePrefix('notifications:list');
    await AppCache.invalidate('notifications:unread_count');
    return res.data as Map<String, dynamic>;
  }

  /// PUT /api/v1/notifications/read-all → mark all as read.
  Future<Map<String, dynamic>> markAllRead() async {
    final res = await _client.put(ApiEndpoints.notificationReadAll);
    await AppCache.invalidatePrefix('notifications:list');
    await AppCache.invalidate('notifications:unread_count');
    return res.data as Map<String, dynamic>;
  }

  // ── Delete ────────────────────────────────────────────────

  /// DELETE /api/v1/notifications/{id}.
  Future<void> delete(String id) async {
    await _client.delete(ApiEndpoints.notificationById(id));
    await AppCache.invalidatePrefix('notifications:list');
    await AppCache.invalidate('notifications:unread_count');
  }
}

// ── Riverpod provider ─────────────────────────────────────────
final notificationServiceProvider = Provider<NotificationService>((ref) {
  return NotificationService(ref.watch(apiClientProvider));
});
