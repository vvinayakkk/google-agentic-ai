import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_endpoints.dart';

/// DTO returned on successful login / register / refresh.
class AuthTokens {
  final String accessToken;
  final String refreshToken;
  final String tokenType;

  const AuthTokens({
    required this.accessToken,
    required this.refreshToken,
    this.tokenType = 'bearer',
  });

  factory AuthTokens.fromJson(Map<String, dynamic> json) => AuthTokens(
        accessToken: json['access_token'] as String,
        refreshToken: json['refresh_token'] as String,
        tokenType: json['token_type'] as String? ?? 'bearer',
      );
}

class AuthService {
  final ApiClient _client;

  AuthService(this._client);

  String _normalizePhone(String phone) {
    final digits = phone.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.length == 10) {
      return '+91$digits';
    }
    if (digits.length == 12 && digits.startsWith('91')) {
      return '+$digits';
    }
    return phone.trim();
  }

  // ── Registration ──────────────────────────────────────────

  /// Register a new user.
  /// Returns {access_token, refresh_token, token_type, user}.
  Future<Map<String, dynamic>> register({
    required String phone,
    required String password,
    required String name,
    String? role,
    String? language,
    String? email,
  }) async {
    final normalizedPhone = _normalizePhone(phone);
    final res = await _client.post(
      ApiEndpoints.register,
      data: {
        'phone': normalizedPhone,
        'password': password,
        'name': name,
        if (role != null) 'role': role,
        if (language != null) 'language': language,
        if (email != null) 'email': email,
      },
    );
    return res.data as Map<String, dynamic>;
  }

  // ── Login ─────────────────────────────────────────────────

  /// Login with phone + password.
  /// Returns {access_token, refresh_token, token_type}.
  Future<AuthTokens> login({
    required String phone,
    required String password,
  }) async {
    final normalizedPhone = _normalizePhone(phone);
    final res = await _client.post(
      ApiEndpoints.login,
      data: {
        'phone': normalizedPhone,
        'password': password,
      },
    );
    return AuthTokens.fromJson(res.data as Map<String, dynamic>);
  }

  // ── Token refresh ─────────────────────────────────────────

  /// Refresh the access token.
  Future<AuthTokens> refreshToken(String refreshToken) async {
    final res = await _client.post(
      ApiEndpoints.refreshToken,
      data: {'refresh_token': refreshToken},
    );
    return AuthTokens.fromJson(res.data as Map<String, dynamic>);
  }

  // ── Current user ──────────────────────────────────────────

  /// GET /api/v1/auth/me → User object.
  Future<Map<String, dynamic>> getMe() async {
    final res = await _client.get(ApiEndpoints.authMe);
    return res.data as Map<String, dynamic>;
  }

  /// PUT /api/v1/auth/me → update user fields.
  Future<Map<String, dynamic>> updateMe(Map<String, dynamic> data) async {
    final res = await _client.put(ApiEndpoints.authMe, data: data);
    return res.data as Map<String, dynamic>;
  }

  // ── Password ──────────────────────────────────────────────

  /// Change password for the authenticated user.
  Future<Map<String, dynamic>> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final res = await _client.post(
      ApiEndpoints.changePassword,
      data: {
        'current_password': currentPassword,
        'new_password': newPassword,
      },
    );
    return res.data as Map<String, dynamic>;
  }

  // ── OTP ───────────────────────────────────────────────────

  /// Send OTP to phone number.
  Future<Map<String, dynamic>> sendOtp(String phone) async {
    final normalizedPhone = _normalizePhone(phone);
    final res = await _client.post(
      ApiEndpoints.otpSend,
      data: {'phone': normalizedPhone},
    );
    return res.data as Map<String, dynamic>;
  }

  /// Verify OTP.
  Future<Map<String, dynamic>> verifyOtp({
    required String phone,
    required String otp,
  }) async {
    final normalizedPhone = _normalizePhone(phone);
    final res = await _client.post(
      ApiEndpoints.otpVerify,
      data: {'phone': normalizedPhone, 'otp': otp},
    );
    return res.data as Map<String, dynamic>;
  }

  // ── Password reset ────────────────────────────────────────

  /// Reset password using phone + OTP + new password.
  Future<Map<String, dynamic>> resetPassword({
    required String phone,
    required String otp,
    required String newPassword,
  }) async {
    final normalizedPhone = _normalizePhone(phone);
    final res = await _client.post(
      ApiEndpoints.resetPassword,
      data: {
        'phone': normalizedPhone,
        'otp': otp,
        'new_password': newPassword,
      },
    );
    return res.data as Map<String, dynamic>;
  }
}

// ── Riverpod provider ─────────────────────────────────────────
final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService(ref.watch(apiClientProvider));
});
