import 'dart:async';
import 'dart:math' as math;

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_map_animations/flutter_map_animations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/router/app_router.dart';
import '../../../shared/services/app_prefetch_service.dart';

class FetchingLocationScreen extends ConsumerStatefulWidget {
  const FetchingLocationScreen({super.key});

  @override
  ConsumerState<FetchingLocationScreen> createState() =>
      _FetchingLocationScreenState();
}

class _FetchingLocationScreenState extends ConsumerState<FetchingLocationScreen>
    with TickerProviderStateMixin {
  static const _indiaCenter = LatLng(20.5937, 78.9629);
  static const _mumbai = LatLng(19.0760, 72.8777);
  static const List<String> _introWords = [
    'किसान',
    'రైతు',
    'ರೈತ',
    'কৃষক',
    'ખેડૂત',
    'ਕਿਸਾਨ',
    'உழவன்',
    'Farmer',
  ];

  late final AnimatedMapController _animatedMapController;
  late final AnimationController _wordFadeController;
  late final AnimationController _preloaderSlideController;
  late final AnimationController _mapRevealController;
  late final Animation<double> _wordOpacity;
  late final Animation<Offset> _preloaderSlide;

  bool _showPreloader = true;
  bool _isFlowRunning = false;
  bool _isAnalyzing = false;
  bool _hasResolvedLocation = false;
  bool _showSelectionCard = false;
  bool _isSelectingPoints = false;

  int _wordIndex = 0;
  int _currentStep = 0;

  LatLng _userLocation = _mumbai;
  String _locationLabel = '';
  List<LatLng> _selectedPoints = [];
  double? _farmAreaAcres;

  final List<String> _analysisSteps = const [
    'fetching_location.analyzing_farm',
    'features.soil_moisture',
    'features.market_prices',
    'features.weather',
    'fetching_location.please_wait',
  ];

  @override
  void initState() {
    super.initState();

    _animatedMapController = AnimatedMapController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
      curve: Curves.easeInOutCubic,
    );

    _wordFadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _preloaderSlideController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _mapRevealController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
      value: 1,
    );
    _wordOpacity = Tween<double>(begin: 0, end: 0.75).animate(
      CurvedAnimation(parent: _wordFadeController, curve: Curves.easeInOut),
    );
    _preloaderSlide =
        Tween<Offset>(begin: Offset.zero, end: const Offset(0, -1.2)).animate(
          CurvedAnimation(
            parent: _preloaderSlideController,
            curve: Curves.easeInOutCubic,
          ),
        );

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _runFlow();
    });
  }

  @override
  void dispose() {
    _wordFadeController.dispose();
    _preloaderSlideController.dispose();
    _mapRevealController.dispose();
    super.dispose();
  }

  Future<void> _runFlow() async {
    if (_isFlowRunning) return;
    _isFlowRunning = true;

    final locFuture = _resolveUserLocation();

    await _runPreloaderSequence();
    if (!mounted) return;

    setState(() {
      _showPreloader = false;
    });

    final loc = await locFuture;
    if (!mounted) return;

    setState(() {
      _userLocation = loc;
      _hasResolvedLocation = true;
    });

    unawaited(_persistLocation(loc));

    await _animateZoomToUser(loc);
    if (!mounted) return;

    setState(() {
      _showSelectionCard = true;
    });
  }

  Future<void> _runPreloaderSequence() async {
    for (int i = 0; i < _introWords.length; i++) {
      if (!mounted) return;

      setState(() => _wordIndex = i);

      _wordFadeController.value = 0;
      await _wordFadeController.forward();
      await Future<void>.delayed(const Duration(milliseconds: 400));
    }

    await Future<void>.delayed(const Duration(milliseconds: 200));
    if (!mounted) return;
    await _preloaderSlideController.forward();
  }

  Future<void> _persistLocation(LatLng loc) async {
    try {
      final name = await _resolvePlaceName(loc);
      final prefs = await SharedPreferences.getInstance();

      await prefs.setString('last_location_name', name);
      await prefs.setDouble('last_location_lat', loc.latitude);
      await prefs.setDouble('last_location_lon', loc.longitude);

      if (!mounted) return;
      setState(() => _locationLabel = name);
    } catch (_) {
      // Best effort persistence only.
    }
  }

  Future<void> _animateZoomToUser(LatLng target) async {
    await Future<void>.delayed(const Duration(milliseconds: 350));

    final revealFuture = _mapRevealController.animateTo(
      0,
      curve: Curves.easeOutCubic,
      duration: const Duration(milliseconds: 2400),
    );

    await _animatedMapController.animateTo(
      dest: _indiaCenter,
      zoom: 5.5,
      duration: const Duration(milliseconds: 700),
    );

    await _animatedMapController.animateTo(
      dest: target,
      zoom: 10.5,
      duration: const Duration(milliseconds: 1400),
    );

    await _animatedMapController.animateTo(
      dest: target,
      zoom: 16.5,
      duration: const Duration(milliseconds: 2400),
    );

    await revealFuture;
  }

  Future<LatLng> _resolveUserLocation() async {
    try {
      final perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.always ||
          perm == LocationPermission.whileInUse) {
        final pos = await Geolocator.getCurrentPosition();
        return LatLng(pos.latitude, pos.longitude);
      }
    } catch (_) {}
    return _mumbai;
  }

  Future<String> _resolvePlaceName(LatLng point) async {
    try {
      final p = (await placemarkFromCoordinates(
        point.latitude,
        point.longitude,
      )).first;
      return "${p.locality}, ${p.administrativeArea}";
    } catch (_) {
      return "Location detected";
    }
  }

  Future<void> _startAnalysis() async {
    setState(() {
      _isAnalyzing = true;
      _currentStep = 0;
    });

    await ref
        .read(appPrefetchServiceProvider)
        .warmupAll(
          lat: _userLocation.latitude,
          lon: _userLocation.longitude,
          onStepChanged: (i) async {
            if (!mounted) return;
            setState(
              () => _currentStep = i.clamp(0, _analysisSteps.length - 1),
            );
          },
        );

    if (!mounted) return;
    await Future.delayed(const Duration(milliseconds: 500));
    if (!mounted) return;
    context.go(RoutePaths.home);
  }

  void _startSelection() {
    setState(() {
      _showSelectionCard = false;
      _isSelectingPoints = true;
      _selectedPoints = [];
      _farmAreaAcres = null;
    });
  }

  void _resetSelection() {
    setState(() {
      _selectedPoints = [];
      _farmAreaAcres = null;
      _isSelectingPoints = true;
      _showSelectionCard = false;
    });
  }

  Future<void> _onMapTap(TapPosition _, LatLng point) async {
    if (!_isSelectingPoints || _selectedPoints.length >= 4) return;

    setState(() {
      _selectedPoints = [..._selectedPoints, point];
    });

    if (_selectedPoints.length == 4) {
      setState(() {
        _isSelectingPoints = false;
        _farmAreaAcres = _calculateAreaInAcres(_selectedPoints);
      });

      await Future<void>.delayed(const Duration(milliseconds: 700));
      if (!mounted) return;
      await _startAnalysis();
    }
  }

  double _calculateAreaInAcres(List<LatLng> pts) {
    if (pts.length < 3) return 0;

    final lat0 = pts.first.latitude;
    final lon0 = pts.first.longitude;
    final lat0Rad = lat0 * math.pi / 180;

    final proj = pts
        .map((p) {
          final x = (p.longitude - lon0) * 111320 * math.cos(lat0Rad);
          final y = (p.latitude - lat0) * 110540;
          return Offset(x, y);
        })
        .toList(growable: false);

    double area = 0;
    for (int i = 0; i < proj.length; i++) {
      final j = (i + 1) % proj.length;
      area += proj[i].dx * proj[j].dy;
      area -= proj[j].dx * proj[i].dy;
    }

    return (area.abs() / 2) / 4046.856;
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final scaffoldBg = Theme.of(context).scaffoldBackgroundColor;
    final textColor = colors.onSurface;

    return Scaffold(
      backgroundColor: scaffoldBg,
      body: Stack(
        children: [
          Positioned.fill(child: ColoredBox(color: scaffoldBg)),

          FlutterMap(
            mapController: _animatedMapController.mapController,
            options: MapOptions(
              initialCenter: _indiaCenter,
              initialZoom: 4.2,
              maxZoom: 20.5,
              onTap: _onMapTap,
            ),
            children: [
              TileLayer(
                urlTemplate:
                    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                maxZoom: 20.5,
                keepBuffer: 14,
              ),
              if (_selectedPoints.isNotEmpty)
                MarkerLayer(
                  markers: _selectedPoints
                      .asMap()
                      .entries
                      .map((entry) {
                        return Marker(
                          point: entry.value,
                          width: 34,
                          height: 34,
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              color: colors.primary,
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 2),
                            ),
                            child: Center(
                              child: Text(
                                '${entry.key + 1}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                        );
                      })
                      .toList(growable: false),
                ),
              if (_selectedPoints.length == 4)
                PolygonLayer(
                  polygons: [
                    Polygon(
                      points: _selectedPoints,
                      color: colors.primary.withOpacity(0.22),
                      borderColor: colors.primary,
                      borderStrokeWidth: 3,
                    ),
                  ],
                ),
              if (_hasResolvedLocation)
                MarkerLayer(
                  markers: [
                    Marker(
                      point: _userLocation,
                      width: 46,
                      height: 46,
                      child: UserPulseMarker(color: colors.primary),
                    ),
                  ],
                ),
            ],
          ),

          if (_locationLabel.isNotEmpty && !_isAnalyzing && !_showPreloader)
            Positioned(
              top: MediaQuery.of(context).padding.top + 16,
              left: 16,
              right: 16,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: colors.surface.withOpacity(0.84),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: colors.outline.withOpacity(0.4)),
                ),
                child: Text(
                  _locationLabel,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: textColor,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),

          if (_showSelectionCard && !_isAnalyzing)
            Center(
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 20),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: colors.surface.withOpacity(0.92),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: colors.outline.withOpacity(0.45)),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.agriculture, color: colors.primary, size: 34),
                    const SizedBox(height: 10),
                    Text(
                      'fetching_location.subtitle'.tr(),
                      style: TextStyle(
                        color: textColor,
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'fetching_location.tap_map'.tr(),
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: textColor.withOpacity(0.8),
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _startSelection,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: colors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 22,
                          vertical: 12,
                        ),
                      ),
                      child: Text('fetching_location.start_selection'.tr()),
                    ),
                  ],
                ),
              ),
            ),

          if (_isSelectingPoints && !_isAnalyzing)
            Positioned(
              top: MediaQuery.of(context).padding.top + 70,
              left: 16,
              right: 16,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: colors.surface.withOpacity(0.9),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: colors.outline.withOpacity(0.45)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.touch_app, color: colors.primary),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        '${'fetching_location.tap_map'.tr()} (${4 - _selectedPoints.length})',
                        style: TextStyle(
                          color: textColor,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

          if (_isSelectingPoints && _selectedPoints.isNotEmpty && !_isAnalyzing)
            Positioned(
              bottom: 20,
              left: 16,
              child: TextButton.icon(
                onPressed: _resetSelection,
                style: TextButton.styleFrom(
                  backgroundColor: colors.surface.withOpacity(0.88),
                ),
                icon: const Icon(Icons.refresh),
                label: Text('common.reset'.tr()),
              ),
            ),

          if (_farmAreaAcres != null && !_isAnalyzing)
            Positioned(
              right: 16,
              bottom: 24,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: colors.surface.withOpacity(0.88),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: colors.outline.withOpacity(0.45)),
                ),
                child: Text(
                  '${_farmAreaAcres!.toStringAsFixed(2)} ${'profile.acres'.tr()}',
                  style: TextStyle(
                    color: textColor,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),

          if (_isAnalyzing)
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      colors.surface.withOpacity(0.92),
                      scaffoldBg.withOpacity(0.96),
                    ],
                  ),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: SafeArea(
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircularProgressIndicator(color: colors.primary),
                        const SizedBox(height: 22),
                        Text(
                          'fetching_location.please_wait'.tr(),
                          style: TextStyle(
                            color: textColor,
                            fontSize: 26,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 18),
                        Text(
                          _analysisSteps[_currentStep].tr(),
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: textColor.withOpacity(0.78),
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

          if (!_showPreloader)
            Positioned.fill(
              child: IgnorePointer(
                child: AnimatedBuilder(
                  animation: _mapRevealController,
                  builder: (context, child) {
                    if (_mapRevealController.value <= 0.001) {
                      return const SizedBox.shrink();
                    }

                    return Opacity(
                      opacity: _mapRevealController.value,
                      child: child,
                    );
                  },
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [scaffoldBg, colors.surface],
                      ),
                    ),
                  ),
                ),
              ),
            ),

          if (_showPreloader)
            Positioned.fill(
              child: SlideTransition(
                position: _preloaderSlide,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [scaffoldBg, colors.surface],
                    ),
                  ),
                  child: SafeArea(
                    child: Center(
                      child: FadeTransition(
                        opacity: _wordOpacity,
                        child: Text(
                          _introWords[_wordIndex],
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: colors.primary,
                            fontSize: 56,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1,
                            shadows: const [
                              Shadow(
                                color: Color.fromRGBO(16, 185, 129, 0.4),
                                offset: Offset(0, 2),
                                blurRadius: 15,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class UserPulseMarker extends StatefulWidget {
  const UserPulseMarker({super.key, required this.color});

  final Color color;

  @override
  State<UserPulseMarker> createState() => _UserPulseMarkerState();
}

class _UserPulseMarkerState extends State<UserPulseMarker>
    with SingleTickerProviderStateMixin {
  late AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(vsync: this, duration: const Duration(seconds: 2))
      ..repeat();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (_, __) {
        final scale = 1 + (_c.value * 0.6);

        return Stack(
          alignment: Alignment.center,
          children: [
            Container(
              width: 40 * scale,
              height: 40 * scale,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.green.withOpacity(0.2 * (1 - _c.value)),
              ),
            ),
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: widget.color,
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: const Icon(
                Icons.my_location,
                size: 18,
                color: Colors.white,
              ),
            ),
          ],
        );
      },
    );
  }
}
