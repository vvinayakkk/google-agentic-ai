import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/services/ai_overview_service.dart';
import '../../../shared/services/personalization_service.dart';
import '../../../shared/services/weather_soil_service.dart';
import '../../../shared/widgets/ai_overview_card.dart';
import '../widgets/glass_widgets.dart';

class WeatherSoilScreen extends ConsumerStatefulWidget {
  const WeatherSoilScreen({super.key});

  @override
  ConsumerState<WeatherSoilScreen> createState() => _WeatherSoilScreenState();
}

class _WeatherSoilScreenState extends ConsumerState<WeatherSoilScreen> {
  Map<String, dynamic>? _full;
  bool _loading = true;
  bool _refreshing = false;
  String? _error;
  String _locationLabel = 'Farm location';

  bool _aiExpanded = false;
  bool _aiLoading = false;
  bool _aiGenerated = false;
  String _aiSummary =
      'Generate AI briefing for today\'s farm weather and soil.';
  String _aiDetails =
      'Combines weather, soil moisture profile, ET0, and farm decisions. Cached for 24 hours.';
  DateTime? _aiUpdatedAt;

  int _selectedDay = 0;
  int _selectedHourlyPoint = 0;

  @override
  void initState() {
    super.initState();
    _loadCachedAiOverview();
    _fetch();
  }

  Map<String, dynamic> get _current =>
      (_full?['current'] as Map?)?.cast<String, dynamic>() ??
      const <String, dynamic>{};

  Map<String, dynamic> get _hourly =>
      (_full?['hourly'] as Map?)?.cast<String, dynamic>() ??
      const <String, dynamic>{};

  Map<String, dynamic> get _daily =>
      (_full?['daily'] as Map?)?.cast<String, dynamic>() ??
      const <String, dynamic>{};

  Map<String, dynamic> get _decisions =>
      (_full?['farm_decisions'] as Map?)?.cast<String, dynamic>() ??
      const <String, dynamic>{};

  Map<String, dynamic> get _air =>
      (_full?['air_quality'] as Map?)?.cast<String, dynamic>() ??
      const <String, dynamic>{};

  Map<String, dynamic> get _nasa =>
      (_full?['nasa_power'] as Map?)?.cast<String, dynamic>() ??
      const <String, dynamic>{};

