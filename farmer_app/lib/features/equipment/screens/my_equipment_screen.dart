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
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/services/equipment_service.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/error_view.dart';
import '../utils/equipment_utils.dart';
import '../widgets/equipment_shell.dart';

class MyEquipmentScreen extends ConsumerStatefulWidget {
  const MyEquipmentScreen({super.key});

  @override
  ConsumerState<MyEquipmentScreen> createState() => _MyEquipmentScreenState();
}

class _MyEquipmentScreenState extends ConsumerState<MyEquipmentScreen> {
  bool _loading = true;
  bool _refreshing = false;
  String? _error;

  List<Map<String, dynamic>> _equipment = const [];
  List<Map<String, dynamic>> _rentals = const [];

  @override
  void initState() {
    super.initState();
    _primeData();
  }

  bool get _hasSnapshot => _equipment.isNotEmpty || _rentals.isNotEmpty;

  Future<void> _primeData() async {
    await _loadData();
    if (!mounted) return;
    _loadData(forceRefresh: true, silent: true);
  }

  String _currentUserId() {
    final auth = ref.read(authStateProvider).value?.user;
    return (auth?['uid'] ?? auth?['id'] ?? auth?['user_id'] ?? '').toString();
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
      final equipment = await svc.listEquipment(
        preferCache: !forceRefresh,
        forceRefresh: forceRefresh,
      );
      if (!mounted) return;
      final rentals = await svc.listRentals(
        preferCache: !forceRefresh,
        forceRefresh: forceRefresh,
      );
      if (!mounted) return;

      setState(() {
        _equipment = equipment;
        _rentals = rentals;
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
        context.showSnack('Could not refresh now. Displaying recent cached data.', isError: true);
      }
    }
  }

  List<Map<String, dynamic>> get _incomingByOwner {
    final userId = _currentUserId();
    return _rentals
        .where((e) => (e['owner_id'] ?? '').toString() == userId)
        .toList(growable: false);
  }

  int get _pendingIncomingCount {
    return _incomingByOwner.where((e) => (e['status'] ?? '').toString().toLowerCase() == 'pending').length;
  }

  int get _availableCount {
    return _equipment.where((e) => (e['status'] ?? '').toString().toLowerCase() == 'available').length;
  }

  int get _completedRentalsCount {
    return _incomingByOwner.where((e) => (e['status'] ?? '').toString().toLowerCase() == 'completed').length;
  }

