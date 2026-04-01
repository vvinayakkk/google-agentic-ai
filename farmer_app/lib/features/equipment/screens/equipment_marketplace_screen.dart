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
import '../../../shared/widgets/app_card.dart';
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
  ConsumerState<EquipmentMarketplaceScreen> createState() => _EquipmentMarketplaceScreenState();
}

class _EquipmentMarketplaceScreenState extends ConsumerState<EquipmentMarketplaceScreen>
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
    return _providers.isNotEmpty || _farmerListings.isNotEmpty || _categories.isNotEmpty || _tabController != null;
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
        profile = await ref.read(personalizationServiceProvider).getProfileContext();
      } catch (_) {
        profile = _profile;
      }

      final categories = await svc.listRentalCategories(
        preferCache: !forceRefresh,
        forceRefresh: forceRefresh,
      );
      if (!mounted) return;
      final data = await svc.listRentalRatesFiltered(
        state: _selectedState,
        category: _selectedCategory,
        search: _searchController.text.trim().isEmpty ? null : _searchController.text.trim(),
        limit: 500,
        preferCache: !forceRefresh,
        forceRefresh: forceRefresh,
      );
      if (!mounted) return;
      final listings = await svc.browseAllEquipment(
        preferCache: !forceRefresh,
        forceRefresh: forceRefresh,
      );
      if (!mounted) return;

      final rows = (data['rows'] as List?)?.cast<Map<String, dynamic>>() ?? const [];
      final parsed = rows.map(EquipmentProvider.fromJson).toList(growable: false);
      final deduped = _dedupeProviders(parsed);

      _tabController?.dispose();
      final tabsLength = categories.length + 2;
      _tabController = TabController(length: tabsLength, vsync: this);

      final categoryIndex = _selectedCategory == null
          ? 0
          : (categories.indexWhere((e) => e.toLowerCase() == _selectedCategory!.toLowerCase()) + 1);
      if (categoryIndex > 0 && categoryIndex < tabsLength - 1) {
        _tabController!.index = categoryIndex;
      }

      setState(() {
        _categories = categories;
        _providers = deduped;
        _farmerListings = listings.where((e) => (e['status'] ?? '').toString().toLowerCase() == 'available').toList(growable: false);
        _profile = profile;
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
        context.showSnack('Latest sync failed. Showing recent cached results.', isError: true);
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
        snippets.add('Active category filter: ${categoryDisplay(_selectedCategory)}.');
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
        final rateText = rate == null ? 'price on request' : 'INR ${rate.toStringAsFixed(0)}/day';
        snippets.add('$name in $location at $rateText.');
      }

      if (snippets.isEmpty) {
        snippets.add('No marketplace rows loaded yet. Generate advice based on general equipment demand.');
      }

      final result = await ref.read(aiOverviewServiceProvider).generate(
            key: 'equipment_marketplace_overview_v1',
            pageName: 'Equipment Marketplace',
            languageCode: context.locale.languageCode,
            nearbyData: snippets,
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
      context.showSnack('Failed to generate AI overview: $e', isError: true);
    }
  }

  String _aiUpdatedLabel() {
    final dt = _aiUpdatedAt;
    if (dt == null) return 'Not generated yet';
    final hh = dt.hour.toString().padLeft(2, '0');
    final mm = dt.minute.toString().padLeft(2, '0');
    return 'Updated at $hh:$mm';
  }

  List<EquipmentProvider> _dedupeProviders(List<EquipmentProvider> items) {
    final seen = <String>{};
    final out = <EquipmentProvider>[];
    for (final row in items) {
      final key = '${row.providerId}|${row.equipmentName}|${row.location.district}'.toLowerCase();
      if (seen.contains(key)) continue;
      seen.add(key);
      out.add(row);
    }
    return out;
  }

  List<EquipmentProvider> _providersForCategory(String? category) {
    var rows = _providers;
    if (category != null && category.isNotEmpty) {
      rows = rows.where((p) => p.category.toLowerCase() == category.toLowerCase()).toList(growable: false);
    }

    final search = _searchController.text.trim().toLowerCase();
    if (search.isNotEmpty) {
      rows = rows.where((p) {
        return p.equipmentName.toLowerCase().contains(search) ||
            p.provider.name.toLowerCase().contains(search) ||
            p.location.display.toLowerCase().contains(search);
      }).toList(growable: false);
    }

    if (_selectedState != null && _selectedState!.isNotEmpty) {
      rows = rows.where((p) => p.location.state.toLowerCase() == _selectedState!.toLowerCase()).toList(growable: false);
    }

    if (_sortBy == 'rate_desc') {
      rows = [...rows]..sort((a, b) => (b.rates.daily ?? 0).compareTo(a.rates.daily ?? 0));
    } else if (_sortBy == 'availability') {
      rows = [...rows]..sort((a, b) => a.availability.compareTo(b.availability));
    } else {
      rows = [...rows]..sort((a, b) => (a.rates.daily ?? 0).compareTo(b.rates.daily ?? 0));
    }

    return rows;
  }

  Map<String, List<EquipmentProvider>> _groupByEquipmentName(List<EquipmentProvider> rows) {
    final map = <String, List<EquipmentProvider>>{};
    for (final row in rows) {
      final key = row.equipmentName.trim().toLowerCase();
      map.putIfAbsent(key, () => []);
      map[key]!.add(row);
    }
    return map;
  }

  Future<void> _openFilterSheet() async {
    String? tempState = _selectedState;
    String? tempCategory = _selectedCategory;
    String tempSort = _sortBy;
    String stateSearch = '';

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setLocal) {
            final states = indianStates
                .where((e) => e.toLowerCase().contains(stateSearch.toLowerCase()))
                .toList(growable: false);
            return SafeArea(
              child: Padding(
                padding: EdgeInsets.only(
                  left: AppSpacing.lg,
                  right: AppSpacing.lg,
                  top: AppSpacing.lg,
                  bottom: MediaQuery.of(ctx).viewInsets.bottom + AppSpacing.lg,
                ),
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('equipment_marketplace.filters'.tr(), style: context.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
                      const SizedBox(height: AppSpacing.md),
                      TextField(
                        decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search state'),
                        onChanged: (v) => setLocal(() => stateSearch = v),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      SizedBox(
                        height: 180,
                        child: ListView.builder(
                          itemCount: states.length,
                          itemBuilder: (_, i) {
                            final s = states[i];
                            return RadioListTile<String>(
                              title: Text(s),
                              value: s,
                              groupValue: tempState,
                              onChanged: (v) => setLocal(() => tempState = v),
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      Wrap(
                        spacing: AppSpacing.sm,
                        runSpacing: AppSpacing.sm,
                        children: _categories
                            .map((e) => ChoiceChip(
                                  label: Text(categoryDisplay(e)),
                                  selected: tempCategory == e,
                                  onSelected: (_) => setLocal(() => tempCategory = e),
                                ))
                            .toList(growable: false),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      DropdownButtonFormField<String>(
                        value: tempSort,
                        items: const [
                          DropdownMenuItem(value: 'rate_asc', child: Text('Daily rate ascending')),
                          DropdownMenuItem(value: 'rate_desc', child: Text('Daily rate descending')),
                          DropdownMenuItem(value: 'availability', child: Text('By availability')),
                        ],
                        onChanged: (v) => setLocal(() => tempSort = v ?? 'rate_asc'),
                        decoration: const InputDecoration(labelText: 'Sort'),
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () {
                                HapticFeedback.lightImpact();
                                setState(() {
                                  _selectedState = null;
                                  _selectedCategory = null;
                                  _sortBy = 'rate_asc';
                                });
                                Navigator.pop(ctx);
                                _loadData(forceRefresh: true);
                              },
                              child: Text('common.reset'.tr()),
                            ),
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: () {
                                HapticFeedback.lightImpact();
                                setState(() {
                                  _selectedState = tempState;
                                  _selectedCategory = tempCategory;
                                  _sortBy = tempSort;
                                });
                                Navigator.pop(ctx);
                                _loadData(forceRefresh: true);
                              },
                              child: Text('common.apply'.tr()),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final tabs = ['All', ..._categories.map(categoryDisplay), 'Farmer Listings'];

    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          onPressed: () => Navigator.of(context).maybePop(),
          icon: const Icon(Icons.arrow_back_rounded),
        ),
        titleSpacing: 0,
        title: Padding(
          padding: const EdgeInsets.only(right: AppSpacing.sm),
          child: TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'equipment_marketplace.search'.tr(),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.full)),
              contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
              prefixIcon: const Icon(Icons.search),
            ),
          ),
        ),
        actions: [
          IconButton(
            onPressed: _openFilterSheet,
            icon: const Icon(Icons.tune),
          ),
          IconButton(
            onPressed: () => _loadData(forceRefresh: true),
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
        bottom: _tabController == null
            ? null
            : TabBar(
                controller: _tabController,
                isScrollable: true,
                tabs: tabs.map((e) => Tab(text: e)).toList(growable: false),
              ),
      ),
      body: EquipmentPageBackground(
        child: _loading && !_hasSnapshot
            ? const EquipmentContentSkeleton(cardCount: 8)
            : _error != null && !_hasSnapshot
                ? ErrorView(message: _error!, onRetry: () => _loadData(forceRefresh: true))
                : _tabController == null
                    ? const SizedBox.shrink()
                    : Column(
                        children: [
                          Padding(
                            padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.lg, AppSpacing.lg, AppSpacing.sm),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                EquipmentHeaderCard(
                                  title: 'Equipment Explorer',
                                  subtitle: 'Live rental rates, nearby providers, and farmer-owned listings in one place.',
                                  icon: Icons.travel_explore,
                                  centerContent: true,
                                  badges: [
                                    EquipmentInfoBadge(label: '${_providers.length} offers'),
                                    EquipmentInfoBadge(label: '${_farmerListings.length} farmer listings'),
                                    const EquipmentInfoBadge(label: 'Redesigned'),
                                  ],
                                ),
                                const SizedBox(height: AppSpacing.sm),
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
                          ),
                          Expanded(
                            child: TabBarView(
                              controller: _tabController,
                              children: List.generate(tabs.length, (index) {
                                if (index == tabs.length - 1) {
                                  return _farmerListingsTab();
                                }

                                final rawCategory = index == 0 ? null : _categories[index - 1];
                                final rows = _providersForCategory(rawCategory);
                                return _providerTab(rows);
                              }),
                            ),
                          ),
                        ],
                      ),
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

    if (chips.isEmpty) {
      return Text(
        'Use filter and search to quickly narrow by state, category, and budget.',
        style: context.textTheme.bodySmall?.copyWith(color: context.appColors.textSecondary),
      );
    }

    return SizedBox(
      height: 36,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: chips.length,
        separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.sm),
        itemBuilder: (_, i) => chips[i],
      ),
    );
  }

  Widget _aiOverviewSection() {
    return GlassCard(
      featured: true,
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
            _aiUpdatedLabel(),
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
                      : () => _generateAiOverview(forceRefresh: true),
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
    );
  }

  Widget _providerTab(List<EquipmentProvider> rows) {
    if (rows.isEmpty) {
      return Center(
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
              child: const Text('Clear Filters'),
            ),
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
        padding: const EdgeInsets.all(AppSpacing.lg),
        itemCount: groups.length,
        itemBuilder: (_, i) {
          final entry = groups[i];
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
          final minRate = rates.isEmpty ? 0 : rates.reduce((a, b) => a < b ? a : b);
          final maxRate = rates.isEmpty ? 0 : rates.reduce((a, b) => a > b ? a : b);

          final accent = categoryColor(sample.category);
          final encoded = Uri.encodeComponent(sample.equipmentName);
          final cat = Uri.encodeComponent(sample.category);

          return Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.md),
            child: AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.sm),
                        decoration: BoxDecoration(
                          color: accent.withValues(alpha: 0.16),
                          borderRadius: BorderRadius.circular(AppRadius.md),
                        ),
                        child: Icon(categoryIcon(sample.category), color: accent),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              sample.equipmentName,
                              style: context.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: AppSpacing.xs),
                            Text(
                              providers.length == 1
                                  ? '1 provider available nearby'
                                  : '${providers.length} providers available nearby',
                              style: context.textTheme.bodySmall?.copyWith(
                                color: context.appColors.textSecondary,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.xs),
                            Text(
                              minRate > 0
                                  ? '₹${minRate.toStringAsFixed(0)}-${maxRate.toStringAsFixed(0)} per day'
                                  : 'Contact providers for live pricing',
                              style: context.textTheme.bodyMedium?.copyWith(
                                color: AppColors.success,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      availabilityBadge(sample.availability),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  ...preview.map((p) {
                    return InkWell(
                      onTap: () {
                        HapticFeedback.lightImpact();
                        final equipment = Uri.encodeComponent(p.equipmentName);
                        final category = Uri.encodeComponent(p.category);
                        context.push('${RoutePaths.rentalRateDetail}?name=$equipment&category=$category');
                      },
                      child: Container(
                        width: double.infinity,
                        margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                        padding: const EdgeInsets.all(AppSpacing.sm),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          color: context.appColors.card.withValues(alpha: 0.7),
                          border: Border.all(color: context.appColors.border),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    p.provider.name,
                                    style: context.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                                  ),
                                  const SizedBox(height: AppSpacing.xs),
                                  Text(
                                    '${p.location.district}, ${p.location.state}',
                                    style: context.textTheme.bodySmall?.copyWith(
                                      color: context.appColors.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: AppSpacing.sm),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
                              decoration: BoxDecoration(
                                color: AppColors.success.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(AppRadius.full),
                              ),
                              child: Text(
                                rateDisplay(p.rates),
                                style: context.textTheme.bodySmall?.copyWith(
                                  color: AppColors.success,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                  if (providers.length > preview.length)
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: Text(
                        '+${providers.length - preview.length} more providers in this cluster',
                        style: context.textTheme.bodySmall?.copyWith(
                          color: context.appColors.textSecondary,
                        ),
                      ),
                    ),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            HapticFeedback.lightImpact();
                            context.push('${RoutePaths.rentalRateDetail}?name=$encoded&category=$cat');
                          },
                          icon: const Icon(Icons.table_chart_outlined),
                          label: const Text('Compare Rates'),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () {
                            HapticFeedback.lightImpact();
                            context.push('${RoutePaths.rentalRateDetail}?name=$encoded&category=$cat');
                          },
                          icon: const Icon(Icons.flash_on_outlined),
                          label: const Text('Request Now'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _farmerListingsTab() {
    final search = _searchController.text.trim().toLowerCase();
    final rows = _farmerListings.where((e) {
      if (search.isEmpty) return true;
      return (e['name'] ?? '').toString().toLowerCase().contains(search) ||
          (e['location'] ?? '').toString().toLowerCase().contains(search);
    }).toList(growable: false);

    if (rows.isEmpty) {
      return Center(
        child: EmptyView(
          icon: Icons.agriculture_outlined,
          title: 'No farmer listings available',
          subtitle: 'Try clearing filters to see more equipment.',
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => _loadData(forceRefresh: true),
      child: ListView.builder(
        padding: const EdgeInsets.all(AppSpacing.lg),
        itemCount: rows.length,
        itemBuilder: (_, i) {
          final row = rows[i];
          final type = (row['type'] ?? '').toString();
          final rate = (row['rate_per_day'] as num?)?.toDouble() ?? 0;
          return Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.md),
            child: AppCard(
              onTap: () {
                HapticFeedback.lightImpact();
                final id = Uri.encodeComponent((row['id'] ?? '').toString());
                context.push('${RoutePaths.listingDetails}?id=$id');
              },
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.sm),
                    decoration: BoxDecoration(
                      color: categoryColor(type).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                    child: Icon(categoryIcon(type), color: categoryColor(type)),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text((row['name'] ?? '').toString(), style: context.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
                        Text((row['location'] ?? '').toString(), style: context.textTheme.bodySmall?.copyWith(color: context.appColors.textSecondary)),
                      ],
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
                        decoration: BoxDecoration(
                          color: AppColors.success.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(AppRadius.full),
                        ),
                        child: Text('₹${rate.toStringAsFixed(0)}/day', style: context.textTheme.bodySmall?.copyWith(color: AppColors.success, fontWeight: FontWeight.w800)),
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
                        decoration: BoxDecoration(
                          color: AppColors.info.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(AppRadius.full),
                        ),
                        child: Text('Farmer Listed', style: context.textTheme.bodySmall?.copyWith(color: AppColors.info, fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

}
