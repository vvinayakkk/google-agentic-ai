import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/services/equipment_service.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/detail_card.dart';
import '../../../shared/widgets/error_view.dart';
import '../widgets/equipment_shell.dart';

class EarningsScreen extends ConsumerStatefulWidget {
  const EarningsScreen({super.key});

  @override
  ConsumerState<EarningsScreen> createState() => _EarningsScreenState();
}

class _EarningsScreenState extends ConsumerState<EarningsScreen> {
  bool _loading = false;
  bool _refreshing = false;
  String? _error;
  List<Map<String, dynamic>> _completedRentals = [];
  _TimeFilter _filter = _TimeFilter.allTime;

  @override
  void initState() {
    super.initState();
    _primeData();
  }

  bool get _hasSnapshot => _completedRentals.isNotEmpty;

  Future<void> _primeData() async {
    await _fetchRentals();
    if (!mounted) return;
    _fetchRentals(forceRefresh: true, silent: true);
  }

  Future<void> _fetchRentals({
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
      final all =
          await ref.read(equipmentServiceProvider).listRentals(
                preferCache: !forceRefresh,
                forceRefresh: forceRefresh,
              );
      if (!mounted) return;
      setState(() {
        _completedRentals = all
            .where((r) =>
                (r['status']?.toString() ?? '').toLowerCase() ==
                'completed')
            .toList();
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
          'Could not sync latest earnings. Showing recent snapshot.'.tr(),
          isError: true,
        );
      }
    }
  }

  List<Map<String, dynamic>> get _filtered {
    final now = DateTime.now();
    return _completedRentals.where((r) {
      final endStr = r['end_date']?.toString();
      if (endStr == null) return true;
      final endDate = DateTime.tryParse(endStr);
      if (endDate == null) return true;
      switch (_filter) {
        case _TimeFilter.thisMonth:
          return endDate.month == now.month &&
              endDate.year == now.year;
        case _TimeFilter.last3Months:
          final cutoff =
              DateTime(now.year, now.month - 3, now.day);
          return endDate.isAfter(cutoff);
        case _TimeFilter.allTime:
          return true;
      }
    }).toList();
  }

  double get _totalEarnings => _filtered.fold(
      0.0,
      (sum, r) =>
          sum + ((r['total_price'] as num?)?.toDouble() ?? 0));

  /// Group by month for bar chart.
  Map<String, double> get _monthlyEarnings {
    final map = <String, double>{};
    for (final r in _filtered) {
      final endStr = r['end_date']?.toString();
      final endDate = endStr != null
          ? DateTime.tryParse(endStr)
          : DateTime.now();
      if (endDate == null) continue;
      final key =
          '${endDate.year}-${endDate.month.toString().padLeft(2, '0')}';
      map[key] = (map[key] ?? 0) +
          ((r['total_price'] as num?)?.toDouble() ?? 0);
    }
    return Map.fromEntries(
        map.entries.toList()..sort((a, b) => a.key.compareTo(b.key)));
  }

