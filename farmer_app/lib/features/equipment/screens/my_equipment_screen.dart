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
    final isDark = context.isDark;
    final cardColor = isDark
        ? AppColors.darkCard.withValues(alpha: 0.72)
        : Colors.white.withValues(alpha: 0.74);

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
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(
                      AppSpacing.lg,
                      AppSpacing.sm,
                      AppSpacing.lg,
                      AppSpacing.xxxl,
                    ),
                    children: [
                      Row(
                        children: [
                          _iconAction(
                            icon: Icons.arrow_back_rounded,
                            onTap: () => Navigator.of(context).maybePop(),
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          Expanded(
                            child: Text(
                              'My Equipment',
                              textAlign: TextAlign.center,
                              style: context.textTheme.titleLarge?.copyWith(
                                color: Colors.black,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          _iconAction(
                            icon: Icons.refresh_rounded,
                            onTap: () => _loadData(forceRefresh: true),
                          ),
                          const SizedBox(width: AppSpacing.xs),
                          _iconAction(
                            icon: Icons.add_rounded,
                            onTap: () => _showAddEditSheet(),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      EquipmentRefreshStrip(
                        refreshing: _refreshing,
                        label: 'Refreshing your inventory and requests...',
                      ),
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
                          _statChip('Total', _equipment.length.toString()),
                          const SizedBox(width: AppSpacing.sm),
                          _statChip('Available', _availableCount.toString()),
                          const SizedBox(width: AppSpacing.sm),
                          _statChip('Pending', _pendingIncomingCount.toString()),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.md),
                      _sectionLabel('My Listings'),
                      const SizedBox(height: AppSpacing.sm),
                      if (_equipment.isEmpty)
                        EmptyView(
                          icon: Icons.inventory_2_outlined,
                          title: 'No equipment listed yet',
                          subtitle: 'Tap + to publish your first listing.',
                        )
                      else
                        ..._equipment.map(_listingCard),
                      const SizedBox(height: AppSpacing.md),
                      _sectionLabel('Incoming Rental Requests'),
                      const SizedBox(height: AppSpacing.sm),
                      ..._incomingSection(),
                      const SizedBox(height: AppSpacing.md),
                      _choiceCard(
                        cardColor: cardColor,
                        onTap: () => context.push(RoutePaths.earnings),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.analytics_outlined,
                              size: 30,
                              color: AppColors.success,
                            ),
                            const SizedBox(width: AppSpacing.md),
                            Expanded(
                              child: Text(
                                'Completed rentals: $_completedRentalsCount',
                                style: context.textTheme.bodyLarge?.copyWith(
                                  color: Colors.black,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                            const Icon(Icons.arrow_forward_ios_rounded, size: 18),
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

  Widget _iconAction({required IconData icon, required VoidCallback onTap}) {
    return IconButton(
      onPressed: onTap,
      icon: Icon(icon, size: 24, color: AppColors.success),
    );
  }

  Widget _choiceCard({
    required Color cardColor,
    required Widget child,
    VoidCallback? onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.8), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryDark.withValues(alpha: 0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: onTap,
          child: Padding(padding: const EdgeInsets.all(12), child: child),
        ),
      ),
    );
  }

  Widget _statChip(String label, String value) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.sm),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.76),
          borderRadius: BorderRadius.circular(AppRadius.full),
          border: Border.all(color: Colors.black12),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('$label: ', style: const TextStyle(color: Colors.black87, fontWeight: FontWeight.w700)),
            Text(value, style: const TextStyle(color: Colors.black, fontWeight: FontWeight.w900)),
          ],
        ),
      ),
    );
  }

  Widget _sectionLabel(String label) {
    return Text(
      label,
      style: context.textTheme.titleMedium?.copyWith(
        color: Colors.black,
        fontWeight: FontWeight.w900,
      ),
    );
  }

  Widget _listingCard(Map<String, dynamic> row) {
    final id = (row['id'] ?? '').toString();
    final status = (row['status'] ?? '').toString().toLowerCase();
    final available = status == 'available';
    final type = (row['type'] ?? '').toString();
    final rateDay = (row['rate_per_day'] as num?)?.toDouble() ?? 0;
    final isDark = context.isDark;
    final cardColor = isDark
        ? AppColors.darkCard.withValues(alpha: 0.72)
        : Colors.white.withValues(alpha: 0.74);

    return _choiceCard(
      cardColor: cardColor,
      child: Column(
        children: [
          Row(
            children: [
              Icon(
                categoryIcon(type),
                color: AppColors.success,
                size: 32,
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      (row['name'] ?? '').toString(),
                      style: context.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                        color: Colors.black,
                      ),
                    ),
                    Text(
                      '${(row['type'] ?? '').toString()} • ${rateDay.inr}/day',
                      style: context.textTheme.bodySmall?.copyWith(
                        color: Colors.black87,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      (row['location'] ?? '').toString(),
                      style: context.textTheme.bodySmall?.copyWith(
                        color: Colors.black87,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.sm,
                  vertical: AppSpacing.xs,
                ),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(AppRadius.full),
                  border: Border.all(color: Colors.black26),
                ),
                child: Text(
                  available ? 'AVAILABLE' : 'UNAVAILABLE',
                  style: const TextStyle(
                    color: Colors.black87,
                    fontWeight: FontWeight.w800,
                    fontSize: 11,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              Expanded(
                child: Center(
                  child: IconButton(
                    tooltip: 'Edit',
                    onPressed: () => _showAddEditSheet(row: row),
                    icon: const Icon(Icons.edit_outlined, size: 30),
                    color: AppColors.success,
                  ),
                ),
              ),
              Expanded(
                child: Center(
                  child: IconButton(
                    tooltip: available ? 'Mark unavailable' : 'Mark available',
                    onPressed: () => _toggleAvailability(row),
                    icon: Icon(
                      available
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined,
                      size: 30,
                    ),
                    color: AppColors.success,
                  ),
                ),
              ),
              Expanded(
                child: Center(
                  child: IconButton(
                    tooltip: 'Delete',
                    onPressed: () => _deleteEquipment(id),
                    icon: const Icon(Icons.delete_outline, size: 30),
                    color: AppColors.success,
                  ),
                ),
              ),
            ],
          ),
        ],
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
      widgets.add(_sectionLabel('Pending Requests'));
      widgets.add(const SizedBox(height: AppSpacing.sm));
      widgets.addAll(pending.map(_incomingCard));
    }
    if (others.isNotEmpty) {
      widgets.add(const SizedBox(height: AppSpacing.sm));
      widgets.add(_sectionLabel('Other Requests'));
      widgets.add(const SizedBox(height: AppSpacing.sm));
      widgets.addAll(others.map(_incomingCard));
    }
    return widgets;
  }

  Widget _incomingCard(Map<String, dynamic> row) {
    final id = (row['id'] ?? '').toString();
    final status = (row['status'] ?? '').toString().toLowerCase();
    final pending = status == 'pending';
    final isDark = context.isDark;
    final cardColor = isDark
        ? AppColors.darkCard.withValues(alpha: 0.72)
        : Colors.white.withValues(alpha: 0.74);

    return _choiceCard(
      cardColor: cardColor,
      onTap: () => context.push('${RoutePaths.rentalTicket}?id=${Uri.encodeComponent(id)}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  (row['equipment_name'] ?? '').toString(),
                  style: context.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w900,
                    color: Colors.black,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.sm,
                  vertical: AppSpacing.xs,
                ),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(AppRadius.full),
                  border: Border.all(color: Colors.black26),
                ),
                child: Text(
                  status.toUpperCase(),
                  style: const TextStyle(
                    color: Colors.black87,
                    fontWeight: FontWeight.w800,
                    fontSize: 11,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            '${(row['start_date'] ?? '').toString()} → ${(row['end_date'] ?? '').toString()}',
            style: context.textTheme.bodySmall?.copyWith(color: Colors.black87),
          ),
          if ((row['message'] ?? '').toString().isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: AppSpacing.xs),
              child: Text(
                (row['message'] ?? '').toString(),
                style: context.textTheme.bodySmall?.copyWith(
                  color: Colors.black87,
                ),
              ),
            ),
          if (pending) ...[
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                Expanded(
                  child: Center(
                    child: IconButton(
                      tooltip: 'Approve',
                      onPressed: () =>
                          _handleRentalAction(id: id, action: 'approve'),
                      icon: const Icon(Icons.check_circle_outline, size: 30),
                      color: AppColors.success,
                    ),
                  ),
                ),
                Expanded(
                  child: Center(
                    child: IconButton(
                      tooltip: 'Reject',
                      onPressed: () => _handleRentalAction(id: id, action: 'reject'),
                      icon: const Icon(Icons.cancel_outlined, size: 30),
                      color: AppColors.success,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
