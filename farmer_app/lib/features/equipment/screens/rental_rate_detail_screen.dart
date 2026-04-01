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
import '../../../shared/services/equipment_service.dart';
import '../../../shared/widgets/app_card.dart';
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
  ConsumerState<RentalRateDetailScreen> createState() => _RentalRateDetailScreenState();
}

class _RentalRateDetailScreenState extends ConsumerState<RentalRateDetailScreen> {
  bool _loading = true;
  bool _refreshing = false;
  String? _error;
  List<EquipmentProvider> _providers = const [];
  RateSummary _rateSummary = const RateSummary();
  String? _selectedState;

  final Set<int> _expandedProviders = <int>{};
  List<Map<String, dynamic>> _rateHistory = const [];
  bool _hasRealHistory = false;

  bool _subsidyExpanded = false;
  final TextEditingController _equipCostController = TextEditingController();
  String _subsidyCategory = 'general';

  bool _chcExpanded = false;
  Map<String, dynamic> _chcInfo = const {};

  @override
  void initState() {
    super.initState();
    _primeData();
  }

  @override
  void dispose() {
    _equipCostController.dispose();
    super.dispose();
  }

  bool get _hasSnapshot => _providers.isNotEmpty || _rateHistory.isNotEmpty;

  Future<void> _primeData() async {
    await _loadData();
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
      final detail = await svc.getRentalRateDetail(
        equipmentName: widget.equipmentName,
        state: _selectedState,
        limit: 50,
        preferCache: !forceRefresh,
        forceRefresh: forceRefresh,
      );
      if (!mounted) return;
      final history = await svc.getRateHistory(
        widget.equipmentName,
        state: _selectedState,
        preferCache: !forceRefresh,
        forceRefresh: forceRefresh,
      );
      if (!mounted) return;
      final chc = await svc.getChcInfo(
        preferCache: !forceRefresh,
        forceRefresh: forceRefresh,
      );
      if (!mounted) return;

      final providersJson = (detail['providers'] as List?)?.cast<Map<String, dynamic>>() ?? const [];
      final providers = providersJson.map(EquipmentProvider.fromJson).toList(growable: false);
      final summary = RateSummary.fromJson((detail['rate_summary'] as Map?)?.cast<String, dynamic>() ?? const {});

      final realHistory = (history['history'] as List?)?.cast<Map<String, dynamic>>() ?? const [];
      final hasReal = history['has_real_data'] == true;

      setState(() {
        _providers = providers;
        _rateSummary = summary;
        _hasRealHistory = hasReal;
        _rateHistory = hasReal ? realHistory : _simulatedHistory(summary.dailyMin ?? 0);
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
        context.showSnack('Unable to sync latest rates. Showing recent snapshot.', isError: true);
      }
    }
  }

  List<Map<String, dynamic>> _simulatedHistory(double baseDaily) {
    final now = DateTime.now();
    final safeBase = baseDaily <= 0 ? 2000 : baseDaily;
    final rows = <Map<String, dynamic>>[];
    final name = widget.equipmentName.toLowerCase();
    final peakMonth = name.contains('irrigation') || name.contains('pump') ? 6 : 11;

    for (int i = 11; i >= 0; i--) {
      final d = DateTime(now.year, now.month - i, 1);
      final monthDist = (d.month - peakMonth).abs();
      final seasonal = math.sin((12 - monthDist) / 12 * math.pi);
      final value = safeBase * (0.88 + (0.2 * seasonal));
      rows.add({
        'period': DateFormat('yyyy-MM').format(d),
        'rate_daily': value.roundToDouble(),
      });
    }
    return rows;
  }

