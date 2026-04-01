import 'package:flutter/material.dart';
import '../../../weather/screens/soil_health_screen.dart' as weather;

/// Route wrapper for Crop Cycle Soil Health path.
///
/// This keeps the existing route/symbol while reusing the redesigned
/// weather soil health experience.
class SoilHealthScreen extends StatelessWidget {
  const SoilHealthScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const weather.SoilHealthScreen();
  }
}
