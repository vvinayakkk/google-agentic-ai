import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/services/equipment_service.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_overlay.dart';

class MyBookingsScreen extends ConsumerStatefulWidget {
  const MyBookingsScreen({super.key});

  @override
  ConsumerState<MyBookingsScreen> createState() =>
      _MyBookingsScreenState();
}

class _MyBookingsScreenState extends ConsumerState<MyBookingsScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  bool _loading = false;
  String? _error;
  List<Map<String, dynamic>> _rentals = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _fetchRentals();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _fetchRentals() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final rentals =
          await ref.read(equipmentServiceProvider).listRentals();
      setState(() {
        _rentals = rentals;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  List<Map<String, dynamic>> _filterByStatus(List<String> statuses) =>
      _rentals
          .where((r) => statuses
              .contains((r['status']?.toString() ?? '').toLowerCase()))
          .toList();

  List<Map<String, dynamic>> get _active =>
      _filterByStatus(['pending', 'approved', 'active']);

  List<Map<String, dynamic>> get _completed =>
      _filterByStatus(['completed']);

  List<Map<String, dynamic>> get _cancelled =>
      _filterByStatus(['cancelled', 'rejected']);

  Future<void> _cancelRental(Map<String, dynamic> rental) async {
    final id = rental['rental_id']?.toString() ??
        rental['booking_id']?.toString() ??
        rental['id']?.toString() ??
        '';
    try {
      await ref.read(equipmentServiceProvider).cancelRental(id);
      if (mounted) {
        context.showSnack('my_bookings.cancel_booking'.tr());
        _fetchRentals();
      }
    } catch (e) {
      if (mounted) context.showSnack(e.toString(), isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('my_bookings.title'.tr()),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(text: 'my_bookings.tab_active'.tr()),
            Tab(text: 'my_bookings.tab_completed'.tr()),
            Tab(text: 'my_bookings.tab_cancelled'.tr()),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildRentalList(
              _active, 'my_bookings.tab_active'.tr()),
          _buildRentalList(
              _completed, 'my_bookings.tab_completed'.tr()),
          _buildRentalList(
              _cancelled, 'my_bookings.tab_cancelled'.tr()),
        ],
      ),
    );
  }

  Widget _buildRentalList(
      List<Map<String, dynamic>> items, String tab) {
    if (_loading) return const LoadingState(itemCount: 4);
    if (_error != null) {
      return ErrorView(message: _error!, onRetry: _fetchRentals);
    }
    if (items.isEmpty) {
      return EmptyView(
        icon: Icons.event_busy_outlined,
        title: 'my_bookings.no_bookings'.tr(),
        subtitle: tab,
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchRentals,
      child: ListView.separated(
        padding: AppSpacing.allLg,
        itemCount: items.length,
        separatorBuilder: (_, _) =>
            const SizedBox(height: AppSpacing.md),
        itemBuilder: (_, i) => _RentalCard(
          rental: items[i],
          onCancel: ['pending', 'approved', 'active'].contains(
                  (items[i]['status']?.toString() ?? '').toLowerCase())
              ? () => _cancelRental(items[i])
              : null,
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
//  Rental Card
// ═══════════════════════════════════════════════════════════════

class _RentalCard extends StatelessWidget {
  final Map<String, dynamic> rental;
  final VoidCallback? onCancel;

  const _RentalCard({required this.rental, this.onCancel});

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
        return AppColors.warning;
      case 'approved':
      case 'active':
      case 'completed':
        return AppColors.success;
      case 'rejected':
      case 'cancelled':
        return AppColors.danger;
      default:
        return AppColors.info;
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = rental['status']?.toString() ?? 'pending';
    final color = _statusColor(status);
    final eqName = rental['equipment_name']?.toString() ??
        rental['equipment_id']?.toString() ??
        '-';
    final startStr = rental['start_date']?.toString();
    final endStr = rental['end_date']?.toString();
    final start =
        startStr != null ? DateTime.tryParse(startStr) : null;
    final end = endStr != null ? DateTime.tryParse(endStr) : null;
    final totalPrice =
        (rental['total_price'] as num?)?.toDouble() ?? 0;

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: AppSpacing.allSm,
                decoration: BoxDecoration(
                  color:
                      AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: AppRadius.smAll,
                ),
                child: const Icon(Icons.agriculture,
                    color: AppColors.primary, size: 22),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      eqName,
                      style: context.textTheme.titleSmall
                          ?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 2),
                    if (start != null && end != null)
                      Text(
                        '${start.formatted} – ${end.formatted}',
                        style: context.textTheme.bodySmall
                            ?.copyWith(
                          color: context.appColors.textSecondary,
                        ),
                      ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: AppRadius.smAll,
                ),
                child: Text(
                  status.capitalize,
                  style: context.textTheme.bodySmall?.copyWith(
                    color: color,
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Text(
                '${'my_bookings.total_cost'.tr()}: ',
                style: context.textTheme.bodySmall?.copyWith(
                    color: context.appColors.textSecondary),
              ),
              Text(
                totalPrice.inr,
                style: context.textTheme.titleSmall?.copyWith(
                  color: AppColors.success,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              if (onCancel != null)
                TextButton.icon(
                  onPressed: onCancel,
                  icon: const Icon(Icons.cancel_outlined,
                      size: 18),
                  label:
                      Text('my_bookings.cancel_booking'.tr()),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.danger,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
