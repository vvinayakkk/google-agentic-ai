import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shimmer/shimmer.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/app_cache.dart';
import '../../../shared/services/equipment_service.dart';
import '../../../shared/models/equipment_rental_model.dart';

/// Browse equipment rental rates across 10 categories with state-wise pricing.
class EquipmentRentalRatesScreen extends ConsumerStatefulWidget {
  const EquipmentRentalRatesScreen({super.key});

  @override
  ConsumerState<EquipmentRentalRatesScreen> createState() =>
      _EquipmentRentalRatesScreenState();
}

class _EquipmentRentalRatesScreenState
    extends ConsumerState<EquipmentRentalRatesScreen> {
  List<EquipmentRentalRate> _allRates = [];
  List<EquipmentRentalRate> _filteredRates = [];
  List<String> _categories = [];
  String? _selectedCategory;
  bool _loading = true;
  final _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);

    // Try cache
    final cachedRates = await AppCache.get('equipment_rental_rates');
    final cachedCats = await AppCache.get('equipment_rental_categories');
    if (cachedRates != null && cachedCats != null) {
      final rates = (cachedRates as List)
          .map((e) =>
              EquipmentRentalRate.fromJson(Map<String, dynamic>.from(e)))
          .toList();
      final cats = (cachedCats as List).cast<String>();
      if (!mounted) return;
      setState(() {
        _allRates = rates;
        _filteredRates = rates;
        _categories = cats;
        _loading = false;
      });
      return;
    }

    try {
      final svc = ref.read(equipmentServiceProvider);
      final results = await Future.wait([
        svc.listRentalRates(),
        svc.listRentalCategories(),
      ]);

      final rates = (results[0] as List<Map<String, dynamic>>)
          .map((e) => EquipmentRentalRate.fromJson(e))
          .toList();
      final cats = results[1] as List<String>;

      await AppCache.put('equipment_rental_rates', results[0],
          ttlSeconds: 3600);
      await AppCache.put('equipment_rental_categories', cats,
          ttlSeconds: 86400);

      if (mounted) {
        setState(() {
          _allRates = rates;
          _filteredRates = rates;
          _categories = cats;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  void _filterByCategory(String? category) {
    Haptics.selection();
    setState(() {
      _selectedCategory = category;
      _applyFilters();
    });
  }

  void _filterBySearch(String query) {
    setState(() => _applyFilters());
  }

  void _applyFilters() {
    var filtered = _allRates;
    if (_selectedCategory != null) {
      filtered = filtered
          .where((r) =>
              r.category.toLowerCase() ==
              _selectedCategory!.toLowerCase())
          .toList();
    }
    final q = _searchCtrl.text.trim().toLowerCase();
    if (q.isNotEmpty) {
      filtered = filtered
          .where((r) =>
              r.name.toLowerCase().contains(q) ||
              r.category.toLowerCase().contains(q) ||
              (r.description?.toLowerCase().contains(q) ?? false))
          .toList();
    }
    _filteredRates = filtered;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final isDark = context.isDark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        title: const Text('Equipment Rental Rates'),
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? [AppColors.darkBackground, AppColors.darkSurface]
                : [AppColors.lightBackground, AppColors.lightSurface],
          ),
        ),
        child: Column(
          children: [
            // Search bar
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: TextField(
                controller: _searchCtrl,
                decoration: InputDecoration(
                  hintText: 'Search equipment...',
                  prefixIcon: const Icon(Icons.search),
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12)),
                  isDense: true,
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
                onChanged: _filterBySearch,
              ),
            ),

            // Category chips
            SizedBox(
              height: 44,
              child: _loading
                  ? const Center(child: LinearProgressIndicator())
                  : ListView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: FilterChip(
                            label: const Text('All'),
                            selected: _selectedCategory == null,
                            onSelected: (_) {
                              Haptics.light();
                              _filterByCategory(null);
                            },
                          ),
                        ),
                        ..._categories.map(
                          (cat) => Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: FilterChip(
                              label: Text(cat),
                              selected: _selectedCategory == cat,
                              onSelected: (_) => _filterByCategory(cat),
                            ),
                          ),
                        ),
                      ],
                    ),
            ),

            const Divider(height: 1),

            // Equipment list
            Expanded(
              child: _loading
                  ? _buildShimmer()
                  : _filteredRates.isEmpty
                      ? _buildEmpty(theme)
                      : RefreshIndicator(
                          onRefresh: _loadData,
                          child: ListView.builder(
                            padding: const EdgeInsets.all(12),
                            itemCount: _filteredRates.length,
                            itemBuilder: (ctx, idx) =>
                                _buildEquipmentCard(
                                    _filteredRates[idx], idx, theme, cs),
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildShimmer() {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: 8,
        itemBuilder: (_, _) => Container(
          height: 100,
          margin: const EdgeInsets.only(bottom: 10),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }

  Widget _buildEmpty(ThemeData theme) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.agriculture, size: 64, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text('No equipment found', style: theme.textTheme.bodyLarge),
        ],
      ),
    );
  }

  Widget _buildEquipmentCard(
      EquipmentRentalRate equip, int idx, ThemeData theme, ColorScheme cs) {
    final icon = _categoryIcon(equip.category);
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ExpansionTile(
        leading: CircleAvatar(
          backgroundColor: cs.primaryContainer,
          child: Icon(icon, color: cs.onPrimaryContainer),
        ),
        title: Text(equip.name,
            style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(equip.category,
                style: TextStyle(color: Colors.grey[600], fontSize: 12)),
            const SizedBox(height: 4),
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: cs.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '₹${equip.ratePerHour.toStringAsFixed(0)}/hr',
                    style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: cs.primary,
                        fontSize: 13),
                  ),
                ),
                if (equip.ratePerDay != null) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.green.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '₹${equip.ratePerDay!.toStringAsFixed(0)}/day',
                      style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.green,
                          fontSize: 13),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
        children: [
          if (equip.description != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: Text(equip.description!,
                  style: theme.textTheme.bodySmall),
            ),
          if (equip.features.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: Wrap(
                spacing: 6,
                runSpacing: 4,
                children: equip.features
                    .map((f) => Chip(
                          label: Text(f, style: const TextStyle(fontSize: 11)),
                          visualDensity: VisualDensity.compact,
                        ))
                    .toList(),
              ),
            ),
          if (equip.statePricing.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 4),
              child: Text('State-wise Pricing (₹/hr)',
                  style: theme.textTheme.titleSmall),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Wrap(
                spacing: 8,
                runSpacing: 4,
                children: equip.statePricing.entries.map((e) {
                  return Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text('${e.key}: ₹${e.value.toStringAsFixed(0)}',
                        style: const TextStyle(fontSize: 12)),
                  );
                }).toList(),
              ),
            ),
          ],
        ],
      ),
    ).animate().fadeIn(delay: (20 * idx).ms, duration: 200.ms);
  }

  IconData _categoryIcon(String category) {
    switch (category.toLowerCase()) {
      case 'tractor':
      case 'tractors':
        return Icons.agriculture;
      case 'harvester':
      case 'harvesters':
        return Icons.grass;
      case 'irrigation':
        return Icons.water_drop;
      case 'drone':
      case 'drones':
        return Icons.flight;
      case 'sprayer':
      case 'sprayers':
        return Icons.blur_on;
      case 'seeder':
      case 'seeders':
        return Icons.eco;
      case 'solar':
        return Icons.solar_power;
      case 'processing':
        return Icons.precision_manufacturing;
      case 'protected_cultivation':
        return Icons.house;
      default:
        return Icons.build;
    }
  }
}
