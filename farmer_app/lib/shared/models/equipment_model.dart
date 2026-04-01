import 'package:intl/intl.dart';

class Equipment {
  final String equipmentId;
  final String ownerId;
  final String name;
  final String? description;
  final String? category;
  final double pricePerDay;
  final String? condition;
  final bool available;
  final String? location;
  final List<String> images;
  final DateTime? createdAt;

  const Equipment({
    required this.equipmentId,
    required this.ownerId,
    required this.name,
    this.description,
    this.category,
    required this.pricePerDay,
    this.condition,
    this.available = true,
    this.location,
    this.images = const [],
    this.createdAt,
  });

  factory Equipment.fromJson(Map<String, dynamic> json) => Equipment(
        equipmentId: json['equipment_id'] as String? ?? '',
        ownerId: json['owner_id'] as String? ?? '',
        name: json['name'] as String? ?? '',
        description: json['description'] as String?,
        category: json['category'] as String?,
        pricePerDay: (json['price_per_day'] as num?)?.toDouble() ?? 0,
        condition: json['condition'] as String?,
        available: json['available'] as bool? ?? true,
        location: json['location'] as String?,
        images: (json['images'] as List<dynamic>?)
                ?.map((e) => e.toString())
                .toList() ??
            [],
        createdAt: json['created_at'] != null
            ? DateTime.tryParse(json['created_at'] as String)
            : null,
      );

  Map<String, dynamic> toJson() => {
        'name': name,
        if (description != null) 'description': description,
        if (category != null) 'category': category,
        'price_per_day': pricePerDay,
        if (condition != null) 'condition': condition,
        'available': available,
        if (location != null) 'location': location,
      };
}

class Booking {
  final String bookingId;
  final String equipmentId;
  final String renterId;
  final String ownerId;
  final DateTime startDate;
  final DateTime endDate;
  final double totalPrice;
  final String status;
  final DateTime? createdAt;

  const Booking({
    required this.bookingId,
    required this.equipmentId,
    required this.renterId,
    required this.ownerId,
    required this.startDate,
    required this.endDate,
    required this.totalPrice,
    this.status = 'pending',
    this.createdAt,
  });

  factory Booking.fromJson(Map<String, dynamic> json) => Booking(
        bookingId: json['booking_id'] as String? ?? '',
        equipmentId: json['equipment_id'] as String? ?? '',
        renterId: json['renter_id'] as String? ?? '',
        ownerId: json['owner_id'] as String? ?? '',
        startDate: DateTime.parse(
            json['start_date'] as String? ?? DateTime.now().toIso8601String()),
        endDate: DateTime.parse(
            json['end_date'] as String? ?? DateTime.now().toIso8601String()),
        totalPrice: (json['total_price'] as num?)?.toDouble() ?? 0,
        status: json['status'] as String? ?? 'pending',
        createdAt: json['created_at'] != null
            ? DateTime.tryParse(json['created_at'] as String)
            : null,
      );
}

double? _asDouble(dynamic value) {
  if (value is num) return value.toDouble();
  final parsed = double.tryParse(value?.toString() ?? '');
  return parsed;
}

DateTime? _asDate(dynamic value) {
  return DateTime.tryParse(value?.toString() ?? '');
}

class RentalTicket {
  final String id;
  final String equipmentId;
  final String equipmentName;
  final String ownerId;
  final String renterId;
  final DateTime startDate;
  final DateTime endDate;
  final String message;
  final String status;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final DateTime? completedAt;

  const RentalTicket({
    required this.id,
    required this.equipmentId,
    required this.equipmentName,
    required this.ownerId,
    required this.renterId,
    required this.startDate,
    required this.endDate,
    required this.message,
    required this.status,
    this.createdAt,
    this.updatedAt,
    this.completedAt,
  });

  int get durationDays {
    final days = endDate.difference(startDate).inDays + 1;
    return days < 1 ? 1 : days;
  }

  bool get isActive => status.toLowerCase() == 'pending' || status.toLowerCase() == 'approved';
  bool get isPending => status.toLowerCase() == 'pending';
  bool get isApproved => status.toLowerCase() == 'approved';

  factory RentalTicket.fromJson(Map<String, dynamic> json) {
    return RentalTicket(
      id: (json['id'] ?? json['rental_id'] ?? json['booking_id'] ?? '').toString(),
      equipmentId: (json['equipment_id'] ?? '').toString(),
      equipmentName: (json['equipment_name'] ?? json['name'] ?? '').toString(),
      ownerId: (json['owner_id'] ?? '').toString(),
      renterId: (json['renter_id'] ?? '').toString(),
      startDate: _asDate(json['start_date']) ?? DateTime.now(),
      endDate: _asDate(json['end_date']) ?? DateTime.now(),
      message: (json['message'] ?? '').toString(),
      status: (json['status'] ?? 'pending').toString(),
      createdAt: _asDate(json['created_at']),
      updatedAt: _asDate(json['updated_at']),
      completedAt: _asDate(json['completed_at']),
    );
  }
}

class ProviderRates {
  final double? hourly;
  final double? daily;
  final double? perAcre;
  final double? perTrip;

  const ProviderRates({
    this.hourly,
    this.daily,
    this.perAcre,
    this.perTrip,
  });

  String get bestDisplay {
    final inr = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
    if (daily != null) return '${inr.format(daily)}/day';
    if (hourly != null) return '${inr.format(hourly)}/hr';
    if (perAcre != null) return '${inr.format(perAcre)}/acre';
    if (perTrip != null) return '${inr.format(perTrip)}/trip';
    return 'Contact';
  }

