import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/services/agent_service.dart';
import '../../../shared/services/crop_service.dart';
import '../../../shared/services/farmer_service.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/detail_card.dart';
import '../../../shared/widgets/error_view.dart';


class FarmVisualizerScreen extends ConsumerStatefulWidget {
  const FarmVisualizerScreen({super.key});

  @override
  ConsumerState<FarmVisualizerScreen> createState() =>
      _FarmVisualizerScreenState();
}

class _FarmVisualizerScreenState extends ConsumerState<FarmVisualizerScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  Map<String, dynamic> _profile = {};
  List<Map<String, dynamic>> _crops = [];
  bool _isLoading = true;
  String? _error;

  // AI Insights state
  bool _isAiLoading = false;
  String _aiResponse = '';
  final TextEditingController _questionController = TextEditingController();

  // Farm health score
  double _healthScore = 0;
  bool _healthLoading = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadFarmData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _questionController.dispose();
    super.dispose();
  }

  Future<void> _loadFarmData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        ref.read(farmerServiceProvider).getMyProfile(),
        ref.read(cropServiceProvider).listCrops(),
      ]);
      setState(() {
        _profile = results[0] as Map<String, dynamic>;
        _crops = List<Map<String, dynamic>>.from(results[1] as List);
        _isLoading = false;
      });
      _fetchHealthScore();
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _fetchHealthScore() async {
    setState(() => _healthLoading = true);
    try {
      final cropNames =
          _crops.map((c) => c['cropName'] ?? c['crop_name'] ?? '').join(', ');
      final res = await ref.read(agentServiceProvider).chat(
            message:
                'Rate this farm health 0-100 as a single number only. Crops: $cropNames, Total area: $_totalAcres acres, Location: $_location. Reply ONLY with a number.',
            language: 'en',
          );
      final raw = (res['response'] ?? '75').toString().replaceAll(
            RegExp(r'[^0-9.]'),
            '',
          );
      setState(() {
        _healthScore = double.tryParse(raw) ?? 75;
        if (_healthScore > 100) _healthScore = 100;
        _healthLoading = false;
      });
    } catch (_) {
      setState(() {
        _healthScore = 75;
        _healthLoading = false;
      });
    }
  }

  Future<void> _askAi(String prompt) async {
    setState(() {
      _isAiLoading = true;
      _aiResponse = '';
    });
    try {
      final cropInfo = _crops
          .map((c) =>
              '${c['cropName'] ?? c['crop_name'] ?? 'Unknown'} (${c['area'] ?? c['acres'] ?? '?'} acres)')
          .join(', ');
      final fullPrompt =
          '$prompt\n\nFarmer: ${_profile['name'] ?? 'Farmer'}, Location: $_location, Crops: $cropInfo, Total area: $_totalAcres acres.';
      final res = await ref.read(agentServiceProvider).chat(
            message: fullPrompt,
            language: 'en',
          );
      setState(() {
        _aiResponse = res['response']?.toString() ?? 'No response received.';
        _isAiLoading = false;
      });
    } catch (e) {
      setState(() {
        _aiResponse = 'Error: $e';
        _isAiLoading = false;
      });
    }
  }

  double get _totalAcres {
    double total = 0;
    for (final c in _crops) {
      total += double.tryParse('${c['area'] ?? c['acres'] ?? 0}') ?? 0;
    }
    if (total == 0) {
      total = double.tryParse('${_profile['totalAcres'] ?? _profile['total_acres'] ?? 0}') ?? 0;
    }
    return total;
  }

  String get _location {
    return _profile['location'] ??
        _profile['village'] ??
        _profile['district'] ??
        'common.unknown'.tr();
  }

  String get _currentSeason {
    final month = DateTime.now().month;
    if (month >= 6 && month <= 10) return 'Kharif';
    if (month >= 11 || month <= 2) return 'Rabi';
    return 'Zaid';
  }

  String get _weatherSummary {
    final month = DateTime.now().month;
    if (month >= 6 && month <= 9) {
      return 'Monsoon season — expect moderate to heavy rainfall. Ideal for Kharif crops.';
    }
    if (month >= 10 && month <= 11) {
      return 'Post-monsoon — decreasing rainfall, cooler nights. Prepare for Rabi sowing.';
    }
    if (month >= 12 || month <= 2) {
      return 'Winter season — cool, dry weather. Good conditions for Rabi crop growth.';
    }
    return 'Pre-monsoon — rising temperatures, occasional showers. Zaid crop window.';
  }

  Color _colorForCrop(int index) {
    const palette = [
      AppColors.primary,
      AppColors.info,
      AppColors.warning,
      AppColors.accent,
      AppColors.success,
      AppColors.danger,
      Color(0xFF8B5CF6),
      Color(0xFFF59E0B),
      Color(0xFF06B6D4),
      Color(0xFFEC4899),
    ];
    return palette[index % palette.length];
  }

  // ──────────────────── BUILD ────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('farm_viz.title'.tr()),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: context.appColors.textSecondary,
          indicatorColor: AppColors.primary,
          tabs: const [
            Tab(icon: Icon(Icons.dashboard_rounded), text: 'Overview'),
            Tab(icon: Icon(Icons.grass_rounded), text: 'My Fields'),
            Tab(icon: Icon(Icons.auto_awesome), text: 'AI Insights'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _error != null
              ? ErrorView(message: _error!, onRetry: _loadFarmData)
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildOverviewTab(),
                    _buildFieldsTab(),
                    _buildAiInsightsTab(),
                  ],
                ),
      floatingActionButton: _tabController.index == 1
          ? FloatingActionButton(
              backgroundColor: AppColors.primary,
              onPressed: () =>
                  context.showSnack('Coming soon — add via profile'),
              child: const Icon(Icons.add, color: Colors.white),
            )
          : null,
    );
  }

  // ══════════════════════════════════════════════
  //  TAB 1 — Overview
  // ══════════════════════════════════════════════

  Widget _buildOverviewTab() {
    final name = _profile['name'] ?? 'Farmer';
    final fieldCount = _crops.length;

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: _loadFarmData,
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          // Farm Overview Card
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 26,
                      backgroundColor: AppColors.primary.withValues(alpha: 0.12),
                      child: const Icon(Icons.agriculture, color: AppColors.primary, size: 28),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(name, style: context.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              Icon(Icons.location_on, size: 14, color: context.appColors.textSecondary),
                              const SizedBox(width: 4),
                              Flexible(
                                child: Text(_location, style: context.textTheme.bodySmall?.copyWith(color: context.appColors.textSecondary)),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                Row(
                  children: [
                    Expanded(
                      child: DetailCard(
                        label: 'farm_viz.total_area'.tr(),
                        value: '${_totalAcres.toStringAsFixed(1)} ${'profile.acres'.tr()}',
                        icon: Icons.square_foot,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: DetailCard(
                        label: 'Fields',
                        value: '$fieldCount',
                        icon: Icons.grid_view_rounded,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // Farm Health Score
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Farm Health Score', style: context.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                const SizedBox(height: AppSpacing.md),
                Center(
                  child: _healthLoading
                      ? const SizedBox(
                          width: 80,
                          height: 80,
                          child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 3),
                        )
                      : SizedBox(
                          width: 100,
                          height: 100,
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              SizedBox(
                                width: 100,
                                height: 100,
                                child: CircularProgressIndicator(
                                  value: _healthScore / 100,
                                  strokeWidth: 10,
                                  backgroundColor: context.appColors.border,
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                    _healthScore >= 70
                                        ? AppColors.success
                                        : _healthScore >= 40
                                            ? AppColors.warning
                                            : AppColors.danger,
                                  ),
                                ),
                              ),
                              Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    '${_healthScore.toInt()}',
                                    style: context.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                                  ),
                                  Text('/100', style: context.textTheme.bodySmall?.copyWith(color: context.appColors.textSecondary)),
                                ],
                              ),
                            ],
                          ),
                        ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Center(
                  child: Text(
                    _healthScore >= 70
                        ? 'Your farm is in great shape!'
                        : _healthScore >= 40
                            ? 'Room for improvement'
                            : 'Needs attention',
                    style: context.textTheme.bodySmall?.copyWith(color: context.appColors.textSecondary),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // Quick Stats Row
          Text('Quick Stats', style: context.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: AppSpacing.sm),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: AppSpacing.sm,
            crossAxisSpacing: AppSpacing.sm,
            childAspectRatio: 1.6,
            children: [
              MetricCard(
                label: 'farm_viz.total_area'.tr(),
                value: '${_totalAcres.toStringAsFixed(1)} ac',
                icon: Icons.square_foot,
                color: AppColors.primary,
              ),
              MetricCard(
                label: 'Active Crops',
                value: '${_crops.where((c) => (c['status'] ?? 'ongoing').toString().toLowerCase() != 'completed').length}',
                icon: Icons.eco_rounded,
                color: AppColors.success,
              ),
              MetricCard(
                label: 'Avg Yield Potential',
                value: _crops.isEmpty ? 'N/A' : 'Good',
                icon: Icons.trending_up,
                color: AppColors.info,
              ),
              MetricCard(
                label: 'Water Usage',
                value: _currentSeason == 'Kharif' ? 'Rain-fed' : 'Irrigated',
                icon: Icons.water_drop,
                color: AppColors.accent,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),

          // Season Indicator
          AppCard(
            color: AppColors.primary.withValues(alpha: 0.08),
            child: Row(
              children: [
                const Icon(Icons.calendar_month, color: AppColors.primary),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Current Season: $_currentSeason',
                        style: context.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600, color: AppColors.primaryDark),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _currentSeason == 'Kharif'
                            ? 'June – October • Monsoon crops'
                            : _currentSeason == 'Rabi'
                                ? 'November – March • Winter crops'
                                : 'March – June • Summer crops',
                        style: context.textTheme.bodySmall?.copyWith(color: context.appColors.textSecondary),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // Weather Summary
          AppCard(
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  decoration: BoxDecoration(
                    color: AppColors.info.withValues(alpha: 0.12),
                    borderRadius: AppRadius.mdAll,
                  ),
                  child: const Icon(Icons.wb_cloudy_rounded, color: AppColors.info, size: 28),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Weather Outlook', style: context.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 4),
                      Text(_weatherSummary, style: context.textTheme.bodySmall?.copyWith(color: context.appColors.textSecondary)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xxl),
        ],
      ),
    );
  }

  // ══════════════════════════════════════════════
  //  TAB 2 — My Fields
  // ══════════════════════════════════════════════

  Widget _buildFieldsTab() {
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        // Map Visualization Placeholder
        Text('farm_viz.farm_map'.tr(), style: context.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: AppSpacing.sm),
        ClipRRect(
          borderRadius: AppRadius.lgAll,
          child: Container(
            height: 200,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  AppColors.primary.withValues(alpha: 0.15),
                  AppColors.success.withValues(alpha: 0.25),
                  AppColors.primary.withValues(alpha: 0.10),
                ],
              ),
              borderRadius: AppRadius.lgAll,
              border: Border.all(color: context.appColors.border),
            ),
            child: Stack(
              children: [
                CustomPaint(size: const Size(double.infinity, 200), painter: _GridPainter(color: context.appColors.border)),
                Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.map_rounded, size: 40, color: AppColors.primary.withValues(alpha: 0.6)),
                      const SizedBox(height: AppSpacing.sm),
                      Text('farm_viz.satellite_view'.tr(), style: context.textTheme.bodySmall?.copyWith(color: context.appColors.textSecondary)),
                      Text('${_crops.length} fields • $_totalAcres ${'profile.acres'.tr()}', style: context.textTheme.bodySmall?.copyWith(color: context.appColors.textSecondary)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.xl),

        // Crop Distribution
        if (_crops.isNotEmpty) ...[
          Text('farm_viz.crop_comparison'.tr(), style: context.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: AppSpacing.sm),
          AppCard(
            child: Column(
              children: List.generate(_crops.length, (i) {
                final crop = _crops[i];
                final cropName = crop['cropName'] ?? crop['crop_name'] ?? 'common.unknown'.tr();
                final area = double.tryParse('${crop['area'] ?? crop['acres'] ?? 0}') ?? 0;
                final maxArea = _totalAcres > 0 ? _totalAcres : 1.0;
                final fraction = (area / maxArea).clamp(0.0, 1.0);
                final color = _colorForCrop(i);

                return Padding(
                  padding: EdgeInsets.only(bottom: i < _crops.length - 1 ? AppSpacing.md : 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(cropName, style: context.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w500)),
                          Text('${area.toStringAsFixed(1)} ac', style: context.textTheme.bodySmall?.copyWith(color: context.appColors.textSecondary)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      ClipRRect(
                        borderRadius: AppRadius.smAll,
                        child: LinearProgressIndicator(
                          value: fraction,
                          minHeight: 10,
                          backgroundColor: color.withValues(alpha: 0.12),
                          valueColor: AlwaysStoppedAnimation<Color>(color),
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
        ],

        // Field List
        Text('farm_viz.my_fields'.tr(), style: context.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: AppSpacing.sm),
        if (_crops.isEmpty)
          Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.xxxl),
              child: Column(
                children: [
                  Icon(Icons.grass_rounded, size: 56, color: context.appColors.textSecondary.withValues(alpha: 0.4)),
                  const SizedBox(height: AppSpacing.md),
                  Text('farm_viz.no_fields'.tr(), style: context.textTheme.bodyMedium?.copyWith(color: context.appColors.textSecondary)),
                ],
              ),
            ),
          )
        else
          ...List.generate(_crops.length, (i) => _buildFieldCard(i)),
        const SizedBox(height: AppSpacing.xxxl),
      ],
    );
  }

  Widget _buildFieldCard(int index) {
    final crop = _crops[index];
    final cropName = crop['cropName'] ?? crop['crop_name'] ?? 'common.unknown'.tr();
    final area = crop['area'] ?? crop['acres'] ?? '—';
    final season = crop['season'] ?? _currentSeason;
    final sowingDate = crop['sowingDate'] ?? crop['sowing_date'] ?? '—';
    final status = (crop['status'] ?? 'ongoing').toString().toLowerCase();
    final isCompleted = status == 'completed';
    final color = _colorForCrop(index);

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: AppCard(
        onTap: () => _showFieldDetailSheet(index),
        child: Row(
          children: [
            Container(
              width: 4,
              height: 72,
              decoration: BoxDecoration(color: color, borderRadius: AppRadius.smAll),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(cropName, style: context.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 2),
                        decoration: BoxDecoration(
                          color: (isCompleted ? AppColors.success : AppColors.primary).withValues(alpha: 0.12),
                          borderRadius: AppRadius.smAll,
                        ),
                        child: Text(
                          isCompleted ? 'crop_cycle.completed'.tr() : 'crop_cycle.ongoing'.tr(),
                          style: context.textTheme.labelSmall?.copyWith(
                            color: isCompleted ? AppColors.success : AppColors.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '$area ${'profile.acres'.tr()} • $season',
                    style: context.textTheme.bodySmall?.copyWith(color: context.appColors.textSecondary),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${'crop_cycle.sowing_date'.tr()}: $sowingDate',
                    style: context.textTheme.bodySmall?.copyWith(color: context.appColors.textSecondary),
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: context.appColors.textSecondary),
          ],
        ),
      ),
    );
  }

  void _showFieldDetailSheet(int index) {
    final crop = _crops[index];
    final cropName = crop['cropName'] ?? crop['crop_name'] ?? 'common.unknown'.tr();
    final area = crop['area'] ?? crop['acres'] ?? '—';
    final season = crop['season'] ?? _currentSeason;
    final sowingDate = crop['sowingDate'] ?? crop['sowing_date'] ?? '—';
    final harvestDate = crop['harvestDate'] ?? crop['harvest_date'] ?? '—';
    final status = (crop['status'] ?? 'ongoing').toString().toLowerCase();
    final isCompleted = status == 'completed';
    final color = _colorForCrop(index);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: context.appColors.card,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.55,
        minChildSize: 0.35,
        maxChildSize: 0.85,
        expand: false,
        builder: (_, scrollController) => ListView(
          controller: scrollController,
          padding: const EdgeInsets.all(AppSpacing.xl),
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: AppSpacing.lg),
                decoration: BoxDecoration(color: context.appColors.border, borderRadius: AppRadius.fullAll),
              ),
            ),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: AppRadius.mdAll),
                  child: Icon(Icons.grass_rounded, color: color, size: 28),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(cropName, style: context.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 2),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 2),
                        decoration: BoxDecoration(
                          color: (isCompleted ? AppColors.success : AppColors.primary).withValues(alpha: 0.12),
                          borderRadius: AppRadius.smAll,
                        ),
                        child: Text(
                          isCompleted ? 'crop_cycle.completed'.tr() : 'crop_cycle.ongoing'.tr(),
                          style: context.textTheme.labelSmall?.copyWith(
                            color: isCompleted ? AppColors.success : AppColors.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xl),
            Row(
              children: [
                Expanded(child: DetailCard(label: 'Area', value: '$area ${'profile.acres'.tr()}', icon: Icons.square_foot)),
                const SizedBox(width: AppSpacing.sm),
                Expanded(child: DetailCard(label: 'Season', value: season, icon: Icons.calendar_month)),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                Expanded(child: DetailCard(label: 'crop_cycle.sowing_date'.tr(), value: '$sowingDate', icon: Icons.event)),
                const SizedBox(width: AppSpacing.sm),
                Expanded(child: DetailCard(label: 'Harvest', value: '$harvestDate', icon: Icons.event_available)),
              ],
            ),
            const SizedBox(height: AppSpacing.xl),
            AppButton(
              label: 'Get AI Analysis',
              icon: Icons.auto_awesome,
              onPressed: () {
                Navigator.pop(ctx);
                _tabController.animateTo(2);
                _askAi(
                  'Give a detailed analysis and recommendations for my $cropName field — $area acres, sown on $sowingDate, season $season. Include soil tips, yield forecast, and pest recommendations.',
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  // ══════════════════════════════════════════════
  //  TAB 3 — AI Insights
  // ══════════════════════════════════════════════

  Widget _buildAiInsightsTab() {
    final prompts = [
      _AiPrompt('Crop Rotation Plan', Icons.rotate_right, AppColors.success,
          'Create an optimal crop rotation plan for my farm considering soil health and profitability.'),
      _AiPrompt('Yield Improvement', Icons.trending_up, AppColors.primary,
          'Give me detailed, actionable tips to improve my crop yield this season.'),
      _AiPrompt('Soil Health Analysis', Icons.landscape, AppColors.warning,
          'Analyze the soil health of my farm and suggest improvements and fertilizer recommendations.'),
      _AiPrompt('Water Management', Icons.water_drop, AppColors.info,
          'Provide a water management strategy including irrigation scheduling and water conservation tips.'),
      _AiPrompt('Pest & Disease Alert', Icons.bug_report, AppColors.danger,
          'What pests and diseases should I watch out for this season? Provide prevention and treatment strategies.'),
      _AiPrompt('Market Price Forecast', Icons.trending_up, AppColors.accent,
          'Forecast the market prices for my crops and suggest the best time to sell for maximum profit.'),
    ];

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        Text('Farm Intelligence', style: context.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 4),
        Text(
          'Get AI-powered insights tailored to your farm',
          style: context.textTheme.bodySmall?.copyWith(color: context.appColors.textSecondary),
        ),
        const SizedBox(height: AppSpacing.lg),

        // Prompt Grid
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: AppSpacing.sm,
          crossAxisSpacing: AppSpacing.sm,
          childAspectRatio: 1.55,
          children: prompts
              .map((p) => _buildPromptCard(p.label, p.icon, p.color, p.prompt))
              .toList(),
        ),
        const SizedBox(height: AppSpacing.xl),

        // Custom question
        Text('Ask a Question', style: context.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: AppSpacing.sm),
        Row(
          children: [
            Expanded(
              child: AppTextField(
                controller: _questionController,
                hint: 'E.g. When should I harvest my wheat?',
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            IconButton(
              onPressed: _isAiLoading
                  ? null
                  : () {
                      final q = _questionController.text.trim();
                      if (q.isNotEmpty) {
                        _askAi(q);
                        _questionController.clear();
                      }
                    },
              icon: const Icon(Icons.send_rounded, color: AppColors.primary),
              style: IconButton.styleFrom(
                backgroundColor: AppColors.primary.withValues(alpha: 0.12),
                padding: const EdgeInsets.all(AppSpacing.md),
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.xl),

        // AI Response
        if (_isAiLoading)
          const Center(
            child: Padding(
              padding: EdgeInsets.symmetric(vertical: AppSpacing.xxl),
              child: Column(
                children: [
                  CircularProgressIndicator(color: AppColors.primary),
                  SizedBox(height: AppSpacing.md),
                  Text('Thinking...'),
                ],
              ),
            ),
          )
        else if (_aiResponse.isNotEmpty) ...[
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.auto_awesome, size: 18, color: AppColors.primary),
                    const SizedBox(width: AppSpacing.sm),
                    Text('AI Analysis', style: context.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                    const Spacer(),
                    IconButton(
                      onPressed: () => setState(() => _aiResponse = ''),
                      icon: Icon(Icons.close, size: 18, color: context.appColors.textSecondary),
                      constraints: const BoxConstraints(),
                      padding: EdgeInsets.zero,
                    ),
                  ],
                ),
                const Divider(height: AppSpacing.xl),
                MarkdownBody(data: _aiResponse),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          AppButton(
            label: 'Download Report',
            icon: Icons.download_rounded,
            onPressed: () => context.showSnack('Coming soon'),
          ),
        ],
        const SizedBox(height: AppSpacing.xxxl),
      ],
    );
  }

  Widget _buildPromptCard(String label, IconData icon, Color color, String prompt) {
    return InkWell(
      onTap: _isAiLoading ? null : () => _askAi(prompt),
      borderRadius: AppRadius.mdAll,
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: AppRadius.mdAll,
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: AppRadius.smAll,
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              label,
              textAlign: TextAlign.center,
              style: context.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600, color: color),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════
//  Helper models & painters
// ══════════════════════════════════════════════

class _AiPrompt {
  final String label;
  final IconData icon;
  final Color color;
  final String prompt;

  const _AiPrompt(this.label, this.icon, this.color, this.prompt);
}

class _GridPainter extends CustomPainter {
  final Color color;
  _GridPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color.withValues(alpha: 0.25)
      ..strokeWidth = 0.5;

    const step = 20.0;
    for (double x = 0; x <= size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y <= size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant _GridPainter oldDelegate) => oldDelegate.color != color;
}