  Future<void> _fetch({bool forceRefresh = false}) async {
    final hasSnapshot = _full != null;
    setState(() {
      if (hasSnapshot) {
        _refreshing = true;
      } else {
        _loading = true;
      }
      _error = null;
    });

    try {
      Map<String, dynamic> profile = <String, dynamic>{};
      try {
        profile = await ref
            .read(personalizationServiceProvider)
            .getProfileContext();
      } catch (_) {
        profile = <String, dynamic>{};
      }

      final prefs = await SharedPreferences.getInstance();
      final lat = prefs.getDouble('last_location_lat');
      final lon = prefs.getDouble('last_location_lon');

      final weather = await ref
          .read(weatherSoilServiceProvider)
          .getFullWeather(lat: lat, lon: lon, forceRefresh: forceRefresh);
      final location =
          (weather['location'] as Map?)?.cast<String, dynamic>() ??
          const <String, dynamic>{};

      final fallback = [
        (profile['village'] ?? '').toString().trim(),
        (profile['district'] ?? '').toString().trim(),
        (profile['state'] ?? '').toString().trim(),
      ].where((e) => e.isNotEmpty).join(', ');

      if (!mounted) return;
      setState(() {
        _full = weather;
        _locationLabel = (location['label'] ?? '').toString().trim().isNotEmpty
            ? location['label'].toString().trim()
            : (fallback.isEmpty ? 'Farm location' : fallback);
        _selectedDay = 0;
        _loading = false;
        _refreshing = false;
      });

      if (!_aiGenerated && !_aiLoading) {
        _generateAiOverview(forceRefresh: false);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = _friendlyError(e);
        _loading = false;
        _refreshing = false;
      });
    }
  }

  String _friendlyError(Object error) {
    final text = error.toString();
    if (text.contains('Provide both lat and lon')) {
      return 'Weather service expects both coordinates when passed manually.';
    }
    if (text.length > 180) {
      return 'Could not load weather intelligence right now. Pull to refresh in a moment.';
    }
    return text;
  }

  double? _num(dynamic value) {
    if (value == null) return null;
    if (value is num) return value.toDouble();
    return double.tryParse(value.toString());
  }

  List<dynamic> _list(dynamic value) {
    if (value is List) return value;
    return const [];
  }

  int _currentHourlyIndex() {
    final times = _list(_hourly['time']);
    if (times.isEmpty) return 0;

    final now = DateTime.now();
    var best = 0;
    var bestDiff = const Duration(days: 1000);
    for (var i = 0; i < times.length; i++) {
      final parsed = DateTime.tryParse(times[i].toString());
      if (parsed == null) continue;
      final diff = parsed.difference(now).abs();
      if (diff < bestDiff) {
        bestDiff = diff;
        best = i;
      }
    }
    return best;
  }

  String _fmtTime(String? iso) {
    if (iso == null || iso.isEmpty) return '--';
    final dt = DateTime.tryParse(iso);
    if (dt == null) return '--';
    final hh = dt.hour.toString().padLeft(2, '0');
    final mm = dt.minute.toString().padLeft(2, '0');
    return '$hh:$mm';
  }

  String _fmtDate(String? iso) {
    if (iso == null || iso.isEmpty) return '--';
    final dt = DateTime.tryParse(iso);
    if (dt == null) return '--';
    const days = <String>['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const months = <String>[
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '${days[dt.weekday - 1]}, ${dt.day} ${months[dt.month - 1]}';
  }

  String _formatUpdatedAt(DateTime? dt) {
    if (dt == null) return 'Not generated yet';
    final hh = dt.hour.toString().padLeft(2, '0');
    final mm = dt.minute.toString().padLeft(2, '0');
    return 'Updated at $hh:$mm';
  }

  int _todayDailyStartIndex() {
    final dates = _list(_daily['date']);
    if (dates.isEmpty) return 0;

    final now = DateTime.now();
    for (var i = 0; i < dates.length; i++) {
      final dt = DateTime.tryParse(dates[i].toString());
      if (dt == null) continue;
      if (dt.year == now.year && dt.month == now.month && dt.day == now.day) {
        return i;
      }
    }

    var best = 0;
    var bestDiff = const Duration(days: 1000);
    for (var i = 0; i < dates.length; i++) {
      final dt = DateTime.tryParse(dates[i].toString());
      if (dt == null) continue;
      final dateOnly = DateTime(dt.year, dt.month, dt.day);
      final nowOnly = DateTime(now.year, now.month, now.day);
      final diff = dateOnly.difference(nowOnly).abs();
      if (diff < bestDiff) {
        bestDiff = diff;
        best = i;
      }
    }
    return best;
  }

  List<double?> _hourlySeriesForKeys(List<String> keys) {
    List<double?> fallback = const <double?>[];

    for (final key in keys) {
      final values = _list(_hourly[key]);
      if (values.isNotEmpty) {
        final series = values.map(_num).toList(growable: false);
        fallback = series;

        final hasMeaningful = series.any(
          (v) => v != null && v.abs() > 0.000001,
        );
        if (hasMeaningful) {
          return series;
        }
      }
    }
    return fallback;
  }

  List<String> _hourlyTimes() {
    final values = _list(_hourly['time']);
    return values.map((e) => e.toString()).toList(growable: false);
  }

  double? _hourlyValueAt(List<String> keys, int idx) {
    final series = _hourlySeriesForKeys(keys);
    if (series.isEmpty) return null;

    if (idx >= 0 && idx < series.length && series[idx] != null) {
      return series[idx];
    }

    for (var delta = 1; delta <= 6; delta++) {
      final back = idx - delta;
      final fwd = idx + delta;
      if (back >= 0 && back < series.length && series[back] != null) {
        return series[back];
      }
      if (fwd >= 0 && fwd < series.length && series[fwd] != null) {
        return series[fwd];
      }
    }

    for (final value in series) {
      if (value != null) return value;
    }
    return null;
  }

  double _currentUv() {
    final idx = _currentHourlyIndex();
    final uvCurrent = _num(_current['uv_index']);
    if (uvCurrent != null && uvCurrent > 0) return uvCurrent;

    final uvHourly = _hourlyValueAt(const ['uv_index'], idx);
    if (uvHourly != null && uvHourly > 0) return uvHourly;

    final uvDaily = _num(
      _list(_daily['uv_max']).elementAtOrNull(_todayDailyStartIndex()),
    );
    if (uvDaily != null) return uvDaily;
    return 0;
  }

  double? _soilMoistureValue({
    required List<String> hourlyKeys,
    String? currentKey,
  }) {
    final idx = _currentHourlyIndex();
    final hourlyValue = _hourlyValueAt(hourlyKeys, idx);
    if (hourlyValue != null && hourlyValue.abs() > 0.000001) {
      return hourlyValue;
    }

    if (currentKey != null) {
      final fromCurrent = _num(_current[currentKey]);
      if (fromCurrent != null && fromCurrent.abs() > 0.000001) {
        return fromCurrent;
      }
    }

    return hourlyValue;
  }

  Future<void> _loadCachedAiOverview() async {
    final cached = await ref
        .read(aiOverviewServiceProvider)
        .getCached('weather_overview_v2');
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
      final temp = _num(_current['temp']) ?? 30;
      final humidity = _num(_current['humidity']) ?? 70;
      final wind = _num(_current['wind_speed']) ?? 3;
      final condition = (_current['condition'] ?? 'Clear').toString();
      final rootMoisture =
          _num(
            _list(
              _hourly['soil_moisture_root'],
            ).elementAtOrNull(_currentHourlyIndex()),
          ) ??
          0.22;

      final dailyDates = _list(_daily['date']);
      final dailyMax = _list(_daily['temp_max']);
      final dailyMin = _list(_daily['temp_min']);
      final dailyRain = _list(_daily['precip_sum']);
      final dailyEt0 = _list(_daily['et0']);
      final start = _todayDailyStartIndex();

      final snippets = <String>[
        'Current weather at $_locationLabel: $condition, ${temp.toStringAsFixed(1)}C, humidity ${humidity.toStringAsFixed(0)}%, wind ${wind.toStringAsFixed(1)} m/s.',
        'Root-zone soil moisture: ${rootMoisture.toStringAsFixed(2)} volumetric fraction.',
      ];

      for (
        var j = 0;
        j < math.min(4, math.max(0, dailyDates.length - start));
        j++
      ) {
        final i = start + j;
        snippets.add(
          '${dailyDates[i]}: max ${_num(dailyMax.elementAtOrNull(i))?.toStringAsFixed(1) ?? '--'}C, min ${_num(dailyMin.elementAtOrNull(i))?.toStringAsFixed(1) ?? '--'}C, rain ${_num(dailyRain.elementAtOrNull(i))?.toStringAsFixed(1) ?? '--'} mm, ET0 ${_num(dailyEt0.elementAtOrNull(i))?.toStringAsFixed(1) ?? '--'} mm.',
        );
      }

      final result = await ref
          .read(aiOverviewServiceProvider)
          .generate(
            key: 'weather_overview_v2',
            pageName: 'Weather and Soil Intelligence',
            languageCode: context.locale.languageCode,
            nearbyData: snippets,
            capabilities: const <String>[
              'Track hourly and 7-day weather outlook for the farm location',
              'Use rain, ET0, and wind data for irrigation and spray timing',
              'Review UV, soil moisture, and humidity stress indicators',
              'Open AI chat for crop-specific weather action planning',
              'Plan daily farm decisions from weather and soil trends',
            ],
            forceRefresh: forceRefresh,
          );

      if (!mounted) return;
      setState(() {
        _aiSummary = result.summary;
        _aiDetails = result.details;
        _aiUpdatedAt = result.updatedAt;
        _aiGenerated = true;
        _aiLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _aiLoading = false);
      _showSnack('Failed to generate AI overview: $e', isError: true);
    }
  }

  void _showSnack(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? AppColors.danger : null,
      ),
    );
  }

  void _openAiActionCard(String actionText) {
    final query = Uri.encodeQueryComponent(actionText);
    context.push('${RoutePaths.chat}?agent=general&q=$query');
  }

  void _showSourceInfo() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: context.appColors.card,
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
              'Weather Data Source',
              style: context.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Location: $_locationLabel',
              style: context.textTheme.bodyMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'Weather is aggregated from Open-Meteo forecast, NASA POWER, and Open-Meteo air-quality feeds via backend cache.',
              style: context.textTheme.bodyMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'Farm decisions are computed server-side and updated hourly.',
              style: context.textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final pageGradient = isDark
        ? <Color>[
            AppColors.darkBackground,
            AppColors.darkSurface,
            AppColors.darkBackground,
          ]
        : <Color>[
            AppColors.lightBackground,
            AppColors.lightSurface,
            AppColors.lightBackground,
          ];

    final sections = <Widget>[
      if (_error != null)
        GlassCard(
          child: Text(
            _error!,
            style: TextStyle(color: context.appColors.textSecondary),
          ),
        ),
      _aiOverviewSection(),
      _heroWeatherCard(),
      _farmDecisionsSection(),
      _soilMoistureDepthSection(),
      _forecast16Section(),
      _hourlyChartSection(),
      _sunUvSection(),
      _windSection(),
      _airQualitySection(),
      const SizedBox(height: 80),
    ];

    return Scaffold(
      backgroundColor: pageGradient.first,
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
                  child: IconButton(
                    onPressed: () => Navigator.of(context).maybePop(),
                    icon: const Icon(
                      Icons.arrow_back_rounded,
                      color: AppColors.lightText,
                    ),
                  ),
                ),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Text(
                      'Weather & Soil',
                      textAlign: TextAlign.center,
                      style: context.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      _locationLabel,
                      textAlign: TextAlign.center,
                      style: context.textTheme.bodySmall?.copyWith(
                        color: AppColors.lightTextSecondary,
                      ),
                    ),
                  ],
                ),
                Align(
                  alignment: Alignment.centerRight,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        onPressed: _refreshing
                            ? null
                            : () => _fetch(forceRefresh: true),
                        icon: _refreshing
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AppColors.lightText,
                                ),
                              )
                            : const Icon(
                                Icons.refresh_rounded,
                                color: AppColors.lightText,
                              ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      GlassIconButton(
                        icon: const Icon(
                          Icons.info_outline,
                          color: AppColors.lightText,
                        ),
                        onPressed: _showSourceInfo,
                      ),
                    ],
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
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: pageGradient,
          ),
        ),
        child: SafeArea(
          bottom: false,
          child: _loading && _full == null
              ? const Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                )
              : RefreshIndicator(
                  onRefresh: () => _fetch(forceRefresh: true),
                  child: ListView.separated(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: AppSpacing.allLg,
                    itemCount: sections.length + (_refreshing ? 1 : 0),
                    itemBuilder: (_, i) {
                      if (_refreshing && i == 0) {
                        return const LinearProgressIndicator(minHeight: 2);
                      }
                      return sections[_refreshing ? i - 1 : i];
                    },
                    separatorBuilder: (_, _) =>
                        const SizedBox(height: AppSpacing.xl),
                  ),
                ),
        ),
      ),
    );
  }

  Widget _heroWeatherCard() {
    final temp = _num(_current['temp']) ?? 30;
    final feels = _num(_current['apparent_temp']) ?? temp;
    final humidity = _num(_current['humidity']) ?? 70;
    final wind = _num(_current['wind_speed']) ?? 2;
    final dew = _num(_current['dew_point']);
    final condition = (_current['condition'] ?? 'Clear').toString();
    final uv = _currentUv();

    final sunrise = _list(_daily['sunrise']).isNotEmpty
        ? _list(_daily['sunrise']).first.toString()
        : null;
    final sunset = _list(_daily['sunset']).isNotEmpty
        ? _list(_daily['sunset']).first.toString()
        : null;

    return GlassCard(
      featured: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${temp.toStringAsFixed(1)}C',
                      style: context.textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      condition,
                      style: context.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      'Feels like ${feels.toStringAsFixed(1)}C',
                      style: context.textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  children: [
                    _statTile(
                      Icons.water_drop_outlined,
                      'Humidity',
                      '${humidity.toStringAsFixed(0)}%',
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    _statTile(
                      Icons.air,
                      'Wind',
                      '${wind.toStringAsFixed(1)} m/s',
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    _statTile(
                      Icons.thermostat,
                      'Dew Pt',
                      dew == null ? '--' : '${dew.toStringAsFixed(1)}C',
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              _pill('Sunrise ${_fmtTime(sunrise)}'),
              _pill('Sunset ${_fmtTime(sunset)}'),
              _pill('UV ${uv.toStringAsFixed(1)}'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _farmDecisionsSection() {
    final cards = <_DecisionCardData>[];

    final irrigate = (_decisions['irrigate_today'] as Map?)
        ?.cast<String, dynamic>();
    if (irrigate != null) {
      final needed = irrigate['needed'] == true;
      cards.add(
        _DecisionCardData(
          title: 'Irrigation',
          verdict: needed ? 'IRRIGATE' : 'NO NEED',
          reason: (irrigate['message'] ?? '').toString(),
          icon: Icons.water,
          positive: !needed,
        ),
      );
    }

    final spray = (_decisions['spray_window'] as Map?)?.cast<String, dynamic>();
    if (spray != null) {
      final good = spray['good_now'] == true;
      cards.add(
        _DecisionCardData(
          title: 'Spray Window',
          verdict: good ? 'SPRAY OK' : 'WAIT',
          reason: (spray['message'] ?? '').toString(),
          icon: Icons.grass,
          positive: good,
        ),
      );
    }

    final field = (_decisions['field_entry'] as Map?)?.cast<String, dynamic>();
    if (field != null) {
      final ok = field['ok'] == true;
      cards.add(
        _DecisionCardData(
          title: 'Field Entry',
          verdict: ok ? 'ENTER FIELD OK' : 'TOO WET',
          reason: (field['message'] ?? '').toString(),
          icon: Icons.agriculture,
          positive: ok,
        ),
      );
    }

    final heat = (_decisions['heat_stress'] as Map?)?.cast<String, dynamic>();
    if (heat != null && heat['alert'] == true) {
      cards.add(
        _DecisionCardData(
          title: 'Heat Stress',
          verdict: 'ALERT',
          reason: (heat['message'] ?? '').toString(),
          icon: Icons.local_fire_department,
          positive: false,
        ),
      );
    }

    final harvest = (_decisions['harvest_window'] as Map?)
        ?.cast<String, dynamic>();
    if (harvest != null) {
      final good = harvest['good_3day'] == true;
      cards.add(
        _DecisionCardData(
          title: 'Harvest Window',
          verdict: good ? 'GOOD 3-DAY' : 'RISKY',
          reason: (harvest['message'] ?? '').toString(),
          icon: Icons.cut,
          positive: good,
        ),
      );
    }

    final frost = (_decisions['frost_risk'] as Map?)?.cast<String, dynamic>();
    if (frost != null && frost['alert'] == true) {
      cards.add(
        _DecisionCardData(
          title: 'Frost Risk',
          verdict: 'FROST ALERT',
          reason: (frost['message'] ?? '').toString(),
          icon: Icons.ac_unit,
          positive: false,
        ),
      );
    }

    final sow = (_decisions['sowing_conditions'] as Map?)
        ?.cast<String, dynamic>();
    if (sow != null) {
      final good =
          sow['soil_temp_ok'] == true && sow['soil_moisture_ok'] == true;
      cards.add(
        _DecisionCardData(
          title: 'Sowing',
          verdict: good ? 'CONDITIONS GOOD' : 'WAIT',
          reason: (sow['message'] ?? '').toString(),
          icon: Icons.eco,
          positive: good,
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Farm Decisions',
          style: context.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        SizedBox(
          height: 172,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: cards.length,
            separatorBuilder: (_, _) => const SizedBox(width: AppSpacing.md),
            itemBuilder: (_, i) {
              final item = cards[i];
              final tone = item.positive
                  ? AppColors.success
                  : (item.verdict.contains('WAIT')
                        ? AppColors.warning
                        : AppColors.danger);
              return SizedBox(
                width: 236,
                child: GlassCard(
                  padding: AppSpacing.allMd,
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      color: tone.withValues(alpha: 0.08),
                    ),
                    padding: AppSpacing.allMd,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(item.icon, color: tone),
                            const SizedBox(width: AppSpacing.sm),
                            Expanded(
                              child: Text(
                                item.title,
                                style: context.textTheme.bodyMedium?.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          item.verdict,
                          style: context.textTheme.titleSmall?.copyWith(
                            color: tone,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Expanded(
                          child: Text(
                            item.reason,
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                            style: context.textTheme.bodySmall,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _soilMoistureDepthSection() {
    final rows = [
      (
        'Surface (0-1cm)',
        _soilMoistureValue(
          hourlyKeys: const ['soil_moisture_surface', 'soil_moisture_0_1cm'],
          currentKey: 'soil_moisture_0_1cm',
        ),
        'Tractor entry OK?',
      ),
      (
        'Shallow Root (1-3cm)',
        _soilMoistureValue(
          hourlyKeys: const ['soil_moisture_1_3cm'],
          currentKey: 'soil_moisture_1_3cm',
        ),
        'Seedbed moisture',
      ),
      (
        'Root Zone (3-9cm)',
        _soilMoistureValue(
          hourlyKeys: const ['soil_moisture_root', 'soil_moisture_3_9cm'],
          currentKey: 'soil_moisture_3_9cm',
        ),
        'Irrigation signal',
      ),
      (
        'Deep Root (9-27cm)',
        _soilMoistureValue(
          hourlyKeys: const ['soil_moisture_9_27cm'],
          currentKey: 'soil_moisture_9_27cm',
        ),
        'Stored moisture',
      ),
      (
        'Subsoil (27-81cm)',
        _soilMoistureValue(
          hourlyKeys: const ['soil_moisture_deep', 'soil_moisture_27_81cm'],
          currentKey: 'soil_moisture_27_81cm',
        ),
        'Long-term reserve',
      ),
    ];

    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Soil Moisture Depth Profile',
            style: context.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          for (final row in rows) ...[
            _depthBar(row.$1, row.$2, row.$3),
            const SizedBox(height: AppSpacing.md),
          ],
        ],
      ),
    );
  }

  Widget _forecast16Section() {
    final dates = _list(_daily['date']);
    final maxT = _list(_daily['temp_max']);
    final minT = _list(_daily['temp_min']);
    final rain = _list(_daily['precip_sum']);
    final rainProb = _list(_daily['precip_prob_max']);
    final et0 = _list(_daily['et0']);

    final start = _todayDailyStartIndex();
    final remaining = math.max(0, dates.length - start);
    final count = math.min(16, remaining);
    if (count <= 0) {
      return GlassCard(
        child: Text(
          'No daily forecast available right now.',
          style: context.textTheme.bodyMedium,
        ),
      );
    }
    if (_selectedDay >= count) _selectedDay = 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '16-Day Forecast',
          style: context.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        SizedBox(
          height: 154,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: count,
            separatorBuilder: (_, _) => const SizedBox(width: AppSpacing.md),
            itemBuilder: (_, i) {
              final sourceIndex = start + i;
              final selected = i == _selectedDay;
              return SizedBox(
                width: 138,
                child: GlassCard(
                  onTap: () => setState(() => _selectedDay = i),
                  padding: const EdgeInsets.all(10),
                  child: Container(
                    decoration: BoxDecoration(
                      color: selected
                          ? AppColors.primary.withValues(alpha: 0.10)
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 6,
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _fmtDate(dates[sourceIndex].toString()),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: context.textTheme.bodySmall?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '${_num(maxT.elementAtOrNull(sourceIndex))?.toStringAsFixed(0) ?? '--'} / ${_num(minT.elementAtOrNull(sourceIndex))?.toStringAsFixed(0) ?? '--'}C',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: context.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          'Rain ${_num(rain.elementAtOrNull(sourceIndex))?.toStringAsFixed(1) ?? '--'} mm',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: context.textTheme.bodySmall,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Need ${_num(et0.elementAtOrNull(sourceIndex))?.toStringAsFixed(1) ?? '--'} mm',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: context.textTheme.bodySmall?.copyWith(
                            color: AppColors.success,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        GlassCard(
          child: Text(
            '${_fmtDate(dates[start + _selectedDay].toString())}: Rain probability ${_num(rainProb.elementAtOrNull(start + _selectedDay))?.toStringAsFixed(0) ?? '--'}%, precipitation ${_num(rain.elementAtOrNull(start + _selectedDay))?.toStringAsFixed(1) ?? '--'} mm, ET0 ${_num(et0.elementAtOrNull(start + _selectedDay))?.toStringAsFixed(1) ?? '--'} mm.',
            style: context.textTheme.bodyMedium,
          ),
        ),
      ],
    );
  }

  Widget _hourlyChartSection() {
    final idx = _currentHourlyIndex();
    final timesSrc = _hourlyTimes();
    final precipSrc = _hourlySeriesForKeys(const [
      'precip_prob',
      'precipitation_probability',
    ]);
    final et0Src = _hourlySeriesForKeys(const [
      'et0',
      'et0_fao_evapotranspiration',
    ]);

    final available = <int>[
      timesSrc.length,
      precipSrc.length,
      et0Src.length,
    ].where((e) => e > 0).fold<int>(0, (p, e) => math.max(p, e));
    if (available == 0) {
      return GlassCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Hourly Rain Probability + ET0 (24h)',
              style: context.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              'No hourly data available right now.',
              style: context.textTheme.bodyMedium,
            ),
          ],
        ),
      );
    }

    final start = idx.clamp(0, math.max(0, available - 1)).toInt();
    final count = math.min(24, available - start).toInt();

    final times = List<String>.generate(
      count,
      (i) => timesSrc.elementAtOrNull(start + i) ?? '',
      growable: false,
    );
    final precipProb = List<double>.generate(
      count,
      (i) => precipSrc.elementAtOrNull(start + i) ?? 0,
      growable: false,
    );
    final et0 = List<double>.generate(
      count,
      (i) => et0Src.elementAtOrNull(start + i) ?? 0,
      growable: false,
    );

    final selected = _selectedHourlyPoint.clamp(0, count - 1).toInt();
    final mid = count ~/ 2;

    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Hourly Rain Probability + ET0 (24h)',
            style: context.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            'Y-axis: Rain % (bars) and ET0 mm (line). Tap/drag on chart to inspect values.',
            style: context.textTheme.bodySmall?.copyWith(
              color: context.appColors.textSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          SizedBox(
            height: 196,
            child: LayoutBuilder(
              builder: (context, box) {
                void updateSelection(Offset localPosition) {
                  if (count <= 1) return;
                  final width = box.maxWidth <= 1.0 ? 1.0 : box.maxWidth;
                  final normalized = (localPosition.dx / width).clamp(0.0, 1.0);
                  final point = (normalized * (count - 1)).round();
                  setState(() => _selectedHourlyPoint = point);
                }

                return GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTapDown: (details) =>
                      updateSelection(details.localPosition),
                  onHorizontalDragUpdate: (details) =>
                      updateSelection(details.localPosition),
                  child: CustomPaint(
                    painter: _HourlyRainEtPainter(
                      precipProb: precipProb,
                      et0: et0,
                      selectedIndex: selected,
                      textColor: context.appColors.textSecondary,
                    ),
                    child: const SizedBox.expand(),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              Expanded(
                child: Text(
                  _fmtTime(times.elementAtOrNull(0)),
                  style: context.textTheme.bodySmall,
                ),
              ),
              Expanded(
                child: Text(
                  _fmtTime(times.elementAtOrNull(mid)),
                  textAlign: TextAlign.center,
                  style: context.textTheme.bodySmall,
                ),
              ),
              Expanded(
                child: Text(
                  _fmtTime(times.elementAtOrNull(count - 1)),
                  textAlign: TextAlign.right,
                  style: context.textTheme.bodySmall,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: AppColors.info.withValues(alpha: 0.7),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 6),
              const Text('Rain %'),
              const SizedBox(width: 14),
              Container(width: 14, height: 2, color: AppColors.success),
              const SizedBox(width: 6),
              const Text('ET0 (mm)'),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Selected ${_fmtTime(times.elementAtOrNull(selected))}: Rain ${precipProb[selected].toStringAsFixed(0)}%, ET0 ${et0[selected].toStringAsFixed(2)} mm',
            style: context.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }

  Widget _sunUvSection() {
    final sunrise = _list(_daily['sunrise']).isNotEmpty
        ? _list(_daily['sunrise']).first.toString()
        : null;
    final sunset = _list(_daily['sunset']).isNotEmpty
        ? _list(_daily['sunset']).first.toString()
        : null;

    final uv = _currentUv();
    final solar =
        _num(_nasa['solar_radiation']) ??
        _num(
          _list(
            _hourly['solar_radiation'],
          ).elementAtOrNull(_currentHourlyIndex()),
        );

    final now = DateTime.now();
    final sr = sunrise != null ? DateTime.tryParse(sunrise) : null;
    final ss = sunset != null ? DateTime.tryParse(sunset) : null;
    var progress = 0.0;
    if (sr != null && ss != null && ss.isAfter(sr)) {
      final total = ss.difference(sr).inMinutes;
      final elapsed = now.difference(sr).inMinutes.clamp(0, total);
      progress = total <= 0 ? 0.0 : elapsed / total;
    }

    String uvLabel() {
      if (uv < 3) return 'Low';
      if (uv < 6) return 'Moderate';
      if (uv < 8) return 'High';
      if (uv < 11) return 'Very High';
      return 'Extreme';
    }

    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Sun & UV',
            style: context.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          SizedBox(
            height: 120,
            child: CustomPaint(
              painter: _SunArcPainter(progress: progress),
              child: const SizedBox.expand(),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text('Sunrise ${_fmtTime(sunrise)}  •  Sunset ${_fmtTime(sunset)}'),
          const SizedBox(height: AppSpacing.sm),
          Text('UV ${uv.toStringAsFixed(1)} (${uvLabel()})'),
          Text('Solar radiation ${solar?.toStringAsFixed(1) ?? '--'} W/m2/day'),
          const SizedBox(height: AppSpacing.xs),
          Text(
            'Best foliar spray: early morning or late afternoon (avoid peak UV hours).',
            style: context.textTheme.bodySmall?.copyWith(
              color: context.appColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _windSection() {
    final wind = _num(_current['wind_speed']) ?? 0;
    final gust = _num(_current['wind_gust']) ?? 0;
    final dir = _num(_current['wind_direction']) ?? 0;
    final spraySafe = wind < 3;

    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Wind',
            style: context.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          SizedBox(
            height: 120,
            child: CustomPaint(
              painter: _CompassPainter(directionDegrees: dir),
              child: const SizedBox.expand(),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Speed ${wind.toStringAsFixed(1)} m/s • Gust ${gust.toStringAsFixed(1)} m/s',
          ),
          const SizedBox(height: AppSpacing.xs),
          _pill(
            spraySafe ? 'Safe to spray' : 'High drift risk',
            color: spraySafe ? AppColors.success : AppColors.warning,
          ),
        ],
      ),
    );
  }

  Widget _airQualitySection() {
    final pm25 = _num(_air['pm25']);
    final pm10 = _num(_air['pm10']);
    final aqi = _num(_air['aqi']);

    Color aqiColor(double? v) {
      if (v == null) return Colors.grey;
      if (v <= 20) return AppColors.success;
      if (v <= 40) return AppColors.warning;
      return AppColors.danger;
    }

    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Air Quality',
            style: context.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: _metricMini(
                  'PM2.5',
                  pm25 == null ? '--' : pm25.toStringAsFixed(1),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: _metricMini(
                  'PM10',
                  pm10 == null ? '--' : pm10.toStringAsFixed(1),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Container(
                  padding: AppSpacing.allSm,
                  decoration: BoxDecoration(
                    color: aqiColor(aqi).withValues(alpha: 0.10),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Column(
                    children: [
                      const Text('AQI'),
                      Text(
                        aqi == null ? '--' : aqi.toStringAsFixed(0),
                        style: TextStyle(
                          color: aqiColor(aqi),
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _aiOverviewSection() {
    return AiOverviewCard(
      title: 'AI Weather Advisory',
      summary: _aiSummary,
      details: _aiDetails,
      expanded: _aiExpanded,
      loading: _aiLoading,
      updatedLabel: _formatUpdatedAt(_aiUpdatedAt),
      onToggleExpanded: () => setState(() => _aiExpanded = !_aiExpanded),
      onGenerateFresh: () => _generateAiOverview(forceRefresh: true),
      onActionTap: _openAiActionCard,
    );
  }

  Widget _depthBar(String label, double? value, String note) {
    final v = (value ?? 0).clamp(0.0, 1.0);
    final tone = Color.lerp(
      const Color(0xFF90CAF9),
      const Color(0xFF1565C0),
      v,
    )!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: context.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            Text(value == null ? '--' : value.toStringAsFixed(2)),
          ],
        ),
        const SizedBox(height: AppSpacing.xs),
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: LinearProgressIndicator(
            minHeight: 10,
            value: v,
            color: tone,
            backgroundColor: Colors.white.withValues(alpha: 0.55),
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          note,
          style: context.textTheme.bodySmall?.copyWith(
            color: context.appColors.textSecondary,
          ),
        ),
      ],
    );
  }

  Widget _pill(String text, {Color? color}) {
    final c = color ?? AppColors.primary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        color: c.withValues(alpha: 0.10),
        border: Border.all(color: c.withValues(alpha: 0.25)),
      ),
      child: Text(
        text,
        style: context.textTheme.bodySmall?.copyWith(
          color: c,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  Widget _metricMini(String title, String value) {
    return Container(
      padding: AppSpacing.allSm,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        color: Colors.white.withValues(alpha: 0.5),
      ),
      child: Column(
        children: [
          Text(title, style: context.textTheme.bodySmall),
          Text(
            value,
            style: context.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }

  Widget _statTile(IconData icon, String label, String value) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.56),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.white.withValues(alpha: 0.8)),
          ),
          child: Icon(icon, size: 16, color: AppColors.primary),
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: context.textTheme.bodySmall),
              Text(
                value,
                style: context.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _DecisionCardData {
  final String title;
  final String verdict;
  final String reason;
  final IconData icon;
  final bool positive;

  const _DecisionCardData({
    required this.title,
    required this.verdict,
    required this.reason,
    required this.icon,
    required this.positive,
  });
}

class _HourlyRainEtPainter extends CustomPainter {
  final List<double> precipProb;
  final List<double> et0;
  final int selectedIndex;
  final Color textColor;

  _HourlyRainEtPainter({
    required this.precipProb,
    required this.et0,
    required this.selectedIndex,
    required this.textColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final axisPaint = Paint()
      ..color = textColor.withValues(alpha: 0.32)
      ..strokeWidth = 1;

    final barPaint = Paint()..color = AppColors.info.withValues(alpha: 0.65);
    final linePaint = Paint()
      ..color = AppColors.success
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;
    final cursorPaint = Paint()
      ..color = AppColors.primary.withValues(alpha: 0.35)
      ..strokeWidth = 1.2;

    final left = 30.0;
    final right = size.width - 8;
    final bottom = size.height - 22;
    final top = 10.0;
    final width = right - left;
    final height = bottom - top;

    canvas.drawLine(Offset(left, bottom), Offset(right, bottom), axisPaint);
    canvas.drawLine(Offset(left, top), Offset(left, bottom), axisPaint);

    if (precipProb.isEmpty) return;

    final n = precipProb.length;
    final barW = width / n;
    final path = Path();

    final maxEt = et0.fold<double>(1.0, (p, e) => math.max(p, e));
    final marker = selectedIndex.clamp(0, n - 1);

    for (var i = 0; i < n; i++) {
      final x = left + i * barW;
      final p = (precipProb[i].clamp(0, 100)) / 100.0;
      final h = height * p;
      final rect = Rect.fromLTWH(x + barW * 0.12, bottom - h, barW * 0.76, h);
      canvas.drawRRect(
        RRect.fromRectAndRadius(rect, const Radius.circular(2)),
        barPaint,
      );

      final e = (et0.length > i ? et0[i] : 0) / maxEt;
      final y = bottom - height * e;
      final pt = Offset(x + barW * 0.5, y);
      if (i == 0) {
        path.moveTo(pt.dx, pt.dy);
      } else {
        path.lineTo(pt.dx, pt.dy);
      }
    }

    canvas.drawPath(path, linePaint);

    final cursorX = left + marker * barW + barW * 0.5;
    canvas.drawLine(Offset(cursorX, top), Offset(cursorX, bottom), cursorPaint);

    final selectedEt = (et0.length > marker ? et0[marker] : 0) / maxEt;
    final selectedY = bottom - height * selectedEt;
    canvas.drawCircle(
      Offset(cursorX, selectedY),
      3.5,
      Paint()..color = AppColors.success,
    );

    _drawText(canvas, '100', Offset(2, top - 6));
    _drawText(canvas, '50', Offset(8, top + height * 0.5 - 8));
    _drawText(canvas, '0', Offset(12, bottom - 8));
  }

  void _drawText(Canvas canvas, String text, Offset offset) {
    final painter = TextPainter(
      text: TextSpan(
        text: text,
        style: TextStyle(
          color: textColor.withValues(alpha: 0.8),
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
      textDirection: ui.TextDirection.ltr,
    )..layout();
    painter.paint(canvas, offset);
  }

  @override
  bool shouldRepaint(covariant _HourlyRainEtPainter oldDelegate) {
    return oldDelegate.precipProb != precipProb ||
        oldDelegate.et0 != et0 ||
        oldDelegate.selectedIndex != selectedIndex;
  }
}

class _SunArcPainter extends CustomPainter {
  final double progress;

  _SunArcPainter({required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height - 8);
    final radius = math.min(size.width * 0.42, size.height - 18);

    final base = Paint()
      ..color = Colors.black.withValues(alpha: 0.15)
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke;

    final active = Paint()
      ..color = AppColors.warning
      ..strokeWidth = 4
      ..style = PaintingStyle.stroke;

    final rect = Rect.fromCircle(center: center, radius: radius);
    canvas.drawArc(rect, math.pi, math.pi, false, base);
    canvas.drawArc(
      rect,
      math.pi,
      math.pi * progress.clamp(0.0, 1.0),
      false,
      active,
    );

    final angle = math.pi + math.pi * progress.clamp(0.0, 1.0);
    final sun = Offset(
      center.dx + radius * math.cos(angle),
      center.dy + radius * math.sin(angle),
    );

    canvas.drawCircle(sun, 7, Paint()..color = AppColors.warning);
    canvas.drawCircle(
      sun,
      11,
      Paint()..color = AppColors.warning.withValues(alpha: 0.18),
    );
  }

  @override
  bool shouldRepaint(covariant _SunArcPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}

class _CompassPainter extends CustomPainter {
  final double directionDegrees;

  _CompassPainter({required this.directionDegrees});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width, size.height) * 0.36;

    final ring = Paint()
      ..color = Colors.black.withValues(alpha: 0.2)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    canvas.drawCircle(center, radius, ring);

    final tickPaint = Paint()
      ..color = Colors.black.withValues(alpha: 0.25)
      ..strokeWidth = 1.5;
    for (var i = 0; i < 8; i++) {
      final a = (math.pi * 2 / 8) * i;
      final p1 = Offset(
        center.dx + (radius - 6) * math.cos(a),
        center.dy + (radius - 6) * math.sin(a),
      );
      final p2 = Offset(
        center.dx + radius * math.cos(a),
        center.dy + radius * math.sin(a),
      );
      canvas.drawLine(p1, p2, tickPaint);
    }

    final theta = (directionDegrees - 90) * math.pi / 180;
    final arrowEnd = Offset(
      center.dx + (radius - 10) * math.cos(theta),
      center.dy + (radius - 10) * math.sin(theta),
    );

    final arrow = Paint()
      ..color = AppColors.primary
      ..strokeWidth = 3;
    canvas.drawLine(center, arrowEnd, arrow);
    canvas.drawCircle(center, 4, Paint()..color = AppColors.primary);
  }

  @override
  bool shouldRepaint(covariant _CompassPainter oldDelegate) {
    return oldDelegate.directionDegrees != directionDegrees;
  }
}

extension _ListExt<T> on List<T> {
  T? elementAtOrNull(int index) {
    if (index < 0 || index >= length) return null;
    return this[index];
  }
}
