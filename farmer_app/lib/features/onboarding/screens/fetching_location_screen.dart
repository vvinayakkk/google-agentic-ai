import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/app_cache.dart';
import '../../../shared/services/app_prefetch_service.dart';
import '../../../shared/widgets/app_button.dart';

class FetchingLocationScreen extends ConsumerStatefulWidget {
  const FetchingLocationScreen({super.key});

  @override
  ConsumerState<FetchingLocationScreen> createState() =>
      _FetchingLocationScreenState();
}

class _FetchingLocationScreenState extends ConsumerState<FetchingLocationScreen> {
  static const _indiaCenter = LatLng(20.5937, 78.9629);
  static const _mumbai = LatLng(19.0760, 72.8777);

  final MapController _mapController = MapController();
  final List<String> _analysisSteps = const [
    'Analyzing farm land',
    'Analyzing soil conditions',
    'Fetching mandi prices',
    'Fetching weather updates',
    'Preparing personalized insights',
  ];

  bool _isSelectingPoints = false;
  bool _showSelectionCard = false;
  bool _isAnalyzing = false;
  int _currentStep = 0;
  List<LatLng> _selectedPoints = [];
  double? _farmAreaAcres;
  LatLng _userLocation = _mumbai;
  Future<void>? _prefetchFuture;
  Timer? _cameraTimer;

  @override
  void initState() {
    super.initState();
    _initializeLocationFlow();
  }

  @override
  void dispose() {
    _cameraTimer?.cancel();
    super.dispose();
  }

