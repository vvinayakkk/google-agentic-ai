import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/app_cache.dart';
import '../../../shared/services/weather_soil_service.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/error_view.dart';

class SoilMoistureScreen extends ConsumerStatefulWidget {
  const SoilMoistureScreen({super.key});

  @override
  ConsumerState<SoilMoistureScreen> createState() =>
      _SoilMoistureScreenState();
}

class _SoilMoistureScreenState extends ConsumerState<SoilMoistureScreen> {
  String? _aiResponse;
  bool _loading = false;
  String? _error;
  String _selectedTopic = 'general';

  final List<_TopicChip> _topics = [
    _TopicChip(key: 'general', label: 'soil_moisture.ai_recommendations', icon: Icons.auto_awesome),
    _TopicChip(key: 'irrigation', label: 'soil_moisture.irrigation_advice', icon: Icons.water_drop),
    _TopicChip(key: 'optimal', label: 'soil_moisture.optimal_range', icon: Icons.tune),
    _TopicChip(key: 'seasonal', label: 'soil_moisture.trend', icon: Icons.trending_up),
  ];

  @override
  void initState() {
    super.initState();
    _fetchAnalysis();
  }

  Future<void> _fetchAnalysis() async {
    final cacheKey = 'soil_moisture_$_selectedTopic';

    // Try cache first for instant display
    final cached = await AppCache.get(cacheKey);
    if (cached != null && _aiResponse == null) {
      setState(() {
        _aiResponse = cached.toString();
        _loading = false;
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final response = await ref.read(weatherSoilServiceProvider).getSoilMoisture(
            state: 'Maharashtra',
            limit: 200,
          );

      final latest = (response['latest_records'] as List? ?? const [])
          .take(8)
          .map((e) => e as Map<String, dynamic>)
          .toList();

      final lines = <String>[
        '### Soil Moisture (data.gov.in)',
        '',
        '- Records scanned: ${response['total_records'] ?? 0}',
        '- Latest regions available: ${response['count'] ?? 0}',
        '',
      ];

      if (latest.isEmpty) {
        lines.add('No soil moisture records available for the selected state.');
      } else {
        lines.add('### Latest District Snapshots');
        for (final item in latest) {
          lines.add(
            '- ${item['district'] ?? '-'}, ${item['state'] ?? '-'} (${item['date'] ?? '-'}) -> moisture: ${item['soil_moisture'] ?? '-'}',
          );
        }
      }

      lines.add('');
      switch (_selectedTopic) {
        case 'irrigation':
          lines.add('### Irrigation Advice');
          lines.add('- Prioritize drip/sprinkler in lower-moisture districts.');
          lines.add('- Irrigate early morning/evening to reduce evaporation losses.');
          break;
        case 'optimal':
          lines.add('### Optimal Range Guidance');
          lines.add('- Maintain moderate root-zone moisture; avoid waterlogging.');
          lines.add('- Adjust irrigation by crop stage and soil type.');
          break;
        case 'seasonal':
          lines.add('### Seasonal Pattern Guidance');
          lines.add('- Compare pre-monsoon vs post-monsoon moisture before sowing.');
          lines.add('- Build drainage plans where persistent high moisture appears.');
          break;
        default:
          lines.add('### Recommendations');
          lines.add('- Use district moisture trend to schedule irrigation.');
          lines.add('- Combine soil moisture with weather forecast before field operations.');
      }

      final text = lines.join('\n');
      await AppCache.put(cacheKey, text, ttlSeconds: 1800);
      if (mounted) {
        setState(() {
          _aiResponse = text;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = e.toString();
        });
      }
    }
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
        title: Text('soil_moisture.title'.tr()),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loading ? null : _fetchAnalysis,
          ),
        ],
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
        child: SafeArea(
          child: _error != null && _aiResponse == null
              ? ErrorView(message: _error!, onRetry: _fetchAnalysis)
              : RefreshIndicator(
                  onRefresh: _fetchAnalysis,
                  child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: AppSpacing.allLg,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // ── Header Card ────────────────────────────
                      AppCard(
                        color: AppColors.info.withValues(alpha: 0.08),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppColors.info.withValues(alpha: 0.15),
                                borderRadius: AppRadius.mdAll,
                              ),
                              child: const Icon(Icons.water_drop,
                                  color: AppColors.info, size: 28),
                            ),
                            const SizedBox(width: AppSpacing.lg),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'soil_moisture.title'.tr(),
                                    style: context.textTheme.titleMedium
                                        ?.copyWith(
                                            fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(height: AppSpacing.xs),
                                  Text(
                                    'soil_moisture.tips'.tr(),
                                    style:
                                        context.textTheme.bodySmall?.copyWith(
                                      color: context.appColors.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),

                      // ── Topic Chips ────────────────────────────
                      Text(
                        'soil_moisture.ai_recommendations'.tr(),
                        style: context.textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      Wrap(
                        spacing: AppSpacing.sm,
                        runSpacing: AppSpacing.sm,
                        children: _topics.map((topic) {
                          final selected = _selectedTopic == topic.key;
                          return ChoiceChip(
                            label: Text(topic.label.tr()),
                            avatar: Icon(topic.icon, size: 18),
                            selected: selected,
                            selectedColor:
                                AppColors.primary.withValues(alpha: 0.2),
                            onSelected: (v) {
                              if (v) {
                                setState(() => _selectedTopic = topic.key);
                                _fetchAnalysis();
                              }
                            },
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: AppSpacing.xl),

                      // ── AI Response ────────────────────────────
                      if (_loading)
                        const Center(
                          child: Padding(
                            padding: AppSpacing.allXl,
                            child: CircularProgressIndicator(
                                color: AppColors.primary),
                          ),
                        )
                      else if (_aiResponse != null &&
                          _aiResponse!.isNotEmpty) ...[
                        AppCard(
                          color: AppColors.primary.withValues(alpha: 0.05),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.smart_toy_rounded,
                                      color: AppColors.primary, size: 20),
                                  const SizedBox(width: AppSpacing.sm),
                                  Text(
                                    'soil_moisture.ai_recommendations'.tr(),
                                    style: context.textTheme.titleSmall
                                        ?.copyWith(color: AppColors.primary),
                                  ),
                                ],
                              ),
                              const SizedBox(height: AppSpacing.md),
                              MarkdownBody(
                                data: _aiResponse!,
                                selectable: true,
                                styleSheet: MarkdownStyleSheet.fromTheme(
                                        context.theme)
                                    .copyWith(
                                  p: context.textTheme.bodyMedium,
                                  h1: context.textTheme.titleLarge,
                                  h2: context.textTheme.titleMedium,
                                  h3: context.textTheme.titleSmall,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                      const SizedBox(height: AppSpacing.xl),

                      // ── Info footer ────────────────────────────
                      AppCard(
                        color: AppColors.warning.withValues(alpha: 0.08),
                        child: Row(
                          children: [
                            const Icon(Icons.lightbulb_outline,
                                color: AppColors.warning, size: 20),
                            const SizedBox(width: AppSpacing.md),
                            Expanded(
                              child: Text(
                                'soil_moisture.level'.tr(),
                                style: context.textTheme.bodySmall?.copyWith(
                                  color: AppColors.warning,
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
      ),
    );
  }
}

class _TopicChip {
  final String key;
  final String label;
  final IconData icon;
  const _TopicChip({required this.key, required this.label, required this.icon});
}
