class FarmerProfile {
  final String farmerId;
  final String userId;
  final String name;
  final String phone;
  final String? village;
  final String? district;
  final String? state;
  final String? pincode;
  final double? latitude;
  final double? longitude;
  final double? landSize;
  final String? landUnit;
  final List<String> crops;
  final String? soilType;
  final String? irrigationType;
  final String? preferredLanguage;
  final DateTime? createdAt;

  const FarmerProfile({
    required this.farmerId,
    required this.userId,
    required this.name,
    required this.phone,
    this.village,
    this.district,
    this.state,
    this.pincode,
    this.latitude,
    this.longitude,
    this.landSize,
    this.landUnit,
    this.crops = const [],
    this.soilType,
    this.irrigationType,
    this.preferredLanguage,
    this.createdAt,
  });

  factory FarmerProfile.fromJson(Map<String, dynamic> json) => FarmerProfile(
        farmerId: json['farmer_id'] as String? ?? '',
        userId: json['user_id'] as String? ?? '',
        name: json['name'] as String? ?? '',
        phone: json['phone'] as String? ?? '',
        village: json['village'] as String?,
        district: json['district'] as String?,
        state: json['state'] as String?,
        pincode: json['pincode'] as String?,
        latitude: (json['latitude'] as num?)?.toDouble(),
        longitude: (json['longitude'] as num?)?.toDouble(),
        landSize: (json['land_size'] as num?)?.toDouble(),
        landUnit: json['land_unit'] as String?,
        crops: (json['crops'] as List<dynamic>?)
                ?.map((e) => e.toString())
                .toList() ??
            [],
        soilType: json['soil_type'] as String?,
        irrigationType: json['irrigation_type'] as String?,
        preferredLanguage: json['preferred_language'] as String?,
        createdAt: json['created_at'] != null
            ? DateTime.tryParse(json['created_at'] as String)
            : null,
      );

  Map<String, dynamic> toJson() => {
        'farmer_id': farmerId,
        'user_id': userId,
        'name': name,
        'phone': phone,
        if (village != null) 'village': village,
        if (district != null) 'district': district,
        if (state != null) 'state': state,
        if (pincode != null) 'pincode': pincode,
        if (latitude != null) 'latitude': latitude,
        if (longitude != null) 'longitude': longitude,
        if (landSize != null) 'land_size': landSize,
        if (landUnit != null) 'land_unit': landUnit,
        'crops': crops,
        if (soilType != null) 'soil_type': soilType,
        if (irrigationType != null) 'irrigation_type': irrigationType,
        if (preferredLanguage != null) 'preferred_language': preferredLanguage,
      };

  FarmerProfile copyWith({
    String? name,
    String? village,
    String? district,
    String? state,
    String? pincode,
    double? landSize,
    String? landUnit,
    List<String>? crops,
    String? soilType,
    String? irrigationType,
    String? preferredLanguage,
  }) =>
      FarmerProfile(
        farmerId: farmerId,
        userId: userId,
        name: name ?? this.name,
        phone: phone,
        village: village ?? this.village,
        district: district ?? this.district,
        state: state ?? this.state,
        pincode: pincode ?? this.pincode,
        latitude: latitude,
        longitude: longitude,
        landSize: landSize ?? this.landSize,
        landUnit: landUnit ?? this.landUnit,
        crops: crops ?? this.crops,
        soilType: soilType ?? this.soilType,
        irrigationType: irrigationType ?? this.irrigationType,
        preferredLanguage: preferredLanguage ?? this.preferredLanguage,
        createdAt: createdAt,
      );
}