  Future<void> _initializeLocationFlow() async {
    final location = await _resolveUserLocation();
    _userLocation = location;
    final name = await _resolvePlaceName(location);

    if (!mounted) return;
    setState(() {
      _showSelectionCard = true;
    });

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('last_location_name', name);
    await prefs.setDouble('last_location_lat', location.latitude);
    await prefs.setDouble('last_location_lon', location.longitude);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _animateZoomToUser(location);
    });
  }

  void _animateZoomToUser(LatLng target) {
    Future<void>.delayed(const Duration(milliseconds: 350), () {
      if (!mounted) return;

      _cameraTimer?.cancel();
      const int totalFrames = 14;
      var frame = 0;

      _cameraTimer = Timer.periodic(const Duration(milliseconds: 130), (timer) {
        if (!mounted) {
          timer.cancel();
          return;
        }

        final rawT = frame / totalFrames;
        final t = Curves.easeInOutCubic.transform(rawT.clamp(0, 1));
        final zoomT = Curves.easeOutCubic.transform(rawT.clamp(0, 1));
        final center = LatLng(
          _indiaCenter.latitude + ((target.latitude - _indiaCenter.latitude) * t),
          _indiaCenter.longitude + ((target.longitude - _indiaCenter.longitude) * t),
        );
        final zoom = 4.2 + ((13.8 - 4.2) * zoomT);

        try {
          _mapController.move(center, zoom);
        } catch (_) {
          // Ignore transient map lifecycle races.
        }

        frame += 1;
        if (frame > totalFrames) {
          timer.cancel();
          _cameraTimer = null;
          try {
            _mapController.move(target, 13.8);
          } catch (_) {}
        }
      });
    });
  }

  Future<LatLng> _resolveUserLocation() async {
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.whileInUse ||
          permission == LocationPermission.always) {
        final position = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
            timeLimit: Duration(seconds: 8),
          ),
        );
        return LatLng(position.latitude, position.longitude);
      }
    } catch (_) {
      // Fall back to Mumbai if location is unavailable.
    }

    return _mumbai;
  }

  Future<String> _resolvePlaceName(LatLng point) async {
    try {
      final placemarks = await placemarkFromCoordinates(
        point.latitude,
        point.longitude,
      );
      if (placemarks.isNotEmpty) {
        final p = placemarks.first;
        final parts = <String>[
          if ((p.subLocality ?? '').trim().isNotEmpty) p.subLocality!.trim(),
          if ((p.locality ?? '').trim().isNotEmpty) p.locality!.trim(),
          if ((p.administrativeArea ?? '').trim().isNotEmpty)
            p.administrativeArea!.trim(),
        ];
        if (parts.isNotEmpty) return parts.join(', ');
      }
    } catch (_) {
      // Ignore reverse-geocoding failures and use fallback.
    }

    return 'Location detected';
  }

  void _startSelection() {
    Haptics.medium();
    setState(() {
      _showSelectionCard = false;
      _isSelectingPoints = true;
      _selectedPoints = [];
      _farmAreaAcres = null;
      _isAnalyzing = false;
      _currentStep = 0;
      _prefetchFuture = null;
    });
  }

  void _onMapTap(TapPosition _, LatLng point) {
    if (!_isSelectingPoints || _selectedPoints.length >= 4) return;
    Haptics.selection();

    setState(() {
      _selectedPoints = [..._selectedPoints, point];
    });

    if (_selectedPoints.length == 4) {
      _isSelectingPoints = false;
      _farmAreaAcres = _calculateAreaInAcres(_selectedPoints);
      Haptics.heavy();
      unawaited(Future<void>.delayed(const Duration(milliseconds: 900), _startAnalysis));
    }
  }

  double _calculateAreaInAcres(List<LatLng> points) {
    if (points.length < 3) return 0;

    final lat0 = points.first.latitude;
    final lon0 = points.first.longitude;
    final lat0Rad = lat0 * math.pi / 180;

    final projected = points.map((p) {
      final x = (p.longitude - lon0) * 111320 * math.cos(lat0Rad);
      final y = (p.latitude - lat0) * 110540;
      return Offset(x, y);
    }).toList();

    double area = 0;
    for (int i = 0; i < projected.length; i++) {
      final j = (i + 1) % projected.length;
      area += projected[i].dx * projected[j].dy;
      area -= projected[j].dx * projected[i].dy;
    }

    final squareMeters = area.abs() / 2;
    final acres = squareMeters / 4046.8564224;
    return double.parse(acres.toStringAsFixed(3));
  }

  Future<void> _startAnalysis() async {
    if (!mounted) return;
    setState(() {
      _isAnalyzing = true;
      _currentStep = 0;
    });

    _prefetchFuture ??= ref.read(appPrefetchServiceProvider).warmupAll(
          lat: _userLocation.latitude,
          lon: _userLocation.longitude,
          onStepChanged: (stepIndex) async {
            if (!mounted) return;
            Haptics.selection();
            setState(() {
              _currentStep = stepIndex.clamp(0, _analysisSteps.length - 1);
            });
          },
        );

    try {
      await _prefetchFuture;
    } catch (_) {
      // Prefetch is best-effort; continue onboarding flow.
    }

    await Future<void>.delayed(const Duration(milliseconds: 700));
    if (!mounted) return;
    Haptics.medium();
    context.go(RoutePaths.home);
  }

  Color _stepColor(int index) {
    if (index < _currentStep) return AppColors.primary;
    if (index == _currentStep) return AppColors.primaryDark;
    return AppColors.lightTextSecondary.withValues(alpha: 0.7);
  }

  Widget _analysisOverlayCard() {
    final progress = (_currentStep + 1) / _analysisSteps.length;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 18),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.88),
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: Colors.white.withValues(alpha: 0.96), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryDark.withValues(alpha: 0.2),
            blurRadius: 28,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                height: 42,
                width: 42,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.16),
                  shape: BoxShape.circle,
                ),
                child: const Center(
                  child: SizedBox(
                    height: 22,
                    width: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.6,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        AppColors.primaryDark,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Text(
                  'Preparing your farm dashboard',
                  style: TextStyle(
                    color: AppColors.lightText,
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    height: 1.2,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'Loading key data now so every screen opens instantly.',
            style: TextStyle(
              color: AppColors.lightTextSecondary,
              fontSize: 13,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              minHeight: 8,
              value: progress,
              backgroundColor: AppColors.primary.withValues(alpha: 0.16),
              valueColor: const AlwaysStoppedAnimation<Color>(
                AppColors.primaryDark,
              ),
            ),
          ),
          const SizedBox(height: 14),
          ..._analysisSteps.asMap().entries.map((entry) {
            final done = entry.key <= _currentStep;
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                children: [
                  Icon(
                    done ? Icons.check_circle_rounded : Icons.radio_button_unchecked,
                    color: _stepColor(entry.key),
                    size: 18,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      entry.value,
                      style: TextStyle(
                        color: done
                            ? AppColors.lightText
                            : AppColors.lightTextSecondary,
                        fontWeight: done ? FontWeight.w600 : FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final hasBoundary = _selectedPoints.length == 4;

    return Scaffold(
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
          child: Stack(
            children: [
              Positioned.fill(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(24),
                  child: FlutterMap(
                    mapController: _mapController,
                    options: MapOptions(
                      initialCenter: _indiaCenter,
                      initialZoom: 4.2,
                      minZoom: 3.5,
                      maxZoom: 17.0,
                      onTap: _onMapTap,
                    ),
                    children: [
                      TileLayer(
                        urlTemplate:
                            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                        userAgentPackageName: 'com.example.farmer_app',
                        maxZoom: 19,
                        keepBuffer: 6,
                      ),
                      if (_selectedPoints.isNotEmpty)
                        MarkerLayer(
                          markers: _selectedPoints
                              .asMap()
                              .entries
                              .map(
                                (entry) => Marker(
                                  point: entry.value,
                                  width: 34,
                                  height: 34,
                                  child: Container(
                                    decoration: BoxDecoration(
                                      color: AppColors.primary,
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                        color: Colors.white,
                                        width: 2,
                                      ),
                                    ),
                                    alignment: Alignment.center,
                                    child: Text(
                                      '${entry.key + 1}',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ),
                              )
                              .toList(),
                        ),
                      if (hasBoundary)
                        PolygonLayer(
                          polygons: [
                            Polygon(
                              points: _selectedPoints,
                              color: AppColors.primary.withValues(alpha: 0.25),
                              borderColor: AppColors.primary,
                              borderStrokeWidth: 3,
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
              ),

              if (_isSelectingPoints)
                Positioned(
                  top: 12,
                  left: 12,
                  right: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.65),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.85)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.touch_app_rounded,
                            color: AppColors.primaryDark, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Tap ${4 - _selectedPoints.length} more point(s) to complete boundary',
                            style: const TextStyle(
                              color: AppColors.lightText,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        Text(
                          '${_selectedPoints.length}/4',
                          style: const TextStyle(
                            color: AppColors.primaryDark,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

              if (_farmAreaAcres != null)
                Positioned(
                  top: _isSelectingPoints ? 72 : 12,
                  right: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.65),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.85)),
                    ),
                    child: Text(
                      'Area: $_farmAreaAcres acres',
                      style: const TextStyle(
                        color: AppColors.lightText,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),

              if (_showSelectionCard)
                Align(
                  alignment: Alignment.center,
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 20),
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [AppColors.lightBackground, AppColors.lightSurface],
                      ),
                      borderRadius: BorderRadius.circular(22),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.85)),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primaryDark.withValues(alpha: 0.12),
                          blurRadius: 22,
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.crop_square_rounded,
                            size: 38, color: AppColors.primaryDark),
                        const SizedBox(height: 10),
                        const Text(
                          'Select Your Farm Land',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w700,
                            color: AppColors.lightText,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Tap 4 points on the map around your farm boundary.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: AppColors.lightTextSecondary,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 16),
                        AppButton(
                          label: 'Start Selection',
                          onPressed: _startSelection,
                        ),
                      ],
                    ),
                  ),
                ),

              if (_isAnalyzing)
                Positioned.fill(
                  child: Container(
                    color: Colors.black.withValues(alpha: 0.36),
                    alignment: Alignment.center,
                    child: _analysisOverlayCard(),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
