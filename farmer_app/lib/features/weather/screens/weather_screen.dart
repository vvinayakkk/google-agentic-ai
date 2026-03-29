import 'package:flutter/material.dart';

import 'weather_soil_screen.dart';

/// Wrapper to keep existing route (`WeatherScreen`) while using the
/// new `WeatherSoilScreen` implementation.
class WeatherScreen extends StatelessWidget {
  const WeatherScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) => const WeatherSoilScreen();
}
