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
import '../../../shared/services/ai_overview_service.dart';
import '../../../shared/services/equipment_service.dart';
import '../../../shared/services/personalization_service.dart';
import '../../../shared/widgets/error_view.dart';
import '../utils/equipment_utils.dart';
import '../widgets/equipment_shell.dart';
import '../../weather/widgets/glass_widgets.dart';

class EquipmentHubScreen extends ConsumerStatefulWidget {
  const EquipmentHubScreen({super.key});

  @override
  ConsumerState<EquipmentHubScreen> createState() => _EquipmentHubScreenState();
}

class _EquipmentHubScreenState extends ConsumerState<EquipmentHubScreen> {
  bool _loading = true;
  bool _refreshing = false;
  String? _error;
  int _totalProviders = 0;
  List<String> _categories = const [];
  List<Map<String, dynamic>> _featuredProviders = const [];
  Map<String, dynamic> _profile = const {};
  Map<String, dynamic> _mechanizationStats = const {};

  bool _aiLoading = false;
  bool _aiGenerated = false;
  bool _aiExpanded = false;
    bool _showAllCategories = false;
  String _aiSummary =
      'Generate an AI overview for equipment opportunities near you.';
  String _aiDetails =
      'Get localized rental intelligence, category demand, and listing opportunities.';
  DateTime? _aiUpdatedAt;

  @override
  void initState() {
    super.initState();
    _loadCachedAiOverview();
    _primeData();
  }

  bool get _hasSnapshot =>
      _featuredProviders.isNotEmpty ||
      _categories.isNotEmpty ||
      _mechanizationStats.isNotEmpty;

  Future<void> _primeData() async {
    await _loadData(forceRefresh: true);
    if (!mounted) return;
    _loadData(forceRefresh: true, silent: true);
  }

  Future<void> _loadData({
    bool forceRefresh = false,
    bool silent = false,
  }) async {
    final hasSnapshot = _hasSnapshot;
    setState(() {
      if (silent || hasSnapshot) {
        _refreshing = true;
      } else {
        _loading = true;
      }
      _error = null;
    });

    try {
      final svc = ref.read(equipmentServiceProvider);
      final profile =
          await ref.read(personalizationServiceProvider).getProfileContext();
      if (!mounted) return;

      final rates = await svc.listRentalRatesFiltered(
        limit: 10,
        preferCache: !forceRefresh,
        forceRefresh: forceRefresh,
      );
      if (!mounted) return;
      final categories = await svc.listRentalCategories(
        preferCache: !forceRefresh,
        forceRefresh: forceRefresh,
      );
      if (!mounted) return;
      final mech = await svc.getMechanizationStats(
        state: (profile['state'] ?? '').toString(),
        preferCache: !forceRefresh,
        forceRefresh: forceRefresh,
      );
      if (!mounted) return;

      final rows =
          (rates['rows'] as List?)?.cast<Map<String, dynamic>>() ?? const [];
      setState(() {
        _profile = profile;
        _featuredProviders = rows;
        _totalProviders = (rates['total'] as num?)?.toInt() ?? rows.length;
        _categories = categories;
        _mechanizationStats = mech;
        _loading = false;
        _refreshing = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _refreshing = false;
        _loading = false;
        if (!hasSnapshot) {
          _error = e.toString();
        }
      });
      if (hasSnapshot) {
        context.showSnack(
          'Showing previous synced data. Pull down to retry.',
          isError: true,
        );
      }
    }
  }

  Future<void> _loadCachedAiOverview() async {
    final cached = await ref
        .read(aiOverviewServiceProvider)
        .getCached('equipment_hub_overview_v1');
    if (!mounted || cached == null) return;
    setState(() {
      _aiSummary = cached.summary;
      _aiDetails = cached.details;
      _aiUpdatedAt = cached.updatedAt;
      _aiGenerated = true;
    });
  }

