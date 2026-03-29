import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/services/weather_soil_service.dart';
import '../../../shared/services/farmer_service.dart';
import '../../../shared/widgets/error_view.dart';
import '../widgets/glass_widgets.dart';

class SoilHealthScreen extends ConsumerStatefulWidget {
  const SoilHealthScreen({super.key});

  @override
  ConsumerState<SoilHealthScreen> createState() => _SoilHealthScreenState();
}

class _SoilHealthScreenState extends ConsumerState<SoilHealthScreen> {
  int _score = 0;
  bool _loading = true;
  String? _farmLabel;
  String? _lastTestDate;
  String? _moisture;
  String? _ph;
  String? _nitrogen;
  String? _potassium;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final profile = await ref.read(farmerServiceProvider).getMyProfile();
      final state = (profile['state'] as String?)?.trim() ?? '';
      final district = (profile['district'] as String?)?.trim();

      if (state.isEmpty) {
        setState(() {
          _error =
              'Please set your farm location in profile to load soil data.';
          _loading = false;
        });
        return;
      }

      _farmLabel = [profile['village'], profile['district'], profile['state']]
          .where((e) => e != null && (e as String).isNotEmpty)
          .map((e) => e as String)
          .join(', ');

      final result = await ref
          .read(weatherSoilServiceProvider)
          .getSoilMoisture(state: state, district: district, limit: 1);

