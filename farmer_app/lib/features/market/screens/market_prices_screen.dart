import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/services/ai_overview_service.dart';
import '../../../shared/services/equipment_service.dart';
import '../../../shared/services/live_market_service.dart';
import '../../../shared/services/market_service.dart';
import '../../../shared/services/personalization_service.dart';

class MarketPricesScreen extends ConsumerStatefulWidget {
  const MarketPricesScreen({
    super.key,
    this.initialSection,
    this.initialSchemeQuery,
  });

  final String? initialSection;
  final String? initialSchemeQuery;

  @override
  ConsumerState<MarketPricesScreen> createState() => _MarketPricesScreenState();
}

enum _MarketSection { prices, mandis, listings, schemes }

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
  bool _aiLoading = false;
  bool _aiGenerated = false;
  _MarketSection _activeSection = _MarketSection.prices;
  String _stateFilter = '';
  String? _selectedCrop;
  String _aiSummary = 'Generate AI overview for personalized market insights.';
  String _aiDetails =
      'Uses your farmer profile, location, and nearby market records. Cached for 24 hours.';
  DateTime? _aiUpdatedAt;
  Map<String, dynamic> _profile = <String, dynamic>{};

  List<String> _stateSuggestions = <String>[];
  List<String> _commoditySuggestions = <String>[];
  String? _mspInsight;
  String? _allIndiaInsight;

  List<Map<String, dynamic>> _prices = <Map<String, dynamic>>[];
  List<Map<String, dynamic>> _mandis = <Map<String, dynamic>>[];
  List<Map<String, dynamic>> _listings = <Map<String, dynamic>>[];
  List<Map<String, dynamic>> _schemes = <Map<String, dynamic>>[];

  @override
  void initState() {
    super.initState();
    final hasInitialScheme = (widget.initialSchemeQuery ?? '')
        .trim()
        .isNotEmpty;
    if (hasInitialScheme) {
      _searchController.text = widget.initialSchemeQuery!.trim();
    }
    _activeSection = _parseSection(
      widget.initialSection,
      fallback: hasInitialScheme
          ? _MarketSection.schemes
          : _MarketSection.prices,
    );
    _loadMarketplaceData();
    _loadCachedAiOverview();
  }

  _MarketSection _parseSection(
    String? raw, {
    required _MarketSection fallback,
  }) {
    final normalized = (raw ?? '').trim().toLowerCase();
    return switch (normalized) {
      'mandis' => _MarketSection.mandis,
      'listings' => _MarketSection.listings,
      'schemes' => _MarketSection.schemes,
      _ => fallback,
    };
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
        final marketSvc = ref.read(marketServiceProvider);
        final liveSvc = ref.read(liveMarketServiceProvider);

        final res = await marketSvc.listPrices(
          crop: _selectedCrop,
          state: _stateFilter.isEmpty ? null : _stateFilter,
          perPage: 100,
        );
        var items = _extractItems(
          res,
          keys: const <String>['items', 'prices', 'data'],
        );

        if (items.isEmpty) {
          final liveRes = await liveSvc.getLivePrices(
            state: _stateFilter.isEmpty ? null : _stateFilter,
            commodity: _selectedCrop,
            limit: 120,
          );
          items = _extractItems(
            liveRes,
            keys: const <String>['items', 'prices', 'records', 'data'],
          );
        }
        return _dedupePrices(items);
      },
      onError: (e) => loadError ??= _prettyError(e),
    );

    final mandis = await _safeLoad(
      action: () async {
        final res = await ref
            .read(marketServiceProvider)
            .listMandis(
              state: _stateFilter.isEmpty ? null : _stateFilter,
              perPage: 100,
            );
        final items = _extractItems(
          res,
          keys: const <String>['items', 'mandis', 'data'],
        );
        if (items.isNotEmpty) return _dedupeMandis(items);

        final liveItems = await ref
            .read(liveMarketServiceProvider)
            .getLiveMandis(
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

    final schemes = await _safeLoad(
      action: () async {
        final res = await ref
            .read(marketServiceProvider)
            .listSchemes(
              state: _stateFilter.isEmpty ? null : _stateFilter,
              isActive: true,
              perPage: 100,
            );
        final items = _extractItems(
          res,
          keys: const <String>['items', 'schemes', 'data'],
        );
        return _dedupeSchemes(items);
      },
      onError: (e) => loadError ??= _prettyError(e),
    );

    List<String> stateSuggestions = _stateSuggestions;
    List<String> commoditySuggestions = _commoditySuggestions;
    String? mspInsight = _mspInsight;
    String? allIndiaInsight = _allIndiaInsight;

    final liveSvc = ref.read(liveMarketServiceProvider);
    try {
      stateSuggestions = await liveSvc.getStates();
    } catch (_) {
      // non-blocking metadata
    }
    try {
      commoditySuggestions = await liveSvc.getCommodities();
    } catch (_) {
      // non-blocking metadata
    }

    if (_selectedCrop != null && _selectedCrop!.trim().isNotEmpty) {
      final selected = _selectedCrop!.trim();
      try {
        final mspData = await liveSvc.getMsp(selected);
        mspInsight = _extractMspInsight(mspData, selected);
      } catch (_) {
        mspInsight = null;
      }
      try {
        final spreadData = await liveSvc.getAllIndiaPrices(
          selected,
          limit: 250,
        );
        allIndiaInsight = _extractAllIndiaInsight(spreadData, selected);
      } catch (_) {
        allIndiaInsight = null;
      }
    } else {
      try {
        final allMsp = await liveSvc.getAllMsp();
        mspInsight = _extractAllMspInsight(allMsp);
      } catch (_) {
        mspInsight = null;
      }
      allIndiaInsight = null;
    }

    final profile = await ref
        .read(personalizationServiceProvider)
        .getProfileContext();

    if (!mounted) return;
    setState(() {
      _prices = prices;
      _mandis = resolvedMandis;
      _listings = listings;
      _schemes = schemes;
      _stateSuggestions = stateSuggestions;
      _commoditySuggestions = commoditySuggestions;
      _mspInsight = mspInsight;
      _allIndiaInsight = allIndiaInsight;
      _profile = profile;
      _error =
          (_prices.isEmpty &&
              _mandis.isEmpty &&
              _listings.isEmpty &&
              _schemes.isEmpty)
          ? loadError
          : null;
      _loading = false;
    });
  }

  Future<void> _loadCachedAiOverview() async {
    final cached = await ref
        .read(aiOverviewServiceProvider)
        .getCached('marketplace_overview_v1');
    if (!mounted || cached == null) return;
    setState(() {
      _aiSummary = cached.summary;
      _aiDetails = cached.details;
      _aiUpdatedAt = cached.updatedAt;
      _aiGenerated = true;
    });
  }

  String _aiUpdatedLabel() {
    final dt = _aiUpdatedAt;
    if (dt == null) return 'Not generated yet';
    final hh = dt.hour.toString().padLeft(2, '0');
    final mm = dt.minute.toString().padLeft(2, '0');
    return 'Updated at $hh:$mm';
  }

  Future<void> _generateAiOverview({bool forceRefresh = true}) async {
    if (_aiLoading) return;
    final languageCode = Localizations.localeOf(context).languageCode;
    setState(() => _aiLoading = true);
    try {
      final personalization = ref.read(personalizationServiceProvider);
      final profile = _profile.isEmpty
          ? await personalization.getProfileContext()
          : _profile;

      List<String> snippetsFrom(
        List<Map<String, dynamic>> items,
        String Function(Map<String, dynamic>) build,
      ) {
        final nearby = personalization
            .sortNearby(profile: profile, items: items)
            .take(4);
        return nearby.map(build).toList(growable: false);
      }

      final snippets = <String>[
        ...snippetsFrom(_prices, (item) {
          final crop = (item['crop_name'] ?? item['commodity'] ?? '')
              .toString();
          final mandi = (item['mandi_name'] ?? item['market'] ?? '').toString();
          final district = (item['district'] ?? '').toString();
          final modal = (item['modal_price'] ?? '').toString();
          return '$crop at $mandi, $district modal price $modal';
        }),
        ...snippetsFrom(_mandis, (item) {
          final name = (item['name'] ?? item['mandi_name'] ?? '').toString();
          final district = (item['district'] ?? '').toString();
          final state = (item['state'] ?? '').toString();
          return 'Mandi: $name in $district, $state';
        }),
        ...snippetsFrom(_listings, (item) {
          final name = (item['name'] ?? '').toString();
          final location = (item['location'] ?? '').toString();
          final rate = (item['rate_per_day'] ?? item['rate_per_hour'] ?? '')
              .toString();
          return 'Equipment listing: $name at $location rate $rate';
        }),
        ...snippetsFrom(_schemes, (item) {
          final name = (item['name'] ?? item['short_name'] ?? 'Scheme')
              .toString();
          final category = (item['category'] ?? '').toString();
          final state = (item['state'] ?? '').toString();
          return 'Scheme: $name category $category state $state';
        }),
        if (_mspInsight != null) _mspInsight!,
        if (_allIndiaInsight != null) _allIndiaInsight!,
      ];

      final result = await ref
          .read(aiOverviewServiceProvider)
          .generate(
            key: 'marketplace_overview_v1',
            pageName: 'Marketplace',
            languageCode: languageCode,
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
      context.showSnack(_prettyError(e), isError: true);
    }
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

  double? _firstNumeric(dynamic value) {
    if (value == null) return null;
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value.trim());
    if (value is Map) {
      for (final item in value.values) {
        final parsed = _firstNumeric(item);
        if (parsed != null) return parsed;
      }
    }
    if (value is List) {
      for (final item in value) {
        final parsed = _firstNumeric(item);
        if (parsed != null) return parsed;
      }
    }
    return null;
  }

  String? _extractMspInsight(Map<String, dynamic> data, String crop) {
    final msp =
        _firstNumeric(data['msp']) ??
        _firstNumeric(data['price']) ??
        _firstNumeric(data);
    if (msp == null) return null;
    return 'MSP for $crop: ${msp.inr} per quintal.';
  }

  String? _extractAllMspInsight(Map<String, dynamic> data) {
    final list = _extractItems(
      data,
      keys: const <String>['items', 'msp', 'prices', 'data'],
    );
    if (list.isNotEmpty) {
      return 'MSP directory synced for ${list.length} crops.';
    }
    final mspMap = data['msp'];
    if (mspMap is Map) {
      return 'MSP directory synced for ${mspMap.length} crops.';
    }
    return null;
  }

  String? _extractAllIndiaInsight(Map<String, dynamic> data, String crop) {
    final items = _extractItems(
      data,
      keys: const <String>['items', 'prices', 'records', 'data'],
    );
    if (items.isEmpty) return null;

    final modalValues = items
        .map((item) => _toDouble(item['modal_price']))
        .whereType<double>()
        .toList();
    if (modalValues.isEmpty) {
      return '$crop has ${items.length} live market records today.';
    }

    final sum = modalValues.fold<double>(0, (a, b) => a + b);
    final avg = sum / modalValues.length;
    return '$crop avg modal price across ${modalValues.length} markets: ${avg.inr}.';
  }

  Future<void> _openSchemeUrl(Map<String, dynamic> scheme) async {
    final raw = (scheme['application_url'] ?? scheme['url'] ?? '')
        .toString()
        .trim();
    if (raw.isEmpty) {
      if (mounted) {
        context.showSnack('Official application link is not available.');
      }
      return;
    }

    final uri = Uri.tryParse(raw);
    if (uri == null) {
      if (mounted) {
        context.showSnack('Scheme link is invalid.', isError: true);
      }
      return;
    }

    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!launched && mounted) {
      context.showSnack('Could not open scheme link.', isError: true);
    }
  }

  Future<void> _showSchemeDetails(Map<String, dynamic> scheme) async {
    final id =
        (scheme['id'] ?? scheme['scheme_id'] ?? scheme['slug'])?.toString() ??
        '';
    if (id.isEmpty) return;

    try {
      final data = await ref.read(marketServiceProvider).getSchemeById(id);
      if (!mounted) return;
      final title =
          (data['title'] ?? data['name'] ?? scheme['title'] ?? 'Scheme')
              .toString();
      final description =
          (data['description'] ??
                  data['summary'] ??
                  data['details'] ??
                  'No details available.')
              .toString();
      showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.white,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        builder: (_) => Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  title,
                  style: context.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 12),
                Text(description, style: context.textTheme.bodyMedium),
              ],
            ),
          ),
        ),
      );
    } catch (e) {
      if (mounted) context.showSnack(_prettyError(e), isError: true);
    }
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
      final mandi = (item['mandi_name'] ?? item['market'] ?? '')
          .toString()
          .trim()
          .toLowerCase();
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

  List<Map<String, dynamic>> _deriveMandisFromPrices(
    List<Map<String, dynamic>> prices,
  ) {
    return prices
        .map(
          (item) => <String, dynamic>{
            'name': (item['mandi_name'] ?? item['market'] ?? '')
                .toString()
                .trim(),
            'district': (item['district'] ?? '').toString().trim(),
            'state': (item['state'] ?? '').toString().trim(),
            'source': (item['source'] ?? 'derived').toString().trim(),
          },
        )
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

  List<Map<String, dynamic>> _dedupeSchemes(List<Map<String, dynamic>> items) {
    final map = <String, Map<String, dynamic>>{};
    for (final item in items) {
      final id = (item['id'] ?? item['scheme_id'] ?? '').toString().trim();
      final name = (item['name'] ?? item['short_name'] ?? '')
          .toString()
          .trim()
          .toLowerCase();
      final key = id.isNotEmpty ? id : name;
      if (key.isEmpty) continue;
      map[key] = item;
    }
    final out = map.values.toList();
    out.sort((a, b) {
      final an = (a['name'] ?? a['short_name'] ?? '').toString().toLowerCase();
      final bn = (b['name'] ?? b['short_name'] ?? '').toString().toLowerCase();
      return an.compareTo(bn);
    });
    return out;
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
          (item['mandi_name'] ?? item['market'])?.toString().toLowerCase() ??
          '';
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
      final name =
          (item['name'] ?? item['mandi_name'] ?? item['market'])
              ?.toString()
              .toLowerCase() ??
          '';
      final district = item['district']?.toString().toLowerCase() ?? '';
      final state = item['state']?.toString().toLowerCase() ?? '';
      return name.contains(query) ||
          district.contains(query) ||
          state.contains(query);
    }).toList();
  }

  List<Map<String, dynamic>> get _filteredListings {
    final query = _searchController.text.trim().toLowerCase();
    if (query.isEmpty) return _listings;

    return _listings.where((item) {
      final name = item['name']?.toString().toLowerCase() ?? '';
      final location = item['location']?.toString().toLowerCase() ?? '';
      final category = item['category']?.toString().toLowerCase() ?? '';
      return name.contains(query) ||
          location.contains(query) ||
          category.contains(query);
    }).toList();
  }

  List<Map<String, dynamic>> get _filteredSchemes {
    final query = _searchController.text.trim().toLowerCase();
    if (query.isEmpty) return _schemes;

    return _schemes.where((item) {
      final name = (item['name'] ?? item['short_name'] ?? '')
          .toString()
          .toLowerCase();
      final description = (item['description'] ?? '').toString().toLowerCase();
      final category = (item['category'] ?? '').toString().toLowerCase();
      final state = (item['state'] ?? '').toString().toLowerCase();
      return name.contains(query) ||
          description.contains(query) ||
          category.contains(query) ||
          state.contains(query);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final cardColor = isDark
        ? AppColors.darkCard.withValues(alpha: 0.72)
        : Colors.white.withValues(alpha: 0.74);
    final textColor = isDark ? AppColors.darkText : AppColors.lightText;
    final subColor = isDark
        ? AppColors.darkTextSecondary
        : AppColors.lightTextSecondary;
    final iconBg = isDark
        ? AppColors.darkCard.withValues(alpha: 0.92)
        : Colors.white.withValues(alpha: 0.88);
    final cropOptions =
        (_commoditySuggestions.isEmpty ? _cropChips : _commoditySuggestions)
            .take(12)
            .toList(growable: false);
    final stateHints = _stateSuggestions
        .where((state) {
          final input = _stateController.text.trim().toLowerCase();
          if (input.isEmpty) return true;
          return state.toLowerCase().contains(input);
        })
        .take(6)
        .toList(growable: false);

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
          child: RefreshIndicator(
            onRefresh: () => _loadMarketplaceData(showLoader: false),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.only(bottom: AppSpacing.xxxl),
              children: <Widget>[
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.lg,
                    AppSpacing.sm,
                    AppSpacing.lg,
                    0,
                  ),
                  child: Row(
                    children: <Widget>[
                      _topAction(
                        icon: Icons.arrow_back_rounded,
                        color: AppColors.primaryDark,
                        background: iconBg,
                        onTap: () => Navigator.of(context).maybePop(),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: <Widget>[
                            Text(
                              'Market Intelligence',
                              textAlign: TextAlign.center,
                              style: Theme.of(context).textTheme.titleLarge
                                  ?.copyWith(
                                    color: textColor,
                                    fontWeight: FontWeight.w800,
                                  ),
                            ),
                            Text(
                              'Live prices, mandi network, and listing control',
                              textAlign: TextAlign.center,
                              style: Theme.of(
                                context,
                              ).textTheme.bodySmall?.copyWith(color: subColor),
                            ),
                          ],
                        ),
                      ),
                      _topAction(
                        icon: Icons.refresh_rounded,
                        color: AppColors.primaryDark,
                        background: iconBg,
                        onTap: () => _loadMarketplaceData(showLoader: false),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                  ),
                  child: _glassCard(
                    cardColor: cardColor,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          'Marketplace Overview',
                          style: Theme.of(context).textTheme.titleMedium
                              ?.copyWith(
                                color: textColor,
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          'Aligned with your state, selected crop, and nearby records.',
                          style: Theme.of(
                            context,
                          ).textTheme.bodySmall?.copyWith(color: subColor),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Wrap(
                          spacing: AppSpacing.sm,
                          runSpacing: AppSpacing.xs,
                          children: <Widget>[
                            _headerBadge('Prices ${_prices.length}'),
                            _headerBadge('Mandis ${_mandis.length}'),
                            _headerBadge('Schemes ${_schemes.length}'),
                            _headerBadge('Listings ${_listings.length}'),
                            if (_stateFilter.trim().isNotEmpty)
                              _headerBadge('State $_stateFilter'),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                _aiOverviewCard(
                  cardColor: cardColor,
                  textColor: textColor,
                  subColor: subColor,
                ),
                if ((_mspInsight != null && _mspInsight!.isNotEmpty) ||
                    (_allIndiaInsight != null &&
                        _allIndiaInsight!.isNotEmpty)) ...<Widget>[
                  const SizedBox(height: AppSpacing.sm),
                  _marketInsightsCard(
                    cardColor: cardColor,
                    textColor: textColor,
                    subColor: subColor,
                  ),
                ],
                const SizedBox(height: AppSpacing.md),
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                  ),
                  child: _glassCard(
                    cardColor: cardColor,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        TextField(
                          controller: _searchController,
                          onChanged: (_) => setState(() {}),
                          decoration: InputDecoration(
                            filled: true,
                            fillColor: isDark
                                ? AppColors.darkSurface.withValues(alpha: 0.8)
                                : Colors.white.withValues(alpha: 0.92),
                            hintText: 'Search prices, mandis, and listings',
                            hintStyle: TextStyle(color: subColor),
                            prefixIcon: const Icon(
                              Icons.search,
                              color: AppColors.primaryDark,
                            ),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(AppRadius.md),
                              borderSide: BorderSide(
                                color: Colors.white.withValues(alpha: 0.75),
                              ),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(AppRadius.md),
                              borderSide: BorderSide(
                                color: Colors.white.withValues(alpha: 0.75),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        SizedBox(
                          height: 44,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            itemCount: cropOptions.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(width: AppSpacing.sm),
                            itemBuilder: (_, index) {
                              final crop = cropOptions[index];
                              final selected = crop == _selectedCrop;
                              return FilterChip(
                                label: Text(crop),
                                selected: selected,
                                onSelected: (_) => _toggleCrop(crop),
                                backgroundColor: isDark
                                    ? AppColors.darkSurface.withValues(
                                        alpha: 0.7,
                                      )
                                    : Colors.white.withValues(alpha: 0.84),
                                selectedColor: AppColors.primary.withValues(
                                  alpha: 0.24,
                                ),
                                side: BorderSide(
                                  color: Colors.white.withValues(alpha: 0.72),
                                ),
                                checkmarkColor: AppColors.primaryDark,
                              );
                            },
                          ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Row(
                          children: <Widget>[
                            Expanded(
                              child: TextField(
                                controller: _stateController,
                                onSubmitted: (_) => _applyStateFilter(),
                                decoration: InputDecoration(
                                  filled: true,
                                  fillColor: isDark
                                      ? AppColors.darkSurface.withValues(
                                          alpha: 0.8,
                                        )
                                      : Colors.white.withValues(alpha: 0.92),
                                  hintText: 'State filter (optional)',
                                  hintStyle: TextStyle(color: subColor),
                                  prefixIcon: const Icon(
                                    Icons.location_on_outlined,
                                    color: AppColors.primaryDark,
                                  ),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(
                                      AppRadius.md,
                                    ),
                                    borderSide: BorderSide(
                                      color: Colors.white.withValues(
                                        alpha: 0.75,
                                      ),
                                    ),
                                  ),
                                  enabledBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(
                                      AppRadius.md,
                                    ),
                                    borderSide: BorderSide(
                                      color: Colors.white.withValues(
                                        alpha: 0.75,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: AppSpacing.sm),
                            SizedBox(
                              height: 48,
                              child: ElevatedButton(
                                onPressed: _applyStateFilter,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(
                                      AppRadius.full,
                                    ),
                                  ),
                                  elevation: 0,
                                ),
                                child: const Text(
                                  'Apply',
                                  style: TextStyle(fontWeight: FontWeight.w700),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                if (stateHints.isNotEmpty) ...<Widget>[
                  const SizedBox(height: AppSpacing.sm),
                  SizedBox(
                    height: 38,
                    child: ListView.separated(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.lg,
                      ),
                      scrollDirection: Axis.horizontal,
                      itemCount: stateHints.length,
                      separatorBuilder: (_, __) =>
                          const SizedBox(width: AppSpacing.sm),
                      itemBuilder: (_, index) {
                        final state = stateHints[index];
                        final active =
                            _stateFilter.toLowerCase() == state.toLowerCase();
                        return ChoiceChip(
                          label: Text(state),
                          selected: active,
                          onSelected: (_) {
                            _stateController.text = state;
                            _applyStateFilter();
                          },
                          backgroundColor: cardColor,
                          selectedColor: AppColors.primary.withValues(
                            alpha: 0.24,
                          ),
                          side: BorderSide(
                            color: Colors.white.withValues(alpha: 0.75),
                          ),
                        );
                      },
                    ),
                  ),
                ],
                const SizedBox(height: AppSpacing.md),
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                  ),
                  child: _sectionTabs(
                    cardColor: cardColor,
                    textColor: textColor,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                  ),
                  child: _buildContent(
                    cardColor: cardColor,
                    textColor: textColor,
                    subColor: subColor,
                  ),
                ),
              ],
            ),
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

  Widget _headerBadge(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(AppRadius.full),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.26)),
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

  Widget _aiOverviewCard({
    required Color cardColor,
    required Color textColor,
    required Color subColor,
  }) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.6),
          width: 1,
        ),
        color: cardColor,
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: AppColors.primaryDark.withValues(alpha: 0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.14),
            blurRadius: 22,
            spreadRadius: 1,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Icon(
                Icons.auto_awesome,
                color: AppColors.primaryDark.withValues(alpha: 0.82),
                size: 18,
              ),
              const SizedBox(width: AppSpacing.sm),
              Text(
                'AI Overview',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: textColor,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            _aiExpanded ? _aiDetails : _aiSummary,
            maxLines: _aiExpanded ? null : 3,
            overflow: _aiExpanded
                ? TextOverflow.visible
                : TextOverflow.ellipsis,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: textColor, height: 1.35),
          ),
          if (_aiLoading) ...<Widget>[
            const SizedBox(height: AppSpacing.sm),
            const LinearProgressIndicator(minHeight: 2),
          ],
          const SizedBox(height: AppSpacing.sm),
          Text(
            _aiUpdatedLabel(),
            style: Theme.of(
              context,
            ).textTheme.labelSmall?.copyWith(color: subColor),
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: <Widget>[
              Expanded(
                child: SizedBox(
                  height: 40,
                  child: ElevatedButton.icon(
                    onPressed: _aiLoading
                        ? null
                        : () => _generateAiOverview(forceRefresh: true),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppRadius.full),
                      ),
                      elevation: 0,
                    ),
                    icon: Icon(
                      _aiGenerated ? Icons.refresh : Icons.auto_awesome,
                    ),
                    label: Text(
                      _aiGenerated ? 'Generate Fresh' : 'Generate AI Overview',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              SizedBox(
                height: 40,
                child: OutlinedButton(
                  onPressed: () {
                    setState(() => _aiExpanded = !_aiExpanded);
                  },
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(
                      color: Colors.white.withValues(alpha: 0.72),
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.full),
                    ),
                  ),
                  child: Text(_aiExpanded ? 'Less' : 'More'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _marketInsightsCard({
    required Color cardColor,
    required Color textColor,
    required Color subColor,
  }) {
    return _glassCard(
      cardColor: cardColor,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              const Icon(
                Icons.insights,
                color: AppColors.primaryDark,
                size: 18,
              ),
              const SizedBox(width: 8),
              Text(
                'Live Market Intelligence',
                style: TextStyle(color: textColor, fontWeight: FontWeight.w700),
              ),
            ],
          ),
          if (_mspInsight != null && _mspInsight!.isNotEmpty) ...<Widget>[
            const SizedBox(height: 10),
            Text(_mspInsight!, style: TextStyle(color: subColor, height: 1.35)),
          ],
          if (_allIndiaInsight != null &&
              _allIndiaInsight!.isNotEmpty) ...<Widget>[
            const SizedBox(height: 8),
            Text(
              _allIndiaInsight!,
              style: TextStyle(color: subColor, height: 1.35),
            ),
          ],
        ],
      ),
    );
  }

  Widget _sectionTabs({required Color cardColor, required Color textColor}) {
    return Container(
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.8),
          width: 1.2,
        ),
      ),
      child: Row(
        children: <Widget>[
          _tabButton(
            _MarketSection.prices,
            'Prices',
            Icons.trending_up,
            textColor,
          ),
          _tabButton(
            _MarketSection.mandis,
            'Mandis',
            Icons.storefront,
            textColor,
          ),
          _tabButton(
            _MarketSection.schemes,
            'Schemes',
            Icons.account_balance_outlined,
            textColor,
          ),
          _tabButton(
            _MarketSection.listings,
            'Listings',
            Icons.sell_outlined,
            textColor,
          ),
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
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 36),
        child: Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );
    }

    if (_error != null) {
      return _glassCard(
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
            Text(_error!, style: TextStyle(color: subColor)),
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
      );
    }

    final items = switch (_activeSection) {
      _MarketSection.prices => _filteredPrices,
      _MarketSection.mandis => _filteredMandis,
      _MarketSection.listings => _filteredListings,
      _MarketSection.schemes => _filteredSchemes,
    };

    if (items.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
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
                Icon(Icons.inbox_outlined, color: subColor, size: 36),
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
      );
    }

    final children = <Widget>[];
    if (_activeSection == _MarketSection.listings) {
      children.add(_addListingButton());
      children.add(const SizedBox(height: 12));
    }

    for (final item in items) {
      children.add(switch (_activeSection) {
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
        _MarketSection.schemes => _schemeCard(
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
      });
      children.add(const SizedBox(height: 12));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: children,
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

    final locationParts = <String>[
      mandi,
      district,
      state,
    ].where((part) => part.trim().isNotEmpty).toList();

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
            locationParts.isEmpty
                ? 'Location unavailable'
                : locationParts.join(', '),
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
          Text(label, style: TextStyle(color: subColor, fontSize: 11)),
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
    final name =
        (item['name'] ?? item['mandi_name'] ?? item['market'])?.toString() ??
        'Mandi';
    final district = item['district']?.toString() ?? '';
    final state = item['state']?.toString() ?? '';
    final address = item['address']?.toString() ?? '';

    final locationParts = <String>[
      district,
      state,
    ].where((part) => part.trim().isNotEmpty).toList();

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
            Text(address, style: TextStyle(color: subColor, fontSize: 12)),
          ],
        ],
      ),
    );
  }

  Widget _schemeCard({
    required Map<String, dynamic> item,
    required Color cardColor,
    required Color textColor,
    required Color subColor,
  }) {
    final name =
        (item['name'] ?? item['short_name'] ?? item['title'] ?? 'Scheme')
            .toString();
    final category = (item['category'] ?? 'support').toString();
    final state = (item['state'] ?? 'All').toString();
    final eligibilityRaw = item['eligibility'];
    final eligibility = eligibilityRaw is List && eligibilityRaw.isNotEmpty
        ? eligibilityRaw.first.toString()
        : eligibilityRaw?.toString() ?? 'See official eligibility criteria.';

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
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  category.replaceAll('_', ' ').capitalize,
                  style: const TextStyle(
                    color: AppColors.primaryDark,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'State: $state',
            style: TextStyle(color: subColor, fontSize: 12),
          ),
          const SizedBox(height: 6),
          Text(
            eligibility,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(color: subColor, height: 1.3),
          ),
          const SizedBox(height: 10),
          Row(
            children: <Widget>[
              Expanded(
                child: OutlinedButton(
                  onPressed: () => _showSchemeDetails(item),
                  child: const Text('Details'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton(
                  onPressed: () => _openSchemeUrl(item),
                  child: const Text('Apply'),
                ),
              ),
            ],
          ),
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
          Text(location, style: TextStyle(color: subColor, fontSize: 12)),
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
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.8),
          width: 1.2,
        ),
        boxShadow: <BoxShadow>[
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
}