  Future<void> _generateAiOverview() async {
    if (_aiLoading) return;
    setState(() => _aiLoading = true);
    try {
      final snippets = _featuredProviders.take(8).map((item) {
        final name =
            (item['equipment'] ?? item['name'] ?? '').toString();
        final provider =
            ((item['provider'] as Map?)?['name'] ?? '').toString();
        final district =
            ((item['location'] as Map?)?['district'] ?? '').toString();
        final daily =
            ((item['rates'] as Map?)?['daily'] ?? '').toString();
        return '$name by $provider in $district at daily rate $daily';
      }).toList(growable: false);

      final ai = await ref.read(aiOverviewServiceProvider).generate(
            key: 'equipment_hub_overview_v1',
            pageName: 'Equipment Hub',
        languageCode: Localizations.localeOf(context).languageCode,
            nearbyData: snippets,
            forceRefresh: true,
          );
      if (!mounted) return;
      setState(() {
        _aiSummary = ai.summary;
        _aiDetails = ai.details;
        _aiUpdatedAt = ai.updatedAt;
        _aiGenerated = true;
        _aiLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _aiLoading = false);
      context.showSnack(e.toString(), isError: true);
    }
  }

  String _updatedAtLabel() {
    if (_aiUpdatedAt == null) return 'Not generated yet';
    final hh = _aiUpdatedAt!.hour.toString().padLeft(2, '0');
    final mm = _aiUpdatedAt!.minute.toString().padLeft(2, '0');
    return 'Updated at $hh:$mm';
  }

  Future<void> _openChcApp() async {
    HapticFeedback.lightImpact();
    final marketUri = Uri.parse(
      'market://details?id=app.chcagrimachinery.com.chcagrimachinery',
    );
    final webUri = Uri.parse('https://agrimachinery.nic.in/Index/farmsapp');
    try {
      if (await canLaunchUrl(marketUri)) {
        await launchUrl(marketUri, mode: LaunchMode.externalApplication);
        return;
      }
      await launchUrl(webUri, mode: LaunchMode.externalApplication);
    } catch (_) {
      if (!mounted) return;
      context.showSnack('Unable to open CHC app', isError: true);
    }
  }

  Future<void> _showChcInfoSheet() async {
    try {
      final data = await ref.read(equipmentServiceProvider).getChcInfo();
      if (!mounted) return;
      final chc =
          (data['chc'] as Map?)?.cast<String, dynamic>() ?? const {};
      final tips = (chc['how_to_find'] as List?)
              ?.map((e) => e.toString())
              .toList() ??
          const [];

      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor:
            context.isDark ? AppColors.darkCard : Colors.white,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        builder: (ctx) {
          return SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'What is a Custom Hiring Centre?',
                    style: ctx.textTheme.titleLarge
                        ?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text((chc['description'] ?? '').toString()),
                  const SizedBox(height: AppSpacing.md),
                  ...tips.map(
                    (e) => Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.check_circle_outline,
                            size: 16,
                            color: AppColors.primary,
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          Expanded(child: Text(e)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _openChcApp,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius:
                              BorderRadius.circular(AppRadius.full),
                        ),
                        elevation: 0,
                      ),
                      child: const Text('Open FARMS App'),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      );
    } catch (e) {
      if (!mounted) return;
      context.showSnack(e.toString(), isError: true);
    }
  }

  Color _mechanizationColor(double value) {
    if (value >= 70) return AppColors.success;
    if (value >= 50) return AppColors.info;
    return AppColors.danger;
  }

  String _mechanizationBand(double value) {
    if (value >= 70) return 'High';
    if (value >= 50) return 'Moderate';
    return 'Growth Zone';
  }

  // ─── Build ───────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final cardColor = isDark
        ? AppColors.darkCard.withValues(alpha: 0.72)
        : Colors.white.withValues(alpha: 0.74);
    final textColor =
        isDark ? AppColors.darkText : AppColors.lightText;
    final subColor = isDark
        ? AppColors.darkTextSecondary
        : AppColors.lightTextSecondary;

    final records =
        (_mechanizationStats['records'] as List?)
            ?.cast<Map<String, dynamic>>() ??
        const [];
    final metric =
        records.isNotEmpty ? records.first : const <String, dynamic>{};
    final mechPct =
        (metric['mechanization_percentage'] as num?)?.toDouble() ?? 0;
    final tractors =
        (metric['tractors_per_1000ha'] as num?)?.toDouble() ?? 0;

    return Scaffold(
      backgroundColor: isDark
          ? AppColors.darkBackground
          : AppColors.lightBackground,
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: isDark
                ? <Color>[
                    AppColors.darkBackground,
                    AppColors.darkSurface,
                    AppColors.darkBackground,
                  ]
                : <Color>[
                    AppColors.lightBackground,
                    AppColors.lightSurface,
                    AppColors.lightBackground,
                  ],
          ),
        ),
        child: SafeArea(
          bottom: false,
          child: _loading && !_hasSnapshot
              ? const EquipmentContentSkeleton(cardCount: 7)
              : _error != null && !_hasSnapshot
                  ? ErrorView(
                      message: _error!,
                      onRetry: () => _loadData(forceRefresh: true),
                    )
                  : RefreshIndicator(
                      onRefresh: () => _loadData(forceRefresh: true),
                      child: ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.only(
                          bottom: AppSpacing.xxxl,
                        ),
                        children: [
                          // ── Top bar ──────────────────────────────
                          Padding(
                            padding: const EdgeInsets.fromLTRB(
                              AppSpacing.lg,
                              AppSpacing.sm,
                              AppSpacing.lg,
                              0,
                            ),
                            child: Row(
                              children: [
                                _topAction(
                                  icon: Icons.arrow_back_rounded,
                                  color: AppColors.primaryDark,
                                  onTap: () =>
                                      Navigator.of(context).maybePop(),
                                ),
                                const SizedBox(width: AppSpacing.sm),
                                Expanded(
                                  child: Center(
                                    child: Column(
                                      mainAxisSize: MainAxisSize.min,
                                      crossAxisAlignment:
                                          CrossAxisAlignment.center,
                                    children: [
                                      Text(
                                        'Equipment Marketplace',
                                        textAlign: TextAlign.center,
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleLarge
                                            ?.copyWith(
                                              color: textColor,
                                              fontWeight: FontWeight.w800,
                                            ),
                                      ),
                                      Text(
                                        'Rent. List. Track.',
                                        textAlign: TextAlign.center,
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodySmall
                                            ?.copyWith(color: subColor),
                                      ),
                                    ],
                                  ),
                                  ),
                                ),
                                const SizedBox(width: AppSpacing.sm),
                                _topAction(
                                  icon: Icons.refresh_rounded,
                                  color: AppColors.primaryDark,
                                  onTap: () =>
                                      _loadData(forceRefresh: true),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: AppSpacing.lg),

                          // ── Stale-data warning ────────────────────
                          if (_error != null && _hasSnapshot) ...[
                            const SizedBox(height: AppSpacing.sm),
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: AppSpacing.lg,
                              ),
                              child: Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(AppSpacing.md),
                                decoration: BoxDecoration(
                                  color: AppColors.warning
                                      .withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(
                                    AppRadius.md,
                                  ),
                                  border: Border.all(
                                    color: AppColors.warning
                                        .withValues(alpha: 0.3),
                                  ),
                                ),
                                child: Text(
                                  'Could not sync latest values right now. Displaying recent cached data.',
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.copyWith(
                                        color: AppColors.warning,
                                        fontWeight: FontWeight.w700,
                                      ),
                                ),
                              ),
                            ),
                          ],

                          const SizedBox(height: AppSpacing.md),

                          // ── AI Overview ───────────────────────────
                          _aiOverviewCard(),

                          const SizedBox(height: AppSpacing.md),

                          // ── Quick grid ────────────────────────────
                          Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.lg,
                            ),
                            child: _quickGrid(
                              cardColor: cardColor,
                              textColor: textColor,
                            ),
                          ),

                          const SizedBox(height: AppSpacing.md),

                          // ── Featured providers ────────────────────
                          _featuredProvidersSection(
                            textColor: textColor,
                            subColor: subColor,
                          ),

                          const SizedBox(height: AppSpacing.md),

                          // ── Category chips ────────────────────────
                          _categoryShowcaseSection(
                            textColor: textColor,
                            subColor: subColor,
                          ),

                          const SizedBox(height: AppSpacing.md),

                          // ── SMAM info card ────────────────────────
                          Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.lg,
                            ),
                            child: _glassCard(
                              cardColor: cardColor,
                              child: Column(
                                crossAxisAlignment:
                                    CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(
                                        Icons.info_outline,
                                        color: AppColors.primaryDark,
                                        size: 18,
                                      ),
                                      const SizedBox(width: AppSpacing.sm),
                                      Text(
                                        'SMAM Scheme',
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleSmall
                                            ?.copyWith(
                                              color: textColor,
                                              fontWeight: FontWeight.w700,
                                            ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: AppSpacing.xs),
                                  Text(
                                    'India has 75,000+ CHCs, SMAM subsidy 40–80%, and USD 4.6B market size by 2025.',
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodyMedium
                                        ?.copyWith(color: textColor),
                                  ),
                                  const SizedBox(height: AppSpacing.sm),
                                  InkWell(
                                    onTap: _showChcInfoSheet,
                                    borderRadius: BorderRadius.circular(
                                      AppRadius.sm,
                                    ),
                                    child: Text(
                                      'Learn about SMAM →',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodyMedium
                                          ?.copyWith(
                                            color: AppColors.primaryDark,
                                            fontWeight: FontWeight.w800,
                                          ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),

                          const SizedBox(height: AppSpacing.md),

                          // ── Mini stats ────────────────────────────
                          Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.lg,
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: _miniStat(
                                    label: '75K+ CHCs',
                                    value: 'Nationwide',
                                    cardColor: cardColor,
                                    textColor: textColor,
                                    subColor: subColor,
                                  ),
                                ),
                                const SizedBox(width: AppSpacing.sm),
                                Expanded(
                                  child: _miniStat(
                                    label: '2.5L Implements/yr',
                                    value: 'Deployment',
                                    cardColor: cardColor,
                                    textColor: textColor,
                                    subColor: subColor,
                                  ),
                                ),
                                const SizedBox(width: AppSpacing.sm),
                                Expanded(
                                  child: _miniStat(
                                    label: '4.1% CAGR',
                                    value: 'Rental Market',
                                    cardColor: cardColor,
                                    textColor: textColor,
                                    subColor: subColor,
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: AppSpacing.md),

                          // ── Mechanization insight ─────────────────
                          Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.lg,
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                _cutBorderAccent(),
                                const SizedBox(height: AppSpacing.xs),
                                Text(
                                  (metric['state'] ??
                                          (_profile['state'] ?? 'India'))
                                      .toString(),
                                  textAlign: TextAlign.center,
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.copyWith(color: subColor),
                                ),
                                const SizedBox(height: AppSpacing.sm),
                                Text(
                                  '${mechPct.toStringAsFixed(1)}%',
                                  textAlign: TextAlign.center,
                                  style: Theme.of(context)
                                      .textTheme
                                      .headlineMedium
                                      ?.copyWith(
                                        color: _mechanizationColor(mechPct),
                                        fontWeight: FontWeight.w900,
                                      ),
                                ),
                                Text(
                                  _mechanizationBand(mechPct),
                                  textAlign: TextAlign.center,
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleSmall
                                      ?.copyWith(
                                        color: textColor,
                                        fontWeight: FontWeight.w700,
                                      ),
                                ),
                                const SizedBox(height: AppSpacing.sm),
                                ClipRRect(
                                  borderRadius:
                                      BorderRadius.circular(AppRadius.full),
                                  child: LinearProgressIndicator(
                                    value: (mechPct / 100).clamp(0, 1),
                                    minHeight: 7,
                                    backgroundColor:
                                        Colors.white.withValues(alpha: 0.24),
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                      _mechanizationColor(mechPct),
                                    ),
                                  ),
                                ),
                                const SizedBox(height: AppSpacing.sm),
                                Text(
                                  'Tractors / 1000 ha: ${tractors.toStringAsFixed(1)}',
                                  textAlign: TextAlign.center,
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodyMedium
                                      ?.copyWith(
                                        color: textColor,
                                        fontWeight: FontWeight.w700,
                                      ),
                                ),
                                const SizedBox(height: AppSpacing.xs),
                                Text(
                                  mechPct < 60
                                      ? 'Opportunity Signal: High Demand'
                                      : 'Opportunity Signal: Stable Demand',
                                  textAlign: TextAlign.center,
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.copyWith(
                                        color: _mechanizationColor(mechPct),
                                        fontWeight: FontWeight.w700,
                                      ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: AppSpacing.md),

                          // ── CHC Banner ────────────────────────────
                          Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.lg,
                            ),
                            child: InkWell(
                              onTap: _openChcApp,
                              borderRadius:
                                  BorderRadius.circular(AppRadius.lg),
                              child: Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(AppSpacing.lg),
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                    colors: [
                                      AppColors.warning.withValues(
                                        alpha: context.isDark ? 0.32 : 0.24,
                                      ),
                                      Colors.white.withValues(
                                        alpha: context.isDark ? 0.08 : 0.82,
                                      ),
                                    ],
                                  ),
                                  borderRadius: BorderRadius.circular(
                                    AppRadius.lg,
                                  ),
                                  border: Border.all(
                                    color: AppColors.warning.withValues(
                                      alpha: context.isDark ? 0.4 : 0.26,
                                    ),
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      padding:
                                          const EdgeInsets.all(AppSpacing.sm),
                                      decoration: BoxDecoration(
                                        color: Colors.white.withValues(
                                          alpha: context.isDark ? 0.14 : 0.84,
                                        ),
                                        borderRadius: BorderRadius.circular(
                                          AppRadius.md,
                                        ),
                                      ),
                                      child: const Icon(
                                        Icons.location_on,
                                        color: AppColors.warning,
                                        size: 22,
                                      ),
                                    ),
                                    const SizedBox(width: AppSpacing.md),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Find Nearest CHC',
                                            style: Theme.of(context)
                                                .textTheme
                                                .titleMedium
                                                ?.copyWith(
                                                  color: textColor,
                                                  fontWeight: FontWeight.w800,
                                                ),
                                          ),
                                          Text(
                                            '75,000+ govt hiring centres near your village.',
                                            style: Theme.of(context)
                                                .textTheme
                                                .bodySmall
                                                ?.copyWith(
                                                  color: subColor,
                                                ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const Icon(
                                      Icons.arrow_forward_ios_rounded,
                                      color: AppColors.warning,
                                      size: 16,
                                    ),
                                  ],
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

  // ─── Reusable widgets ─────────────────────────────────────────────────────

  Widget _topAction({
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return IconButton(
      onPressed: onTap,
      icon: Icon(icon, color: color, size: 22),
    );
  }

  Widget _glassCard({
    required Color cardColor,
    required Widget child,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.8),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryDark.withValues(alpha: 0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: child,
      ),
    );
  }

  Widget _headerBadge(String label, Color textColor, Color subColor) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(AppRadius.full),
        border: Border.all(
          color: AppColors.primary.withValues(alpha: 0.26),
        ),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: AppColors.primaryDark,
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }

  Widget _cutBorderAccent() {
    return _ScallopedCouponBanner(
      text: 'MECHANIZATION INSIGHT',
      backgroundColor: const Color(0xFFF5EDDC),
      textColor: AppColors.lightText,
      borderColor: AppColors.primary.withValues(alpha: 0.22),
      shadowColor: Colors.black.withValues(
        alpha: context.isDark ? 0.34 : 0.14,
      ),
      scallopRadius: 7,
      scallopSpacing: 8,
      cornerRadius: 20,
      height: 92,
    );
  }

  Widget _aiOverviewCard() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
      child: GlassCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.auto_awesome,
                  color: AppColors.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  'AI Overview',
                  style: context.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              _aiExpanded ? _aiDetails : _aiSummary,
              style: context.textTheme.bodyMedium?.copyWith(height: 1.45),
              maxLines: _aiExpanded ? null : 4,
              overflow: _aiExpanded
                  ? TextOverflow.visible
                  : TextOverflow.ellipsis,
            ),
            const SizedBox(height: AppSpacing.sm),
            if (_aiLoading)
              Row(
                children: [
                  const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'Generating recommendations...',
                    style: context.textTheme.bodyMedium,
                  ),
                ],
              ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              _updatedAtLabel(),
              style: context.textTheme.bodySmall?.copyWith(
                color: context.appColors.textSecondary,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _aiLoading
                        ? null
                        : () => _generateAiOverview(),
                    icon: Icon(
                      _aiGenerated ? Icons.refresh : Icons.auto_awesome,
                    ),
                    label: Text(
                      _aiGenerated
                          ? 'Generate Fresh'
                          : 'Generate AI Overview',
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white.withValues(alpha: 0.85),
                      foregroundColor: AppColors.lightText,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(40),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                OutlinedButton(
                  onPressed: () {
                    setState(() => _aiExpanded = !_aiExpanded);
                  },
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(40),
                    ),
                  ),
                  child: Text(_aiExpanded ? 'Less' : 'More'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _quickGrid({
    required Color cardColor,
    required Color textColor,
  }) {
    final items = [
      _QuickAction(
        icon: Icons.travel_explore,
        label: 'Browse Equipment',
        color: AppColors.info,
        verdict: 'EXPLORE',
        description: 'View nearby machines and compare live rental rates.',
        onTap: () => context.push(RoutePaths.equipmentMarketplace),
      ),
      _QuickAction(
        icon: Icons.receipt_long,
        label: 'My Bookings',
        color: AppColors.warning,
        verdict: 'TRACK',
        description: 'Check booking status, dates, and provider updates.',
        onTap: () => context.push(RoutePaths.myBookings),
      ),
      _QuickAction(
        icon: Icons.inventory_2_outlined,
        label: 'My Listings',
        color: AppColors.success,
        verdict: 'MANAGE',
        description: 'Update equipment availability, pricing, and details.',
        onTap: () => context.push(RoutePaths.myEquipment),
      ),
      _QuickAction(
        icon: Icons.insights,
        label: 'Rate Intelligence',
        color: AppColors.danger,
        verdict: 'INSIGHTS',
        description: 'Monitor local trends and benchmark rental pricing.',
        onTap: () => context.push(RoutePaths.equipmentRentalRates),
      ),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: items.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: AppSpacing.md,
        mainAxisSpacing: AppSpacing.md,
        childAspectRatio: 1.35,
      ),
      itemBuilder: (_, i) {
        final item = items[i];
        return _glassCard(
          cardColor: cardColor,
          child: InkWell(
            onTap: () {
              HapticFeedback.lightImpact();
              item.onTap();
            },
            borderRadius: BorderRadius.circular(AppRadius.lg),
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                color: item.color.withValues(alpha: 0.08),
              ),
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(item.icon, color: item.color),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Text(
                          item.label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context)
                              .textTheme
                              .bodyMedium
                              ?.copyWith(
                                fontWeight: FontWeight.w700,
                                color: textColor,
                              ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    item.verdict,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: item.color,
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Expanded(
                    child: Text(
                      item.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: textColor,
                          ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _featuredProvidersSection({
    required Color textColor,
    required Color subColor,
  }) {
    final sectionColor = const Color(0xFFF5EDDC).withValues(
      alpha: context.isDark ? 0.26 : 0.95,
    );
    final sectionGradient = LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: context.isDark
          ? <Color>[
              const Color(0xFFDFAE74).withValues(alpha: 0.34),
              Colors.white.withValues(alpha: 0.08),
            ]
          : <Color>[
              const Color(0xFFF8E0BE),
              Colors.white,
            ],
    );
    return _ScallopedPanel(
      height: 460,
      backgroundColor: sectionColor,
      backgroundGradient: sectionGradient,
      borderColor: Colors.black.withValues(alpha: 0.86),
      shadowColor: Colors.black.withValues(alpha: context.isDark ? 0.34 : 0.14),
      cornerRadius: 20,
      scallopRadius: 7,
      scallopSpacing: 8,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.md,
          18,
          AppSpacing.md,
          AppSpacing.md,
        ),
        child: Column(
          children: [
            Text(
              'FEATURED PROVIDERS',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: AppColors.lightText,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.8,
                    fontStyle: FontStyle.italic,
                  ),
            ),
            const SizedBox(height: AppSpacing.sm),
            SizedBox(
              height: 392,
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
                scrollDirection: Axis.horizontal,
                physics: const ClampingScrollPhysics(),
                itemExtent: 182,
                cacheExtent: 1200,
                itemCount: _featuredProviders.length,
                itemBuilder: (_, i) {
                  final item = _featuredProviders[i];
                  final provider = (item['provider'] as Map?)
                          ?.cast<String, dynamic>() ??
                      const <String, dynamic>{};
                  final location = (item['location'] as Map?)
                          ?.cast<String, dynamic>() ??
                      const <String, dynamic>{};
                  return Padding(
                    padding: const EdgeInsets.only(right: AppSpacing.sm),
                    child: RepaintBoundary(
                      child: _providerCard(
                        item: item,
                        provider: provider,
                        location: location,
                        index: i,
                        textColor: textColor,
                        subColor: subColor,
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _providerCard({
    required Map<String, dynamic> item,
    required Map<String, dynamic> provider,
    required Map<String, dynamic> location,
    required int index,
    required Color textColor,
    required Color subColor,
  }) {
    final rates =
        (item['rates'] as Map?)?.cast<String, dynamic>() ?? const {};
    final daily = _toDouble(rates['daily']);
    final hourly = _toDouble(rates['hourly']);
    final price = daily > 0 ? daily : hourly;
    final backendMrp = _toDouble(
      rates['mrp'] ??
          item['mrp'] ??
          rates['base_price'] ??
          item['base_price'],
    );
    final mrp = backendMrp > 0 ? backendMrp : price;
    final discount = _resolveDiscount(item, rates, price, mrp);
    final rating = _resolveRating(item, provider);
    final reviews = _resolveReviewCount(item, provider);
    final etaMins = _resolveEta(item, provider);
    final stockLeft = _resolveStock(item, provider);
    final imageUrl = _resolveImageUrl(item, provider);
    final category = categoryDisplay((item['category'] ?? '').toString());
    final locationLabel = (location['district'] ?? location['state'] ?? '')
        .toString();
    final displayLocation = locationLabel.isEmpty ? 'Nearby' : locationLabel;
    final providerName = (provider['name'] ?? '').toString();
    final effectiveIndex = index + 1;
    final hasRating = rating > 0;
    final hasReviews = reviews > 0;
    final hasEta = etaMins > 0;
    final hasStock = stockLeft > 0;

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        final name = (item['equipment'] ?? '').toString();
        context.push(
          '${RoutePaths.rentalRateDetail}?name=$name&category=${item['category'] ?? ''}',
        );
      },
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xs),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.max,
          children: [
            SizedBox(
              height: 144,
              child: Stack(
                children: [
                  Positioned.fill(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      child: Container(
                        color: Colors.white,
                        child: imageUrl == null
                            ? Icon(
                                Icons.agriculture_rounded,
                                color: AppColors.primaryDark.withValues(alpha: 0.6),
                                size: 44,
                              )
                            : _providerImage(
                                primaryUrl: imageUrl,
                                seed: (item['equipment'] ?? item['category'] ?? 'equipment')
                                    .toString(),
                              ),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Icon(
                      Icons.favorite_border,
                      color: Colors.grey.shade500,
                      size: 20,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                _providerMetaTag(category),
                _providerMetaTag(displayLocation),
                _providerMetaTag('#$effectiveIndex'),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              (item['equipment'] ?? '').toString(),
              maxLines: 4,
              softWrap: true,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: textColor,
                  ),
            ),
            if (providerName.isNotEmpty) ...[
              const SizedBox(height: 2),
              Text(
                providerName,
                maxLines: 2,
                softWrap: true,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: subColor,
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ],
            const SizedBox(height: 4),
            if (hasRating || hasReviews) ...[
              Row(
                children: [
                  ...List.generate(
                    5,
                    (starIndex) => Icon(
                      starIndex < rating.round()
                          ? Icons.star_rounded
                          : Icons.star_border_rounded,
                      color: AppColors.warning,
                      size: 14,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      hasReviews ? '(${reviews.toString()})' : '',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: subColor,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 2),
            ],
            if (hasEta) ...[
              Row(
                children: [
                  Icon(
                    Icons.schedule_rounded,
                    size: 14,
                    color: AppColors.warning,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '$etaMins MINS',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: textColor,
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                ],
              ),
              const SizedBox(height: 2),
            ],
            if (hasStock)
              Text(
                'Only $stockLeft left',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.danger,
                      fontWeight: FontWeight.w700,
                    ),
              ),
            const Spacer(),
            if (discount > 0) ...[
                const SizedBox(height: 2),
              Text(
                '$discount% OFF',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.info,
                      fontWeight: FontWeight.w900,
                    ),
              ),
            ],
            const SizedBox(height: 2),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  price <= 0 ? 'NA' : '₹${_formatMoney(price)}',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: textColor,
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    price <= 0 || mrp <= price
                        ? ''
                        : 'MRP ₹${_formatMoney(mrp)}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: subColor,
                          decoration: TextDecoration.lineThrough,
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _providerMetaTag(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.xs,
        vertical: 2,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.sm),
      ),
      child: Text(
        label,
        softWrap: true,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: AppColors.lightText,
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }

  Widget _categoryShowcaseSection({
    required Color textColor,
    required Color subColor,
  }) {
    final fallback = <String>[
      'land_preparation',
      'sowing_planting',
      'irrigation',
      'crop_protection',
      'harvesting',
      'horticulture',
      'transport',
      'drone_technology',
    ];
    final categories = (_categories.isNotEmpty ? _categories : fallback)
        .where((e) => e.trim().isNotEmpty)
        .toSet()
        .toList(growable: false);
    final hasMoreCategories = categories.length > 5;
    final visibleCount = _showAllCategories
      ? categories.length
      : (hasMoreCategories ? 5 : categories.length);
    final visibleCategories = categories.take(visibleCount).toList(growable: false);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final gap = AppSpacing.sm;
          final width = constraints.maxWidth;
          final wideWidth = ((width - gap) / 2).clamp(120.0, width);
          final row2Width = ((width - (2 * gap)) / 3).clamp(96.0, width);

          final top = visibleCategories.take(2).toList(growable: false);
          final rest = visibleCategories.skip(2).toList(growable: false);
          final globalLastWideStart = categories.length - 2;

          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _outlinedCapsTitle('Smart Categories'),
              const SizedBox(height: AppSpacing.sm),
              if (top.isNotEmpty)
                Wrap(
                  spacing: gap,
                  runSpacing: gap,
                  children: [
                    _categoryShowcaseCard(
                      categoryKey: top[0],
                      width: wideWidth,
                      height: 146,
                      textColor: textColor,
                      subColor: subColor,
                      featured: true,
                    ),
                    if (top.length > 1)
                      _categoryShowcaseCard(
                        categoryKey: top[1],
                        width: wideWidth,
                        height: 146,
                        textColor: textColor,
                        subColor: subColor,
                      ),
                  ],
                ),
              if (rest.isNotEmpty) ...[
                const SizedBox(height: AppSpacing.sm),
                Wrap(
                  spacing: gap,
                  runSpacing: gap,
                  children: List.generate(rest.length, (i) {
                    final globalIndex = i + 2;
                    final isLastTwo = globalIndex >= globalLastWideStart;
                    final h = isLastTwo
                        ? 146.0
                        : (i.isEven ? 126.0 : 118.0);
                    return _categoryShowcaseCard(
                      categoryKey: rest[i],
                      width: isLastTwo ? wideWidth : row2Width,
                      height: h,
                      textColor: textColor,
                      subColor: subColor,
                    );
                  }),
                ),
              ],
              if (hasMoreCategories) ...[
                const SizedBox(height: AppSpacing.sm),
                Center(
                  child: TextButton.icon(
                    onPressed: () {
                      setState(() => _showAllCategories = !_showAllCategories);
                    },
                    icon: Icon(
                      _showAllCategories
                          ? Icons.keyboard_arrow_up_rounded
                          : Icons.keyboard_arrow_down_rounded,
                      color: AppColors.lightText,
                    ),
                    label: Text(
                      _showAllCategories ? 'SHOW LESS' : 'SHOW MORE',
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            color: AppColors.lightText,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.8,
                          ),
                    ),
                  ),
                ),
              ],
            ],
          );
        },
      ),
    );
  }

  Widget _outlinedCapsTitle(String text) {
    final base = Theme.of(context).textTheme.titleLarge?.copyWith(
          fontWeight: FontWeight.w900,
          fontSize: 30,
          letterSpacing: 1.7,
        );
    return Center(
      child: Stack(
        alignment: Alignment.center,
        children: [
          Text(
            text,
            textAlign: TextAlign.center,
            style: base?.copyWith(
              foreground: Paint()
                ..style = PaintingStyle.stroke
                ..strokeWidth = 4.4
                ..color = Colors.black,
            ),
          ),
          Text(
            text,
            textAlign: TextAlign.center,
            style: base?.copyWith(
              color: Colors.white,
              shadows: [
                Shadow(
                  color: Colors.black.withValues(alpha: 0.2),
                  blurRadius: 2.6,
                  offset: const Offset(0.6, 0.8),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _categoryShowcaseCard({
    required String categoryKey,
    required double width,
    required double height,
    required Color textColor,
    required Color subColor,
    bool featured = false,
  }) {
    final title = categoryDisplay(categoryKey);
    return SizedBox(
      width: width,
      height: height,
      child: InkWell(
        onTap: () {
          HapticFeedback.lightImpact();
          context.push(
            '${RoutePaths.equipmentMarketplace}?category=$categoryKey',
          );
        },
        borderRadius: BorderRadius.circular(20),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: context.isDark ? 0.2 : 0.08),
                blurRadius: 8,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.sm,
                  AppSpacing.sm,
                  AppSpacing.sm,
                  AppSpacing.xs,
                ),
                child: Text(
                  title,
                  textAlign: TextAlign.center,
                  maxLines: featured ? 2 : 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: textColor,
                        fontWeight: FontWeight.w800,
                        height: 1.15,
                      ),
                ),
              ),
              Expanded(
                child: ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    bottom: Radius.circular(20),
                  ),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Image.network(
                        _categoryImageUrl(categoryKey),
                        fit: BoxFit.cover,
                        filterQuality: FilterQuality.low,
                        errorBuilder: (_, __, ___) => Image.network(
                          _categoryFallbackImageUrl(categoryKey),
                          fit: BoxFit.cover,
                          filterQuality: FilterQuality.low,
                          errorBuilder: (_, __, ___) => Container(
                            color: const Color(0xFFECEFF3),
                            alignment: Alignment.center,
                            child: Icon(
                              Icons.agriculture_rounded,
                              size: 34,
                              color: AppColors.primaryDark.withValues(alpha: 0.6),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _categoryImageUrl(String categoryKey) {
    const urls = <String, String>{
      'land_preparation': 'https://loremflickr.com/640/420/tractor,field?lock=701',
      'sowing_planting': 'https://loremflickr.com/640/420/seed,drill,farm?lock=702',
      'irrigation': 'https://loremflickr.com/640/420/irrigation,water,farm?lock=708',
      'crop_protection': 'https://loremflickr.com/640/420/sprayer,crop,agriculture?lock=703',
      'harvesting': 'https://loremflickr.com/640/420/harvester,wheat?lock=704',
      'horticulture': 'https://loremflickr.com/640/420/orchard,horticulture?lock=705',
      'transport': 'https://loremflickr.com/640/420/tractor,trailer?lock=706',
      'drone_technology': 'https://loremflickr.com/640/420/drone,agriculture?lock=707',
    };
    return urls[categoryKey] ??
        'https://loremflickr.com/640/420/agriculture,machinery?lock=720';
  }

  String _categoryFallbackImageUrl(String categoryKey) {
    return 'https://picsum.photos/seed/${Uri.encodeComponent(categoryKey)}/640/420';
  }

  double _toDouble(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse((value ?? '').toString()) ?? 0;
  }

  int _toInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse((value ?? '').toString()) ?? 0;
  }

  int _resolveDiscount(
    Map<String, dynamic> item,
    Map<String, dynamic> rates,
    double price,
    double mrp,
  ) {
    final raw = _toInt(
      item['discount_percent'] ?? rates['discount_percent'] ?? item['discount'],
    );
    if (raw > 0) return raw;
    if (price <= 0 || mrp <= 0) return 0;
    return ((1 - (price / mrp)) * 100).round();
  }

  double _resolveRating(
    Map<String, dynamic> item,
    Map<String, dynamic> provider,
  ) {
    final raw = _toDouble(provider['rating'] ?? item['rating']);
    if (raw > 0) return raw.clamp(1.0, 5.0);
    return 0;
  }

  int _resolveReviewCount(
    Map<String, dynamic> item,
    Map<String, dynamic> provider,
  ) {
    final raw = _toInt(
      provider['review_count'] ?? provider['reviews'] ?? item['reviews_count'],
    );
    if (raw > 0) return raw;
    return 0;
  }

  int _resolveEta(
    Map<String, dynamic> item,
    Map<String, dynamic> provider,
  ) {
    final raw = _toInt(
      item['eta_mins'] ?? provider['eta_mins'] ?? item['delivery_minutes'],
    );
    if (raw > 0) return raw;
    return 0;
  }

  int _resolveStock(
    Map<String, dynamic> item,
    Map<String, dynamic> provider,
  ) {
    final raw = _toInt(
      item['units_available'] ?? item['stock_left'] ?? provider['stock_left'],
    );
    if (raw > 0) return raw;
    return 0;
  }

  String _formatMoney(double value) {
    if (value <= 0) return '0';
    if (value % 1 == 0) return value.toStringAsFixed(0);
    return value.toStringAsFixed(1);
  }

  String? _resolveImageUrl(
    Map<String, dynamic> item,
    Map<String, dynamic> provider,
  ) {
    const keys = <String>[
      'image_url',
      'imageUrl',
      'image',
      'thumbnail',
      'photo',
      'photo_url',
      'equipment_image',
      'logo_url',
    ];

    for (final key in keys) {
      final value = item[key] ?? provider[key];
      final url = value?.toString() ?? '';
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
    }
    return null;
  }

  Widget _providerImage({
    required String primaryUrl,
    required String seed,
  }) {
    final fallbackUrl = 'https://picsum.photos/seed/${Uri.encodeComponent(seed)}/640/420';

    return Image.network(
      primaryUrl,
      fit: BoxFit.cover,
      filterQuality: FilterQuality.low,
      errorBuilder: (_, __, ___) {
        final same = primaryUrl == fallbackUrl;
        if (!same) {
          return Image.network(
            fallbackUrl,
            fit: BoxFit.cover,
            filterQuality: FilterQuality.low,
            errorBuilder: (_, __, ___) => Image.asset(
              'assets/images/logo_light.png',
              fit: BoxFit.contain,
            ),
          );
        }
        return Image.asset(
          'assets/images/logo_light.png',
          fit: BoxFit.contain,
        );
      },
    );
  }

  Widget _miniStat({
    required String label,
    required String value,
    required Color cardColor,
    required Color textColor,
    required Color subColor,
  }) {
    return _glassCard(
      cardColor: cardColor,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: textColor,
                ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            value,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: subColor,
                ),
          ),
        ],
      ),
    );
  }
}

// ─── Data classes ─────────────────────────────────────────────────────────────

class _QuickAction {
  final IconData icon;
  final String label;
  final Color color;
  final String verdict;
  final String description;
  final VoidCallback onTap;

  const _QuickAction({
    required this.icon,
    required this.label,
    required this.color,
    required this.verdict,
    required this.description,
    required this.onTap,
  });
}

class _ScallopedCouponBanner extends StatelessWidget {
  final String text;
  final Color backgroundColor;
  final Color textColor;
  final Color borderColor;
  final Color shadowColor;
  final double height;
  final double cornerRadius;
  final double scallopRadius;
  final double scallopSpacing;
  final int? scallopCount;

  const _ScallopedCouponBanner({
    required this.text,
    required this.backgroundColor,
    required this.textColor,
    required this.borderColor,
    required this.shadowColor,
    this.height = 92,
    this.cornerRadius = 20,
    this.scallopRadius = 7,
    this.scallopSpacing = 8,
    this.scallopCount,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: height,
      child: CustomPaint(
        painter: _ScallopedCouponPainter(
          backgroundColor: backgroundColor,
          borderColor: borderColor,
          shadowColor: shadowColor,
          cornerRadius: cornerRadius,
          scallopRadius: scallopRadius,
          scallopSpacing: scallopSpacing,
          scallopCount: scallopCount,
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.lg,
            22,
            AppSpacing.lg,
            AppSpacing.md,
          ),
          child: Center(
            child: Text(
              text,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: textColor,
                    fontWeight: FontWeight.w900,
                    fontStyle: FontStyle.italic,
                    letterSpacing: 0.8,
                    shadows: const [
                      Shadow(
                        color: Colors.white,
                        blurRadius: 0,
                        offset: Offset(0.6, 0.6),
                      ),
                    ],
                  ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ScallopedCouponPainter extends CustomPainter {
  final Color backgroundColor;
  final Gradient? backgroundGradient;
  final Color borderColor;
  final Color shadowColor;
  final double cornerRadius;
  final double scallopRadius;
  final double scallopSpacing;
  final int? scallopCount;

  const _ScallopedCouponPainter({
    required this.backgroundColor,
    this.backgroundGradient,
    required this.borderColor,
    required this.shadowColor,
    required this.cornerRadius,
    required this.scallopRadius,
    required this.scallopSpacing,
    required this.scallopCount,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final basePath = Path()
      ..addRRect(
        RRect.fromRectAndRadius(
          Offset.zero & size,
          Radius.circular(cornerRadius),
        ),
      );

    final scallopPath = Path();
    final safeInset = cornerRadius + scallopRadius;
    final usableWidth =
        (size.width - (safeInset * 2)).clamp(0.0, double.infinity);
    final scallopDiameter = scallopRadius * 2;
    final step = scallopDiameter + scallopSpacing;

    int dynamicCount = 1;
    if (step > 0) {
      dynamicCount = ((usableWidth + scallopSpacing) / step).floor();
      if (dynamicCount < 1) dynamicCount = 1;
    }

    final count = scallopCount == null
        ? dynamicCount
        : (scallopCount! < 1 ? 1 : scallopCount!);

    final startX = safeInset;
    final endX = size.width - safeInset;

    for (var i = 0; i < count; i++) {
      final t = count == 1 ? 0.5 : i / (count - 1);
      final cx = startX + ((endX - startX) * t);
      scallopPath.addOval(
        Rect.fromCircle(center: Offset(cx, 0), radius: scallopRadius),
      );
    }

    final couponPath = Path.combine(
      PathOperation.difference,
      basePath,
      scallopPath,
    );

    canvas.drawShadow(couponPath, shadowColor, 10, false);

    final fillPaint = Paint()
      ..style = PaintingStyle.fill
      ..isAntiAlias = true;
    if (backgroundGradient != null) {
      fillPaint.shader = backgroundGradient!.createShader(Offset.zero & size);
    } else {
      fillPaint.color = backgroundColor;
    }
    canvas.drawPath(couponPath, fillPaint);

    canvas.drawPath(
      couponPath,
      Paint()
        ..color = borderColor
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2
        ..isAntiAlias = true,
    );
  }

  @override
  bool shouldRepaint(covariant _ScallopedCouponPainter oldDelegate) {
    return backgroundColor != oldDelegate.backgroundColor ||
        backgroundGradient != oldDelegate.backgroundGradient ||
        borderColor != oldDelegate.borderColor ||
        shadowColor != oldDelegate.shadowColor ||
        cornerRadius != oldDelegate.cornerRadius ||
        scallopRadius != oldDelegate.scallopRadius ||
        scallopSpacing != oldDelegate.scallopSpacing ||
        scallopCount != oldDelegate.scallopCount;
  }
}

class _ScallopedPanel extends StatelessWidget {
  final double height;
  final Color backgroundColor;
  final Gradient? backgroundGradient;
  final Color borderColor;
  final Color shadowColor;
  final double cornerRadius;
  final double scallopRadius;
  final double scallopSpacing;
  final Widget child;

  const _ScallopedPanel({
    required this.height,
    required this.backgroundColor,
    this.backgroundGradient,
    required this.borderColor,
    required this.shadowColor,
    required this.cornerRadius,
    required this.scallopRadius,
    required this.scallopSpacing,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: height,
      child: CustomPaint(
        painter: _ScallopedCouponPainter(
          backgroundColor: backgroundColor,
          backgroundGradient: backgroundGradient,
          borderColor: borderColor,
          shadowColor: shadowColor,
          cornerRadius: cornerRadius,
          scallopRadius: scallopRadius,
          scallopSpacing: scallopSpacing,
          scallopCount: null,
        ),
        child: child,
      ),
    );
  }
}