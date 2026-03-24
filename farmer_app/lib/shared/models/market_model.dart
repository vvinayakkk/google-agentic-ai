class MarketPrice {
  final String priceId;
  final String cropName;
  final String? market;
  final String? state;
  final String? district;
  final double? minPrice;
  final double? maxPrice;
  final double? modalPrice;
  final String? unit;
  final DateTime? date;

  const MarketPrice({
    required this.priceId,
    required this.cropName,
    this.market,
    this.state,
    this.district,
    this.minPrice,
    this.maxPrice,
    this.modalPrice,
    this.unit,
    this.date,
  });

  factory MarketPrice.fromJson(Map<String, dynamic> json) => MarketPrice(
        priceId: json['price_id'] as String? ?? '',
        cropName: json['crop_name'] as String? ?? '',
        market: json['market'] as String?,
        state: json['state'] as String?,
        district: json['district'] as String?,
        minPrice: (json['min_price'] as num?)?.toDouble(),
        maxPrice: (json['max_price'] as num?)?.toDouble(),
        modalPrice: (json['modal_price'] as num?)?.toDouble(),
        unit: json['unit'] as String?,
        date: json['date'] != null
            ? DateTime.tryParse(json['date'] as String)
            : null,
      );
}

class MarketListing {
  final String listingId;
  final String farmerId;
  final String title;
  final String? description;
  final String category;
  final double price;
  final String? unit;
  final double? quantity;
  final String? status;
  final String? location;
  final List<String> images;
  final DateTime? createdAt;

  const MarketListing({
    required this.listingId,
    required this.farmerId,
    required this.title,
    this.description,
    required this.category,
    required this.price,
    this.unit,
    this.quantity,
    this.status,
    this.location,
    this.images = const [],
    this.createdAt,
  });

  factory MarketListing.fromJson(Map<String, dynamic> json) => MarketListing(
        listingId: json['listing_id'] as String? ?? '',
        farmerId: json['farmer_id'] as String? ?? '',
        title: json['title'] as String? ?? '',
        description: json['description'] as String?,
        category: json['category'] as String? ?? '',
        price: (json['price'] as num?)?.toDouble() ?? 0,
        unit: json['unit'] as String?,
        quantity: (json['quantity'] as num?)?.toDouble(),
        status: json['status'] as String?,
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
        'title': title,
        if (description != null) 'description': description,
        'category': category,
        'price': price,
        if (unit != null) 'unit': unit,
        if (quantity != null) 'quantity': quantity,
        if (location != null) 'location': location,
      };
}