  Future<void> _deleteEquipment(String id) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('common.delete'.tr()),
        content: const Text('Are you sure you want to delete this listing?'),
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
      _loadData(forceRefresh: true);
    } catch (e) {
      if (!mounted) return;
      context.showSnack(e.toString(), isError: true);
    }
  }

  Future<void> _toggleAvailability(Map<String, dynamic> row) async {
    final id = (row['id'] ?? '').toString();
    if (id.isEmpty) return;
    final current = (row['status'] ?? '').toString().toLowerCase() == 'available';

    try {
      await ref.read(equipmentServiceProvider).updateEquipment(id, {'status': current ? 'unavailable' : 'available'});
      if (!mounted) return;
      context.showSnack(current ? 'Marked unavailable' : 'Marked available');
      _loadData(forceRefresh: true);
    } catch (e) {
      if (!mounted) return;
      context.showSnack(e.toString(), isError: true);
    }
  }

  Future<void> _handleRentalAction({required String id, required String action}) async {
    try {
      final svc = ref.read(equipmentServiceProvider);
      if (action == 'approve') await svc.approveRental(id);
      if (action == 'reject') await svc.rejectRental(id);
      if (!mounted) return;
      context.showSnack('Action completed');
      _loadData(forceRefresh: true);
    } catch (e) {
      if (!mounted) return;
      context.showSnack(e.toString(), isError: true);
    }
  }

  Future<void> _showAddEditSheet({Map<String, dynamic>? row}) async {
    final isEdit = row != null;
    final nameController = TextEditingController(text: (row?['name'] ?? '').toString());
    final hourController = TextEditingController(text: (row?['rate_per_hour'] ?? '').toString());
    final dayController = TextEditingController(text: (row?['rate_per_day'] ?? '').toString());
    final locationController = TextEditingController(text: (row?['location'] ?? '').toString());
    final phoneController = TextEditingController(text: (row?['contact_phone'] ?? '').toString());
    final descController = TextEditingController(text: (row?['description'] ?? '').toString());

    String type = ((row?['type'] ?? 'Tractor').toString());
    bool isAvailable = ((row?['status'] ?? 'available').toString().toLowerCase() == 'available');

    const equipmentTypes = [
      'Tractor',
      'Harvester',
      'Combine',
      'Rotavator',
      'Sprayer',
      'Seeder',
      'Water Pump',
      'Thresher',
      'Power Tiller',
      'Other',
    ];

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
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(isEdit ? 'Edit Equipment' : 'List Equipment', style: context.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
                    const SizedBox(height: AppSpacing.md),
                    AppTextField(label: 'Name', hint: 'Equipment name', controller: nameController),
                    const SizedBox(height: AppSpacing.sm),
                    DropdownButtonFormField<String>(
                      value: equipmentTypes.contains(type) ? type : 'Other',
                      items: equipmentTypes.map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(growable: false),
                      onChanged: (v) => setLocal(() => type = v ?? 'Other'),
                      decoration: const InputDecoration(labelText: 'Type'),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    SwitchListTile.adaptive(
                      contentPadding: EdgeInsets.zero,
                      value: isAvailable,
                      title: const Text('Available'),
                      onChanged: (v) => setLocal(() => isAvailable = v),
                    ),
                    AppTextField(label: 'Rate per hour', hint: '0', keyboardType: TextInputType.number, controller: hourController),
                    const SizedBox(height: AppSpacing.sm),
                    AppTextField(label: 'Rate per day', hint: '0', keyboardType: TextInputType.number, controller: dayController),
                    const SizedBox(height: AppSpacing.sm),
                    AppTextField(label: 'Location', hint: 'Village / District', controller: locationController),
                    const SizedBox(height: AppSpacing.sm),
                    AppTextField(label: 'Contact phone', hint: '10-digit number', keyboardType: TextInputType.phone, controller: phoneController),
                    const SizedBox(height: AppSpacing.sm),
                    AppTextField(label: 'Description', hint: 'Additional details', maxLines: 3, controller: descController),
                    const SizedBox(height: AppSpacing.lg),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () async {
                          HapticFeedback.lightImpact();
                          final name = nameController.text.trim();
                          final phone = phoneController.text.trim();
                          if (name.isEmpty || type.trim().isEmpty) {
                            context.showSnack('Name and type are required', isError: true);
                            return;
                          }
                          if (phone.isNotEmpty && phone.replaceAll(RegExp(r'[^0-9]'), '').length != 10) {
                            context.showSnack('Enter a valid 10-digit phone', isError: true);
                            return;
                          }

                          final payload = {
                            'name': name,
                            'type': type,
                            'status': isAvailable ? 'available' : 'unavailable',
                            'rate_per_hour': double.tryParse(hourController.text.trim()) ?? 0,
                            'rate_per_day': double.tryParse(dayController.text.trim()) ?? 0,
                            'location': locationController.text.trim(),
                            'contact_phone': phone,
                            'description': descController.text.trim(),
                          };

                          try {
                            final svc = ref.read(equipmentServiceProvider);
                            if (isEdit) {
                              final id = (row['id'] ?? '').toString();
                              await svc.updateEquipment(id, payload);
                            } else {
                              await svc.createEquipment(
                                name: name,
                                type: type,
                                status: isAvailable ? 'available' : 'unavailable',
                                ratePerHour: double.tryParse(hourController.text.trim()) ?? 0,
                                ratePerDay: double.tryParse(dayController.text.trim()),
                                location: locationController.text.trim(),
                                contactPhone: phone,
                                description: descController.text.trim(),
                              );
                            }
                            if (!ctx.mounted) return;
                            Navigator.pop(ctx);
                            if (!mounted) return;
                            context.showSnack(isEdit ? 'Updated successfully' : 'Created successfully');
                            _loadData(forceRefresh: true);
                          } catch (e) {
                            if (!mounted) return;
                            context.showSnack(e.toString(), isError: true);
                          }
                        },
                        child: Text(isEdit ? 'common.update'.tr() : 'common.save'.tr()),
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

    nameController.dispose();
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
        title: const Text('My Equipment'),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddEditSheet(),
        icon: const Icon(Icons.add),
        label: const Text('List Equipment'),
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
                          title: 'My Equipment Control',
                          subtitle: 'Manage listings, approve requests, and keep your equipment discoverable.',
                          icon: Icons.inventory_2_outlined,
                          badges: [
                            EquipmentInfoBadge(label: '${_equipment.length} listed'),
                            EquipmentInfoBadge(label: '$_pendingIncomingCount pending'),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        EquipmentRefreshStrip(refreshing: _refreshing, label: 'Refreshing your inventory and requests...'),
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
                              'Showing cached snapshot while network reconnects.',
                              style: context.textTheme.bodySmall?.copyWith(
                                color: AppColors.warning,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                        Row(
                          children: [
                            _statChip('Total', _equipment.length.toString(), AppColors.info),
                            const SizedBox(width: AppSpacing.sm),
                            _statChip('Available', _availableCount.toString(), AppColors.success),
                            const SizedBox(width: AppSpacing.sm),
                            _statChip('Pending', _pendingIncomingCount.toString(), AppColors.warning),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text('My Listings', style: context.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
                        const SizedBox(height: AppSpacing.sm),
                        if (_equipment.isEmpty)
                          EmptyView(
                            icon: Icons.inventory_2_outlined,
                            title: 'No equipment listed yet',
                            subtitle: 'Tap List Equipment to publish your first listing.',
                          )
                        else
                          ..._equipment.map((row) {
                            final id = (row['id'] ?? '').toString();
                            final status = (row['status'] ?? '').toString().toLowerCase();
                            final available = status == 'available';
                            final type = (row['type'] ?? '').toString();
                            final rateDay = (row['rate_per_day'] as num?)?.toDouble() ?? 0;

                            return Padding(
                              padding: const EdgeInsets.only(bottom: AppSpacing.md),
                              child: AppCard(
                                child: Column(
                                  children: [
                                    Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.all(AppSpacing.sm),
                                          decoration: BoxDecoration(
                                            color: categoryColor(type).withValues(alpha: 0.15),
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
                                              Text('${(row['type'] ?? '').toString()} • ${rateDay.inr}/day', style: context.textTheme.bodySmall?.copyWith(color: context.appColors.textSecondary)),
                                              Text((row['location'] ?? '').toString(), style: context.textTheme.bodySmall),
                                            ],
                                          ),
                                        ),
                                        availabilityBadge(available ? 'available' : 'low'),
                                      ],
                                    ),
                                    const SizedBox(height: AppSpacing.sm),
                                    Row(
                                      children: [
                                        Expanded(
                                          child: OutlinedButton.icon(
                                            onPressed: () => _showAddEditSheet(row: row),
                                            icon: const Icon(Icons.edit_outlined),
                                            label: const Text('Edit'),
                                          ),
                                        ),
                                        const SizedBox(width: AppSpacing.sm),
                                        Expanded(
                                          child: OutlinedButton.icon(
                                            onPressed: () => _toggleAvailability(row),
                                            icon: Icon(available ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                                            label: Text(available ? 'Unavailable' : 'Available'),
                                          ),
                                        ),
                                        const SizedBox(width: AppSpacing.sm),
                                        Expanded(
                                          child: OutlinedButton.icon(
                                            onPressed: () => _deleteEquipment(id),
                                            icon: const Icon(Icons.delete_outline, color: AppColors.danger),
                                            label: const Text('Delete', style: TextStyle(color: AppColors.danger)),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }),
                        const SizedBox(height: AppSpacing.md),
                        Text('Incoming Rental Requests', style: context.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
                        const SizedBox(height: AppSpacing.sm),
                        ..._incomingSection(),
                        const SizedBox(height: AppSpacing.md),
                        InkWell(
                          onTap: () => context.push(RoutePaths.earnings),
                          child: Container(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            decoration: BoxDecoration(
                              color: AppColors.success.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(AppRadius.md),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text('Completed rentals: $_completedRentalsCount', style: context.textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w700)),
                                ),
                                const Text('View Earnings →', style: TextStyle(color: AppColors.success, fontWeight: FontWeight.w800)),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xxl),
                      ],
                    ),
                  ),
      ),
    );
  }

  Widget _statChip(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.sm),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(AppRadius.full),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('$label: ', style: TextStyle(color: color, fontWeight: FontWeight.w700)),
            Text(value, style: TextStyle(color: color, fontWeight: FontWeight.w900)),
          ],
        ),
      ),
    );
  }

  List<Widget> _incomingSection() {
    if (_incomingByOwner.isEmpty) {
      return [
        EmptyView(
          icon: Icons.inbox_outlined,
          title: 'No incoming requests',
          subtitle: 'When farmers request your equipment, they will appear here.',
        ),
      ];
    }

    final pending = _incomingByOwner.where((e) => (e['status'] ?? '').toString().toLowerCase() == 'pending').toList(growable: false);
    final others = _incomingByOwner.where((e) => (e['status'] ?? '').toString().toLowerCase() != 'pending').toList(growable: false);

    final widgets = <Widget>[];
    if (pending.isNotEmpty) {
      widgets.add(_sectionLabel('Pending Requests', AppColors.warning));
      widgets.addAll(pending.map(_incomingCard));
    }
    if (others.isNotEmpty) {
      widgets.add(_sectionLabel('Other Requests', AppColors.info));
      widgets.addAll(others.map(_incomingCard));
    }
    return widgets;
  }

  Widget _sectionLabel(String label, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm, top: AppSpacing.sm),
      child: Text(label, style: context.textTheme.bodyLarge?.copyWith(color: color, fontWeight: FontWeight.w800)),
    );
  }

  Widget _incomingCard(Map<String, dynamic> row) {
    final id = (row['id'] ?? '').toString();
    final status = (row['status'] ?? '').toString().toLowerCase();
    final pending = status == 'pending';

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: AppCard(
        onTap: () => context.push('${RoutePaths.rentalTicket}?id=${Uri.encodeComponent(id)}'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text((row['equipment_name'] ?? '').toString(), style: context.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
                ),
                availabilityBadge(status),
              ],
            ),
            const SizedBox(height: AppSpacing.xs),
            Text('${(row['start_date'] ?? '').toString()} → ${(row['end_date'] ?? '').toString()}', style: context.textTheme.bodySmall),
            if ((row['message'] ?? '').toString().isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: AppSpacing.xs),
                child: Text((row['message'] ?? '').toString(), style: context.textTheme.bodySmall?.copyWith(color: context.appColors.textSecondary)),
              ),
            if (pending) ...[
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => _handleRentalAction(id: id, action: 'approve'),
                      child: const Text('Approve'),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _handleRentalAction(id: id, action: 'reject'),
                      child: const Text('Reject'),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
