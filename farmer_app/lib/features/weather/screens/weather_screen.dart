import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/services/weather_soil_service.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_overlay.dart';

class WeatherScreen extends ConsumerStatefulWidget {
  const WeatherScreen({super.key});

  @override
  ConsumerState<WeatherScreen> createState() => _WeatherScreenState();
}

class _WeatherScreenState extends ConsumerState<WeatherScreen> {
  String? _aiResponse;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchWeather();
  }

  Future<void> _fetchWeather() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final weather = await ref
          .read(weatherSoilServiceProvider)
          .getWeatherByCity(city: 'Pune,IN');
      final forecast = await ref
          .read(weatherSoilServiceProvider)
          .getWeatherForecastByCity(city: 'Pune,IN');

      final main = (weather['main'] as Map<String, dynamic>? ?? const {});
      final wind = (weather['wind'] as Map<String, dynamic>? ?? const {});
      final visMeters = (weather['visibility'] as num?)?.toDouble() ?? 0;
      final condition = ((weather['weather'] as List?)?.isNotEmpty ?? false)
          ? ((weather['weather'] as List).first as Map<String, dynamic>)
          : const <String, dynamic>{};

      final forecastItems = (forecast['list'] as List? ?? const [])
          .take(5)
          .map((e) => e as Map<String, dynamic>)
          .toList();

      final lines = <String>[
        '### Live Weather (Pune)',
        '',
        '- Temperature: ${main['temp'] ?? '-'} C',
        '- Humidity: ${main['humidity'] ?? '-'}%',
        '- Wind: ${wind['speed'] ?? '-'} m/s',
        '- Visibility: ${(visMeters / 1000).toStringAsFixed(1)} km',
        '- Condition: ${condition['description'] ?? '-'}',
        '',
        '### Next Forecast Slots',
      ];

      for (final item in forecastItems) {
        final dt = item['dt_txt']?.toString() ?? 'N/A';
        final itemMain = item['main'] as Map<String, dynamic>? ?? const {};
        final itemWeather = ((item['weather'] as List?)?.isNotEmpty ?? false)
            ? ((item['weather'] as List).first as Map<String, dynamic>)
            : const <String, dynamic>{};
        lines.add(
          '- $dt: ${itemMain['temp'] ?? '-'} C, ${itemWeather['description'] ?? '-'}',
        );
      }

      lines.add('');
      lines.add('### Farming Advisory');
      lines.add('- Plan irrigation based on humidity and wind speed trends.');
      lines.add('- Avoid spraying during high wind windows.');
      lines.add('- Use upcoming forecast slots to schedule field operations.');

      setState(() {
        _aiResponse = lines.join('\n');
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('weather.title'.tr()),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loading ? null : _fetchWeather,
          ),
        ],
      ),
      body: SafeArea(
        child: _loading
            ? const Center(child: LoadingState())
            : _error != null
                ? ErrorView(message: _error!, onRetry: _fetchWeather)
                : RefreshIndicator(
                    onRefresh: _fetchWeather,
                    child: SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: AppSpacing.allLg,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // ── Location header ────────────────────
                          Row(
                            children: [
                              Icon(
                                Icons.location_on,
                                size: 18,
                                color: context.appColors.textSecondary,
                              ),
                              const SizedBox(width: AppSpacing.xs),
                              Text(
                                'weather.farm_location'.tr(),
                                style: context.textTheme.bodyMedium?.copyWith(
                                  color: context.appColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: AppSpacing.lg),

                          // ── Fetching indicator ─────────────────
                          if (_aiResponse == null && !_loading)
                            Center(
                              child: Column(
                                children: [
                                  const Icon(Icons.cloud_off,
                                      size: 56,
                                      color: AppColors.lightTextSecondary),
                                  const SizedBox(height: AppSpacing.md),
                                  Text('weather.error'.tr()),
                                ],
                              ),
                            ),

                          // ── AI Weather Response ────────────────
                          if (_aiResponse != null && _aiResponse!.isNotEmpty) ...[
                            // Current Weather header
                            AppCard(
                              color: AppColors.primary.withValues(alpha: 0.08),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.wb_sunny,
                                          size: 28, color: AppColors.warning),
                                      const SizedBox(width: AppSpacing.md),
                                      Text(
                                        'weather.current'.tr(),
                                        style: context.textTheme.titleMedium
                                            ?.copyWith(
                                                fontWeight: FontWeight.bold),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: AppSpacing.md),
                                  // Info chips
                                  Wrap(
                                    spacing: AppSpacing.sm,
                                    runSpacing: AppSpacing.sm,
                                    children: [
                                      _infoChip(context, Icons.thermostat,
                                          'weather.temperature'.tr(),
                                          AppColors.danger),
                                      _infoChip(context, Icons.water_drop,
                                          'weather.humidity'.tr(),
                                          AppColors.info),
                                      _infoChip(context, Icons.air,
                                          'weather.wind'.tr(),
                                          AppColors.accent),
                                      _infoChip(context, Icons.visibility,
                                          'weather.visibility'.tr(),
                                          AppColors.success),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: AppSpacing.xl),

                            // AI Response
                            Text(
                              'weather.ai_tips'.tr(),
                              style: context.textTheme.titleMedium
                                  ?.copyWith(fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: AppSpacing.md),
                            AppCard(
                              color:
                                  AppColors.primary.withValues(alpha: 0.05),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.smart_toy_rounded,
                                          color: AppColors.primary, size: 20),
                                      const SizedBox(width: AppSpacing.sm),
                                      Text(
                                        'weather.advisory'.tr(),
                                        style: context.textTheme.titleSmall
                                            ?.copyWith(
                                                color: AppColors.primary),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: AppSpacing.md),
                                  MarkdownBody(
                                    data: _aiResponse!,
                                    selectable: true,
                                    styleSheet: MarkdownStyleSheet
                                        .fromTheme(context.theme)
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
                            const SizedBox(height: AppSpacing.xl),

                            // Quick stat cards
                            Text(
                              'weather.forecast_5day'.tr(),
                              style: context.textTheme.titleMedium
                                  ?.copyWith(fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: AppSpacing.sm),
                            Text(
                              'weather.advisory'.tr(),
                              style: context.textTheme.bodySmall?.copyWith(
                                color: context.appColors.textSecondary,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.md),
                            AppCard(
                              color: AppColors.info.withValues(alpha: 0.06),
                              child: Row(
                                children: [
                                  const Icon(Icons.info_outline_rounded,
                                      color: AppColors.info, size: 20),
                                  const SizedBox(width: AppSpacing.md),
                                  Expanded(
                                    child: Text(
                                      'weather.last_updated'.tr(),
                                      style:
                                          context.textTheme.bodySmall?.copyWith(
                                        color: AppColors.info,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
      ),
    );
  }

  Widget _infoChip(
      BuildContext context, IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md, vertical: AppSpacing.sm),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: AppRadius.fullAll,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: AppSpacing.xs),
          Text(
            label,
            style: context.textTheme.labelSmall?.copyWith(
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
