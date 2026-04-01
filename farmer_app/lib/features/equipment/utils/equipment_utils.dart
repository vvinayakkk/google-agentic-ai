import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/equipment_model.dart';

class _CategoryMeta {
  final Color color;
  final IconData icon;
  final String emoji;

  const _CategoryMeta({
    required this.color,
    required this.icon,
    required this.emoji,
  });
}

const Map<String, _CategoryMeta> _categoryMap = {
  'tractors': _CategoryMeta(color: AppColors.primaryDark, icon: Icons.agriculture, emoji: '🚜'),
  'harvesting': _CategoryMeta(color: AppColors.warning, icon: Icons.grass, emoji: '🌾'),
  'irrigation': _CategoryMeta(color: AppColors.info, icon: Icons.water_drop, emoji: '💧'),
  'sowing': _CategoryMeta(color: AppColors.success, icon: Icons.eco, emoji: '🌱'),
  'sowing_planting': _CategoryMeta(color: AppColors.success, icon: Icons.eco, emoji: '🌱'),
  'land_preparation': _CategoryMeta(color: AppColors.success, icon: Icons.terrain, emoji: '🌱'),
  'protection': _CategoryMeta(color: AppColors.accent, icon: Icons.shield_outlined, emoji: '🛡️'),
  'crop_protection': _CategoryMeta(color: AppColors.accent, icon: Icons.shield_outlined, emoji: '🛡️'),
  'transport': _CategoryMeta(color: AppColors.info, icon: Icons.local_shipping_outlined, emoji: '🚚'),
  'post_harvest': _CategoryMeta(color: AppColors.warning, icon: Icons.storefront_outlined, emoji: '🏪'),
  'cattle_equipment': _CategoryMeta(color: AppColors.primaryDark, icon: Icons.pets_outlined, emoji: '🐄'),
  'dairy_livestock': _CategoryMeta(color: AppColors.primaryDark, icon: Icons.pets_outlined, emoji: '🐄'),
  'precision_farming': _CategoryMeta(color: AppColors.accent, icon: Icons.gps_fixed, emoji: '🎯'),
};

const List<String> indianStates = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

String _normalizeCategory(String? category) {
  return (category ?? '').trim().toLowerCase();
}

Color categoryColor(String? category) {
  return _categoryMap[_normalizeCategory(category)]?.color ?? AppColors.primary;
}

IconData categoryIcon(String? category) {
  return _categoryMap[_normalizeCategory(category)]?.icon ?? Icons.agriculture;
}

String categoryEmoji(String? category) {
  return _categoryMap[_normalizeCategory(category)]?.emoji ?? '🚜';
}

String categoryDisplay(String? category) {
  final raw = (category ?? '').trim();
  if (raw.isEmpty) return 'Other';
  return raw
      .replaceAll('_', ' ')
      .split(' ')
      .map((e) => e.isEmpty ? e : '${e[0].toUpperCase()}${e.substring(1)}')
      .join(' ');
}

String rateDisplay(ProviderRates rates) {
  return rates.bestDisplay;
}

Widget availabilityBadge(String? availability, {bool compact = true}) {
  final value = (availability ?? '').trim().toLowerCase();
  Color color;
  String label;

  if (value.contains('high') || value == 'available') {
    color = AppColors.success;
    label = 'High';
  } else if (value.contains('medium') || value.contains('limited')) {
    color = AppColors.warning;
    label = 'Medium';
  } else if (value.contains('low')) {
    color = AppColors.danger;
    label = 'Low';
  } else {
    color = Colors.grey;
    label = 'Contact';
  }

  return Container(
    padding: EdgeInsets.symmetric(
      horizontal: compact ? AppSpacing.sm : AppSpacing.md,
      vertical: AppSpacing.xs,
    ),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.12),
      borderRadius: BorderRadius.circular(AppRadius.full),
      border: Border.all(color: color.withValues(alpha: 0.25)),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 6,
          height: 6,
          decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(8)),
        ),
        const SizedBox(width: AppSpacing.xs),
        Text(
          label,
          style: TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: compact ? 11 : 12,
            color: color,
          ),
        ),
      ],
    ),
  );
}
