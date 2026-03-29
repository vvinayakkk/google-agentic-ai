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

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
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
                              _data?['name']?.toString() ?? 'Gauri',
                              style: Theme.of(context).textTheme.titleLarge
                                  ?.copyWith(fontWeight: FontWeight.w800),
                            ),
                            Align(
                              alignment: Alignment.centerRight,
                              child: GlassIconButton(
                                icon: const Icon(Icons.edit, size: 18),
                                onPressed: () {},
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
                                      _data?['name']?.toString() ?? 'Gauri',
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleLarge
                                          ?.copyWith(
                                            fontWeight: FontWeight.w800,
                                          ),
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      '${_data?['breed'] ?? 'HF Cross'} • ${_data?['age_months'] != null ? '${(_data!['age_months'] / 12).floor()} yrs' : '4 years'}',
                                      style: context.textTheme.bodySmall
                                          ?.copyWith(
                                            color:
                                                context.appColors.textSecondary,
                                          ),
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(16),
                                  color: AppColors.success.withValues(
                                    alpha: 0.12,
                                  ),
                                ),
                                child: Text(
                                  'HEALTHY',
                                  style: context.textTheme.labelSmall?.copyWith(
                                    color: AppColors.success,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: AppSpacing.lg),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              _statBox(context, '12L/day', 'Milk'),
                              _statBox(context, '280kg', 'Weight'),
                              _statBox(context, 'Jan 2024', 'Tagged'),
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
            onPressed: () {},
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
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            value,
            style: context.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          label,
          style: context.textTheme.bodySmall?.copyWith(
            color: context.appColors.textSecondary,
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
