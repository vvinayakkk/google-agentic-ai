import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_overlay.dart';
import '../../../shared/services/livestock_service.dart';
import '../../weather/widgets/glass_widgets.dart';

class AnimalProfileScreen extends ConsumerStatefulWidget {
  final String livestockId;

  const AnimalProfileScreen({Key? key, required this.livestockId})
    : super(key: key);

  @override
  ConsumerState<AnimalProfileScreen> createState() =>
      _AnimalProfileScreenState();
}

class _AnimalProfileScreenState extends ConsumerState<AnimalProfileScreen> {
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _data;

  String _displayAnimalName(Map<String, dynamic>? data) {
    final name = data?['name']?.toString().trim();
    if (name != null && name.isNotEmpty) return name;

    final type = data?['animal_type']?.toString().trim();
    if (type != null && type.isNotEmpty) return type.capitalize;

    return 'Animal';
  }

  String _ageLabel(dynamic ageMonths) {
    final months = int.tryParse(ageMonths?.toString() ?? '');
    if (months == null || months <= 0) return 'Age not recorded';
    final years = months ~/ 12;
    final remMonths = months % 12;
    if (years <= 0) return '$months months';
    if (remMonths == 0) return '$years yrs';
    return '$years yrs $remMonths mo';
  }

  String _statusRaw(Map<String, dynamic>? data) {
    return data?['health_status']?.toString() ?? 'healthy';
  }

