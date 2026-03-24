import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/services/agent_service.dart';
import '../../../shared/services/livestock_service.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_overlay.dart';

class CattleScreen extends ConsumerStatefulWidget {
  const CattleScreen({super.key});

  @override
  ConsumerState<CattleScreen> createState() => _CattleScreenState();
}

class _CattleScreenState extends ConsumerState<CattleScreen> {
  bool _loading = false;
  String? _error;
  List<Map<String, dynamic>> _livestock = [];

  String? _aiResponse;
  bool _aiLoading = false;

  @override
  void initState() {
    super.initState();
    _fetchLivestock();
  }

  Future<void> _fetchLivestock() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final items =
          await ref.read(livestockServiceProvider).listLivestock();
      setState(() {
        _livestock = items;
        _loading = false;
      });
      _fetchAiRecommendations();
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _fetchAiRecommendations() async {
    setState(() => _aiLoading = true);
    try {
      final breeds = _livestock
          .map((l) => l['breed']?.toString() ?? l['animal_type']?.toString())
          .where((b) => b != null)
          .toSet()
          .join(', ');
      final res = await ref.read(agentServiceProvider).chat(
            message:
                'Give cattle and livestock management recommendations. '
                'I have ${_livestock.length} animals of types: $breeds. '
                'Provide feed, health, breeding, and vaccination advice.',
          );
      setState(() {
        _aiResponse = res['response']?.toString() ?? '';
        _aiLoading = false;
      });
    } catch (e) {
      setState(() => _aiLoading = false);
    }
  }

