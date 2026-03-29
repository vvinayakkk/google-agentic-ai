import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/services/weather_soil_service.dart';
import '../../../shared/services/farmer_service.dart';
import '../widgets/glass_widgets.dart';

class WeatherSoilScreen extends ConsumerStatefulWidget {
  const WeatherSoilScreen({super.key});

  @override
  ConsumerState<WeatherSoilScreen> createState() => _WeatherSoilScreenState();
}

class _WeatherSoilScreenState extends ConsumerState<WeatherSoilScreen> {
  Map<String, dynamic>? _weather;
  List<Map<String, dynamic>> _forecast = [];
  bool _loading = true;
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
      // Attempt to use farmer profile to derive a sensible city query.
      String cityQuery = 'Nandurbar,IN';
      try {
        final profile = await ref.read(farmerServiceProvider).getMyProfile();
        final district = (profile['district'] as String?)?.trim();
        final village = (profile['village'] as String?)?.trim();
        final state = (profile['state'] as String?)?.trim();
        if (district != null && district.isNotEmpty) {
          cityQuery = '\$district,IN';
        } else if (village != null && village.isNotEmpty) {
          cityQuery = '\$village,IN';
        } else if (state != null && state.isNotEmpty) {
          cityQuery = '\$state,IN';
        }
      } catch (_) {
        // ignore farmer profile errors and fallback to default
      }

      final weather = await ref
          .read(weatherSoilServiceProvider)
          .getWeatherByCity(city: cityQuery);
      final forecast = await ref
          .read(weatherSoilServiceProvider)
          .getWeatherForecastByCity(city: cityQuery);

      final items = (forecast['list'] as List? ?? const [])
          .map((e) => e as Map<String, dynamic>)
          .toList();

      setState(() {
        _weather = weather;
        _forecast = items;
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
    final isDark = context.isDark;
    final bgTop = isDark ? AppColors.darkBackground : const Color(0xFFFBF8F3);
    final bgBottom = isDark ? AppColors.darkSurface : const Color(0xFFF6F0E8);

    final temp =
        ((_weather?['main'] as Map<String, dynamic>?)?['temp'] as num?)
            ?.toInt() ??
        28;
    final condition = ((_weather?['weather'] as List?)?.isNotEmpty ?? false)
        ? ((_weather!['weather'] as List).first as Map<String, dynamic>)['main']
              as String?
        : 'PARTLY CLOUDY';
    final humidity =
        ((_weather?['main'] as Map<String, dynamic>?)?['humidity'] as num?)
            ?.toInt() ??
        72;
    final wind =
        ((_weather?['wind'] as Map<String, dynamic>?)?['speed'] as num?)
            ?.toDouble() ??
        12.0;

    final sections = <Widget>[
      // Temperature + Stats
      Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 3,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$temp°C',
                  style: context.textTheme.headlineLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                    fontSize: 48,
                    color: context.appColors.textSecondary == Colors.transparent
                        ? AppColors.lightText
                        : context.textTheme.headlineLarge?.color,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  children: [
                    const Icon(
                      Icons.wb_sunny,
                      size: 28,
                      color: AppColors.primary,
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Text(
                      (condition ?? 'PARTLY CLOUDY').toString().toUpperCase(),
                      style: context.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: context.appColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(width: AppSpacing.lg),

          Expanded(
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _smallStat(Icons.water_drop, 'Humidity', '$humidity%'),
                const SizedBox(height: AppSpacing.sm),
                _smallStat(
                  Icons.air,
                  'Wind',
                  '${wind.toStringAsFixed(0)} km/h',
                ),
                const SizedBox(height: AppSpacing.sm),
                _smallStat(Icons.umbrella, 'Rain', '30%'),
              ],
            ),
          ),
        ],
      ),

      // Weekly forecast horizontal
      SizedBox(
        height: 96,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          physics: const AlwaysScrollableScrollPhysics(),
          itemCount: 4,
          separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.md),
          itemBuilder: (context, i) {
            final day = ['Mon', 'Tue', 'Wed', 'Thu'][i % 4];
            return SizedBox(
              width: 120,
              child: GlassCard(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      day,
                      style: context.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    const Icon(
                      Icons.wb_cloudy,
                      size: 24,
                      color: AppColors.primary,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      '30° / 22°',
                      style: context.textTheme.bodySmall?.copyWith(
                        color: context.appColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),

      // Smart Farming Advisory (featured)
      GlassCard(
        featured: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.water_damage_outlined,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Text(
                  'Optimal Watering Window',
                  style: context.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              'Irrigate early morning for best retention. Monitor soil moisture for the next 24h before heavy operations.',
              style: context.textTheme.bodyMedium,
            ),
            const SizedBox(height: AppSpacing.md),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Updated 10 mins ago',
                  style: context.textTheme.bodySmall?.copyWith(
                    color: context.appColors.textSecondary,
                  ),
                ),
                TextButton(
                  onPressed: () {},
                  child: const Text(
                    'Details →',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),

      // Bottom mini cards
      Row(
        children: [
          Expanded(
            child: GlassCard(
              child: Row(
                children: [
                  const Icon(Icons.thermostat, color: AppColors.primary),
                  const SizedBox(width: AppSpacing.md),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Soil Temp',
                        style: context.textTheme.bodySmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        '22°C',
                        style: context.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: GlassCard(
              child: Row(
                children: [
                  const Icon(Icons.opacity, color: AppColors.info),
                  const SizedBox(width: AppSpacing.md),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Soil Moisture',
                        style: context.textTheme.bodySmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        '42%',
                        style: context.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ];

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : bgTop,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(72),
        child: Container(
          color: Colors.transparent,
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
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Weather & Soil',
                      style: context.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Icon(
                          Icons.location_on,
                          size: 14,
                          color: AppColors.lightTextSecondary,
                        ),
                        SizedBox(width: AppSpacing.xs),
                        Text(
                          'Nandurbar',
                          style: TextStyle(color: AppColors.lightTextSecondary),
                        ),
                      ],
                    ),
                  ],
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
                itemCount: sections.length + 1,
                separatorBuilder: (_, __) =>
                    const SizedBox(height: AppSpacing.xl),
                itemBuilder: (context, index) {
                  if (index < sections.length) return sections[index];
                  return const SizedBox(height: 120); // spacer for bottom bar
                },
              ),
            ),
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Container(
            height: 56,
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.85),
              borderRadius: BorderRadius.circular(40),
            ),
            child: Row(
              children: [
                const Expanded(
                  child: TextField(
                    decoration: InputDecoration.collapsed(
                      hintText: 'Ask about your crops...',
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                  child: IconButton(
                    icon: const Icon(Icons.mic, color: Colors.white),
                    onPressed: () {},
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _smallStat(IconData icon, String label, String value) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.56),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.white.withOpacity(0.8)),
          ),
          child: Icon(icon, size: 16, color: AppColors.primary),
        ),
        const SizedBox(width: AppSpacing.md),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: context.textTheme.bodySmall?.copyWith(
                color: context.appColors.textSecondary,
                fontWeight: FontWeight.w600,
              ),
            ),
            Text(
              value,
              style: context.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