  String _statusLabel(String status) {
    return status
        .replaceAll('_', ' ')
        .split(' ')
        .map((word) => word.isEmpty ? word : word.capitalize)
        .join(' ');
  }

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'healthy':
        return AppColors.success;
      case 'sick':
        return AppColors.danger;
      case 'under_treatment':
        return AppColors.warning;
      default:
        return AppColors.info;
    }
  }

  String _milkStat(Map<String, dynamic>? data) {
    if (data == null) return '--';
    final direct = data['avg_milk_liters_per_day'] ?? data['milk_per_day'];
    final liters = double.tryParse(direct?.toString() ?? '');
    if (liters != null) return '${liters.toStringAsFixed(liters % 1 == 0 ? 0 : 1)}L/day';

    final trend = _extractMilk(data);
    if (trend.isNotEmpty) {
      final avg = trend.reduce((a, b) => a + b) / trend.length;
      return '${avg.toStringAsFixed(avg % 1 == 0 ? 0 : 1)}L/day';
    }
    return '--';
  }

  String _weightStat(Map<String, dynamic>? data) {
    if (data == null) return '--';
    final weight = double.tryParse(
      (data['weight_kg'] ?? data['weight']).toString(),
    );
    if (weight == null) return '--';
    return '${weight.toStringAsFixed(weight % 1 == 0 ? 0 : 1)}kg';
  }

  String _taggedStat(Map<String, dynamic>? data) {
    if (data == null) return '--';
    final raw = data['created_at'] ?? data['tagged_on'] ?? data['updated_at'];
    final dt = DateTime.tryParse(raw?.toString() ?? '');
    if (dt == null) return '--';
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '${months[dt.month - 1]} ${dt.year}';
  }

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ref
          .read(livestockServiceProvider)
          .getLivestockById(widget.livestockId);
      if (!mounted) return;
      setState(() {
        _data = res;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _showEditAnimalSheet() async {
    final data = _data ?? <String, dynamic>{};
    final nameCtrl = TextEditingController(text: data['name']?.toString() ?? '');
    final breedCtrl = TextEditingController(text: data['breed']?.toString() ?? '');
    final countCtrl = TextEditingController(
      text: (data['count'] ?? 1).toString(),
    );
    final ageCtrl = TextEditingController(
      text: (data['age_months'] ?? '').toString(),
    );
    String healthStatus = _statusRaw(data);
    bool saving = false;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(
            left: AppSpacing.lg,
            right: AppSpacing.lg,
            top: AppSpacing.lg,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + AppSpacing.lg,
          ),
          child: Container(
            decoration: BoxDecoration(
              color: context.appColors.card,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: context.appColors.border),
            ),
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                Text(
                  'Edit Animal Profile',
                  style: context.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Name',
                    prefixIcon: Icon(Icons.pets),
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                TextField(
                  controller: breedCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Breed',
                    prefixIcon: Icon(Icons.category),
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: countCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Count',
                          prefixIcon: Icon(Icons.numbers),
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: TextField(
                        controller: ageCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Age (months)',
                          prefixIcon: Icon(Icons.cake),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                DropdownButtonFormField<String>(
                  initialValue: healthStatus,
                  decoration: const InputDecoration(
                    labelText: 'Health Status',
                    prefixIcon: Icon(Icons.health_and_safety),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'healthy', child: Text('Healthy')),
                    DropdownMenuItem(
                      value: 'under_treatment',
                      child: Text('Under Treatment'),
                    ),
                    DropdownMenuItem(value: 'sick', child: Text('Sick')),
                  ],
                  onChanged: (value) {
                    if (value != null) {
                      setSheetState(() => healthStatus = value);
                    }
                  },
                ),
                const SizedBox(height: AppSpacing.lg),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: saving
                        ? null
                        : () async {
                            setSheetState(() => saving = true);
                            try {
                              await ref.read(livestockServiceProvider).updateLivestock(
                                widget.livestockId,
                                {
                                  'name': nameCtrl.text.trim(),
                                  'breed': breedCtrl.text.trim(),
                                  'count': int.tryParse(countCtrl.text.trim()) ?? 1,
                                  'age_months': int.tryParse(ageCtrl.text.trim()),
                                  'health_status': healthStatus,
                                },
                              );
                              if (ctx.mounted) Navigator.pop(ctx);
                              await _fetch();
                              if (mounted) {
                                context.showSnack('Animal profile updated');
                              }
                            } catch (e) {
                              if (ctx.mounted) {
                                setSheetState(() => saving = false);
                                ctx.showSnack(e.toString(), isError: true);
                              }
                            }
                          },
                    icon: const Icon(Icons.save),
                    label: Text(saving ? 'Saving...' : 'Save Changes'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ));
  }

  Future<void> _showAddHealthRecordSheet() async {
    final notesCtrl = TextEditingController();
    final milkCtrl = TextEditingController(text: _data?['milk_per_day']?.toString() ?? '');
    final weightCtrl = TextEditingController(text: _data?['weight_kg']?.toString() ?? '');
    String healthStatus = _statusRaw(_data);
    bool saving = false;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(
            left: AppSpacing.lg,
            right: AppSpacing.lg,
            top: AppSpacing.lg,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + AppSpacing.lg,
          ),
          child: Container(
            decoration: BoxDecoration(
              color: context.appColors.card,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: context.appColors.border),
            ),
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                Text(
                  'Add Health Record',
                  style: context.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                TextField(
                  controller: notesCtrl,
                  minLines: 3,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Health Notes',
                    hintText: 'Symptoms, treatment, observations...',
                    prefixIcon: Icon(Icons.note_alt_outlined),
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: milkCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Milk (L/day)',
                          prefixIcon: Icon(Icons.water_drop_outlined),
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: TextField(
                        controller: weightCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Weight (kg)',
                          prefixIcon: Icon(Icons.monitor_weight_outlined),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                DropdownButtonFormField<String>(
                  initialValue: healthStatus,
                  decoration: const InputDecoration(
                    labelText: 'Current Health Status',
                    prefixIcon: Icon(Icons.health_and_safety),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'healthy', child: Text('Healthy')),
                    DropdownMenuItem(
                      value: 'under_treatment',
                      child: Text('Under Treatment'),
                    ),
                    DropdownMenuItem(value: 'sick', child: Text('Sick')),
                  ],
                  onChanged: (value) {
                    if (value != null) {
                      setSheetState(() => healthStatus = value);
                    }
                  },
                ),
                const SizedBox(height: AppSpacing.lg),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: saving
                        ? null
                        : () async {
                            if (notesCtrl.text.trim().isEmpty &&
                                milkCtrl.text.trim().isEmpty &&
                                weightCtrl.text.trim().isEmpty) {
                              ctx.showSnack('Add at least one health detail', isError: true);
                              return;
                            }

                            final payload = <String, dynamic>{
                              'health_status': healthStatus,
                              if (notesCtrl.text.trim().isNotEmpty)
                                'health_notes': notesCtrl.text.trim(),
                              if (milkCtrl.text.trim().isNotEmpty)
                                'milk_per_day': double.tryParse(milkCtrl.text.trim()),
                              if (weightCtrl.text.trim().isNotEmpty)
                                'weight_kg': double.tryParse(weightCtrl.text.trim()),
                            };

                            setSheetState(() => saving = true);
                            try {
                              await ref
                                  .read(livestockServiceProvider)
                                  .updateLivestock(widget.livestockId, payload);
                              if (ctx.mounted) Navigator.pop(ctx);
                              await _fetch();
                              if (mounted) {
                                context.showSnack('Health record added');
                              }
                            } catch (e) {
                              if (ctx.mounted) {
                                setSheetState(() => saving = false);
                                ctx.showSnack(e.toString(), isError: true);
                              }
                            }
                          },
                    icon: const Icon(Icons.check_circle_outline),
                    label: Text(saving ? 'Saving...' : 'Save Health Record'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final animalName = _displayAnimalName(_data);
    final statusRaw = _statusRaw(_data);
    final statusColor = _statusColor(statusRaw);
    final breed = _data?['breed']?.toString();
    final ageText = _ageLabel(_data?['age_months']);

    return Scaffold(
      backgroundColor: isDark
          ? AppColors.darkBackground
          : AppColors.lightBackground,
      body: _loading
          ? const LoadingState(itemCount: 5)
          : _error != null
          ? ErrorView(message: _error!, onRetry: _fetch)
          : SafeArea(
              bottom: false,
              child: SingleChildScrollView(
                padding: AppSpacing.allLg,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Top bar
                    Padding(
                      padding: const EdgeInsets.fromLTRB(8, 6, 8, 0),
                      child: SizedBox(
                        height: 56,
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            Align(
                              alignment: Alignment.centerLeft,
                              child: GlassIconButton(
                                icon: const Icon(Icons.arrow_back, size: 20),
                                onPressed: () =>
                                    Navigator.of(context).maybePop(),
                              ),
                            ),
                            Text(
                              animalName,
                              style: Theme.of(context).textTheme.titleLarge
                                  ?.copyWith(fontWeight: FontWeight.w800),
                            ),
                            Align(
                              alignment: Alignment.centerRight,
                              child: GlassIconButton(
                                icon: const Icon(Icons.edit, size: 18),
                                onPressed: _showEditAnimalSheet,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // Hero card
                    GlassCard(
                      featured: true,
                      padding: const EdgeInsets.all(18),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              CircleAvatar(
                                radius: 32,
                                backgroundColor: AppColors.primary.withValues(
                                  alpha: 0.12,
                                ),
                                child: const Icon(
                                  Icons.pets,
                                  color: AppColors.primary,
                                  size: 32,
                                ),
                              ),
                              const SizedBox(width: AppSpacing.md),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      animalName,
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleLarge
                                          ?.copyWith(
                                            fontWeight: FontWeight.w800,
                                          ),
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      [
                                        if (breed != null && breed.isNotEmpty)
                                          breed,
                                        ageText,
                                      ].join(' • '),
                                      style: context.textTheme.bodySmall
                                          ?.copyWith(
                                            color:
                                                context.appColors.textSecondary,
                                          ),
                                    ),
                                  ],
                                ),
                              ),
                              ConstrainedBox(
                                constraints: const BoxConstraints(maxWidth: 120),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 6,
                                  ),
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(16),
                                    color: statusColor.withValues(
                                      alpha: 0.12,
                                    ),
                                  ),
                                  child: Text(
                                    _statusLabel(statusRaw).toUpperCase(),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: context.textTheme.labelSmall?.copyWith(
                                      color: statusColor,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: AppSpacing.lg),
                          Row(
                            children: [
                              Expanded(child: _statBox(context, _milkStat(_data), 'Milk')),
                              const SizedBox(width: AppSpacing.sm),
                              Expanded(child: _statBox(context, _weightStat(_data), 'Weight')),
                              const SizedBox(width: AppSpacing.sm),
                              Expanded(child: _statBox(context, _taggedStat(_data), 'Tagged')),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // Milk Production
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Milk Production',
                          style: context.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Text(
                          'LITRES / DAY',
                          style: context.textTheme.bodySmall?.copyWith(
                            color: context.appColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.md),
                    GlassCard(
                      child: _SimpleBarChart(values: _extractMilk(_data)),
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // Vaccination History
                    Row(
                      children: [
                        const Icon(
                          Icons.vaccines,
                          size: 18,
                          color: AppColors.primary,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Vaccination History',
                          style: context.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.md),
                    ..._buildVaccines(context, _data),
                    const SizedBox(height: AppSpacing.xl),

                    // Health Notes
                    Row(
                      children: [
                        const Icon(
                          Icons.note_alt,
                          size: 18,
                          color: AppColors.primary,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Health Notes',
                          style: context.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.md),
                    GlassCard(
                      child: Padding(
                        padding: const EdgeInsets.all(8.0),
                        child: Text(
                          _data?['health_notes']?.toString() ??
                              'Reduced appetite noted on 15 Mar. Vet consulted. Recommended increased green fodder and hydration monitoring.',
                          style: context.textTheme.bodyMedium?.copyWith(
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 80),
                  ],
                ),
              ),
            ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 12),
          child: ElevatedButton(
            onPressed: _showAddHealthRecordSheet,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(30),
              ),
            ),
            child: Text(
              '+ ADD HEALTH RECORD',
              style: context.textTheme.bodyLarge?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      ),
    );
  }

  List<double> _extractMilk(Map<String, dynamic>? data) {
    // try to read milk production series from data, else fallback sample
    if (data != null && data['milk_production'] is List) {
      return (data['milk_production'] as List)
          .map((e) => double.tryParse(e.toString()) ?? 0.0)
          .toList();
    }
    return [4, 5, 6, 5, 7, 6, 6];
  }

  Widget _statBox(BuildContext context, String value, String label) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(
            child: Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: context.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ),
        const SizedBox(height: 6),
        Center(
          child: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: context.textTheme.bodySmall?.copyWith(
              color: context.appColors.textSecondary,
            ),
          ),
        ),
      ],
    );
  }

  List<Widget> _buildVaccines(
    BuildContext context,
    Map<String, dynamic>? data,
  ) {
    final list = <Map<String, dynamic>>[];
    if (data != null && data['vaccination_history'] is List) {
      for (final v in data['vaccination_history'] as List) {
        if (v is Map<String, dynamic>) list.add(v);
      }
    }
    if (list.isEmpty) {
      list.addAll([
        {'name': 'FMD Vaccine', 'date': 'Jan 2026', 'status': 'done'},
        {'name': 'PPR Vaccine', 'date': 'Oct 2025', 'status': 'done'},
        {'name': 'FMD Booster', 'date': 'Apr 2026', 'status': 'upcoming'},
      ]);
    }

    return list.map((v) {
      final done = (v['status']?.toString() ?? '').toLowerCase() == 'done';
      return Padding(
        padding: const EdgeInsets.only(bottom: AppSpacing.md),
        child: GlassCard(
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      v['name']?.toString() ?? '',
                      style: context.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      v['date']?.toString() ?? '',
                      style: context.textTheme.bodySmall?.copyWith(
                        color: context.appColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              if (done)
                Container(
                  width: 36,
                  height: 36,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white,
                  ),
                  child: const Icon(Icons.check, color: AppColors.success),
                )
              else
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    color: AppColors.warning.withValues(alpha: 0.12),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.calendar_month,
                        size: 14,
                        color: AppColors.warning,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'UPCOMING',
                        style: context.textTheme.labelSmall?.copyWith(
                          color: AppColors.warning,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      );
    }).toList();
  }
}

class _SimpleBarChart extends StatelessWidget {
  final List<double> values;
  const _SimpleBarChart({Key? key, required this.values}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final max = values.isEmpty ? 1.0 : values.reduce((a, b) => a > b ? a : b);
    final labels = const ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    return SizedBox(
      height: 120,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: List.generate(7, (i) {
          final v = i < values.length ? values[i] : 0.0;
          final h = (v / (max == 0 ? 1 : max)) * 90 + 10;
          return Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Container(
                  height: h,
                  margin: const EdgeInsets.symmetric(horizontal: 6),
                  decoration: BoxDecoration(
                    color:
                        i ==
                            values.indexOf(
                              values.isNotEmpty
                                  ? values.reduce((a, b) => a > b ? a : b)
                                  : 0,
                            )
                        ? AppColors.primaryDark
                        : AppColors.primary,
                    borderRadius: BorderRadius.circular(6),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  labels[i],
                  style: context.textTheme.bodySmall?.copyWith(
                    color: context.appColors.textSecondary,
                  ),
                ),
              ],
            ),
          );
        }),
      ),
    );
  }
}