  @override
  Widget build(BuildContext context) {
    final items = _filtered;

    return Scaffold(
      appBar: AppBar(title: Text('earnings.title'.tr())),
      body: EquipmentPageBackground(
        child: _loading && !_hasSnapshot
            ? const EquipmentContentSkeleton(cardCount: 5)
            : _error != null && !_hasSnapshot
                ? ErrorView(
                    message: _error!, onRetry: () => _fetchRentals(forceRefresh: true))
                : RefreshIndicator(
                    onRefresh: () => _fetchRentals(forceRefresh: true),
                    child: SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: AppSpacing.allLg,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          EquipmentHeaderCard(
                            title: 'Earnings Snapshot',
                            subtitle: 'Track rental income, monthly performance, and completed bookings.',
                            icon: Icons.account_balance_wallet_outlined,
                            badges: [
                              EquipmentInfoBadge(label: '${items.length} completed rentals'),
                              EquipmentInfoBadge(label: _filter.label),
                            ],
                          ),
                          const SizedBox(height: AppSpacing.sm),
                          EquipmentRefreshStrip(
                            refreshing: _refreshing,
                            label: 'Refreshing earnings and payout history...',
                          ),
                          MetricCard(
                            label: 'earnings.total'.tr(),
                            value: _totalEarnings.inr,
                            icon: Icons.account_balance_wallet,
                            color: AppColors.success,
                          ),
                          const SizedBox(height: AppSpacing.lg),
                          SizedBox(
                            height: 40,
                            child: ListView(
                              scrollDirection: Axis.horizontal,
                              children: _TimeFilter.values.map((f) {
                                final selected = _filter == f;
                                return Padding(
                                  padding: const EdgeInsets.only(right: AppSpacing.sm),
                                  child: ChoiceChip(
                                    label: Text(f.label),
                                    selected: selected,
                                    onSelected: (_) => setState(() => _filter = f),
                                    selectedColor: AppColors.primary.withValues(alpha: 0.15),
                                  ),
                                );
                              }).toList(),
                            ),
                          ),
                          const SizedBox(height: AppSpacing.xl),
                          Text(
                            'earnings.monthly'.tr(),
                            style: context.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: AppSpacing.md),
                          _buildBarChart(context),
                          const SizedBox(height: AppSpacing.xl),
                          Text(
                            'earnings.completed_bookings'.tr(),
                            style: context.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: AppSpacing.md),
                          if (items.isEmpty)
                            EmptyView(
                              icon: Icons.money_off_outlined,
                              title: 'earnings.no_earnings'.tr(),
                            )
                          else
                            ...items.map((r) => Padding(
                                  padding: const EdgeInsets.only(bottom: AppSpacing.md),
                                  child: _EarningRow(rental: r),
                                )),
                          const SizedBox(height: AppSpacing.xxl),
                        ],
                      ),
                    ),
                  ),
      ),
    );
  }

  Widget _buildBarChart(BuildContext context) {
    final data = _monthlyEarnings;
    if (data.isEmpty) {
      return Container(
        height: 150,
        width: double.infinity,
        decoration: BoxDecoration(
          color: context.appColors.card,
          borderRadius: AppRadius.mdAll,
          border: Border.all(
              color: context.appColors.border, width: 0.5),
        ),
        child: Center(
          child: Text(
            'common.no_data'.tr(),
            style: context.textTheme.bodySmall?.copyWith(
                color: context.appColors.textSecondary),
          ),
        ),
      );
    }

    final maxVal = data.values
        .reduce((a, b) => a > b ? a : b)
        .clamp(1, double.infinity);

    return AppCard(
      child: SizedBox(
        height: 160,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: data.entries.map((e) {
            final ratio = e.value / maxVal;
            return Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(
                    horizontal: 4),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Text(
                      e.value.compact,
                      style: context.textTheme.bodySmall
                          ?.copyWith(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      height: 120 * ratio,
                      decoration: BoxDecoration(
                        color: AppColors.success.withValues(
                            alpha: 0.7 + 0.3 * ratio),
                        borderRadius:
                            const BorderRadius.vertical(
                          top: Radius.circular(4),
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      e.key.split('-').last,
                      style: context.textTheme.bodySmall
                          ?.copyWith(
                        fontSize: 10,
                        color: context
                            .appColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
//  Earning Row
// ═══════════════════════════════════════════════════════════════

class _EarningRow extends StatelessWidget {
  final Map<String, dynamic> rental;
  const _EarningRow({required this.rental});

  @override
  Widget build(BuildContext context) {
    final eqName = rental['equipment_name']?.toString() ??
        rental['equipment_id']?.toString() ??
        '-';
    final startStr = rental['start_date']?.toString();
    final endStr = rental['end_date']?.toString();
    final start =
        startStr != null ? DateTime.tryParse(startStr) : null;
    final end =
        endStr != null ? DateTime.tryParse(endStr) : null;
    final totalPrice =
        (rental['total_price'] as num?)?.toDouble() ?? 0;

    return AppCard(
      child: Row(
        children: [
          Container(
            padding: AppSpacing.allSm,
            decoration: BoxDecoration(
              color:
                  AppColors.success.withValues(alpha: 0.1),
              borderRadius: AppRadius.smAll,
            ),
            child: const Icon(Icons.agriculture,
                color: AppColors.success, size: 22),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  eqName,
                  style: context.textTheme.titleSmall
                      ?.copyWith(fontWeight: FontWeight.w600),
                ),
                if (start != null && end != null)
                  Text(
                    '${start.formatted} – ${end.formatted}',
                    style: context.textTheme.bodySmall
                        ?.copyWith(
                            color: context
                                .appColors.textSecondary),
                  ),
              ],
            ),
          ),
          Text(
            '+${totalPrice.inr}',
            style: context.textTheme.titleSmall?.copyWith(
              color: AppColors.success,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
//  Time Filter Enum
// ═══════════════════════════════════════════════════════════════

enum _TimeFilter {
  thisMonth('This Month'),
  last3Months('Last 3 Months'),
  allTime('All Time');

  final String label;
  const _TimeFilter(this.label);
}
