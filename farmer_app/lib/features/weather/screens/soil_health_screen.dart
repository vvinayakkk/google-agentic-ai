import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/services/ai_overview_service.dart';
import '../../../shared/services/farmer_service.dart';
import '../../../shared/services/weather_soil_service.dart';
import '../../../shared/widgets/ai_overview_card.dart';
import '../../../shared/widgets/error_view.dart';

class SoilHealthScreen extends ConsumerStatefulWidget {
  const SoilHealthScreen({super.key});

  @override
  ConsumerState<SoilHealthScreen> createState() => _SoilHealthScreenState();
}

class _SoilHealthScreenState extends ConsumerState<SoilHealthScreen> {
  bool _loading = true;
  bool _refreshing = false;
  String? _error;

  int _score = 0;
  String? _farmLabel;
  String? _profileSoilType;

  Map<String, dynamic>? _full;
  Map<String, dynamic>? _soilComposition;
  Map<String, dynamic>? _legacyRecord;
  int _selectedTrendPoint = 0;
  int _selectedOutlookPoint = 0;

  bool _aiExpanded = false;
  bool _aiLoading = false;
  String _aiSummary = 'Generate AI soil briefing for today\'s farm conditions.';
  String _aiDetails =
      'Combines soil profile, moisture trend, temperature profile, and water outlook. Cached for 24 hours.';
  DateTime? _aiUpdatedAt;

  @override
  void initState() {
    super.initState();
    _loadCachedAiOverview();
    _fetch();
  }

  // ─── Data fetching ────────────────────────────────────────────────────────

  Future<void> _fetch({bool forceRefresh = false}) async {
    final hasSnapshot =
        _full != null || _soilComposition != null || _legacyRecord != null;
    setState(() {
      if (hasSnapshot) {
        _refreshing = true;
      } else {
        _loading = true;
      }
      _error = null;
    });

    try {
      final profile = await ref.read(farmerServiceProvider).getMyProfile();
      final state = (profile['state'] as String?)?.trim() ?? '';
      final district = (profile['district'] as String?)?.trim();

      final prefs = await SharedPreferences.getInstance();
      final lat = prefs.getDouble('last_location_lat');
      final lon = prefs.getDouble('last_location_lon');

      if (state.isEmpty && lat == null && lon == null) {
        setState(() {
          _error =
              'Location unavailable. Set farm location in profile or enable location to load soil data.';
          _loading = false;
          _refreshing = false;
        });
        return;
      }

      final fallbackLabel = [profile['district'], profile['state']]
          .map((e) => (e ?? '').toString().trim())
          .where((e) => e.isNotEmpty)
          .join(', ');

      final service = ref.read(weatherSoilServiceProvider);

      Future<T?> safeTimeout<T>(
        Future<T> Function() work,
        Duration timeout,
      ) async {
        try {
          return await work().timeout(timeout);
        } catch (_) {
          return null;
        }
      }

      Map<String, dynamic>? legacy;
      if (state.isNotEmpty) {
        try {
          var soil = await service.getSoilMoisture(
            state: state,
            district: district,
            limit: 1,
            forceRefresh: forceRefresh,
          );
          var latest =
              (soil['latest_records'] as List?)?.cast<Map<String, dynamic>>() ??
              const <Map<String, dynamic>>[];

          if (latest.isEmpty && district != null && district.isNotEmpty) {
            soil = await service.getSoilMoisture(
              state: state,
              limit: 1,
              forceRefresh: forceRefresh,
            );
            latest =
                (soil['latest_records'] as List?)
                    ?.cast<Map<String, dynamic>>() ??
                const <Map<String, dynamic>>[];
          }

          if (latest.isNotEmpty) legacy = latest.first;
        } catch (_) {
          legacy = null;
        }
      }

      final full = await service
          .getFullWeather(lat: lat, lon: lon, forceRefresh: forceRefresh)
          .timeout(const Duration(seconds: 12));
      final composition =
          await safeTimeout<Map<String, dynamic>>(
            () => service.getSoilComposition(
              lat: lat,
              lon: lon,
              forceRefresh: forceRefresh,
            ),
            const Duration(seconds: 9),
          ) ??
          const <String, dynamic>{};

      final score = _computeScore(
        composition: composition,
        full: full,
        legacy: legacy,
      );

      if (!mounted) return;
      setState(() {
        _full = full;
        _soilComposition = composition;
        _legacyRecord = legacy;
        final location =
            (full['location'] as Map?)?.cast<String, dynamic>() ??
            const <String, dynamic>{};
        final locationLabel = (location['label'] ?? '').toString().trim();
        _farmLabel = locationLabel.isNotEmpty
            ? locationLabel
            : (fallbackLabel.isEmpty ? 'Farm location' : fallbackLabel);
        _profileSoilType = (profile['soil_type'] ?? profile['soilType'] ?? '')
            .toString()
            .trim();
        _score = score;
        _loading = false;
        _refreshing = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
        _refreshing = false;
      });
    }
  }

  // ─── Computed getters ─────────────────────────────────────────────────────

  Map<String, dynamic> get _hourly =>
      (_full?['hourly'] as Map?)?.cast<String, dynamic>() ??
      const <String, dynamic>{};

  Map<String, dynamic> get _daily =>
      (_full?['daily'] as Map?)?.cast<String, dynamic>() ??
      const <String, dynamic>{};

  Map<String, dynamic> get _soilMetrics =>
      ((_soilComposition?['metrics'] as Map?)?.cast<String, dynamic>()) ??
      const <String, dynamic>{};

  Map<String, dynamic> get _soilDepths =>
      ((_soilComposition?['depths'] as Map?)?.cast<String, dynamic>()) ??
      const <String, dynamic>{};

  Map<String, dynamic> get _legacyMetrics =>
      ((_legacyRecord?['metrics'] as Map?)?.cast<String, dynamic>()) ??
      const <String, dynamic>{};

  // ─── Helpers ──────────────────────────────────────────────────────────────

  double? _num(dynamic value) {
    if (value == null) return null;
    if (value is num) return value.toDouble();
    return double.tryParse(value.toString());
  }

  List<dynamic> _list(dynamic value) {
    if (value is List) return value;
    return const [];
  }

  String _fmtTime(String? iso) {
    if (iso == null || iso.isEmpty) return '--';
    final dt = DateTime.tryParse(iso);
    if (dt == null) return '--';
    return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }

