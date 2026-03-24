import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../services/auth_service.dart';

/// Holds the current authentication state.
class AuthState {
  final bool isLoggedIn;
  final bool isLoading;
  final Map<String, dynamic>? user;
  final String? error;

  const AuthState({
    this.isLoggedIn = false,
    this.isLoading = false,
    this.user,
    this.error,
  });

  AuthState copyWith({
    bool? isLoggedIn,
    bool? isLoading,
    Map<String, dynamic>? user,
    String? error,
  }) =>
      AuthState(
        isLoggedIn: isLoggedIn ?? this.isLoggedIn,
        isLoading: isLoading ?? this.isLoading,
        user: user ?? this.user,
        error: error,
      );
}

class AuthNotifier extends AsyncNotifier<AuthState> {
  @override
  Future<AuthState> build() async {
    final storage = ref.read(localStorageProvider);
    final loggedIn = await storage.isLoggedIn;
    if (!loggedIn) return const AuthState();

    final uid = await storage.userId ?? '';
    final phone = await storage.phone ?? '';
    final role = await storage.role ?? 'farmer';

    return AuthState(
      isLoggedIn: true,
      user: {'uid': uid, 'phone': phone, 'role': role},
    );
  }

  /// Login with phone + password → returns tokens directly.
  Future<bool> login(String phone, String password) async {
    state = const AsyncData(AuthState(isLoading: true));
    try {
      final service = ref.read(authServiceProvider);
      final tokens = await service.login(phone: phone, password: password);

      final storage = ref.read(localStorageProvider);
      await storage.saveTokens(
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      );
      await storage.saveUser(userId: phone, phone: phone, role: 'farmer');

      // Fetch user profile
      try {
        final me = await service.getMe();
        final role = me['role'] as String? ?? 'farmer';
        final uid = me['uid'] as String? ?? phone;
        await storage.saveUser(userId: uid, phone: phone, role: role);
        state = AsyncData(AuthState(isLoggedIn: true, user: me));
      } catch (_) {
        state = AsyncData(AuthState(
          isLoggedIn: true,
          user: {'phone': phone, 'role': 'farmer'},
        ));
      }
      return true;
    } catch (e) {
      state = AsyncData(AuthState(error: e.toString()));
      return false;
    }
  }

  /// Register a new account.
  Future<bool> register({
    required String phone,
    required String password,
    required String name,
    String? language,
  }) async {
    state = const AsyncData(AuthState(isLoading: true));
    try {
      final service = ref.read(authServiceProvider);
      final result = await service.register(
        phone: phone,
        password: password,
        name: name,
        language: language,
      );

      // Registration returns tokens + user
      final accessToken = result['access_token'] as String? ?? '';
      final refreshToken = result['refresh_token'] as String? ?? '';

      if (accessToken.isNotEmpty) {
        final storage = ref.read(localStorageProvider);
        await storage.saveTokens(
          accessToken: accessToken,
          refreshToken: refreshToken,
        );
        await storage.saveUser(userId: phone, phone: phone, role: 'farmer');
      }

      state = AsyncData(AuthState(
        isLoggedIn: accessToken.isNotEmpty,
        user: result['user'] as Map<String, dynamic>?,
      ));
      return accessToken.isNotEmpty;
    } catch (e) {
      state = AsyncData(AuthState(error: e.toString()));
      return false;
    }
  }

  /// Send OTP for verification.
  Future<bool> sendOtp(String phone) async {
    try {
      final service = ref.read(authServiceProvider);
      await service.sendOtp(phone);
      return true;
    } catch (e) {
      state = AsyncData(state.value?.copyWith(error: e.toString()) ??
          AuthState(error: e.toString()));
      return false;
    }
  }

  /// Verify OTP.
  Future<bool> verifyOtp(String phone, String otp) async {
    try {
      final service = ref.read(authServiceProvider);
      await service.verifyOtp(phone: phone, otp: otp);
      return true;
    } catch (e) {
      state = AsyncData(state.value?.copyWith(error: e.toString()) ??
          AuthState(error: e.toString()));
      return false;
    }
  }

  /// Change password.
  Future<bool> changePassword(String current, String newPass) async {
    try {
      final service = ref.read(authServiceProvider);
      await service.changePassword(
        currentPassword: current,
        newPassword: newPass,
      );
      return true;
    } catch (e) {
      state = AsyncData(state.value?.copyWith(error: e.toString()) ??
          AuthState(error: e.toString()));
      return false;
    }
  }

  /// Logout.
  Future<void> logout() async {
    final storage = ref.read(localStorageProvider);
    await storage.clearAll();
    state = const AsyncData(AuthState());
  }
}

final authStateProvider =
    AsyncNotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