  factory ProviderRates.fromJson(Map<String, dynamic> json) {
    return ProviderRates(
      hourly: _asDouble(json['hourly'] ?? json['rate_hourly']),
      daily: _asDouble(json['daily'] ?? json['rate_daily']),
      perAcre: _asDouble(json['per_acre'] ?? json['rate_per_acre']),
      perTrip: _asDouble(json['per_trip'] ?? json['rate_per_trip']),
    );
  }
}

class ProviderInfo {
  final String name;
  final String contactPerson;
  final String phone;
  final String alternatePhone;
  final String whatsapp;
  final String workingHours;

  const ProviderInfo({
    required this.name,
    required this.contactPerson,
    required this.phone,
    required this.alternatePhone,
    required this.whatsapp,
    required this.workingHours,
  });

  factory ProviderInfo.fromJson(Map<String, dynamic> json) {
    return ProviderInfo(
      name: (json['name'] ?? json['provider_name'] ?? '').toString(),
      contactPerson: (json['contact_person'] ?? '').toString(),
      phone: (json['phone'] ?? json['provider_phone'] ?? json['contact_phone'] ?? '').toString(),
      alternatePhone: (json['alternate_phone'] ?? '').toString(),
      whatsapp: (json['whatsapp'] ?? '').toString(),
      workingHours: (json['working_hours'] ?? '').toString(),
    );
  }
}

class ProviderLocation {
  final String state;
  final String district;
  final String city;
  final String pincode;
  final String address;
  final double? serviceRadiusKm;

  const ProviderLocation({
    required this.state,
    required this.district,
    required this.city,
    required this.pincode,
    required this.address,
    this.serviceRadiusKm,
  });

  String get display {
    final parts = [city, district, state].where((e) => e.trim().isNotEmpty).toList();
    if (parts.isEmpty) return 'Location unavailable';
    return parts.join(', ');
  }

  factory ProviderLocation.fromJson(Map<String, dynamic> json) {
    return ProviderLocation(
      state: (json['state'] ?? '').toString(),
      district: (json['district'] ?? '').toString(),
      city: (json['city'] ?? '').toString(),
      pincode: (json['pincode'] ?? '').toString(),
      address: (json['address'] ?? '').toString(),
      serviceRadiusKm: _asDouble(json['service_radius_km']),
    );
  }
}

class EquipmentProvider {
  final String id;
  final String providerId;
  final String equipmentName;
  final String category;
  final ProviderRates rates;
  final ProviderInfo provider;
  final ProviderLocation location;
  final List<String> eligibility;
  final List<String> documentsRequired;
  final bool operatorIncluded;
  final bool fuelExtra;
  final String availability;
  final String seasonNote;
  final DateTime? lastVerifiedAt;
  final String sourceType;

  const EquipmentProvider({
    required this.id,
    required this.providerId,
    required this.equipmentName,
    required this.category,
    required this.rates,
    required this.provider,
    required this.location,
    required this.eligibility,
    required this.documentsRequired,
    required this.operatorIncluded,
    required this.fuelExtra,
    required this.availability,
    required this.seasonNote,
    required this.lastVerifiedAt,
    required this.sourceType,
  });

  factory EquipmentProvider.fromJson(Map<String, dynamic> json) {
    final ratesJson = (json['rates'] as Map?)?.cast<String, dynamic>() ?? json;
    final providerJson = (json['provider'] as Map?)?.cast<String, dynamic>() ?? json;
    final locationJson = (json['location'] as Map?)?.cast<String, dynamic>() ?? json;
    return EquipmentProvider(
      id: (json['id'] ?? json['rental_id'] ?? '').toString(),
      providerId: ((json['provider'] as Map?)?['provider_id'] ?? json['provider_id'] ?? '').toString(),
      equipmentName: (json['equipment'] ?? json['name'] ?? '').toString(),
      category: (json['category'] ?? '').toString(),
      rates: ProviderRates.fromJson(ratesJson),
      provider: ProviderInfo.fromJson(providerJson),
      location: ProviderLocation.fromJson(locationJson),
      eligibility: (json['eligibility'] as List?)?.map((e) => e.toString()).toList() ?? const [],
      documentsRequired:
          (json['documents_required'] as List?)?.map((e) => e.toString()).toList() ?? const [],
      operatorIncluded: json['operator_included'] == true,
      fuelExtra: json['fuel_extra'] == true,
      availability: (json['availability'] ?? '').toString(),
      seasonNote: (json['season_note'] ?? '').toString(),
      lastVerifiedAt: _asDate(json['last_verified_at']),
      sourceType: (json['source_type'] ?? '').toString(),
    );
  }
}

class RateSummary {
  final double? dailyMin;
  final double? dailyMax;
  final double? hourlyMin;
  final double? hourlyMax;

  const RateSummary({
    this.dailyMin,
    this.dailyMax,
    this.hourlyMin,
    this.hourlyMax,
  });

  factory RateSummary.fromJson(Map<String, dynamic> json) {
    return RateSummary(
      dailyMin: _asDouble(json['daily_min']),
      dailyMax: _asDouble(json['daily_max']),
      hourlyMin: _asDouble(json['hourly_min']),
      hourlyMax: _asDouble(json['hourly_max']),
    );
  }
}
