import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/services/equipment_service.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/detail_card.dart';
import '../../../shared/widgets/error_view.dart';

class ListingDetailsScreen extends ConsumerStatefulWidget {
  final String equipmentId;
  const ListingDetailsScreen({super.key, required this.equipmentId});

  @override
  ConsumerState<ListingDetailsScreen> createState() =>
      _ListingDetailsScreenState();
}

class _ListingDetailsScreenState extends ConsumerState<ListingDetailsScreen> {
  Map<String, dynamic>? _equipment;
  bool _loading = true;
  String? _error;
  bool _booking = false;

  @override
  void initState() {
    super.initState();
    _fetchDetails();
  }

  Future<void> _fetchDetails() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final eq = await ref
          .read(equipmentServiceProvider)
          .getEquipmentById(widget.equipmentId);
      setState(() {
        _equipment = eq;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  double _calculateTotal(DateTime start, DateTime end) {
    final rate = (_equipment?['rate_per_hour'] as num?)?.toDouble() ??
        (_equipment?['price_per_day'] as num?)?.toDouble() ??
        0;
    final days = end.difference(start).inDays + 1;
    return rate * days;
  }

  Future<void> _showBookingDialog() async {
    DateTime? startDate;
    DateTime? endDate;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          title: Text('listing_details.book_now'.tr()),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.calendar_today),
                title: Text(startDate != null
                    ? startDate!.formatted
                    : 'listing_details.start_date'.tr()),
                onTap: () async {
                  final d = await showDatePicker(
                    context: ctx,
                    initialDate: DateTime.now(),
                    firstDate: DateTime.now(),
                    lastDate:
                        DateTime.now().add(const Duration(days: 365)),
                  );
                  if (d != null) setLocal(() => startDate = d);
                },
              ),
              ListTile(
                leading: const Icon(Icons.calendar_today),
                title: Text(endDate != null
                    ? endDate!.formatted
                    : 'listing_details.end_date'.tr()),
                onTap: () async {
                  final d = await showDatePicker(
                    context: ctx,
                    initialDate: startDate ?? DateTime.now(),
                    firstDate: startDate ?? DateTime.now(),
                    lastDate:
                        DateTime.now().add(const Duration(days: 365)),
                  );
                  if (d != null) setLocal(() => endDate = d);
                },
              ),
              if (startDate != null && endDate != null) ...[
                const SizedBox(height: AppSpacing.md),
                Text(
                  '${'listing_details.total_cost'.tr()}: '
                  '${_calculateTotal(startDate!, endDate!).inr}',
                  style: ctx.textTheme.titleMedium?.copyWith(
                    color: AppColors.success,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: Text('common.cancel'.tr()),
            ),
            FilledButton(
              onPressed: startDate != null && endDate != null
                  ? () => Navigator.pop(ctx, true)
                  : null,
              child: Text('listing_details.confirm_booking'.tr()),
            ),
          ],
        ),
      ),
    );

    if (confirmed == true && startDate != null && endDate != null) {
      setState(() => _booking = true);
      try {
        await ref.read(equipmentServiceProvider).createRental({
          'equipment_id': widget.equipmentId,
          'start_date': startDate!.iso,
          'end_date': endDate!.iso,
        });
        if (mounted) {
          context.showSnack('listing_details.booking_success'.tr());
        }
      } catch (e) {
        if (mounted) {
          context.showSnack(
              'listing_details.booking_error'.tr(), isError: true);
        }
      } finally {
        if (mounted) setState(() => _booking = false);
      }
    }
  }

  Future<void> _contactOwner() async {
    final phone = _equipment?['owner_phone']?.toString();
    if (phone != null && phone.isNotEmpty) {
      final uri = Uri.parse('tel:$phone');
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      }
    } else {
      if (mounted) {
        context.showSnack('common.no_data'.tr(), isError: true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('listing_details.title'.tr())),
      body: _loading
          ? const Center(
              child:
                  CircularProgressIndicator(color: AppColors.primary))
          : _error != null
              ? ErrorView(message: _error!, onRetry: _fetchDetails)
              : _buildContent(),
    );
  }

  Widget _buildContent() {
    final eq = _equipment!;
    final available = eq['available'] == true;
    final rate = (eq['rate_per_hour'] as num?)?.toDouble() ??
        (eq['price_per_day'] as num?)?.toDouble() ??
        0;
    final ownerId = eq['owner_id']?.toString() ?? '-';

    return SingleChildScrollView(
      padding: AppSpacing.allLg,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Hero Section ──
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  height: 180,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.07),
                    borderRadius: AppRadius.mdAll,
                  ),
                  child: const Icon(Icons.agriculture,
                      size: 64, color: AppColors.primary),
                ),
                const SizedBox(height: AppSpacing.lg),
                Text(
                  eq['name']?.toString() ?? '-',
                  style: context.textTheme.headlineSmall
                      ?.copyWith(fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),

          const SizedBox(height: AppSpacing.md),

          // ── Availability banner ──
          Container(
            width: double.infinity,
            padding: AppSpacing.allMd,
            decoration: BoxDecoration(
              color: available
                  ? AppColors.success.withValues(alpha: 0.1)
                  : AppColors.danger.withValues(alpha: 0.1),
              borderRadius: AppRadius.mdAll,
              border: Border.all(
                color: available
                    ? AppColors.success.withValues(alpha: 0.3)
                    : AppColors.danger.withValues(alpha: 0.3),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  available ? Icons.check_circle : Icons.cancel,
                  color:
                      available ? AppColors.success : AppColors.danger,
                  size: 20,
                ),
                const SizedBox(width: AppSpacing.sm),
                Text(
                  available
                      ? 'listing_details.available'.tr()
                      : 'listing_details.unavailable'.tr(),
                  style: context.textTheme.titleSmall?.copyWith(
                    color: available
                        ? AppColors.success
                        : AppColors.danger,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: AppSpacing.lg),

          // ── Details grid ──
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: AppSpacing.md,
            mainAxisSpacing: AppSpacing.md,
            childAspectRatio: 2.4,
            children: [
              DetailCard(
                icon: Icons.currency_rupee,
                label: 'listing_details.daily_rate'.tr(),
                value: rate.inr,
                iconColor: AppColors.success,
              ),
              DetailCard(
                icon: Icons.build,
                label: 'listing_details.condition'.tr(),
                value:
                    (eq['condition']?.toString() ?? '-').capitalize,
                iconColor: AppColors.accent,
              ),
              DetailCard(
                icon: Icons.location_on,
                label: 'listing_details.location'.tr(),
                value: eq['location']?.toString() ??
                    'common.unknown'.tr(),
                iconColor: AppColors.info,
              ),
              DetailCard(
                icon: Icons.person,
                label: 'listing_details.owner'.tr(),
                value: ownerId.length > 8
                    ? '${ownerId.substring(0, 8)}...'
                    : ownerId,
                iconColor: AppColors.primary,
              ),
            ],
          ),

          const SizedBox(height: AppSpacing.lg),

          // ── Description ──
          if (eq['description'] != null &&
              eq['description'].toString().isNotEmpty) ...[
            Text(
              'listing_details.description'.tr(),
              style: context.textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: AppSpacing.sm),
            AppCard(
              child: Text(
                eq['description'].toString(),
                style: context.textTheme.bodyMedium
                    ?.copyWith(height: 1.5),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
          ],

          // ── Contact section ──
          AppCard(
            onTap: _contactOwner,
            child: Row(
              children: [
                Container(
                  padding: AppSpacing.allSm,
                  decoration: BoxDecoration(
                    color:
                        AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: AppRadius.smAll,
                  ),
                  child: const Icon(Icons.phone,
                      color: AppColors.primary, size: 20),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Text(
                    'listing_details.contact_owner'.tr(),
                    style: context.textTheme.titleSmall
                        ?.copyWith(fontWeight: FontWeight.w600),
                  ),
                ),
                const Icon(Icons.chevron_right),
              ],
            ),
          ),

          const SizedBox(height: AppSpacing.xl),

          // ── Book button ──
          AppButton(
            label: 'listing_details.book_now'.tr(),
            icon: Icons.calendar_month,
            isLoading: _booking,
            onPressed: available ? _showBookingDialog : null,
          ),

          const SizedBox(height: AppSpacing.xxl),
        ],
      ),
    );
  }
}
