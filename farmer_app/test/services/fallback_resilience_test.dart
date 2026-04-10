import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:farmer_app/core/storage/local_storage.dart';
import 'package:farmer_app/core/utils/app_cache.dart';
import 'package:farmer_app/core/network/api_client.dart';
import 'package:farmer_app/shared/services/live_market_service.dart';
import 'package:farmer_app/shared/services/market_service.dart';
import 'package:farmer_app/shared/services/weather_soil_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

typedef RequestResponder = Future<dynamic> Function(RequestOptions options);

ApiClient buildTestClient(RequestResponder responder) {
  final client = ApiClient(
    storage: LocalStorage(),
    baseUrl: 'http://localhost:8000',
  );

  client.dio.interceptors.clear();
  client.dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        try {
          final data = await responder(options);
          handler.resolve(
            Response<dynamic>(
              requestOptions: options,
              statusCode: 200,
              data: data,
            ),
          );
        } catch (e) {
          if (e is DioException) {
            handler.reject(e);
            return;
          }
          handler.reject(
            DioException(
              requestOptions: options,
              type: DioExceptionType.unknown,
              error: e,
            ),
          );
        }
      },
    ),
  );

  return client;
}

DioException server502(RequestOptions options) {
  return DioException(
    requestOptions: options,
    type: DioExceptionType.badResponse,
    response: Response<dynamic>(
      requestOptions: options,
      statusCode: 502,
      data: <String, dynamic>{'detail': 'Bad gateway'},
    ),
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    await AppCache.clearAll();
  });

  group('MarketService fallbacks', () {
    test('uses last-good cache snapshot when API fails', () async {
      const key = 'market:prices?crop=Wheat';
      final payload = <String, dynamic>{
        'prices': <Map<String, dynamic>>[
          <String, dynamic>{'crop': 'Wheat', 'price': 2200},
        ],
      };
      await AppCache.put('${key}_last_good', payload, ttlSeconds: 60);

      final client = buildTestClient((options) async {
        throw server502(options);
      });
      final service = MarketService(client);

      final result = await service.listPrices(crop: 'Wheat');

      expect(result['stale'], true);
      expect(result['cache_fallback'], true);
      expect((result['prices'] as List).isNotEmpty, true);
    });

    test('returns offline fallback structure when no cache exists', () async {
      final client = buildTestClient((options) async {
        throw server502(options);
      });
      final service = MarketService(client);

      final result = await service.listSchemes(state: 'Punjab');

      expect(result['source'], 'offline_fallback');
      expect(result['stale'], true);
      expect(result['schemes'], isA<List>());
    });
  });

  group('LiveMarketService fallbacks', () {
    test('returns offline states list on API failure', () async {
      final client = buildTestClient((options) async {
        throw server502(options);
      });
      final service = LiveMarketService(client);

      final states = await service.getStates();

      expect(states, isNotEmpty);
      expect(states.contains('Punjab'), true);
    });

    test('returns offline MSP map on API failure', () async {
      final client = buildTestClient((options) async {
        throw server502(options);
      });
      final service = LiveMarketService(client);

      final msp = await service.getAllMsp();

      expect(msp['source'], 'offline_fallback');
      expect((msp['msp_prices'] as Map).containsKey('Wheat'), true);
      expect(msp['stale'], true);
    });
  });

  group('WeatherSoilService fallbacks', () {
    test('returns offline weather shell on API failure with no cache', () async {
      final client = buildTestClient((options) async {
        throw server502(options);
      });
      final service = WeatherSoilService(client);

      final result = await service.getFullWeather(lat: 18.52, lon: 73.85);

      expect(result['stale'], true);
      expect(result['stale_reason'], 'offline_fallback');
      expect(result['current'], isA<Map>());
      expect(result['daily'], isA<Map>());
    });

    test('uses last-good soil composition when network fails', () async {
      const coord = '1.2346,2.3457';
      await AppCache.put(
        'soil_composition_last_good_$coord',
        <String, dynamic>{
          'available': true,
          'metrics': <String, dynamic>{'ph': 6.8},
        },
        ttlSeconds: 60,
      );

      final client = buildTestClient((options) async {
        throw server502(options);
      });
      final service = WeatherSoilService(client);

      final result = await service.getSoilComposition(
        lat: 1.23456,
        lon: 2.34567,
        forceRefresh: true,
      );

      expect(result['available'], true);
      expect(result['stale'], true);
      expect(result['stale_reason'], 'network_error');
      expect((result['metrics'] as Map)['ph'], 6.8);
    });
  });
}
