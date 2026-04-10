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
import '../../../shared/providers/theme_provider.dart';

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
    final isDark = context.isDark;
    final maxPhoneLength = _selectedCountry == 0 ? 10 : 14;
    final fieldBg = isDark
        ? AppColors.darkCard.withValues(alpha: 0.96)
        : Colors.white.withValues(alpha: 0.55);
    final borderColor = isDark ? AppColors.darkBorder : Colors.white.withValues(alpha: 0.8);
    final textColor = isDark ? AppColors.darkText : AppColors.lightText;

    return Row(
      children: [
        // Country dropdown
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: fieldBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: borderColor),
          ),
          child: DropdownButton<int>(
            value: _selectedCountry,
            underline: const SizedBox.shrink(),
            iconEnabledColor: textColor,
            dropdownColor: isDark ? AppColors.darkSurface : Colors.white,
            style: TextStyle(fontSize: 14, color: textColor),
            items: List.generate(kCountryList.length, (i) {
              final c = kCountryList[i];
              return DropdownMenuItem<int>(
                value: i,
                child: Text(
                  '${c['flag']} ${c['dial']}',
                  style: TextStyle(fontSize: 14, color: textColor),
                ),
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
      _loadingMessage = 'login.logging_in'.tr();
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
      _loadingMessage = 'register.registering'.tr();
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

  String _fullPhoneFromInput([String? rawPhone]) {
    final national = (rawPhone ?? _phoneController.text)
        .trim()
        .replaceAll(RegExp(r'[^\d]'), '');
    final dial = kCountryList[_selectedCountry]['dial']!.replaceAll('+', '');
    return '$dial$national';
  }

  Future<void> _showForgotPasswordSheet() async {
    final phoneCtrl = TextEditingController(text: _phoneController.text.trim());
    final otpCtrl = TextEditingController();
    final newPassCtrl = TextEditingController();
    final confirmCtrl = TextEditingController();
    bool sendingOtp = false;
    bool resetting = false;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(
            left: AppSpacing.lg,
            right: AppSpacing.lg,
            top: AppSpacing.lg,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + AppSpacing.lg,
          ),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'login.reset_password_title'.tr(),
                  style: context.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  'login.reset_password_subtitle'.tr(),
                  style: context.textTheme.bodySmall?.copyWith(
                    color: context.appColors.textSecondary,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                AppTextField(
                  label: 'login.phone'.tr(),
                  hint: 'login.enter_registered_phone'.tr(),
                  controller: phoneCtrl,
                  keyboardType: TextInputType.phone,
                  prefixIcon: Icons.phone,
                ),
                const SizedBox(height: AppSpacing.md),
                SizedBox(
                  height: 44,
                  child: ElevatedButton.icon(
                    onPressed: sendingOtp
                        ? null
                        : () async {
                            final fullPhone = _fullPhoneFromInput(phoneCtrl.text);
                            if (fullPhone.trim().isEmpty) {
                              if (ctx.mounted) {
                                context.showSnack('login.enter_phone_number'.tr(), isError: true);
                              }
                              return;
                            }
                            setSheetState(() => sendingOtp = true);
                            final ok = await ref
                                .read(authStateProvider.notifier)
                                .sendOtp(fullPhone);
                            if (ctx.mounted) {
                              context.showSnack(
                                ok
                                    ? 'login.otp_sent_success'.tr()
                                    : 'login.otp_send_failed'.tr(),
                                isError: !ok,
                              );
                            }
                            if (ctx.mounted) {
                              setSheetState(() => sendingOtp = false);
                            }
                          },
                    icon: const Icon(Icons.sms_outlined),
                    label: Text(
                      sendingOtp ? 'login.sending'.tr() : 'login.send_otp'.tr(),
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                AppTextField(
                  label: 'login.otp_hint'.tr(),
                  hint: 'login.otp_hint'.tr(),
                  controller: otpCtrl,
                  keyboardType: TextInputType.number,
                  prefixIcon: Icons.password,
                ),
                const SizedBox(height: AppSpacing.md),
                AppTextField(
                  label: 'login.new_password'.tr(),
                  hint: 'login.enter_new_password'.tr(),
                  controller: newPassCtrl,
                  obscureText: true,
                  prefixIcon: Icons.lock_outline,
                ),
                const SizedBox(height: AppSpacing.md),
                AppTextField(
                  label: 'settings.confirm_password'.tr(),
                  hint: 'login.confirm_new_password'.tr(),
                  controller: confirmCtrl,
                  obscureText: true,
                  prefixIcon: Icons.lock,
                ),
                const SizedBox(height: AppSpacing.lg),
                AppButton(
                  label: 'login.reset_password_title'.tr(),
                  icon: Icons.check,
                  isLoading: resetting,
                  onPressed: () async {
                    final fullPhone = _fullPhoneFromInput(phoneCtrl.text);
                    final otp = otpCtrl.text.trim();
                    final pass = newPassCtrl.text.trim();
                    final confirm = confirmCtrl.text.trim();

                    if (fullPhone.isEmpty || otp.isEmpty || pass.isEmpty || confirm.isEmpty) {
                      if (ctx.mounted) {
                        context.showSnack('login.fill_all_fields'.tr(), isError: true);
                      }
                      return;
                    }
                    if (pass != confirm) {
                      if (ctx.mounted) {
                        context.showSnack('Passwords do not match', isError: true);
                      }
                      return;
                    }

                    setSheetState(() => resetting = true);
                    final notifier = ref.read(authStateProvider.notifier);
                    final otpOk = await notifier.verifyOtp(fullPhone, otp);
                    if (!otpOk) {
                      if (ctx.mounted) {
                        setSheetState(() => resetting = false);
                        context.showSnack('login.invalid_otp'.tr(), isError: true);
                      }
                      return;
                    }

                    final ok = await notifier.resetPassword(
                      phone: fullPhone,
                      otp: otp,
                      newPassword: pass,
                    );
                    if (!ctx.mounted) return;
                    setSheetState(() => resetting = false);
                    if (ok) {
                      Navigator.pop(ctx);
                      context.showSnack('login.password_reset_success'.tr());
                    } else {
                      context.showSnack('login.password_reset_failed'.tr(), isError: true);
                    }
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ── UI ────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final themeMode = ref.watch(themeProvider);
    final textColor = isDark ? AppColors.darkText : AppColors.lightText;
    final subColor =
        isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;
    final surface = isDark
        ? AppColors.darkCard.withValues(alpha: 0.96)
        : Colors.white.withValues(alpha: 0.62);
    final borderColor =
        isDark ? AppColors.darkBorder : Colors.white.withValues(alpha: 0.75);

    return Scaffold(
      body: Stack(
        children: [
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: isDark
                    ? const [AppColors.darkBackground, AppColors.darkSurface]
                    : const [AppColors.lightBackground, AppColors.lightSurface],
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
                    onPressed: () => context.go(RoutePaths.languageSelect),
                    icon: const Icon(Icons.arrow_back_rounded),
                    color: textColor,
                    style: IconButton.styleFrom(
                      backgroundColor: surface,
                      side: BorderSide(color: borderColor),
                    ),
                  ),
                ),
                Positioned(
                  top: 8,
                  right: 8,
                  child: IconButton(
                    onPressed: () => ref.read(themeProvider.notifier).toggle(),
                    icon: Icon(
                      themeMode == ThemeMode.dark
                          ? Icons.dark_mode
                          : Icons.light_mode,
                    ),
                    color: textColor,
                    style: IconButton.styleFrom(
                      backgroundColor: surface,
                      side: BorderSide(color: borderColor),
                    ),
                  ),
                ),
                Center(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.xl,
                      vertical: AppSpacing.xl,
                    ),
                    child: Container(
                      width: 360,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 26,
                      ),
                      decoration: BoxDecoration(
                        color: surface,
                        borderRadius: BorderRadius.circular(26),
                        border: Border.all(color: borderColor),
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
                              isDark
                                  ? 'assets/images/logo_light.png'
                                  : 'assets/images/logo.png',
                              width: 180,
                              height: 180,
                              fit: BoxFit.contain,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.sm),
                          AnimatedSwitcher(
                            duration: const Duration(milliseconds: 300),
                            child: Text(
                              _isRegisterMode
                                  ? 'register.title'.tr()
                                  : 'login.title'.tr(),
                              key: ValueKey(_isRegisterMode),
                              textAlign: TextAlign.center,
                              style: context.textTheme.headlineMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: textColor,
                              ),
                            ),
                          ),
                          const SizedBox(height: AppSpacing.sm),
                          AnimatedSwitcher(
                            duration: const Duration(milliseconds: 300),
                            child: Text(
                              _isRegisterMode
                                  ? 'register.subtitle'.tr()
                                  : 'login.subtitle'.tr(),
                              key: ValueKey('sub_$_isRegisterMode'),
                              textAlign: TextAlign.center,
                              style: context.textTheme.bodyMedium?.copyWith(
                                color: subColor,
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
                          if (!_isRegisterMode) ...[
                            const SizedBox(height: AppSpacing.sm),
                            Align(
                              alignment: Alignment.centerRight,
                              child: TextButton(
                                onPressed:
                                    _isLoading ? null : _showForgotPasswordSheet,
                                child: Text(
                                  'login.forgot_password'.tr(),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ),
                          ],
                          const SizedBox(height: AppSpacing.lg),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                _isRegisterMode
                                    ? 'register.already_have_account'.tr()
                                    : 'login.no_account'.tr(),
                                style: context.textTheme.bodyMedium,
                              ),
                              TextButton(
                                onPressed: _isLoading ? null : _toggleMode,
                                child: Text(
                                  _isRegisterMode
                                      ? 'register.login'.tr()
                                      : 'login.register'.tr(),
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
                                color: subColor,
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
          if (_isLoading)
            AbsorbPointer(
              absorbing: true,
              child: LoadingOverlay(message: _loadingMessage),
            ),
        ],
      ),
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
