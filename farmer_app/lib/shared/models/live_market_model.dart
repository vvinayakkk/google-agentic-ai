/// Models for live mandi prices from data.gov.in API.
library;

class LivePrice {
  final String commodity;
  final String state;
  final String district;
  final String market;
  final String variety;
  final double? minPrice;
  final double? maxPrice;
  final double? modalPrice;
  final String? arrivalDate;

  const LivePrice({
    required this.commodity,
    required this.state,
    required this.district,
    required this.market,
    this.variety = '',
    this.minPrice,
    this.maxPrice,
    this.modalPrice,
    this.arrivalDate,
  });

  factory LivePrice.fromJson(Map<String, dynamic> json) => LivePrice(
        commodity: json['commodity']?.toString() ?? '',
        state: json['state']?.toString() ?? '',
        district: json['district']?.toString() ?? '',
        market: json['market']?.toString() ?? '',
        variety: json['variety']?.toString() ?? '',
        minPrice: _toDouble(json['min_price']),
        maxPrice: _toDouble(json['max_price']),
        modalPrice: _toDouble(json['modal_price']),
        arrivalDate: json['arrival_date']?.toString(),
      );

  static double? _toDouble(dynamic v) {
    if (v == null) return null;
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString());
  }
}

class MspPrice {
  final String crop;
  final double price;
  final String unit;

  const MspPrice({
    required this.crop,
    required this.price,
    this.unit = '₹/quintal',
  });

  factory MspPrice.fromJson(String crop, dynamic price) => MspPrice(
        crop: crop,
        price: (price is num) ? price.toDouble() : 0,
      );
}
