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
        context.showSnack(
          'Unable to refresh right now. Showing recent bookings.'.tr(),
          isError: true,
        );
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
      context.showSnack('Action completed'.tr());
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
    final isDark = context.isDark;
    const textColor = Colors.black;
    const subColor = Colors.black54;
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
              ? const EquipmentContentSkeleton(cardCount: 6)
              : _error != null && !_hasSnapshot
              ? ErrorView(
                  message: _error!,
                  onRetry: () => _loadRentals(forceRefresh: true),
                )
              : Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(
                        AppSpacing.lg,
                        AppSpacing.sm,
                        AppSpacing.lg,
                        AppSpacing.sm,
                      ),
                      child: Row(
                        children: [
                          _topAction(
                            icon: Icons.arrow_back_rounded,
                            onTap: () => Navigator.of(context).maybePop(),
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                Text(
                                  'my_bookings.title'.tr(),
                                  textAlign: TextAlign.center,
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleLarge
                                      ?.copyWith(
                                        color: textColor,
                                        fontWeight: FontWeight.w800,
                                      ),
                                ),
                                Text(
                                  'Manage active, completed, and owner-side rentals'
                                      .tr(),
                                  textAlign: TextAlign.center,
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.copyWith(color: subColor),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          _topAction(
                            icon: Icons.refresh_rounded,
                            onTap: () => _loadRentals(forceRefresh: true),
                          ),
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.lg,
                      ),
                      child: EquipmentRefreshStrip(
                        refreshing: _refreshing,
                        label: 'Refreshing your booking timeline...'.tr(),
                      ),
                    ),
                    if (_error != null && _hasSnapshot) ...[
                      Padding(
                        padding: const EdgeInsets.fromLTRB(
                          AppSpacing.lg,
                          0,
                          AppSpacing.lg,
                          AppSpacing.sm,
                        ),
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(AppSpacing.sm),
                          decoration: BoxDecoration(
                            color: AppColors.warning.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(AppRadius.md),
                          ),
                          child: Text(
                            'Showing cached booking data while connection recovers.'
                                .tr(),
                            style: context.textTheme.bodySmall?.copyWith(
                              color: AppColors.warning,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    ],
                    Padding(
                      padding: const EdgeInsets.fromLTRB(
                        AppSpacing.lg,
                        0,
                        AppSpacing.lg,
                        AppSpacing.sm,
                      ),
                      child: _glassCard(
                        cardColor: cardColor,
                        child: Row(
                          children: [
                            _metricPill(
                              icon: Icons.event_available_rounded,
                              label: 'Active'.tr(),
                              value: _active.length,
                            ),
                            const SizedBox(width: AppSpacing.sm),
                            _metricPill(
                              icon: Icons.task_alt_rounded,
                              label: 'Done'.tr(),
                              value: _completed.length,
                            ),
                            const SizedBox(width: AppSpacing.sm),
                            _metricPill(
                              icon: Icons.handshake_outlined,
                              label: 'Owner'.tr(),
                              value: _asOwner.length,
                            ),
                          ],
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.lg,
                      ),
                      child: _glassCard(
                        cardColor: cardColor,
                        child: TabBar(
                          controller: _tabController,
                          isScrollable: false,
                          indicatorSize: TabBarIndicatorSize.tab,
                          indicator: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(AppRadius.full),
                            border: Border.all(color: Colors.black26),
                          ),
                          labelColor: textColor,
                          unselectedLabelColor: subColor,
                          labelStyle: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                          ),
                          unselectedLabelStyle: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                          ),
                          tabs: [
                            Tab(text: 'Active'.tr()),
                            Tab(text: 'Completed'.tr()),
                            Tab(text: 'Cancelled'.tr()),
                            Tab(text: 'Owner'.tr()),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Expanded(
                      child: TabBarView(
                        controller: _tabController,
                        children: [
                          _tabContent(
                            items: _active,
                            icon: Icons.event_available,
                            emptyTitle: 'No active bookings'.tr(),
                            emptyActionLabel: 'Browse Equipment'.tr(),
                            onEmptyAction: () =>
                                context.push(RoutePaths.equipmentMarketplace),
                          ),
                          _tabContent(
                            items: _completed,
                            icon: Icons.task_alt,
                            emptyTitle: 'No completed rentals yet'.tr(),
                            emptyActionLabel: 'View Active'.tr(),
                            onEmptyAction: () => _tabController.animateTo(0),
                          ),
                          _tabContent(
                            items: _cancelled,
                            icon: Icons.cancel_outlined,
                            emptyTitle: 'No cancelled bookings'.tr(),
                            emptyActionLabel: 'View Active'.tr(),
                            onEmptyAction: () => _tabController.animateTo(0),
                          ),
                          _tabContent(
                            items: _asOwner,
                            icon: Icons.handshake_outlined,
                            emptyTitle: 'No owner-side bookings'.tr(),
                            emptyActionLabel: 'My Equipment'.tr(),
                            onEmptyAction: () => context.push(RoutePaths.myEquipment),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
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
      return RefreshIndicator(
        onRefresh: () => _loadRentals(forceRefresh: true),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(AppSpacing.lg),
          children: [
            EmptyView(icon: icon, title: emptyTitle, subtitle: emptyActionLabel),
            const SizedBox(height: AppSpacing.sm),
            Center(
              child: OutlinedButton(
                onPressed: onEmptyAction,
                child: Text(emptyActionLabel),
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => _loadRentals(forceRefresh: true),
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
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

    final start = DateTime.tryParse((row['start_date'] ?? '').toString());
    final end = DateTime.tryParse((row['end_date'] ?? '').toString());
    final duration = (start != null && end != null)
        ? end.difference(start).inDays + 1
        : null;
    final actionBar = _actionBar(id: id, status: status, isOwner: isOwner);
    final isDark = context.isDark;
    final cardColor = isDark
        ? AppColors.darkCard.withValues(alpha: 0.72)
        : Colors.white.withValues(alpha: 0.74);

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: _glassCard(
        cardColor: cardColor,
        onTap: () {
          HapticFeedback.lightImpact();
          context.push('${RoutePaths.rentalTicket}?id=${Uri.encodeComponent(id)}');
        },
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.md),
            color: Colors.white,
            border: Border.all(color: Colors.black12),
          ),
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(
                    Icons.calendar_month_rounded,
                    color: AppColors.success,
                    size: 22,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      equipmentName,
                      style: context.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: Colors.black,
                      ),
                    ),
                  ),
                  _statusPill(status: status),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  const Icon(
                    Icons.schedule_rounded,
                    size: 14,
                    color: AppColors.success,
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  Expanded(
                    child: Text(
                      '${(row['start_date'] ?? '').toString()} → ${(row['end_date'] ?? '').toString()}',
                      style: context.textTheme.bodySmall?.copyWith(color: Colors.black87),
                    ),
                  ),
                  if (duration != null)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.sm,
                        vertical: AppSpacing.xs,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        border: Border.all(color: Colors.black26),
                        borderRadius: BorderRadius.circular(AppRadius.full),
                      ),
                      child: Text(
                        '$duration ${'days'.tr()}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 11,
                          color: Colors.black,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.sm,
                  vertical: AppSpacing.xs,
                ),
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border.all(color: Colors.black26),
                  borderRadius: BorderRadius.circular(AppRadius.full),
                ),
                child: Text(
                    isOwner
                        ? "You're Lending".tr()
                        : "You're Renting".tr(),
                  style: const TextStyle(
                    color: Colors.black,
                    fontWeight: FontWeight.w800,
                    fontSize: 11,
                  ),
                ),
              ),
              if (actionBar != null) ...[
                const SizedBox(height: AppSpacing.sm),
                actionBar,
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _statusPill({required String status}) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: Colors.black26),
        borderRadius: BorderRadius.circular(AppRadius.full),
      ),
      child: Text(
        status.toUpperCase(),
        style: const TextStyle(
          color: Colors.black,
          fontWeight: FontWeight.w800,
          fontSize: 11,
        ),
      ),
    );
  }

  Widget _topAction({required IconData icon, required VoidCallback onTap}) {
    return IconButton(
      onPressed: onTap,
      icon: Icon(icon, size: 22, color: AppColors.success),
    );
  }

  Widget _glassCard({
    required Color cardColor,
    required Widget child,
    VoidCallback? onTap,
  }) {
    return Container(
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
          child: Padding(padding: const EdgeInsets.all(10), child: child),
        ),
      ),
    );
  }

  Widget _metricPill({
    required IconData icon,
    required String label,
    required int value,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.sm,
          vertical: AppSpacing.sm,
        ),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(AppRadius.full),
          border: Border.all(color: Colors.black12),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 15, color: AppColors.success),
            const SizedBox(width: AppSpacing.xs),
            Text(
              '$label $value',
              style: const TextStyle(
                color: Colors.black,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
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
          child: Text('Cancel'.tr()),
        ),
      );
    }

    if (isOwner && status == 'pending') {
      return Row(
        children: [
          Expanded(
            child: ElevatedButton(
              onPressed: () => _doAction(id, 'approve'),
              child: Text('Approve'.tr()),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: OutlinedButton(
              onPressed: () => _doAction(id, 'reject'),
              style: OutlinedButton.styleFrom(foregroundColor: AppColors.danger),
              child: Text('Reject'.tr()),
            ),
          ),
        ],
      );
    }

    return null;
  }
}
