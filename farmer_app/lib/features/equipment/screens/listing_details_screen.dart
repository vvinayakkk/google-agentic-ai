import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/services/equipment_service.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/error_view.dart';
import '../utils/equipment_utils.dart';
import '../widgets/equipment_shell.dart';

class ListingDetailsScreen extends ConsumerStatefulWidget {
  final String equipmentId;
  const ListingDetailsScreen({super.key, required this.equipmentId});

  @override
  ConsumerState<ListingDetailsScreen> createState() => _ListingDetailsScreenState();
}

class _ListingDetailsScreenState extends ConsumerState<ListingDetailsScreen> {
  bool _loading = true;
  bool _refreshing = false;
  String? _error;
  Map<String, dynamic>? _equipment;

  @override
  void initState() {
    super.initState();
    _primeData();
  }

  bool get _hasSnapshot => _equipment != null;

  Future<void> _primeData() async {
    await _load();
    if (!mounted) return;
    _load(forceRefresh: true, silent: true);
  }

  String _currentUserId() {
    final user = ref.read(authStateProvider).value?.user;
    return (user?['uid'] ?? user?['id'] ?? user?['user_id'] ?? '').toString();
  }

  Future<void> _load({
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
      final data = await ref.read(equipmentServiceProvider).getEquipmentById(
            widget.equipmentId,
            preferCache: !forceRefresh,
            forceRefresh: forceRefresh,
          );
      if (!mounted) return;
      setState(() {
        _equipment = data;
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
        context.showSnack('Could not refresh listing now. Showing recent data.', isError: true);
      }
    }
  }

  Future<void> _toggleAvailability() async {
    final row = _equipment;
    if (row == null) return;
    final id = (row['id'] ?? '').toString();
    if (id.isEmpty) return;

    final available = (row['status'] ?? '').toString().toLowerCase() == 'available';
    try {
      await ref.read(equipmentServiceProvider).updateEquipment(id, {'status': available ? 'unavailable' : 'available'});
      if (!mounted) return;
      context.showSnack(available ? 'Marked unavailable' : 'Marked available');
      _load(forceRefresh: true);
    } catch (e) {
      if (!mounted) return;
      context.showSnack(e.toString(), isError: true);
    }
  }

  Future<void> _delete() async {
    final row = _equipment;
    if (row == null) return;
    final id = (row['id'] ?? '').toString();
    if (id.isEmpty) return;

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Listing'),
        content: const Text('Are you sure you want to delete this equipment listing?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text('common.cancel'.tr())),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
            child: Text('common.delete'.tr()),
          ),
        ],
      ),
    );
    if (ok != true) return;

    try {
      await ref.read(equipmentServiceProvider).deleteEquipment(id);
      if (!mounted) return;
      context.showSnack('Deleted successfully');
      context.pop();
    } catch (e) {
      if (!mounted) return;
      context.showSnack(e.toString(), isError: true);
    }
  }

  Future<void> _requestRental() async {
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
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(startDate == null ? 'Start date' : DateFormat('dd MMM yyyy').format(startDate!)),
                    trailing: const Icon(Icons.calendar_today_outlined),
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: ctx,
                        initialDate: DateTime.now(),
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                      );
                      if (picked != null) setLocal(() => startDate = picked);
                    },
                  ),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(endDate == null ? 'End date' : DateFormat('dd MMM yyyy').format(endDate!)),
                    trailing: const Icon(Icons.calendar_today_outlined),
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: ctx,
                        initialDate: startDate ?? DateTime.now(),
                        firstDate: startDate ?? DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                      );
                      if (picked != null) setLocal(() => endDate = picked);
                    },
                  ),
                  AppTextField(label: 'Message', hint: 'Optional request note', maxLines: 3, controller: messageController),
                  const SizedBox(height: AppSpacing.lg),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () async {
                        final equipmentId = (_equipment?['id'] ?? '').toString();
                        if (startDate == null || endDate == null || equipmentId.isEmpty) return;
                        try {
                          final data = await ref.read(equipmentServiceProvider).createRental({
                            'equipment_id': equipmentId,
                            'start_date': startDate!.toIso8601String(),
                            'end_date': endDate!.toIso8601String(),
                            'message': messageController.text.trim(),
                          });
                          if (!ctx.mounted) return;
                          Navigator.pop(ctx);
                          if (!mounted) return;
                          final rentalId = (data['id'] ?? '').toString();
                          context.showSnack('Request submitted');
                          if (rentalId.isNotEmpty) {
                            context.push('${RoutePaths.rentalTicket}?id=${Uri.encodeComponent(rentalId)}');
                          }
                        } catch (e) {
                          if (!mounted) return;
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

  Future<void> _showEditSheet() async {
    final row = _equipment;
    if (row == null) return;

    final nameController = TextEditingController(text: (row['name'] ?? '').toString());
    final typeController = TextEditingController(text: (row['type'] ?? '').toString());
    final hourController = TextEditingController(text: (row['rate_per_hour'] ?? '').toString());
    final dayController = TextEditingController(text: (row['rate_per_day'] ?? '').toString());
    final locationController = TextEditingController(text: (row['location'] ?? '').toString());
    final phoneController = TextEditingController(text: (row['contact_phone'] ?? '').toString());
    final descController = TextEditingController(text: (row['description'] ?? '').toString());

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        return Padding(
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
                Text('Edit Equipment', style: context.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
                const SizedBox(height: AppSpacing.md),
                AppTextField(label: 'Name', controller: nameController),
                const SizedBox(height: AppSpacing.sm),
                AppTextField(label: 'Type', controller: typeController),
                const SizedBox(height: AppSpacing.sm),
                AppTextField(label: 'Rate per hour', keyboardType: TextInputType.number, controller: hourController),
                const SizedBox(height: AppSpacing.sm),
                AppTextField(label: 'Rate per day', keyboardType: TextInputType.number, controller: dayController),
                const SizedBox(height: AppSpacing.sm),
                AppTextField(label: 'Location', controller: locationController),
                const SizedBox(height: AppSpacing.sm),
                AppTextField(label: 'Contact phone', controller: phoneController),
                const SizedBox(height: AppSpacing.sm),
                AppTextField(label: 'Description', maxLines: 3, controller: descController),
                const SizedBox(height: AppSpacing.lg),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () async {
                      final id = (row['id'] ?? '').toString();
                      if (id.isEmpty) return;
                      try {
                        await ref.read(equipmentServiceProvider).updateEquipment(id, {
                          'name': nameController.text.trim(),
                          'type': typeController.text.trim(),
                          'rate_per_hour': double.tryParse(hourController.text.trim()) ?? 0,
                          'rate_per_day': double.tryParse(dayController.text.trim()) ?? 0,
                          'location': locationController.text.trim(),
                          'contact_phone': phoneController.text.trim(),
                          'description': descController.text.trim(),
                        });
                        if (!ctx.mounted) return;
                        Navigator.pop(ctx);
                        if (!mounted) return;
                        context.showSnack('Updated successfully');
                        _load(forceRefresh: true);
                      } catch (e) {
                        if (!mounted) return;
                        context.showSnack(e.toString(), isError: true);
                      }
                    },
                    child: Text('common.update'.tr()),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );

    nameController.dispose();
    typeController.dispose();
    hourController.dispose();
    dayController.dispose();
    locationController.dispose();
    phoneController.dispose();
    descController.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        title: Text('listing_details.title'.tr()),
      ),
      body: EquipmentPageBackground(
        child: _loading && !_hasSnapshot
            ? const EquipmentContentSkeleton(cardCount: 5)
            : _error != null && !_hasSnapshot
                ? ErrorView(message: _error!, onRetry: () => _load(forceRefresh: true))
                : _content(),
      ),
    );
  }

  Widget _content() {
    final row = _equipment ?? const <String, dynamic>{};
    final status = (row['status'] ?? 'unavailable').toString().toLowerCase();
    final available = status == 'available';

    final ownerId = (row['farmer_id'] ?? row['owner_id'] ?? '').toString();
    final currentUserId = _currentUserId();
    final isOwner = ownerId.isNotEmpty && ownerId == currentUserId;

    final type = (row['type'] ?? '').toString();
    final rateHour = (row['rate_per_hour'] as num?)?.toDouble() ?? 0;
    final rateDay = (row['rate_per_day'] as num?)?.toDouble() ?? 0;
    final listingName = (row['name'] ?? '').toString();

    return RefreshIndicator(
      onRefresh: () => _load(forceRefresh: true),
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          EquipmentRefreshStrip(
            refreshing: _refreshing,
            label: 'Refreshing listing details...',
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
                'Showing recent cached listing data.',
                style: context.textTheme.bodySmall?.copyWith(
                  color: AppColors.warning,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          EquipmentHeaderCard(
            title: listingName,
            subtitle: '${type.isEmpty ? 'Other equipment' : type} listing with direct owner response.',
            icon: categoryIcon(type),
            badges: [
              EquipmentInfoBadge(label: available ? 'Available now' : 'Currently unavailable'),
              EquipmentInfoBadge(label: '${rateDay.inr}/day'),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(child: _rateCard('Hourly', rateHour)),
              const SizedBox(width: AppSpacing.sm),
              Expanded(child: _rateCard('Daily', rateDay)),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _line('Phone', (row['contact_phone'] ?? '').toString()),
                _line('Location', (row['location'] ?? '').toString()),
                _line('Description', (row['description'] ?? '').toString()),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          if (isOwner) ...[
            OutlinedButton(
              onPressed: _toggleAvailability,
              child: Text(available ? 'Set Unavailable' : 'Set Available'),
            ),
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: _showEditSheet,
                    child: Text('common.edit'.tr()),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: OutlinedButton(
                    onPressed: _delete,
                    style: OutlinedButton.styleFrom(foregroundColor: AppColors.danger),
                    child: Text('common.delete'.tr()),
                  ),
                ),
              ],
            ),
          ] else ...[
            ElevatedButton(
              onPressed: available ? _requestRental : null,
              child: Text('listing_details.book_now'.tr()),
            ),
          ],
        ],
      ),
    );
  }

  Widget _rateCard(String label, double value) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: context.textTheme.bodySmall?.copyWith(color: context.appColors.textSecondary)),
          const SizedBox(height: AppSpacing.xs),
          Text(value.inr, style: context.textTheme.titleMedium?.copyWith(color: AppColors.success, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }

  Widget _line(String title, String value) {
    if (value.trim().isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 95, child: Text(title, style: context.textTheme.bodySmall?.copyWith(color: context.appColors.textSecondary))),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}
