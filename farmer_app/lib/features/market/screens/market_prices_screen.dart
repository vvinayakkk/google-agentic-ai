import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/services/equipment_service.dart';
import '../../../shared/services/live_market_service.dart';
import '../../../shared/services/market_service.dart';

class MarketPricesScreen extends ConsumerStatefulWidget {
  const MarketPricesScreen({super.key});

  @override
  ConsumerState<MarketPricesScreen> createState() =>
      _MarketPricesScreenState();
}

enum _MarketSection { prices, mandis, listings }

class _MarketPricesScreenState extends ConsumerState<MarketPricesScreen> {
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _stateController = TextEditingController();

  static const List<String> _cropChips = <String>[
    'Rice',
    'Wheat',
    'Cotton',
    'Soybean',
    'Sugarcane',
  ];

  bool _loading = true;
  String? _error;
  bool _aiExpanded = false;
  _MarketSection _activeSection = _MarketSection.prices;
  String _stateFilter = '';
  String? _selectedCrop;

  List<Map<String, dynamic>> _prices = <Map<String, dynamic>>[];
  List<Map<String, dynamic>> _mandis = <Map<String, dynamic>>[];
  List<Map<String, dynamic>> _listings = <Map<String, dynamic>>[];

  @override
  void initState() {
    super.initState();
    _loadMarketplaceData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _stateController.dispose();
    super.dispose();
  }

  Future<void> _loadMarketplaceData({bool showLoader = true}) async {
    if (showLoader) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }

    String? loadError;

    final prices = await _safeLoad(
      action: () async {
        final res = await ref.read(marketServiceProvider).listPrices(
              crop: _selectedCrop,
              state: _stateFilter.isEmpty ? null : _stateFilter,
              perPage: 100,
            );
        final items = _extractItems(res, keys: const <String>['items', 'prices', 'data']);
        return _dedupePrices(items);
      },
      onError: (e) => loadError ??= _prettyError(e),
    );

    final mandis = await _safeLoad(
      action: () async {
        final res = await ref.read(marketServiceProvider).listMandis(
              state: _stateFilter.isEmpty ? null : _stateFilter,
              perPage: 150,
            );
        final items = _extractItems(res, keys: const <String>['items', 'mandis', 'data']);
        if (items.isNotEmpty) return _dedupeMandis(items);

        final liveItems = await ref.read(liveMarketServiceProvider).getLiveMandis(
              state: _stateFilter.isEmpty ? null : _stateFilter,
              limit: 200,
            );
        return _dedupeMandis(liveItems);
      },
      onError: (e) => loadError ??= _prettyError(e),
    );

    final resolvedMandis = mandis.isNotEmpty
        ? mandis
        : _dedupeMandis(_deriveMandisFromPrices(prices));

    final listings = await _safeLoad(
      action: () async {
        final items = await ref.read(equipmentServiceProvider).listEquipment();
        return _dedupeListings(items);
      },
      onError: (e) => loadError ??= _prettyError(e),
    );

