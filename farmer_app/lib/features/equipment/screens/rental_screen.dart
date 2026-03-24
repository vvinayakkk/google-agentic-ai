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
import '../../../shared/services/equipment_service.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_overlay.dart';

class RentalScreen extends ConsumerStatefulWidget {
  const RentalScreen({super.key});

  @override
  ConsumerState<RentalScreen> createState() => _RentalScreenState();
}

class _RentalScreenState extends ConsumerState<RentalScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final _searchController = TextEditingController();

  bool _loading = false;
  String? _error;
  List<Map<String, dynamic>> _equipment = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _fetchEquipment();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchEquipment() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final items =
          await ref.read(equipmentServiceProvider).listEquipment();
      setState(() {
        _equipment = items;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  List<Map<String, dynamic>> get _browse {
    final q = _searchController.text.trim().toLowerCase();
    if (q.isEmpty) return _equipment;
    return _equipment
        .where((e) =>
            (e['name']?.toString() ?? '').toLowerCase().contains(q) ||
            (e['description']?.toString() ?? '').toLowerCase().contains(q))
        .toList();
  }

  // In production, filter by current farmer ID
  List<Map<String, dynamic>> get _myListings => _equipment;

  void _showAddEquipmentSheet() {
    final nameC = TextEditingController();
    final descC = TextEditingController();
    final rateC = TextEditingController();
    bool available = true;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius:
            BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => Padding(
          padding: EdgeInsets.only(
            left: AppSpacing.xl,
            right: AppSpacing.xl,
            top: AppSpacing.xl,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + AppSpacing.xl,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'rental.add_equipment'.tr(),
                  style: context.textTheme.titleLarge
                      ?.copyWith(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: AppSpacing.xl),
                AppTextField(
                  label: 'rental.equipment_name'.tr(),
                  hint: 'rental.equipment_name_hint'.tr(),
                  controller: nameC,
                ),
                const SizedBox(height: AppSpacing.lg),
                AppTextField(
                  label: 'rental.description'.tr(),
                  hint: 'rental.description_hint'.tr(),
                  controller: descC,
                  maxLines: 3,
                ),
                const SizedBox(height: AppSpacing.lg),
                AppTextField(
                  label: 'rental.rate_per_hour'.tr(),
                  hint: '0',
                  controller: rateC,
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: AppSpacing.lg),
                SwitchListTile(
                  title: Text('rental.available'.tr()),
                  value: available,
                  activeThumbColor: AppColors.primary,
                  onChanged: (v) => setLocal(() => available = v),
                ),
                const SizedBox(height: AppSpacing.xl),
                AppButton(
                  label: 'rental.save'.tr(),
                  icon: Icons.publish,
                  onPressed: () async {
                    if (nameC.text.isEmpty || rateC.text.isEmpty) {
                      ctx.showSnack('rental.error'.tr(), isError: true);
                      return;
                    }
                    try {
                      await ref
                          .read(equipmentServiceProvider)
                          .createEquipment(
                            name: nameC.text.trim(),
                            description: descC.text.trim(),
                            ratePerHour:
                                double.tryParse(rateC.text) ?? 0,
                            available: available,
                          );
                      if (ctx.mounted) Navigator.pop(ctx);
                      if (mounted) {
                        context.showSnack(
                            'rental.listing_created'.tr());
                        _fetchEquipment();
                      }
                    } catch (e) {
                      if (ctx.mounted) {
                        ctx.showSnack(e.toString(), isError: true);
                      }
                    }
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        title: Text('rental.title'.tr()),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(text: 'rental.browse'.tr()),
            Tab(text: 'rental.my_listings'.tr()),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddEquipmentSheet,
        icon: const Icon(Icons.add),
        label: Text('rental.add_equipment'.tr()),
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? [AppColors.darkBackground, AppColors.darkSurface]
                : [AppColors.lightBackground, AppColors.lightSurface],
          ),
        ),
        child: Column(
          children: [
            // Quick-nav to rental rates
            Padding(
              padding: const EdgeInsets.fromLTRB(
                  AppSpacing.lg, AppSpacing.md, AppSpacing.lg, 0),
              child: Material(
                color: AppColors.info.withValues(alpha: 0.1),
                borderRadius: AppRadius.mdAll,
                child: InkWell(
                  borderRadius: AppRadius.mdAll,
                  onTap: () {
                    HapticFeedback.lightImpact();
                    context.push(RoutePaths.equipmentRentalRates);
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.md, vertical: AppSpacing.sm),
                    child: Row(
                      children: [
                        const Icon(Icons.price_check, color: AppColors.info, size: 20),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: Text(
                            'View Standard Rental Rates & Pricing',
                            style: context.textTheme.bodySmall?.copyWith(
                              color: AppColors.info,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.info),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                  AppSpacing.lg, AppSpacing.md, AppSpacing.lg, 0),
              child: TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'rental.search_hint'.tr(),
                  prefixIcon: const Icon(Icons.search),
                ),
                onChanged: (_) => setState(() {}),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildList(_browse),
                  _buildList(_myListings),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildList(List<Map<String, dynamic>> items) {
    if (_loading) return const LoadingState(itemCount: 5);
    if (_error != null) {
      return ErrorView(message: _error!, onRetry: _fetchEquipment);
    }
    if (items.isEmpty) {
      return EmptyView(
        icon: Icons.agriculture_outlined,
        title: 'rental.no_equipment'.tr(),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchEquipment,
      child: ListView.separated(
        padding: AppSpacing.allLg,
        itemCount: items.length,
        separatorBuilder: (_, _) =>
            const SizedBox(height: AppSpacing.md),
        itemBuilder: (_, i) {
          final eq = items[i];
          return _EquipmentCard(
            data: eq,
            onTap: () => context.push(
              '${RoutePaths.listingDetails}?id=${eq['equipment_id'] ?? eq['id'] ?? ''}',
            ),
          );
        },
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
//  Equipment Card
// ═══════════════════════════════════════════════════════════════

class _EquipmentCard extends StatelessWidget {
  final Map<String, dynamic> data;
  final VoidCallback onTap;

  const _EquipmentCard({required this.data, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final available = data['available'] == true;
    final rate = (data['rate_per_hour'] as num?)?.toDouble() ??
        (data['price_per_day'] as num?)?.toDouble() ??
        0;

    return AppCard(
      onTap: onTap,
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.08),
              borderRadius: AppRadius.smAll,
            ),
            child: const Icon(Icons.agriculture,
                color: AppColors.primary, size: 28),
          ),
          const SizedBox(width: AppSpacing.lg),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        data['name']?.toString() ?? '-',
                        style: context.textTheme.titleSmall
                            ?.copyWith(fontWeight: FontWeight.bold),
                      ),
                    ),
                    Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        color: available
                            ? AppColors.success
                            : AppColors.danger,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  available
                      ? 'rental.available'.tr()
                      : 'rental.unavailable'.tr(),
                  style: context.textTheme.bodySmall?.copyWith(
                    color: available
                        ? AppColors.success
                        : context.appColors.textSecondary,
                    fontSize: 11,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  '${rate.inr} / ${'common.hours'.tr()}',
                  style: context.textTheme.bodyMedium?.copyWith(
                    color: AppColors.success,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
