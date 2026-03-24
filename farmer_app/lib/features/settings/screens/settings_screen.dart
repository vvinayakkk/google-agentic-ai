import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/providers/locale_provider.dart';
import '../../../shared/providers/theme_provider.dart';
import '../../../shared/services/farmer_service.dart';

/// Modern, sectioned settings screen with full functionality.
class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _pushNotifications = true;
  String _backendUrl = '';

  @override
  void initState() {
    super.initState();
    _loadNotificationPref();
    _loadBackendUrl();
  }

  Future<void> _loadNotificationPref() async {
    final prefs = await SharedPreferences.getInstance();
    if (mounted) {
      setState(() {
        _pushNotifications = prefs.getBool('push_notifications') ?? true;
      });
    }
  }

  Future<void> _loadBackendUrl() async {
    final prefs = await SharedPreferences.getInstance();
    if (mounted) {
      setState(() {
        _backendUrl = prefs.getString('backend_url') ?? '';
      });
    }
  }

  Future<void> _showBackendUrlDialog() async {
    final ctrl = TextEditingController(text: _backendUrl);
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.wifi_tethering, color: AppColors.info),
            SizedBox(width: 8),
            Text('Backend Server URL'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Default Android URL is now http://127.0.0.1:8000 for USB phone debugging (run: adb reverse tcp:8000 tcp:8000).\nIf you use emulator, build with --dart-define=ANDROID_NETWORK_MODE=emulator to use http://10.0.2.2:8000, or enter your PC LAN IP (e.g. http://192.168.0.110:8000).',
              style: Theme.of(ctx).textTheme.bodySmall?.copyWith(
                    color: Colors.grey,
                  ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: ctrl,
              keyboardType: TextInputType.url,
              autocorrect: false,
              decoration: const InputDecoration(
                labelText: 'URL',
                hintText: 'http://192.168.x.x:8000',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.link),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, ''),
            child: const Text('Reset to Default', style: TextStyle(color: Colors.orange)),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, ctrl.text.trim()),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (result == null) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('backend_url', result);
    ApiClient.overrideUrl = result.isEmpty ? null : result;
    ref.invalidate(apiClientProvider);
    if (mounted) {
      setState(() => _backendUrl = result);
      context.showSnack(
        result.isEmpty
            ? 'Reset to default URL.'
            : 'Backend URL saved and applied.',
      );
    }
  }

  Future<void> _toggleNotifications(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('push_notifications', value);
    if (mounted) {
      setState(() => _pushNotifications = value);
      context.showSnack(
        value
            ? 'settings.notification_enabled'.tr()
            : 'settings.notification_disabled'.tr(),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeMode = ref.watch(themeProvider);
    final currentLocale = ref.watch(localeProvider);
    final authState = ref.watch(authStateProvider);
    final user = authState.value?.user;
    final userName =
        user?['name'] as String? ?? user?['phone'] as String? ?? 'Farmer';
    final phone = user?['phone'] as String? ?? '';
    final role = user?['role'] as String? ?? 'farmer';

    return Scaffold(
      backgroundColor: context.isDark ? AppColors.darkBackground : AppColors.lightBackground,
      appBar: AppBar(
        backgroundColor: context.isDark ? AppColors.darkSurface : AppColors.lightSurface,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        title: Text('settings.title'.tr()),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: context.isDark
                ? [AppColors.darkBackground, AppColors.darkSurface]
                : [AppColors.lightBackground, AppColors.lightSurface],
          ),
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
            const SizedBox(height: AppSpacing.sm),

            // ── User Card ─────────────────────────────────
            _UserCard(name: userName, phone: phone, role: role),
            const SizedBox(height: AppSpacing.xl),

            // ── 1. Appearance ─────────────────────────────
            _SectionLabel(
              icon: Icons.palette_outlined,
              label: 'settings.appearance'.tr(),
            ),
            const SizedBox(height: AppSpacing.sm),
            _CardContainer(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        themeMode == ThemeMode.dark
                            ? Icons.dark_mode_rounded
                            : themeMode == ThemeMode.light
                                ? Icons.light_mode_rounded
                                : Icons.brightness_auto_rounded,
                        color: AppColors.primary,
                        size: 22,
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Text('Theme',
                            style: context.textTheme.bodyLarge),
                      ),
                      _ThemeModeLabel(mode: themeMode),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Row(
                    children: [
                      _ThemeBubble(
                        label: 'settings.theme_light'.tr(),
                        icon: Icons.light_mode_rounded,
                        isSelected: themeMode == ThemeMode.light,
                        previewColors: const [
                          Color(0xFFF6F7F9),
                          Colors.white,
                        ],
                        onTap: () => ref
                            .read(themeProvider.notifier)
                            .setTheme(ThemeMode.light),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      _ThemeBubble(
                        label: 'settings.theme_dark'.tr(),
                        icon: Icons.dark_mode_rounded,
                        isSelected: themeMode == ThemeMode.dark,
                        previewColors: const [
                          Color(0xFF1A1A1A),
                          Color(0xFF1F2937),
                        ],
                        onTap: () => ref
                            .read(themeProvider.notifier)
                            .setTheme(ThemeMode.dark),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      _ThemeBubble(
                        label: 'settings.theme_system'.tr(),
                        icon: Icons.brightness_auto_rounded,
                        isSelected: themeMode == ThemeMode.system,
                        previewColors: const [
                          Color(0xFFF6F7F9),
                          Color(0xFF1A1A1A),
                        ],
                        onTap: () => ref
                            .read(themeProvider.notifier)
                            .setTheme(ThemeMode.system),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),

            // ── 2. Language ───────────────────────────────
            _SectionLabel(
              icon: Icons.language_rounded,
              label: 'settings.language'.tr(),
            ),
            const SizedBox(height: AppSpacing.sm),
            _CardContainer(
              onTap: () =>
                  _showLanguageSheet(context, ref, currentLocale),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.info.withValues(alpha: 0.1),
                      borderRadius: AppRadius.smAll,
                    ),
                    child: const Icon(Icons.translate_rounded,
                        size: 20, color: AppColors.info),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('settings.language'.tr(),
                            style: context.textTheme.bodyLarge),
                        const SizedBox(height: 2),
                        Text(
                          AppConstants.languageNames[
                                  currentLocale.languageCode] ??
                              currentLocale.languageCode,
                          style: context.textTheme.bodySmall?.copyWith(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(Icons.chevron_right_rounded,
                      size: 22, color: context.appColors.textSecondary),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),

            // ── 3. Account ────────────────────────────────
            _SectionLabel(
              icon: Icons.manage_accounts_outlined,
              label: 'settings.account'.tr(),
            ),
            const SizedBox(height: AppSpacing.sm),
            _CardContainer(
              child: Column(
                children: [
                  _SettingsTile(
                    icon: Icons.lock_outline_rounded,
                    iconColor: AppColors.warning,
                    label: 'settings.change_password'.tr(),
                    onTap: () => _showChangePasswordDialog(context, ref),
                  ),
                  Divider(
                      height: 1,
                      color: context.appColors.border),
                  _SettingsTile(
                    icon: Icons.person_outline_rounded,
                    iconColor: AppColors.primary,
                    label: 'profile.edit'.tr(),
                    onTap: () => context.push(RoutePaths.farmerProfile),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),

            // ── 4. Notifications ──────────────────────────
            _SectionLabel(
              icon: Icons.notifications_outlined,
              label: 'settings.notifications'.tr(),
            ),
            const SizedBox(height: AppSpacing.sm),
            _CardContainer(
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.accent.withValues(alpha: 0.1),
                      borderRadius: AppRadius.smAll,
                    ),
                    child: const Icon(Icons.notifications_active_rounded,
                        size: 20, color: AppColors.accent),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Push Notifications',
                            style: context.textTheme.bodyLarge),
                        const SizedBox(height: 2),
                        Text(
                          _pushNotifications ? 'Enabled' : 'Disabled',
                          style: context.textTheme.bodySmall?.copyWith(
                            color: context.appColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Switch.adaptive(
                    value: _pushNotifications,
                    onChanged: _toggleNotifications,
                    activeThumbColor: AppColors.primary,
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),

            // ── 5. About ─────────────────────────────────
            _SectionLabel(
              icon: Icons.info_outline_rounded,
              label: 'settings.about'.tr(),
            ),
            const SizedBox(height: AppSpacing.sm),
            _CardContainer(
              child: Column(
                children: [
                  _SettingsTile(
                    icon: Icons.info_outline_rounded,
                    iconColor: AppColors.info,
                    label: 'settings.version'.tr(),
                    trailing: Text(
                      '2.0.0',
                      style: context.textTheme.bodySmall?.copyWith(
                        color: context.appColors.textSecondary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  Divider(
                      height: 1,
                      color: context.appColors.border),
                  _SettingsTile(
                    icon: Icons.privacy_tip_outlined,
                    iconColor: AppColors.primary,
                    label: 'settings.privacy'.tr(),
                    onTap: () => _launchUrl(
                        'https://kisankiawaz.com/privacy-policy'),
                  ),
                  Divider(
                      height: 1,
                      color: context.appColors.border),
                  _SettingsTile(
                    icon: Icons.help_outline_rounded,
                    iconColor: AppColors.success,
                    label: 'settings.help_support'.tr(),
                    onTap: () => context.push(
                        '${RoutePaths.chat}?agent=support'),
                  ),
                  Divider(
                      height: 1,
                      color: context.appColors.border),
                  _SettingsTile(
                    icon: Icons.star_outline_rounded,
                    iconColor: AppColors.warning,
                    label: 'settings.rate_app'.tr(),
                    onTap: () => _launchUrl(
                        'https://play.google.com/store/apps/details?id=com.kisankiawaz.app'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),

            // ── Developer ────────────────────────────────
            _SectionLabel(
              icon: Icons.developer_mode_rounded,
              label: 'Developer',
              color: AppColors.info,
            ),
            const SizedBox(height: AppSpacing.sm),
            _CardContainer(
              child: _SettingsTile(
                icon: Icons.wifi_tethering,
                iconColor: AppColors.info,
                label: 'Backend Server URL',
                trailing: Flexible(
                  child: Text(
                    _backendUrl.isEmpty ? 'Auto (set from device/network)' : _backendUrl,
                    style: context.textTheme.bodySmall?.copyWith(
                      color: context.appColors.textSecondary,
                    ),
                    overflow: TextOverflow.ellipsis,
                    maxLines: 1,
                  ),
                ),
                onTap: () => _showBackendUrlDialog(),
              ),
            ),
            const SizedBox(height: AppSpacing.xl),

            // ── 6. Danger Zone ────────────────────────────
            _SectionLabel(
              icon: Icons.warning_amber_rounded,
              label: 'Danger Zone',
              color: AppColors.danger,
            ),
            const SizedBox(height: AppSpacing.sm),
            _CardContainer(
              borderColor: AppColors.danger.withValues(alpha: 0.3),
              child: Column(
                children: [
                  _SettingsTile(
                    icon: Icons.delete_forever_rounded,
                    iconColor: AppColors.danger,
                    label: 'Delete Profile',
                    labelColor: AppColors.danger,
                    onTap: () => _confirmDeleteProfile(context, ref),
                  ),
                  Divider(
                      height: 1,
                      color: AppColors.danger.withValues(alpha: 0.15)),
                  _SettingsTile(
                    icon: Icons.logout_rounded,
                    iconColor: AppColors.danger,
                    label: 'settings.logout'.tr(),
                    labelColor: AppColors.danger,
                    onTap: () => _confirmLogout(context, ref),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xxxl),
            ],
          ),
        ),
      ),
    );
  }

  // ── Helpers ────────────────────────────────────────────

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _showLanguageSheet(
      BuildContext context, WidgetRef ref, Locale current) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      isScrollControlled: true,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: AppSpacing.allLg,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: context.appColors.border,
                    borderRadius: AppRadius.fullAll,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text(
                'language_select.title'.tr(),
                style: context.textTheme.titleLarge
                    ?.copyWith(fontWeight: FontWeight.bold),
              ),
              Text(
                'language_select.subtitle'.tr(),
                style: context.textTheme.bodyMedium?.copyWith(
                  color: context.appColors.textSecondary,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              ...AppConstants.supportedLocales.map((code) {
                final isSelected = code == current.languageCode;
                return Container(
                  margin: const EdgeInsets.only(bottom: 4),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppColors.primary.withValues(alpha: 0.08)
                        : Colors.transparent,
                    borderRadius: AppRadius.smAll,
                  ),
                  child: ListTile(
                    leading: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: isSelected
                              ? AppColors.primary
                              : context.appColors.textSecondary,
                          width: 2,
                        ),
                        color: isSelected
                            ? AppColors.primary
                            : Colors.transparent,
                      ),
                      child: isSelected
                          ? const Icon(Icons.check,
                              size: 14, color: Colors.white)
                          : null,
                    ),
                    title: Text(
                      AppConstants.languageNames[code] ?? code,
                      style: context.textTheme.bodyLarge?.copyWith(
                        fontWeight: isSelected
                            ? FontWeight.w600
                            : FontWeight.normal,
                        color: isSelected ? AppColors.primary : null,
                      ),
                    ),
                    trailing: isSelected
                        ? const Icon(Icons.check_circle_rounded,
                            color: AppColors.primary, size: 20)
                        : null,
                    shape: RoundedRectangleBorder(
                        borderRadius: AppRadius.smAll),
                    onTap: () {
                      ref
                          .read(localeProvider.notifier)
                          .setLocale(context, code);
                      Navigator.pop(ctx);
                    },
                  ),
                );
              }),
              const SizedBox(height: AppSpacing.lg),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _showChangePasswordDialog(
      BuildContext context, WidgetRef ref) async {
    final currentCtrl = TextEditingController();
    final newCtrl = TextEditingController();
    final confirmCtrl = TextEditingController();
    final formKey = GlobalKey<FormState>();
    bool isLoading = false;
    bool showCurrent = false;
    bool showNew = false;

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: AppRadius.lgAll),
          title: Row(
            children: [
              const Icon(Icons.lock_outline_rounded,
                  color: AppColors.primary, size: 22),
              const SizedBox(width: AppSpacing.sm),
              Text('settings.change_password'.tr(),
                  style: ctx.textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.bold)),
            ],
          ),
          content: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: currentCtrl,
                  obscureText: !showCurrent,
                  decoration: InputDecoration(
                    labelText: 'settings.current_password'.tr(),
                    hintText: 'settings.current_password_hint'.tr(),
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      icon: Icon(showCurrent
                          ? Icons.visibility_off
                          : Icons.visibility),
                      onPressed: () =>
                          setDialogState(() => showCurrent = !showCurrent),
                    ),
                  ),
                  validator: (v) =>
                      (v == null || v.isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: AppSpacing.lg),
                TextFormField(
                  controller: newCtrl,
                  obscureText: !showNew,
                  decoration: InputDecoration(
                    labelText: 'settings.new_password'.tr(),
                    hintText: 'settings.new_password_hint'.tr(),
                    prefixIcon: const Icon(Icons.lock_rounded),
                    suffixIcon: IconButton(
                      icon: Icon(showNew
                          ? Icons.visibility_off
                          : Icons.visibility),
                      onPressed: () =>
                          setDialogState(() => showNew = !showNew),
                    ),
                  ),
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Required';
                    if (v.length < 6) return 'Min 6 characters';
                    return null;
                  },
                ),
                const SizedBox(height: AppSpacing.lg),
                TextFormField(
                  controller: confirmCtrl,
                  obscureText: !showNew,
                  decoration: InputDecoration(
                    labelText: 'settings.confirm_password'.tr(),
                    hintText: 'settings.confirm_password_hint'.tr(),
                    prefixIcon: const Icon(Icons.lock_rounded),
                  ),
                  validator: (v) {
                    if (v != newCtrl.text) {
                      return 'settings.password_mismatch'.tr();
                    }
                    return null;
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: isLoading ? null : () => Navigator.pop(ctx),
              child: Text('settings.cancel'.tr()),
            ),
            FilledButton(
              onPressed: isLoading
                  ? null
                  : () async {
                      if (!(formKey.currentState?.validate() ?? false)) {
                        return;
                      }
                      setDialogState(() => isLoading = true);
                      try {
                        final success = await ref
                            .read(authStateProvider.notifier)
                            .changePassword(
                              currentCtrl.text,
                              newCtrl.text,
                            );
                        if (ctx.mounted) Navigator.pop(ctx);
                        if (context.mounted) {
                          context.showSnack(success
                              ? 'settings.password_changed'.tr()
                              : 'settings.password_error'.tr(),
                              isError: !success);
                        }
                      } catch (e) {
                        setDialogState(() => isLoading = false);
                        if (context.mounted) {
                          context.showSnack(e.toString(), isError: true);
                        }
                      }
                    },
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
              ),
              child: isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Text('settings.confirm'.tr()),
            ),
          ],
        ),
      ),
    );
    currentCtrl.dispose();
    newCtrl.dispose();
    confirmCtrl.dispose();
  }

  Future<void> _confirmDeleteProfile(
      BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: AppRadius.lgAll),
        title: Row(
          children: [
            const Icon(Icons.warning_amber_rounded,
                color: AppColors.danger, size: 24),
            const SizedBox(width: AppSpacing.sm),
            Text('Delete Profile',
                style: ctx.textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold)),
          ],
        ),
        content: const Text(
            'This will permanently delete your farmer profile data. Your account will remain active but all farm data will be lost.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('settings.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.danger),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;

    try {
      await ref.read(farmerServiceProvider).deleteProfile();
      if (context.mounted) {
        context.showSnack('Profile deleted successfully');
      }
    } catch (e) {
      if (context.mounted) {
        context.showSnack(e.toString(), isError: true);
      }
    }
  }

  Future<void> _confirmLogout(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: AppRadius.lgAll),
        title: Text('settings.logout'.tr()),
        content: Text('settings.logout_confirm'.tr()),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('settings.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.danger),
            child: Text('settings.logout'.tr()),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await ref.read(authStateProvider.notifier).logout();
    if (context.mounted) context.go(RoutePaths.login);
  }
}

// ═══════════════════════════════════════════════════════════════
// Private Widgets
// ═══════════════════════════════════════════════════════════════

class _UserCard extends StatelessWidget {
  final String name;
  final String phone;
  final String role;

  const _UserCard({
    required this.name,
    required this.phone,
    required this.role,
  });

  String _initials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: AppSpacing.allLg,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primary.withValues(alpha: 0.08),
            AppColors.primaryLight.withValues(alpha: 0.04),
          ],
        ),
        borderRadius: AppRadius.lgAll,
        border: Border.all(
            color: AppColors.primary.withValues(alpha: 0.15)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 28,
            backgroundColor: AppColors.primary.withValues(alpha: 0.15),
            child: Text(
              _initials(name),
              style: context.textTheme.titleMedium?.copyWith(
                color: AppColors.primary,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.lg),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: context.textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 2),
                Text(
                  phone,
                  style: context.textTheme.bodySmall?.copyWith(
                    color: context.appColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: AppRadius.fullAll,
            ),
            child: Text(
              role == 'admin' ? 'Admin' : 'Farmer',
              style: context.textTheme.labelSmall?.copyWith(
                color: AppColors.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color? color;

  const _SectionLabel({
    required this.icon,
    required this.label,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final c = color ?? AppColors.primary;
    return Row(
      children: [
        Icon(icon, size: 18, color: c),
        const SizedBox(width: AppSpacing.sm),
        Text(
          label,
          style: context.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.bold,
            color: c,
            letterSpacing: 0.3,
          ),
        ),
      ],
    );
  }
}

class _CardContainer extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;
  final Color? borderColor;

  const _CardContainer({
    required this.child,
    this.onTap,
    this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    final container = Container(
      width: double.infinity,
      padding: AppSpacing.allLg,
      decoration: BoxDecoration(
        color: context.appColors.card,
        borderRadius: AppRadius.mdAll,
        border: Border.all(
          color: borderColor ?? context.appColors.border,
          width: 0.5,
        ),
      ),
      child: child,
    );

    if (onTap == null) return container;
    return GestureDetector(onTap: onTap, child: container);
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label;
  final Color? labelColor;
  final Widget? trailing;
  final VoidCallback? onTap;

  const _SettingsTile({
    required this.icon,
    required this.iconColor,
    required this.label,
    this.labelColor,
    this.trailing,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: AppRadius.smAll,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.1),
                borderRadius: AppRadius.smAll,
              ),
              child: Icon(icon, size: 20, color: iconColor),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Text(
                label,
                style: context.textTheme.bodyLarge?.copyWith(
                  color: labelColor,
                ),
              ),
            ),
            trailing ??
                (onTap != null
                    ? Icon(Icons.chevron_right_rounded,
                        size: 22, color: context.appColors.textSecondary)
                    : const SizedBox.shrink()),
          ],
        ),
      ),
    );
  }
}

class _ThemeBubble extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isSelected;
  final List<Color> previewColors;
  final VoidCallback onTap;

  const _ThemeBubble({
    required this.label,
    required this.icon,
    required this.isSelected,
    required this.previewColors,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
          decoration: BoxDecoration(
            color: isSelected
                ? AppColors.primary.withValues(alpha: 0.1)
                : context.appColors.card,
            borderRadius: AppRadius.mdAll,
            border: Border.all(
              color: isSelected
                  ? AppColors.primary
                  : context.appColors.border,
              width: isSelected ? 2 : 0.5,
            ),
          ),
          child: Column(
            children: [
              // Preview bubble
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: previewColors,
                  ),
                  border: Border.all(
                    color: context.appColors.border,
                    width: 1,
                  ),
                ),
                child: Icon(icon,
                    size: 16,
                    color: isSelected
                        ? AppColors.primary
                        : context.appColors.textSecondary),
              ),
              const SizedBox(height: 6),
              Text(
                label,
                style: context.textTheme.labelSmall?.copyWith(
                  color: isSelected
                      ? AppColors.primary
                      : context.appColors.textSecondary,
                  fontWeight:
                      isSelected ? FontWeight.w700 : FontWeight.normal,
                ),
                textAlign: TextAlign.center,
              ),
              if (isSelected) ...[
                const SizedBox(height: 4),
                Container(
                  width: 6,
                  height: 6,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _ThemeModeLabel extends StatelessWidget {
  final ThemeMode mode;

  const _ThemeModeLabel({required this.mode});

  @override
  Widget build(BuildContext context) {
    final label = switch (mode) {
      ThemeMode.light => 'settings.theme_light'.tr(),
      ThemeMode.dark => 'settings.theme_dark'.tr(),
      _ => 'settings.theme_system'.tr(),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.08),
        borderRadius: AppRadius.fullAll,
      ),
      child: Text(
        label,
        style: context.textTheme.labelSmall?.copyWith(
          color: AppColors.primary,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
