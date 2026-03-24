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
