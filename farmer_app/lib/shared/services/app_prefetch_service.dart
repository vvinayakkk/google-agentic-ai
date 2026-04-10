import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'crop_service.dart';
import 'document_builder_service.dart';
import 'equipment_service.dart';
import 'farmer_service.dart';
import 'live_market_service.dart';
import 'livestock_service.dart';
import 'market_service.dart';
import 'notification_service.dart';
import 'weather_soil_service.dart';

/// Best-effort prefetch to warm frequently visited screens.
class AppPrefetchService {
  AppPrefetchService(this._ref);

  final Ref _ref;

  Future<void> warmupAll({
    double? lat,
    double? lon,
    Future<void> Function(int stepIndex)? onStepChanged,
    Duration minStepDuration = const Duration(milliseconds: 650),
    Duration maxStepDuration = const Duration(milliseconds: 1600),
    Duration perTaskTimeout = const Duration(seconds: 5),
  }) async {
    final farmer = _ref.read(farmerServiceProvider);
    final crop = _ref.read(cropServiceProvider);
    final market = _ref.read(marketServiceProvider);
    final weather = _ref.read(weatherSoilServiceProvider);
    final equipment = _ref.read(equipmentServiceProvider);
    final livestock = _ref.read(livestockServiceProvider);
    final notifications = _ref.read(notificationServiceProvider);
    final liveMarket = _ref.read(liveMarketServiceProvider);
    final docBuilder = _ref.read(documentBuilderServiceProvider);

    Future<void> guard(Future<void> Function() task) async {
      try {
        await task().timeout(perTaskTimeout);
      } catch (_) {
        // Prefetch should never block onboarding.
      }
    }

    Future<T?> guardValue<T>(Future<T> Function() task) async {
      try {
        return await task();
      } catch (_) {
        return null;
      }
    }

    Future<void> runStep(
      int stepIndex,
      List<Future<void> Function()> tasks,
    ) async {
      final watch = Stopwatch()..start();
      try {
        await Future.wait<void>(
          tasks.map((task) => guard(task)),
        ).timeout(maxStepDuration);
      } catch (_) {
        // Step exceeded time budget, continue with next phase.
      }

      final remaining = minStepDuration - watch.elapsed;
      if (remaining > Duration.zero) {
        await Future<void>.delayed(remaining);
      }

      if (onStepChanged != null) {
        await onStepChanged(stepIndex);
      }
    }

    final profile = await guardValue<Map<String, dynamic>>(
      () => farmer.getMyProfile(),
    );

    final state = (profile?['state'] ?? '').toString().trim();
    final district = (profile?['district'] ?? '').toString().trim();

    await runStep(0, [
      () => farmer.getDashboard(),
      () => crop.listCrops(),
      () => livestock.listLivestock(),
      () => livestock.warmAnimalProfile(),
      () => notifications.getUnreadCount(),
      () => notifications.list(perPage: 30),
    ]);

    await runStep(1, [
      if (lat != null && lon != null)
        () => weather.getFullWeather(lat: lat, lon: lon)
      else
        () => weather.getFullWeather(),
      if (lat != null && lon != null)
        () => weather.getSoilComposition(lat: lat, lon: lon)
      else
        () => weather.getSoilComposition(),
      if (state.isNotEmpty)
        () => weather.getSoilMoisture(
          state: state,
          district: district.isEmpty ? null : district,
          limit: 1,
        ),
    ]);

    await runStep(2, [
      () => market.listPrices(perPage: 100),
      () => market.listMandis(perPage: 100),
      () => market.listSchemes(perPage: 100),
      () => market.listSchemes(
        state: state.isEmpty ? null : state,
        isActive: true,
        perPage: 80,
        preferCache: true,
        forceRefresh: false,
      ),
      () => liveMarket.getLivePrices(limit: 120),
      () => liveMarket.getLiveMandis(limit: 200),
    ]);

    await runStep(3, [
      () => liveMarket.getCommodities(),
      () => liveMarket.getStates(),
      () => liveMarket.getAllMsp(),
    ]);

    await runStep(4, [
      () => equipment.listEquipment(),
      () => equipment.browseAllEquipment(),
      () => equipment.listRentalRatesFiltered(
        state: state.isEmpty ? null : state,
        district: district.isEmpty ? null : district,
        limit: 10,
      ),
      if (state.isEmpty) () => equipment.listRentalRatesFiltered(limit: 50),
      () => equipment.listRentalCategories(),
      () => equipment.getChcInfo(),
      () => equipment.getMechanizationStats(),
      if (state.isNotEmpty) () => equipment.getMechanizationStats(state: state),
      () => docBuilder.listSchemes(preferCache: true, forceRefresh: false),
      () => docBuilder.listSchemeDocs(),
    ]);

    // Warm individual equipment detail bundles for the first 8 items
    // so that tapping any equipment card loads instantly from cache.
    try {
      final ratesData = await guardValue<Map<String, dynamic>>(
        () => equipment.listRentalRatesFiltered(
          state: state.isEmpty ? null : state,
          district: district.isEmpty ? null : district,
          limit: 10,
          preferCache: true,
          forceRefresh: false,
        ),
      );
      final rows = <Map<String, dynamic>>[];
      if (ratesData != null) {
        final raw = ratesData['rows'] ?? ratesData['equipment'] ?? ratesData['items'];
        if (raw is List) {
          for (final item in raw) {
            if (item is Map) rows.add(Map<String, dynamic>.from(item));
          }
        }
      }
      if (rows.isNotEmpty) {
        final names = rows
            .map((r) => (r['equipment_name'] ?? r['name'] ?? '').toString().trim())
            .where((n) => n.isNotEmpty)
            .toSet()
            .take(8)
            .toList(growable: false);
        await Future.wait(
          names.map((name) => guard(
            () => equipment.warmRentalRateDetailBundle(
              equipmentName: name,
              state: state.isEmpty ? null : state,
              district: district.isEmpty ? null : district,
            ),
          )),
        );
      }
    } catch (_) {
      // Best-effort, never block onboarding.
    }

    try {
      final equipmentList = await guardValue<List<Map<String, dynamic>>>(
        () => equipment.listEquipment(preferCache: true, forceRefresh: false),
      );
      final rentalList = await guardValue<List<Map<String, dynamic>>>(
        () => equipment.listRentals(preferCache: true, forceRefresh: false),
      );

      final equipmentIds = <String>{};
      final rentalIds = <String>{};

      for (final item in equipmentList ?? const <Map<String, dynamic>>[]) {
        final id = (item['id'] ?? '').toString().trim();
        if (id.isNotEmpty) equipmentIds.add(id);
      }
      for (final item in rentalList ?? const <Map<String, dynamic>>[]) {
        final id = (item['id'] ?? '').toString().trim();
        if (id.isNotEmpty) rentalIds.add(id);
      }

      await Future.wait([
        for (final id in equipmentIds.take(8))
          guard(() => equipment.getEquipmentById(id, preferCache: true, forceRefresh: false)),
        for (final id in rentalIds.take(8))
          guard(() => equipment.getRentalById(id, preferCache: true, forceRefresh: false)),
      ]);
    } catch (_) {
      // Best-effort, never block onboarding.
    }


    final docSchemes = await guardValue<List<Map<String, dynamic>>>(
      () => docBuilder.listSchemes(preferCache: true, forceRefresh: false),
    );
    if (docSchemes != null && docSchemes.isNotEmpty) {
      final candidates = docSchemes.take(3).toList(growable: false);
      await Future.wait(
        candidates.map((scheme) {
          final schemeId = (scheme['id'] ?? scheme['scheme_id'] ?? '')
              .toString()
              .trim();
          if (schemeId.isEmpty) return Future<void>.value();
          return guard(
            () => docBuilder.getSchemeForm(
              schemeId,
              preferCache: true,
              forceRefresh: false,
            ),
          );
        }),
      );
    }
  }
}

final appPrefetchServiceProvider = Provider<AppPrefetchService>((ref) {
  return AppPrefetchService(ref);
});
