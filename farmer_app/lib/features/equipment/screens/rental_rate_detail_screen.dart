import 'dart:math' as math;

import 'package:easy_localization/easy_localization.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/models/equipment_model.dart';
import '../../../shared/services/ai_overview_service.dart';
import '../../../shared/services/equipment_service.dart';
import '../../../shared/widgets/ai_overview_card.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/error_view.dart';
import '../../weather/widgets/glass_widgets.dart';
import '../utils/equipment_utils.dart';
import '../widgets/equipment_shell.dart';

class RentalRateDetailScreen extends ConsumerStatefulWidget {
  final String equipmentName;
  final String? category;

  const RentalRateDetailScreen({
    super.key,
    required this.equipmentName,
    this.category,
  });

  @override
  ConsumerState<RentalRateDetailScreen> createState() =>
      _RentalRateDetailScreenState();
}

class _RentalRateDetailScreenState
    extends ConsumerState<RentalRateDetailScreen> {
  bool _loading = true;
  bool _refreshing = false;
  bool _filtersExpanded = false;
  String? _error;
  List<EquipmentProvider> _providers = const [];
  RateSummary _rateSummary = const RateSummary();
  String? _selectedState;
  String _providerSortBy = 'rate_asc';

  final Set<int> _expandedProviders = <int>{};
  List<Map<String, dynamic>> _rateHistory = const [];
  bool _hasRealHistory = false;

  bool _subsidyExpanded = false;
  final TextEditingController _equipCostController = TextEditingController();
  String _subsidyCategory = 'general';

  bool _chcExpanded = false;
  bool _comparisonExpanded = false;
  Map<String, dynamic> _chcInfo = const {};

  bool _aiLoading = false;
  bool _aiGenerated = false;
  bool _aiExpanded = false;
  String _aiSummary =
      'Generate AI insights to identify the best window to rent this equipment.';
  String _aiDetails =
      'Uses provider pricing, location filter, and trend history to highlight practical booking strategy.';
  DateTime? _aiUpdatedAt;

  @override
  void initState() {
    super.initState();
    _loadCachedAiOverview();
    _primeData();
  }

  @override
  void dispose() {
    _equipCostController.dispose();
    super.dispose();
  }

  bool get _hasSnapshot => _providers.isNotEmpty || _rateHistory.isNotEmpty;

  String get _aiCacheKey {
    final slug = widget.equipmentName
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9]+'), '_')
        .replaceAll(RegExp(r'_+'), '_')
        .replaceAll(RegExp(r'^_|_$'), '');
    return 'rental_rate_detail_overview_$slug';
  }

  List<EquipmentProvider> get _sortedProviders {
    final rows = [..._providers];
    if (_providerSortBy == 'rate_desc') {
      rows.sort((a, b) => (b.rates.daily ?? 0).compareTo(a.rates.daily ?? 0));
    } else if (_providerSortBy == 'availability') {
      rows.sort((a, b) => a.availability.compareTo(b.availability));
    } else {
      rows.sort((a, b) => (a.rates.daily ?? 0).compareTo(b.rates.daily ?? 0));
    }
    return rows;
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
      var detail = await svc.getRentalRateDetail(
        equipmentName: widget.equipmentName,
        state: _selectedState,
        limit: 50,
        preferCache: !forceRefresh,
        forceRefresh: forceRefresh,
      );

      var providersJson =
          (detail['providers'] as List?)?.cast<Map<String, dynamic>>() ??
          const [];

      if (providersJson.isEmpty &&
          _selectedState != null &&
          _selectedState!.isNotEmpty) {
        detail = await svc.getRentalRateDetail(
          equipmentName: widget.equipmentName,
          limit: 50,
          preferCache: !forceRefresh,
          forceRefresh: forceRefresh,
        );
        providersJson =
            (detail['providers'] as List?)?.cast<Map<String, dynamic>>() ??
            const [];
      }

      if (!mounted) return;

      final providers = providersJson
          .map(EquipmentProvider.fromJson)
          .toList(growable: false);
      final summary = RateSummary.fromJson(
        (detail['rate_summary'] as Map?)?.cast<String, dynamic>() ?? const {},
      );

      setState(() {
        _providers = providers;
        _rateSummary = summary;
        _loading = false;
        _refreshing = true;
      });

      if (!_aiGenerated && !_aiLoading) {
        _generateAiOverview(forceRefresh: false);
      }

      final historyFuture = svc
          .getRateHistory(
            widget.equipmentName,
            state: _selectedState,
            preferCache: !forceRefresh,
            forceRefresh: forceRefresh,
          )
          .catchError(
            (_) => const <String, dynamic>{
              'has_real_data': false,
              'history': <Map<String, dynamic>>[],
            },
          );

      final chcFuture = svc
          .getChcInfo(preferCache: !forceRefresh, forceRefresh: forceRefresh)
          .catchError(
            (_) => const <String, dynamic>{'chc': <String, dynamic>{}},
          );

      final secondary = await Future.wait([historyFuture, chcFuture]);
      if (!mounted) return;

      final history = secondary[0] as Map<String, dynamic>;
      final chc = secondary[1] as Map<String, dynamic>;

      final realHistory =
          (history['history'] as List?)?.cast<Map<String, dynamic>>() ??
          const [];
      final hasReal = history['has_real_data'] == true;

      setState(() {
        _hasRealHistory = hasReal;
        _rateHistory = hasReal
            ? realHistory
            : _simulatedHistory(summary.dailyMin ?? 0);
        _chcInfo = (chc['chc'] as Map?)?.cast<String, dynamic>() ?? const {};
        _loading = false;
        _refreshing = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _refreshing = false;
        if (!hasSnapshot) {
          _error = e.toString();
        }
        _loading = false;
      });
      if (hasSnapshot) {
        context.showSnack(
          'Unable to sync latest rates. Showing recent snapshot.',
          isError: true,
        );
      }
    }
  }

  Future<void> _loadCachedAiOverview() async {
    final cached = await ref
        .read(aiOverviewServiceProvider)
        .getCached(_aiCacheKey);
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
      final snippets = <String>[
        'Equipment: ${widget.equipmentName}.',
        'Loaded providers: ${_providers.length}.',
      ];

      if (_selectedState != null && _selectedState!.isNotEmpty) {
        snippets.add('Active state filter: $_selectedState.');
      }

      final minDaily = _rateSummary.dailyMin;
      final maxDaily = _rateSummary.dailyMax;
      if (minDaily != null && maxDaily != null) {
        snippets.add(
          'Daily price band: INR ${minDaily.toStringAsFixed(0)} to INR ${maxDaily.toStringAsFixed(0)}.',
        );
      }

      for (final p in _sortedProviders.take(6)) {
        snippets.add(
          '${p.provider.name} in ${p.location.district}, ${p.location.state} at ${rateDisplay(p.rates)} with availability ${p.availability}.',
        );
      }

      for (final row in _rateHistory.take(6)) {
        final period = (row['period'] ?? '').toString();
        final rate = (row['rate_daily'] as num?)?.toDouble();
        if (period.isEmpty || rate == null) continue;
        snippets.add(
          'Trend point: $period daily rate INR ${rate.toStringAsFixed(0)}.',
        );
      }

      final result = await ref
          .read(aiOverviewServiceProvider)
          .generate(
            key: _aiCacheKey,
            pageName: 'Rental Rate Detail',
            languageCode: context.locale.languageCode,
            nearbyData: snippets,
            capabilities: const <String>[
              'Compare providers by daily and hourly rates on this page',
              'Filter by state and sort providers by price or availability',
              'Open call or WhatsApp for selected provider',
              'Submit rental request directly from this page',
              'Ask AI in chat for negotiation and booking checklist',
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
    if (dt == null) return 'Not generated yet';
    final hh = dt.hour.toString().padLeft(2, '0');
    final mm = dt.minute.toString().padLeft(2, '0');
    return 'Updated at $hh:$mm';
  }

  void _openAiActionCard(String actionText) {
    final query = Uri.encodeQueryComponent(actionText);
    context.push('${RoutePaths.chat}?agent=general&q=$query');
  }

  List<Map<String, dynamic>> _simulatedHistory(double baseDaily) {
    final now = DateTime.now();
    final safeBase = baseDaily <= 0 ? 2000 : baseDaily;
    final rows = <Map<String, dynamic>>[];
    final name = widget.equipmentName.toLowerCase();
    final seed = name.codeUnits.fold<int>(0, (acc, e) => (acc * 31 + e) % 9973);
    final basePeakMonth = name.contains('irrigation') || name.contains('pump')
        ? 6
        : 11;
    final peakMonth = ((basePeakMonth + (seed % 4) - 2) % 12) + 1;

    for (int i = 23; i >= 0; i--) {
      final d = DateTime(now.year, now.month - i, 1);
      final monthDist = (d.month - peakMonth).abs();
      final seasonal = math.sin((12 - monthDist) / 12 * math.pi);
      final secondaryWave = math.sin(((i + (seed % 9)) / 6) * math.pi);
      final monthNoise = (((seed + (i * 37)) % 21) - 10) / 100;
      final multiplier =
          (0.82 + (0.2 * seasonal) + (0.06 * secondaryWave) + monthNoise)
              .clamp(0.62, 1.25)
              .toDouble();
      final value = safeBase * multiplier;
      rows.add({
        'period': DateFormat('yyyy-MM').format(d),
        'rate_daily': value.roundToDouble(),
      });
    }
    return rows;
  }

  Future<void> _openCall(String phone) async {
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
      return;
    }
    if (!mounted) return;
    context.showSnack('Unable to place call'.tr(), isError: true);
  }

  Future<void> _openWhatsApp(String phone) async {
    final digits = phone.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.isEmpty) return;
    final uri = Uri.parse('https://wa.me/91$digits');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _share() async {
    final minDaily = _rateSummary.dailyMin?.toStringAsFixed(0) ?? '--';
    final maxDaily = _rateSummary.dailyMax?.toStringAsFixed(0) ?? '--';
    await Share.share(
      'Check ${widget.equipmentName} rental rates: ₹$minDaily–₹$maxDaily/day on KisanKiAwaaz.',
    );
  }

  Future<void> _showRentalRequestSheet() async {
    DateTime? startDate;
    DateTime? endDate;
    String messageText = '';
    final providerOptions = _sortedProviders;
    final stateOptions =
        providerOptions
            .map((p) => p.location.state.trim())
            .where((s) => s.isNotEmpty)
            .toSet()
            .toList(growable: false)
          ..sort();
    String? selectedState = stateOptions.isNotEmpty ? stateOptions.first : null;
    List<String> districtOptionsForState(String? state) {
      final rows = providerOptions.where((p) {
        if (state == null || state.isEmpty) return true;
        return p.location.state.trim() == state;
      });
      final districts =
          rows
              .map((p) => p.location.district.trim())
              .where((d) => d.isNotEmpty)
              .toSet()
              .toList(growable: false)
            ..sort();
      return districts;
    }

    String? selectedDistrict = districtOptionsForState(selectedState).isNotEmpty
        ? districtOptionsForState(selectedState).first
        : null;
    String? selectedProviderId = providerOptions.isNotEmpty
        ? providerOptions.first.id.trim()
        : null;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setLocal) {
            return Padding(
              padding: EdgeInsets.only(
                left: AppSpacing.lg,
                right: AppSpacing.lg,
                top: AppSpacing.lg,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + AppSpacing.lg,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Request Rental'.tr(),
                      style: context.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Text(
                      widget.equipmentName,
                      style: context.textTheme.bodyLarge,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    if (providerOptions.isNotEmpty) ...[
                      DropdownButtonFormField<String>(
                        value: selectedState,
                        decoration: InputDecoration(
                          labelText: 'Select State'.tr(),
                          hintText: 'Choose state'.tr(),
                        ),
                        isExpanded: true,
                        items: stateOptions
                            .map(
                              (s) => DropdownMenuItem<String>(
                                value: s,
                                child: Text(s),
                              ),
                            )
                            .toList(growable: false),
                        onChanged: (v) {
                          setLocal(() {
                            selectedState = v;
                            final districtOptions = districtOptionsForState(
                              selectedState,
                            );
                            selectedDistrict = districtOptions.isNotEmpty
                                ? districtOptions.first
                                : null;
                            final filtered = providerOptions
                                .where((p) {
                                  final stateOk =
                                      selectedState == null ||
                                          selectedState!.isEmpty
                                      ? true
                                      : p.location.state.trim() ==
                                            selectedState;
                                  final districtOk =
                                      selectedDistrict == null ||
                                          selectedDistrict!.isEmpty
                                      ? true
                                      : p.location.district.trim() ==
                                            selectedDistrict;
                                  return stateOk && districtOk;
                                })
                                .toList(growable: false);
                            selectedProviderId = filtered.isNotEmpty
                                ? filtered.first.id.trim()
                                : null;
                          });
                        },
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Builder(
                        builder: (_) {
                          final districtOptions = districtOptionsForState(
                            selectedState,
                          );
                          return DropdownButtonFormField<String>(
                            value: selectedDistrict,
                            decoration: InputDecoration(
                              labelText: 'Select District / Mandi Area'.tr(),
                              hintText: 'Choose district'.tr(),
                            ),
                            isExpanded: true,
                            items: districtOptions
                                .map(
                                  (d) => DropdownMenuItem<String>(
                                    value: d,
                                    child: Text(d),
                                  ),
                                )
                                .toList(growable: false),
                            onChanged: (v) {
                              setLocal(() {
                                selectedDistrict = v;
                                final filtered = providerOptions
                                    .where((p) {
                                      final stateOk =
                                          selectedState == null ||
                                              selectedState!.isEmpty
                                          ? true
                                          : p.location.state.trim() ==
                                                selectedState;
                                      final districtOk =
                                          selectedDistrict == null ||
                                              selectedDistrict!.isEmpty
                                          ? true
                                          : p.location.district.trim() ==
                                                selectedDistrict;
                                      return stateOk && districtOk;
                                    })
                                    .toList(growable: false);
                                selectedProviderId = filtered.isNotEmpty
                                    ? filtered.first.id.trim()
                                    : null;
                              });
                            },
                          );
                        },
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Builder(
                        builder: (_) {
                          final scopedProviders = providerOptions
                              .where((p) {
                                final stateOk =
                                    selectedState == null ||
                                        selectedState!.isEmpty
                                    ? true
                                    : p.location.state.trim() == selectedState;
                                final districtOk =
                                    selectedDistrict == null ||
                                        selectedDistrict!.isEmpty
                                    ? true
                                    : p.location.district.trim() ==
                                          selectedDistrict;
                                return stateOk && districtOk;
                              })
                              .toList(growable: false);

                          return DropdownButtonFormField<String>(
                            value: selectedProviderId,
                            decoration: InputDecoration(
                              labelText: 'Select Provider / Mandi'.tr(),
                              hintText: 'Choose where you want to rent from'.tr(),
                            ),
                            isExpanded: true,
                            items: scopedProviders
                                .map((p) {
                                  final daily = p.rates.daily;
                                  final rateText = daily == null
                                      ? 'Rate on call'
                                      : 'Rs ${daily.toStringAsFixed(0)}/day';
                                  final label =
                                      '${p.provider.name} - ${p.location.district}, ${p.location.state} - $rateText';
                                  return DropdownMenuItem<String>(
                                    value: p.id.trim(),
                                    child: Text(
                                      label,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  );
                                })
                                .toList(growable: false),
                            onChanged: (v) =>
                                setLocal(() => selectedProviderId = v),
                          );
                        },
                      ),
                    ] else
                      Text(
                        'No providers available right now.'.tr(),
                        style: context.textTheme.bodyMedium?.copyWith(
                          color: context.appColors.textSecondary,
                        ),
                      ),
                    const SizedBox(height: AppSpacing.sm),
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(
                        startDate == null
                            ? 'Select start date'.tr()
                            : DateFormat('dd MMM yyyy').format(startDate!),
                      ),
                      trailing: const Icon(Icons.calendar_today_outlined),
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: ctx,
                          firstDate: DateTime.now(),
                          lastDate: DateTime.now().add(
                            const Duration(days: 365),
                          ),
                          initialDate: DateTime.now(),
                        );
                        if (picked != null) setLocal(() => startDate = picked);
                      },
                    ),
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(
                        endDate == null
                            ? 'Select end date'.tr()
                            : DateFormat('dd MMM yyyy').format(endDate!),
                      ),
                      trailing: const Icon(Icons.calendar_today_outlined),
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: ctx,
                          firstDate: startDate ?? DateTime.now(),
                          lastDate: DateTime.now().add(
                            const Duration(days: 365),
                          ),
                          initialDate: startDate ?? DateTime.now(),
                        );
                        if (picked != null) setLocal(() => endDate = picked);
                      },
                    ),
                    AppTextField(
                      label: 'Message'.tr(),
                      hint: 'Add a request note'.tr(),
                      maxLines: 3,
                      onChanged: (v) => messageText = v,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: () async {
                          if (startDate == null || endDate == null) {
                            context.showSnack(
                              'Select start and end dates'.tr(),
                              isError: true,
                            );
                            return;
                          }
                          final equipmentId = (selectedProviderId ?? '').trim();
                          if (equipmentId.isEmpty) {
                            context.showSnack(
                              'Select a provider/mandi first'.tr(),
                              isError: true,
                            );
                            return;
                          }

                          try {
                            final created = await ref
                                .read(equipmentServiceProvider)
                                .createRental({
                                  'equipment_id': equipmentId,
                                  'start_date': startDate!.toIso8601String(),
                                  'end_date': endDate!.toIso8601String(),
                                  'message': messageText.trim(),
                                });
                            if (!ctx.mounted) return;
                            Navigator.pop(ctx);
                            if (!mounted) return;
                            context.showSnack('Rental request submitted'.tr());
                            final rentalId =
                                (created['id'] ?? created['rental_id'] ?? '')
                                    .toString();
                            if (rentalId.isNotEmpty) {
                              context.push(
                                '${RoutePaths.rentalTicket}?id=${Uri.encodeComponent(rentalId)}',
                              );
                            }
                          } catch (e) {
                            if (!ctx.mounted) return;
                            context.showSnack(e.toString(), isError: true);
                          }
                        },
                        style: OutlinedButton.styleFrom(
                          foregroundColor: context.colors.onSurface,
                          side: BorderSide(color: context.appColors.border),
                        ),
                        child: Text('Submit Request'.tr()),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  double get _subsidyPercent => _subsidyCategory == 'scst' ? 0.5 : 0.4;

  @override
  Widget build(BuildContext context) {
    final minDaily = _rateSummary.dailyMin?.toStringAsFixed(0) ?? '--';
    final maxDaily = _rateSummary.dailyMax?.toStringAsFixed(0) ?? '--';
    final sortedProviders = _sortedProviders;

    return Scaffold(
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.lg,
            AppSpacing.sm,
            AppSpacing.lg,
            AppSpacing.lg,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              OutlinedButton.icon(
                onPressed: _showRentalRequestSheet,
                style: OutlinedButton.styleFrom(
                  foregroundColor: context.colors.onSurface,
                  side: const BorderSide(color: Colors.black, width: 1.2),
                  minimumSize: const Size(0, 44),
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md,
                    vertical: AppSpacing.sm,
                  ),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                icon: const Icon(Icons.assignment_rounded, size: 18),
                label: Text('Request Rental'.tr()),
              ),
            ],
          ),
        ),
      ),
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
              : RefreshIndicator(
                  onRefresh: () => _loadData(forceRefresh: true),
                  child: ListView(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    children: [
                      _detailHeader(minDaily: minDaily, maxDaily: maxDaily),
                      const SizedBox(height: AppSpacing.sm),
                      EquipmentRefreshStrip(
                        refreshing: _refreshing,
                        label:
                            'Refreshing prices, history, and provider availability...',
                      ),
                      if (_error != null && _hasSnapshot)
                        Container(
                          width: double.infinity,
                          margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                          padding: const EdgeInsets.all(AppSpacing.sm),
                          decoration: BoxDecoration(
                            color: AppColors.warning.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(AppRadius.md),
                          ),
                          child: Text(
                            'Showing cached rate intelligence while network reconnects.',
                            style: context.textTheme.bodySmall?.copyWith(
                              color: AppColors.warning,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      _activeFiltersRow(),
                      const SizedBox(height: AppSpacing.md),
                      SizedBox(
                        height: 110,
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          children: [
                            _summaryCard(
                              'Min Daily',
                              _rateSummary.dailyMin,
                              '/day',
                            ),
                            const SizedBox(width: AppSpacing.sm),
                            _summaryCard(
                              'Max Daily',
                              _rateSummary.dailyMax,
                              '/day',
                            ),
                            const SizedBox(width: AppSpacing.sm),
                            _summaryCard('Avg Hourly', _avgHourly(), '/hr'),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      _aiOverviewSection(),
                      const SizedBox(height: AppSpacing.md),
                      GlassCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _hasRealHistory
                                  ? 'Demand & Price Trend (Real Data)'
                                  : 'Demand & Price Trend (Estimated from current rates)',
                              style: context.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.xs),
                            Text(
                              _historyCoverageLabel(),
                              style: context.textTheme.bodySmall?.copyWith(
                                color: context.appColors.textSecondary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.md),
                            SizedBox(height: 250, child: _trendChart()),
                            const SizedBox(height: AppSpacing.xs),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Y-axis: Daily Rate (INR)',
                                  style: context.textTheme.bodySmall?.copyWith(
                                    color: context.appColors.textSecondary,
                                  ),
                                ),
                                Text(
                                  'X-axis: Month-Year',
                                  style: context.textTheme.bodySmall?.copyWith(
                                    color: context.appColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      GlassCard(child: _comparisonTable()),
                      const SizedBox(height: AppSpacing.md),
                      ...List.generate(
                        sortedProviders.length,
                        (i) => _providerCard(i, sortedProviders[i]),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      GlassCard(
                        child: Column(
                          children: [
                            ListTile(
                              contentPadding: EdgeInsets.zero,
                              title: Text(
                                'SMAM Subsidy Calculator',
                                style: context.textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              trailing: Icon(
                                _subsidyExpanded
                                    ? Icons.expand_less
                                    : Icons.expand_more,
                              ),
                              onTap: () {
                                HapticFeedback.lightImpact();
                                setState(
                                  () => _subsidyExpanded = !_subsidyExpanded,
                                );
                              },
                            ),
                            if (_subsidyExpanded) ...[
                              AppTextField(
                                label: 'Equipment Purchase Price',
                                hint: 'Enter amount',
                                keyboardType: TextInputType.number,
                                controller: _equipCostController,
                              ),
                              const SizedBox(height: AppSpacing.sm),
                              SegmentedButton<String>(
                                segments: [
                                  ButtonSegment(
                                    value: 'general',
                                    label: Text('General Farmer'.tr()),
                                  ),
                                  ButtonSegment(
                                    value: 'scst',
                                    label: Text('SC/ST or Small-Marginal'.tr()),
                                  ),
                                ],
                                selected: {_subsidyCategory},
                                onSelectionChanged: (s) =>
                                    setState(() => _subsidyCategory = s.first),
                              ),
                              const SizedBox(height: AppSpacing.sm),
                              _subsidyResult(),
                              const SizedBox(height: AppSpacing.sm),
                              Text(
                                'SMAM caps: ₹1L max (SC/ST individual), ₹50K max (general), ₹25L max (CHC project).',
                                style: context.textTheme.bodySmall?.copyWith(
                                  color: context.appColors.textSecondary,
                                ),
                              ),
                              const SizedBox(height: AppSpacing.sm),
                              OutlinedButton(
                                onPressed: () => launchUrl(
                                  Uri.parse('https://agrimachinery.nic.in'),
                                  mode: LaunchMode.externalApplication,
                                ),
                                child: Text('Apply for SMAM Subsidy Online'.tr()),
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      GlassCard(
                        child: Column(
                          children: [
                            ListTile(
                              contentPadding: EdgeInsets.zero,
                              title: Text('What is a Custom Hiring Centre?'.tr()),
                              trailing: Icon(
                                _chcExpanded
                                    ? Icons.expand_less
                                    : Icons.expand_more,
                              ),
                              onTap: () {
                                HapticFeedback.lightImpact();
                                setState(() => _chcExpanded = !_chcExpanded);
                              },
                            ),
                            if (_chcExpanded) ...[
                              Text((_chcInfo['description'] ?? '').toString()),
                              const SizedBox(height: AppSpacing.sm),
                              ...(((_chcInfo['how_to_find'] as List?)?.map(
                                        (e) => e.toString(),
                                      ) ??
                                      const [])
                                  .map(
                                    (e) => Padding(
                                      padding: const EdgeInsets.only(
                                        bottom: AppSpacing.xs,
                                      ),
                                      child: Row(
                                        children: [
                                          const Icon(
                                            Icons.check_circle_outline,
                                            size: 16,
                                            color: AppColors.primary,
                                          ),
                                          const SizedBox(width: AppSpacing.xs),
                                          Expanded(child: Text(e)),
                                        ],
                                      ),
                                    ),
                                  )),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
        ),
      ),
    );
  }

  Widget _detailHeader({required String minDaily, required String maxDaily}) {
    return Column(
      children: [
        SizedBox(
          height: 48,
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
                children: [
                  Text(
                    widget.equipmentName,
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: context.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  Text(
                    'Rental intelligence and booking guidance'.tr(),
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
                  icon: Icons.share_outlined,
                  onTap: _share,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        Wrap(
          spacing: AppSpacing.sm,
          runSpacing: AppSpacing.sm,
          children: [
            _headerBadge('${_providers.length} providers'),
            _headerBadge('₹$minDaily-₹$maxDaily/day'),
            _headerBadge(_selectedState ?? 'All states'.tr()),
          ],
        ),
      ],
    );
  }

  Widget _headerBadge(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: context.isDark ? 0.08 : 0.6),
        borderRadius: BorderRadius.circular(AppRadius.full),
        border: Border.all(color: context.appColors.border),
      ),
      child: Text(
        label,
        style: context.textTheme.bodySmall?.copyWith(
          color: context.colors.onSurface,
          fontWeight: FontWeight.w600,
        ),
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

  Widget _activeFiltersRow() {
    final chips = <Widget>[];

    if (_selectedState != null && _selectedState!.trim().isNotEmpty) {
      chips.add(
        InputChip(
          label: Text(_selectedState!),
          onDeleted: () {
            setState(() => _selectedState = null);
            _loadData(forceRefresh: true);
          },
        ),
      );
    }

    if (_providerSortBy != 'rate_asc') {
      chips.add(
        InputChip(
          label: Text(
            _providerSortBy == 'rate_desc'
                ? 'High to Low'.tr()
                : 'Availability'.tr(),
          ),
          onDeleted: () => setState(() => _providerSortBy = 'rate_asc'),
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
                          ? 'Filters'.tr()
                          : '${'Filters'.tr()} (${chips.length} ${'active'.tr()})',
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
                        child: _popupFilterChip(
                          icon: Icons.location_on_outlined,
                          text: _selectedState ?? 'All states'.tr(),
                        ),
                      ),
                      PopupMenuButton<String>(
                        onSelected: (value) {
                          setState(() => _providerSortBy = value);
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
                        child: _popupFilterChip(
                          icon: Icons.sort_rounded,
                          text: _providerSortBy == 'rate_desc'
                              ? 'High to Low'.tr()
                              : _providerSortBy == 'availability'
                              ? 'Availability'.tr()
                              : 'Low to High'.tr(),
                        ),
                      ),
                    ],
                  ),
                  if (chips.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.sm),
                    Wrap(
                      spacing: AppSpacing.sm,
                      runSpacing: AppSpacing.sm,
                      children: chips,
                    ),
                  ],
                  const SizedBox(height: AppSpacing.sm),
                  Row(
                    children: [
                      OutlinedButton.icon(
                        onPressed: () {
                          HapticFeedback.lightImpact();
                          setState(() {
                            _selectedState = null;
                            _providerSortBy = 'rate_asc';
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

  Widget _popupFilterChip({required IconData icon, required String text}) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.full),
        border: Border.all(color: context.appColors.border),
        color: Colors.white.withValues(alpha: context.isDark ? 0.08 : 0.7),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16),
          const SizedBox(width: AppSpacing.xs),
          Text(
            text,
            style: context.textTheme.bodySmall?.copyWith(
              color: context.colors.onSurface,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(width: AppSpacing.xs),
          const Icon(Icons.expand_more_rounded, size: 16),
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

  Widget _summaryCard(String label, double? value, String unit) {
    return GlassCard(
      child: SizedBox(
        width: 140,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: context.textTheme.bodySmall?.copyWith(
                color: context.appColors.textSecondary,
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              value == null ? '--' : '${value.inr}$unit',
              style: context.textTheme.titleMedium?.copyWith(
                color: AppColors.info,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }

  double? _avgHourly() {
    final hourly = _providers
        .map((e) => e.rates.hourly)
        .whereType<double>()
        .toList(growable: false);
    if (hourly.isEmpty) return _rateSummary.hourlyMin;
    return hourly.reduce((a, b) => a + b) / hourly.length;
  }

  Widget _trendChart() {
    if (_rateHistory.isEmpty) {
      return Center(child: Text('No data'.tr()));
    }

    final cleaned = _rateHistory
        .where((row) => (row['rate_daily'] as num?)?.toDouble() != null)
        .toList(growable: false);
    if (cleaned.isEmpty) {
      return Center(child: Text('No chartable history'.tr()));
    }

    const maxPoints = 10;
    final stride = cleaned.length <= maxPoints
        ? 1
        : (cleaned.length / maxPoints).ceil();
    final sampled = <Map<String, dynamic>>[];
    for (int i = 0; i < cleaned.length; i += stride) {
      sampled.add(cleaned[i]);
    }
    if (!identical(sampled.isNotEmpty ? sampled.last : null, cleaned.last)) {
      sampled.add(cleaned.last);
    }

    final values = sampled
        .map((row) => (row['rate_daily'] as num?)?.toDouble() ?? 0)
        .where((v) => v > 0)
        .toList(growable: false);
    if (values.isEmpty) {
      return Center(child: Text('No chartable history'.tr()));
    }

    final minValue = values.reduce((a, b) => a < b ? a : b);
    final maxValue = values.reduce((a, b) => a > b ? a : b);
    final paddedMin = (minValue * 0.88).floorToDouble();
    final paddedMax = (maxValue * 1.12).ceilToDouble();
    final yRange = (paddedMax - paddedMin).abs().toDouble();
    final yStep = (yRange <= 0 ? 1000.0 : yRange / 3).toDouble();

    return BarChart(
      BarChartData(
        minY: paddedMin,
        maxY: paddedMax,
        alignment: BarChartAlignment.spaceAround,
        groupsSpace: 10,
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: yStep,
          getDrawingHorizontalLine: (_) => FlLine(
            color: context.appColors.border.withValues(alpha: 0.55),
            strokeWidth: 1,
          ),
        ),
        borderData: FlBorderData(show: false),
        barTouchData: BarTouchData(
          enabled: true,
          touchTooltipData: BarTouchTooltipData(
            getTooltipColor: (_) => context.colors.surface,
            getTooltipItem: (group, _, rod, __) {
              final idx = group.x.toInt();
              if (idx < 0 || idx >= sampled.length) return null;
              final period = (sampled[idx]['period'] ?? '').toString();
              String shortPeriod = period;
              try {
                shortPeriod = DateFormat(
                  'MMM yy',
                ).format(DateFormat('yyyy-MM').parse(period));
              } catch (_) {}
              return BarTooltipItem(
                '$shortPeriod\n₹${rod.toY.toStringAsFixed(0)}',
                TextStyle(
                  color: context.colors.onSurface,
                  fontWeight: FontWeight.w700,
                  height: 1.2,
                ),
              );
            },
          ),
        ),
        titlesData: FlTitlesData(
          topTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          rightTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 40,
              interval: yStep,
              getTitlesWidget: (value, _) {
                if (value < paddedMin - 1 || value > paddedMax + 1) {
                  return const SizedBox.shrink();
                }
                final k = value / 1000;
                return Text(
                  '₹${k.toStringAsFixed(k >= 10 ? 0 : 1)}k',
                  style: TextStyle(
                    fontSize: 9,
                    color: context.appColors.textSecondary,
                    fontWeight: FontWeight.w600,
                  ),
                );
              },
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 24,
              getTitlesWidget: (value, _) {
                final idx = value.toInt();
                if (idx < 0 || idx >= sampled.length)
                  return const SizedBox.shrink();
                final period = (sampled[idx]['period'] ?? '').toString();
                DateTime? date;
                try {
                  date = DateFormat('yyyy-MM').parse(period);
                } catch (_) {}
                final label = date == null
                    ? period
                    : DateFormat('MMM').format(date);
                return Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(label, style: const TextStyle(fontSize: 9)),
                );
              },
            ),
          ),
        ),
        barGroups: List.generate(sampled.length, (i) {
          final daily = (sampled[i]['rate_daily'] as num?)?.toDouble() ?? 0;
          final isLatest = i == sampled.length - 1;
          return BarChartGroupData(
            x: i,
            barRods: [
              BarChartRodData(
                toY: daily,
                width: 14,
                borderRadius: BorderRadius.circular(4),
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: isLatest
                      ? [AppColors.primary, AppColors.info]
                      : [
                          AppColors.info.withValues(alpha: 0.75),
                          AppColors.primary.withValues(alpha: 0.6),
                        ],
                ),
              ),
            ],
          );
        }),
      ),
    );
  }

  Widget _comparisonTable() {
    final rows = [..._providers]
      ..sort((a, b) => (a.rates.daily ?? 0).compareTo(b.rates.daily ?? 0));

    final dailyRates = rows
        .map((e) => e.rates.daily ?? 0)
        .toList(growable: false);
    final minRate = dailyRates.isEmpty ? 0 : dailyRates.first;
    final maxRate = dailyRates.isEmpty ? 0 : dailyRates.last;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        InkWell(
          borderRadius: BorderRadius.circular(AppRadius.md),
          onTap: () {
            HapticFeedback.lightImpact();
            setState(() => _comparisonExpanded = !_comparisonExpanded);
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
            child: Row(
              children: [
                const Icon(
                  Icons.table_chart_rounded,
                  size: 18,
                  color: AppColors.info,
                ),
                const SizedBox(width: AppSpacing.xs),
                Expanded(
                  child: Text(
                    'Provider Rate Matrix',
                    style: context.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                Icon(
                  _comparisonExpanded
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
          secondChild: Column(
            children: [
              const SizedBox(height: AppSpacing.sm),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: DataTable(
                  columns: [
                    DataColumn(label: Text('Provider'.tr())),
                    DataColumn(label: Text('Daily Rate'.tr())),
                    DataColumn(label: Text('Operator'.tr())),
                    DataColumn(label: Text('Fuel'.tr())),
                    DataColumn(label: Text('Availability'.tr())),
                  ],
                  rows: rows
                      .map((p) {
                        final rate = p.rates.daily ?? 0;
                        Color tint = AppColors.warning.withValues(alpha: 0.15);
                        if (rate == minRate)
                          tint = AppColors.success.withValues(alpha: 0.15);
                        if (rate == maxRate)
                          tint = AppColors.danger.withValues(alpha: 0.12);
                        return DataRow(
                          cells: [
                            DataCell(Text(p.provider.name)),
                            DataCell(
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: AppSpacing.sm,
                                  vertical: AppSpacing.xs,
                                ),
                                decoration: BoxDecoration(
                                  color: tint,
                                  borderRadius: BorderRadius.circular(
                                    AppRadius.sm,
                                  ),
                                ),
                                child: Text(
                                  rate == 0
                                      ? '--'
                                      : '₹${rate.toStringAsFixed(0)}',
                                ),
                              ),
                            ),
                            DataCell(Text(p.operatorIncluded ? 'Yes' : 'No')),
                            DataCell(Text(p.fuelExtra ? 'Extra' : 'Included')),
                            DataCell(availabilityBadge(p.availability)),
                          ],
                        );
                      })
                      .toList(growable: false),
                ),
              ),
            ],
          ),
          crossFadeState: _comparisonExpanded
              ? CrossFadeState.showSecond
              : CrossFadeState.showFirst,
          duration: const Duration(milliseconds: 180),
        ),
      ],
    );
  }

  Widget _providerCard(int index, EquipmentProvider provider) {
    final expanded = _expandedProviders.contains(index);
    final accent = categoryColor(provider.category);
    final verdict = (provider.availability.toLowerCase().contains('available'))
        ? 'AVAILABLE'
        : 'CHECK';
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: _hubStyleCard(
        cardColor: context.isDark
            ? AppColors.darkCard.withValues(alpha: 0.72)
            : Colors.white.withValues(alpha: 0.74),
        child: InkWell(
          onTap: () {
            HapticFeedback.lightImpact();
            setState(() {
              if (expanded) {
                _expandedProviders.remove(index);
              } else {
                _expandedProviders.add(index);
              }
            });
          },
          borderRadius: BorderRadius.circular(AppRadius.lg),
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
                    Icon(categoryIcon(provider.category), color: accent),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Text(
                        provider.provider.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: context.textTheme.bodyMedium?.copyWith(
                          color: context.colors.onSurface,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    Icon(
                      expanded
                          ? Icons.expand_less_rounded
                          : Icons.expand_more_rounded,
                      color: context.appColors.textSecondary,
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  verdict,
                  style: context.textTheme.titleSmall?.copyWith(
                    color: accent,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  '${provider.location.display} • ${rateDisplay(provider.rates)}',
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
                  children: [
                    availabilityBadge(provider.availability),
                    if (provider.operatorIncluded) _tag('Operator Included'),
                    if (provider.fuelExtra) _tag('Fuel Extra'),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  children: [
                    if (provider.provider.phone.isNotEmpty)
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => _openCall(provider.provider.phone),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: context.colors.onSurface,
                            side: BorderSide(color: context.appColors.border),
                          ),
                          child: Text('Call'.tr()),
                        ),
                      ),
                    if (provider.provider.phone.isNotEmpty &&
                        provider.provider.whatsapp.isNotEmpty)
                      const SizedBox(width: AppSpacing.sm),
                    if (provider.provider.whatsapp.isNotEmpty)
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () =>
                              _openWhatsApp(provider.provider.whatsapp),
                          child: Text('WhatsApp'.tr()),
                        ),
                      ),
                  ],
                ),
                if (expanded) ...[
                  const SizedBox(height: AppSpacing.sm),
                  _line('Contact', provider.provider.contactPerson),
                  _line('Phone', provider.provider.phone),
                  _line('WhatsApp', provider.provider.whatsapp),
                  _line('Working Hours', provider.provider.workingHours),
                  _line('Address', provider.location.address),
                  _line(
                    'Service Radius',
                    provider.location.serviceRadiusKm == null
                        ? ''
                        : '${provider.location.serviceRadiusKm} km',
                  ),
                  if (provider.eligibility.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.xs),
                    Wrap(
                      spacing: AppSpacing.xs,
                      runSpacing: AppSpacing.xs,
                      children: provider.eligibility
                          .map((e) => _tag(e))
                          .toList(growable: false),
                    ),
                  ],
                  if (provider.documentsRequired.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.xs),
                    Wrap(
                      spacing: AppSpacing.xs,
                      runSpacing: AppSpacing.xs,
                      children: provider.documentsRequired
                          .map((e) => _tag(e))
                          .toList(growable: false),
                    ),
                  ],
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _historyCoverageLabel() {
    if (!_hasRealHistory || _rateHistory.isEmpty) {
      return 'Source: Estimated monthly pattern from current market rates.';
    }

    String periodToLabel(String period) {
      try {
        final d = DateFormat('yyyy-MM').parse(period);
        return DateFormat('MMM yyyy').format(d);
      } catch (_) {
        return period;
      }
    }

    final firstPeriod = (_rateHistory.first['period'] ?? '').toString();
    final lastPeriod = (_rateHistory.last['period'] ?? '').toString();
    if (firstPeriod.isEmpty || lastPeriod.isEmpty) {
      return 'Source: Live historical rates from rental rate history API.';
    }

    return 'Source: Live historical rates from ${periodToLabel(firstPeriod)} to ${periodToLabel(lastPeriod)}.';
  }

  Widget _hubStyleCard({required Color cardColor, required Widget child}) {
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

  Widget _line(String label, String value) {
    if (value.trim().isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(
              label,
              style: context.textTheme.bodySmall?.copyWith(
                color: context.appColors.textSecondary,
              ),
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  Widget _tag(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: context.appColors.card,
        borderRadius: BorderRadius.circular(AppRadius.full),
        border: Border.all(color: context.appColors.border),
      ),
      child: Text(text, style: context.textTheme.bodySmall),
    );
  }

  Widget _subsidyResult() {
    final cost = double.tryParse(_equipCostController.text.trim()) ?? 0;
    final subsidyRaw = cost * _subsidyPercent;
    final cap = _subsidyCategory == 'scst' ? 100000.0 : 50000.0;
    final subsidy = subsidyRaw > cap ? cap : subsidyRaw;
    final net = cost - subsidy;

    return Column(
      children: [
        _resultRow('Subsidy', subsidy.inr),
        _resultRow('Net Cost', net.inr),
      ],
    );
  }

  Widget _resultRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Text(
            value,
            style: context.textTheme.titleSmall?.copyWith(
              color: AppColors.success,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}
