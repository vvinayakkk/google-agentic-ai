/// Model for equipment rental rate reference data.
library;

class EquipmentRentalRate {
  final String name;
  final String category;
  final String? description;
  final double ratePerHour;
  final double? ratePerDay;
  final String? unit;
  final Map<String, double> statePricing;
  final String? imageUrl;
  final List<String> features;
  final bool available;

  const EquipmentRentalRate({
    required this.name,
    required this.category,
    this.description,
    required this.ratePerHour,
    this.ratePerDay,
    this.unit,
    this.statePricing = const {},
    this.imageUrl,
    this.features = const [],
    this.available = true,
  });

  factory EquipmentRentalRate.fromJson(Map<String, dynamic> json) {
    // Handle nested rental_rates format from backend:
    //   rental_rates: { hourly: {min, max, avg}, daily: {min, max, avg} }
    // OR flat format: rate_per_hour, rate_per_day
    final rentalRates = json['rental_rates'];
    double hourlyRate = 0;
    double? dailyRate;

    if (rentalRates is Map) {
      final hourly = rentalRates['hourly'];
      if (hourly is Map) {
        hourlyRate = (hourly['avg'] as num?)?.toDouble() ?? 0;
      }
      final daily = rentalRates['daily'];
      if (daily is Map) {
        dailyRate = (daily['avg'] as num?)?.toDouble();
      }
    }
    // Fallback to flat keys
    if (hourlyRate == 0) {
      hourlyRate = (json['rate_per_hour'] as num?)?.toDouble() ??
          (json['hourly_rate'] as num?)?.toDouble() ??
          0;
    }
    dailyRate ??= (json['rate_per_day'] as num?)?.toDouble() ??
        (json['daily_rate'] as num?)?.toDouble();

    // Handle state_variations from backend OR state_pricing
    Map<String, double> statePricing = {};
    final stateVar = json['state_variations'] ?? json['state_pricing'];
    if (stateVar is Map) {
      stateVar.forEach((key, value) {
        if (value is num) {
          statePricing[key.toString()] = value.toDouble();
        } else if (value is Map) {
          // state_variations: { "Punjab": {"per_acre": 900, "daily": 3500} }
          // Use daily rate for state comparison
          final d = (value['daily'] as num?)?.toDouble() ??
              (value['per_acre'] as num?)?.toDouble();
          if (d != null) statePricing[key.toString()] = d;
        }
      });
    }

    // Category: backend sends key like "land_preparation", display it nicely
    final rawCategory = json['category']?.toString() ?? '';
    final category = rawCategory
        .replaceAll('_', ' ')
        .split(' ')
        .map((w) => w.isEmpty ? '' : '${w[0].toUpperCase()}${w.substring(1)}')
        .join(' ');

    return EquipmentRentalRate(
      name: json['name']?.toString() ?? '',
      category: category,
      description: json['description']?.toString(),
      ratePerHour: hourlyRate,
      ratePerDay: dailyRate,
      unit: json['unit']?.toString(),
      statePricing: statePricing,
      imageUrl: json['image_url']?.toString(),
      features: (json['features'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          (json['popular_brands'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      available: json['available'] as bool? ??
          (json['availability']?.toString().toLowerCase() == 'high' ||
              json['availability']?.toString().toLowerCase() == 'medium' ||
              json['availability']?.toString().toLowerCase() == 'moderate'),
    );
  }
}
