import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../core/utils/validators.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../core/data/country_codes.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/loading_overlay.dart';

/// Login / Register screen with phone + password authentication.
///
/// Toggle between login and register modes via [AnimatedSwitcher].
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _isRegisterMode = false;
  bool _isLoading = false;
  String? _loadingMessage;
  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  // Use centralized country list
  int _selectedCountry = 0;

  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  String? _phoneValidator(String? value) {
    final v = value?.replaceAll(RegExp(r'[^\d]'), '') ?? '';
    if (v.isEmpty) return 'login.phone_required'.tr();
    // For India, prefer 10-digit starting with 6-9
    final dial = kCountryList[_selectedCountry]['dial'];
    if (dial == '+91') {
      if (v.length == 10 && RegExp(r'^[6-9]').hasMatch(v)) return null;
      return 'login.invalid_phone'.tr();
    }
    // Generic check: reasonable length
    if (v.length < 7 || v.length > 14) return 'login.invalid_phone'.tr();
    return null;
  }

  Widget _phoneInput({required TextEditingController controller, required String label, String? hint}) {
    final maxPhoneLength = _selectedCountry == 0 ? 10 : 14;

    return Row(
      children: [
        // Country dropdown
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.55),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white.withValues(alpha: 0.8)),
          ),
          child: DropdownButton<int>(
            value: _selectedCountry,
            underline: const SizedBox.shrink(),
            iconEnabledColor: AppColors.lightText,
            dropdownColor: Colors.white,
            style: const TextStyle(fontSize: 14, color: AppColors.lightText),
            items: List.generate(kCountryList.length, (i) {
              final c = kCountryList[i];
              return DropdownMenuItem<int>(
                value: i,
                child: Text('${c['flag']} ${c['dial']}', style: const TextStyle(fontSize: 14)),
              );
            }),
            onChanged: _isLoading ? null : (v) => setState(() => _selectedCountry = v ?? 0),
          ),
        ),
        const SizedBox(width: 8),
        // Phone input
        Expanded(
          child: AppTextField(
            label: label,
            hint: hint ?? (maxPhoneLength == 10 ? 'XXXXXXXXXX' : 'XXXXXXXXXXXXXX'),
            controller: controller,
            keyboardType: TextInputType.phone,
            prefixIcon: null,
            validator: _phoneValidator,
            maxLength: maxPhoneLength,
            enabled: !_isLoading,
          ),
        ),
      ],
    );
  }

  // ── Actions ───────────────────────────────────────────

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _loadingMessage = 'Logging you in\u2026';
    });

    try {
      final national = _phoneController.text.trim().replaceAll(RegExp(r'[^\d]'), '');
      final dial = kCountryList[_selectedCountry]['dial']!.replaceAll('+', '');
      final fullPhone = '$dial$national';

      final success = await ref.read(authStateProvider.notifier).login(
            fullPhone,
            _passwordController.text.trim(),
          );

      if (success && mounted) {
        context.go(RoutePaths.fetchingLocation);
      } else {
        final authState = ref.read(authStateProvider);
        final error = authState.value?.error;
        if (mounted) {
          context.showSnack(
            error ?? 'login.invalid_credentials'.tr(),
            isError: true,
          );
        }
      }
    } catch (e) {
      if (mounted) {
        context.showSnack(e.toString(), isError: true);
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _loadingMessage = null;
        });
      }
    }
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;

    if (_passwordController.text != _confirmPasswordController.text) {
      context.showSnack('register.password_mismatch'.tr(), isError: true);
      return;
    }

    setState(() {
      _isLoading = true;
      _loadingMessage = 'Creating your account\u2026';
    });

    try {
      final national = _phoneController.text.trim().replaceAll(RegExp(r'[^\d]'), '');
      final dial = kCountryList[_selectedCountry]['dial']!.replaceAll('+', '');
      final fullPhone = '$dial$national';

      final success = await ref.read(authStateProvider.notifier).register(
        phone: fullPhone,
        password: _passwordController.text.trim(),
        name: _nameController.text.trim(),
          );

      if (success && mounted) {
        context.showSnack('register.success'.tr());
        context.go(RoutePaths.fetchingLocation);
      } else {
        final authState = ref.read(authStateProvider);
        final error = authState.value?.error;
        if (mounted) {
          context.showSnack(error ?? 'common.error_occurred'.tr(),
              isError: true);
        }
      }
    } catch (e) {
      if (mounted) {
        context.showSnack(e.toString(), isError: true);
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _loadingMessage = null;
        });
      }
    }
  }

  void _toggleMode() {
    setState(() {
      _isRegisterMode = !_isRegisterMode;
      _formKey.currentState?.reset();
    });
  }

  // ── UI ────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    // Force this screen to use a light theme regardless of global theme.
    return Theme(
      data: Theme.of(context).copyWith(
        brightness: Brightness.light,
        scaffoldBackgroundColor: AppColors.lightBackground,
        colorScheme: Theme.of(context).colorScheme.copyWith(
          primary: AppColors.primary,
          surface: AppColors.lightSurface,
          onSurface: AppColors.lightText,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white.withValues(alpha: 0.55),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.8)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.8)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: AppColors.primary, width: 2),
          ),
          hintStyle: const TextStyle(color: AppColors.lightTextSecondary),
          labelStyle: const TextStyle(color: AppColors.lightTextSecondary),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.white.withValues(alpha: 0.88),
            foregroundColor: AppColors.lightText,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(40)),
            textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(foregroundColor: AppColors.primaryDark),
        ),
      ),
      child: Builder(builder: (context) {
        return Scaffold(
          body: Stack(
            children: [
              Container(
                width: double.infinity,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [AppColors.lightBackground, AppColors.lightSurface],
                  ),
                ),
              ),

              SafeArea(
                child: Stack(
                  children: [
                    Positioned(
                      top: 8,
                      left: 8,
                      child: IconButton(
                        onPressed: () {
                          context.go(RoutePaths.languageSelect);
                        },
                        icon: const Icon(Icons.arrow_back_rounded),
                        color: AppColors.lightText,
                        style: IconButton.styleFrom(
                          backgroundColor: Colors.white.withValues(alpha: 0.45),
                          side: BorderSide(color: Colors.white.withValues(alpha: 0.75)),
                        ),
                      ),
                    ),
                    Center(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl, vertical: AppSpacing.xl),
                        child: Container(
                          width: 360,
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 26),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [AppColors.lightBackground, AppColors.lightSurface],
                            ),
                            borderRadius: BorderRadius.circular(26),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.75)),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.primaryDark.withValues(alpha: 0.12),
                                blurRadius: 30,
                                spreadRadius: 1,
                              ),
                            ],
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Center(
                                child: Image.asset(
                                  'assets/images/logo.png',
                                  width: 180,
                                  height: 180,
                                  fit: BoxFit.contain,
                                ),
                              ),
                              const SizedBox(height: AppSpacing.sm),

                              AnimatedSwitcher(
                                duration: const Duration(milliseconds: 300),
                                child: Text(
                                  _isRegisterMode ? 'register.title'.tr() : 'login.title'.tr(),
                                  key: ValueKey(_isRegisterMode),
                                  textAlign: TextAlign.center,
                                  style: context.textTheme.headlineMedium?.copyWith(
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.lightText,
                                  ),
                                ),
                              ),
                              const SizedBox(height: AppSpacing.sm),

                              AnimatedSwitcher(
                                duration: const Duration(milliseconds: 300),
                                child: Text(
                                  _isRegisterMode ? 'register.subtitle'.tr() : 'login.subtitle'.tr(),
                                  key: ValueKey('sub_$_isRegisterMode'),
                                  textAlign: TextAlign.center,
                                  style: context.textTheme.bodyMedium?.copyWith(
                                    color: AppColors.lightTextSecondary,
                                  ),
                                ),
                              ),
                              const SizedBox(height: AppSpacing.xxl),

                              Form(
                                key: _formKey,
                                child: AnimatedSwitcher(
                                  duration: const Duration(milliseconds: 350),
                                  switchInCurve: Curves.easeInOut,
                                  switchOutCurve: Curves.easeInOut,
                                  transitionBuilder: (child, animation) => FadeTransition(
                                    opacity: animation,
                                    child: SizeTransition(
                                      sizeFactor: animation,
                                      child: child,
                                    ),
                                  ),
                                  child: _isRegisterMode
                                      ? _registerFields(key: const ValueKey('register'))
                                      : _loginFields(key: const ValueKey('login')),
                                ),
                              ),

                              const SizedBox(height: AppSpacing.lg),

                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    _isRegisterMode ? 'register.already_have_account'.tr() : 'login.no_account'.tr(),
                                    style: context.textTheme.bodyMedium,
                                  ),
                                  TextButton(
                                    onPressed: _isLoading ? null : _toggleMode,
                                    child: Text(
                                      _isRegisterMode ? 'register.login'.tr() : 'login.register'.tr(),
                                      style: const TextStyle(
                                        color: AppColors.primary,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                ],
                              ),

                              if (_isRegisterMode) ...[
                                const SizedBox(height: AppSpacing.sm),
                                Text(
                                  'register.terms'.tr(),
                                  textAlign: TextAlign.center,
                                  style: context.textTheme.bodySmall?.copyWith(
                                    color: AppColors.lightTextSecondary,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // ── Full-screen loading overlay ──────────────────
              if (_isLoading)
                AbsorbPointer(
                  absorbing: true,
                  child: LoadingOverlay(
                    message: _loadingMessage,
                  ),
                ),
            ],
          ),
        );
      }),
    );
  }

  // ── Login fields ──────────────────────────────────────

  Widget _loginFields({Key? key}) {
    return Column(
      key: key,
      children: [
        _phoneInput(
          controller: _phoneController,
          label: 'login.phone'.tr(),
          hint: 'login.phone_hint'.tr(),
        ),
        const SizedBox(height: AppSpacing.lg),
        AppTextField(
          label: 'login.password'.tr(),
          hint: '••••••••',
          controller: _passwordController,
          obscureText: _obscurePassword,
          prefixIcon: Icons.lock_outline,
          suffix: IconButton(
            icon: Icon(
              _obscurePassword ? Icons.visibility_off : Icons.visibility,
              color: context.appColors.textSecondary,
            ),
            onPressed: _isLoading ? null : () => setState(() => _obscurePassword = !_obscurePassword),
          ),
          validator: (v) => Validators.required(v, 'login.password'.tr()),
          enabled: !_isLoading,
        ),
        const SizedBox(height: AppSpacing.xl),
        AppButton(
          label: 'login.button'.tr(),
          isLoading: _isLoading,
          onPressed: _isLoading ? null : _handleLogin,
        ),
      ],
    );
  }

  // ── Register fields ───────────────────────────────────

  Widget _registerFields({Key? key}) {
    return Column(
      key: key,
      children: [
        AppTextField(
          label: 'register.full_name'.tr(),
          hint: 'register.full_name_hint'.tr(),
          controller: _nameController,
          prefixIcon: Icons.person_outline,
          validator: (v) => Validators.required(v, 'register.full_name'.tr()),
          enabled: !_isLoading,
        ),
        const SizedBox(height: AppSpacing.lg),
        _phoneInput(
          controller: _phoneController,
          label: 'register.phone'.tr(),
          hint: 'register.phone_hint'.tr(),
        ),
        const SizedBox(height: AppSpacing.lg),
        AppTextField(
          label: 'register.password'.tr(),
          hint: 'register.password_hint'.tr(),
          controller: _passwordController,
          obscureText: _obscurePassword,
          prefixIcon: Icons.lock_outline,
          suffix: IconButton(
            icon: Icon(
              _obscurePassword ? Icons.visibility_off : Icons.visibility,
              color: context.appColors.textSecondary,
            ),
            onPressed: _isLoading ? null : () => setState(() => _obscurePassword = !_obscurePassword),
          ),
          validator: (v) => Validators.required(v, 'register.password'.tr()),
          enabled: !_isLoading,
        ),
        const SizedBox(height: AppSpacing.lg),
        AppTextField(
          label: 'register.confirm_password'.tr(),
          hint: 'register.confirm_password_hint'.tr(),
          controller: _confirmPasswordController,
          obscureText: _obscureConfirm,
          prefixIcon: Icons.lock_outline,
          suffix: IconButton(
            icon: Icon(
              _obscureConfirm ? Icons.visibility_off : Icons.visibility,
              color: context.appColors.textSecondary,
            ),
            onPressed: _isLoading ? null : () => setState(() => _obscureConfirm = !_obscureConfirm),
          ),
          validator: (v) {
            if (v == null || v.isEmpty) {
              return 'register.confirm_password'.tr();
            }
            if (v != _passwordController.text) {
              return 'register.password_mismatch'.tr();
            }
            return null;
          },
          enabled: !_isLoading,
        ),
        const SizedBox(height: AppSpacing.xl),
        AppButton(
          label: 'register.button'.tr(),
          isLoading: _isLoading,
          onPressed: _isLoading ? null : _handleRegister,
        ),
      ],
    );
  }
}
