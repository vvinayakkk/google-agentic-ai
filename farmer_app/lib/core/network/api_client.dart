import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../storage/local_storage.dart';
import 'api_interceptors.dart';

/// Singleton HTTP client wrapping [Dio].
/// Provided via Riverpod so every service shares one instance.
class ApiClient {
  final Dio dio;

  /// Set at startup from SharedPreferences so real devices can hit the backend
  /// without a rebuild. Update via Settings → Backend URL.
  static String? overrideUrl;

  ApiClient._(this.dio);

  factory ApiClient({required LocalStorage storage, String? baseUrl}) {
    final resolvedBaseUrl =
        baseUrl ?? const String.fromEnvironment('API_BASE_URL').trim();
    final effectiveBaseUrl = resolvedBaseUrl.isNotEmpty
        ? resolvedBaseUrl
        : _defaultBaseUrl();

    final dio = Dio(
      BaseOptions(
        baseUrl: effectiveBaseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 45),
        sendTimeout: const Duration(seconds: 45),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    dio.interceptors.addAll([
      AuthInterceptor(storage),
      ResponseCacheInterceptor(),
      LoggingInterceptor(),
    ]);

    return ApiClient._(dio);
  }

  // ── Convenience wrappers ────────────────────────────────

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) => dio.get<T>(path, queryParameters: queryParameters, options: options);

  Future<Response<T>> post<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) => dio.post<T>(
    path,
    data: data,
    queryParameters: queryParameters,
    options: options,
  );

  Future<Response<T>> put<T>(String path, {Object? data, Options? options}) =>
      dio.put<T>(path, data: data, options: options);

  Future<Response<T>> patch<T>(String path, {Object? data, Options? options}) =>
      dio.patch<T>(path, data: data, options: options);

  Future<Response<T>> delete<T>(
    String path, {
    Object? data,
    Options? options,
  }) => dio.delete<T>(path, data: data, options: options);

  /// Upload multipart form data (audio files, images).
  Future<Response<T>> upload<T>(
    String path, {
    required FormData formData,
    Options? options,
    void Function(int, int)? onSendProgress,
  }) => dio.post<T>(
    path,
    data: formData,
    options: (options ?? Options()).copyWith(
      contentType: 'multipart/form-data',
    ),
    onSendProgress: onSendProgress,
  );
}

// ── Riverpod providers ──────────────────────────────────────

final localStorageProvider = Provider<LocalStorage>((ref) => LocalStorage());

final apiClientProvider = Provider<ApiClient>((ref) {
  final storage = ref.watch(localStorageProvider);
  return ApiClient(storage: storage);
});

String _defaultBaseUrl() {
  // 1. Runtime override set from Settings (persisted in SharedPreferences)
  if (ApiClient.overrideUrl != null && ApiClient.overrideUrl!.isNotEmpty) {
    return ApiClient.overrideUrl!;
  }

  // 2. Compile-time override: flutter build apk --dart-define=API_BASE_URL=http://...
  const envUrl = String.fromEnvironment('API_BASE_URL');
  if (envUrl.isNotEmpty) return envUrl;

  // 3. Platform defaults
  if (kIsWeb) return 'http://localhost:8000';

  // Android network mode:
  // - usb (default): for physical phones via adb reverse tunnel
  // - lan: for physical phones on same Wi-Fi as backend host
  // - emulator: for Android emulator using host alias 10.0.2.2
  const androidNetworkMode = String.fromEnvironment(
    'ANDROID_NETWORK_MODE',
    defaultValue: 'lan',
  );
  const androidLanHost = String.fromEnvironment(
    'ANDROID_LAN_HOST',
    defaultValue: '192.168.0.103',
  );

  switch (defaultTargetPlatform) {
    case TargetPlatform.android:
      if (androidNetworkMode.toLowerCase() == 'emulator') {
        return 'http://10.0.2.2:8000';
      }
      if (androidNetworkMode.toLowerCase() == 'lan') {
        return 'http://$androidLanHost:8000';
      }
      return 'http://127.0.0.1:8000';
    case TargetPlatform.iOS:
      // iOS simulator uses localhost; physical devices should set Backend URL.
      return 'http://localhost:8000';
    case TargetPlatform.windows:
    case TargetPlatform.macOS:
    case TargetPlatform.linux:
      return 'http://localhost:8000';
    case TargetPlatform.fuchsia:
      return 'http://localhost:8000';
  }
}
