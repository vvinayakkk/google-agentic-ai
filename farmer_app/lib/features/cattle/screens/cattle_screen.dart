import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/services/ai_overview_service.dart';
import '../../../shared/services/livestock_service.dart';
import '../../../shared/services/personalization_service.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_overlay.dart';
import '../../weather/widgets/glass_widgets.dart';
import 'animal_profile_screen.dart';

class CattleScreen extends ConsumerStatefulWidget {
  const CattleScreen({super.key});

  @override
  ConsumerState<CattleScreen> createState() => _CattleScreenState();
}

class _CattleScreenState extends ConsumerState<CattleScreen> {
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _livestock = [];
  Map<String, dynamic> _profile = <String, dynamic>{};

  bool _aiLoading = false;
  bool _aiGenerated = false;
  bool _aiExpanded = false;
  String _aiSummary = 'Generate AI overview to get herd actions tailored to your location.';
  String _aiDetails =
      'Uses your livestock mix, health status, and nearby profile context. Cached for 24 hours.';
  DateTime? _aiUpdatedAt;

  @override
  void initState() {
    super.initState();
    _loadCachedAiOverview();
    _fetchLivestock();
  }

  Future<void> _fetchLivestock() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final items = await ref.read(livestockServiceProvider).listLivestock();
      final profile = await ref.read(personalizationServiceProvider).getProfileContext();
      if (!mounted) return;
      setState(() {
        _livestock = items;
        _profile = profile;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _loadCachedAiOverview() async {
    final cached = await ref
        .read(aiOverviewServiceProvider)
        .getCached('cattle_overview_v1');
    if (!mounted || cached == null) return;
    setState(() {
      _aiSummary = cached.summary;
      _aiDetails = cached.details;
      _aiUpdatedAt = cached.updatedAt;
      _aiGenerated = true;
    });
  }

  Future<void> _generateAiOverview({bool forceRefresh = true}) async {
    if (_aiLoading) return;
    setState(() => _aiLoading = true);

    try {
      final personalization = ref.read(personalizationServiceProvider);
      final profile = _profile.isEmpty
          ? await personalization.getProfileContext()
          : _profile;

      final nearby = personalization
          .sortNearby(profile: profile, items: _livestock)
          .take(8)
          .map((item) {
        final type = (item['animal_type'] ?? item['name'] ?? 'animal').toString();
        final breed = (item['breed'] ?? 'mixed').toString();
        final health = (item['health_status'] ?? 'unknown').toString();
        final count = (item['count'] ?? 1).toString();
        return '$count x $type ($breed), health: $health';
      }).toList(growable: false);

      final result = await ref.read(aiOverviewServiceProvider).generate(
            key: 'cattle_overview_v1',
            pageName: 'Cattle Care',
            languageCode: context.locale.languageCode,
            nearbyData: nearby,
            forceRefresh: forceRefresh,
          );

      if (!mounted) return;
      setState(() {
        _profile = profile;
        _aiSummary = result.summary;
        _aiDetails = result.details;
        _aiUpdatedAt = result.updatedAt;
        _aiGenerated = true;
        _aiLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _aiLoading = false);
      context.showSnack('Failed to generate AI overview: $e', isError: true);
    }
  }

  String _aiUpdatedLabel() {
    final dt = _aiUpdatedAt;
    if (dt == null) return 'Not generated yet';
    final hh = dt.hour.toString().padLeft(2, '0');
    final mm = dt.minute.toString().padLeft(2, '0');
    return 'Updated at $hh:$mm';
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
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
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

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) {
          final fieldBg = Colors.white.withValues(alpha: 0.72);
          final borderColor = Colors.white.withValues(alpha: 0.88);

          return Padding(
            padding: EdgeInsets.only(
              left: AppSpacing.xl,
              right: AppSpacing.xl,
              top: AppSpacing.xl,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + AppSpacing.xl,
            ),
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.9),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.white.withValues(alpha: 0.92)),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primaryDark.withValues(alpha: 0.1),
                    blurRadius: 18,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: SingleChildScrollView(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Center(
                        child: Container(
                          width: 44,
                          height: 4,
                          decoration: BoxDecoration(
                            color: AppColors.lightTextSecondary.withValues(alpha: 0.35),
                            borderRadius: BorderRadius.circular(999),
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      Text(
                        'cattle.add_cattle'.tr(),
                        style: context.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Create a livestock profile synced to backend records.',
                        style: context.textTheme.bodySmall?.copyWith(
                          color: context.appColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      TextField(
                        controller: typeC,
                        decoration: InputDecoration(
                          labelText: 'cattle.animal_type'.tr(),
                          filled: true,
                          fillColor: fieldBg,
                          prefixIcon: const Icon(Icons.pets),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide(color: borderColor),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide(color: borderColor),
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      TextField(
                        controller: breedC,
                        decoration: InputDecoration(
                          labelText: 'cattle.breed'.tr(),
                          filled: true,
                          fillColor: fieldBg,
                          prefixIcon: const Icon(Icons.category),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide(color: borderColor),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide(color: borderColor),
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: countC,
                              decoration: InputDecoration(
                                labelText: 'cattle.count'.tr(),
                                filled: true,
                                fillColor: fieldBg,
                                prefixIcon: const Icon(Icons.tag),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: BorderSide(color: borderColor),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: BorderSide(color: borderColor),
                                ),
                              ),
                              keyboardType: TextInputType.number,
                            ),
                          ),
                          const SizedBox(width: AppSpacing.md),
                          Expanded(
                            child: TextField(
                              controller: ageC,
                              decoration: InputDecoration(
                                labelText: 'cattle.age'.tr(),
                                filled: true,
                                fillColor: fieldBg,
                                prefixIcon: const Icon(Icons.cake),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: BorderSide(color: borderColor),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: BorderSide(color: borderColor),
                                ),
                              ),
                              keyboardType: TextInputType.number,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.md),
                      Text(
                        'Health Status',
                        style: context.textTheme.bodySmall?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          ChoiceChip(
                            label: const Text('Healthy'),
                            selected: healthStatus == 'healthy',
                            onSelected: (_) => setLocal(() => healthStatus = 'healthy'),
                            selectedColor: AppColors.success.withValues(alpha: 0.2),
                            side: BorderSide(color: borderColor),
                          ),
                          ChoiceChip(
                            label: const Text('Under Treatment'),
                            selected: healthStatus == 'under_treatment',
                            onSelected: (_) => setLocal(() => healthStatus = 'under_treatment'),
                            selectedColor: AppColors.warning.withValues(alpha: 0.2),
                            side: BorderSide(color: borderColor),
                          ),
                          ChoiceChip(
                            label: const Text('Sick'),
                            selected: healthStatus == 'sick',
                            onSelected: (_) => setLocal(() => healthStatus = 'sick'),
                            selectedColor: AppColors.danger.withValues(alpha: 0.2),
                            side: BorderSide(color: borderColor),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      SizedBox(
                        width: double.infinity,
                        height: 46,
                        child: ElevatedButton.icon(
                          icon: const Icon(Icons.add),
                          label: Text(
                            'cattle.save'.tr(),
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primaryDark,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(40),
                            ),
                          ),
                          onPressed: () async {
                            if (typeC.text.isEmpty) {
                              ctx.showSnack('cattle.error'.tr(), isError: true);
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
                                    count: int.tryParse(countC.text) ?? 1,
                                    ageMonths: int.tryParse(ageC.text),
                                    healthStatus: healthStatus,
                                  );
                              if (ctx.mounted) Navigator.pop(ctx);
                              if (mounted) {
                                context.showSnack('common.success'.tr());
                                _fetchLivestock();
                              }
                            } catch (e) {
                              if (ctx.mounted) {
                                ctx.showSnack(e.toString(), isError: true);
                              }
                            }
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  void _openQuickAction(String topic) {
    final prompt = switch (topic) {
      'vet' => 'Give me a 7-day preventive veterinary checklist for my livestock.',
      'feed' =>
        'Create a practical feed plan for my herd for the next 7 days with low-cost options.',
      _ => 'Give me cattle management advice for this week.',
    };
    final encoded = Uri.encodeQueryComponent(prompt);
    context.push('${RoutePaths.chat}?agent=general&q=$encoded');
  }

  Widget _summaryChip(
    String label,
    int count,
    IconData icon,
    BuildContext context,
  ) {
    final isDark = context.isDark;
    final border = isDark ? Colors.white24 : Colors.black12;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: border),
        color: Colors.white.withValues(alpha: 0.06),
      ),
      child: Row(
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: border),
            ),
            child: Center(
              child: Icon(icon, size: 14, color: AppColors.primary),
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$count',
                style: context.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
              Text(
                label,
                style: context.textTheme.bodySmall?.copyWith(
                  color: context.appColors.textSecondary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    // compute counts
    final counts = <String, int>{};
    for (final a in _livestock) {
      final t = (a['animal_type']?.toString() ?? 'Unknown').toLowerCase();
      if (t.contains('cow') || t.contains('cattle')) {
        counts['Cows'] =
            (counts['Cows'] ?? 0) + (a['count'] is int ? a['count'] as int : 1);
      } else if (t.contains('buffalo')) {
        counts['Buffalo'] =
            (counts['Buffalo'] ?? 0) +
            (a['count'] is int ? a['count'] as int : 1);
      } else if (t.contains('goat')) {
        counts['Goats'] =
            (counts['Goats'] ?? 0) +
            (a['count'] is int ? a['count'] as int : 1);
      } else {
        counts['Other'] =
            (counts['Other'] ?? 0) +
            (a['count'] is int ? a['count'] as int : 1);
      }
    }

    // try to find upcoming vaccine
    Map<String, dynamic>? dueAnimal;
    for (final a in _livestock) {
      String? cand;
      for (final k in a.keys.cast<String>()) {
        final lk = k.toLowerCase();
        if ((lk.contains('next') && lk.contains('vac')) ||
            (lk.contains('vaccine') && lk.contains('date'))) {
          cand = a[k]?.toString();
          break;
        }
      }
      if (cand == null) continue;
      final dt = DateTime.tryParse(cand);
      if (dt == null) continue;
      final diff = dt.difference(DateTime.now()).inDays;
      if (diff <= 7) {
        dueAnimal = a;
        break;
      }
    }

    return Scaffold(
      backgroundColor: isDark
          ? AppColors.darkBackground
          : AppColors.lightBackground,
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? [AppColors.darkBackground, AppColors.darkSurface]
                : [AppColors.lightBackground, AppColors.lightSurface],
          ),
        ),
        child: SafeArea(
          bottom: false,
          child: _loading
              ? const LoadingState(itemCount: 5)
              : _error != null
              ? ErrorView(message: _error!, onRetry: _fetchLivestock)
              : RefreshIndicator(
                  onRefresh: _fetchLivestock,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: AppSpacing.allLg,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // top bar
                        Padding(
                          padding: const EdgeInsets.fromLTRB(24, 4, 24, 0),
                          child: SizedBox(
                            height: 56,
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                Align(
                                  alignment: Alignment.centerLeft,
                                  child: GlassIconButton(
                                    icon: const Icon(
                                      Icons.arrow_back,
                                      size: 20,
                                    ),
                                    onPressed: () =>
                                        Navigator.of(context).maybePop(),
                                  ),
                                ),
                                Text(
                                  'My Livestock',
                                  style: Theme.of(context).textTheme.titleLarge
                                      ?.copyWith(
                                        color: AppColors.lightText,
                                        fontWeight: FontWeight.w800,
                                      ),
                                ),
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: GestureDetector(
                                    onTap: _showAddCattleSheet,
                                    child: Container(
                                      height: 44,
                                      width: 44,
                                      decoration: BoxDecoration(
                                        color: AppColors.primary,
                                        borderRadius: BorderRadius.circular(12),
                                        boxShadow: [
                                          BoxShadow(
                                            color: AppColors.primaryDark
                                                .withValues(alpha: 0.08),
                                            blurRadius: 6,
                                          ),
                                        ],
                                      ),
                                      child: const Icon(
                                        Icons.add,
                                        color: Colors.white,
                                        size: 20,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: AppSpacing.lg),

                        // summary chips
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.only(left: 24),
                          child: Row(
                            children: [
                              _summaryChip(
                                'Cows',
                                counts['Cows'] ?? 0,
                                Icons.pets,
                                context,
                              ),
                              const SizedBox(width: 8),
                              _summaryChip(
                                'Buffalo',
                                counts['Buffalo'] ?? 0,
                                Icons.grass,
                                context,
                              ),
                              const SizedBox(width: 8),
                              _summaryChip(
                                'Goats',
                                counts['Goats'] ?? 0,
                                Icons.energy_savings_leaf,
                                context,
                              ),
                              const SizedBox(width: 8),
                              _summaryChip(
                                'Other',
                                counts['Other'] ?? 0,
                                Icons.list,
                                context,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: AppSpacing.lg),

                        // alert
                        if (dueAnimal != null) ...[
                          GlassCard(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 12,
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 6,
                                  height: 42,
                                  decoration: BoxDecoration(
                                    color: Colors.amber.withValues(alpha: 0.85),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '${dueAnimal['name'] ?? dueAnimal['animal_type'] ?? 'Animal'} — FMD vaccine due',
                                        style: context.textTheme.bodyLarge
                                            ?.copyWith(
                                              fontWeight: FontWeight.w700,
                                            ),
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        'Last checked: ${dueAnimal['last_checked'] ?? '3h ago'}',
                                        style: context.textTheme.bodySmall
                                            ?.copyWith(
                                              color: context
                                                  .appColors
                                                  .textSecondary,
                                            ),
                                      ),
                                    ],
                                  ),
                                ),
                                FilledButton(
                                  style: FilledButton.styleFrom(
                                    backgroundColor: AppColors.success,
                                  ),
                                  onPressed: () {
                                    final name =
                                        (dueAnimal!['name'] ??
                                                dueAnimal['animal_type'] ??
                                                'my animal')
                                            .toString();
                                    final query = Uri.encodeQueryComponent(
                                      'Help me schedule a vet visit for $name and list immediate pre-visit checks.',
                                    );
                                    context.push(
                                      '${RoutePaths.chat}?agent=general&q=$query',
                                    );
                                  },
                                  child: Row(
                                    children: const [
                                      Text('Schedule Vet'),
                                      SizedBox(width: 6),
                                      Icon(Icons.arrow_forward, size: 16),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: AppSpacing.lg),
                        ],

                        // AI overview with manual generation.
                        GlassCard(
                          featured: true,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Icon(
                                    Icons.auto_awesome,
                                    color: AppColors.primary,
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    'AI Herd Advisory',
                                    style: context.textTheme.titleMedium
                                        ?.copyWith(
                                          fontWeight: FontWeight.w700,
                                        ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: AppSpacing.sm),
                              Text(
                                _aiExpanded ? _aiDetails : _aiSummary,
                                style: context.textTheme.bodyMedium?.copyWith(
                                  height: 1.45,
                                ),
                                maxLines: _aiExpanded ? null : 4,
                                overflow: _aiExpanded
                                    ? TextOverflow.visible
                                    : TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: AppSpacing.sm),
                              if (_aiLoading)
                                Row(
                                  children: [
                                    const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Text(
                                      'Generating recommendations...',
                                      style: context.textTheme.bodyMedium,
                                    ),
                                  ],
                                ),
                              const SizedBox(height: AppSpacing.sm),
                              Text(
                                _aiUpdatedLabel(),
                                style: context.textTheme.bodySmall?.copyWith(
                                  color: context.appColors.textSecondary,
                                ),
                              ),
                              const SizedBox(height: AppSpacing.sm),
                              Row(
                                children: [
                                  Expanded(
                                    child: ElevatedButton.icon(
                                      onPressed: _aiLoading
                                          ? null
                                          : () => _generateAiOverview(forceRefresh: true),
                                      icon: Icon(
                                        _aiGenerated ? Icons.refresh : Icons.auto_awesome,
                                      ),
                                      label: Text(
                                        _aiGenerated
                                            ? 'Generate Fresh'
                                            : 'Generate AI Overview',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: Colors.white.withValues(alpha: 0.85),
                                        foregroundColor: AppColors.lightText,
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(40),
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: AppSpacing.sm),
                                  OutlinedButton(
                                    onPressed: () {
                                      setState(() => _aiExpanded = !_aiExpanded);
                                    },
                                    style: OutlinedButton.styleFrom(
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(40),
                                      ),
                                    ),
                                    child: Text(_aiExpanded ? 'Less' : 'More'),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: AppSpacing.md),

                        // quick actions
                        Row(
                          children: [
                            Expanded(
                              child: _QuickActionCard(
                                title: 'Ask Vet AI',
                                icon: Icons.support_agent,
                                color: AppColors.primary,
                                onTap: () => _openQuickAction('vet'),
                              ),
                            ),
                            const SizedBox(width: AppSpacing.md),
                            Expanded(
                              child: _QuickActionCard(
                                title: 'Feed Planner',
                                icon: Icons.restaurant,
                                color: AppColors.success,
                                onTap: () => _openQuickAction('feed'),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.lg),

                        // header
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 6),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Your Animals',
                                style: context.textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              Text(
                                'SORT: RECENT',
                                style: context.textTheme.bodySmall?.copyWith(
                                  color: context.appColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: AppSpacing.md),

                        // list
                        if (_livestock.isEmpty)
                          EmptyView(
                            icon: Icons.pets_outlined,
                            title: 'cattle.no_cattle'.tr(),
                            subtitle: 'cattle.no_animals'.tr(),
                          )
                        else
                          ..._livestock.map(
                            (animal) => Padding(
                              padding: const EdgeInsets.only(
                                bottom: AppSpacing.md,
                              ),
                              child: GestureDetector(
                                onTap: () {
                                  final id =
                                      animal['livestock_id']?.toString() ??
                                      animal['id']?.toString() ??
                                      '';
                                  if (id.isNotEmpty)
                                    Navigator.of(context).push(
                                      MaterialPageRoute(
                                        builder: (_) => AnimalProfileScreen(
                                          livestockId: id,
                                        ),
                                      ),
                                    );
                                },
                                child: _CattleCard(
                                  data: animal,
                                  onDelete: () => _deleteLivestock(
                                    animal['livestock_id']?.toString() ??
                                        animal['id']?.toString() ??
                                        '',
                                  ),
                                ),
                              ),
                            ),
                          ),

                        const SizedBox(height: AppSpacing.xl),

                        // add new animal
                        GestureDetector(
                          onTap: _showAddCattleSheet,
                          child: Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 18,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.transparent,
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(
                                color: AppColors.primary.withValues(
                                  alpha: 0.55,
                                ),
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.add, color: AppColors.primary),
                                const SizedBox(width: 8),
                                Text(
                                  'Add New Animal',
                                  style: context.textTheme.bodyLarge?.copyWith(
                                    color: AppColors.primary,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),

                        const SizedBox(height: AppSpacing.xl),

                        // bottom banner
                        GlassCard(
                          featured: true,
                          padding: const EdgeInsets.all(12),
                          child: Container(
                            height: 110,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(12),
                              gradient: LinearGradient(
                                colors: [
                                  AppColors.primary.withValues(alpha: 0.22),
                                  Colors.transparent,
                                ],
                                begin: Alignment.bottomCenter,
                                end: Alignment.topCenter,
                              ),
                            ),
                            child: Center(
                              child: Text(
                                'Manage herd health and productivity effortlessly.',
                                style: context.textTheme.titleMedium?.copyWith(
                                  color: Colors.white,
                                  fontStyle: FontStyle.italic,
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 120),
                      ],
                    ),
                  ),
                ),
        ),
      ),
    );
  }
}

// Quick Action Card (kept lightweight)
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
    return GlassCard(
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: color, size: 28),
              const SizedBox(height: AppSpacing.sm),
              Text(
                title,
                textAlign: TextAlign.center,
                style: context.textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// Cattle Card
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
        data['name']?.toString() ?? data['animal_type']?.toString() ?? '-';
    final breed = data['breed']?.toString();
    final count = data['count'] ?? 1;
    final ageMonths = data['age_months'];
    final health = data['health_status']?.toString() ?? 'healthy';

    return GlassCard(
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: AppRadius.smAll,
            ),
            child: const Icon(Icons.pets, color: AppColors.primary, size: 24),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  animalType.capitalize,
                  style: context.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  [
                    if (breed?.isNotEmpty == true) breed!,
                    '${'cattle.count'.tr()}: $count',
                    if (ageMonths != null) '$ageMonths ${'common.months'.tr()}',
                  ].join(' • '),
                  style: context.textTheme.bodySmall?.copyWith(
                    color: context.appColors.textSecondary,
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
              color: _healthColor(health).withValues(alpha: 0.1),
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
            icon: const Icon(
              Icons.delete_outline,
              size: 20,
              color: AppColors.danger,
            ),
            onPressed: onDelete,
            tooltip: 'common.delete'.tr(),
          ),
        ],
      ),
    );
  }
}
