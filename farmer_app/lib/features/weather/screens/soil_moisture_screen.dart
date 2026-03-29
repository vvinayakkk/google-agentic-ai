import 'package:flutter/material.dart';

import 'soil_health_screen.dart';

/// Wrapper to keep existing route (`SoilMoistureScreen`) while using the
/// new `SoilHealthScreen` implementation for the updated UI.
class SoilMoistureScreen extends StatelessWidget {
  const SoilMoistureScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) => const SoilHealthScreen();
}
