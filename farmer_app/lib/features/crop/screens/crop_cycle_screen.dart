import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/services/crop_service.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_overlay.dart';

class CropCycleScreen extends ConsumerStatefulWidget {
  const CropCycleScreen({super.key});

  @override
  ConsumerState<CropCycleScreen> createState() => _CropCycleScreenState();
}

class _CropCycleScreenState extends ConsumerState<CropCycleScreen> {
  List<Map<String, dynamic>>? _crops;
  Map<String, int> _cycleStepCountByCrop = <String, int>{};
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadCrops();
  }

  Future<void> _loadCrops() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final crops = await ref.read(cropServiceProvider).listCrops();
      Map<String, int> stepMap = <String, int>{};
      try {
        final cycles = await ref.read(cropServiceProvider).listCycles();
        stepMap = _buildCycleStepIndex(cycles);
      } catch (_) {
        // keep crop list usable even if cycle reference call fails
      }
      setState(() {
        _crops = crops;
        _cycleStepCountByCrop = stepMap;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _deleteCrop(String id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('crop_cycle.delete'.tr()),
        content: Text('crop_cycle.delete_confirm'.tr()),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(
              'common.delete'.tr(),
              style: const TextStyle(color: AppColors.danger),
            ),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      try {
        await ref.read(cropServiceProvider).deleteCrop(id);
        _loadCrops();
        if (mounted) context.showSnack('common.success'.tr());
      } catch (e) {
        if (mounted) context.showSnack(e.toString(), isError: true);
      }
    }
  }

  Map<String, int> _buildCycleStepIndex(List<Map<String, dynamic>> cycles) {
    final out = <String, int>{};
    for (final cycle in cycles) {
      final cropName =
          (cycle['crop_name'] ?? cycle['crop'] ?? cycle['name'] ?? '')
              .toString()
              .trim()
              .toLowerCase();
      if (cropName.isEmpty) continue;

      final steps = cycle['steps'] ?? cycle['stages'] ?? cycle['timeline'];
      int count = 0;
      if (steps is List) count = steps.length;
      if (steps is Map) count = steps.length;
      if (count <= 0 && cycle['duration_days'] != null) {
        count = 1;
      }
      if (count > 0) out[cropName] = count;
    }
    return out;
  }

  void _showAddCropSheet() {
    final nameCtrl = TextEditingController();
    final areaCtrl = TextEditingController();
    final varietyCtrl = TextEditingController();
    String selectedSeason = 'Kharif';
    DateTime? sowingDate;
    DateTime? harvestDate;
    bool saving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(
            left: AppSpacing.lg,
            right: AppSpacing.lg,
            top: AppSpacing.lg,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + AppSpacing.lg,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey[300],
                      borderRadius: AppRadius.fullAll,
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                Text(
                  'crop_cycle.add_crop'.tr(),
                  style: Theme.of(ctx).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: AppSpacing.lg),
                AppTextField(
                  label: 'crop_cycle.crop_name'.tr(),
                  hint: 'crop_cycle.crop_name_hint'.tr(),
                  controller: nameCtrl,
                  prefixIcon: Icons.eco,
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  'crop_cycle.season'.tr(),
                  style: Theme.of(ctx).textTheme.labelMedium,
                ),
                const SizedBox(height: AppSpacing.xs),
                DropdownButtonFormField<String>(
                  initialValue: selectedSeason,
                  decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.wb_sunny),
                    border: OutlineInputBorder(borderRadius: AppRadius.mdAll),
                  ),
                  items: [
                    DropdownMenuItem(
                      value: 'Kharif',
                      child: Text('crop_cycle.kharif'.tr()),
                    ),
                    DropdownMenuItem(
                      value: 'Rabi',
                      child: Text('crop_cycle.rabi'.tr()),
                    ),
                    DropdownMenuItem(
                      value: 'Zaid',
                      child: Text('crop_cycle.zaid'.tr()),
                    ),
                  ],
                  onChanged: (v) {
                    if (v != null) setSheetState(() => selectedSeason = v);
                  },
                ),
                const SizedBox(height: AppSpacing.md),
                AppTextField(
                  label: 'crop_cycle.area'.tr(),
                  hint: 'crop_cycle.area_hint'.tr(),
                  controller: areaCtrl,
                  prefixIcon: Icons.square_foot,
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: AppSpacing.md),
                AppTextField(
                  label: 'crop_cycle.variety'.tr(),
                  hint: 'crop_cycle.variety_hint'.tr(),
                  controller: varietyCtrl,
                  prefixIcon: Icons.category,
                ),
                const SizedBox(height: AppSpacing.md),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () async {
                          final date = await showDatePicker(
                            context: ctx,
                            initialDate: DateTime.now(),
                            firstDate: DateTime(2020),
                            lastDate: DateTime(2030),
                          );
                          if (date != null) {
                            setSheetState(() => sowingDate = date);
                          }
                        },
                        icon: const Icon(Icons.calendar_today, size: 18),
                        label: Text(
                          sowingDate != null
                              ? sowingDate!.formatted
                              : 'crop_cycle.sowing_date'.tr(),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () async {
                          final date = await showDatePicker(
                            context: ctx,
                            initialDate:
                                sowingDate?.add(const Duration(days: 90)) ??
                                    DateTime.now(),
                            firstDate: DateTime(2020),
                            lastDate: DateTime(2030),
                          );
                          if (date != null) {
                            setSheetState(() => harvestDate = date);
                          }
                        },
                        icon: const Icon(Icons.event_available, size: 18),
                        label: Text(
                          harvestDate != null
                              ? harvestDate!.formatted
                              : 'crop_cycle.expected_harvest'.tr(),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xl),
                AppButton(
                  label: 'crop_cycle.save'.tr(),
                  icon: Icons.check,
                  isLoading: saving,
                  onPressed: () async {
                    final name = nameCtrl.text.trim();
                    final area =
                        double.tryParse(areaCtrl.text.trim()) ?? 0;
                    if (name.isEmpty || area <= 0) {
                      ScaffoldMessenger.of(ctx).showSnackBar(
                        SnackBar(
                          content: Text('common.required'.tr()),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                      return;
                    }
                    setSheetState(() => saving = true);
                    try {
                      await ref.read(cropServiceProvider).createCrop(
                            name: name,
                            season: selectedSeason,
                            areaAcres: area,
                            sowingDate: sowingDate?.toIso8601String(),
                            expectedHarvestDate:
                                harvestDate?.toIso8601String(),
                            variety: varietyCtrl.text.trim().isNotEmpty
                                ? varietyCtrl.text.trim()
                                : null,
                          );
                      if (ctx.mounted) Navigator.pop(ctx);
                      _loadCrops();
                      if (mounted) context.showSnack('common.success'.tr());
                    } catch (e) {
                      setSheetState(() => saving = false);
                      if (ctx.mounted) {
                        ScaffoldMessenger.of(ctx).showSnackBar(
                          SnackBar(
                            content: Text(e.toString()),
                            backgroundColor: AppColors.danger,
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
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

  Future<void> _showEditCropSheet(String id) async {
    if (id.isEmpty) return;

    Map<String, dynamic> crop;
    try {
      crop = await ref.read(cropServiceProvider).getCropById(id);
    } catch (e) {
      if (mounted) context.showSnack(e.toString(), isError: true);
      return;
    }

    final nameCtrl = TextEditingController(
      text: (crop['name'] ?? '').toString(),
    );
    final areaCtrl = TextEditingController(
      text: (crop['area_acres'] ?? '').toString(),
    );
    final varietyCtrl = TextEditingController(
      text: (crop['variety'] ?? '').toString(),
    );
    String selectedSeason = (crop['season'] ?? 'Kharif').toString();
    bool saving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(
            left: AppSpacing.lg,
            right: AppSpacing.lg,
            top: AppSpacing.lg,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + AppSpacing.lg,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Edit Crop',
                  style: Theme.of(ctx).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: AppSpacing.lg),
                AppTextField(
                  label: 'crop_cycle.crop_name'.tr(),
                  hint: 'crop_cycle.crop_name_hint'.tr(),
                  controller: nameCtrl,
                  prefixIcon: Icons.eco,
                ),
                const SizedBox(height: AppSpacing.md),
                DropdownButtonFormField<String>(
                  initialValue: selectedSeason,
                  decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.wb_sunny),
                    border: OutlineInputBorder(borderRadius: AppRadius.mdAll),
                  ),
                  items: [
                    DropdownMenuItem(value: 'Kharif', child: Text('Kharif'.tr())),
                    DropdownMenuItem(value: 'Rabi', child: Text('Rabi'.tr())),
                    DropdownMenuItem(value: 'Zaid', child: Text('Zaid'.tr())),
                  ],
                  onChanged: (v) {
                    if (v != null) setSheetState(() => selectedSeason = v);
                  },
                ),
                const SizedBox(height: AppSpacing.md),
                AppTextField(
                  label: 'crop_cycle.area'.tr(),
                  hint: 'crop_cycle.area_hint'.tr(),
                  controller: areaCtrl,
                  prefixIcon: Icons.square_foot,
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: AppSpacing.md),
                AppTextField(
                  label: 'crop_cycle.variety'.tr(),
                  hint: 'crop_cycle.variety_hint'.tr(),
                  controller: varietyCtrl,
                  prefixIcon: Icons.category,
                ),
                const SizedBox(height: AppSpacing.xl),
                AppButton(
                  label: 'Save Changes',
                  icon: Icons.check,
                  isLoading: saving,
                  onPressed: () async {
                    final name = nameCtrl.text.trim();
                    final area = double.tryParse(areaCtrl.text.trim());
                    if (name.isEmpty || area == null || area <= 0) {
                      if (ctx.mounted) {
                        ScaffoldMessenger.of(ctx).showSnackBar(
                          SnackBar(
                            content: Text('Please fill valid values.'.tr()),
                          ),
                        );
                      }
                      return;
                    }

                    setSheetState(() => saving = true);
                    try {
                      await ref.read(cropServiceProvider).updateCrop(id, {
                        'name': name,
                        'season': selectedSeason,
                        'area_acres': area,
                        'variety': varietyCtrl.text.trim().isEmpty
                            ? null
                            : varietyCtrl.text.trim(),
                      });

                      if (ctx.mounted) Navigator.pop(ctx);
                      _loadCrops();
                      if (mounted) context.showSnack('common.success'.tr());
                    } catch (e) {
                      setSheetState(() => saving = false);
                      if (ctx.mounted) {
                        ScaffoldMessenger.of(ctx).showSnackBar(
                          SnackBar(
                            content: Text(e.toString()),
                            backgroundColor: AppColors.danger,
                          ),
                        );
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

  Future<void> _showCycleDetailsForCrop(String cropName) async {
    final name = cropName.trim();
    if (name.isEmpty) return;

    try {
      final cycles = await ref.read(cropServiceProvider).getCyclesByName(name);
      if (!mounted) return;

      final lines = <String>[];
      for (final cycle in cycles) {
        final steps = cycle['steps'] ?? cycle['stages'] ?? cycle['timeline'];
        if (steps is List && steps.isNotEmpty) {
          for (final step in steps) {
            final label = (step is Map)
                ? (step['name'] ?? step['stage'] ?? step['title'] ?? step.toString())
                    .toString()
                : step.toString();
            if (label.trim().isNotEmpty) lines.add(label.trim());
          }
        }
      }

      showModalBottomSheet<void>(
        context: context,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        builder: (_) => Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$name Cycle Guide',
                style: context.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              if (lines.isEmpty)
                Text(
                  'No detailed cycle stages found for this crop.',
                  style: context.textTheme.bodyMedium,
                )
              else
                ...lines.take(8).map(
                      (line) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Padding(
                              padding: EdgeInsets.only(top: 6),
                              child: Icon(
                                Icons.circle,
                                size: 8,
                                color: AppColors.primary,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(child: Text(line)),
                          ],
                        ),
                      ),
                    ),
            ],
          ),
        ),
      );
    } catch (e) {
      if (mounted) context.showSnack(e.toString(), isError: true);
    }
  }

  static const _subFeatures = <_SubFeature>[
    _SubFeature('crop_cycle.contract_farming', Icons.handshake,
        RoutePaths.contractFarming, AppColors.primary),
    _SubFeature('crop_cycle.credit_sources', Icons.account_balance,
        RoutePaths.creditSources, AppColors.info),
    _SubFeature('crop_cycle.crop_insurance', Icons.security,
        RoutePaths.cropInsurance, AppColors.warning),
    _SubFeature('crop_cycle.market_strategy', Icons.trending_up,
        RoutePaths.marketStrategy, AppColors.success),
    _SubFeature('crop_cycle.power_supply', Icons.bolt, RoutePaths.powerSupply,
        AppColors.accent),
    _SubFeature('crop_cycle.soil_health', Icons.grass, RoutePaths.soilHealth,
        Color(0xFF14B8A6)),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('crop_cycle.title'.tr())),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadCrops,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: AppSpacing.allLg,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Active Crops ──────────────────────────
                Text(
                  'crop_cycle.active'.tr(),
                  style: context.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                if (_loading)
                  const LoadingState(itemCount: 2)
                else if (_error != null)
                  ErrorView(message: _error!, onRetry: _loadCrops)
                else if (_crops == null || _crops!.isEmpty)
                  EmptyView(
                    icon: Icons.agriculture_outlined,
                    title: 'crop_cycle.no_active'.tr(),
                    subtitle: 'crop_cycle.add_first'.tr(),
                  )
                else
                  ..._crops!.map(_buildCropCard),

                const SizedBox(height: AppSpacing.xxl),

                // ── Sub-feature Grid ──────────────────────
                Text(
                  'crop_cycle.resources'.tr(),
                  style: context.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _subFeatures.length,
                  gridDelegate:
                      const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: AppSpacing.md,
                    crossAxisSpacing: AppSpacing.md,
                    childAspectRatio: 1.4,
                  ),
                  itemBuilder: (_, i) =>
                      _SubFeatureCard(feature: _subFeatures[i]),
                ),
                const SizedBox(height: 80),
              ],
            ),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.primary,
        onPressed: _showAddCropSheet,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _buildCropCard(Map<String, dynamic> crop) {
    final name = crop['name'] as String? ?? 'common.unknown'.tr();
    final season = crop['season'] as String? ?? '';
    final area = crop['area_acres'];
    final sowingDate = crop['sowing_date'] as String?;
    final harvestDate = crop['expected_harvest_date'] as String?;
    final variety = crop['variety'] as String?;
    final id = (crop['id'] ?? crop['crop_id'] ?? '').toString();

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: AppCard(
        onTap: () => _showCycleDetailsForCrop(name),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    name,
                    style: context.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                if (season.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.sm,
                      vertical: AppSpacing.xs,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.success.withValues(alpha: 0.12),
                      borderRadius: AppRadius.fullAll,
                    ),
                    child: Text(
                      season,
                      style: context.textTheme.labelSmall?.copyWith(
                        color: AppColors.success,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                const SizedBox(width: AppSpacing.xs),
                PopupMenuButton<String>(
                  onSelected: (v) {
                    if (v == 'edit') _showEditCropSheet(id);
                    if (v == 'delete') _deleteCrop(id);
                  },
                  itemBuilder: (_) => [
                    PopupMenuItem(
                      value: 'edit',
                      child: Row(
                        children: [
                          const Icon(Icons.edit, size: 20),
                          const SizedBox(width: AppSpacing.sm),
                          Text('common.edit'.tr()),
                        ],
                      ),
                    ),
                    PopupMenuItem(
                      value: 'delete',
                      child: Row(
                        children: [
                          const Icon(Icons.delete,
                              color: AppColors.danger, size: 20),
                          const SizedBox(width: AppSpacing.sm),
                          Text('crop_cycle.delete'.tr()),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            if (area != null)
              _InfoRow(
                icon: Icons.square_foot,
                label: 'crop_cycle.area'.tr(),
                value: '$area ${'common.acre'.tr()}',
              ),
            if (variety != null && variety.isNotEmpty)
              _InfoRow(
                icon: Icons.category,
                label: 'crop_cycle.variety'.tr(),
                value: variety,
              ),
            if (sowingDate != null)
              _InfoRow(
                icon: Icons.calendar_today,
                label: 'crop_cycle.sowing_date'.tr(),
                value: _formatDate(sowingDate),
              ),
            if (harvestDate != null)
              _InfoRow(
                icon: Icons.event_available,
                label: 'crop_cycle.expected_harvest'.tr(),
                value: _formatDate(harvestDate),
              ),
            if (_cycleStepCountByCrop[name.toLowerCase()] != null)
              _InfoRow(
                icon: Icons.timeline,
                label: 'Cycle stages',
                value: '${_cycleStepCountByCrop[name.toLowerCase()]} steps',
              ),
          ],
        ),
      ),
    );
  }

  String _formatDate(String dateStr) {
    try {
      return DateTime.parse(dateStr).formatted;
    } catch (_) {
      return dateStr;
    }
  }
}

// ── Private helpers ──────────────────────────────────────

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoRow(
      {required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: Row(
        children: [
          Icon(icon, size: 16, color: context.appColors.textSecondary),
          const SizedBox(width: AppSpacing.sm),
          Text(
            '$label: ',
            style: context.textTheme.bodySmall?.copyWith(
              color: context.appColors.textSecondary,
            ),
          ),
          Expanded(child: Text(value, style: context.textTheme.bodySmall)),
        ],
      ),
    );
  }
}

class _SubFeatureCard extends StatelessWidget {
  final _SubFeature feature;
  const _SubFeatureCard({required this.feature});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: () => context.push(feature.route),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: AppSpacing.allMd,
            decoration: BoxDecoration(
              color: feature.color.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(feature.icon, color: feature.color, size: 28),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            feature.labelKey.tr(),
            textAlign: TextAlign.center,
            style: context.textTheme.labelMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _SubFeature {
  final String labelKey;
  final IconData icon;
  final String route;
  final Color color;
  const _SubFeature(this.labelKey, this.icon, this.route, this.color);
}
