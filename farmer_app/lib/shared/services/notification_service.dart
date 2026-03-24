import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_endpoints.dart';

class NotificationService {
  final ApiClient _client;

  NotificationService(this._client);

  // ── List / read ───────────────────────────────────────────

  /// GET /api/v1/notifications/ → paginated list.
  Future<Map<String, dynamic>> list({
    bool? isRead,
    int? page,
    int? perPage,
  }) async {
    final res = await _client.get(
      ApiEndpoints.notifications,
      queryParameters: {
        if (isRead != null) 'is_read': isRead,
        if (page != null) 'page': page,
        if (perPage != null) 'per_page': perPage,
      },
    );
    return res.data as Map<String, dynamic>;
  }

  /// GET /api/v1/notifications/unread/count → {count}.
  Future<int> getUnreadCount() async {
    final res = await _client.get(ApiEndpoints.notificationsUnreadCount);
    final data = res.data as Map<String, dynamic>;
    return data['count'] as int;
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
    return res.data as Map<String, dynamic>;
  }

  /// PUT /api/v1/notifications/read-all → mark all as read.
  Future<Map<String, dynamic>> markAllRead() async {
    final res = await _client.put(ApiEndpoints.notificationReadAll);
    return res.data as Map<String, dynamic>;
  }

  // ── Delete ────────────────────────────────────────────────

  /// DELETE /api/v1/notifications/{id}.
  Future<void> delete(String id) async {
    await _client.delete(ApiEndpoints.notificationById(id));
  }
}

// ── Riverpod provider ─────────────────────────────────────────
final notificationServiceProvider = Provider<NotificationService>((ref) {
  return NotificationService(ref.watch(apiClientProvider));
});
