import 'dart:convert';

import 'package:dio/dio.dart';
import '../storage/local_storage.dart';

/// Adds the JWT Bearer token to every request when available.
class AuthInterceptor extends Interceptor {
  final LocalStorage _storage;

  AuthInterceptor(this._storage);

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _storage.accessToken;
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // Token expired – clear and let auth guard redirect to login
      await _storage.clearTokens();
    }
    handler.next(err);
  }
}

/// Logs request/response in debug mode.
class LoggingInterceptor extends Interceptor {
  bool _shouldSuppressErrorLog(DioException err) {
    if (err.requestOptions.extra['suppressErrorLog'] == true) {
      return true;
    }

    final status = err.response?.statusCode ?? 0;
    final path = err.requestOptions.path.toLowerCase();
    if (status >= 500 && status < 600 && path.contains('/api/v1/market/')) {
      return true;
    }

    return false;
  }

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    // ignore: avoid_print
    print('→ ${options.method} ${options.uri}');
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    // ignore: avoid_print
    print('← ${response.statusCode} ${response.requestOptions.uri}');
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (_shouldSuppressErrorLog(err)) {
      handler.next(err);
      return;
    }
    // ignore: avoid_print
    print(
      '✖ ${err.response?.statusCode} ${err.requestOptions.uri} '
      'type=${err.type} message=${err.message}',
    );
    handler.next(err);
  }
}

class ResponseCacheInterceptor extends Interceptor {
  static final Map<String, _CacheEntry> _cache = <String, _CacheEntry>{};

  static const int _defaultTtlMs = 30000;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (options.method.toUpperCase() != 'GET') {
      handler.next(options);
      return;
    }

    final bypassCache = options.extra['bypassCache'] == true ||
        options.queryParameters['refresh']?.toString().toLowerCase() == 'true';
    if (bypassCache) {
      handler.next(options);
      return;
    }

    final key = _cacheKey(options);
    final cached = _cache[key];
    if (cached != null && cached.expiry.isAfter(DateTime.now())) {
      handler.resolve(
        Response(
          requestOptions: options,
          statusCode: 200,
          data: _deepCopy(cached.data),
          extra: {'fromCache': true},
        ),
      );
      return;
    }

    if (cached != null) {
      _cache.remove(key);
    }
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    final method = response.requestOptions.method.toUpperCase();
    if (method == 'GET' && response.statusCode == 200) {
      final ttlMs = (response.requestOptions.extra['cacheTtlMs'] as int?) ??
          _ttlForPath(response.requestOptions.path);
      final key = _cacheKey(response.requestOptions);
      _cache[key] = _CacheEntry(
        data: _deepCopy(response.data),
        expiry: DateTime.now().add(Duration(milliseconds: ttlMs)),
      );
    } else if (method == 'POST' ||
        method == 'PUT' ||
        method == 'PATCH' ||
        method == 'DELETE') {
      _invalidateRelated(response.requestOptions.path);
    }
    handler.next(response);
  }

  static String _cacheKey(RequestOptions options) {
    final qpEntries = options.queryParameters.entries.toList()
      ..sort((a, b) => a.key.compareTo(b.key));
    final qp = qpEntries.map((e) => '${e.key}=${e.value}').join('&');
    return '${options.baseUrl}|${options.path}|$qp';
  }

  static int _ttlForPath(String path) {
    if (path.contains('/live-market/')) return 20000;
    if (path.contains('/document-builder/schemes') ||
        path.contains('/rental-rates/categories')) {
      return 300000;
    }
    if (path.contains('/notifications/unread/count')) return 10000;
    return _defaultTtlMs;
  }

  static dynamic _deepCopy(dynamic data) {
    try {
      return jsonDecode(jsonEncode(data));
    } catch (_) {
      return data;
    }
  }

  static void _invalidateRelated(String changedPath) {
    final keys = _cache.keys.toList();
    for (final key in keys) {
      final parts = key.split('|');
      if (parts.length < 2) continue;
      final cachedPath = parts[1];
      if (changedPath.startsWith(cachedPath) || cachedPath.startsWith(changedPath)) {
        _cache.remove(key);
      }
    }
  }
}

class _CacheEntry {
  final dynamic data;
  final DateTime expiry;

  _CacheEntry({required this.data, required this.expiry});
}
