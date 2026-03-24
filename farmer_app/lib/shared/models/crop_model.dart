class CropModel {
  final String cropId;
  final String name;
  final String? season;
  final String? category;
  final double? minTemp;
  final double? maxTemp;
  final String? waterRequirement;
  final String? soilType;
  final int? growingPeriodDays;
  final String? description;

  const CropModel({
    required this.cropId,
    required this.name,
    this.season,
    this.category,
    this.minTemp,
    this.maxTemp,
    this.waterRequirement,
    this.soilType,
    this.growingPeriodDays,
    this.description,
  });

  factory CropModel.fromJson(Map<String, dynamic> json) => CropModel(
        cropId: json['crop_id'] as String? ?? '',
        name: json['name'] as String? ?? '',
        season: json['season'] as String?,
        category: json['category'] as String?,
        minTemp: (json['min_temp'] as num?)?.toDouble(),
        maxTemp: (json['max_temp'] as num?)?.toDouble(),
        waterRequirement: json['water_requirement'] as String?,
        soilType: json['soil_type'] as String?,
        growingPeriodDays: json['growing_period_days'] as int?,
        description: json['description'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'crop_id': cropId,
        'name': name,
        if (season != null) 'season': season,
        if (category != null) 'category': category,
        if (minTemp != null) 'min_temp': minTemp,
        if (maxTemp != null) 'max_temp': maxTemp,
        if (waterRequirement != null) 'water_requirement': waterRequirement,
        if (soilType != null) 'soil_type': soilType,
        if (growingPeriodDays != null) 'growing_period_days': growingPeriodDays,
        if (description != null) 'description': description,
      };
}

class CropCycle {
  final String cycleId;
  final String cropName;
  final String farmerId;
  final String? status;
  final DateTime? sowingDate;
  final DateTime? expectedHarvest;
  final List<CropStage> stages;
  final DateTime? createdAt;

  const CropCycle({
    required this.cycleId,
    required this.cropName,
    required this.farmerId,
    this.status,
    this.sowingDate,
    this.expectedHarvest,
    this.stages = const [],
    this.createdAt,
  });

  factory CropCycle.fromJson(Map<String, dynamic> json) => CropCycle(
        cycleId: json['cycle_id'] as String? ?? '',
        cropName: json['crop_name'] as String? ?? '',
        farmerId: json['farmer_id'] as String? ?? '',
        status: json['status'] as String?,
        sowingDate: json['sowing_date'] != null
            ? DateTime.tryParse(json['sowing_date'] as String)
            : null,
        expectedHarvest: json['expected_harvest'] != null
            ? DateTime.tryParse(json['expected_harvest'] as String)
            : null,
        stages: (json['stages'] as List<dynamic>?)
                ?.map((e) => CropStage.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        createdAt: json['created_at'] != null
            ? DateTime.tryParse(json['created_at'] as String)
            : null,
      );
}

class CropStage {
  final String name;
  final String? status;
  final DateTime? date;
  final String? notes;

  const CropStage({
    required this.name,
    this.status,
    this.date,
    this.notes,
  });

  factory CropStage.fromJson(Map<String, dynamic> json) => CropStage(
        name: json['name'] as String? ?? '',
        status: json['status'] as String?,
        date: json['date'] != null
            ? DateTime.tryParse(json['date'] as String)
            : null,
        notes: json['notes'] as String?,
      );
}
