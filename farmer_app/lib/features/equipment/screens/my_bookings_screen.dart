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
import '../../../shared/widgets/error_view.dart';
import '../widgets/equipment_shell.dart';

class MyBookingsScreen extends ConsumerStatefulWidget {
  const MyBookingsScreen({super.key});

  @override
  ConsumerState<MyBookingsScreen> createState() => _MyBookingsScreenState();
}

class _MyBookingsScreenState extends ConsumerState<MyBookingsScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  bool _loading = true;
  bool _refreshing = false;
  String? _error;
  List<Map<String, dynamic>> _rentals = const [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _primeData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  bool get _hasSnapshot => _rentals.isNotEmpty;

  Future<void> _primeData() async {
    await _loadRentals();
    if (!mounted) return;
    _loadRentals(forceRefresh: true, silent: true);
  }

  String _currentUserId() {
    final user = ref.read(authStateProvider).value?.user;
    return (user?['uid'] ?? user?['id'] ?? user?['user_id'] ?? '').toString();
  }

  Future<void> _loadRentals({
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
      final data = await ref.read(equipmentServiceProvider).listRentals(
            preferCache: !forceRefresh,
            forceRefresh: forceRefresh,
          );
      if (!mounted) return;
      setState(() {
        _rentals = data;
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
        context.showSnack('Unable to refresh right now. Showing recent bookings.', isError: true);
      }
    }
  }

  Future<void> _doAction(String id, String action) async {
    try {
      final svc = ref.read(equipmentServiceProvider);
      if (action == 'cancel') await svc.cancelRental(id);
      if (action == 'approve') await svc.approveRental(id);
      if (action == 'reject') await svc.rejectRental(id);
      if (!mounted) return;
      context.showSnack('Action completed');
      _loadRentals(forceRefresh: true);
    } catch (e) {
      if (!mounted) return;
      context.showSnack(e.toString(), isError: true);
    }
  }

  List<Map<String, dynamic>> get _active {
    const set = {'pending', 'approved'};
    return _rentals
        .where((e) => set.contains((e['status'] ?? '').toString().toLowerCase()))
        .toList(growable: false);
  }

  List<Map<String, dynamic>> get _completed {
    return _rentals
        .where((e) => (e['status'] ?? '').toString().toLowerCase() == 'completed')
        .toList(growable: false);
  }

  List<Map<String, dynamic>> get _cancelled {
    const set = {'cancelled', 'rejected'};
    return _rentals
        .where((e) => set.contains((e['status'] ?? '').toString().toLowerCase()))
        .toList(growable: false);
  }

  List<Map<String, dynamic>> get _asOwner {
    final userId = _currentUserId();
    return _rentals
        .where((e) => (e['owner_id'] ?? '').toString() == userId)
        .toList(growable: false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('my_bookings.title'.tr()),
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: const [
            Tab(text: 'Active'),
            Tab(text: 'Completed'),
            Tab(text: 'Cancelled'),
            Tab(text: 'As Owner'),
          ],
        ),
      ),
      body: EquipmentPageBackground(
        child: _loading && !_hasSnapshot
            ? const EquipmentContentSkeleton(cardCount: 6)
            : _error != null && !_hasSnapshot
                ? ErrorView(message: _error!, onRetry: () => _loadRentals(forceRefresh: true))
                : Column(
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.lg, AppSpacing.lg, AppSpacing.sm),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            EquipmentHeaderCard(
                              title: 'Rental Bookings',
                              subtitle: 'Track active rentals, completed history, and owner approvals in one place.',
                              icon: Icons.event_note_outlined,
                              badges: [
                                EquipmentInfoBadge(label: '${_active.length} active'),
                                EquipmentInfoBadge(label: '${_asOwner.length} as owner'),
                              ],
                            ),
                            const SizedBox(height: AppSpacing.sm),
                            EquipmentRefreshStrip(
                              refreshing: _refreshing,
                              label: 'Refreshing your booking timeline...',
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: TabBarView(
                          controller: _tabController,
                          children: [
                            _tabContent(
                              items: _active,
                              icon: Icons.event_available,
                              emptyTitle: 'No active bookings',
                              emptyActionLabel: 'Browse Equipment',
                              onEmptyAction: () => context.push(RoutePaths.equipmentMarketplace),
                            ),
                            _tabContent(
                              items: _completed,
                              icon: Icons.task_alt,
                              emptyTitle: 'No completed rentals yet',
                              emptyActionLabel: 'View Active',
                              onEmptyAction: () => _tabController.animateTo(0),
                            ),
                            _tabContent(
                              items: _cancelled,
                              icon: Icons.cancel_outlined,
                              emptyTitle: 'No cancelled bookings',
                              emptyActionLabel: 'View Active',
                              onEmptyAction: () => _tabController.animateTo(0),
                            ),
                            _tabContent(
                              items: _asOwner,
                              icon: Icons.handshake_outlined,
                              emptyTitle: 'No owner-side bookings',
                              emptyActionLabel: 'My Equipment',
                              onEmptyAction: () => context.push(RoutePaths.myEquipment),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
      ),
    );
  }

  Widget _tabContent({
    required List<Map<String, dynamic>> items,
    required IconData icon,
    required String emptyTitle,
    required String emptyActionLabel,
    required VoidCallback onEmptyAction,
  }) {
    if (items.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            EmptyView(
              icon: icon,
              title: emptyTitle,
              subtitle: emptyActionLabel,
            ),
            const SizedBox(height: AppSpacing.sm),
            OutlinedButton(
              onPressed: onEmptyAction,
              child: Text(emptyActionLabel),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => _loadRentals(forceRefresh: true),
      child: ListView.builder(
        padding: const EdgeInsets.all(AppSpacing.lg),
        itemCount: items.length,
        itemBuilder: (_, i) => _bookingCard(items[i]),
      ),
    );
  }

  Widget _bookingCard(Map<String, dynamic> row) {
    final status = (row['status'] ?? '').toString().toLowerCase();
    final id = (row['id'] ?? row['rental_id'] ?? '').toString();
    final equipmentName = (row['equipment_name'] ?? '').toString();
    final userId = _currentUserId();
    final isOwner = (row['owner_id'] ?? '').toString() == userId;

    final color = status == 'pending'
        ? AppColors.warning
        : status == 'approved'
            ? AppColors.success
            : status == 'completed'
                ? AppColors.info
                : Colors.grey;

    final start = DateTime.tryParse((row['start_date'] ?? '').toString());
    final end = DateTime.tryParse((row['end_date'] ?? '').toString());
    final duration = (start != null && end != null) ? end.difference(start).inDays + 1 : null;

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: InkWell(
        onTap: () {
          HapticFeedback.lightImpact();
          context.push('${RoutePaths.rentalTicket}?id=${Uri.encodeComponent(id)}');
        },
        borderRadius: BorderRadius.circular(AppRadius.md),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border(left: BorderSide(color: color, width: 4)),
          ),
          child: AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(equipmentName, style: context.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(AppRadius.full),
                      ),
                      child: Text(status.toUpperCase(), style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 11)),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xs),
                Row(
                  children: [
                    const Icon(Icons.calendar_today_outlined, size: 14),
                    const SizedBox(width: AppSpacing.xs),
                    Text(
                      '${(row['start_date'] ?? '').toString()} → ${(row['end_date'] ?? '').toString()}',
                      style: context.textTheme.bodySmall,
                    ),
                    if (duration != null) ...[
                      const SizedBox(width: AppSpacing.sm),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(AppRadius.full),
                        ),
                        child: Text('$duration days', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 11)),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: AppSpacing.xs),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
                  decoration: BoxDecoration(
                    color: (isOwner ? AppColors.success : AppColors.info).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(AppRadius.full),
                  ),
                  child: Text(
                    isOwner ? "You're Lending" : "You're Renting",
                    style: TextStyle(
                      color: isOwner ? AppColors.success : AppColors.info,
                      fontWeight: FontWeight.w800,
                      fontSize: 11,
                    ),
                  ),
                ),
                if (_actionBar(id: id, status: status, isOwner: isOwner) != null) ...[
                  const SizedBox(height: AppSpacing.sm),
                  _actionBar(id: id, status: status, isOwner: isOwner)!,
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget? _actionBar({required String id, required String status, required bool isOwner}) {
    if (!isOwner && (status == 'pending' || status == 'approved')) {
      return Align(
        alignment: Alignment.centerLeft,
        child: OutlinedButton(
          onPressed: () => _doAction(id, 'cancel'),
          style: OutlinedButton.styleFrom(foregroundColor: AppColors.danger),
          child: const Text('Cancel'),
        ),
      );
    }

    if (isOwner && status == 'pending') {
      return Row(
        children: [
          Expanded(
            child: ElevatedButton(
              onPressed: () => _doAction(id, 'approve'),
              child: const Text('Approve'),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: OutlinedButton(
              onPressed: () => _doAction(id, 'reject'),
              style: OutlinedButton.styleFrom(foregroundColor: AppColors.danger),
              child: const Text('Reject'),
            ),
          ),
        ],
      );
    }

    return null;
  }
}