  Future<void> _pickState() async {
    String? selected = _selectedState;
    await showModalBottomSheet<void>(
      context: context,
      builder: (ctx) {
        return SafeArea(
          child: ListView.builder(
            itemCount: indianStates.length + 1,
            itemBuilder: (_, i) {
              if (i == 0) {
                return RadioListTile<String?>(
                  title: const Text('All States'),
                  value: null,
                  groupValue: selected,
                  onChanged: (v) {
                    selected = v;
                    Navigator.pop(ctx);
                  },
                );
              }
              final state = indianStates[i - 1];
              return RadioListTile<String?>(
                title: Text(state),
                value: state,
                groupValue: selected,
                onChanged: (v) {
                  selected = v;
                  Navigator.pop(ctx);
                },
              );
            },
          ),
        );
      },
    );

    if (!mounted) return;
    setState(() => _selectedState = selected);
    await _loadData(forceRefresh: true);
  }

  Future<void> _openCall(String phone) async {
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
      return;
    }
    if (!mounted) return;
    context.showSnack('Unable to place call', isError: true);
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
    await Share.share('Check ${widget.equipmentName} rental rates: ₹$minDaily–₹$maxDaily/day on KisanKiAwaaz.');
  }

  Future<void> _showRentalRequestSheet() async {
    DateTime? startDate;
    DateTime? endDate;
    final messageController = TextEditingController();

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
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Request Rental', style: context.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
                  const SizedBox(height: AppSpacing.md),
                  Text(widget.equipmentName, style: context.textTheme.bodyLarge),
                  const SizedBox(height: AppSpacing.sm),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(startDate == null ? 'Select start date' : DateFormat('dd MMM yyyy').format(startDate!)),
                    trailing: const Icon(Icons.calendar_today_outlined),
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: ctx,
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                        initialDate: DateTime.now(),
                      );
                      if (picked != null) setLocal(() => startDate = picked);
                    },
                  ),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(endDate == null ? 'Select end date' : DateFormat('dd MMM yyyy').format(endDate!)),
                    trailing: const Icon(Icons.calendar_today_outlined),
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: ctx,
                        firstDate: startDate ?? DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                        initialDate: startDate ?? DateTime.now(),
                      );
                      if (picked != null) setLocal(() => endDate = picked);
                    },
                  ),
                  AppTextField(
                    label: 'Message',
                    hint: 'Add a request note',
                    maxLines: 3,
                    controller: messageController,
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () async {
                        if (startDate == null || endDate == null) return;
                        if (_providers.isEmpty) return;

                        try {
                          final equipmentId = _providers.first.id;
                          final created = await ref.read(equipmentServiceProvider).createRental({
                            'equipment_id': equipmentId,
                            'start_date': startDate!.toIso8601String(),
                            'end_date': endDate!.toIso8601String(),
                            'message': messageController.text.trim(),
                          });
                          if (!ctx.mounted) return;
                          Navigator.pop(ctx);
                          if (!mounted) return;
                          context.showSnack('Rental request submitted');
                          final rentalId = (created['id'] ?? created['rental_id'] ?? '').toString();
                          if (rentalId.isNotEmpty) {
                            context.push('${RoutePaths.rentalTicket}?id=${Uri.encodeComponent(rentalId)}');
                          }
                        } catch (e) {
                          if (!ctx.mounted) return;
                          context.showSnack(e.toString(), isError: true);
                        }
                      },
                      child: const Text('Submit Request'),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );

    messageController.dispose();
  }

  double get _subsidyPercent => _subsidyCategory == 'scst' ? 0.5 : 0.4;

  @override
  Widget build(BuildContext context) {
    final minDaily = _rateSummary.dailyMin?.toStringAsFixed(0) ?? '--';
    final maxDaily = _rateSummary.dailyMax?.toStringAsFixed(0) ?? '--';

    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        title: Text(widget.equipmentName),
        actions: [
          IconButton(onPressed: _share, icon: const Icon(Icons.share_outlined)),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: ElevatedButton(
            onPressed: _showRentalRequestSheet,
            child: const Text('Request Rental'),
          ),
        ),
      ),
      body: EquipmentPageBackground(
        child: _loading && !_hasSnapshot
            ? const EquipmentContentSkeleton(cardCount: 8)
            : _error != null && !_hasSnapshot
                ? ErrorView(message: _error!, onRetry: () => _loadData(forceRefresh: true))
                : RefreshIndicator(
                    onRefresh: () => _loadData(forceRefresh: true),
                    child: ListView(
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      children: [
                        EquipmentHeaderCard(
                          title: widget.equipmentName,
                          subtitle: 'Compare providers, evaluate trends, and book at the right time.',
                          icon: categoryIcon(widget.category),
                          badges: [
                            EquipmentInfoBadge(label: '${_providers.length} providers'),
                            EquipmentInfoBadge(label: '₹$minDaily-₹$maxDaily per day'),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        EquipmentRefreshStrip(
                          refreshing: _refreshing,
                          label: 'Refreshing prices, history, and provider availability...',
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
                        ActionChip(
                          onPressed: _pickState,
                          avatar: const Icon(Icons.place_outlined, size: 16),
                          label: Text(_selectedState ?? 'All States'),
                        ),
                        const SizedBox(height: AppSpacing.md),
                        SizedBox(
                          height: 110,
                          child: ListView(
                            scrollDirection: Axis.horizontal,
                            children: [
                              _summaryCard('Min Daily', _rateSummary.dailyMin, '/day'),
                              const SizedBox(width: AppSpacing.sm),
                              _summaryCard('Max Daily', _rateSummary.dailyMax, '/day'),
                              const SizedBox(width: AppSpacing.sm),
                              _summaryCard('Avg Hourly', _avgHourly(), '/hr'),
                            ],
                          ),
                        ),
                        const SizedBox(height: AppSpacing.md),
                        GlassCard(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _hasRealHistory
                                    ? 'Price Trend (Real Data)'
                                    : 'Price Trend (Estimated - simulated from current rates)',
                                style: context.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                              ),
                              const SizedBox(height: AppSpacing.md),
                              SizedBox(height: 240, child: _trendChart()),
                            ],
                          ),
                        ),
                        const SizedBox(height: AppSpacing.md),
                        AppCard(child: _comparisonTable()),
                        const SizedBox(height: AppSpacing.md),
                        ...List.generate(_providers.length, (i) => _providerCard(i, _providers[i])),
                        const SizedBox(height: AppSpacing.md),
                        GlassCard(
                          child: Column(
                            children: [
                              ListTile(
                                contentPadding: EdgeInsets.zero,
                                title: Text('SMAM Subsidy Calculator', style: context.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
                                trailing: Icon(_subsidyExpanded ? Icons.expand_less : Icons.expand_more),
                                onTap: () {
                                  HapticFeedback.lightImpact();
                                  setState(() => _subsidyExpanded = !_subsidyExpanded);
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
                                  segments: const [
                                    ButtonSegment(value: 'general', label: Text('General Farmer')),
                                    ButtonSegment(value: 'scst', label: Text('SC/ST or Small-Marginal')),
                                  ],
                                  selected: {_subsidyCategory},
                                  onSelectionChanged: (s) => setState(() => _subsidyCategory = s.first),
                                ),
                                const SizedBox(height: AppSpacing.sm),
                                _subsidyResult(),
                                const SizedBox(height: AppSpacing.sm),
                                Text(
                                  'SMAM caps: ₹1L max (SC/ST individual), ₹50K max (general), ₹25L max (CHC project).',
                                  style: context.textTheme.bodySmall?.copyWith(color: context.appColors.textSecondary),
                                ),
                                const SizedBox(height: AppSpacing.sm),
                                OutlinedButton(
                                  onPressed: () => launchUrl(Uri.parse('https://agrimachinery.nic.in'), mode: LaunchMode.externalApplication),
                                  child: const Text('Apply for SMAM Subsidy Online'),
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
                                title: const Text('What is a Custom Hiring Centre?'),
                                trailing: Icon(_chcExpanded ? Icons.expand_less : Icons.expand_more),
                                onTap: () {
                                  HapticFeedback.lightImpact();
                                  setState(() => _chcExpanded = !_chcExpanded);
                                },
                              ),
                              if (_chcExpanded) ...[
                                Text((_chcInfo['description'] ?? '').toString()),
                                const SizedBox(height: AppSpacing.sm),
                                ...(((_chcInfo['how_to_find'] as List?)?.map((e) => e.toString()) ?? const [])
                                    .map((e) => Padding(
                                          padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                                          child: Row(
                                            children: [
                                              const Icon(Icons.check_circle_outline, size: 16, color: AppColors.primary),
                                              const SizedBox(width: AppSpacing.xs),
                                              Expanded(child: Text(e)),
                                            ],
                                          ),
                                        ))),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
      ),
    );
  }

  Widget _summaryCard(String label, double? value, String unit) {
    return GlassCard(
      child: SizedBox(
        width: 140,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: context.textTheme.bodySmall?.copyWith(color: context.appColors.textSecondary)),
            const SizedBox(height: AppSpacing.xs),
            Text(value == null ? '--' : '${value.inr}$unit', style: context.textTheme.titleMedium?.copyWith(color: AppColors.success, fontWeight: FontWeight.w800)),
          ],
        ),
      ),
    );
  }

  double? _avgHourly() {
    final hourly = _providers.map((e) => e.rates.hourly).whereType<double>().toList(growable: false);
    if (hourly.isEmpty) return _rateSummary.hourlyMin;
    return hourly.reduce((a, b) => a + b) / hourly.length;
  }

  Widget _trendChart() {
    if (_rateHistory.isEmpty) {
      return const Center(child: Text('No data'));
    }

    final spots = <FlSpot>[];
    for (int i = 0; i < _rateHistory.length; i++) {
      final y = (_rateHistory[i]['rate_daily'] as num?)?.toDouble() ?? 0;
      spots.add(FlSpot(i.toDouble(), y));
    }

    return LineChart(
      LineChartData(
        gridData: const FlGridData(show: true),
        lineTouchData: const LineTouchData(enabled: true),
        borderData: FlBorderData(show: false),
        minX: 0,
        maxX: (_rateHistory.length - 1).toDouble(),
        titlesData: FlTitlesData(
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 42,
              getTitlesWidget: (v, _) => Text('₹${v.toInt()}', style: const TextStyle(fontSize: 10)),
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (v, _) {
                final idx = v.toInt();
                if (idx < 0 || idx >= _rateHistory.length) return const SizedBox.shrink();
                final period = (_rateHistory[idx]['period'] ?? '').toString();
                DateTime? d;
                try {
                  d = DateFormat('yyyy-MM').parse(period);
                } catch (_) {}
                final label = d == null ? period : DateFormat('MMM').format(d);
                return Text(label, style: const TextStyle(fontSize: 10));
              },
            ),
          ),
        ),
        lineBarsData: [
          LineChartBarData(
            spots: spots,
            isCurved: true,
            barWidth: 3,
            color: AppColors.primary,
            belowBarData: BarAreaData(
              show: true,
              gradient: LinearGradient(
                colors: [AppColors.primary.withValues(alpha: 0.24), AppColors.primary.withValues(alpha: 0.04)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
            dotData: const FlDotData(show: false),
          ),
        ],
      ),
    );
  }

  Widget _comparisonTable() {
    final rows = [..._providers]
      ..sort((a, b) => (a.rates.daily ?? 0).compareTo(b.rates.daily ?? 0));

    final dailyRates = rows.map((e) => e.rates.daily ?? 0).toList(growable: false);
    final minRate = dailyRates.isEmpty ? 0 : dailyRates.first;
    final maxRate = dailyRates.isEmpty ? 0 : dailyRates.last;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Rate Comparison', style: context.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
        const SizedBox(height: AppSpacing.sm),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: DataTable(
            columns: const [
              DataColumn(label: Text('Provider')),
              DataColumn(label: Text('Daily Rate')),
              DataColumn(label: Text('Operator')),
              DataColumn(label: Text('Fuel')),
              DataColumn(label: Text('Availability')),
            ],
            rows: rows.map((p) {
              final rate = p.rates.daily ?? 0;
              Color tint = AppColors.warning.withValues(alpha: 0.15);
              if (rate == minRate) tint = AppColors.success.withValues(alpha: 0.15);
              if (rate == maxRate) tint = AppColors.danger.withValues(alpha: 0.12);
              return DataRow(
                cells: [
                  DataCell(Text(p.provider.name)),
                  DataCell(Container(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
                    decoration: BoxDecoration(color: tint, borderRadius: BorderRadius.circular(AppRadius.sm)),
                    child: Text(rate == 0 ? '--' : '₹${rate.toStringAsFixed(0)}'),
                  )),
                  DataCell(Text(p.operatorIncluded ? 'Yes' : 'No')),
                  DataCell(Text(p.fuelExtra ? 'Extra' : 'Included')),
                  DataCell(availabilityBadge(p.availability)),
                ],
              );
            }).toList(growable: false),
          ),
        ),
      ],
    );
  }

  Widget _providerCard(int index, EquipmentProvider provider) {
    final expanded = _expandedProviders.contains(index);
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: AppCard(
        child: Column(
          children: [
            InkWell(
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
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(provider.provider.name, style: context.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
                        Text(provider.location.display, style: context.textTheme.bodySmall?.copyWith(color: context.appColors.textSecondary)),
                        const SizedBox(height: AppSpacing.xs),
                        Text(rateDisplay(provider.rates), style: context.textTheme.bodyMedium?.copyWith(color: AppColors.success, fontWeight: FontWeight.w800)),
                        const SizedBox(height: AppSpacing.xs),
                        Wrap(
                          spacing: AppSpacing.xs,
                          runSpacing: AppSpacing.xs,
                          children: [
                            if (provider.operatorIncluded) _tag('Operator Included'),
                            if (provider.fuelExtra) _tag('Fuel Extra'),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  availabilityBadge(provider.availability),
                  const SizedBox(width: AppSpacing.xs),
                  Icon(expanded ? Icons.expand_less : Icons.expand_more),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                if (provider.provider.phone.isNotEmpty)
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => _openCall(provider.provider.phone),
                      child: const Text('Call'),
                    ),
                  ),
                if (provider.provider.phone.isNotEmpty && provider.provider.whatsapp.isNotEmpty)
                  const SizedBox(width: AppSpacing.sm),
                if (provider.provider.whatsapp.isNotEmpty)
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _openWhatsApp(provider.provider.whatsapp),
                      child: const Text('WhatsApp'),
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
              _line('Service Radius', provider.location.serviceRadiusKm == null ? '' : '${provider.location.serviceRadiusKm} km'),
              if (provider.eligibility.isNotEmpty) ...[
                const SizedBox(height: AppSpacing.xs),
                Wrap(
                  spacing: AppSpacing.xs,
                  runSpacing: AppSpacing.xs,
                  children: provider.eligibility.map((e) => _tag(e)).toList(growable: false),
                ),
              ],
              if (provider.documentsRequired.isNotEmpty) ...[
                const SizedBox(height: AppSpacing.xs),
                Wrap(
                  spacing: AppSpacing.xs,
                  runSpacing: AppSpacing.xs,
                  children: provider.documentsRequired.map((e) => _tag(e)).toList(growable: false),
                ),
              ],
            ],
          ],
        ),
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
          SizedBox(width: 110, child: Text(label, style: context.textTheme.bodySmall?.copyWith(color: context.appColors.textSecondary))),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  Widget _tag(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
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
          Text(value, style: context.textTheme.titleSmall?.copyWith(color: AppColors.success, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}
