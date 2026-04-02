import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/services/ai_overview_service.dart';
import '../../../shared/services/farmer_service.dart';
import '../../../shared/services/weather_soil_service.dart';
import '../../../shared/widgets/error_view.dart';
import '../widgets/glass_widgets.dart';

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
  bool _aiGenerated = false;
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

          if (latest.isNotEmpty) {
            legacy = latest.first;
          }
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
    final hh = dt.hour.toString().padLeft(2, '0');
    final mm = dt.minute.toString().padLeft(2, '0');
    return '$hh:$mm';
  }

  String _fmtDate(String? iso) {
    if (iso == null || iso.isEmpty) return '--';
    final dt = DateTime.tryParse(iso);
    if (dt == null) return '--';
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

  Future<void> _loadCachedAiOverview() async {
    final cached = await ref
        .read(aiOverviewServiceProvider)
        .getCached('soil_health_overview_v1');
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
    } catch (_) {
      if (!mounted) return;
      setState(() => _aiLoading = false);
    }
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
        if (entry.key.toLowerCase() == wanted) {
          return entry.value;
        }
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

    if (!ph.isNaN) {
      final p = (1 - ((ph - 6.8).abs() / 2.8)).clamp(0.0, 1.0) * 20;
      score += p;
    }

    if (!oc.isNaN) {
      final ocScore = (oc / 12).clamp(0.0, 1.0) * 15;
      score += ocScore;
    }

    var npk = 0.0;
    if (!n.isNaN) npk += (n / 120).clamp(0.0, 1.0) * 10;
    if (legacyP != null) npk += (legacyP / 25).clamp(0.0, 1.0) * 5;
    if (legacyK != null) npk += (legacyK / 200).clamp(0.0, 1.0) * 5;
    score += npk;

    if (rootMoisture != null) {
      final m = (1 - ((rootMoisture - 0.25).abs() / 0.20)).clamp(0.0, 1.0) * 20;
      score += m;
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

    if (!cec.isNaN) {
      final c = (cec / 250).clamp(0.0, 1.0) * 10;
      score += c;
    }

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
        sand <= 52) {
      return 'Loam';
    }
    if (sand >= 43 && clay < 20) return 'Sandy Loam';
    return 'Loamy';
  }

  ({double sand, double silt, double clay})? _textureFallbackMix(
    String rawTexture,
  ) {
    final t = rawTexture.trim().toLowerCase();
    if (t.isEmpty) return null;

    if (t.contains('alluvial')) {
      return (sand: 45, silt: 40, clay: 15);
    }
    if (t.contains('black') || t.contains('regur')) {
      return (sand: 20, silt: 30, clay: 50);
    }
    if (t.contains('red')) {
      return (sand: 45, silt: 30, clay: 25);
    }
    if (t.contains('laterite')) {
      return (sand: 50, silt: 20, clay: 30);
    }
    if (t.contains('sandy loam')) {
      return (sand: 60, silt: 25, clay: 15);
    }
    if (t.contains('sandy')) {
      return (sand: 75, silt: 15, clay: 10);
    }
    if (t.contains('silty loam')) {
      return (sand: 20, silt: 65, clay: 15);
    }
    if (t.contains('silty')) {
      return (sand: 10, silt: 75, clay: 15);
    }
    if (t.contains('clay loam')) {
      return (sand: 35, silt: 30, clay: 35);
    }
    if (t.contains('clay')) {
      return (sand: 20, silt: 20, clay: 60);
    }
    if (t.contains('loam')) {
      return (sand: 40, silt: 40, clay: 20);
    }
    if (t.contains('peaty')) {
      return (sand: 30, silt: 40, clay: 30);
    }
    if (t.contains('saline')) {
      return (sand: 40, silt: 35, clay: 25);
    }

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

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final bgTop = isDark ? AppColors.darkBackground : const Color(0xFFFBF8F3);
    final bgBottom = isDark ? AppColors.darkSurface : const Color(0xFFF6F0E8);

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

    final fieldCapacity = 0.35;
    final wiltingPoint = 0.12;
    final rootM = (moistureRoot ?? 0.0).clamp(0.0, 1.0);
    final rootZoneWaterMm = rootM * 300; // approximate water stock in top 30cm
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
        ? <Widget>[
            _chemCard('pH', phValue, _metricStatus('ph'), _metricExplain('ph')),
            _chemCard(
              'Organic Carbon (g/kg)',
              ocValue,
              _metricStatus('organic_carbon'),
              _metricExplain('organic_carbon'),
            ),
            _chemCard(
              'Total Nitrogen (cg/kg)',
              nValue,
              _metricStatus('nitrogen'),
              _metricExplain('nitrogen'),
            ),
            _chemCard(
              'CEC (mmol/kg)',
              cecValue,
              _metricStatus('cec'),
              'Nutrient holding capacity. ${_metricExplain('cec')}',
            ),
            _chemCard(
              'Bulk Density (g/cm3)',
              bdValue,
              _metricStatus('bulk_density'),
              'Soil compaction indicator. ${_metricExplain('bulk_density')}',
            ),
            _chemCard(
              'Coarse Fragments (%)',
              coarseValue,
              _metricStatus('coarse_fragments'),
              'Stone content. ${_metricExplain('coarse_fragments')}',
            ),
          ]
        : <Widget>[
            _chemCard(
              'Legacy Moisture @15cm',
              legacySignal,
              legacySignal == null ? 'Unavailable' : 'Live',
              'From latest historical record (Avg_smlvl_at15cm).',
            ),
            _chemCard(
              'Surface Moisture (%)',
              moistureSurface == null ? null : moistureSurface * 100,
              moistureSurface == null ? 'Unavailable' : 'Live',
              'Current 0-1cm soil moisture from hourly weather feed.',
            ),
            _chemCard(
              'Root Moisture (%)',
              moistureRoot == null ? null : moistureRoot * 100,
              moistureRoot == null ? 'Unavailable' : 'Live',
              'Current 3-9cm root-zone moisture from hourly weather feed.',
            ),
            _chemCard(
              'Deep Moisture (%)',
              moistureDeep == null ? null : moistureDeep * 100,
              moistureDeep == null ? 'Unavailable' : 'Live',
              'Current 9-27cm deep-root moisture from hourly weather feed.',
            ),
            _chemCard(
              'Soil Temp 18cm (C)',
              temp18,
              temp18 == null ? 'Unavailable' : 'Live',
              'Current temperature at 18cm depth from hourly weather feed.',
            ),
            _chemCard(
              'Root-zone Water Stock (mm)',
              rootZoneWaterMm,
              'Live',
              'Estimated current water stock in top 30cm from moisture profile.',
            ),
          ];

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
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Soil Health',
                      style: context.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      (_farmLabel == null || _farmLabel!.isEmpty)
                          ? 'Farm location'
                          : _farmLabel!,
                      style: context.textTheme.bodySmall?.copyWith(
                        color: context.appColors.textSecondary,
                      ),
                    ),
                  ],
                ),
                Align(
                  alignment: Alignment.centerRight,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      GlassIconButton(
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
                                Icons.refresh,
                                color: AppColors.lightText,
                              ),
                        onPressed: _refreshing
                            ? null
                            : () => _fetch(forceRefresh: true),
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
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [bgTop, bgBottom],
          ),
        ),
        child: SafeArea(
          bottom: false,
          child: _loading && _full == null && _soilComposition == null
              ? const Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                )
              : _error != null && _full == null && _soilComposition == null
              ? ErrorView(
                  message: _error!,
                  onRetry: () => _fetch(forceRefresh: true),
                )
              : RefreshIndicator(
                  onRefresh: () => _fetch(forceRefresh: true),
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: AppSpacing.allLg,
                    children: [
                      if (_refreshing)
                        const LinearProgressIndicator(minHeight: 2),
                      if (_refreshing) const SizedBox(height: AppSpacing.md),
                      if (_error != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.md),
                          child: GlassCard(
                            child: Text(
                              _error!,
                              style: TextStyle(
                                color: context.appColors.textSecondary,
                              ),
                            ),
                          ),
                        ),
                      _aiOverviewSection(),
                      const SizedBox(height: AppSpacing.xl),
                      GlassCard(
                        featured: true,
                        child: Row(
                          children: [
                            SizedBox(
                              width: 102,
                              height: 102,
                              child: Stack(
                                alignment: Alignment.center,
                                children: [
                                  SizedBox(
                                    width: 102,
                                    height: 102,
                                    child: CircularProgressIndicator(
                                      value: _score / 100,
                                      strokeWidth: 10,
                                      color: AppColors.primary,
                                      backgroundColor: AppColors.primary
                                          .withValues(alpha: 0.12),
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
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color: _scoreColor(
                                        _score,
                                      ).withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      _scoreStatus(_score),
                                      style: TextStyle(
                                        color: _scoreColor(_score),
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: AppSpacing.sm),
                                  Text(
                                    'Score combines pH, organic carbon, N-P-K signals, real-time moisture, texture suitability, and CEC.',
                                    style: context.textTheme.bodyMedium,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),
                      GlassCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Soil Composition Triangle',
                              style: context.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.md),
                            SizedBox(
                              height: 220,
                              child: CustomPaint(
                                painter: _SoilTextureTrianglePainter(
                                  sand: sand,
                                  silt: silt,
                                  clay: clay,
                                  textColor: context.appColors.textSecondary,
                                ),
                                child: const SizedBox.expand(),
                              ),
                            ),
                            const SizedBox(height: AppSpacing.sm),
                            Text(
                              'Texture: $texture',
                              style: context.textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.xs),
                            Text(
                              'Sand ${_fmtPct(sand)} • Silt ${_fmtPct(silt)} • Clay ${_fmtPct(clay)}',
                              style: context.textTheme.bodySmall?.copyWith(
                                color: context.appColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),
                      Text(
                        'Chemistry Panel',
                        style: context.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      GridView.count(
                        crossAxisCount: MediaQuery.of(context).size.width < 420
                            ? 1
                            : 2,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        mainAxisSpacing: AppSpacing.md,
                        crossAxisSpacing: AppSpacing.md,
                        childAspectRatio: 2.4,
                        children: chemistryCards,
                      ),
                      const SizedBox(height: AppSpacing.xl),
                      GlassCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Real-time Soil Temperature Profile',
                              style: context.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.md),
                            if ([
                                      temp0,
                                      temp6,
                                      temp18,
                                      temp54,
                                    ].whereType<double>().toList().length >=
                                    2 &&
                                _distinctRoundedCount(
                                      [
                                        temp0,
                                        temp6,
                                        temp18,
                                        temp54,
                                      ].whereType<double>().toList(),
                                      decimals: 1,
                                    ) <=
                                    1) ...[
                              _tempDepthTile(
                                '0-54 cm (uniform profile)',
                                temp18 ?? temp6 ?? temp0 ?? temp54,
                              ),
                              const SizedBox(height: AppSpacing.xs),
                              Text(
                                'Provider currently reports near-uniform temperature across depths for this location/time.',
                                style: context.textTheme.bodySmall?.copyWith(
                                  color: context.appColors.textSecondary,
                                ),
                              ),
                            ] else ...[
                              _tempDepthTile('0 cm', temp0),
                              const SizedBox(height: AppSpacing.sm),
                              _tempDepthTile('6 cm', temp6),
                              const SizedBox(height: AppSpacing.sm),
                              _tempDepthTile('18 cm', temp18),
                              const SizedBox(height: AppSpacing.sm),
                              _tempDepthTile('54 cm', temp54),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),
                      GlassCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Real-time Soil Moisture Profile',
                              style: context.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.md),
                            _moistureBar('Surface 0-1cm', moistureSurface),
                            const SizedBox(height: AppSpacing.sm),
                            _moistureBar('Shallow 1-3cm', moistureShallow),
                            const SizedBox(height: AppSpacing.sm),
                            _moistureBar('Root 3-9cm', moistureRoot),
                            const SizedBox(height: AppSpacing.sm),
                            _moistureBar('Deep root 9-27cm', moistureDeep),
                            const SizedBox(height: AppSpacing.sm),
                            _moistureBar('Subsoil 27-81cm', moistureSubsoil),
                            const SizedBox(height: AppSpacing.md),
                            Text(
                              'Field capacity ~${fieldCapacity.toStringAsFixed(2)} • Wilting point ~${wiltingPoint.toStringAsFixed(2)}',
                              style: context.textTheme.bodySmall?.copyWith(
                                color: context.appColors.textSecondary,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.xs),
                            Text(
                              'Root-zone Water Stock: ${rootZoneWaterMm.toStringAsFixed(1)} mm',
                              style: context.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.xs),
                            Text(
                              'Deficit to Field Capacity: ${deficitToFieldCapacityMm.toStringAsFixed(1)} mm',
                              style: context.textTheme.bodySmall?.copyWith(
                                color: context.appColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (!trendFlat && trendCount > 0) ...[
                        const SizedBox(height: AppSpacing.xl),
                        _soilTrendSection(
                          times: trendTimes,
                          moisture: trendMoisture,
                          temperature: trendTemp,
                        ),
                      ],
                      if (trendFlat && outlookDates.isNotEmpty) ...[
                        const SizedBox(height: AppSpacing.xl),
                        _soilWaterOutlookSection(
                          dates: outlookDates,
                          rain: outlookRain,
                          et0: outlookEt0,
                        ),
                      ],
                      const SizedBox(height: AppSpacing.xl),
                      Text(
                        'Recommendations',
                        style: context.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      ..._recommendations().map(
                        (text) => Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.md),
                          child: GlassCard(
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: 6,
                                  height: 42,
                                  decoration: BoxDecoration(
                                    color: AppColors.primary,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                ),
                                const SizedBox(width: AppSpacing.md),
                                Expanded(child: Text(text)),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 90),
                    ],
                  ),
                ),
        ),
      ),
    );
  }

  Widget _aiOverviewSection() {
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.auto_awesome, color: AppColors.primary),
              const SizedBox(width: AppSpacing.sm),
              Text(
                'AI Overview',
                style: context.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            _aiExpanded ? _aiDetails : _aiSummary,
            maxLines: _aiExpanded ? null : 3,
            overflow: _aiExpanded
                ? TextOverflow.visible
                : TextOverflow.ellipsis,
            style: context.textTheme.bodyMedium,
          ),
          if (_aiLoading) ...[
            const SizedBox(height: AppSpacing.sm),
            const LinearProgressIndicator(minHeight: 2),
          ],
          const SizedBox(height: AppSpacing.sm),
          Text(
            _formatUpdatedAt(_aiUpdatedAt),
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
                  icon: Icon(_aiGenerated ? Icons.refresh : Icons.auto_awesome),
                  label: Text(
                    _aiGenerated ? 'Generate Fresh' : 'Generate AI Overview',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white.withValues(alpha: 0.85),
                    foregroundColor: AppColors.lightText,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(30),
                    ),
                    elevation: 0,
                    side: BorderSide(
                      color: Colors.white.withValues(alpha: 0.8),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              OutlinedButton(
                onPressed: () => setState(() => _aiExpanded = !_aiExpanded),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: Colors.white.withValues(alpha: 0.8)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(30),
                  ),
                ),
                child: Text(_aiExpanded ? 'Less' : 'More'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _soilWaterOutlookSection({
    required List<String> dates,
    required List<double> rain,
    required List<double> et0,
  }) {
    final count = dates.length;
    if (count == 0) {
      return const SizedBox.shrink();
    }

    final selected = _selectedOutlookPoint.clamp(0, count - 1).toInt();
    final mid = count ~/ 2;

    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '16-Day Soil Water Outlook',
            style: context.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            'Historical soil trend is flat for this location right now. Showing forecast rain vs ET0 demand.',
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
                  setState(() => _selectedOutlookPoint = point);
                }

                return GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTapDown: (details) =>
                      updateSelection(details.localPosition),
                  onHorizontalDragUpdate: (details) =>
                      updateSelection(details.localPosition),
                  child: CustomPaint(
                    painter: _WaterOutlookPainter(
                      rain: rain,
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
                  _fmtDate(dates.elementAtOrNull(0)),
                  style: context.textTheme.bodySmall,
                ),
              ),
              Expanded(
                child: Text(
                  _fmtDate(dates.elementAtOrNull(mid)),
                  textAlign: TextAlign.center,
                  style: context.textTheme.bodySmall,
                ),
              ),
              Expanded(
                child: Text(
                  _fmtDate(dates.elementAtOrNull(count - 1)),
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
              const Text('Rain (mm)'),
              const SizedBox(width: 14),
              Container(width: 14, height: 2, color: AppColors.warning),
              const SizedBox(width: 6),
              const Text('ET0 (mm)'),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Selected ${_fmtDate(dates.elementAtOrNull(selected))}: rain ${rain[selected].toStringAsFixed(1)} mm, ET0 ${et0[selected].toStringAsFixed(1)} mm',
            style: context.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w700,
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
  }) {
    final count = times.length;
    if (count == 0) {
      return const SizedBox.shrink();
    }

    final selected = _selectedTrendPoint.clamp(0, count - 1).toInt();
    final mid = count ~/ 2;

    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Hourly Root Moisture + Soil Temp (24h)',
            style: context.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            'Bars = root-zone moisture fraction, line = soil temp at depth. Tap/drag to inspect.',
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
                  setState(() => _selectedTrendPoint = point);
                }

                return GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTapDown: (details) =>
                      updateSelection(details.localPosition),
                  onHorizontalDragUpdate: (details) =>
                      updateSelection(details.localPosition),
                  child: CustomPaint(
                    painter: _SoilTrendPainter(
                      moisture: moisture,
                      temperature: temperature,
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
              const Text('Root moisture'),
              const SizedBox(width: 14),
              Container(width: 14, height: 2, color: AppColors.warning),
              const SizedBox(width: 6),
              const Text('Soil temp'),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Selected ${_fmtTime(times.elementAtOrNull(selected))}: moisture ${moisture[selected].toStringAsFixed(2)}, temp ${temperature[selected].toStringAsFixed(1)}C',
            style: context.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }

  Widget _chemCard(String title, double? value, String status, String explain) {
    final color = _statusColor(status);
    return GlassCard(
      padding: AppSpacing.allMd,
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
                  style: context.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  status,
                  style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            value == null ? '--' : value.toStringAsFixed(2),
            style: context.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Expanded(
            child: Text(
              explain,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: context.textTheme.bodySmall?.copyWith(
                color: context.appColors.textSecondary,
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

  Widget _tempDepthTile(String label, double? value) {
    final color = value == null
        ? Colors.grey
        : value < 12
        ? AppColors.info
        : value > 32
        ? AppColors.danger
        : AppColors.success;

    String relevance() {
      if (value == null) {
        return 'Data unavailable';
      }
      if (value >= 15 && value <= 25) {
        return 'Good for wheat sowing at this depth';
      }
      if (value < 15) {
        return 'Cool soil: germination may slow';
      }
      return 'Warm soil: monitor moisture stress';
    }

    return Container(
      padding: AppSpacing.allMd,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.56),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.8)),
      ),
      child: Row(
        children: [
          Container(
            width: 10,
            height: 44,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(10),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: context.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(value == null ? '--' : '${value.toStringAsFixed(1)}C'),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  relevance(),
                  style: context.textTheme.bodySmall?.copyWith(
                    color: context.appColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _moistureBar(String label, double? value) {
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
            minHeight: 9,
            value: v,
            color: tone,
            backgroundColor: Colors.white.withValues(alpha: 0.55),
          ),
        ),
      ],
    );
  }
}

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

    final fill = Paint()..color = AppColors.primary.withValues(alpha: 0.06);

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

    final sum = (sand! + silt! + clay!);
    if (sum <= 0) return;

    final ws = sand! / sum;
    final wi = silt! / sum;
    final wc = clay! / sum;

    final dot = Offset(
      pSand.dx * ws + pSilt.dx * wi + pClay.dx * wc,
      pSand.dy * ws + pSilt.dy * wi + pClay.dy * wc,
    );

    canvas.drawCircle(dot, 7, Paint()..color = AppColors.primary);
    canvas.drawCircle(
      dot,
      12,
      Paint()..color = AppColors.primary.withValues(alpha: 0.18),
    );
  }

  @override
  bool shouldRepaint(covariant _SoilTextureTrianglePainter oldDelegate) {
    return oldDelegate.sand != sand ||
        oldDelegate.silt != silt ||
        oldDelegate.clay != clay;
  }
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
      final rect = Rect.fromLTWH(x + barW * 0.12, bottom - h, barW * 0.76, h);
      canvas.drawRRect(
        RRect.fromRectAndRadius(rect, const Radius.circular(2)),
        barPaint,
      );

      final t = (temperature.length > i ? temperature[i] : minTemp);
      final normalized = ((t - minTemp) / tempRange).clamp(0.0, 1.0);
      final y = bottom - height * normalized;
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

    final selectedTemp = temperature.length > marker
        ? temperature[marker]
        : minTemp;
    final selectedTempNormalized = ((selectedTemp - minTemp) / tempRange).clamp(
      0.0,
      1.0,
    );
    final selectedY = bottom - height * selectedTempNormalized;
    canvas.drawCircle(
      Offset(cursorX, selectedY),
      3.5,
      Paint()..color = AppColors.warning,
    );

    _drawText(canvas, '1.0', Offset(2, top - 6));
    _drawText(canvas, '0.5', Offset(8, top + height * 0.5 - 8));
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
  bool shouldRepaint(covariant _SoilTrendPainter oldDelegate) {
    return oldDelegate.moisture != moisture ||
        oldDelegate.temperature != temperature ||
        oldDelegate.selectedIndex != selectedIndex;
  }
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
      final rect = Rect.fromLTWH(x + barW * 0.12, bottom - h, barW * 0.76, h);
      canvas.drawRRect(
        RRect.fromRectAndRadius(rect, const Radius.circular(2)),
        barPaint,
      );

      final e = ((et0.length > i ? et0[i] : 0).clamp(0.0, maxY)) / maxY;
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

    final selectedEt =
        ((et0.length > marker ? et0[marker] : 0).clamp(0.0, maxY)) / maxY;
    final selectedY = bottom - height * selectedEt;
    canvas.drawCircle(
      Offset(cursorX, selectedY),
      3.5,
      Paint()..color = AppColors.warning,
    );

    _drawText(canvas, maxY.toStringAsFixed(1), Offset(2, top - 6));
    _drawText(
      canvas,
      (maxY * 0.5).toStringAsFixed(1),
      Offset(2, top + height * 0.5 - 8),
    );
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
  bool shouldRepaint(covariant _WaterOutlookPainter oldDelegate) {
    return oldDelegate.rain != rain ||
        oldDelegate.et0 != et0 ||
        oldDelegate.selectedIndex != selectedIndex;
  }
}

extension _ListExt<T> on List<T> {
  T? elementAtOrNull(int index) {
    if (index < 0 || index >= length) return null;
    return this[index];
  }
}
