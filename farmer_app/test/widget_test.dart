import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:farmer_app/app.dart';

void main() {
  test('Kisan app widget instantiates', () {
    const app = KisanApp();
    expect(app, isA<KisanApp>());
  });
}
