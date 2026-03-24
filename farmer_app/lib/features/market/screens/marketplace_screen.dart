import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/services/market_service.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_overlay.dart';

class MarketplaceScreen extends ConsumerStatefulWidget {
  const MarketplaceScreen({super.key});

  @override
  ConsumerState<MarketplaceScreen> createState() => _MarketplaceScreenState();
}

class _MarketplaceScreenState extends ConsumerState<MarketplaceScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final _searchController = TextEditingController();

  // ── Tab data ──
  bool _pricesLoading = false;
  String? _pricesError;
  List<Map<String, dynamic>> _prices = [];

  bool _mandisLoading = false;
  String? _mandisError;
  List<Map<String, dynamic>> _mandis = [];

  bool _schemesLoading = false;
  String? _schemesError;
  List<Map<String, dynamic>> _schemes = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadAll();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    await Future.wait([_fetchPrices(), _fetchMandis(), _fetchSchemes()]);
  }

  Future<void> _fetchPrices() async {
    setState(() {
      _pricesLoading = true;
      _pricesError = null;
    });
    try {
      final res = await ref.read(marketServiceProvider).listPrices();
      final items = (res['items'] as List<dynamic>?)
              ?.cast<Map<String, dynamic>>() ??
          [];
      setState(() {
        _prices = items;
        _pricesLoading = false;
      });
    } catch (e) {
      setState(() {
        _pricesError = e.toString();
        _pricesLoading = false;
      });
    }
  }

  Future<void> _fetchMandis() async {
    setState(() {
      _mandisLoading = true;
      _mandisError = null;
    });
    try {
      final res = await ref.read(marketServiceProvider).listMandis();
      final items = (res['items'] as List<dynamic>?)
              ?.cast<Map<String, dynamic>>() ??
          [];
      setState(() {
        _mandis = items;
        _mandisLoading = false;
      });
    } catch (e) {
      setState(() {
        _mandisError = e.toString();
        _mandisLoading = false;
      });
    }
  }

  Future<void> _fetchSchemes() async {
    setState(() {
      _schemesLoading = true;
      _schemesError = null;
    });
    try {
      final res =
          await ref.read(marketServiceProvider).listSchemes(isActive: true);
      final items = (res['items'] as List<dynamic>?)
              ?.cast<Map<String, dynamic>>() ??
          [];
      setState(() {
        _schemes = items;
        _schemesLoading = false;
      });
    } catch (e) {
      setState(() {
        _schemesError = e.toString();
        _schemesLoading = false;
      });
    }
  }

  Future<void> _checkEligibility() async {
    final user = ref.read(authStateProvider).value?.user;
    final farmerId = user?['uid']?.toString() ?? '';
    if (farmerId.isEmpty) {
      if (mounted) {
        context.showSnack('common.error'.tr(), isError: true);
      }
      return;
    }
    try {
      final res =
          await ref.read(marketServiceProvider).checkEligibility(farmerId);
      if (!mounted) return;
      final eligible = res['eligible'] == true;
      context.showSnack(
        eligible
            ? 'govt_schemes.eligible'.tr()
            : 'govt_schemes.not_eligible'.tr(),
        isError: !eligible,
      );
    } catch (e) {
      if (mounted) context.showSnack(e.toString(), isError: true);
    }
  }

  List<Map<String, dynamic>> _filter(
      List<Map<String, dynamic>> items, List<String> fields) {
    final q = _searchController.text.trim().toLowerCase();
    if (q.isEmpty) return items;
    return items.where((item) {
      return fields
          .any((f) => (item[f]?.toString() ?? '').toLowerCase().contains(q));
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        title: Text('marketplace.title'.tr()),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(text: 'market_prices.title'.tr()),
            Tab(text: 'market_prices.mandi'.tr()),
            Tab(text: 'govt_schemes.title'.tr()),
          ],
        ),
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? [AppColors.darkBackground, AppColors.darkSurface]
                : [AppColors.lightBackground, AppColors.lightSurface],
          ),
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(
                  AppSpacing.lg, AppSpacing.md, AppSpacing.lg, 0),
              child: TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'marketplace.search_hint'.tr(),
                  prefixIcon: const Icon(Icons.search),
                ),
                onChanged: (_) => setState(() {}),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildPricesTab(),
                  _buildMandisTab(),
                  _buildSchemesTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Prices Tab ──────────────────────────────────────────
  Widget _buildPricesTab() {
    if (_pricesLoading) return const LoadingState(itemCount: 6);
    if (_pricesError != null) {
      return ErrorView(message: _pricesError!, onRetry: _fetchPrices);
    }
    final items = _filter(_prices, ['crop_name', 'market', 'state']);
    if (items.isEmpty) {
      return EmptyView(
        icon: Icons.bar_chart_outlined,
        title: 'market_prices.no_prices'.tr(),
      );
    }
    return RefreshIndicator(
      onRefresh: _fetchPrices,
      child: ListView.separated(
        padding: AppSpacing.allLg,
        itemCount: items.length,
        separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.md),
        itemBuilder: (_, i) => _PriceCard(
          data: items[i],
          onTap: () => context.push(RoutePaths.marketPrices),
        ),
      ),
    );
  }

  // ── Mandis Tab ──────────────────────────────────────────
  Widget _buildMandisTab() {
    if (_mandisLoading) return const LoadingState(itemCount: 6);
    if (_mandisError != null) {
      return ErrorView(message: _mandisError!, onRetry: _fetchMandis);
    }
    final items = _filter(_mandis, ['name', 'state', 'district']);
    if (items.isEmpty) {
      return EmptyView(
        icon: Icons.store_outlined,
        title: 'marketplace.no_listings'.tr(),
      );
    }
    return RefreshIndicator(
      onRefresh: _fetchMandis,
      child: ListView.separated(
        padding: AppSpacing.allLg,
        itemCount: items.length,
        separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.md),
        itemBuilder: (_, i) => _MandiCard(data: items[i]),
      ),
    );
  }

  // ── Schemes Tab ─────────────────────────────────────────
  Widget _buildSchemesTab() {
    if (_schemesLoading) return const LoadingState(itemCount: 6);
    if (_schemesError != null) {
      return ErrorView(message: _schemesError!, onRetry: _fetchSchemes);
    }
    final items = _filter(_schemes, ['name', 'category', 'state']);
    if (items.isEmpty) {
      return EmptyView(
        icon: Icons.policy_outlined,
        title: 'govt_schemes.no_schemes'.tr(),
      );
    }
    return RefreshIndicator(
      onRefresh: _fetchSchemes,
      child: ListView.builder(
        padding: AppSpacing.allLg,
        itemCount: items.length + 1, // +1 for quick-nav header
        itemBuilder: (_, i) {
          if (i == 0) return _buildQuickNavBanner();
          final idx = i - 1;
          return Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.md),
            child: _SchemeCard(
              data: items[idx],
              onCheckEligibility: _checkEligibility,
              onTap: () {
                HapticFeedback.selectionClick();
                final id = items[idx]['id']?.toString() ?? '';
                final name = items[idx]['name']?.toString() ?? '';
                context.push(
                  '${RoutePaths.schemeDetail}?id=$id&name=${Uri.encodeComponent(name)}',
                );
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildQuickNavBanner() {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.lg),
      child: _QuickNavChip(
        icon: Icons.description,
        label: 'Document Builder',
        color: AppColors.info,
        onTap: () {
          HapticFeedback.lightImpact();
          context.push(RoutePaths.documentBuilder);
        },
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
//  Private Card Widgets
// ═══════════════════════════════════════════════════════════════

class _PriceCard extends StatelessWidget {
  final Map<String, dynamic> data;
  final VoidCallback onTap;
  const _PriceCard({required this.data, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final min = (data['min_price'] as num?)?.toDouble();
    final max = (data['max_price'] as num?)?.toDouble();
    final modal = (data['modal_price'] as num?)?.toDouble();

    return AppCard(
      onTap: onTap,
      child: Row(
        children: [
          Container(
            padding: AppSpacing.allSm,
            decoration: BoxDecoration(
              color: AppColors.success.withValues(alpha: 0.1),
              borderRadius: AppRadius.smAll,
            ),
            child:
                const Icon(Icons.eco, color: AppColors.success, size: 24),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  data['crop_name']?.toString() ?? '-',
                  style: context.textTheme.titleSmall
                      ?.copyWith(fontWeight: FontWeight.bold),
                ),
                Text(
                  data['market']?.toString() ?? '-',
                  style: context.textTheme.bodySmall
                      ?.copyWith(color: context.appColors.textSecondary),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${min?.inr ?? '-'} – ${max?.inr ?? '-'}',
                style: context.textTheme.bodySmall,
              ),
              Text(
                '${'market_prices.modal_price'.tr()}: ${modal?.inr ?? '-'}',
                style: context.textTheme.bodySmall?.copyWith(
                  color: AppColors.success,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MandiCard extends StatelessWidget {
  final Map<String, dynamic> data;
  const _MandiCard({required this.data});

  @override
  Widget build(BuildContext context) {
    final commodities = data['commodities'] as List<dynamic>?;
    final phone = data['phone']?.toString() ?? data['contact_number']?.toString();
    final lat = data['latitude']?.toString();
    final lng = data['longitude']?.toString();
    final address = data['address']?.toString();

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: AppSpacing.allSm,
                decoration: BoxDecoration(
                  color: AppColors.info.withValues(alpha: 0.1),
                  borderRadius: AppRadius.smAll,
                ),
                child: const Icon(Icons.store, color: AppColors.info, size: 24),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      data['name']?.toString() ?? '-',
                      style: context.textTheme.titleSmall
                          ?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    Text(
                      '${data['district'] ?? ''}, ${data['state'] ?? ''}',
                      style: context.textTheme.bodySmall
                          ?.copyWith(color: context.appColors.textSecondary),
                    ),
                  ],
                ),
              ),
            ],
          ),

          // Phone number
          if (phone != null && phone.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            InkWell(
              onTap: () => launchUrl(Uri.parse('tel:$phone')),
              child: Row(
                children: [
                  const Icon(Icons.phone, size: 16, color: AppColors.success),
                  const SizedBox(width: 6),
                  Text(phone,
                      style: context.textTheme.bodySmall?.copyWith(
                        color: AppColors.success,
                        fontWeight: FontWeight.w600,
                      )),
                ],
              ),
            ),
          ],

          // Location / Address with maps link
          if (address != null && address.isNotEmpty ||
              lat != null && lng != null) ...[
            const SizedBox(height: AppSpacing.xs),
            InkWell(
              onTap: () {
                final Uri uri;
                if (lat != null && lng != null) {
                  uri = Uri.parse(
                      'https://www.google.com/maps/search/?api=1&query=$lat,$lng');
                } else {
                  uri = Uri.parse(
                      'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(address ?? '')}');
                }
                launchUrl(uri, mode: LaunchMode.externalApplication);
              },
              child: Row(
                children: [
                  const Icon(Icons.location_on,
                      size: 16, color: AppColors.info),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      address ?? 'View on Maps',
                      style: context.textTheme.bodySmall?.copyWith(
                        color: AppColors.info,
                        decoration: TextDecoration.underline,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ],

          // Commodities
          if (commodities != null && commodities.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: AppSpacing.sm),
              child: Wrap(
                spacing: 4,
                runSpacing: 4,
                children: commodities
                    .map((c) => Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.primary
                                .withValues(alpha: 0.1),
                            borderRadius: AppRadius.smAll,
                          ),
                          child: Text(
                            c.toString(),
                            style: context.textTheme.bodySmall
                                ?.copyWith(fontSize: 11),
                          ),
                        ))
                    .toList(),
              ),
            ),
        ],
      ),
    );
  }
}

class _QuickNavChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _QuickNavChip({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color.withValues(alpha: 0.1),
      borderRadius: AppRadius.mdAll,
      child: InkWell(
        borderRadius: AppRadius.mdAll,
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md, vertical: AppSpacing.sm),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 18, color: color),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  label,
                  style: context.textTheme.bodySmall?.copyWith(
                    color: color,
                    fontWeight: FontWeight.w600,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SchemeCard extends StatelessWidget {
  final Map<String, dynamic> data;
  final VoidCallback onCheckEligibility;
  final VoidCallback? onTap;
  const _SchemeCard({
    required this.data,
    required this.onCheckEligibility,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: AppSpacing.allSm,
                decoration: BoxDecoration(
                  color: AppColors.accent.withValues(alpha: 0.1),
                  borderRadius: AppRadius.smAll,
                ),
                child: const Icon(Icons.policy,
                    color: AppColors.accent, size: 24),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      data['name']?.toString() ?? '-',
                      style: context.textTheme.titleSmall
                          ?.copyWith(fontWeight: FontWeight.bold),
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (data['category'] != null)
                      Text(
                        data['category'].toString(),
                        style: context.textTheme.bodySmall?.copyWith(
                            color: context.appColors.textSecondary),
                      ),
                  ],
                ),
              ),
            ],
          ),
          if (data['description'] != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              data['description'].toString(),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: context.textTheme.bodySmall,
            ),
          ],
          if (data['eligibility'] != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Eligibility: ${data['eligibility']}',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: context.textTheme.bodySmall?.copyWith(
                color: AppColors.info,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: AppButton(
                  label: 'View Details',
                  icon: Icons.info_outline,
                  isOutlined: true,
                  onPressed: () {
                    if (onTap != null) onTap!();
                  },
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: AppButton(
                  label: 'Check Eligibility',
                  icon: Icons.verified_user,
                  isOutlined: true,
                  onPressed: onCheckEligibility,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
