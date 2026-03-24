import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_endpoints.dart';

class EquipmentService {
  final ApiClient _client;

  EquipmentService(this._client);

  // ── Equipment CRUD ────────────────────────────────────────

  /// GET /api/v1/equipment/ → list equipment.
  Future<List<Map<String, dynamic>>> listEquipment() async {
    final res = await _client.get(ApiEndpoints.equipment);
    final data = res.data;
    if (data is Map && data['items'] is List) {
      return (data['items'] as List).cast<Map<String, dynamic>>();
    }
    if (data is List) return data.cast<Map<String, dynamic>>();
    return [];
  }

  /// POST /api/v1/equipment/ → create equipment.
  Future<Map<String, dynamic>> createEquipment({
    required String name,
    String? description,
    required double ratePerHour,
    bool? available,
  }) async {
    final res = await _client.post(
      ApiEndpoints.equipment,
      data: {
        'name': name,
        if (description != null) 'description': description,
        'rate_per_hour': ratePerHour,
        if (available != null) 'available': available,
      },
    );
    return res.data as Map<String, dynamic>;
  }

  /// GET /api/v1/equipment/{id}.
  Future<Map<String, dynamic>> getEquipmentById(String id) async {
    final res = await _client.get(ApiEndpoints.equipmentById(id));
    return res.data as Map<String, dynamic>;
  }

  /// PUT /api/v1/equipment/{id} → update equipment.
  Future<Map<String, dynamic>> updateEquipment(
      String id, Map<String, dynamic> data) async {
    final res = await _client.put(ApiEndpoints.equipmentById(id), data: data);
    return res.data as Map<String, dynamic>;
  }

  /// DELETE /api/v1/equipment/{id}.
  Future<void> deleteEquipment(String id) async {
    await _client.delete(ApiEndpoints.equipmentById(id));
  }

  // ── Rentals ───────────────────────────────────────────────

  /// GET /api/v1/equipment/rentals/ → list rentals.
  Future<List<Map<String, dynamic>>> listRentals() async {
    final res = await _client.get(ApiEndpoints.rentals);
    final data = res.data;
    if (data is Map && data['items'] is List) {
      return (data['items'] as List).cast<Map<String, dynamic>>();
    }
    if (data is List) return data.cast<Map<String, dynamic>>();
    return [];
  }

  /// POST /api/v1/equipment/rentals/ → create rental.
  Future<Map<String, dynamic>> createRental(
      Map<String, dynamic> data) async {
    final res = await _client.post(ApiEndpoints.rentals, data: data);
    return res.data as Map<String, dynamic>;
  }

  /// GET /api/v1/equipment/rentals/{id}.
  Future<Map<String, dynamic>> getRentalById(String id) async {
    final res = await _client.get(ApiEndpoints.rentalById(id));
    return res.data as Map<String, dynamic>;
  }

  /// PUT /api/v1/equipment/rentals/{id}/approve.
  Future<Map<String, dynamic>> approveRental(String id) async {
    final res = await _client.put(ApiEndpoints.rentalApprove(id));
    return res.data as Map<String, dynamic>;
  }

  /// PUT /api/v1/equipment/rentals/{id}/reject.
  Future<Map<String, dynamic>> rejectRental(String id) async {
    final res = await _client.put(ApiEndpoints.rentalReject(id));
    return res.data as Map<String, dynamic>;
  }

  /// PUT /api/v1/equipment/rentals/{id}/complete.
  Future<Map<String, dynamic>> completeRental(String id) async {
    final res = await _client.put(ApiEndpoints.rentalComplete(id));
    return res.data as Map<String, dynamic>;
  }

  /// PUT /api/v1/equipment/rentals/{id}/cancel.
  Future<Map<String, dynamic>> cancelRental(String id) async {
    final res = await _client.put(ApiEndpoints.rentalCancel(id));
    return res.data as Map<String, dynamic>;
  }

  // ── Rental Rates (Reference Data) ────────────────────────

  /// GET /api/v1/equipment/rental-rates/ → all equipment with standard rates.
  Future<List<Map<String, dynamic>>> listRentalRates() async {
    final res = await _client.get(ApiEndpoints.equipmentRentalRates);
    final data = res.data;
    if (data is Map && data['equipment'] is List) {
      return (data['equipment'] as List).cast<Map<String, dynamic>>();
    }
    if (data is List) return data.cast<Map<String, dynamic>>();
    return [];
  }

  /// GET /api/v1/equipment/rental-rates/categories → list categories.
  Future<List<String>> listRentalCategories() async {
    final res = await _client.get(ApiEndpoints.equipmentRentalCategories);
    final data = res.data;
    if (data is Map && data['categories'] is List) {
      return (data['categories'] as List).cast<String>();
    }
    return [];
  }

  /// GET /api/v1/equipment/rental-rates/category/{cat} → filter by category.
  Future<List<Map<String, dynamic>>> getRentalsByCategory(
      String category) async {
    final res = await _client
        .get(ApiEndpoints.equipmentRentalByCategory(category));
    final data = res.data;
    if (data is Map && data['equipment'] is List) {
      return (data['equipment'] as List).cast<Map<String, dynamic>>();
    }
    if (data is List) return data.cast<Map<String, dynamic>>();
    return [];
  }

  /// GET /api/v1/equipment/rental-rates/state/{state} → state-wise pricing.
  Future<List<Map<String, dynamic>>> getRentalsByState(String state) async {
    final res =
        await _client.get(ApiEndpoints.equipmentRentalByState(state));
    final data = res.data;
    if (data is Map && data['equipment'] is List) {
      return (data['equipment'] as List).cast<Map<String, dynamic>>();
    }
    if (data is List) return data.cast<Map<String, dynamic>>();
    return [];
  }
}

// ── Riverpod provider ─────────────────────────────────────────
final equipmentServiceProvider = Provider<EquipmentService>((ref) {
  return EquipmentService(ref.watch(apiClientProvider));
});
