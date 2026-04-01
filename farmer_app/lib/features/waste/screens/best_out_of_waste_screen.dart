import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/services/agent_service.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_text_field.dart';

class BestOutOfWasteScreen extends ConsumerStatefulWidget {
  const BestOutOfWasteScreen({super.key});

  @override
  ConsumerState<BestOutOfWasteScreen> createState() =>
      _BestOutOfWasteScreenState();
}

class _BestOutOfWasteScreenState extends ConsumerState<BestOutOfWasteScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final _queryController = TextEditingController();
  final _quantityController = TextEditingController();

  String _aiResponse = '';
  String _calcResult = '';
  bool _isLoadingAI = false;
  bool _isCalculating = false;
  String _selectedWaste = 'Crop Residue';
  String _selectedDisposal = 'Burning';

  final _wasteTypes = [
    'Crop Residue',
    'Animal Waste',
    'Plastic Waste',
    'Kitchen Waste',
    'Straw / Husk',
    'Fruit & Vegetable Waste',
  ];

  final _disposalMethods = ['Burning', 'Dumping', 'Burying', 'No disposal'];

  static const _categories = <_WasteCategory>[
    _WasteCategory(
      title: 'Composting',
      trKey: 'waste.composting',
      icon: Icons.eco,
      color: AppColors.success,
      steps: 5,
      tagline: 'Rich organic fertilizer from kitchen & farm waste',
      materials: 'Green waste, dry leaves, water, container/pit',
      costEstimate: '₹500 – ₹2,000',
      earningsEstimate: '₹3,000 – ₹8,000 / month',
      timeRequired: '45-60 days per batch',
      fullSteps: [
        'Collect green & brown organic waste separately',
        'Layer green and brown materials in a pit or bin (3:1 ratio)',
        'Maintain moisture at 50-60% — sprinkle water as needed',
        'Turn the pile every 7-10 days for aeration',
        'Harvest dark, crumbly compost after 45-60 days',
      ],
    ),
    _WasteCategory(
      title: 'Vermicomposting',
      trKey: 'waste.vermicomposting',
      icon: Icons.bug_report,
      color: AppColors.primary,
      steps: 6,
      tagline: 'Premium fertilizer using earthworms',
      materials: 'Earthworms (Eisenia fetida), cow dung, waste, shade net',
      costEstimate: '₹2,000 – ₹5,000',
      earningsEstimate: '₹8,000 – ₹15,000 / month',
      timeRequired: '30-45 days per batch',
      fullSteps: [
        'Prepare a shaded bed or concrete tank (6×3 ft)',
        'Add a base layer of cow dung mixed with soil',
        'Introduce 1-2 kg of earthworms per bed',
        'Add chopped organic waste in thin layers weekly',
        'Keep moist and covered; avoid direct sun',
        'Harvest vermicompost after 30-45 days by light separation',
      ],
    ),
    _WasteCategory(
      title: 'Biogas Production',
      trKey: 'waste.biogas',
      icon: Icons.local_fire_department,
      color: AppColors.warning,
      steps: 4,
      tagline: 'Clean cooking fuel from organic waste',
      materials: 'Biogas digester, cow dung / food waste, water',
      costEstimate: '₹15,000 – ₹40,000 (one-time)',
      earningsEstimate: 'Save ₹2,000 – ₹4,000 / month on LPG',
      timeRequired: '21 days for first gas output',
      fullSteps: [
        'Install a biogas digester (fixed-dome or floating type)',
        'Feed 25-40 kg cow dung mixed with equal water daily',
        'Collect biogas through outlet pipe for cooking / lighting',
        'Use slurry output as high-quality liquid fertilizer',
      ],
    ),
    _WasteCategory(
      title: 'Crop Residue Mgmt',
      trKey: 'waste.crop_residue',
      icon: Icons.grass,
      color: AppColors.info,
      steps: 5,
      tagline: 'Stop burning — earn from stubble instead',
      materials: 'Happy Seeder / shredder, decomposer spray',
      costEstimate: '₹1,000 – ₹3,000 per acre',
      earningsEstimate: '₹2,000 – ₹5,000 saved per acre',
      timeRequired: '15-20 days for decomposition',
      fullSteps: [
        'Shred crop residue using a machine or manually',
        'Spread evenly across the field',
        'Apply Pusa decomposer or similar bio-agent',
        'Irrigate lightly to maintain moisture',
        'Residue decomposes into soil-enriching humus in 15-20 days',
      ],
    ),
    _WasteCategory(
      title: 'Plastic Recycling',
      trKey: 'waste.categories',
      icon: Icons.recycling,
      color: AppColors.accent,
      steps: 3,
      tagline: 'Collect, sort & sell plastic for cash',
      materials: 'Collection bags, sorting area, local scrap dealer contact',
      costEstimate: '₹0 (just collection effort)',
      earningsEstimate: '₹5 – ₹20 per kg based on type',
      timeRequired: 'Ongoing collection',
      fullSteps: [
        'Collect and sort plastic by type (PET, HDPE, LDPE, PP)',
        'Clean and dry the sorted plastics',
        'Sell to registered recyclers or scrap dealers at ₹5-20/kg',
      ],
    ),
    _WasteCategory(
      title: 'Water Reuse',
      trKey: 'waste.categories',
      icon: Icons.water_drop,
      color: Color(0xFF0288D1),
      steps: 4,
      tagline: 'Recycle greywater for irrigation',
      materials: 'Filter tanks, gravel, sand, plants for wetland',
      costEstimate: '₹5,000 – ₹15,000',
      earningsEstimate: 'Save ₹1,500 – ₹3,000 / month on water',
      timeRequired: '3-5 days setup',
      fullSteps: [
        'Direct household greywater to a collection tank',
        'Filter through gravel → sand → charcoal layers',
        'Store filtered water in a secondary tank',
        'Use for irrigation, cleaning, or animal drinking',
      ],
    ),
    _WasteCategory(
      title: 'Animal Waste → Manure',
      trKey: 'waste.categories',
      icon: Icons.pets,
      color: Color(0xFF795548),
      steps: 3,
      tagline: 'Premium organic manure from livestock',
      materials: 'Covered pit, dry materials, microbial culture',
      costEstimate: '₹500 – ₹1,500',
      earningsEstimate: '₹2,000 – ₹6,000 / month',
      timeRequired: '20-30 days per batch',
      fullSteps: [
        'Collect animal dung and urine in a lined pit',
        'Mix with dry straw and microbial decomposer',
        'Cover and let decompose for 20-30 days; sell or use as manure',
      ],
    ),
    _WasteCategory(
      title: 'Mushroom from Straw',
      trKey: 'waste.categories',
      icon: Icons.spa,
      color: Color(0xFFE91E63),
      steps: 4,
      tagline: 'Grow oyster mushrooms on paddy straw',
      materials: 'Paddy straw, mushroom spawn, polythene bags',
      costEstimate: '₹3,000 – ₹8,000',
      earningsEstimate: '₹10,000 – ₹25,000 / month',
      timeRequired: '25-35 days to first harvest',
      fullSteps: [
        'Soak paddy straw in hot water (70°C) for 1-2 hours',
        'Layer straw and mushroom spawn in perforated poly bags',
        'Keep in a dark, humid room (25-30°C) for 15-20 days',
        'Harvest mushrooms in 3-4 flushes over the next 2 months',
      ],
    ),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _queryController.dispose();
    _quantityController.dispose();
    super.dispose();
  }

  // ── AI helpers ──────────────────────────────────────────────────────────

  Future<void> _askAI(String message) async {
    setState(() {
      _isLoadingAI = true;
      _aiResponse = '';
    });
    try {
      final lang = context.locale.languageCode;
      final res = await ref
          .read(agentServiceProvider)
          .chat(message: message, language: lang);
      setState(() => _aiResponse = res['response'] ?? '');
    } catch (_) {
      if (mounted) {
        context.showSnack('waste.error'.tr(), isError: true);
      }
    } finally {
      setState(() => _isLoadingAI = false);
    }
  }

  Future<void> _shareCalculation() async {
    if (_calcResult.trim().isEmpty) return;
    final text = [
      'Best Out Of Waste Analysis',
      'Waste Type: $_selectedWaste',
      'Current Disposal: $_selectedDisposal',
      '',
      _calcResult,
    ].join('\n');

    await SharePlus.instance.share(
      ShareParams(text: text),
    );
  }

  Future<void> _calculate() async {
    final qty = _quantityController.text.trim();
    if (qty.isEmpty) {
      context.showSnack('Please enter quantity', isError: true);
      return;
    }
    setState(() {
      _isCalculating = true;
      _calcResult = '';
    });
    try {
      final lang = context.locale.languageCode;
      final prompt =
          'I have $qty kg of $_selectedWaste. Currently I dispose by $_selectedDisposal. '
          'Estimate: 1) potential earnings from recycling, 2) cost savings vs current method, '
          '3) environmental impact (CO2 saved in kg, water saved in litres). '
          'Be specific with numbers. Use markdown formatting.';
      final res = await ref
          .read(agentServiceProvider)
          .chat(message: prompt, language: lang);
      setState(() => _calcResult = res['response'] ?? '');
    } catch (_) {
      if (mounted) {
        context.showSnack('waste.error'.tr(), isError: true);
      }
    } finally {
      setState(() => _isCalculating = false);
    }
  }

  // ── Build ───────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('waste.title'.tr()),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: context.appColors.textSecondary,
          indicatorColor: AppColors.primary,
          tabs: const [
            Tab(icon: Icon(Icons.lightbulb_outline), text: 'Waste Ideas'),
            Tab(icon: Icon(Icons.calculate_outlined), text: 'Calculator'),
            Tab(icon: Icon(Icons.smart_toy_outlined), text: 'Ask AI'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildIdeasTab(),
          _buildCalculatorTab(),
          _buildAskAITab(),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TAB 1 — Waste Ideas
  // ═══════════════════════════════════════════════════════════════════════

  Widget _buildIdeasTab() {
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        _heroBanner(),
        const SizedBox(height: AppSpacing.xl),
        Text('waste.categories'.tr(),
            style: context.textTheme.titleMedium
                ?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: AppSpacing.md),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _categories.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: AppSpacing.md,
            crossAxisSpacing: AppSpacing.md,
            childAspectRatio: 0.88,
          ),
          itemBuilder: (_, i) => _categoryCard(_categories[i]),
        ),
      ],
    );
  }

  Widget _heroBanner() {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.xl),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.primary, AppColors.primaryDark],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.auto_awesome, color: Colors.white, size: 28),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text('Turn Waste into Wealth',
                    style: context.textTheme.titleLarge?.copyWith(
                        color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text('waste.subtitle'.tr(),
              style: context.textTheme.bodyMedium
                  ?.copyWith(color: Colors.white.withValues(alpha: 0.85))),
          const SizedBox(height: AppSpacing.lg),
          Row(
            children: [
              _statChip(Icons.currency_rupee, '₹25K+', 'Earning\nPotential'),
              const SizedBox(width: AppSpacing.md),
              _statChip(Icons.eco, '8', 'Recycling\nMethods'),
              const SizedBox(width: AppSpacing.md),
              _statChip(Icons.co2, '~60%', 'CO₂\nReduced'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _statChip(IconData icon, String value, String label) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(
            vertical: AppSpacing.sm, horizontal: AppSpacing.xs),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.18),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(icon, color: Colors.white, size: 20),
            const SizedBox(height: 2),
            Text(value,
                style: context.textTheme.titleSmall?.copyWith(
                    color: Colors.white, fontWeight: FontWeight.bold)),
            Text(label,
                textAlign: TextAlign.center,
                style: context.textTheme.labelSmall
                    ?.copyWith(color: Colors.white.withValues(alpha: 0.8))),
          ],
        ),
      ),
    );
  }

  Widget _categoryCard(_WasteCategory cat) {
    return AppCard(
      onTap: () => _showCategorySheet(cat),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: cat.color.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(cat.icon, color: cat.color, size: 32),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(cat.title,
              textAlign: TextAlign.center,
              style: context.textTheme.titleSmall
                  ?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm, vertical: 2),
            decoration: BoxDecoration(
              color: cat.color.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text('${cat.steps} Steps',
                style: context.textTheme.labelSmall
                    ?.copyWith(color: cat.color, fontWeight: FontWeight.w600)),
          ),
          const SizedBox(height: 4),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
            child: Text(cat.tagline,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: context.textTheme.bodySmall
                    ?.copyWith(color: context.appColors.textSecondary)),
          ),
        ],
      ),
    );
  }

  void _showCategorySheet(_WasteCategory cat) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.75,
        maxChildSize: 0.92,
        minChildSize: 0.4,
        builder: (ctx, scroll) => Container(
          decoration: BoxDecoration(
            color: context.theme.scaffoldBackgroundColor,
            borderRadius:
                const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: ListView(
            controller: scroll,
            padding: const EdgeInsets.all(AppSpacing.xl),
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: AppSpacing.lg),
                  decoration: BoxDecoration(
                    color: context.appColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: cat.color.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(cat.icon, color: cat.color, size: 28),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(cat.title,
                            style: context.textTheme.titleLarge
                                ?.copyWith(fontWeight: FontWeight.bold)),
                        Text(cat.tagline,
                            style: context.textTheme.bodySmall?.copyWith(
                                color: context.appColors.textSecondary)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xl),
              _sheetInfoRow(Icons.timer_outlined, 'Time Required',
                  cat.timeRequired),
              _sheetInfoRow(
                  Icons.shopping_bag_outlined, 'Materials', cat.materials),
              _sheetInfoRow(Icons.payments_outlined, 'Estimated Cost',
                  cat.costEstimate),
              _sheetInfoRow(Icons.trending_up, 'Potential Earnings',
                  cat.earningsEstimate),
              const SizedBox(height: AppSpacing.lg),
              Text('Steps',
                  style: context.textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: AppSpacing.sm),
              ...cat.fullSteps.asMap().entries.map((e) => Padding(
                    padding:
                        const EdgeInsets.only(bottom: AppSpacing.sm),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        CircleAvatar(
                            radius: 14,
                            backgroundColor:
                                cat.color.withValues(alpha: 0.12),
                            child: Text('${e.key + 1}',
                                style: context.textTheme.labelSmall
                                    ?.copyWith(
                                        color: cat.color,
                                        fontWeight: FontWeight.bold))),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          child: Text(e.value,
                              style: context.textTheme.bodyMedium),
                        ),
                      ],
                    ),
                  )),
              const SizedBox(height: AppSpacing.xl),
              AppButton(
                label: 'waste.get_ai_advice'.tr(),
                icon: Icons.smart_toy_outlined,
                onPressed: () {
                  Navigator.pop(context);
                  _tabController.animateTo(2);
                  _queryController.text =
                      'Tell me more about ${cat.title} for farmers — detailed steps, tips, and expected income.';
                  _askAI(_queryController.text);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _sheetInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Row(
        children: [
          Icon(icon, size: 20, color: context.appColors.textSecondary),
          const SizedBox(width: AppSpacing.sm),
          Text('$label: ',
              style: context.textTheme.bodyMedium
                  ?.copyWith(fontWeight: FontWeight.w600)),
          Expanded(
              child:
                  Text(value, style: context.textTheme.bodyMedium)),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TAB 2 — Calculator
  // ═══════════════════════════════════════════════════════════════════════

  Widget _buildCalculatorTab() {
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        Text('Waste-to-Wealth Calculator',
            style: context.textTheme.titleMedium
                ?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: AppSpacing.xs),
        Text('Estimate your earnings & environmental impact',
            style: context.textTheme.bodySmall
                ?.copyWith(color: context.appColors.textSecondary)),
        const SizedBox(height: AppSpacing.xl),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Type of Waste',
                  style: context.textTheme.labelLarge
                      ?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: AppSpacing.sm),
              DropdownButtonFormField<String>(
                initialValue: _selectedWaste,
                decoration: InputDecoration(
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.md, vertical: AppSpacing.md),
                ),
                items: _wasteTypes
                    .map((w) => DropdownMenuItem(value: w, child: Text(w)))
                    .toList(),
                onChanged: (v) => setState(() => _selectedWaste = v!),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text('Quantity (kg)',
                  style: context.textTheme.labelLarge
                      ?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: AppSpacing.sm),
              AppTextField(
                hint: 'e.g. 100',
                controller: _quantityController,
                prefixIcon: Icons.scale,
              ),
              const SizedBox(height: AppSpacing.lg),
              Text('Current Disposal Method',
                  style: context.textTheme.labelLarge
                      ?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: AppSpacing.sm),
              DropdownButtonFormField<String>(
                initialValue: _selectedDisposal,
                decoration: InputDecoration(
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.md, vertical: AppSpacing.md),
                ),
                items: _disposalMethods
                    .map((m) => DropdownMenuItem(value: m, child: Text(m)))
                    .toList(),
                onChanged: (v) => setState(() => _selectedDisposal = v!),
              ),
              const SizedBox(height: AppSpacing.xl),
              AppButton(
                label: 'Calculate',
                icon: Icons.calculate,
                isLoading: _isCalculating,
                onPressed: _isCalculating ? null : _calculate,
                width: double.infinity,
              ),
            ],
          ),
        ),
        if (_calcResult.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.xl),
          Row(
            children: [
              _metricCard(Icons.payments_outlined, 'Current Method',
                  _selectedDisposal, AppColors.danger),
              const SizedBox(width: AppSpacing.md),
              _metricCard(Icons.trending_up, 'Potential', 'Recycling',
                  AppColors.success),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.insights,
                        color: AppColors.primary, size: 20),
                    const SizedBox(width: AppSpacing.sm),
                    Text('AI Analysis',
                        style: context.textTheme.titleSmall
                            ?.copyWith(fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                MarkdownBody(data: _calcResult),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          AppButton(
            label: 'Share Results',
            icon: Icons.share,
            onPressed: _shareCalculation,
            width: double.infinity,
          ),
        ],
      ],
    );
  }

  Widget _metricCard(
      IconData icon, String label, String value, Color color) {
    return Expanded(
      child: AppCard(
        color: color.withValues(alpha: 0.08),
        child: Column(
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: AppSpacing.sm),
            Text(label,
                style: context.textTheme.labelSmall
                    ?.copyWith(color: context.appColors.textSecondary)),
            const SizedBox(height: 2),
            Text(value,
                style: context.textTheme.titleSmall
                    ?.copyWith(color: color, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TAB 3 — Ask AI
  // ═══════════════════════════════════════════════════════════════════════

  Widget _buildAskAITab() {
    final suggestions = [
      'Best compost for rice fields?',
      'How to start biogas cheaply?',
      'Sell vermicompost?',
      'Plastic alternatives?',
      'Government subsidies for waste?',
      'Convert cow dung to income?',
    ];

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        Text('waste.recycling_tips'.tr(),
            style: context.textTheme.titleMedium
                ?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: AppSpacing.md),
        Wrap(
          spacing: AppSpacing.sm,
          runSpacing: AppSpacing.sm,
          children: suggestions
              .map((q) => ActionChip(
                    avatar: const Icon(Icons.lightbulb_outline, size: 16),
                    label: Text(q, style: context.textTheme.labelMedium),
                    backgroundColor:
                        AppColors.primary.withValues(alpha: 0.08),
                    side: BorderSide.none,
                    onPressed: () {
                      _queryController.text = q;
                      _askAI(q);
                    },
                  ))
              .toList(),
        ),
        const SizedBox(height: AppSpacing.xl),
        AppTextField(
          hint: 'Ask any waste recycling question…',
          controller: _queryController,
          maxLines: 2,
          prefixIcon: Icons.search,
        ),
        const SizedBox(height: AppSpacing.md),
        AppButton(
          label: 'waste.get_ai_advice'.tr(),
          icon: Icons.send,
          isLoading: _isLoadingAI,
          onPressed: _isLoadingAI
              ? null
              : () {
                  final q = _queryController.text.trim();
                  if (q.isEmpty) return;
                  _askAI(q);
                },
          width: double.infinity,
        ),
        if (_isLoadingAI)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: AppSpacing.xl),
            child: Center(child: CircularProgressIndicator()),
          ),
        if (_aiResponse.isNotEmpty && !_isLoadingAI) ...[
          const SizedBox(height: AppSpacing.xl),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.smart_toy,
                        color: AppColors.primary, size: 20),
                    const SizedBox(width: AppSpacing.sm),
                    Text('AI Response',
                        style: context.textTheme.titleSmall
                            ?.copyWith(fontWeight: FontWeight.bold)),
                  ],
                ),
                const Divider(height: AppSpacing.xl),
                MarkdownBody(data: _aiResponse),
              ],
            ),
          ),
        ],
        const SizedBox(height: AppSpacing.xxl),
        Text('Quick Tips',
            style: context.textTheme.titleMedium
                ?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: AppSpacing.md),
        _tipCard(Icons.compost, 'Start Small',
            'Begin composting with just kitchen waste — no investment needed.'),
        _tipCard(Icons.groups, 'Group Effort',
            'Form a farmer group to share biogas setup costs and earn together.'),
        _tipCard(Icons.sell, 'Sell Smart',
            'Vermicompost sells at ₹8-15/kg — premium over regular compost.'),
        _tipCard(Icons.volunteer_activism, 'Government Help',
            'Check GOBARDHAN & Swachh Bharat schemes for subsidies up to 60%.'),
      ],
    );
  }

  Widget _tipCard(IconData icon, String title, String description) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: AppCard(
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: AppColors.primary, size: 24),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: context.textTheme.titleSmall
                          ?.copyWith(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 2),
                  Text(description,
                      style: context.textTheme.bodySmall?.copyWith(
                          color: context.appColors.textSecondary)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Data model
// ═══════════════════════════════════════════════════════════════════════════

class _WasteCategory {
  final String title;
  final String trKey;
  final IconData icon;
  final Color color;
  final int steps;
  final String tagline;
  final String materials;
  final String costEstimate;
  final String earningsEstimate;
  final String timeRequired;
  final List<String> fullSteps;

  const _WasteCategory({
    required this.title,
    required this.trKey,
    required this.icon,
    required this.color,
    required this.steps,
    required this.tagline,
    required this.materials,
    required this.costEstimate,
    required this.earningsEstimate,
    required this.timeRequired,
    required this.fullSteps,
  });
}
