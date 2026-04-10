import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/services/ai_overview_service.dart';
import '../../../shared/services/livestock_service.dart';
import '../../../shared/services/personalization_service.dart';
import '../../../shared/widgets/ai_overview_card.dart';
import '../../../shared/widgets/error_view.dart';
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
  String _aiSummary =
      'Generate AI overview to get herd actions tailored to your location.';
  String _aiDetails =
      'Uses your livestock mix, health status, and nearby profile context. Cached for 24 hours.';
  DateTime? _aiUpdatedAt;

  // ─── shared style tokens ──────────────────────────────────────────────────
  static const _textColor = AppColors.lightText;
  static const _subColor = AppColors.lightTextSecondary;

  @override
  void initState() {
    super.initState();
    _loadCachedAiOverview();
    _fetchLivestock();
  }

  // ─── Data ─────────────────────────────────────────────────────────────────

  Future<void> _fetchLivestock() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final items = await ref.read(livestockServiceProvider).listLivestock();
      final profile = await ref
          .read(personalizationServiceProvider)
          .getProfileContext();
      if (!mounted) return;
      setState(() {
        _livestock = items;
        _profile = profile;
        _loading = false;
      });

      if (!_aiGenerated && !_aiLoading) {
        _generateAiOverview(forceRefresh: false);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  // ─── AI overview ──────────────────────────────────────────────────────────

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
            final type = (item['animal_type'] ?? item['name'] ?? 'animal')
                .toString();
            final breed = (item['breed'] ?? 'mixed').toString();
            final health = (item['health_status'] ?? 'unknown').toString();
            final count = (item['count'] ?? 1).toString();
            return '$count x $type ($breed), health: $health';
          })
          .toList(growable: false);

      final result = await ref
          .read(aiOverviewServiceProvider)
          .generate(
            key: 'cattle_overview_v1',
            pageName: 'Cattle Care',
            languageCode: context.locale.languageCode,
            nearbyData: nearby,
            capabilities: const <String>[
              'View herd list with animal type, breed, and health status',
              'Add, edit, and delete cattle profiles from this screen',
              'Plan vaccination, feed, and veterinary readiness tasks',
              'Open AI chat for herd-specific management advice',
              'Prepare weekly cattle care action plan from profile context',
            ],
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

  // ─── Actions ──────────────────────────────────────────────────────────────

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
    final isDark = context.isDark;
    final typeC = TextEditingController();
    final breedC = TextEditingController();
    final countC = TextEditingController(text: '1');
    final ageC = TextEditingController();
    String healthStatus = 'healthy';
    final fieldBg = isDark
      ? AppColors.darkSurface.withValues(alpha: 0.92)
      : Colors.white.withValues(alpha: 0.72);
    final borderColor = isDark ? AppColors.darkBorder : Colors.white.withValues(alpha: 0.88);
    final sheetBg = isDark
      ? AppColors.darkCard.withValues(alpha: 0.98)
      : Colors.white.withValues(alpha: 0.96);
    final handleColor = isDark
      ? AppColors.darkTextSecondary.withValues(alpha: 0.3)
      : AppColors.lightTextSecondary.withValues(alpha: 0.3);
    final titleColor = isDark ? AppColors.darkText : AppColors.lightText;
    final bodyColor = isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;

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
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            ),
            child: Container(
              decoration: BoxDecoration(
                color: sheetBg,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: isDark ? AppColors.darkBorder : Colors.white.withValues(alpha: 0.92)),
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
                            color: handleColor,
                            borderRadius: BorderRadius.circular(999),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'cattle.add_cattle'.tr(),
                        style: context.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: titleColor,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Create a livestock profile synced to backend records.',
                        style: context.textTheme.bodySmall?.copyWith(color: bodyColor),
                      ),
                      const SizedBox(height: 20),
                      _sheetField(
                        controller: typeC,
                        label: 'cattle.animal_type'.tr(),
                        icon: Icons.pets,
                        fieldBg: fieldBg,
                        borderColor: borderColor,
                      ),
                      const SizedBox(height: 12),
                      _sheetField(
                        controller: breedC,
                        label: 'cattle.breed'.tr(),
                        icon: Icons.category,
                        fieldBg: fieldBg,
                        borderColor: borderColor,
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: _sheetField(
                              label: 'cattle.count'.tr(),
                              icon: Icons.tag,
                              fieldBg: fieldBg,
                              borderColor: borderColor,
                              keyboardType: TextInputType.number,
                              controller: countC,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _sheetField(
                              controller: ageC,
                              label: 'cattle.age'.tr(),
                              icon: Icons.cake,
                              fieldBg: fieldBg,
                              borderColor: borderColor,
                              keyboardType: TextInputType.number,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Text(
                        'Health Status',
                        style: context.textTheme.bodySmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: bodyColor,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          ChoiceChip(
                            label: Text('cattle.healthy'.tr()),
                            selected: healthStatus == 'healthy',
                            onSelected: (_) =>
                                setLocal(() => healthStatus = 'healthy'),
                            selectedColor: AppColors.success.withValues(
                              alpha: 0.2,
                            ),
                            side: BorderSide(color: borderColor),
                          ),
                          ChoiceChip(
                            label: Text('cattle.under_treatment'.tr()),
                            selected: healthStatus == 'under_treatment',
                            onSelected: (_) => setLocal(
                              () => healthStatus = 'under_treatment',
                            ),
                            selectedColor: AppColors.warning.withValues(
                              alpha: 0.2,
                            ),
                            side: BorderSide(color: borderColor),
                          ),
                          ChoiceChip(
                            label: Text('cattle.sick'.tr()),
                            selected: healthStatus == 'sick',
                            onSelected: (_) =>
                                setLocal(() => healthStatus = 'sick'),
                            selectedColor: AppColors.danger.withValues(
                              alpha: 0.2,
                            ),
                            side: BorderSide(color: borderColor),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
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
                            elevation: 0,
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

  Widget _sheetField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    required Color fieldBg,
    required Color borderColor,
    TextInputType? keyboardType,
  }) {
    final isDark = context.isDark;
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      style: TextStyle(color: isDark ? AppColors.darkText : AppColors.lightText),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(
          color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
          fontSize: 13,
        ),
        filled: true,
        fillColor: fieldBg,
        prefixIcon: Icon(icon, color: isDark ? Colors.white : AppColors.primaryDark, size: 18),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: borderColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: borderColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(
            color: isDark ? Colors.white70 : AppColors.primaryDark.withValues(alpha: 0.5),
            width: 1.5,
          ),
        ),
      ),
    );
  }

  void _openQuickAction(String topic) {
    final prompt = switch (topic) {
      'vet' =>
        'Give me a 7-day preventive veterinary checklist for my livestock.',
      'feed' =>
        'Create a practical feed plan for my herd for the next 7 days with low-cost options.',
      _ => 'Give me cattle management advice for this week.',
    };
    final encoded = Uri.encodeQueryComponent(prompt);
    context.push('${RoutePaths.chat}?agent=general&q=$encoded');
  }

  void _openAiActionCard(String actionText) {
    final prompt = Uri.encodeQueryComponent(actionText);
    context.push('${RoutePaths.chat}?agent=general&q=$prompt');
  }

  // ─── Shared card builder (matches CropDoctorScreen exactly) ──────────────

  Widget _glassCard({required Widget child, EdgeInsetsGeometry? padding}) {
    final isDark = context.isDark;
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: isDark
            ? AppColors.darkCard.withValues(alpha: 0.96)
            : Colors.white.withValues(alpha: 0.56),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : Colors.white.withValues(alpha: 0.8),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryDark.withValues(alpha: 0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: padding ?? const EdgeInsets.all(14),
        child: child,
      ),
    );
  }

  // ─── Header icon button (same as CropDoctorScreen) ───────────────────────

  Widget _headerAction({
    required IconData icon,
    VoidCallback? onTap,
    bool loading = false,
  }) {
    final isDark = context.isDark;
    return Container(
      decoration: BoxDecoration(
        color: isDark
            ? AppColors.darkSurface.withValues(alpha: 0.92)
            : Colors.white.withValues(alpha: 0.56),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : Colors.white.withValues(alpha: 0.8),
        ),
      ),
      child: IconButton(
        onPressed: onTap,
        icon: loading
            ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: AppColors.primaryDark,
                ),
              )
            : Icon(icon, color: isDark ? Colors.white : AppColors.primaryDark, size: 20),
      ),
    );
  }

  // ─── AI overview card ─────────────────────────────────────────────────────

  Widget _aiOverviewSection() {
    final isDark = context.isDark;
    final textColor = isDark ? AppColors.darkText : AppColors.lightText;
    final subColor = isDark
        ? AppColors.darkTextSecondary
        : AppColors.lightTextSecondary;
    final cardColor = isDark
        ? AppColors.darkCard.withValues(alpha: 0.96)
        : Colors.white.withValues(alpha: 0.56);
    return AiOverviewCard(
      title: 'AI Herd Advisory',
      summary: _aiSummary,
      details: _aiDetails,
      expanded: _aiExpanded,
      loading: _aiLoading,
      updatedLabel: _aiUpdatedLabel(),
      onToggleExpanded: () => setState(() => _aiExpanded = !_aiExpanded),
      onGenerateFresh: () => _generateAiOverview(forceRefresh: true),
      margin: EdgeInsets.zero,
      cardColor: cardColor,
      textColor: textColor,
      subColor: subColor,
      onActionTap: _openAiActionCard,
    );
  }

  // ─── Build ────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final textColor = isDark ? AppColors.darkText : AppColors.lightText;
    final subColor = isDark
      ? AppColors.darkTextSecondary
      : AppColors.lightTextSecondary;
    final cardColor = isDark
      ? AppColors.darkCard.withValues(alpha: 0.96)
      : Colors.white.withValues(alpha: 0.56);
    final iconBg = isDark
      ? AppColors.darkSurface.withValues(alpha: 0.92)
      : Colors.white.withValues(alpha: 0.56);
    // Ignore the underscore lint here so the existing build references keep using the dark-mode locals.
    // ignore: no_leading_underscores_for_local_identifiers
    final _textColor = textColor;
    // ignore: no_leading_underscores_for_local_identifiers
    final _subColor = subColor;

    // counts
    final counts = <String, int>{};
    for (final a in _livestock) {
      final t = (a['animal_type']?.toString() ?? 'Unknown').toLowerCase();
      final n = a['count'] is int ? a['count'] as int : 1;
      if (t.contains('cow') || t.contains('cattle')) {
        counts['Cows'] = (counts['Cows'] ?? 0) + n;
      } else if (t.contains('buffalo')) {
        counts['Buffalo'] = (counts['Buffalo'] ?? 0) + n;
      } else if (t.contains('goat')) {
        counts['Goats'] = (counts['Goats'] ?? 0) + n;
      } else {
        counts['Other'] = (counts['Other'] ?? 0) + n;
      }
    }

    // upcoming vaccine
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
      if (dt.difference(DateTime.now()).inDays <= 7) {
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
                ? <Color>[AppColors.darkBackground, AppColors.darkSurface]
                : <Color>[AppColors.lightBackground, AppColors.lightSurface],
          ),
        ),
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              // ── Header ───────────────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 12, 24, 0),
                child: SizedBox(
                  height: 56,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Align(
                        alignment: Alignment.centerLeft,
                        child: _headerAction(
                          icon: Icons.arrow_back_rounded,
                          onTap: () => Navigator.of(context).maybePop(),
                        ),
                      ),
                      Text(
                        'My Livestock',
                        style: context.textTheme.titleLarge?.copyWith(
                          color: _textColor,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Align(
                        alignment: Alignment.centerRight,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            _headerAction(
                              icon: Icons.refresh_rounded,
                              onTap: _loading ? null : _fetchLivestock,
                              loading: _loading,
                            ),
                            const SizedBox(width: 8),
                            _headerAction(
                              icon: Icons.add_rounded,
                              onTap: _showAddCattleSheet,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // ── Body ─────────────────────────────────────────────────────
              Expanded(
                child: _error != null && _livestock.isEmpty
                    ? ErrorView(message: _error!, onRetry: _fetchLivestock)
                    : RefreshIndicator(
                        onRefresh: _fetchLivestock,
                        child: SingleChildScrollView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.fromLTRB(24, 0, 24, 100),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (_loading)
                                LinearProgressIndicator(
                                  minHeight: 2,
                                  color: AppColors.primaryDark,
                                  backgroundColor: AppColors.primaryDark
                                      .withValues(alpha: 0.1),
                                ),
                              if (_loading) const SizedBox(height: 12),

                              // Summary chips
                              SingleChildScrollView(
                                scrollDirection: Axis.horizontal,
                                child: Row(
                                  children: [
                                    _summaryChip(
                                      'Cows',
                                      counts['Cows'] ?? 0,
                                      Icons.pets,
                                    ),
                                    const SizedBox(width: 8),
                                    _summaryChip(
                                      'Buffalo',
                                      counts['Buffalo'] ?? 0,
                                      Icons.grass,
                                    ),
                                    const SizedBox(width: 8),
                                    _summaryChip(
                                      'Goats',
                                      counts['Goats'] ?? 0,
                                      Icons.energy_savings_leaf,
                                    ),
                                    const SizedBox(width: 8),
                                    _summaryChip(
                                      'Other',
                                      counts['Other'] ?? 0,
                                      Icons.list,
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 14),

                              // Vaccine alert
                              if (dueAnimal != null) ...[
                                _glassCard(
                                  padding: const EdgeInsets.all(14),
                                  child: Row(
                                    children: [
                                      Container(
                                        width: 36,
                                        height: 36,
                                        decoration: BoxDecoration(
                                          color: AppColors.warning.withValues(
                                            alpha: 0.12,
                                          ),
                                          borderRadius: BorderRadius.circular(
                                            10,
                                          ),
                                          border: Border.all(
                                            color: AppColors.warning.withValues(
                                              alpha: 0.25,
                                            ),
                                          ),
                                        ),
                                        child: const Icon(
                                          Icons.warning_amber_rounded,
                                          color: AppColors.warning,
                                          size: 18,
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
                                              style: context
                                                  .textTheme
                                                  .bodyMedium
                                                  ?.copyWith(
                                                    fontWeight: FontWeight.w700,
                                                    color: _textColor,
                                                  ),
                                            ),
                                            const SizedBox(height: 3),
                                            Text(
                                              'Last checked: ${dueAnimal['last_checked'] ?? '3h ago'}',
                                              style: context.textTheme.bodySmall
                                                  ?.copyWith(color: _subColor),
                                            ),
                                          ],
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      SizedBox(
                                        height: 36,
                                        child: ElevatedButton(
                                          onPressed: () {
                                            final name =
                                                (dueAnimal!['name'] ??
                                                        dueAnimal['animal_type'] ??
                                                        'my animal')
                                                    .toString();
                                            final q = Uri.encodeQueryComponent(
                                              'Help me schedule a vet visit for $name and list immediate pre-visit checks.',
                                            );
                                            context.push(
                                              '${RoutePaths.chat}?agent=general&q=$q',
                                            );
                                          },
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor:
                                                AppColors.primaryDark,
                                            foregroundColor: Colors.white,
                                            shape: RoundedRectangleBorder(
                                              borderRadius:
                                                  BorderRadius.circular(40),
                                            ),
                                            elevation: 0,
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 12,
                                            ),
                                          ),
                                          child: const Text(
                                            'Schedule Vet',
                                            style: TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 14),
                              ],

                              // AI overview
                              _aiOverviewSection(),
                              const SizedBox(height: 14),

                              // Quick actions
                              Row(
                                children: [
                                  Expanded(
                                    child: _quickActionCard(
                                      title: 'Ask Vet AI',
                                      icon: Icons.support_agent,
                                      onTap: () => _openQuickAction('vet'),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: _quickActionCard(
                                      title: 'Feed Planner',
                                      icon: Icons.restaurant,
                                      onTap: () => _openQuickAction('feed'),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 18),

                              // Section header
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Your Animals',
                                    style: context.textTheme.titleMedium
                                        ?.copyWith(
                                          color: _textColor,
                                          fontWeight: FontWeight.w700,
                                        ),
                                  ),
                                  Text(
                                    '${_livestock.length} total',
                                    style: context.textTheme.bodySmall
                                        ?.copyWith(color: _subColor),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),

                              // Animal list
                              if (_livestock.isEmpty && !_loading)
                                _glassCard(
                                  child: Column(
                                    children: [
                                      Container(
                                        width: 52,
                                        height: 52,
                                        decoration: BoxDecoration(
                                          color: Colors.white.withValues(
                                            alpha: 0.75,
                                          ),
                                          borderRadius: BorderRadius.circular(
                                            14,
                                          ),
                                          border: Border.all(
                                            color: Colors.white.withValues(
                                              alpha: 0.85,
                                            ),
                                          ),
                                        ),
                                        child: const Icon(
                                          Icons.pets_outlined,
                                          color: AppColors.primaryDark,
                                          size: 26,
                                        ),
                                      ),
                                      const SizedBox(height: 12),
                                      Text(
                                        'cattle.no_cattle'.tr(),
                                        style: context.textTheme.titleSmall
                                            ?.copyWith(
                                              color: _textColor,
                                              fontWeight: FontWeight.w700,
                                            ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'cattle.no_animals'.tr(),
                                        style: context.textTheme.bodySmall
                                            ?.copyWith(color: _subColor),
                                        textAlign: TextAlign.center,
                                      ),
                                    ],
                                  ),
                                )
                              else
                                ..._livestock.map(
                                  (animal) => Padding(
                                    padding: const EdgeInsets.only(bottom: 10),
                                    child: GestureDetector(
                                      onTap: () {
                                        final id =
                                            animal['livestock_id']
                                                ?.toString() ??
                                            animal['id']?.toString() ??
                                            '';
                                        if (id.isNotEmpty) {
                                          Navigator.of(context).push(
                                            MaterialPageRoute(
                                              builder: (_) =>
                                                  AnimalProfileScreen(
                                                    livestockId: id,
                                                  ),
                                            ),
                                          );
                                        }
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
                              const SizedBox(height: 14),

                              // Add new animal button
                              SizedBox(
                                width: double.infinity,
                                height: 48,
                                child: OutlinedButton.icon(
                                  onPressed: _showAddCattleSheet,
                                  icon: const Icon(Icons.add, size: 18),
                                  label: const Text(
                                    'Add New Animal',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppColors.primaryDark,
                                    side: BorderSide(
                                      color: Colors.white.withValues(
                                        alpha: 0.8,
                                      ),
                                      width: 1.2,
                                    ),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(40),
                                    ),
                                    backgroundColor: Colors.white.withValues(
                                      alpha: 0.56,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 14),

                              // Bottom info card
                              _glassCard(
                                child: Row(
                                  children: [
                                    Container(
                                      width: 36,
                                      height: 36,
                                      decoration: BoxDecoration(
                                        color: Colors.white.withValues(
                                          alpha: 0.75,
                                        ),
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(
                                          color: Colors.white.withValues(
                                            alpha: 0.85,
                                          ),
                                        ),
                                      ),
                                      child: const Icon(
                                        Icons.info_outline,
                                        color: AppColors.primaryDark,
                                        size: 18,
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Text(
                                        'Manage herd health and productivity effortlessly with AI-driven insights.',
                                        style: context.textTheme.bodySmall
                                            ?.copyWith(
                                              color: _subColor,
                                              height: 1.4,
                                            ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── Widget helpers ───────────────────────────────────────────────────────

  Widget _summaryChip(String label, int count, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.56),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.8),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryDark.withValues(alpha: 0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.75),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.white.withValues(alpha: 0.85)),
            ),
            child: Icon(icon, size: 15, color: AppColors.primaryDark),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$count',
                style: context.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: _textColor,
                ),
              ),
              Text(
                label,
                style: context.textTheme.bodySmall?.copyWith(
                  color: _subColor,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _quickActionCard({
    required String title,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.56),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: Colors.white.withValues(alpha: 0.8),
            width: 1.2,
          ),
          boxShadow: [
            BoxShadow(
              color: AppColors.primaryDark.withValues(alpha: 0.08),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.primaryDark.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppColors.primaryDark.withValues(alpha: 0.15),
                ),
              ),
              child: Icon(icon, color: AppColors.primaryDark, size: 20),
            ),
            const SizedBox(height: 8),
            Text(
              title,
              textAlign: TextAlign.center,
              style: context.textTheme.bodySmall?.copyWith(
                color: _textColor,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Cattle card ──────────────────────────────────────────────────────────────

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
    final hColor = _healthColor(health);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.56),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.8),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryDark.withValues(alpha: 0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.75),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white.withValues(alpha: 0.85)),
            ),
            child: const Icon(
              Icons.pets,
              color: AppColors.primaryDark,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  animalType.capitalize,
                  style: context.textTheme.bodyMedium?.copyWith(
                    color: AppColors.lightText,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  [
                    if (breed?.isNotEmpty == true) breed!,
                    'Count: $count',
                    if (ageMonths != null) '$ageMonths months',
                  ].join(' · '),
                  style: context.textTheme.bodySmall?.copyWith(
                    color: AppColors.lightTextSecondary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: hColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: hColor.withValues(alpha: 0.25)),
            ),
            child: Text(
              health.capitalize,
              style: TextStyle(
                color: hColor,
                fontWeight: FontWeight.w700,
                fontSize: 11,
              ),
            ),
          ),
          IconButton(
            icon: const Icon(
              Icons.delete_outline,
              size: 18,
              color: AppColors.lightTextSecondary,
            ),
            onPressed: onDelete,
            tooltip: 'common.delete'.tr(),
          ),
        ],
      ),
    );
  }
}