      final latest =
          (result['latest_records'] as List?)?.cast<Map<String, dynamic>>() ??
          [];
      if (latest.isNotEmpty) {
        final rec = latest.first;
        _lastTestDate = rec['date']?.toString();

        // moisture value may be numeric or include %
        final rawMoisture = rec['soil_moisture']?.toString() ?? '';
        _moisture = rawMoisture.isNotEmpty ? rawMoisture : null;

        final raw = (rec['raw'] as Map?)?.cast<String, dynamic>() ?? {};

        String? findField(List<String> keys) {
          for (final k in raw.keys) {
            final kl = k.toLowerCase();
            for (final cand in keys) {
              if (kl.contains(cand)) return raw[k]?.toString();
            }
          }
          return null;
        }

        _ph = findField(['ph', 'ph_level']);
        _nitrogen = findField(['nitrogen', 'n']);
        _potassium = findField(['potassium', 'k', 'k2o']);

        // compute a simple heuristic score from moisture and pH (if available)
        double score = 50.0;
        double? moistureVal;
        if (_moisture != null) {
          final numOnly = RegExp(r"-?\d+\.?\d*");
          final m = numOnly.firstMatch(_moisture!);
          if (m != null) {
            moistureVal = double.tryParse(m.group(0)!)?.clamp(0.0, 100.0);
            if (moistureVal != null) {
              final mScore =
                  (1 - ((moistureVal - 50).abs() / 50)).clamp(0.0, 1.0) * 30;
              score += mScore;
            }
          }
        }

        double? phVal;
        if (_ph != null) {
          final numOnly = RegExp(r"-?\d+\.?\d*");
          final p = numOnly.firstMatch(_ph!);
          if (p != null) {
            phVal = double.tryParse(p.group(0)!);
            if (phVal != null) {
              final pScore =
                  (1 - ((phVal - 6.8).abs() / 3.0)).clamp(0.0, 1.0) * 20;
              score += pScore;
            }
          }
        }

        setState(() {
          _score = score.clamp(0, 100).round();
        });
      } else {
        setState(() {
          _error =
              'No soil records found for $state${district != null ? ' / $district' : ''}';
        });
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final bgTop = isDark ? AppColors.darkBackground : const Color(0xFFFBF8F3);
    final bgBottom = isDark ? AppColors.darkSurface : const Color(0xFFF6F0E8);

    return Scaffold(
      backgroundColor: bgTop,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(72),
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.sm,
          ),
          child: SafeArea(
            bottom: false,
            child: Stack(
              alignment: Alignment.center,
              children: [
                Align(
                  alignment: Alignment.centerLeft,
                  child: GlassIconButton(
                    icon: const Icon(
                      Icons.arrow_back,
                      color: AppColors.lightText,
                    ),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ),
                Text(
                  'Soil Health',
                  style: context.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Align(
                  alignment: Alignment.centerRight,
                  child: GlassIconButton(
                    icon: const Icon(
                      Icons.info_outline,
                      color: AppColors.lightText,
                    ),
                    onPressed: () {},
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [bgTop, bgBottom],
          ),
        ),
        child: SafeArea(
          bottom: false,
          child: RefreshIndicator(
            onRefresh: _fetch,
            child: Padding(
              padding: AppSpacing.allLg,
              child: ListView.separated(
                physics: const AlwaysScrollableScrollPhysics(),
                itemCount: 5,
                separatorBuilder: (_, __) =>
                    const SizedBox(height: AppSpacing.xl),
                itemBuilder: (context, index) {
                  // parse numeric helpers
                  double? parseNumber(String? s) {
                    if (s == null) return null;
                    final m = RegExp(r"-?\d+\.?\d*").firstMatch(s);
                    if (m == null) return null;
                    return double.tryParse(m.group(0)!);
                  }

                  final moistureVal = parseNumber(_moisture);
                  final phVal = parseNumber(_ph);
                  final potVal = parseNumber(_potassium);

                  String statusLabelForScore(int score) {
                    if (score >= 80) return 'Excellent';
                    if (score >= 60) return 'Good';
                    if (score >= 40) return 'Fair';
                    return 'Poor';
                  }

                  Color statusColorForScore(int score) {
                    if (score >= 60) return Colors.green;
                    if (score >= 40) return Colors.orange;
                    return Colors.red;
                  }

                  switch (index) {
                    case 0:
                      if (_loading) {
                        return Center(
                          child: Padding(
                            padding: AppSpacing.allXl,
                            child: Column(
                              children: const [
                                CircularProgressIndicator(
                                  color: AppColors.primary,
                                ),
                              ],
                            ),
                          ),
                        );
                      }

                      if (_error != null) {
                        return ErrorView(message: _error!, onRetry: _fetch);
                      }

                      final farmLabel = _farmLabel ?? 'Your farm';
                      final tested = _lastTestDate ?? 'Recent';
                      final statusLabel = statusLabelForScore(_score);
                      final statusColor = statusColorForScore(_score);
                      String desc = 'Overall soil is in good health.';
                      if (potVal != null && potVal < 80) {
                        desc =
                            'Overall soil is in fair health. Consider targeted fertilization for potassium.';
                      } else if (moistureVal != null && moistureVal < 30) {
                        desc = 'Soil moisture is low; consider irrigation.';
                      }

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '$farmLabel — Tested $tested',
                            style: context.textTheme.bodySmall?.copyWith(
                              color: context.appColors.textSecondary,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.md),
                          GlassCard(
                            featured: true,
                            child: Row(
                              children: [
                                SizedBox(
                                  width: 110,
                                  height: 110,
                                  child: Stack(
                                    alignment: Alignment.center,
                                    children: [
                                      SizedBox(
                                        width: 110,
                                        height: 110,
                                        child: CircularProgressIndicator(
                                          value: _score / 100,
                                          strokeWidth: 10,
                                          color: AppColors.primary,
                                          backgroundColor: AppColors.primary
                                              .withOpacity(0.12),
                                        ),
                                      ),
                                      Column(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Text(
                                            '$_score',
                                            style: context.textTheme.titleLarge
                                                ?.copyWith(
                                                  fontWeight: FontWeight.w800,
                                                ),
                                          ),
                                          Text(
                                            '/100',
                                            style: context.textTheme.bodySmall,
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: AppSpacing.md),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 4,
                                        ),
                                        decoration: BoxDecoration(
                                          color: statusColor.withOpacity(0.12),
                                          borderRadius: BorderRadius.circular(
                                            8,
                                          ),
                                        ),
                                        child: Text(
                                          statusLabel,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(height: AppSpacing.sm),
                                      Text(
                                        desc,
                                        style: context.textTheme.bodyMedium,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      );

                    case 1:
                      return GlassCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Key Metrics',
                              style: context.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.md),
                            GridView.count(
                              crossAxisCount: 2,
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              mainAxisSpacing: AppSpacing.md,
                              crossAxisSpacing: AppSpacing.md,
                              childAspectRatio: 2.4,
                              children: [
                                _metricBox(
                                  'pH Level',
                                  _ph ?? '—',
                                  () {
                                    if (phVal == null) return 'Unknown';
                                    if (phVal >= 6.0 && phVal <= 7.5)
                                      return 'Optimal';
                                    if (phVal >= 5.5) return 'Slightly Low';
                                    return 'Low';
                                  }(),
                                  phVal != null && phVal >= 6.0 && phVal <= 7.5
                                      ? Colors.green
                                      : phVal != null
                                      ? Colors.orange
                                      : Colors.grey,
                                ),
                                _metricBox(
                                  'Nitrogen',
                                  _nitrogen ?? '—',
                                  (_nitrogen ?? '').toLowerCase().contains(
                                        'high',
                                      )
                                      ? 'High'
                                      : 'Unknown',
                                  (_nitrogen ?? '').toLowerCase().contains(
                                        'high',
                                      )
                                      ? Colors.orange
                                      : Colors.grey,
                                ),
                                _metricBox(
                                  'Moisture',
                                  _moisture ?? '—',
                                  () {
                                    if (moistureVal == null) return 'Unknown';
                                    if (moistureVal < 30) return 'Low';
                                    if (moistureVal > 60) return 'High';
                                    return 'Normal';
                                  }(),
                                  (moistureVal != null &&
                                          moistureVal >= 30 &&
                                          moistureVal <= 60)
                                      ? Colors.green
                                      : (moistureVal != null &&
                                            moistureVal < 30)
                                      ? Colors.red
                                      : Colors.orange,
                                ),
                                _metricBox(
                                  'Potassium',
                                  _potassium ?? '—',
                                  () {
                                    if (potVal == null) return 'Unknown';
                                    return potVal < 80 ? 'Low' : 'Normal';
                                  }(),
                                  (potVal != null && potVal < 80)
                                      ? Colors.red
                                      : Colors.green,
                                ),
                              ],
                            ),
                          ],
                        ),
                      );

                    case 2:
                      final recs = <String>[];
                      if (potVal != null && potVal < 80) {
                        recs.add('Apply potash to increase potassium levels.');
                      }
                      if (moistureVal != null && moistureVal < 30) {
                        recs.add(
                          'Irrigate early morning to improve moisture retention.',
                        );
                      }
                      if (phVal != null && phVal < 6.0) {
                        recs.add('Apply lime to correct acidity and raise pH.');
                      }
                      if (recs.isEmpty)
                        recs.add(
                          'Request a full lab soil test for detailed recommendations.',
                        );

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(
                                Icons.diamond,
                                color: AppColors.primary,
                              ),
                              const SizedBox(width: AppSpacing.sm),
                              Text(
                                'Recommendations',
                                style: context.textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: AppSpacing.md),
                          ListView.separated(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: recs.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: AppSpacing.md),
                            itemBuilder: (context, i) {
                              return GlassCard(
                                child: Row(
                                  children: [
                                    Container(
                                      width: 6,
                                      height: 48,
                                      color: AppColors.primary,
                                    ),
                                    const SizedBox(width: AppSpacing.md),
                                    Expanded(child: Text(recs[i])),
                                  ],
                                ),
                              );
                            },
                          ),
                        ],
                      );

                    case 3:
                      return GlassCard(
                        child: Container(
                          height: 140,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            gradient: LinearGradient(
                              colors: [
                                AppColors.primary.withOpacity(0.12),
                                Colors.transparent,
                              ],
                              begin: Alignment.bottomCenter,
                              end: Alignment.topCenter,
                            ),
                          ),
                          child: Center(
                            child: Text(
                              'Field image placeholder',
                              style: context.textTheme.bodyMedium?.copyWith(
                                color: context.appColors.textSecondary,
                              ),
                            ),
                          ),
                        ),
                      );

                    default:
                      return const SizedBox.shrink();
                  }
                },
              ),
            ),
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: SizedBox(
            height: 56,
            child: ElevatedButton(
              onPressed: () {},
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white.withOpacity(0.85),
                foregroundColor: AppColors.lightText,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(40),
                ),
                textStyle: const TextStyle(fontWeight: FontWeight.w700),
              ),
              child: const Text('Request New Soil Test →'),
            ),
          ),
        ),
      ),
    );
  }

  Widget _metricBox(
    String title,
    String value,
    String status,
    Color statusColor,
  ) {
    return Container(
      padding: AppSpacing.allMd,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.56),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.8)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: AppSpacing.xs),
              Text(
                value,
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                ),
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              status,
              style: TextStyle(color: statusColor, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}