    if (!mounted) return;
    setState(() {
      _prices = prices;
      _mandis = resolvedMandis;
      _listings = listings;
      _error = (_prices.isEmpty && _mandis.isEmpty && _listings.isEmpty)
          ? loadError
          : null;
      _loading = false;
    });
  }

  Future<List<Map<String, dynamic>>> _safeLoad({
    required Future<List<Map<String, dynamic>>> Function() action,
    required void Function(Object error) onError,
  }) async {
    try {
      return await action();
    } catch (error) {
      if (_isUnauthorized(error)) {
        await ref.read(authStateProvider.notifier).logout();
        if (mounted) context.go(RoutePaths.login);
      }
      onError(error);
      return <Map<String, dynamic>>[];
    }
  }

  bool _isUnauthorized(Object error) {
    if (error is DioException) {
      final status = error.response?.statusCode;
      return status == 401 || status == 403;
    }
    return false;
  }

  String _prettyError(Object error) {
    if (error is DioException) {
      final status = error.response?.statusCode;
      final message = _extractServerMessage(error.response?.data);
      if (status != null && message.isNotEmpty) {
        return 'Request failed ($status): $message';
      }
      if (status != null) {
        return 'Request failed with status $status';
      }
      if (error.message != null && error.message!.trim().isNotEmpty) {
        return error.message!.trim();
      }
    }
    return error.toString();
  }

  String _extractServerMessage(dynamic data) {
    if (data == null) return '';
    if (data is String) return data;
    if (data is Map<String, dynamic>) {
      for (final key in const <String>['detail', 'message', 'error']) {
        final value = data[key]?.toString().trim() ?? '';
        if (value.isNotEmpty) return value;
      }
    }
    return '';
  }

  List<Map<String, dynamic>> _mapList(dynamic raw) {
    if (raw is! List) return <Map<String, dynamic>>[];
    return raw
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }

  List<Map<String, dynamic>> _extractItems(
    Map<String, dynamic> data, {
    required List<String> keys,
  }) {
    for (final key in keys) {
      final list = _mapList(data[key]);
      if (list.isNotEmpty) return list;
    }
    return <Map<String, dynamic>>[];
  }

  List<Map<String, dynamic>> _dedupePrices(List<Map<String, dynamic>> items) {
    final map = <String, Map<String, dynamic>>{};
    for (final item in items) {
      final crop = (item['crop_name'] ?? '').toString().trim().toLowerCase();
      final mandi =
          (item['mandi_name'] ?? item['market'] ?? '').toString().trim().toLowerCase();
      final district = (item['district'] ?? '').toString().trim().toLowerCase();
      final state = (item['state'] ?? '').toString().trim().toLowerCase();
      final date = (item['date'] ?? '').toString().trim();
      final modal = (item['modal_price'] ?? '').toString().trim();
      final key = '$crop|$mandi|$district|$state|$date|$modal';
      map[key] = item;
    }
    final unique = map.values.toList();
    unique.sort((a, b) {
      final ad = _tryDate(a['date']) ?? DateTime.fromMillisecondsSinceEpoch(0);
      final bd = _tryDate(b['date']) ?? DateTime.fromMillisecondsSinceEpoch(0);
      return bd.compareTo(ad);
    });
    return unique;
  }

  List<Map<String, dynamic>> _dedupeMandis(List<Map<String, dynamic>> items) {
    final map = <String, Map<String, dynamic>>{};
    for (final item in items) {
      final name = (item['name'] ?? item['mandi_name'] ?? item['market'] ?? '')
          .toString()
          .trim()
          .toLowerCase();
      final district = (item['district'] ?? '').toString().trim().toLowerCase();
      final state = (item['state'] ?? '').toString().trim().toLowerCase();
      final key = '$name|$district|$state';
      if (name.isEmpty && district.isEmpty && state.isEmpty) continue;
      map[key] = item;
    }
    return map.values.toList();
  }

  List<Map<String, dynamic>> _deriveMandisFromPrices(List<Map<String, dynamic>> prices) {
    return prices
        .map((item) => <String, dynamic>{
              'name': (item['mandi_name'] ?? item['market'] ?? '').toString().trim(),
              'district': (item['district'] ?? '').toString().trim(),
              'state': (item['state'] ?? '').toString().trim(),
              'source': (item['source'] ?? 'derived').toString().trim(),
            })
        .where((item) => (item['name'] as String).isNotEmpty)
        .toList();
  }

  List<Map<String, dynamic>> _dedupeListings(List<Map<String, dynamic>> items) {
    final map = <String, Map<String, dynamic>>{};
    for (final item in items) {
      final id = (item['id'] ?? '').toString().trim();
      final name = (item['name'] ?? '').toString().trim().toLowerCase();
      final location = (item['location'] ?? '').toString().trim().toLowerCase();
      final key = id.isNotEmpty ? id : '$name|$location';
      map[key] = item;
    }
    return map.values.toList();
  }

  double? _toDouble(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value);
    return null;
  }

  String _formatPrice(dynamic value) {
    final parsed = _toDouble(value);
    if (parsed == null) return 'NA';
    return parsed.inr;
  }

  DateTime? _tryDate(dynamic value) {
    final str = value?.toString();
    if (str == null || str.isEmpty) return null;
    return DateTime.tryParse(str);
  }

  Future<void> _applyStateFilter() async {
    FocusScope.of(context).unfocus();
    setState(() {
      _stateFilter = _stateController.text.trim();
    });
    await _loadMarketplaceData();
  }

  Future<void> _toggleCrop(String crop) async {
    setState(() {
      _selectedCrop = _selectedCrop == crop ? null : crop;
    });
    await _loadMarketplaceData();
  }

  List<Map<String, dynamic>> get _filteredPrices {
    final query = _searchController.text.trim().toLowerCase();
    if (query.isEmpty) return _prices;

    return _prices.where((item) {
      final crop = item['crop_name']?.toString().toLowerCase() ?? '';
      final mandi =
          (item['mandi_name'] ?? item['market'])?.toString().toLowerCase() ?? '';
      final district = item['district']?.toString().toLowerCase() ?? '';
      final state = item['state']?.toString().toLowerCase() ?? '';
      return crop.contains(query) ||
          mandi.contains(query) ||
          district.contains(query) ||
          state.contains(query);
    }).toList();
  }

  List<Map<String, dynamic>> get _filteredMandis {
    final query = _searchController.text.trim().toLowerCase();
    if (query.isEmpty) return _mandis;

    return _mandis.where((item) {
      final name = (item['name'] ?? item['mandi_name'] ?? item['market'])
              ?.toString()
              .toLowerCase() ??
          '';
      final district = item['district']?.toString().toLowerCase() ?? '';
      final state = item['state']?.toString().toLowerCase() ?? '';
      return name.contains(query) || district.contains(query) || state.contains(query);
    }).toList();
  }

  List<Map<String, dynamic>> get _filteredListings {
    final query = _searchController.text.trim().toLowerCase();
    if (query.isEmpty) return _listings;

    return _listings.where((item) {
      final name = item['name']?.toString().toLowerCase() ?? '';
      final location = item['location']?.toString().toLowerCase() ?? '';
      final category = item['category']?.toString().toLowerCase() ?? '';
      return name.contains(query) || location.contains(query) || category.contains(query);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final cardColor = Colors.white.withValues(alpha: 0.56);
    final textColor = AppColors.lightText;
    final subColor = AppColors.lightTextSecondary;
    final iconBg = Colors.white.withValues(alpha: 0.56);

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? <Color>[AppColors.darkBackground, AppColors.darkSurface]
                : <Color>[AppColors.lightBackground, AppColors.lightSurface],
          ),
        ),
        child: SafeArea(
          bottom: false,
          child: Column(
            children: <Widget>[
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 12, 24, 0),
                child: SizedBox(
                  height: 48,
                  child: Stack(
                    alignment: Alignment.center,
                    children: <Widget>[
                      Align(
                        alignment: Alignment.centerLeft,
                        child: _topAction(
                          icon: Icons.arrow_back_rounded,
                          color: AppColors.primaryDark,
                          background: iconBg,
                          onTap: () => Navigator.of(context).maybePop(),
                        ),
                      ),
                      Text(
                        'Marketplace',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              color: textColor,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      Align(
                        alignment: Alignment.centerRight,
                        child: _topAction(
                          icon: Icons.refresh_rounded,
                          color: AppColors.primaryDark,
                          background: iconBg,
                          onTap: _loadMarketplaceData,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),
              _aiOverviewCard(cardColor: cardColor, textColor: textColor, subColor: subColor),
              const SizedBox(height: 14),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: TextField(
                  controller: _searchController,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: cardColor,
                    hintText: 'Search prices, mandis, and your listings',
                    hintStyle: TextStyle(color: subColor),
                    prefixIcon: const Icon(
                      Icons.search,
                      color: AppColors.primaryDark,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide:
                          BorderSide(color: Colors.white.withValues(alpha: 0.8)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide:
                          BorderSide(color: Colors.white.withValues(alpha: 0.8)),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 48,
                child: ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  scrollDirection: Axis.horizontal,
                  itemCount: _cropChips.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (_, index) {
                    final crop = _cropChips[index];
                    final selected = crop == _selectedCrop;
                    return FilterChip(
                      label: Text(crop),
                      selected: selected,
                      onSelected: (_) => _toggleCrop(crop),
                      backgroundColor: cardColor,
                      selectedColor: AppColors.primary.withValues(alpha: 0.22),
                      side: BorderSide(color: Colors.white.withValues(alpha: 0.8)),
                      checkmarkColor: AppColors.primaryDark,
                    );
                  },
                ),
              ),
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Row(
                  children: <Widget>[
                    Expanded(
                      child: TextField(
                        controller: _stateController,
                        onSubmitted: (_) => _applyStateFilter(),
                        decoration: InputDecoration(
                          filled: true,
                          fillColor: cardColor,
                          hintText: 'State filter (optional)',
                          hintStyle: TextStyle(color: subColor),
                          prefixIcon: const Icon(
                            Icons.location_on_outlined,
                            color: AppColors.primaryDark,
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(16),
                            borderSide: BorderSide(
                                color: Colors.white.withValues(alpha: 0.8)),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(16),
                            borderSide: BorderSide(
                                color: Colors.white.withValues(alpha: 0.8)),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    SizedBox(
                      height: 50,
                      child: ElevatedButton(
                        onPressed: _applyStateFilter,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white.withValues(alpha: 0.85),
                          foregroundColor: AppColors.lightText,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(40),
                          ),
                          side: BorderSide(
                            color: Colors.white.withValues(alpha: 0.8),
                          ),
                        ),
                        child: const Text(
                          'Apply',
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: _sectionTabs(cardColor: cardColor, textColor: textColor),
              ),
              const SizedBox(height: 12),
              Expanded(
                child: _buildContent(cardColor: cardColor, textColor: textColor, subColor: subColor),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _topAction({
    required IconData icon,
    required Color color,
    required Color background,
    required VoidCallback onTap,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.8)),
      ),
      child: IconButton(
        onPressed: onTap,
        icon: Icon(icon, color: color, size: 20),
      ),
    );
  }

  Widget _aiOverviewCard({
    required Color cardColor,
    required Color textColor,
    required Color subColor,
  }) {
    const summary =
        'As of March 2026, mandi arrivals are stable while modal prices remain firm for key cereals. '
        'Farmers in irrigated belts may hold produce for 5-7 days if local storage is available.';
    const full =
        'As of March 2026, mandi arrivals are stable while modal prices remain firm for key cereals. '
        'Farmers in irrigated belts may hold produce for 5-7 days if local storage is available. '
        'Cotton demand is healthy in ginning clusters, and soybean shows mixed signals due to uneven arrivals. '
        'For farmers planning a sale this week: compare nearby mandi spread, check transport cost before dispatch, '
        'and prioritize modal-price markets with lower wait time for auction unloading.';

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
  borderRadius: BorderRadius.circular(20),

  // 🔹 subtle gradient border feel
  border: Border.all(
    color: Colors.white.withValues(alpha: 0.5),
    width: 1,
  ),

  // 🔹 glass background
  color: cardColor,

  // 🔥 MAIN MAGIC — soft green glow
  boxShadow: <BoxShadow>[
    // existing soft shadow
    BoxShadow(
      color: AppColors.primaryDark.withValues(alpha: 0.08),
      blurRadius: 10,
      offset: const Offset(0, 4),
    ),

    // 🔥 NEW glow layer
    BoxShadow(
      color: AppColors.primary.withValues(alpha: 0.18),
      blurRadius: 24,
      spreadRadius: 1,
    ),

    // 🔥 optional edge glow (top highlight)
    BoxShadow(
      color: Colors.white.withValues(alpha: 0.25),
      blurRadius: 6,
      spreadRadius: -2,
      offset: const Offset(0, -2),
    ),
  ],
),
      child: Stack(
        children: <Widget>[
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                children: <Widget>[
                  Icon(
                    Icons.auto_awesome,
                    color: AppColors.primaryDark.withValues(alpha: 0.8),
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'AI Overview',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: textColor,
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                _aiExpanded ? full : summary,
                maxLines: _aiExpanded ? null : 3,
                overflow: _aiExpanded ? TextOverflow.visible : TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: textColor,
                      height: 1.35,
                    ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 40,
                child: ElevatedButton(
                  onPressed: () {
                    setState(() {
                      _aiExpanded = !_aiExpanded;
                    });
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white.withValues(alpha: 0.7),
                    foregroundColor: textColor,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(30),
                    ),
                    side: BorderSide(color: Colors.white.withValues(alpha: 0.85)),
                    elevation: 0,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: <Widget>[
                      Text(
                        _aiExpanded ? 'Show less' : 'Show more',
                        style: TextStyle(
                          color: textColor,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Icon(
                        _aiExpanded
                            ? Icons.keyboard_arrow_up_rounded
                            : Icons.chevron_right_rounded,
                        size: 18,
                        color: textColor,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _sectionTabs({required Color cardColor, required Color textColor}) {
    return Container(
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.8), width: 1.2),
      ),
      child: Row(
        children: <Widget>[
          _tabButton(_MarketSection.prices, 'Prices', Icons.trending_up, textColor),
          _tabButton(_MarketSection.mandis, 'Mandis', Icons.storefront, textColor),
          _tabButton(_MarketSection.listings, 'My Listings', Icons.sell_outlined, textColor),
        ],
      ),
    );
  }

  Widget _tabButton(
    _MarketSection section,
    String label,
    IconData icon,
    Color textColor,
  ) {
    final selected = _activeSection == section;
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () {
          setState(() {
            _activeSection = section;
          });
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: selected
                ? AppColors.primary.withValues(alpha: 0.18)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(18),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              Icon(
                icon,
                size: 16,
                color: selected ? AppColors.primaryDark : textColor,
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  color: selected ? AppColors.primaryDark : textColor,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildContent({
    required Color cardColor,
    required Color textColor,
    required Color subColor,
  }) {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    if (_error != null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 100),
        children: <Widget>[
          _glassCard(
            cardColor: cardColor,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'Could not load marketplace data',
                  style: TextStyle(
                    color: textColor,
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _error!,
                  style: TextStyle(color: subColor),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 42,
                  child: ElevatedButton(
                    onPressed: _loadMarketplaceData,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white.withValues(alpha: 0.85),
                      foregroundColor: AppColors.lightText,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(40),
                      ),
                    ),
                    child: const Text(
                      'Retry',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    }

    final items = switch (_activeSection) {
      _MarketSection.prices => _filteredPrices,
      _MarketSection.mandis => _filteredMandis,
      _MarketSection.listings => _filteredListings,
    };

    return RefreshIndicator(
      onRefresh: () => _loadMarketplaceData(showLoader: false),
      child: items.isEmpty
          ? ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 100),
              children: <Widget>[
                if (_activeSection == _MarketSection.listings)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _addListingButton(),
                  ),
                _glassCard(
                  cardColor: cardColor,
                  child: Column(
                    children: <Widget>[
                      Icon(
                        Icons.inbox_outlined,
                        color: subColor,
                        size: 36,
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'No data available for current filters',
                        style: TextStyle(
                          color: textColor,
                          fontWeight: FontWeight.w600,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ],
            )
          : ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 100),
              itemCount: items.length + (_activeSection == _MarketSection.listings ? 1 : 0),
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (_, index) {
                if (_activeSection == _MarketSection.listings && index == 0) {
                  return _addListingButton();
                }

                final item = _activeSection == _MarketSection.listings
                    ? items[index - 1]
                    : items[index];
                return switch (_activeSection) {
                  _MarketSection.prices => _priceCard(
                      item: item,
                      cardColor: cardColor,
                      textColor: textColor,
                      subColor: subColor,
                    ),
                  _MarketSection.mandis => _mandiCard(
                      item: item,
                      cardColor: cardColor,
                      textColor: textColor,
                      subColor: subColor,
                    ),
                  _MarketSection.listings => _listingCard(
                      item: item,
                      cardColor: cardColor,
                      textColor: textColor,
                      subColor: subColor,
                    ),
                };
              },
            ),
    );
  }

  Widget _addListingButton() {
    return SizedBox(
      height: 44,
      child: ElevatedButton.icon(
        onPressed: () => context.push(RoutePaths.addListing),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.white.withValues(alpha: 0.88),
          foregroundColor: AppColors.lightText,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(40),
          ),
          side: BorderSide(color: Colors.white.withValues(alpha: 0.8)),
        ),
        icon: const Icon(Icons.add_circle_outline_rounded),
        label: const Text(
          'Add Listing',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
    );
  }

  Widget _priceCard({
    required Map<String, dynamic> item,
    required Color cardColor,
    required Color textColor,
    required Color subColor,
  }) {
    final crop = item['crop_name']?.toString() ?? 'Crop';
    final mandi = (item['mandi_name'] ?? item['market'])?.toString() ?? 'Mandi';
    final district = item['district']?.toString() ?? '';
    final state = item['state']?.toString() ?? '';
    final source = item['source']?.toString() ?? '';
    final date = _tryDate(item['date']);

    final locationParts = <String>[mandi, district, state]
        .where((part) => part.trim().isNotEmpty)
        .toList();

    return _glassCard(
      cardColor: cardColor,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(
                child: Text(
                  crop,
                  style: TextStyle(
                    color: textColor,
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                  ),
                ),
              ),
              if (date != null)
                Text(
                  date.shortDate,
                  style: TextStyle(color: subColor, fontSize: 12),
                ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            locationParts.isEmpty ? 'Location unavailable' : locationParts.join(', '),
            style: TextStyle(color: subColor, fontSize: 12),
          ),
          const SizedBox(height: 12),
          Row(
            children: <Widget>[
              Expanded(
                child: _metric(
                  label: 'Min',
                  value: _formatPrice(item['min_price']),
                  textColor: textColor,
                  subColor: subColor,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _metric(
                  label: 'Modal',
                  value: _formatPrice(item['modal_price']),
                  textColor: textColor,
                  subColor: subColor,
                  emphasize: true,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _metric(
                  label: 'Max',
                  value: _formatPrice(item['max_price']),
                  textColor: textColor,
                  subColor: subColor,
                ),
              ),
            ],
          ),
          if (source.trim().isNotEmpty) ...<Widget>[
            const SizedBox(height: 10),
            Text(
              'Source: $source',
              style: TextStyle(color: subColor, fontSize: 11),
            ),
          ],
        ],
      ),
    );
  }

  Widget _metric({
    required String label,
    required String value,
    required Color textColor,
    required Color subColor,
    bool emphasize = false,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.58),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.85)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            label,
            style: TextStyle(color: subColor, fontSize: 11),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: TextStyle(
              color: emphasize ? AppColors.primaryDark : textColor,
              fontWeight: emphasize ? FontWeight.w800 : FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }

  Widget _mandiCard({
    required Map<String, dynamic> item,
    required Color cardColor,
    required Color textColor,
    required Color subColor,
  }) {
    final name = (item['name'] ?? item['mandi_name'] ?? item['market'])?.toString() ?? 'Mandi';
    final district = item['district']?.toString() ?? '';
    final state = item['state']?.toString() ?? '';
    final address = item['address']?.toString() ?? '';

    final locationParts = <String>[district, state]
        .where((part) => part.trim().isNotEmpty)
        .toList();

    return _glassCard(
      cardColor: cardColor,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            name,
            style: TextStyle(
              color: textColor,
              fontWeight: FontWeight.w700,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: <Widget>[
              Icon(Icons.location_on_outlined, size: 15, color: subColor),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  locationParts.isEmpty
                      ? 'District and state not available'
                      : locationParts.join(', '),
                  style: TextStyle(color: subColor),
                ),
              ),
            ],
          ),
          if (address.trim().isNotEmpty) ...<Widget>[
            const SizedBox(height: 8),
            Text(
              address,
              style: TextStyle(color: subColor, fontSize: 12),
            ),
          ],
        ],
      ),
    );
  }

  Widget _listingCard({
    required Map<String, dynamic> item,
    required Color cardColor,
    required Color textColor,
    required Color subColor,
  }) {
    final name = item['name']?.toString() ?? 'Listing';
    final location = item['location']?.toString() ?? 'Location not set';
    final rateDay = _toDouble(item['rate_per_day']);
    final rateHour = _toDouble(item['rate_per_hour']);
    final status = (item['status']?.toString().trim().isNotEmpty ?? false)
        ? item['status'].toString().toUpperCase()
        : ((item['available'] as bool? ?? true) ? 'ACTIVE' : 'PAUSED');

    final rateText = rateDay != null
        ? '${rateDay.inr}/day'
        : rateHour != null
            ? '${rateHour.inr}/hr'
            : 'Rate not set';

    return _glassCard(
      cardColor: cardColor,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(
                child: Text(
                  name,
                  style: TextStyle(
                    color: textColor,
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                  ),
                ),
              ),
              _statusTag(status),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            location,
            style: TextStyle(color: subColor, fontSize: 12),
          ),
          const SizedBox(height: 8),
          Text(
            rateText,
            style: const TextStyle(
              color: AppColors.primaryDark,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }

  Widget _statusTag(String status) {
    final isActive = status == 'ACTIVE';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isActive
            ? AppColors.primary.withValues(alpha: 0.16)
            : Colors.grey.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        status,
        style: TextStyle(
          color: isActive ? AppColors.primaryDark : Colors.grey.shade700,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  Widget _glassCard({required Color cardColor, required Widget child}) {
    return Container(
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.8), width: 1.2),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: AppColors.primaryDark.withValues(alpha: 0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: child,
      ),
    );
  }
}