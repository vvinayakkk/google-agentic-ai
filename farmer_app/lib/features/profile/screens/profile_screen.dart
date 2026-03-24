import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/farmer_profile_model.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/services/crop_service.dart';
import '../../../shared/services/farmer_service.dart';
import '../../../shared/services/livestock_service.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_overlay.dart';

/// Modern profile overview with gradient header, live stats, and action grid.
class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen>
    with SingleTickerProviderStateMixin {
  FarmerProfile? _profile;
  int _cropsCount = 0;
  int _livestockCount = 0;
  bool _isLoading = true;
  String? _error;
  late final AnimationController _animCtrl;
  late final Animation<double> _fadeIn;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _fadeIn = CurvedAnimation(parent: _animCtrl, curve: Curves.easeOut);
    _loadAll();
  }

  @override
  void dispose() {
    _animCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        ref.read(farmerServiceProvider).getMyProfile().catchError((_) => <String, dynamic>{}),
        ref.read(farmerServiceProvider).getDashboard().catchError((_) => <String, dynamic>{}),
        ref.read(cropServiceProvider).listCrops().catchError((_) => <Map<String, dynamic>>[]),
        ref.read(livestockServiceProvider).listLivestock().catchError((_) => <Map<String, dynamic>>[]),
      ]);

      final profileData = results[0] as Map<String, dynamic>;
      final crops = results[2] as List<Map<String, dynamic>>;
      final livestock = results[3] as List<Map<String, dynamic>>;

      if (profileData.isNotEmpty) {
        _profile = FarmerProfile.fromJson(profileData);
      }
      _cropsCount = crops.length;
      _livestockCount = livestock.length;
      _animCtrl.forward();
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _initials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }

  Future<void> _logout() async {
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
    if (confirmed != true || !mounted) return;
    await ref.read(authStateProvider.notifier).logout();
    if (mounted) context.go(RoutePaths.login);
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final user = authState.value?.user;
    final userName = _profile?.name ??
        user?['name'] as String? ??
        user?['phone'] as String? ??
        'Farmer';
    final phone = _profile?.phone ?? user?['phone'] as String? ?? '';
    final role = user?['role'] as String? ?? 'farmer';

    return Scaffold(
      backgroundColor: context.isDark ? AppColors.darkBackground : AppColors.lightBackground,
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
        child: _isLoading
            ? const Center(child: LoadingState(itemCount: 4))
            : _error != null
                ? ErrorView(message: _error!, onRetry: _loadAll)
                : FadeTransition(
                    opacity: _fadeIn,
                    child: RefreshIndicator(
                      onRefresh: _loadAll,
                      color: AppColors.primary,
                      child: CustomScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      slivers: [
                        // ── Gradient Header ────────────────────
                        SliverToBoxAdapter(
                          child: _GradientHeader(
                            name: userName,
                            phone: phone,
                            role: role,
                            initials: _initials(userName),
                          ),
                        ),

                        // ── Stats Row ──────────────────────────
                        SliverPadding(
                          padding: const EdgeInsets.fromLTRB(
                              AppSpacing.lg, AppSpacing.lg, AppSpacing.lg, 0),
                          sliver: SliverToBoxAdapter(
                            child: Row(
                              children: [
                                Expanded(
                                  child: _StatTile(
                                    icon: Icons.grass_rounded,
                                    label: 'profile.crops'.tr(),
                                    value: '$_cropsCount',
                                    color: AppColors.success,
                                  ),
                                ),
                                const SizedBox(width: AppSpacing.md),
                                Expanded(
                                  child: _StatTile(
                                    icon: Icons.pets_rounded,
                                    label: 'Livestock',
                                    value: '$_livestockCount',
                                    color: AppColors.warning,
                                  ),
                                ),
                                const SizedBox(width: AppSpacing.md),
                                Expanded(
                                  child: _StatTile(
                                    icon: Icons.landscape_rounded,
                                    label: 'profile.land'.tr(),
                                    value:
                                        _profile?.landSize?.toStringAsFixed(1) ?? '0',
                                    suffix: 'profile.acres'.tr(),
                                    color: AppColors.info,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),

                        // ── Section: Quick Actions ─────────────
                        SliverPadding(
                          padding: const EdgeInsets.fromLTRB(
                              AppSpacing.lg, AppSpacing.xl, AppSpacing.lg, AppSpacing.sm),
                          sliver: SliverToBoxAdapter(
                            child: Text(
                              'home.quick_actions'.tr(),
                              style: context.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),

                        // ── Action Grid ────────────────────────
                        SliverPadding(
                          padding: AppSpacing.hLg,
                          sliver: SliverGrid.count(
                            crossAxisCount: 2,
                            mainAxisSpacing: AppSpacing.md,
                            crossAxisSpacing: AppSpacing.md,
                            childAspectRatio: 1.65,
                            children: [
                              _ActionCard(
                                icon: Icons.person_outline_rounded,
                                label: 'farmer_profile.title'.tr(),
                                color: AppColors.primary,
                                onTap: () =>
                                    context.push(RoutePaths.farmerProfile),
                              ),
                              _ActionCard(
                                icon: Icons.grass_rounded,
                                label: 'features.crop_cycle'.tr(),
                                color: AppColors.success,
                                badge: _cropsCount > 0 ? '$_cropsCount' : null,
                                onTap: () =>
                                    context.push(RoutePaths.cropCycle),
                              ),
                              _ActionCard(
                                icon: Icons.pets_rounded,
                                label: 'features.cattle'.tr(),
                                color: AppColors.warning,
                                badge: _livestockCount > 0
                                    ? '$_livestockCount'
                                    : null,
                                onTap: () =>
                                    context.push(RoutePaths.cattle),
                              ),
                              _ActionCard(
                                icon: Icons.handyman_rounded,
                                label: 'features.equipment'.tr(),
                                color: AppColors.info,
                                onTap: () =>
                                    context.push(RoutePaths.rental),
                              ),
                              _ActionCard(
                                icon: Icons.calendar_month_rounded,
                                label: 'features.my_bookings'.tr(),
                                color: AppColors.accent,
                                onTap: () =>
                                    context.push(RoutePaths.myBookings),
                              ),
                              _ActionCard(
                                icon: Icons.account_balance_wallet_rounded,
                                label: 'features.earnings'.tr(),
                                color: const Color(0xFFE91E63),
                                onTap: () =>
                                    context.push(RoutePaths.earnings),
                              ),
                            ],
                          ),
                        ),

                        // ── Logout ─────────────────────────────
                        SliverPadding(
                          padding: const EdgeInsets.fromLTRB(
                              AppSpacing.lg, AppSpacing.xxl, AppSpacing.lg, AppSpacing.xxxl),
                          sliver: SliverToBoxAdapter(
                            child: OutlinedButton.icon(
                              onPressed: _logout,
                              icon: const Icon(Icons.logout_rounded,
                                  color: AppColors.danger),
                              label: Text(
                                'settings.logout'.tr(),
                                style: const TextStyle(color: AppColors.danger),
                              ),
                              style: OutlinedButton.styleFrom(
                                side:
                                    const BorderSide(color: AppColors.danger),
                                minimumSize:
                                    const Size(double.infinity, 52),
                                shape: RoundedRectangleBorder(
                                    borderRadius: AppRadius.mdAll),
                              ),
                            ),
                          ),
                        ),
                      ],
                      ),
                    ),
                  ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// Private Widgets
// ═══════════════════════════════════════════════════════════════

class _GradientHeader extends StatelessWidget {
  final String name;
  final String phone;
  final String role;
  final String initials;

  const _GradientHeader({
    required this.name,
    required this.phone,
    required this.role,
    required this.initials,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? [
                  AppColors.primaryDark.withValues(alpha: 0.85),
                  const Color(0xFF064E3B),
                ]
              : [
                  AppColors.primary,
                  AppColors.primaryLight,
                ],
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
              AppSpacing.xl, AppSpacing.lg, AppSpacing.xl, AppSpacing.xxl),
          child: Column(
            children: [
              // Back button row
              Row(
                children: [
                  GestureDetector(
                    onTap: () => context.pop(),
                    child: const Icon(Icons.arrow_back_rounded,
                        color: Colors.white, size: 24),
                  ),
                  const Spacer(),
                  Text(
                    'profile.title'.tr(),
                    style: context.textTheme.titleLarge?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  GestureDetector(
                    onTap: () => context.push(RoutePaths.settings),
                    child: const Icon(Icons.settings_outlined,
                        color: Colors.white, size: 24),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xl),

              // Avatar
              Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white30, width: 3),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.15),
                      blurRadius: 20,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: CircleAvatar(
                  radius: 44,
                  backgroundColor: Colors.white.withValues(alpha: 0.2),
                  child: Text(
                    initials,
                    style: context.textTheme.headlineMedium?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.5,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),

              // Name
              Text(
                name,
                style: context.textTheme.headlineSmall?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: AppSpacing.xs),

              // Phone
              if (phone.isNotEmpty)
                Text(
                  phone,
                  style: context.textTheme.bodyMedium?.copyWith(
                    color: Colors.white70,
                  ),
                ),
              const SizedBox(height: AppSpacing.md),

              // Role badge
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: AppRadius.fullAll,
                  border: Border.all(color: Colors.white30),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      role == 'admin'
                          ? Icons.admin_panel_settings
                          : Icons.agriculture_rounded,
                      size: 16,
                      color: Colors.white,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      role == 'admin' ? 'Admin' : 'Farmer',
                      style: context.textTheme.labelMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final String? suffix;
  final Color color;

  const _StatTile({
    required this.icon,
    required this.label,
    required this.value,
    this.suffix,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: AppSpacing.allMd,
      decoration: BoxDecoration(
        color: context.appColors.card,
        borderRadius: AppRadius.mdAll,
        border: Border.all(color: context.appColors.border, width: 0.5),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 20, color: color),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            value,
            style: context.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          if (suffix != null)
            Text(
              suffix!,
              style: context.textTheme.labelSmall?.copyWith(
                color: context.appColors.textSecondary,
              ),
            ),
          const SizedBox(height: 2),
          Text(
            label,
            style: context.textTheme.bodySmall?.copyWith(
              color: context.appColors.textSecondary,
            ),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final String? badge;
  final VoidCallback onTap;

  const _ActionCard({
    required this.icon,
    required this.label,
    required this.color,
    this.badge,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: context.appColors.card,
      borderRadius: AppRadius.mdAll,
      child: InkWell(
        borderRadius: AppRadius.mdAll,
        onTap: onTap,
        child: Container(
          padding: AppSpacing.allMd,
          decoration: BoxDecoration(
            borderRadius: AppRadius.mdAll,
            border: Border.all(color: context.appColors.border, width: 0.5),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.1),
                      borderRadius: AppRadius.smAll,
                    ),
                    child: Icon(icon, size: 22, color: color),
                  ),
                  const Spacer(),
                  if (badge != null)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.12),
                        borderRadius: AppRadius.fullAll,
                      ),
                      child: Text(
                        badge!,
                        style: context.textTheme.labelSmall?.copyWith(
                          color: color,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    )
                  else
                    Icon(Icons.chevron_right_rounded,
                        size: 20, color: context.appColors.textSecondary),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                label,
                style: context.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