  String _fmtDate(String? iso) {
    if (iso == null || iso.isEmpty) return '--';
    final dt = DateTime.tryParse(iso);
    if (dt == null) return '--';
    const months = [
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
    return '${dt.day} ${months[dt.month - 1]}';
  }

  String _fmtPct(double? value) {
    if (value == null) return '--%';
    final pct = value <= 1.0 ? value * 100.0 : value;
    return '${pct.toStringAsFixed(1)}%';
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
    return 0;
  }

  int _distinctRoundedCount(List<double> values, {int decimals = 3}) {
    if (values.isEmpty) return 0;
    final scale = math.pow(10, decimals).toDouble();
    return values.map((v) => (v * scale).round()).toSet().length;
  }

  String _formatUpdatedAt(DateTime? dt) {
    if (dt == null) return 'Not generated yet';
    final hh = dt.hour.toString().padLeft(2, '0');
    final mm = dt.minute.toString().padLeft(2, '0');
    return 'Updated at $hh:$mm';
  }

  // ─── AI overview ──────────────────────────────────────────────────────────

  Future<void> _loadCachedAiOverview() async {
    final cached = await ref
        .read(aiOverviewServiceProvider)
        .getCached('soil_health_overview_v1');
    if (!mounted || cached == null) return;
    setState(() {
      _aiSummary = cached.summary;
      _aiDetails = cached.details;
      _aiUpdatedAt = cached.updatedAt;
    });
  }

  Future<void> _generateAiOverview({bool forceRefresh = true}) async {
    if (_aiLoading) return;
    setState(() => _aiLoading = true);

    try {
      final idx = _currentHourlyIndex();
      final rootMoisture = _hourlyValueAt(const [
        'soil_moisture_root',
        'soil_moisture_3_9cm',
      ], idx);
      final temp18 = _hourlyValueAt(const [
        'soil_temp_18cm',
        'soil_temp_6cm',
      ], idx);
      final clay = _metricValue('clay');
      final sand = _metricValue('sand');
      final silt = _metricValue('silt');
      final texture = (clay != null && sand != null && silt != null)
          ? _textureClass(sand: sand, silt: silt, clay: clay)
          : ((_profileSoilType ?? '').isEmpty ? 'Unknown' : _profileSoilType!);

      final rain = _list(_daily['precip_sum']);
      final et0 = _list(_daily['et0']);
      final dates = _list(_daily['date']);
      final start = _todayDailyStartIndex();

      final snippets = <String>[
        'Location ${_farmLabel ?? 'Farm'} with soil score $_score.',
        'Texture $texture, root moisture ${(rootMoisture ?? 0).toStringAsFixed(3)}, soil temp ${(temp18 ?? 0).toStringAsFixed(1)}C.',
      ];

      for (var j = 0; j < math.min(4, math.max(0, dates.length - start)); j++) {
        final i = start + j;
        snippets.add(
          '${dates[i]}: rain ${_num(rain.elementAtOrNull(i))?.toStringAsFixed(1) ?? '--'} mm, ET0 ${_num(et0.elementAtOrNull(i))?.toStringAsFixed(1) ?? '--'} mm.',
        );
      }

      final result = await ref
          .read(aiOverviewServiceProvider)
          .generate(
            key: 'soil_health_overview_v1',
            pageName: 'Soil Health',
            languageCode: Localizations.localeOf(context).languageCode,
            nearbyData: snippets,
            capabilities: const <String>[
              'Review soil score, moisture depth trend, and soil temperature trend',
              'Assess soil composition metrics and nutrient correction priorities',
              'Plan irrigation windows from rain and ET0 outlook',
              'Open AI chat for crop-specific soil treatment recommendations',
              'Track next field action checklist for soil recovery',
            ],
            forceRefresh: forceRefresh,
          );

      if (!mounted) return;
      setState(() {
        _aiSummary = result.summary;
        _aiDetails = result.details;
        _aiUpdatedAt = result.updatedAt;
        _aiLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _aiLoading = false);
    }
  }

  void _openAiActionCard(String actionText) {
    final query = Uri.encodeQueryComponent(actionText);
    context.push('${RoutePaths.chat}?agent=general&q=$query');
  }

  // ─── Series / metric helpers ──────────────────────────────────────────────

  List<double?> _hourlySeriesForKeys(List<String> keys) {
    List<double?> fallback = const <double?>[];
    for (final key in keys) {
      final values = _list(_hourly[key]);
      if (values.isNotEmpty) {
        final series = values.map(_num).toList(growable: false);
        fallback = series;
        if (series.any((v) => v != null && v.abs() > 0.000001)) {
          return series;
        }
      }
    }
    return fallback;
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

  double? _depthAverage(String depthKey) {
    final metricDepths = (_soilDepths[depthKey] as Map?)
        ?.cast<String, dynamic>();
    if (metricDepths == null || metricDepths.isEmpty) return null;
    var total = 0.0;
    var count = 0;
    for (final value in metricDepths.values) {
      final n = _num(value);
      if (n == null) continue;
      total += n;
      count += 1;
    }
    if (count == 0) return null;
    return total / count;
  }

  dynamic _legacyByAlias(List<String> aliases) {
    for (final alias in aliases) {
      final wanted = alias.toLowerCase();
      for (final entry in _legacyMetrics.entries) {
        if (entry.key.toLowerCase() == wanted) return entry.value;
      }
    }
    return null;
  }

  double? _legacyMetricValue(String key) {
    switch (key) {
      case 'ph':
        return _extractNumber(_legacyByAlias(const ['ph'])?.toString());
      case 'organic_carbon':
        return _extractNumber(
          _legacyByAlias(const [
            'organic_carbon',
            'organic carbon',
            'oc',
          ])?.toString(),
        );
      case 'nitrogen':
        return _extractNumber(
          _legacyByAlias(const ['nitrogen', 'n'])?.toString(),
        );
      case 'bulk_density':
        return _extractNumber(
          _legacyByAlias(const [
            'bulk_density',
            'bdod',
            'bulk density',
          ])?.toString(),
        );
      case 'coarse_fragments':
        return _extractNumber(
          _legacyByAlias(const ['coarse_fragments', 'cfvo'])?.toString(),
        );
      case 'sand':
        return _extractNumber(_legacyByAlias(const ['sand'])?.toString());
      case 'silt':
        return _extractNumber(_legacyByAlias(const ['silt'])?.toString());
      case 'clay':
        return _extractNumber(_legacyByAlias(const ['clay'])?.toString());
      default:
        return null;
    }
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

  double? _metricValue(String key) {
    final m = (_soilMetrics[key] as Map?)?.cast<String, dynamic>();
    final direct = _num(m?['value']);
    if (direct != null) return direct;
    if (key == 'clay' || key == 'sand' || key == 'silt') {
      final fromDepth = _depthAverage(key);
      if (fromDepth != null) return fromDepth;
    }
    return _legacyMetricValue(key);
  }

  String _metricStatus(String key) {
    final m = (_soilMetrics[key] as Map?)?.cast<String, dynamic>();
    final status = (m?['status'] ?? '').toString().trim();
    if (status.isNotEmpty) return status;
    return _metricValue(key) == null ? 'Unknown' : 'Legacy';
  }

  String _metricExplain(String key) {
    final m = (_soilMetrics[key] as Map?)?.cast<String, dynamic>();
    final explain = (m?['interpretation'] ?? '').toString().trim();
    if (explain.isNotEmpty) return explain;
    return _metricValue(key) == null
        ? 'No explanation available'
        : 'Using latest available legacy soil record for this metric.';
  }

  int _computeScore({
    required Map<String, dynamic> composition,
    required Map<String, dynamic> full,
    required Map<String, dynamic>? legacy,
  }) {
    final metrics =
        ((composition['metrics'] as Map?)?.cast<String, dynamic>()) ??
        const <String, dynamic>{};

    double val(String key) {
      final m = (metrics[key] as Map?)?.cast<String, dynamic>();
      final v = _num(m?['value']);
      return v ?? double.nan;
    }

    final ph = val('ph');
    final oc = val('organic_carbon');
    final n = val('nitrogen');
    final cec = val('cec');

    final hourly =
        (full['hourly'] as Map?)?.cast<String, dynamic>() ??
        const <String, dynamic>{};
    final idx = _currentHourlyIndex();
    final rootMoisture = _num(
      _list(hourly['soil_moisture_root']).elementAtOrNull(idx),
    );

    final clay = val('clay');
    final sand = val('sand');
    final silt = val('silt');

    final legacyMetrics =
        ((legacy?['metrics'] as Map?)?.cast<String, dynamic>()) ??
        const <String, dynamic>{};
    final legacyP = _extractNumber(legacyMetrics['phosphorus']?.toString());
    final legacyK = _extractNumber(legacyMetrics['potassium']?.toString());

    var score = 0.0;

    if (!ph.isNaN) score += (1 - ((ph - 6.8).abs() / 2.8)).clamp(0.0, 1.0) * 20;
    if (!oc.isNaN) score += (oc / 12).clamp(0.0, 1.0) * 15;

    var npk = 0.0;
    if (!n.isNaN) npk += (n / 120).clamp(0.0, 1.0) * 10;
    if (legacyP != null) npk += (legacyP / 25).clamp(0.0, 1.0) * 5;
    if (legacyK != null) npk += (legacyK / 200).clamp(0.0, 1.0) * 5;
    score += npk;

    if (rootMoisture != null) {
      score += (1 - ((rootMoisture - 0.25).abs() / 0.20)).clamp(0.0, 1.0) * 20;
    }

    var textureScore = 8.0;
    if (!clay.isNaN && !sand.isNaN && !silt.isNaN) {
      final texture = _textureClass(sand: sand, silt: silt, clay: clay);
      if (texture.contains('Loam')) {
        textureScore = 15.0;
      } else if (texture.contains('Clay') || texture.contains('Sandy')) {
        textureScore = 9.0;
      } else {
        textureScore = 12.0;
      }
    }
    score += textureScore;

    if (!cec.isNaN) score += (cec / 250).clamp(0.0, 1.0) * 10;

    return score.clamp(0, 100).round();
  }

  double? _extractNumber(String? text) {
    if (text == null || text.trim().isEmpty) return null;
    final m = RegExp(r'-?\d+\.?\d*').firstMatch(text);
    if (m == null) return null;
    return double.tryParse(m.group(0)!);
  }

  String _scoreStatus(int score) {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  }

  Color _scoreColor(int score) {
    if (score >= 80) return AppColors.success;
    if (score >= 60) return Colors.green;
    if (score >= 40) return AppColors.warning;
    return AppColors.danger;
  }

  String _textureClass({
    required double sand,
    required double silt,
    required double clay,
  }) {
    if (clay >= 40) return 'Clay';
    if (sand >= 70 && clay < 15) return 'Sandy';
    if (silt >= 50 && clay < 27) return 'Silty Loam';
    if (20 <= clay && clay < 40 && 20 <= sand && sand <= 55) return 'Clay Loam';
    if (7 <= clay &&
        clay < 27 &&
        28 <= silt &&
        silt < 50 &&
        23 <= sand &&
        sand <= 52)
      return 'Loam';
    if (sand >= 43 && clay < 20) return 'Sandy Loam';
    return 'Loamy';
  }

  ({double sand, double silt, double clay})? _textureFallbackMix(
    String rawTexture,
  ) {
    final t = rawTexture.trim().toLowerCase();
    if (t.isEmpty) return null;
    if (t.contains('alluvial')) return (sand: 45.0, silt: 40.0, clay: 15.0);
    if (t.contains('black') || t.contains('regur'))
      return (sand: 20.0, silt: 30.0, clay: 50.0);
    if (t.contains('red')) return (sand: 45.0, silt: 30.0, clay: 25.0);
    if (t.contains('laterite')) return (sand: 50.0, silt: 20.0, clay: 30.0);
    if (t.contains('sandy loam')) return (sand: 60.0, silt: 25.0, clay: 15.0);
    if (t.contains('sandy')) return (sand: 75.0, silt: 15.0, clay: 10.0);
    if (t.contains('silty loam')) return (sand: 20.0, silt: 65.0, clay: 15.0);
    if (t.contains('silty')) return (sand: 10.0, silt: 75.0, clay: 15.0);
    if (t.contains('clay loam')) return (sand: 35.0, silt: 30.0, clay: 35.0);
    if (t.contains('clay')) return (sand: 20.0, silt: 20.0, clay: 60.0);
    if (t.contains('loam')) return (sand: 40.0, silt: 40.0, clay: 20.0);
    if (t.contains('peaty')) return (sand: 30.0, silt: 40.0, clay: 30.0);
    if (t.contains('saline')) return (sand: 40.0, silt: 35.0, clay: 25.0);
    return null;
  }

  List<String> _recommendations() {
    final recs = <String>[];
    final clay = _metricValue('clay');
    final soc = _metricValue('organic_carbon');
    final ph = _metricValue('ph');
    final nitrogen = _metricValue('nitrogen');
    final bd = _metricValue('bulk_density');
    final idx = _currentHourlyIndex();
    final rootMoisture = _num(
      _list(_hourly['soil_moisture_root']).elementAtOrNull(idx),
    );

    if (clay != null && clay > 50) {
      recs.add(
        'High clay soil detected. Improve drainage and avoid over-irrigation during this cycle.',
      );
    }
    if (soc != null && soc < 5) {
      recs.add(
        'Organic carbon is low. Add compost, FYM, and crop residue to improve structure.',
      );
    }
    if (ph != null && ph < 6) {
      recs.add(
        'Soil is acidic. Apply agricultural lime in split doses before next sowing.',
      );
    }
    if (nitrogen != null && nitrogen < 50) {
      recs.add(
        'Nitrogen reserve is low. Plan split nitrogen application with irrigation scheduling.',
      );
    }
    if (bd != null && bd > 1.6) {
      recs.add(
        'Bulk density is high. Reduce compaction with deep tillage and organic amendments.',
      );
    }
    if (rootMoisture != null && rootMoisture < 0.15) {
      recs.add(
        'Root-zone moisture is below target. Plan light irrigation to avoid crop stress.',
      );
    }
    if (rootMoisture != null && rootMoisture > 0.38) {
      recs.add(
        'Root-zone moisture is high. Delay field operations and improve aeration.',
      );
    }
    if (recs.isEmpty) {
      recs.add(
        'Soil indicators are broadly stable. Continue periodic testing and moisture monitoring.',
      );
    }
    return recs;
  }

  void _showSourceInfo() {
    final available = _soilComposition?['available'] == true;
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Soil Data Source',
              style: context.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Location: ${_farmLabel ?? 'Not set'}',
              style: context.textTheme.bodyMedium,
            ),
            const SizedBox(height: 8),
            Text(
              available
                  ? 'Soil composition is from SoilGrids. Real-time depth moisture and temperature are from Open-Meteo. Legacy Avg_smlvl_at15cm is additionally shown when available.'
                  : 'Soil composition data is temporarily unavailable. Real-time depth moisture/temperature and legacy records are still shown.',
              style: context.textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }

  // ─── Build ────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;

    // Derived soil values
    final clayRaw = _metricValue('clay');
    final sandRaw = _metricValue('sand');
    final siltRaw = _metricValue('silt');
    final compositionTexture = (_soilComposition?['texture_class'] ?? '')
        .toString()
        .trim();
    final profileTexture = (_profileSoilType ?? '').trim();
    final fallbackTextureText = compositionTexture.isNotEmpty
        ? compositionTexture
        : profileTexture;
    final fallbackMix = _textureFallbackMix(fallbackTextureText);
    final sand = sandRaw ?? fallbackMix?.sand;
    final silt = siltRaw ?? fallbackMix?.silt;
    final clay = clayRaw ?? fallbackMix?.clay;
    final texture = (clay != null && sand != null && silt != null)
        ? _textureClass(sand: sand, silt: silt, clay: clay)
        : (fallbackTextureText.isEmpty ? 'Unknown' : fallbackTextureText);

    final idx = _currentHourlyIndex();
    final moistureSurface = _hourlyValueAt(const [
      'soil_moisture_surface',
      'soil_moisture_0_1cm',
    ], idx);
    final moistureShallow = _hourlyValueAt(const ['soil_moisture_1_3cm'], idx);
    final moistureRoot = _hourlyValueAt(const [
      'soil_moisture_root',
      'soil_moisture_3_9cm',
    ], idx);
    final moistureDeep = _hourlyValueAt(const ['soil_moisture_9_27cm'], idx);
    final moistureSubsoil = _hourlyValueAt(const [
      'soil_moisture_deep',
      'soil_moisture_27_81cm',
    ], idx);

    final temp0 = _hourlyValueAt(const ['soil_temp_0cm'], idx);
    final temp6 = _hourlyValueAt(const ['soil_temp_6cm'], idx);
    final temp18 = _hourlyValueAt(const ['soil_temp_18cm'], idx);
    final temp54 = _hourlyValueAt(const ['soil_temp_54cm'], idx);

    final trendTimesSrc = _list(
      _hourly['time'],
    ).map((e) => e.toString()).toList(growable: false);
    final trendMoistureSrc = _hourlySeriesForKeys(const [
      'soil_moisture_root',
      'soil_moisture_3_9cm',
    ]);
    final trendTempSrc = _hourlySeriesForKeys(const [
      'soil_temp_18cm',
      'soil_temp_6cm',
    ]);
    final trendAvailable = <int>[
      trendTimesSrc.length,
      trendMoistureSrc.length,
      trendTempSrc.length,
    ].where((e) => e > 0).fold<int>(0, (p, e) => math.max(p, e));
    final trendStart = idx.clamp(0, math.max(0, trendAvailable - 1)).toInt();
    final trendCount = trendAvailable == 0
        ? 0
        : math.min(24, trendAvailable - trendStart).toInt();
    final trendTimes = List<String>.generate(
      trendCount,
      (i) => trendTimesSrc.elementAtOrNull(trendStart + i) ?? '',
      growable: false,
    );
    final trendMoisture = List<double>.generate(
      trendCount,
      (i) => trendMoistureSrc.elementAtOrNull(trendStart + i) ?? 0,
      growable: false,
    );
    final trendTemp = List<double>.generate(
      trendCount,
      (i) => trendTempSrc.elementAtOrNull(trendStart + i) ?? 0,
      growable: false,
    );

    final legacySignal = _extractNumber(
      (_legacyRecord?['raw'] as Map?)?['Avg_smlvl_at15cm']?.toString(),
    );

    const fieldCapacity = 0.35;
    const wiltingPoint = 0.12;
    final rootM = (moistureRoot ?? 0.0).clamp(0.0, 1.0);
    final rootZoneWaterMm = rootM * 300;
    final deficitToFieldCapacityMm =
        ((fieldCapacity - rootM).clamp(0.0, fieldCapacity)) * 300;

    final trendFlat =
        trendCount <= 1 ||
        (_distinctRoundedCount(trendMoisture, decimals: 4) <= 1 &&
            _distinctRoundedCount(trendTemp, decimals: 2) <= 1);

    final dailyDatesSrc = _list(
      _daily['date'],
    ).map((e) => e.toString()).toList(growable: false);
    final dailyRainSrc = _list(
      _daily['precip_sum'],
    ).map(_num).toList(growable: false);
    final dailyEt0Src = _list(_daily['et0']).map(_num).toList(growable: false);
    final dailyStart = _todayDailyStartIndex();
    final dailyCount = math.min(
      16,
      math.max(0, dailyDatesSrc.length - dailyStart),
    );
    final outlookDates = List<String>.generate(
      dailyCount,
      (i) => dailyDatesSrc.elementAtOrNull(dailyStart + i) ?? '',
      growable: false,
    );
    final outlookRain = List<double>.generate(
      dailyCount,
      (i) => dailyRainSrc.elementAtOrNull(dailyStart + i) ?? 0,
      growable: false,
    );
    final outlookEt0 = List<double>.generate(
      dailyCount,
      (i) => dailyEt0Src.elementAtOrNull(dailyStart + i) ?? 0,
      growable: false,
    );

    final phValue = _metricValue('ph');
    final ocValue = _metricValue('organic_carbon');
    final nValue = _metricValue('nitrogen');
    final cecValue = _metricValue('cec');
    final bdValue = _metricValue('bulk_density');
    final coarseValue = _metricValue('coarse_fragments');

    final hasChemistryData =
        phValue != null ||
        ocValue != null ||
        nValue != null ||
        cecValue != null ||
        bdValue != null ||
        coarseValue != null;

    final chemistryCards = hasChemistryData
        ? <_ChemEntry>[
            _ChemEntry(
              'pH',
              phValue,
              _metricStatus('ph'),
              _metricExplain('ph'),
            ),
            _ChemEntry(
              'Organic Carbon (g/kg)',
              ocValue,
              _metricStatus('organic_carbon'),
              _metricExplain('organic_carbon'),
            ),
            _ChemEntry(
              'Total Nitrogen (cg/kg)',
              nValue,
              _metricStatus('nitrogen'),
              _metricExplain('nitrogen'),
            ),
            _ChemEntry(
              'CEC (mmol/kg)',
              cecValue,
              _metricStatus('cec'),
              'Nutrient holding capacity. ${_metricExplain('cec')}',
            ),
            _ChemEntry(
              'Bulk Density (g/cm3)',
              bdValue,
              _metricStatus('bulk_density'),
              'Soil compaction indicator. ${_metricExplain('bulk_density')}',
            ),
            _ChemEntry(
              'Coarse Fragments (%)',
              coarseValue,
              _metricStatus('coarse_fragments'),
              'Stone content. ${_metricExplain('coarse_fragments')}',
            ),
          ]
        : <_ChemEntry>[
            _ChemEntry(
              'Legacy Moisture @15cm',
              legacySignal,
              legacySignal == null ? 'Unavailable' : 'Live',
              'From latest historical record (Avg_smlvl_at15cm).',
            ),
            _ChemEntry(
              'Surface Moisture (%)',
              moistureSurface == null ? null : moistureSurface * 100,
              moistureSurface == null ? 'Unavailable' : 'Live',
              'Current 0-1cm soil moisture from hourly weather feed.',
            ),
            _ChemEntry(
              'Root Moisture (%)',
              moistureRoot == null ? null : moistureRoot * 100,
              moistureRoot == null ? 'Unavailable' : 'Live',
              'Current 3-9cm root-zone moisture from hourly weather feed.',
            ),
            _ChemEntry(
              'Deep Moisture (%)',
              moistureDeep == null ? null : moistureDeep * 100,
              moistureDeep == null ? 'Unavailable' : 'Live',
              'Current 9-27cm deep-root moisture from hourly weather feed.',
            ),
            _ChemEntry(
              'Soil Temp 18cm (C)',
              temp18,
              temp18 == null ? 'Unavailable' : 'Live',
              'Current temperature at 18cm depth from hourly weather feed.',
            ),
            _ChemEntry(
              'Root-zone Water Stock (mm)',
              rootZoneWaterMm,
              'Live',
              'Estimated current water stock in top 30cm from moisture profile.',
            ),
          ];

    // ── Colors matching CropDoctorScreen exactly ──
    final textColor = AppColors.lightText;
    final subColor = AppColors.lightTextSecondary;
    final cardColor = Colors.white.withValues(alpha: 0.56);

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
              // ── Header ──────────────────────────────────────────────────
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
                          onTap: () => Navigator.of(context).pop(),
                        ),
                      ),
                      Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Soil Health',
                            style: context.textTheme.titleLarge?.copyWith(
                              color: textColor,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          if (_farmLabel != null && _farmLabel!.isNotEmpty) ...[
                            const SizedBox(height: 2),
                            Text(
                              _farmLabel!,
                              style: context.textTheme.bodySmall?.copyWith(
                                color: subColor,
                              ),
                            ),
                          ],
                        ],
                      ),
                      Align(
                        alignment: Alignment.centerRight,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            _headerAction(
                              icon: Icons.refresh_rounded,
                              onTap: _refreshing
                                  ? null
                                  : () => _fetch(forceRefresh: true),
                              loading: _refreshing,
                            ),
                            const SizedBox(width: 8),
                            _headerAction(
                              icon: Icons.info_outline_rounded,
                              onTap: _showSourceInfo,
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
                child: _loading && _full == null && _soilComposition == null
                    ? const Center(
                        child: CircularProgressIndicator(
                          color: AppColors.primaryDark,
                        ),
                      )
                    : _error != null &&
                          _full == null &&
                          _soilComposition == null
                    ? ErrorView(
                        message: _error!,
                        onRetry: () => _fetch(forceRefresh: true),
                      )
                    : RefreshIndicator(
                        onRefresh: () => _fetch(forceRefresh: true),
                        child: SingleChildScrollView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.fromLTRB(24, 0, 24, 100),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (_refreshing) ...[
                                LinearProgressIndicator(
                                  minHeight: 2,
                                  color: AppColors.primaryDark,
                                  backgroundColor: AppColors.primaryDark
                                      .withValues(alpha: 0.1),
                                ),
                                const SizedBox(height: 12),
                              ],

                              // Error banner
                              if (_error != null) ...[
                                _glassCard(
                                  cardColor: cardColor,
                                  child: Row(
                                    children: [
                                      Icon(
                                        Icons.warning_amber_rounded,
                                        color: AppColors.warning,
                                        size: 18,
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          _error!,
                                          style: TextStyle(
                                            color: subColor,
                                            fontSize: 13,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 14),
                              ],

                              // AI Overview
                              _aiOverviewSection(
                                cardColor: cardColor,
                                textColor: textColor,
                                subColor: subColor,
                              ),
                              const SizedBox(height: 14),

                              // Score card
                              _glassCard(
                                cardColor: cardColor,
                                child: Row(
                                  children: [
                                    SizedBox(
                                      width: 96,
                                      height: 96,
                                      child: Stack(
                                        alignment: Alignment.center,
                                        children: [
                                          SizedBox(
                                            width: 96,
                                            height: 96,
                                            child: CircularProgressIndicator(
                                              value: _score / 100,
                                              strokeWidth: 9,
                                              color: _scoreColor(_score),
                                              backgroundColor: _scoreColor(
                                                _score,
                                              ).withValues(alpha: 0.12),
                                            ),
                                          ),
                                          Column(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Text(
                                                '$_score',
                                                style: context
                                                    .textTheme
                                                    .titleLarge
                                                    ?.copyWith(
                                                      color: textColor,
                                                      fontWeight:
                                                          FontWeight.w800,
                                                    ),
                                              ),
                                              Text(
                                                '/100',
                                                style: context
                                                    .textTheme
                                                    .bodySmall
                                                    ?.copyWith(color: subColor),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 10,
                                              vertical: 5,
                                            ),
                                            decoration: BoxDecoration(
                                              color: _scoreColor(
                                                _score,
                                              ).withValues(alpha: 0.12),
                                              borderRadius:
                                                  BorderRadius.circular(999),
                                            ),
                                            child: Text(
                                              _scoreStatus(_score),
                                              style: TextStyle(
                                                color: _scoreColor(_score),
                                                fontWeight: FontWeight.w700,
                                                fontSize: 13,
                                              ),
                                            ),
                                          ),
                                          const SizedBox(height: 8),
                                          Text(
                                            'Score combines pH, organic carbon, N-P-K signals, real-time moisture, texture suitability, and CEC.',
                                            style: context.textTheme.bodySmall
                                                ?.copyWith(
                                                  color: subColor,
                                                  height: 1.4,
                                                ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 14),

                              // Texture triangle
                              _glassCard(
                                cardColor: cardColor,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Soil Composition Triangle',
                                      style: context.textTheme.titleSmall
                                          ?.copyWith(
                                            color: textColor,
                                            fontWeight: FontWeight.w700,
                                          ),
                                    ),
                                    const SizedBox(height: 12),
                                    SizedBox(
                                      height: 200,
                                      child: CustomPaint(
                                        painter: _SoilTextureTrianglePainter(
                                          sand: sand,
                                          silt: silt,
                                          clay: clay,
                                          textColor: subColor,
                                        ),
                                        child: const SizedBox.expand(),
                                      ),
                                    ),
                                    const SizedBox(height: 10),
                                    Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 10,
                                            vertical: 5,
                                          ),
                                          decoration: BoxDecoration(
                                            color: AppColors.primaryDark
                                                .withValues(alpha: 0.1),
                                            borderRadius: BorderRadius.circular(
                                              999,
                                            ),
                                          ),
                                          child: Text(
                                            texture,
                                            style: TextStyle(
                                              color: AppColors.primaryDark,
                                              fontWeight: FontWeight.w700,
                                              fontSize: 13,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 10),
                                        Text(
                                          'Sand ${_fmtPct(sand)}  Silt ${_fmtPct(silt)}  Clay ${_fmtPct(clay)}',
                                          style: context.textTheme.bodySmall
                                              ?.copyWith(color: subColor),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 18),

                              // Chemistry panel
                              Text(
                                'Chemistry Panel',
                                style: context.textTheme.titleMedium?.copyWith(
                                  color: textColor,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 10),
                              GridView.count(
                                crossAxisCount:
                                    MediaQuery.of(context).size.width < 420
                                    ? 1
                                    : 2,
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                mainAxisSpacing: 10,
                                crossAxisSpacing: 10,
                                childAspectRatio: 2.4,
                                children: chemistryCards
                                    .map(
                                      (e) => _chemCard(
                                        title: e.title,
                                        value: e.value,
                                        status: e.status,
                                        explain: e.explain,
                                        cardColor: cardColor,
                                        textColor: textColor,
                                        subColor: subColor,
                                      ),
                                    )
                                    .toList(),
                              ),
                              const SizedBox(height: 18),

                              // Temperature profile
                              Text(
                                'Soil Temperature Profile',
                                style: context.textTheme.titleMedium?.copyWith(
                                  color: textColor,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 10),
                              _glassCard(
                                cardColor: cardColor,
                                child: Column(
                                  children: () {
                                    final temps = [
                                      temp0,
                                      temp6,
                                      temp18,
                                      temp54,
                                    ].whereType<double>().toList();
                                    final uniform =
                                        temps.length >= 2 &&
                                        _distinctRoundedCount(
                                              temps,
                                              decimals: 1,
                                            ) <=
                                            1;
                                    if (uniform) {
                                      return [
                                        _tempTile(
                                          '0-54 cm (uniform)',
                                          temp18 ?? temp6 ?? temp0 ?? temp54,
                                          textColor,
                                          subColor,
                                        ),
                                        const SizedBox(height: 6),
                                        Text(
                                          'Provider reports near-uniform temperature across depths.',
                                          style: context.textTheme.bodySmall
                                              ?.copyWith(color: subColor),
                                        ),
                                      ];
                                    }
                                    return [
                                      _tempTile(
                                        '0 cm',
                                        temp0,
                                        textColor,
                                        subColor,
                                      ),
                                      const SizedBox(height: 8),
                                      _tempTile(
                                        '6 cm',
                                        temp6,
                                        textColor,
                                        subColor,
                                      ),
                                      const SizedBox(height: 8),
                                      _tempTile(
                                        '18 cm',
                                        temp18,
                                        textColor,
                                        subColor,
                                      ),
                                      const SizedBox(height: 8),
                                      _tempTile(
                                        '54 cm',
                                        temp54,
                                        textColor,
                                        subColor,
                                      ),
                                    ];
                                  }(),
                                ),
                              ),
                              const SizedBox(height: 14),

                              // Moisture profile
                              Text(
                                'Soil Moisture Profile',
                                style: context.textTheme.titleMedium?.copyWith(
                                  color: textColor,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 10),
                              _glassCard(
                                cardColor: cardColor,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    _moistureBar(
                                      'Surface 0-1cm',
                                      moistureSurface,
                                      textColor,
                                      subColor,
                                    ),
                                    const SizedBox(height: 10),
                                    _moistureBar(
                                      'Shallow 1-3cm',
                                      moistureShallow,
                                      textColor,
                                      subColor,
                                    ),
                                    const SizedBox(height: 10),
                                    _moistureBar(
                                      'Root 3-9cm',
                                      moistureRoot,
                                      textColor,
                                      subColor,
                                    ),
                                    const SizedBox(height: 10),
                                    _moistureBar(
                                      'Deep root 9-27cm',
                                      moistureDeep,
                                      textColor,
                                      subColor,
                                    ),
                                    const SizedBox(height: 10),
                                    _moistureBar(
                                      'Subsoil 27-81cm',
                                      moistureSubsoil,
                                      textColor,
                                      subColor,
                                    ),
                                    const SizedBox(height: 14),
                                    Divider(
                                      color: Colors.white.withValues(
                                        alpha: 0.8,
                                      ),
                                      height: 1,
                                    ),
                                    const SizedBox(height: 12),
                                    Row(
                                      children: [
                                        Expanded(
                                          child: _statPill(
                                            label: 'Water Stock',
                                            value:
                                                '${rootZoneWaterMm.toStringAsFixed(1)} mm',
                                            color: AppColors.primaryDark,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: _statPill(
                                            label: 'Deficit to FC',
                                            value:
                                                '${deficitToFieldCapacityMm.toStringAsFixed(1)} mm',
                                            color: AppColors.warning,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      'Field capacity ~${fieldCapacity.toStringAsFixed(2)} • Wilting point ~${wiltingPoint.toStringAsFixed(2)}',
                                      style: context.textTheme.bodySmall
                                          ?.copyWith(color: subColor),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 14),

                              // Trend / Outlook
                              if (!trendFlat && trendCount > 0) ...[
                                _soilTrendSection(
                                  times: trendTimes,
                                  moisture: trendMoisture,
                                  temperature: trendTemp,
                                  cardColor: cardColor,
                                  textColor: textColor,
                                  subColor: subColor,
                                ),
                                const SizedBox(height: 14),
                              ],
                              if (trendFlat && outlookDates.isNotEmpty) ...[
                                _soilWaterOutlookSection(
                                  dates: outlookDates,
                                  rain: outlookRain,
                                  et0: outlookEt0,
                                  cardColor: cardColor,
                                  textColor: textColor,
                                  subColor: subColor,
                                ),
                                const SizedBox(height: 14),
                              ],

                              // Recommendations
                              Text(
                                'Recommendations',
                                style: context.textTheme.titleMedium?.copyWith(
                                  color: textColor,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 10),
                              ..._recommendations().map(
                                (text) => Padding(
                                  padding: const EdgeInsets.only(bottom: 10),
                                  child: _RecommendationTile(
                                    text: text,
                                    cardColor: cardColor,
                                    textColor: textColor,
                                    subColor: subColor,
                                  ),
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

  // ─── Widget builders ──────────────────────────────────────────────────────

  Widget _headerAction({
    required IconData icon,
    VoidCallback? onTap,
    bool loading = false,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.56),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.8)),
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
            : Icon(icon, color: AppColors.primaryDark, size: 20),
      ),
    );
  }

  Widget _glassCard({required Color cardColor, required Widget child}) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: cardColor,
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
      child: Padding(padding: const EdgeInsets.all(14), child: child),
    );
  }

  Widget _aiOverviewSection({
    required Color cardColor,
    required Color textColor,
    required Color subColor,
  }) {
    return AiOverviewCard(
      title: 'AI Soil Overview',
      summary: _aiSummary,
      details: _aiDetails,
      expanded: _aiExpanded,
      loading: _aiLoading,
      updatedLabel: _formatUpdatedAt(_aiUpdatedAt),
      onToggleExpanded: () => setState(() => _aiExpanded = !_aiExpanded),
      onGenerateFresh: () => _generateAiOverview(forceRefresh: true),
      margin: EdgeInsets.zero,
      cardColor: cardColor,
      textColor: textColor,
      subColor: subColor,
      onActionTap: _openAiActionCard,
    );
  }

  Widget _chemCard({
    required String title,
    required double? value,
    required String status,
    required String explain,
    required Color cardColor,
    required Color textColor,
    required Color subColor,
  }) {
    final color = _statusColor(status);
    return Container(
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.8),
          width: 1.1,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryDark.withValues(alpha: 0.06),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: context.textTheme.bodySmall?.copyWith(
                    color: textColor,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  status,
                  style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.w700,
                    fontSize: 11,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value == null ? '--' : value.toStringAsFixed(2),
            style: context.textTheme.titleMedium?.copyWith(
              color: textColor,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 2),
          Expanded(
            child: Text(
              explain,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: context.textTheme.bodySmall?.copyWith(
                color: subColor,
                fontSize: 11,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _statusColor(String status) {
    final s = status.toLowerCase();
    if (s.contains('optimal') || s.contains('good') || s.contains('high')) {
      return AppColors.success;
    }
    if (s.contains('moderate') || s.contains('slightly')) {
      return AppColors.warning;
    }
    if (s.contains('acidic') || s.contains('alkaline') || s.contains('low')) {
      return AppColors.danger;
    }
    return Colors.grey;
  }

  Widget _tempTile(
    String label,
    double? value,
    Color textColor,
    Color subColor,
  ) {
    final color = value == null
        ? Colors.grey
        : value < 12
        ? AppColors.info
        : value > 32
        ? AppColors.danger
        : AppColors.success;

    String relevance() {
      if (value == null) return 'Data unavailable';
      if (value >= 15 && value <= 25)
        return 'Good for wheat sowing at this depth';
      if (value < 15) return 'Cool soil: germination may slow';
      return 'Warm soil: monitor moisture stress';
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.8)),
      ),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 44,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: textColor,
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value == null ? '--' : '${value.toStringAsFixed(1)}°C',
                  style: TextStyle(
                    color: textColor,
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  relevance(),
                  style: TextStyle(color: subColor, fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _moistureBar(
    String label,
    double? value,
    Color textColor,
    Color subColor,
  ) {
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
                style: TextStyle(
                  color: textColor,
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
            ),
            Text(
              value == null ? '--' : value.toStringAsFixed(2),
              style: TextStyle(
                color: textColor,
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: LinearProgressIndicator(
            minHeight: 8,
            value: v,
            color: tone,
            backgroundColor: Colors.white.withValues(alpha: 0.55),
          ),
        ),
      ],
    );
  }

  Widget _statPill({
    required String label,
    required String value,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: TextStyle(
              color: color,
              fontSize: 15,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }

  Widget _soilTrendSection({
    required List<String> times,
    required List<double> moisture,
    required List<double> temperature,
    required Color cardColor,
    required Color textColor,
    required Color subColor,
  }) {
    final count = times.length;
    if (count == 0) return const SizedBox.shrink();
    final selected = _selectedTrendPoint.clamp(0, count - 1).toInt();
    final mid = count ~/ 2;

    return _glassCard(
      cardColor: cardColor,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Hourly Root Moisture + Soil Temp (24h)',
            style: context.textTheme.titleSmall?.copyWith(
              color: textColor,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Bars = root-zone moisture fraction, line = soil temp at depth.',
            style: context.textTheme.bodySmall?.copyWith(color: subColor),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 180,
            child: LayoutBuilder(
              builder: (context, box) {
                void updateSel(Offset p) {
                  if (count <= 1) return;
                  final w = box.maxWidth <= 1 ? 1.0 : box.maxWidth;
                  final pt = ((p.dx / w).clamp(0.0, 1.0) * (count - 1)).round();
                  setState(() => _selectedTrendPoint = pt);
                }

                return GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTapDown: (d) => updateSel(d.localPosition),
                  onHorizontalDragUpdate: (d) => updateSel(d.localPosition),
                  child: CustomPaint(
                    painter: _SoilTrendPainter(
                      moisture: moisture,
                      temperature: temperature,
                      selectedIndex: selected,
                      textColor: subColor,
                    ),
                    child: const SizedBox.expand(),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: Text(
                  _fmtTime(times.elementAtOrNull(0)),
                  style: TextStyle(color: subColor, fontSize: 11),
                ),
              ),
              Expanded(
                child: Text(
                  _fmtTime(times.elementAtOrNull(mid)),
                  textAlign: TextAlign.center,
                  style: TextStyle(color: subColor, fontSize: 11),
                ),
              ),
              Expanded(
                child: Text(
                  _fmtTime(times.elementAtOrNull(count - 1)),
                  textAlign: TextAlign.right,
                  style: TextStyle(color: subColor, fontSize: 11),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _legendDot(
                AppColors.info.withValues(alpha: 0.7),
                'Root moisture',
              ),
              const SizedBox(width: 14),
              _legendLine(AppColors.warning, 'Soil temp'),
            ],
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.55),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: Colors.white.withValues(alpha: 0.8)),
            ),
            child: Text(
              '${_fmtTime(times.elementAtOrNull(selected))} — moisture ${moisture[selected].toStringAsFixed(2)}, temp ${temperature[selected].toStringAsFixed(1)}°C',
              style: TextStyle(
                color: textColor,
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _soilWaterOutlookSection({
    required List<String> dates,
    required List<double> rain,
    required List<double> et0,
    required Color cardColor,
    required Color textColor,
    required Color subColor,
  }) {
    final count = dates.length;
    if (count == 0) return const SizedBox.shrink();
    final selected = _selectedOutlookPoint.clamp(0, count - 1).toInt();
    final mid = count ~/ 2;

    return _glassCard(
      cardColor: cardColor,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '16-Day Soil Water Outlook',
            style: context.textTheme.titleSmall?.copyWith(
              color: textColor,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Showing forecast rain vs ET0 demand. Tap/drag to inspect a day.',
            style: context.textTheme.bodySmall?.copyWith(color: subColor),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 180,
            child: LayoutBuilder(
              builder: (context, box) {
                void updateSel(Offset p) {
                  if (count <= 1) return;
                  final w = box.maxWidth <= 1 ? 1.0 : box.maxWidth;
                  final pt = ((p.dx / w).clamp(0.0, 1.0) * (count - 1)).round();
                  setState(() => _selectedOutlookPoint = pt);
                }

                return GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTapDown: (d) => updateSel(d.localPosition),
                  onHorizontalDragUpdate: (d) => updateSel(d.localPosition),
                  child: CustomPaint(
                    painter: _WaterOutlookPainter(
                      rain: rain,
                      et0: et0,
                      selectedIndex: selected,
                      textColor: subColor,
                    ),
                    child: const SizedBox.expand(),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: Text(
                  _fmtDate(dates.elementAtOrNull(0)),
                  style: TextStyle(color: subColor, fontSize: 11),
                ),
              ),
              Expanded(
                child: Text(
                  _fmtDate(dates.elementAtOrNull(mid)),
                  textAlign: TextAlign.center,
                  style: TextStyle(color: subColor, fontSize: 11),
                ),
              ),
              Expanded(
                child: Text(
                  _fmtDate(dates.elementAtOrNull(count - 1)),
                  textAlign: TextAlign.right,
                  style: TextStyle(color: subColor, fontSize: 11),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _legendDot(AppColors.info.withValues(alpha: 0.7), 'Rain (mm)'),
              const SizedBox(width: 14),
              _legendLine(AppColors.warning, 'ET0 (mm)'),
            ],
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.55),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: Colors.white.withValues(alpha: 0.8)),
            ),
            child: Text(
              '${_fmtDate(dates.elementAtOrNull(selected))} — rain ${rain[selected].toStringAsFixed(1)} mm, ET0 ${et0[selected].toStringAsFixed(1)} mm',
              style: TextStyle(
                color: textColor,
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _legendDot(Color color, String label) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(
        width: 11,
        height: 11,
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(3),
        ),
      ),
      const SizedBox(width: 5),
      Text(
        label,
        style: TextStyle(
          color: AppColors.lightText,
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      ),
    ],
  );

  Widget _legendLine(Color color, String label) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(width: 14, height: 2, color: color),
      const SizedBox(width: 5),
      Text(
        label,
        style: TextStyle(
          color: AppColors.lightText,
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      ),
    ],
  );
}

// ─── Data class ────────────────────────────────────────────────────────────

class _ChemEntry {
  final String title;
  final double? value;
  final String status;
  final String explain;

  const _ChemEntry(this.title, this.value, this.status, this.explain);
}

// ─── Recommendation tile ────────────────────────────────────────────────────

class _RecommendationTile extends StatelessWidget {
  final String text;
  final Color cardColor;
  final Color textColor;
  final Color subColor;

  const _RecommendationTile({
    required this.text,
    required this.cardColor,
    required this.textColor,
    required this.subColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.8),
          width: 1.1,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryDark.withValues(alpha: 0.06),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.75),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: Colors.white.withValues(alpha: 0.85)),
            ),
            child: const Icon(
              Icons.eco_outlined,
              size: 18,
              color: AppColors.primaryDark,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: TextStyle(color: textColor, height: 1.4, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Painters (unchanged logic, same as original) ──────────────────────────

class _SoilTextureTrianglePainter extends CustomPainter {
  final double? sand;
  final double? silt;
  final double? clay;
  final Color textColor;

  _SoilTextureTrianglePainter({
    required this.sand,
    required this.silt,
    required this.clay,
    required this.textColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final pSand = Offset(size.width * 0.15, size.height * 0.82);
    final pSilt = Offset(size.width * 0.85, size.height * 0.82);
    final pClay = Offset(size.width * 0.50, size.height * 0.12);

    final border = Paint()
      ..color = textColor.withValues(alpha: 0.35)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    final fill = Paint()..color = AppColors.primaryDark.withValues(alpha: 0.06);

    final tri = Path()
      ..moveTo(pSand.dx, pSand.dy)
      ..lineTo(pSilt.dx, pSilt.dy)
      ..lineTo(pClay.dx, pClay.dy)
      ..close();

    canvas.drawPath(tri, fill);
    canvas.drawPath(tri, border);

    final tp = TextPainter(textDirection: ui.TextDirection.ltr);

    void drawLabel(String text, Offset pos) {
      tp.text = TextSpan(
        text: text,
        style: TextStyle(
          color: textColor,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      );
      tp.layout();
      tp.paint(canvas, Offset(pos.dx - tp.width / 2, pos.dy - tp.height / 2));
    }

    drawLabel('Sand', Offset(pSand.dx - 8, pSand.dy + 14));
    drawLabel('Silt', Offset(pSilt.dx + 8, pSilt.dy + 14));
    drawLabel('Clay', Offset(pClay.dx, pClay.dy - 14));

    if (sand == null || silt == null || clay == null) return;
    final sum = sand! + silt! + clay!;
    if (sum <= 0) return;

    final ws = sand! / sum;
    final wi = silt! / sum;
    final wc = clay! / sum;

    final dot = Offset(
      pSand.dx * ws + pSilt.dx * wi + pClay.dx * wc,
      pSand.dy * ws + pSilt.dy * wi + pClay.dy * wc,
    );

    canvas.drawCircle(dot, 7, Paint()..color = AppColors.primaryDark);
    canvas.drawCircle(
      dot,
      12,
      Paint()..color = AppColors.primaryDark.withValues(alpha: 0.18),
    );
  }

  @override
  bool shouldRepaint(covariant _SoilTextureTrianglePainter old) =>
      old.sand != sand || old.silt != silt || old.clay != clay;
}

class _SoilTrendPainter extends CustomPainter {
  final List<double> moisture;
  final List<double> temperature;
  final int selectedIndex;
  final Color textColor;

  _SoilTrendPainter({
    required this.moisture,
    required this.temperature,
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
      ..color = AppColors.warning
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;
    final cursorPaint = Paint()
      ..color = AppColors.primaryDark.withValues(alpha: 0.35)
      ..strokeWidth = 1.2;

    const left = 30.0;
    final right = size.width - 8;
    const bottom = 0.0;
    final actualBottom = size.height - 22;
    const top = 10.0;
    final width = right - left;
    final height = actualBottom - top;

    canvas.drawLine(
      Offset(left, actualBottom),
      Offset(right, actualBottom),
      axisPaint,
    );
    canvas.drawLine(Offset(left, top), Offset(left, actualBottom), axisPaint);

    if (moisture.isEmpty) return;

    final n = moisture.length;
    final barW = width / n;
    final path = Path();

    final minTemp = temperature.fold<double>(double.infinity, math.min);
    final maxTemp = temperature.fold<double>(double.negativeInfinity, math.max);
    final tempRange = (maxTemp - minTemp).abs() < 0.000001
        ? 1.0
        : (maxTemp - minTemp);
    final marker = selectedIndex.clamp(0, n - 1);

    for (var i = 0; i < n; i++) {
      final x = left + i * barW;
      final m = moisture[i].clamp(0.0, 1.0);
      final h = height * m;
      final rect = Rect.fromLTWH(
        x + barW * 0.12,
        actualBottom - h,
        barW * 0.76,
        h,
      );
      canvas.drawRRect(
        RRect.fromRectAndRadius(rect, const Radius.circular(2)),
        barPaint,
      );

      final t = temperature.length > i ? temperature[i] : minTemp;
      final normalized = ((t - minTemp) / tempRange).clamp(0.0, 1.0);
      final y = actualBottom - height * normalized;
      final pt = Offset(x + barW * 0.5, y);
      if (i == 0) {
        path.moveTo(pt.dx, pt.dy);
      } else {
        path.lineTo(pt.dx, pt.dy);
      }
    }

    canvas.drawPath(path, linePaint);

    final cursorX = left + marker * barW + barW * 0.5;
    canvas.drawLine(
      Offset(cursorX, top),
      Offset(cursorX, actualBottom),
      cursorPaint,
    );

    final selTemp = temperature.length > marker ? temperature[marker] : minTemp;
    final selNorm = ((selTemp - minTemp) / tempRange).clamp(0.0, 1.0);
    final selY = actualBottom - height * selNorm;
    canvas.drawCircle(
      Offset(cursorX, selY),
      3.5,
      Paint()..color = AppColors.warning,
    );

    _drawText(canvas, '1.0', const Offset(2, 4));
    _drawText(canvas, '0.5', Offset(2, top + height * 0.5 - 8));
    _drawText(canvas, '0', Offset(8, actualBottom - 14));
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
  bool shouldRepaint(covariant _SoilTrendPainter old) =>
      old.moisture != moisture ||
      old.temperature != temperature ||
      old.selectedIndex != selectedIndex;
}

class _WaterOutlookPainter extends CustomPainter {
  final List<double> rain;
  final List<double> et0;
  final int selectedIndex;
  final Color textColor;

  _WaterOutlookPainter({
    required this.rain,
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
      ..color = AppColors.warning
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;
    final cursorPaint = Paint()
      ..color = AppColors.primaryDark.withValues(alpha: 0.35)
      ..strokeWidth = 1.2;

    const left = 30.0;
    final right = size.width - 8;
    final actualBottom = size.height - 22;
    const top = 10.0;
    final width = right - left;
    final height = actualBottom - top;

    canvas.drawLine(
      Offset(left, actualBottom),
      Offset(right, actualBottom),
      axisPaint,
    );
    canvas.drawLine(Offset(left, top), Offset(left, actualBottom), axisPaint);

    if (rain.isEmpty) return;

    final n = rain.length;
    final barW = width / n;
    final path = Path();

    final maxY = math.max(
      rain.fold<double>(0.1, math.max),
      et0.fold<double>(0.1, math.max),
    );
    final marker = selectedIndex.clamp(0, n - 1);

    for (var i = 0; i < n; i++) {
      final x = left + i * barW;
      final r = (rain[i].clamp(0.0, maxY)) / maxY;
      final h = height * r;
      final rect = Rect.fromLTWH(
        x + barW * 0.12,
        actualBottom - h,
        barW * 0.76,
        h,
      );
      canvas.drawRRect(
        RRect.fromRectAndRadius(rect, const Radius.circular(2)),
        barPaint,
      );

      final e = ((et0.length > i ? et0[i] : 0).clamp(0.0, maxY)) / maxY;
      final y = actualBottom - height * e;
      final pt = Offset(x + barW * 0.5, y);
      if (i == 0) {
        path.moveTo(pt.dx, pt.dy);
      } else {
        path.lineTo(pt.dx, pt.dy);
      }
    }

    canvas.drawPath(path, linePaint);

    final cursorX = left + marker * barW + barW * 0.5;
    canvas.drawLine(
      Offset(cursorX, top),
      Offset(cursorX, actualBottom),
      cursorPaint,
    );

    final selEt =
        ((et0.length > marker ? et0[marker] : 0).clamp(0.0, maxY)) / maxY;
    final selY = actualBottom - height * selEt;
    canvas.drawCircle(
      Offset(cursorX, selY),
      3.5,
      Paint()..color = AppColors.warning,
    );

    _drawText(canvas, maxY.toStringAsFixed(1), const Offset(2, 4));
    _drawText(
      canvas,
      (maxY * 0.5).toStringAsFixed(1),
      Offset(2, top + height * 0.5 - 8),
    );
    _drawText(canvas, '0', Offset(8, actualBottom - 14));
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
  bool shouldRepaint(covariant _WaterOutlookPainter old) =>
      old.rain != rain || old.et0 != et0 || old.selectedIndex != selectedIndex;
}

extension _ListExt<T> on List<T> {
  T? elementAtOrNull(int index) {
    if (index < 0 || index >= length) return null;
    return this[index];
  }
}