  Future<void> _deleteLivestock(String id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('cattle.delete'.tr()),
        content: Text('cattle.delete_confirm'.tr()),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('common.cancel'.tr()),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(
                backgroundColor: AppColors.danger),
            child: Text('common.delete'.tr()),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await ref.read(livestockServiceProvider).deleteLivestock(id);
        if (mounted) {
          context.showSnack('common.success'.tr());
          _fetchLivestock();
        }
      } catch (e) {
        if (mounted) context.showSnack(e.toString(), isError: true);
      }
    }
  }

  void _showAddCattleSheet() {
    final typeC = TextEditingController();
    final breedC = TextEditingController();
    final countC = TextEditingController(text: '1');
    final ageC = TextEditingController();
    String healthStatus = 'healthy';

    final healthOptions = ['healthy', 'sick', 'under_treatment'];

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
            bottom:
                MediaQuery.of(ctx).viewInsets.bottom + AppSpacing.xl,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'cattle.add_cattle'.tr(),
                  style: context.textTheme.titleLarge
                      ?.copyWith(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: AppSpacing.xl),
                AppTextField(
                  label: 'cattle.animal_type'.tr(),
                  hint: 'cattle.animal_type_hint'.tr(),
                  controller: typeC,
                  prefixIcon: Icons.pets,
                ),
                const SizedBox(height: AppSpacing.lg),
                AppTextField(
                  label: 'cattle.breed'.tr(),
                  hint: 'cattle.breed_hint'.tr(),
                  controller: breedC,
                  prefixIcon: Icons.category,
                ),
                const SizedBox(height: AppSpacing.lg),
                AppTextField(
                  label: 'cattle.count'.tr(),
                  hint: 'cattle.count_hint'.tr(),
                  controller: countC,
                  keyboardType: TextInputType.number,
                  prefixIcon: Icons.tag,
                ),
                const SizedBox(height: AppSpacing.lg),
                AppTextField(
                  label: 'cattle.age'.tr(),
                  hint: 'cattle.age_hint'.tr(),
                  controller: ageC,
                  keyboardType: TextInputType.number,
                  prefixIcon: Icons.cake,
                ),
                const SizedBox(height: AppSpacing.lg),
                Text('cattle.health_status'.tr(),
                    style: context.textTheme.labelMedium),
                const SizedBox(height: AppSpacing.xs),
                DropdownButtonFormField<String>(
                  initialValue: healthStatus,
                  decoration: const InputDecoration(
                    prefixIcon: Icon(Icons.monitor_heart),
                  ),
                  items: healthOptions
                      .map((s) => DropdownMenuItem(
                            value: s,
                            child: Text(s.capitalize),
                          ))
                      .toList(),
                  onChanged: (v) => setLocal(
                      () => healthStatus = v ?? healthStatus),
                ),
                const SizedBox(height: AppSpacing.xl),
                AppButton(
                  label: 'cattle.save'.tr(),
                  icon: Icons.add,
                  onPressed: () async {
                    if (typeC.text.isEmpty) {
                      ctx.showSnack('cattle.error'.tr(),
                          isError: true);
                      return;
                    }
                    try {
                      await ref
                          .read(livestockServiceProvider)
                          .createLivestock(
                            animalType: typeC.text.trim(),
                            breed: breedC.text.trim().isNotEmpty
                                ? breedC.text.trim()
                                : null,
                            count:
                                int.tryParse(countC.text) ?? 1,
                            ageMonths:
                                int.tryParse(ageC.text),
                            healthStatus: healthStatus,
                          );
                      if (ctx.mounted) Navigator.pop(ctx);
                      if (mounted) {
                        context.showSnack(
                            'common.success'.tr());
                        _fetchLivestock();
                      }
                    } catch (e) {
                      if (ctx.mounted) {
                        ctx.showSnack(e.toString(),
                            isError: true);
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

  void _openQuickAction(String topic) {
    context.push(
      '${RoutePaths.chat}?agent=crop',
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
        title: Text('cattle.title'.tr()),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddCattleSheet,
        icon: const Icon(Icons.add),
        label: Text('cattle.add_cattle'.tr()),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
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
        child: _loading
          ? const LoadingState(itemCount: 5)
          : _error != null
            ? ErrorView(
              message: _error!, onRetry: _fetchLivestock)
            : RefreshIndicator(
              onRefresh: _fetchLivestock,
              child: SingleChildScrollView(
                    physics:
                        const AlwaysScrollableScrollPhysics(),
                    padding: AppSpacing.allLg,
                    child: Column(
                      crossAxisAlignment:
                          CrossAxisAlignment.start,
                      children: [
                        // ── Quick Actions ──
                        Text(
                          'cattle.quick_actions'.tr(),
                          style: context
                              .textTheme.titleMedium
                              ?.copyWith(
                                  fontWeight:
                                      FontWeight.bold),
                        ),
                        const SizedBox(
                            height: AppSpacing.md),
                        GridView.count(
                          crossAxisCount: 2,
                          shrinkWrap: true,
                          physics:
                              const NeverScrollableScrollPhysics(),
                          mainAxisSpacing: AppSpacing.md,
                          crossAxisSpacing: AppSpacing.md,
                          childAspectRatio: 1.8,
                          children: [
                            _QuickActionCard(
                              title:
                                  'cattle.vaccination_schedule'
                                      .tr(),
                              icon: Icons.vaccines,
                              color: AppColors.info,
                              onTap: () => _openQuickAction(
                                  'vaccination'),
                            ),
                            _QuickActionCard(
                              title:
                                  'cattle.feed_management'
                                      .tr(),
                              icon: Icons.restaurant,
                              color: AppColors.success,
                              onTap: () =>
                                  _openQuickAction('feed'),
                            ),
                            _QuickActionCard(
                              title:
                                  'cattle.health_check'.tr(),
                              icon:
                                  Icons.health_and_safety,
                              color: AppColors.danger,
                              onTap: () => _openQuickAction(
                                  'health'),
                            ),
                            _QuickActionCard(
                              title:
                                  'cattle.breeding_calendar'
                                      .tr(),
                              icon: Icons.calendar_month,
                              color: AppColors.accent,
                              onTap: () => _openQuickAction(
                                  'breeding'),
                            ),
                          ],
                        ),

                        const SizedBox(
                            height: AppSpacing.xl),

                        // ── Cattle List ──
                        Text(
                          '${'cattle.my_cattle'.tr()} (${_livestock.length})',
                          style: context
                              .textTheme.titleMedium
                              ?.copyWith(
                                  fontWeight:
                                      FontWeight.bold),
                        ),
                        const SizedBox(
                            height: AppSpacing.md),
                        if (_livestock.isEmpty)
                          EmptyView(
                            icon: Icons.pets_outlined,
                            title:
                                'cattle.no_cattle'.tr(),
                            subtitle:
                                'cattle.no_animals'.tr(),
                          )
                        else
                          ..._livestock.map((animal) =>
                              Padding(
                                padding:
                                    const EdgeInsets.only(
                                        bottom: AppSpacing
                                            .md),
                                child: _CattleCard(
                                  data: animal,
                                  onDelete: () =>
                                      _deleteLivestock(
                                    animal['livestock_id']
                                            ?.toString() ??
                                        animal['id']
                                            ?.toString() ??
                                        '',
                                  ),
                                ),
                              )),

                        const SizedBox(
                            height: AppSpacing.xl),

                        // ── AI Recommendations ──
                        Text(
                          'cattle.ai_recommendations'.tr(),
                          style: context
                              .textTheme.titleMedium
                              ?.copyWith(
                                  fontWeight:
                                      FontWeight.bold),
                        ),
                        const SizedBox(
                            height: AppSpacing.md),
                        if (_aiLoading)
                          const Center(
                            child: Padding(
                              padding: EdgeInsets.all(
                                  AppSpacing.xl),
                              child:
                                  CircularProgressIndicator(
                                      color: AppColors
                                          .primary),
                            ),
                          )
                        else if (_aiResponse != null &&
                            _aiResponse!.isNotEmpty)
                          AppCard(
                            child: MarkdownBody(
                              data: _aiResponse!,
                              selectable: true,
                              styleSheet:
                                  MarkdownStyleSheet(
                                p: context.textTheme
                                    .bodyMedium,
                                h1: context.textTheme
                                    .titleLarge,
                                h2: context.textTheme
                                    .titleMedium,
                                h3: context.textTheme
                                    .titleSmall,
                              ),
                            ),
                          ),

                        const SizedBox(
                            height: AppSpacing.xxl),
                      ],
                    ),
                  ),
                  ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
//  Quick Action Card
// ═══════════════════════════════════════════════════════════════

class _QuickActionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _QuickActionCard({
    required this.title,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(height: AppSpacing.sm),
          Text(
            title,
            textAlign: TextAlign.center,
            style: context.textTheme.bodySmall
                ?.copyWith(fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
//  Cattle Card
// ═══════════════════════════════════════════════════════════════

class _CattleCard extends StatelessWidget {
  final Map<String, dynamic> data;
  final VoidCallback onDelete;

  const _CattleCard({required this.data, required this.onDelete});

  Color _healthColor(String status) {
    switch (status.toLowerCase()) {
      case 'healthy':
        return AppColors.success;
      case 'sick':
        return AppColors.danger;
      case 'under_treatment':
        return AppColors.warning;
      default:
        return AppColors.info;
    }
  }

  @override
  Widget build(BuildContext context) {
    final animalType =
        data['animal_type']?.toString() ?? '-';
    final breed = data['breed']?.toString();
    final count = data['count'] ?? 1;
    final ageMonths = data['age_months'];
    final health =
        data['health_status']?.toString() ?? 'healthy';

    return AppCard(
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color:
                  AppColors.primary.withValues(alpha: 0.1),
              borderRadius: AppRadius.smAll,
            ),
            child: const Icon(Icons.pets,
                color: AppColors.primary, size: 24),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  animalType.capitalize,
                  style: context.textTheme.titleSmall
                      ?.copyWith(
                          fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 2),
                Text(
                  [
                    if (breed?.isNotEmpty == true) breed!,
                    '${'cattle.count'.tr()}: $count',
                    if (ageMonths != null)
                      '$ageMonths ${'common.months'.tr()}',
                  ].join(' • '),
                  style: context.textTheme.bodySmall
                      ?.copyWith(
                    color:
                        context.appColors.textSecondary,
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
              color: _healthColor(health)
                  .withValues(alpha: 0.1),
              borderRadius: AppRadius.smAll,
            ),
            child: Text(
              health.capitalize,
              style: context.textTheme.labelSmall?.copyWith(
                color: _healthColor(health),
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          IconButton(
            icon: const Icon(Icons.delete_outline,
                size: 20, color: AppColors.danger),
            onPressed: onDelete,
            tooltip: 'common.delete'.tr(),
          ),
        ],
      ),
    );
  }
}
