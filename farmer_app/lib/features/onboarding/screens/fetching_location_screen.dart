import 'dart:async';
import 'dart:math' as math;

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

  late final AnimatedMapController _animatedMapController;

  List<LatLng> _selectedPoints = [];
  List<LatLng> _animatedPolygon = [];

  bool _isSelectingPoints = false;
  bool _showSelectionCard = false;
  bool _isAnalyzing = false;

  int _currentStep = 0;
  double? _farmAreaAcres;
  LatLng _userLocation = _mumbai;

  final List<String> _analysisSteps = const [
    'Analyzing farm land',
    'Analyzing soil conditions',
    'Fetching mandi prices',
    'Fetching weather updates',
    'Preparing insights',
  ];

  @override
  void initState() {
    super.initState();

    _animatedMapController = AnimatedMapController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
      curve: Curves.easeInOutCubic,
    );

    _initialize();
  }

  Future<void> _initialize() async {
    final loc = await _resolveUserLocation();
    _userLocation = loc;

    final name = await _resolvePlaceName(loc);

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('last_location_name', name);
    await prefs.setDouble('last_location_lat', loc.latitude);
    await prefs.setDouble('last_location_lon', loc.longitude);

    setState(() => _showSelectionCard = true);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _animateZoomToUser(loc);
    });
  }

  Future<void> _animateZoomToUser(LatLng target) async {
    await Future.delayed(const Duration(milliseconds: 300));

    await _animatedMapController.animateTo(
      dest: _indiaCenter,
      zoom: 5.5,
      duration: const Duration(milliseconds: 500),
    );

    await _animatedMapController.animateTo(
      dest: target,
      zoom: 16.5,
      duration: const Duration(milliseconds: 1600),
    );
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
      ))
          .first;
      return "${p.locality}, ${p.administrativeArea}";
    } catch (_) {
      return "Location detected";
    }
  }

  void _startSelection() {
    setState(() {
      _showSelectionCard = false;
      _isSelectingPoints = true;
    });
  }

  Future<void> _onMapTap(TapPosition _, LatLng point) async {
    if (!_isSelectingPoints || _selectedPoints.length >= 4) return;

    setState(() => _selectedPoints.add(point));

    if (_selectedPoints.length == 4) {
      _isSelectingPoints = false;
      _farmAreaAcres = _calculateAreaInAcres(_selectedPoints);

      await _animatePolygon();
      await _fitToFarm();

      await _startAnalysis();
    }
  }

  Future<void> _animatePolygon() async {
    _animatedPolygon = [];

    for (var p in _selectedPoints) {
      await Future.delayed(const Duration(milliseconds: 150));
      setState(() => _animatedPolygon.add(p));
    }

    setState(() => _animatedPolygon.add(_selectedPoints.first));
  }

  Future<void> _fitToFarm() async {
    await _animatedMapController.animatedFitCamera(
      cameraFit: CameraFit.bounds(
        bounds: LatLngBounds.fromPoints(_selectedPoints),
        padding: const EdgeInsets.all(70),
        maxZoom: 18.5,
      ),
    );

    await _animatedMapController.animateTo(
      zoom: 19.2,
      duration: const Duration(milliseconds: 500),
    );
  }

  Future<void> _startAnalysis() async {
    setState(() {
      _isAnalyzing = true;
      _currentStep = 0;
    });

    await ref.read(appPrefetchServiceProvider).warmupAll(
      lat: _userLocation.latitude,
      lon: _userLocation.longitude,
      onStepChanged: (i) async {
        setState(() => _currentStep = i);
      },
    );

    await Future.delayed(const Duration(milliseconds: 500));
    context.go(RoutePaths.home);
  }

  double _calculateAreaInAcres(List<LatLng> pts) {
    final lat0 = pts.first.latitude;
    final lon0 = pts.first.longitude;
    final lat0Rad = lat0 * math.pi / 180;

    final proj = pts.map((p) {
      final x = (p.longitude - lon0) * 111320 * math.cos(lat0Rad);
      final y = (p.latitude - lat0) * 110540;
      return Offset(x, y);
    }).toList();

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
    final hasBoundary = _selectedPoints.length == 4;

    return Scaffold(
      body: Stack(
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 600),
            transform: Matrix4.identity()
              ..scale(hasBoundary ? 1.05 : 1.0)
              ..translate(0.0, hasBoundary ? -20.0 : 0.0),
            child: FlutterMap(
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

                MarkerLayer(
                  markers: _selectedPoints.asMap().entries.map((e) {
                    return Marker(
                      point: e.value,
                      width: 40,
                      height: 40,
                      child: PulsingMarker(label: '${e.key + 1}'),
                    );
                  }).toList(),
                ),

                if (hasBoundary)
                  PolygonLayer(
                    polygons: [
                      Polygon(
                        points: _animatedPolygon,
                        color: Colors.green.withOpacity(0.15),
                        borderColor: Colors.green,
                        borderStrokeWidth: 3,
                      ),
                    ],
                  ),
              ],
            ),
          ),

          if (_farmAreaAcres != null)
            Positioned(
              top: 50,
              right: 16,
              child: Container(
                padding: const EdgeInsets.all(10),
                color: Colors.black,
                child: Text(
                  "${_farmAreaAcres!.toStringAsFixed(2)} acres",
                  style: const TextStyle(color: Colors.white),
                ),
              ),
            ),

          if (_isAnalyzing)
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const CircularProgressIndicator(),
                  const SizedBox(height: 10),
                  Text(_analysisSteps[_currentStep]),
                ],
              ),
            ),

          if (_showSelectionCard)
            Center(
              child: ElevatedButton(
                onPressed: _startSelection,
                child: const Text("Start Selection"),
              ),
            ),
        ],
      ),
    );
  }
}

class PulsingMarker extends StatefulWidget {
  final String label;
  const PulsingMarker({super.key, required this.label});

  @override
  State<PulsingMarker> createState() => _PulsingMarkerState();
}

class _PulsingMarkerState extends State<PulsingMarker>
    with SingleTickerProviderStateMixin {
  late AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
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
              decoration: const BoxDecoration(
                color: Colors.green,
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: Text(widget.label,
                  style: const TextStyle(color: Colors.white)),
            ),
          ],
        );
      },
    );
  }
}