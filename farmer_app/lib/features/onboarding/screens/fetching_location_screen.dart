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

  String _locationName = 'Getting your exact location...';
  bool _isSelectingPoints = false;
  bool _showSelectionCard = false;
  bool _isAnalyzing = false;
  int _currentStep = 0;
  List<LatLng> _selectedPoints = [];
  double? _farmAreaAcres;
  Timer? _analysisTimer;

  @override
  void initState() {
    super.initState();
    _initializeLocationFlow();
  }

  @override
  void dispose() {
    _analysisTimer?.cancel();
    super.dispose();
  }

  Future<void> _initializeLocationFlow() async {
    final location = await _resolveUserLocation();
    final name = await _resolvePlaceName(location);

    if (!mounted) return;
    setState(() {
      _locationName = name;
      _showSelectionCard = true;
    });

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('last_location_name', name);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _animateZoomToUser(location);
    });
  }

  void _animateZoomToUser(LatLng target) {
    final stages = <double>[6.5, 9.0, 12.0, 14.5, 17.0];
    final stageCenter = LatLng(
      (_indiaCenter.latitude + target.latitude) / 2,
      (_indiaCenter.longitude + target.longitude) / 2,
    );

    Future<void>.delayed(const Duration(milliseconds: 700), () async {
      if (!mounted) return;
      _mapController.move(stageCenter, stages[0]);

      for (int i = 1; i < stages.length; i++) {
        await Future<void>.delayed(const Duration(milliseconds: 280));
        if (!mounted) return;

        final center = i < stages.length - 1 ? stageCenter : target;
        _mapController.move(center, stages[i]);
      }
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
    setState(() {
      _showSelectionCard = false;
      _isSelectingPoints = true;
      _selectedPoints = [];
      _farmAreaAcres = null;
      _isAnalyzing = false;
      _currentStep = 0;
    });
  }

  void _onMapTap(TapPosition _, LatLng point) {
    if (!_isSelectingPoints || _selectedPoints.length >= 4) return;

    setState(() {
      _selectedPoints = [..._selectedPoints, point];
    });

    if (_selectedPoints.length == 4) {
      _isSelectingPoints = false;
      _farmAreaAcres = _calculateAreaInAcres(_selectedPoints);
      Future<void>.delayed(const Duration(seconds: 2), _startAnalysis);
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

  void _startAnalysis() {
    if (!mounted) return;
    setState(() {
      _isAnalyzing = true;
      _currentStep = 0;
    });

    _analysisTimer?.cancel();
    _analysisTimer = Timer.periodic(const Duration(milliseconds: 1200), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }

      if (_currentStep >= _analysisSteps.length - 1) {
        timer.cancel();
        Future<void>.delayed(const Duration(milliseconds: 900), () {
          if (mounted) context.go(RoutePaths.home);
        });
      } else {
        setState(() {
          _currentStep += 1;
        });
      }
    });
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
                      onTap: _onMapTap,
                    ),
                    children: [
                      TileLayer(
                        urlTemplate:
                            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                        userAgentPackageName: 'com.example.farmer_app',
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

              Positioned(
                top: 8,
                left: 8,
                child: IconButton(
                  onPressed: () => context.go(RoutePaths.login),
                  icon: const Icon(Icons.arrow_back_rounded),
                  color: AppColors.lightText,
                  style: IconButton.styleFrom(
                    backgroundColor: Colors.white.withValues(alpha: 0.45),
                    side: BorderSide(color: Colors.white.withValues(alpha: 0.75)),
                  ),
                ),
              ),

              Positioned(
                top: 8,
                left: 60,
                right: 12,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.55),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.8)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.my_location_rounded, size: 18, color: AppColors.primaryDark),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _locationName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AppColors.lightText,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
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

              if (_isSelectingPoints)
                Positioned(
                  top: 72,
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
                  top: 128,
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

              if (_isAnalyzing)
                Positioned.fill(
                  child: Container(
                    color: Colors.black.withValues(alpha: 0.42),
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
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Analyzing your farm',
                            style: TextStyle(
                              color: AppColors.lightText,
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
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
                                    done
                                        ? Icons.check_circle
                                        : Icons.radio_button_unchecked,
                                    color: done
                                        ? AppColors.primary
                                        : AppColors.lightTextSecondary,
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
                                        fontWeight:
                                            done ? FontWeight.w600 : FontWeight.w500,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }),
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
}
