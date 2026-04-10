import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/models/equipment_model.dart';
import '../../../shared/services/ai_overview_service.dart';
import '../../../shared/services/equipment_service.dart';
import '../../../shared/services/personalization_service.dart';
import '../../../shared/widgets/ai_overview_card.dart';
import '../../../shared/widgets/error_view.dart';
import '../utils/equipment_utils.dart';
import '../widgets/equipment_shell.dart';
import '../../weather/widgets/glass_widgets.dart';

class EquipmentMarketplaceScreen extends ConsumerStatefulWidget {
  final String? initialCategory;
  final String? initialState;

  const EquipmentMarketplaceScreen({
    super.key,
    this.initialCategory,
    this.initialState,
  });

  @override
  ConsumerState<EquipmentMarketplaceScreen> createState() =>
      _EquipmentMarketplaceScreenState();
}

class _EquipmentMarketplaceScreenState
    extends ConsumerState<EquipmentMarketplaceScreen>
    with TickerProviderStateMixin {
  final TextEditingController _searchController = TextEditingController();

  TabController? _tabController;
  List<String> _categories = const [];
  List<EquipmentProvider> _providers = const [];
  List<Map<String, dynamic>> _farmerListings = const [];
  Map<String, dynamic> _profile = const {};

  String? _selectedState;
  String? _selectedCategory;
  String _sortBy = 'rate_asc';

  bool _aiLoading = false;
  bool _aiGenerated = false;
  bool _aiExpanded = false;
  String _aiSummary =
      'Generate AI overview for local equipment demand and pricing opportunities.';
  String _aiDetails =
      'Uses marketplace rates, farmer listings, and your active filters. Cached for 24 hours.';
  DateTime? _aiUpdatedAt;

  bool _loading = true;
  bool _refreshing = false;
  bool _filtersExpanded = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _selectedState = widget.initialState;
    _selectedCategory = widget.initialCategory;
    _searchController.addListener(() => setState(() {}));
    _loadCachedAiOverview();
    _primeData();
  }

  @override
  void dispose() {
    _tabController?.dispose();
    _searchController.dispose();
    super.dispose();
  }

  bool get _hasSnapshot {
    return _providers.isNotEmpty ||
        _farmerListings.isNotEmpty ||
        _categories.isNotEmpty ||
        _tabController != null;
  }

  Future<void> _primeData() async {
    await _loadData();
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
      Map<String, dynamic> profile = _profile;
      try {
        profile = await ref
            .read(personalizationServiceProvider)
            .getProfileContext();
      } catch (_) {
        profile = _profile;
      }

      final results = await Future.wait([
        svc.listRentalCategories(
          preferCache: !forceRefresh,
          forceRefresh: forceRefresh,
        ),
        svc.listRentalRatesFiltered(
          state: _selectedState,
          category: _selectedCategory,
          search: _searchController.text.trim().isEmpty
              ? null
              : _searchController.text.trim(),
          limit: 500,
          preferCache: !forceRefresh,
          forceRefresh: forceRefresh,
        ),
        svc.browseAllEquipment(
          preferCache: !forceRefresh,
          forceRefresh: forceRefresh,
        ),
      ]);
      if (!mounted) return;

      final categories = results[0] as List<String>;
      final data = results[1] as Map<String, dynamic>;
      final listings = results[2] as List<Map<String, dynamic>>;

      final rows =
          (data['rows'] as List?)?.cast<Map<String, dynamic>>() ?? const [];
      final parsed = rows
          .map(EquipmentProvider.fromJson)
          .toList(growable: false);
      final deduped = _dedupeProviders(parsed);

      _tabController?.dispose();
      final tabsLength = categories.length + 2;
      _tabController = TabController(length: tabsLength, vsync: this);
      _tabController!.addListener(() {
        if (!mounted) return;
        if (_tabController!.indexIsChanging) return;
        setState(() {});
      });

      final categoryIndex = _selectedCategory == null
          ? 0
          : (categories.indexWhere(
                  (e) => e.toLowerCase() == _selectedCategory!.toLowerCase(),
                ) +
                1);
      if (categoryIndex > 0 && categoryIndex < tabsLength - 1) {
        _tabController!.index = categoryIndex;
      }

      setState(() {
        _categories = categories;
        _providers = deduped;
        _farmerListings = listings
            .where(
              (e) =>
                  (e['status'] ?? '').toString().toLowerCase() == 'available',
            )
            .toList(growable: false);
        _profile = profile;
        _loading = false;
        _refreshing = false;
      });

      if (!_aiGenerated && !_aiLoading) {
        _generateAiOverview(forceRefresh: false);
      }
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
          'Latest sync failed. Showing recent cached results.',
          isError: true,
        );
      }
    }
  }

  Future<void> _loadCachedAiOverview() async {
    final cached = await ref
        .read(aiOverviewServiceProvider)
        .getCached('equipment_marketplace_overview_v1');
    if (!mounted || cached == null) return;
    setState(() {
      _aiSummary = cached.summary;
      _aiDetails = cached.details;
      _aiUpdatedAt = cached.updatedAt;
      _aiGenerated = true;
    });
  }

  Future<void> _generateAiOverview({bool forceRefresh = true}) async {
    if (_aiLoading) return;
    setState(() => _aiLoading = true);

    try {
      final snippets = <String>[];

      final district = (_profile['district'] ?? '').toString().trim();
      final state = (_profile['state'] ?? '').toString().trim();
      if (district.isNotEmpty || state.isNotEmpty) {
        snippets.add(
          'Profile location: ${[district, state].where((e) => e.isNotEmpty).join(', ')}.',
        );
      }

      if (_selectedState != null && _selectedState!.isNotEmpty) {
        snippets.add('Active state filter: $_selectedState.');
      }
      if (_selectedCategory != null && _selectedCategory!.isNotEmpty) {
        snippets.add(
          'Active category filter: ${categoryDisplay(_selectedCategory)}.',
        );
      }

      snippets.add('Live providers loaded: ${_providers.length}.');
      snippets.add('Farmer listings loaded: ${_farmerListings.length}.');

      for (final p in _providers.take(6)) {
        snippets.add(
          '${p.equipmentName} by ${p.provider.name} in ${p.location.district}, ${p.location.state} at ${rateDisplay(p.rates)}.',
        );
      }

      for (final listing in _farmerListings.take(4)) {
        final name = (listing['name'] ?? 'equipment').toString();
        final location = (listing['location'] ?? 'unknown').toString();
        final rate = (listing['rate_per_day'] as num?)?.toDouble();
        final rateText = rate == null
            ? 'price on request'
            : 'INR ${rate.toStringAsFixed(0)}/day';
        snippets.add('$name in $location at $rateText.');
      }

      if (snippets.isEmpty) {
        snippets.add(
          'No marketplace rows loaded yet. Generate advice based on general equipment demand.',
        );
      }

      final result = await ref
          .read(aiOverviewServiceProvider)
          .generate(
            key: 'equipment_marketplace_overview_v1',
            pageName: 'Equipment Marketplace',
            languageCode: context.locale.languageCode,
            nearbyData: snippets,
            capabilities: const <String>[
              'Browse equipment providers by category and state filters',
              'Open provider details and compare daily rental rates',
              'Open farmer listings and view listing details',
              'Track rentals from My Bookings screen',
              'Ask AI in chat to plan equipment booking decisions',
            ],
            forceRefresh: forceRefresh,
          );

      if (!mounted) return;
      setState(() {
        _aiSummary = result.summary;
        _aiDetails = result.details;
        _aiUpdatedAt = result.updatedAt;
        _aiGenerated = true;
        _aiLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _aiLoading = false);
      context.showSnack('Failed to generate AI overview: $e'.tr(), isError: true);
    }
  }

  String _aiUpdatedLabel() {
    final dt = _aiUpdatedAt;
    if (dt == null) return 'Not generated yet'.tr();
    final hh = dt.hour.toString().padLeft(2, '0');
    final mm = dt.minute.toString().padLeft(2, '0');
    return '${'Updated at'.tr()} $hh:$mm';
  }

  void _openAiActionCard(String actionText) {
    final query = Uri.encodeQueryComponent(actionText);
    context.push('${RoutePaths.chat}?agent=general&q=$query');
  }

  List<EquipmentProvider> _dedupeProviders(List<EquipmentProvider> items) {
    final seen = <String>{};
    final out = <EquipmentProvider>[];
    for (final row in items) {
      final key =
          '${row.providerId}|${row.equipmentName}|${row.location.district}'
              .toLowerCase();
      if (seen.contains(key)) continue;
      seen.add(key);
      out.add(row);
    }
    return out;
  }

  List<EquipmentProvider> _providersForCategory(String? category) {
    var rows = _providers;
    if (category != null && category.isNotEmpty) {
      rows = rows
          .where((p) => p.category.toLowerCase() == category.toLowerCase())
          .toList(growable: false);
    }

    final search = _searchController.text.trim().toLowerCase();
    if (search.isNotEmpty) {
      rows = rows
          .where((p) {
            return p.equipmentName.toLowerCase().contains(search) ||
                p.provider.name.toLowerCase().contains(search) ||
                p.location.display.toLowerCase().contains(search);
          })
          .toList(growable: false);
    }

    if (_selectedState != null && _selectedState!.isNotEmpty) {
      rows = rows
          .where(
            (p) =>
                p.location.state.toLowerCase() == _selectedState!.toLowerCase(),
          )
          .toList(growable: false);
    }

    if (_sortBy == 'rate_desc') {
      rows = [...rows]
        ..sort((a, b) => (b.rates.daily ?? 0).compareTo(a.rates.daily ?? 0));
    } else if (_sortBy == 'availability') {
      rows = [...rows]
        ..sort((a, b) => a.availability.compareTo(b.availability));
    } else {
      rows = [...rows]
        ..sort((a, b) => (a.rates.daily ?? 0).compareTo(b.rates.daily ?? 0));
    }

    return rows;
  }

  Map<String, List<EquipmentProvider>> _groupByEquipmentName(
    List<EquipmentProvider> rows,
  ) {
    final map = <String, List<EquipmentProvider>>{};
    for (final row in rows) {
      final key = row.equipmentName.trim().toLowerCase();
      map.putIfAbsent(key, () => []);
      map[key]!.add(row);
    }
    return map;
  }

  @override
  Widget build(BuildContext context) {
    final tabs = [
      'All',
      ..._categories.map(categoryDisplay),
      'Farmer Listings',
    ];

    return Scaffold(
      body: EquipmentPageBackground(
        child: SafeArea(
          bottom: false,
          child: _loading && !_hasSnapshot
              ? const EquipmentContentSkeleton(cardCount: 8)
              : _error != null && !_hasSnapshot
              ? ErrorView(
                  message: _error!,
                  onRetry: () => _loadData(forceRefresh: true),
                )
              : _tabController == null
              ? const SizedBox.shrink()
              : Column(
                  children: [
                    _marketplaceHeader(tabs),
                    Expanded(
                      child: TabBarView(
                        controller: _tabController,
                        children: List.generate(tabs.length, (index) {
                          if (index == tabs.length - 1) {
                            return _farmerListingsTab();
                          }

                          final rawCategory = index == 0
                              ? null
                              : _categories[index - 1];
                          final rows = _providersForCategory(rawCategory);
                          return _providerTab(rows);
                        }),
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _marketplaceHeader(List<String> tabs) {
    final activeIndex = _tabController?.index ?? 0;
    final activeTab = (activeIndex >= 0 && activeIndex < tabs.length)
        ? tabs[activeIndex]
        : 'All';
    final subtitle = activeTab == 'Farmer Listings'
        ? 'Farmer listings and local ownership offers'
        : 'Live rental rates with smart regional filters';

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.sm,
        AppSpacing.lg,
        AppSpacing.sm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            height: 46,
            child: Stack(
              alignment: Alignment.center,
              children: [
                Align(
                  alignment: Alignment.centerLeft,
                  child: _headerActionButton(
                    icon: Icons.arrow_back_rounded,
                    onTap: () => Navigator.of(context).maybePop(),
                  ),
                ),
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Equipment Marketplace',
                      textAlign: TextAlign.center,
                      style: context.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: context.colors.onSurface,
                      ),
                    ),
                    Text(
                      subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                      style: context.textTheme.bodySmall?.copyWith(
                        color: context.appColors.textSecondary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                Align(
                  alignment: Alignment.centerRight,
                  child: _headerActionButton(
                    icon: Icons.refresh_rounded,
                    onTap: () => _loadData(forceRefresh: true),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Container(
            decoration: BoxDecoration(
              color: Colors.white.withValues(
                alpha: context.isDark ? 0.08 : 0.6,
              ),
              borderRadius: BorderRadius.circular(AppRadius.full),
              border: Border.all(color: context.appColors.border),
            ),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'equipment_marketplace.search'.tr(),
                hintStyle: context.textTheme.bodyMedium?.copyWith(
                  color: context.appColors.textSecondary,
                ),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: AppSpacing.sm,
                ),
                prefixIcon: Icon(
                  Icons.search_rounded,
                  color: context.appColors.textSecondary,
                ),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: Colors.white.withValues(
                alpha: context.isDark ? 0.08 : 0.55,
              ),
              borderRadius: BorderRadius.circular(AppRadius.full),
              border: Border.all(color: context.appColors.border),
            ),
            child: TabBar(
              controller: _tabController,
              isScrollable: true,
              dividerColor: Colors.transparent,
              tabAlignment: TabAlignment.start,
              indicatorSize: TabBarIndicatorSize.tab,
              indicator: BoxDecoration(
                borderRadius: BorderRadius.circular(AppRadius.full),
                color: Colors.white.withValues(
                  alpha: context.isDark ? 0.16 : 0.9,
                ),
              ),
              labelStyle: context.textTheme.bodySmall?.copyWith(
                fontWeight: FontWeight.w700,
              ),
              labelColor: context.colors.onSurface,
              unselectedLabelColor: context.appColors.textSecondary,
              tabs: tabs.map((e) => Tab(text: e)).toList(growable: false),
            ),
          ),
        ],
      ),
    );
  }

  Widget _headerActionButton({
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadius.full),
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: context.isDark ? 0.08 : 0.72),
          shape: BoxShape.circle,
          border: Border.all(color: context.appColors.border),
        ),
        child: Icon(icon, size: 20, color: context.colors.onSurface),
      ),
    );
  }

  Widget _marketplaceTopSection() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.lg,
        AppSpacing.lg,
        AppSpacing.sm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          EquipmentRefreshStrip(
            refreshing: _refreshing,
            label: 'Refreshing latest rental offers...',
          ),
          const SizedBox(height: AppSpacing.sm),
          _aiOverviewSection(),
          const SizedBox(height: AppSpacing.sm),
          if (_error != null && _hasSnapshot) ...[
            Container(
              width: double.infinity,
              margin: const EdgeInsets.only(bottom: AppSpacing.sm),
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: AppColors.warning.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: Text(
                'Showing cached results. Pull down to try syncing again.',
                style: context.textTheme.bodySmall?.copyWith(
                  color: AppColors.warning,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
          _activeFiltersRow(),
        ],
      ),
    );
  }

  Widget _activeFiltersRow() {
    final chips = <Widget>[];

    if (_selectedState != null && _selectedState!.trim().isNotEmpty) {
      chips.add(
        InputChip(
          label: Text(_selectedState!),
          onDeleted: () {
            setState(() => _selectedState = null);
            _loadData();
          },
        ),
      );
    }

    if (_selectedCategory != null && _selectedCategory!.trim().isNotEmpty) {
      chips.add(
        InputChip(
          label: Text(categoryDisplay(_selectedCategory)),
          onDeleted: () {
            setState(() => _selectedCategory = null);
            _loadData();
          },
        ),
      );
    }

    if (_sortBy != 'rate_asc') {
      chips.add(
        InputChip(
          label: Text(_sortBy == 'rate_desc' ? 'High to Low' : 'Availability'),
          onDeleted: () => setState(() => _sortBy = 'rate_asc'),
        ),
      );
    }

    if (_searchController.text.trim().isNotEmpty) {
      chips.add(
        InputChip(
          label: Text('"${_searchController.text.trim()}"'),
          onDeleted: () => _searchController.clear(),
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: context.isDark ? 0.08 : 0.6),
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: context.appColors.border),
      ),
      child: Column(
        children: [
          InkWell(
            borderRadius: BorderRadius.circular(AppRadius.md),
            onTap: () => setState(() => _filtersExpanded = !_filtersExpanded),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm,
                vertical: AppSpacing.sm,
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.tune_rounded,
                    color: context.appColors.info,
                    size: 18,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      chips.isEmpty
                          ? 'Filters'
                          : 'Filters (${chips.length} active)',
                      style: context.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: context.colors.onSurface,
                      ),
                    ),
                  ),
                  Icon(
                    _filtersExpanded
                        ? Icons.keyboard_arrow_up_rounded
                        : Icons.keyboard_arrow_down_rounded,
                    color: context.appColors.textSecondary,
                  ),
                ],
              ),
            ),
          ),
          AnimatedCrossFade(
            firstChild: const SizedBox.shrink(),
            secondChild: Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.sm,
                0,
                AppSpacing.sm,
                AppSpacing.sm,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: AppSpacing.sm,
                    runSpacing: AppSpacing.sm,
                    children: [
                      PopupMenuButton<String>(
                        onSelected: (value) {
                          setState(() {
                            _selectedState = value == '__all__' ? null : value;
                          });
                        },
                        itemBuilder: (_) => [
                          PopupMenuItem<String>(
                            value: '__all__',
                            child: Text('All states'.tr()),
                          ),
                          ...indianStates.map(
                            (state) => PopupMenuItem<String>(
                              value: state,
                              child: Text(state),
                            ),
                          ),
                        ],
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.sm,
                            vertical: AppSpacing.xs,
                          ),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(AppRadius.full),
                            border: Border.all(color: context.appColors.border),
                            color: Colors.white.withValues(
                              alpha: context.isDark ? 0.08 : 0.7,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.location_on_outlined, size: 16),
                              const SizedBox(width: AppSpacing.xs),
                              Text(
                                _selectedState == null
                                    ? 'All states'.tr()
                                    : _selectedState!,
                                style: context.textTheme.bodySmall?.copyWith(
                                  color: context.colors.onSurface,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(width: AppSpacing.xs),
                              const Icon(Icons.expand_more_rounded, size: 16),
                            ],
                          ),
                        ),
                      ),
                      PopupMenuButton<String>(
                        onSelected: (value) {
                          setState(() {
                            _selectedCategory = value == '__all__'
                                ? null
                                : value;
                          });
                        },
                        itemBuilder: (_) => [
                          PopupMenuItem<String>(
                            value: '__all__',
                            child: Text('All categories'.tr()),
                          ),
                          ..._categories.map(
                            (category) => PopupMenuItem<String>(
                              value: category,
                              child: Text(categoryDisplay(category)),
                            ),
                          ),
                        ],
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.sm,
                            vertical: AppSpacing.xs,
                          ),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(AppRadius.full),
                            border: Border.all(color: context.appColors.border),
                            color: Colors.white.withValues(
                              alpha: context.isDark ? 0.08 : 0.7,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.category_outlined, size: 16),
                              const SizedBox(width: AppSpacing.xs),
                              Text(
                                _selectedCategory == null
                                    ? 'All categories'.tr()
                                    : categoryDisplay(_selectedCategory),
                                style: context.textTheme.bodySmall?.copyWith(
                                  color: context.colors.onSurface,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(width: AppSpacing.xs),
                              const Icon(Icons.expand_more_rounded, size: 16),
                            ],
                          ),
                        ),
                      ),
                      PopupMenuButton<String>(
                        onSelected: (value) {
                          setState(() => _sortBy = value);
                        },
                        itemBuilder: (_) => [
                          PopupMenuItem<String>(
                            value: 'rate_asc',
                            child: Text('Sort: Low to High'.tr()),
                          ),
                          PopupMenuItem<String>(
                            value: 'rate_desc',
                            child: Text('Sort: High to Low'.tr()),
                          ),
                          PopupMenuItem<String>(
                            value: 'availability',
                            child: Text('Sort: Availability'.tr()),
                          ),
                        ],
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.sm,
                            vertical: AppSpacing.xs,
                          ),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(AppRadius.full),
                            border: Border.all(color: context.appColors.border),
                            color: Colors.white.withValues(
                              alpha: context.isDark ? 0.08 : 0.7,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.sort_rounded, size: 16),
                              const SizedBox(width: AppSpacing.xs),
                              Text(
                                _sortBy == 'rate_desc'
                                    ? 'High to Low'.tr()
                                    : _sortBy == 'availability'
                                    ? 'Availability'.tr()
                                    : 'Low to High'.tr(),
                                style: context.textTheme.bodySmall?.copyWith(
                                  color: context.colors.onSurface,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(width: AppSpacing.xs),
                              const Icon(Icons.expand_more_rounded, size: 16),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  if (chips.isNotEmpty)
                    Wrap(
                      spacing: AppSpacing.sm,
                      runSpacing: AppSpacing.sm,
                      children: chips,
                    ),
                  const SizedBox(height: AppSpacing.sm),
                  Row(
                    children: [
                      OutlinedButton.icon(
                        onPressed: () {
                          HapticFeedback.lightImpact();
                          setState(() {
                            _selectedState = null;
                            _selectedCategory = null;
                            _sortBy = 'rate_asc';
                            _searchController.clear();
                          });
                          _loadData(forceRefresh: true);
                        },
                        icon: const Icon(Icons.clear_all_rounded),
                        label: Text('Clear'.tr()),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            HapticFeedback.lightImpact();
                            _loadData(forceRefresh: true);
                          },
                          style: OutlinedButton.styleFrom(
                            foregroundColor: context.colors.onSurface,
                            side: BorderSide(color: context.appColors.border),
                          ),
                          icon: const Icon(Icons.check_circle_outline_rounded),
                          label: Text('Apply Filters'.tr()),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            crossFadeState: _filtersExpanded
                ? CrossFadeState.showSecond
                : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 180),
          ),
        ],
      ),
    );
  }

  Widget _aiOverviewSection() {
    return AiOverviewCard(
      summary: _aiSummary,
      details: _aiDetails,
      expanded: _aiExpanded,
      loading: _aiLoading,
      updatedLabel: _aiUpdatedLabel(),
      onToggleExpanded: () => setState(() => _aiExpanded = !_aiExpanded),
      onGenerateFresh: () => _generateAiOverview(forceRefresh: true),
      onActionTap: _openAiActionCard,
    );
  }

  Widget _providerTab(List<EquipmentProvider> rows) {
    if (rows.isEmpty) {
      return RefreshIndicator(
        onRefresh: () => _loadData(forceRefresh: true),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            _marketplaceTopSection(),
            const SizedBox(height: AppSpacing.lg),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  EmptyView(
                    icon: Icons.search_off_rounded,
                    title: 'equipment_marketplace.empty_title'.tr(),
                    subtitle: 'equipment_marketplace.empty_subtitle'.tr(),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  OutlinedButton(
                    onPressed: () {
                      setState(() {
                        _selectedState = null;
                        _selectedCategory = null;
                        _sortBy = 'rate_asc';
                      });
                      _searchController.clear();
                      _loadData(forceRefresh: true);
                    },
                    child: Text('Clear Filters'.tr()),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
          ],
        ),
      );
    }

    final grouped = _groupByEquipmentName(rows);
    final groups = grouped.entries.toList(growable: false)
      ..sort((a, b) => a.key.compareTo(b.key));

    return RefreshIndicator(
      onRefresh: () => _loadData(forceRefresh: true),
      child: ListView.builder(
        padding: const EdgeInsets.only(bottom: AppSpacing.lg),
        itemCount: groups.length + 1,
        itemBuilder: (_, i) {
          if (i == 0) {
            return _marketplaceTopSection();
          }

          final entry = groups[i - 1];
          final providers = [...entry.value]
            ..sort((a, b) {
              final aRate = a.rates.daily ?? a.rates.hourly ?? 0;
              final bRate = b.rates.daily ?? b.rates.hourly ?? 0;
              return aRate.compareTo(bRate);
            });
          final sample = providers.first;
          final preview = providers.take(3).toList(growable: false);
          final rates = providers
              .map((e) => e.rates.daily ?? e.rates.hourly)
              .whereType<double>()
              .where((e) => e > 0)
              .toList(growable: false);
          final minRate = rates.isEmpty
              ? 0
              : rates.reduce((a, b) => a < b ? a : b);
          final maxRate = rates.isEmpty
              ? 0
              : rates.reduce((a, b) => a > b ? a : b);
          final accent = categoryColor(sample.category);

          return Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              0,
              AppSpacing.lg,
              AppSpacing.md,
            ),
            child: _choiceStyleCard(
              onTap: () {
                HapticFeedback.lightImpact();
                final encoded = Uri.encodeComponent(sample.equipmentName);
                final cat = Uri.encodeComponent(sample.category);
                ref
                    .read(equipmentServiceProvider)
                    .warmRentalRateDetailBundle(
                      equipmentName: sample.equipmentName,
                      state: _selectedState,
                    );
                context.push(
                  '${RoutePaths.rentalRateDetail}?name=$encoded&category=$cat',
                );
              },
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  color: accent.withValues(alpha: 0.08),
                ),
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(categoryIcon(sample.category), color: accent),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: Text(
                            sample.equipmentName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: context.textTheme.bodyMedium?.copyWith(
                              color: context.colors.onSurface,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        Icon(
                          Icons.chevron_right_rounded,
                          color: context.appColors.textSecondary,
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      'EXPLORE',
                      style: context.textTheme.titleSmall?.copyWith(
                        color: accent,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      minRate > 0
                          ? '${providers.length} providers • ₹${minRate.toStringAsFixed(0)} - ₹${maxRate.toStringAsFixed(0)} per day'
                          : '${providers.length} providers • Contact for live pricing',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: context.textTheme.bodySmall?.copyWith(
                        color: context.colors.onSurface,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Wrap(
                      spacing: AppSpacing.xs,
                      runSpacing: AppSpacing.xs,
                      children: preview
                          .map((p) {
                            return Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: AppSpacing.sm,
                                vertical: AppSpacing.xs,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(
                                  alpha: context.isDark ? 0.08 : 0.66,
                                ),
                                borderRadius: BorderRadius.circular(
                                  AppRadius.full,
                                ),
                                border: Border.all(
                                  color: Colors.white.withValues(
                                    alpha: context.isDark ? 0.2 : 0.8,
                                  ),
                                ),
                              ),
                              child: Text(
                                '${p.provider.name} • ${rateDisplay(p.rates)}',
                                style: context.textTheme.bodySmall?.copyWith(
                                  color: context.colors.onSurface,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            );
                          })
                          .toList(growable: false),
                    ),
                    if (providers.length > preview.length) ...[
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        '+${providers.length - preview.length} more providers',
                        style: context.textTheme.bodySmall?.copyWith(
                          color: context.appColors.textSecondary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _farmerListingsTab() {
    final search = _searchController.text.trim().toLowerCase();
    final rows = _farmerListings
        .where((e) {
          if (search.isEmpty) return true;
          return (e['name'] ?? '').toString().toLowerCase().contains(search) ||
              (e['location'] ?? '').toString().toLowerCase().contains(search);
        })
        .toList(growable: false);

    if (rows.isEmpty) {
      return RefreshIndicator(
        onRefresh: () => _loadData(forceRefresh: true),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            _marketplaceTopSection(),
            const SizedBox(height: AppSpacing.lg),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
              child: EmptyView(
                icon: Icons.agriculture_outlined,
                title: 'No farmer listings available',
                subtitle: 'Try clearing filters to see more equipment.',
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => _loadData(forceRefresh: true),
      child: ListView.builder(
        padding: const EdgeInsets.only(bottom: AppSpacing.lg),
        itemCount: rows.length + 1,
        itemBuilder: (_, i) {
          if (i == 0) {
            return _marketplaceTopSection();
          }

          final row = rows[i - 1];
          final type = (row['type'] ?? '').toString();
          final rate = (row['rate_per_day'] as num?)?.toDouble() ?? 0;
          final accent = categoryColor(type);

          return Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              0,
              AppSpacing.lg,
              AppSpacing.md,
            ),
            child: _choiceStyleCard(
              onTap: () {
                HapticFeedback.lightImpact();
                final id = Uri.encodeComponent((row['id'] ?? '').toString());
                final rawId = (row['id'] ?? '').toString();
                ref
                    .read(equipmentServiceProvider)
                    .warmEquipmentListingDetail(rawId);
                context.push('${RoutePaths.listingDetails}?id=$id');
              },
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  color: accent.withValues(alpha: 0.08),
                ),
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(categoryIcon(type), color: accent),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: Text(
                            (row['name'] ?? '').toString(),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: context.textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                              color: context.colors.onSurface,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      'MANAGE',
                      style: context.textTheme.titleSmall?.copyWith(
                        color: accent,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      '${(row['location'] ?? '').toString()} • ₹${rate.toStringAsFixed(0)}/day',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: context.textTheme.bodySmall?.copyWith(
                        color: context.colors.onSurface,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _choiceStyleCard({required Widget child, VoidCallback? onTap}) {
    final cardColor = context.isDark
        ? AppColors.darkCard.withValues(alpha: 0.72)
        : Colors.white.withValues(alpha: 0.56);

    return Container(
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(18),
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
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: onTap,
          child: Padding(padding: const EdgeInsets.all(10), child: child),
        ),
      ),
    );
  }
}
