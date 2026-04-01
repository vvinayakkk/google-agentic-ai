import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/services/agent_service.dart';
import '../../../shared/services/ai_overview_service.dart';
import '../../../shared/services/crop_service.dart';
import '../../../shared/services/market_service.dart';
import '../../../shared/services/personalization_service.dart';

class BestOutOfWasteScreen extends ConsumerStatefulWidget {
  const BestOutOfWasteScreen({super.key});

  @override
  ConsumerState<BestOutOfWasteScreen> createState() =>
      _BestOutOfWasteScreenState();
}

class _BestOutOfWasteScreenState extends ConsumerState<BestOutOfWasteScreen> {
  final TextEditingController _quantityController = TextEditingController();

  bool _loading = true;
  bool _aiOverviewLoading = false;
  bool _impactLoading = false;
  String? _loadError;

  Map<String, dynamic> _profile = <String, dynamic>{};
  List<String> _activeCrops = <String>[];
  List<_WasteStream> _streams = const <_WasteStream>[];
  List<_QuickTask> _quickTasks = const <_QuickTask>[];
  Set<String> _completedTaskIds = <String>{};

  List<Map<String, dynamic>> _allSchemes = <Map<String, dynamic>>[];
  List<Map<String, dynamic>> _spotlightSchemes = <Map<String, dynamic>>[];

  String _overviewSummary =
      'Generate your AI summary to see the best waste-to-wealth options for today.';
  String _overviewDetails =
      'This uses your profile, crop records, and nearby policy context.';
  DateTime? _overviewUpdatedAt;

  String _selectedWasteType = 'Crop Residue to Compost';
  String _selectedDisposal = 'Burning';
  _ImpactMetrics? _impact;
  String _impactAiExplanation = '';

  String _languageCode = 'en';

  static const List<String> _disposalMethods = <String>[
    'Burning',
    'Open dumping',
    'Landfill',
    'No processing',
  ];

  @override
  void initState() {
    super.initState();
    _bootstrap();
    _loadCachedOverview();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final localeCode = context.locale.languageCode.toLowerCase();
    if (_languageCode == localeCode) return;
    _languageCode = localeCode;
    final rebuiltTasks = _buildQuickTasksForToday(
      profile: _profile,
      activeCrops: _activeCrops,
      streams: _streams,
    );
    setState(() {
      _quickTasks = rebuiltTasks;
    });
  }

  @override
  void dispose() {
    _quantityController.dispose();
    super.dispose();
  }

  Future<void> _bootstrap({bool forceRefresh = false}) async {
    if (!mounted) return;
    setState(() {
      _loading = true;
      _loadError = null;
    });

    try {
      final personalization = ref.read(personalizationServiceProvider);
      final profile = await personalization.getProfileContext();

      final cropRows = await _safeCropRows(forceRefresh: forceRefresh);
      final activeCrops = _collectActiveCrops(profile, cropRows);

      final stateFilter = (profile['state'] ?? '').toString().trim();
      final schemesPayload = await _safeSchemePayload(
        stateFilter: stateFilter,
        forceRefresh: forceRefresh,
      );
      final schemeItems = _extractSchemeItems(schemesPayload);

      final streams = _buildPersonalizedStreams(
        profile: profile,
        activeCrops: activeCrops,
      );
      final quickTasks = _buildQuickTasksForToday(
        profile: profile,
        activeCrops: activeCrops,
        streams: streams,
      );
      final completed = await _readTaskProgress(profile, quickTasks);

      final spotlight = _pickSpotlightSchemes(
        schemes: schemeItems,
        profile: profile,
        activeCrops: activeCrops,
      );

      if (!mounted) return;
      setState(() {
        _profile = profile;
        _activeCrops = activeCrops;
        _streams = streams;
        _quickTasks = quickTasks;
        _completedTaskIds = completed;
        _allSchemes = schemeItems;
        _spotlightSchemes = spotlight;
        _loading = false;

        if (!_wasteTypeOptions.contains(_selectedWasteType)) {
          _selectedWasteType = _wasteTypeOptions.first;
        }
      });

      if (_overviewUpdatedAt == null) {
        await _generateAiOverview(forceRefresh: false);
      }
    } catch (_) {
      if (!mounted) return;
      final fallbackStreams = _buildPersonalizedStreams(
        profile: const <String, dynamic>{},
        activeCrops: const <String>[],
      );
      final fallbackTasks = _buildQuickTasksForToday(
        profile: const <String, dynamic>{},
        activeCrops: const <String>[],
        streams: fallbackStreams,
      );
      setState(() {
        _streams = fallbackStreams;
        _quickTasks = fallbackTasks;
        _allSchemes = const <Map<String, dynamic>>[];
        _spotlightSchemes = const <Map<String, dynamic>>[];
        _selectedWasteType = _wasteTypeOptions.first;
        _loadError =
            'Could not fully sync profile data right now. Showing resilient fallback plans.';
        _loading = false;
      });
    }
  }

  Future<void> _loadCachedOverview() async {
    final cached = await ref
        .read(aiOverviewServiceProvider)
        .getCached('waste_economy_overview_v1');
    if (cached == null || !mounted) return;
    setState(() {
      _overviewSummary = _normalizeAiSummary(cached.summary);
      _overviewDetails = _normalizeAiDetails(cached.details);
      _overviewUpdatedAt = cached.updatedAt;
    });
  }

  Future<List<Map<String, dynamic>>> _safeCropRows({
    required bool forceRefresh,
  }) async {
    try {
      return await ref
          .read(cropServiceProvider)
          .listCrops(forceRefresh: forceRefresh, preferCache: !forceRefresh);
    } catch (_) {
      return const <Map<String, dynamic>>[];
    }
  }

  Future<Map<String, dynamic>> _safeSchemePayload({
    required String stateFilter,
    required bool forceRefresh,
  }) async {
    try {
      return await ref
          .read(marketServiceProvider)
          .listSchemes(
            state: stateFilter.isEmpty ? null : stateFilter,
            isActive: true,
            perPage: 80,
            forceRefresh: forceRefresh,
            preferCache: !forceRefresh,
          );
    } catch (_) {
      return <String, dynamic>{'items': <dynamic>[]};
    }
  }

  List<Map<String, dynamic>> _extractSchemeItems(Map<String, dynamic> payload) {
    final raw = payload['items'];
    if (raw is! List) return <Map<String, dynamic>>[];
    return raw
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList(growable: false);
  }

  List<String> _collectActiveCrops(
    Map<String, dynamic> profile,
    List<Map<String, dynamic>> cropRows,
  ) {
    final items = <String>[];

    final fromProfile = profile['crops'];
    if (fromProfile is List) {
      items.addAll(
        fromProfile.map((e) => e.toString().trim()).where((e) => e.isNotEmpty),
      );
    }

    for (final row in cropRows) {
      final name = (row['name'] ?? row['crop_name'] ?? row['crop'] ?? '')
          .toString()
          .trim();
      if (name.isNotEmpty) items.add(name);
    }

    final unique = <String>[];
    final seen = <String>{};
    for (final crop in items) {
      final key = crop.toLowerCase();
      if (seen.add(key)) unique.add(crop);
    }

    return unique;
  }

  List<_WasteStream> _buildPersonalizedStreams({
    required Map<String, dynamic> profile,
    required List<String> activeCrops,
  }) {
    final acres =
        _toDouble(
          profile['land_size_acres'] ??
              profile['landSizeAcres'] ??
              profile['land'],
        ) ??
        1.5;
    final primaryCrop = activeCrops.isNotEmpty
        ? activeCrops.first
        : 'mixed crops';
    final district = (profile['district'] ?? '').toString().trim();

    final compostValue = (900 + acres * 320).round();
    final biogasValue = (1200 + acres * 280).round();
    final vermiValue = (1400 + acres * 300).round();
    final plasticValue = (500 + acres * 140).round();
    final mushroomValue = (1600 + acres * 350).round();
    final bioEnzymeValue = (700 + acres * 150).round();

    return <_WasteStream>[
      _WasteStream(
        id: 'crop_compost',
        title: 'Crop Residue to Compost',
        icon: Icons.grass_rounded,
        accent: AppColors.primaryDark,
        valueEstimate:
            'Can reduce fertilizer spends by ${compostValue.inr} per month.',
        investmentTag: 'Low investment',
        setupCost: 'Approx setup: ${((acres * 700) + 600).round().inr}',
        monthlyReturn: 'Expected monthly return: ${compostValue.inr}',
        timeToIncome: 'Time to first output: 30-45 days',
        materials: <String>[
          'Segregated residue from $primaryCrop',
          'Dry leaves and cattle dung starter',
          'Pit or compost drum',
          'Moisture source and cover sheet',
        ],
        steps: const <String>[
          'Shred or chop residue to speed up breakdown.',
          'Layer dry and wet biomass in a 3:1 ratio.',
          'Maintain moisture and turn every 7-10 days.',
          'Apply mature compost to field or pack for local sale.',
        ],
        schemeKeywords: const <String>['pkvy', 'nmsa', 'organic', 'soil'],
        chatPrompt:
            'Create a practical composting plan for my farm with weekly tasks, estimated inputs, and sales options.',
      ),
      _WasteStream(
        id: 'dung_biogas',
        title: 'Animal Waste to Biogas',
        icon: Icons.local_fire_department,
        accent: AppColors.warning,
        valueEstimate:
            'Can offset cooking fuel and power by ${biogasValue.inr} per month.',
        investmentTag: 'Medium investment',
        setupCost: 'Approx setup: ${((acres * 2200) + 5000).round().inr}',
        monthlyReturn: 'Expected monthly savings: ${biogasValue.inr}',
        timeToIncome: 'Time to first gas: 20-30 days',
        materials: const <String>[
          'Daily cattle dung feedstock',
          'Water mixing tank',
          'Family-size biogas digester',
          'Gas pipe and safe burner setup',
        ],
        steps: const <String>[
          'Install the digester on level ground with drainage.',
          'Feed dung-water slurry daily at fixed timing.',
          'Collect gas for cooking and store slurry for fields.',
          'Track gas output and slurry use each week.',
        ],
        schemeKeywords: const <String>['gobar', 'biogas', 'clean', 'energy'],
        chatPrompt:
            'Design a small biogas unit plan with daily feed schedule and expected monthly savings for my profile.',
      ),
      _WasteStream(
        id: 'dung_vermi',
        title: 'Dung to Vermicompost',
        icon: Icons.pest_control_rodent,
        accent: AppColors.info,
        valueEstimate:
            'Can earn up to ${vermiValue.inr} per month from premium compost.',
        investmentTag: 'Low investment',
        setupCost: 'Approx setup: ${((acres * 950) + 1400).round().inr}',
        monthlyReturn: 'Expected monthly return: ${vermiValue.inr}',
        timeToIncome: 'Time to first sale: 35-45 days',
        materials: const <String>[
          'Compost bed or tank with shade',
          'Earthworms (Eisenia fetida)',
          'Partially decomposed organic matter',
          'Moisture spray and covering cloth',
        ],
        steps: const <String>[
          'Prepare bed with cow dung and partial compost base.',
          'Introduce worms and feed thin layers every 5-7 days.',
          'Keep moisture moderate and avoid direct sunlight.',
          'Separate compost and worms for reuse and sale.',
        ],
        schemeKeywords: const <String>['pkvy', 'organic', 'soil', 'nmsa'],
        chatPrompt:
            'Build a vermicompost business plan with expected output, local pricing, and packaging checklist.',
      ),
      _WasteStream(
        id: 'plastic_recycling',
        title: 'Agri Plastic to Recycling',
        icon: Icons.recycling,
        accent: AppColors.accent,
        valueEstimate:
            'Can recover about ${plasticValue.inr} per month from sorted plastic.',
        investmentTag: 'Very low investment',
        setupCost: 'Approx setup: ${((acres * 250) + 350).round().inr}',
        monthlyReturn: 'Expected monthly return: ${plasticValue.inr}',
        timeToIncome: 'Time to first payout: 7-14 days',
        materials: const <String>[
          'Separate sacks for film, bottles, and pipes',
          'Basic weighing scale',
          'Dry storage corner',
          'Recycler contact list',
        ],
        steps: const <String>[
          'Separate used plastic by type and remove mud residue.',
          'Dry and bundle material to improve resale value.',
          'Coordinate pickup with local recycler every 2 weeks.',
          'Track kg sold and income in one simple register.',
        ],
        schemeKeywords: const <String>[
          'swachh',
          'recycling',
          'waste',
          'plastic',
        ],
        chatPrompt:
            'Suggest a plastic collection and sale workflow for a small farm with realistic local buyer strategy.',
      ),
      _WasteStream(
        id: 'straw_mushroom',
        title: 'Straw to Mushroom Unit',
        icon: Icons.spa,
        accent: const Color(0xFFE11D48),
        valueEstimate:
            'Can generate around ${mushroomValue.inr} per month from straw beds.',
        investmentTag: 'Medium investment',
        setupCost: 'Approx setup: ${((acres * 2600) + 3800).round().inr}',
        monthlyReturn: 'Expected monthly return: ${mushroomValue.inr}',
        timeToIncome: 'Time to first harvest: 25-35 days',
        materials: const <String>[
          'Paddy or wheat straw bundles',
          'Mushroom spawn',
          'Poly grow bags',
          'Humid and shaded room',
        ],
        steps: const <String>[
          'Pasteurize straw and prepare layered grow bags.',
          'Maintain humidity and stable room temperature.',
          'Harvest in flushes and grade by size.',
          'Sell directly to nearby town buyers or hotels.',
        ],
        schemeKeywords: const <String>['horticulture', 'nmsa', 'entrepreneur'],
        chatPrompt:
            'Create a straw mushroom startup plan with production cycle, costs, and local sales channels.',
      ),
      _WasteStream(
        id: 'bio_input',
        title: 'Kitchen Waste to Bio Input',
        icon: Icons.science,
        accent: const Color(0xFF0EA5E9),
        valueEstimate:
            'Can save nearly ${bioEnzymeValue.inr} per month in input costs.',
        investmentTag: 'Low investment',
        setupCost: 'Approx setup: ${((acres * 500) + 500).round().inr}',
        monthlyReturn: 'Expected monthly savings: ${bioEnzymeValue.inr}',
        timeToIncome: 'Time to first batch: 15-20 days',
        materials: <String>[
          'Kitchen peels and biodegradable scraps',
          'Jaggery or molasses',
          'Fermentation drums',
          if (district.isNotEmpty) 'Water source in $district',
        ],
        steps: const <String>[
          'Prepare feedstock mix in clean fermentation containers.',
          'Ferment for 15-20 days with periodic venting.',
          'Filter and dilute for foliar or soil use.',
          'Use internally or sell to nearby organic farmers.',
        ],
        schemeKeywords: const <String>['organic', 'soil', 'nmsa'],
        chatPrompt:
            'Make a stepwise bio-input plan for my location with dosage schedule and monthly savings estimate.',
      ),
    ];
  }

  List<_QuickTask> _buildQuickTasksForToday({
    required Map<String, dynamic> profile,
    required List<String> activeCrops,
    required List<_WasteStream> streams,
  }) {
    final district = (profile['district'] ?? '').toString().trim();
    final state = (profile['state'] ?? '').toString().trim();
    final cropLabel = activeCrops.isNotEmpty ? activeCrops.first : 'main crop';
    final topStream = streams.isNotEmpty
        ? streams.first.title
        : 'Compost stream';
    final isHindi = _languageCode.startsWith('hi');

    if (isHindi) {
      return <_QuickTask>[
        _QuickTask(
          id: 'segregate_today',
          title: 'Aaj kachra alag karein',
          subtitle:
              '$cropLabel ke avshesh ko alag stack me rakhkar nami se bachayen.',
        ),
        _QuickTask(
          id: 'contact_buyer',
          title: 'Sthaniya buyer list banayen',
          subtitle: district.isEmpty
              ? 'Nazdeeki recycler ya mandi ka contact note karein.'
              : '$district ke recycler ya mandi agent ka number save karein.',
        ),
        _QuickTask(
          id: 'scheme_check',
          title: 'Scheme eligibility check karein',
          subtitle: state.isEmpty
              ? 'PKVY, GOBARdhan aur NMSA ke liye profile details update karein.'
              : '$state ke liye PKVY, GOBARdhan aur NMSA documents ready karein.',
        ),
        _QuickTask(
          id: 'pilot_batch',
          title: 'Pilot batch shuru karein',
          subtitle:
              '$topStream ke liye ek chhota batch banakar progress note karein.',
        ),
      ];
    }

    return <_QuickTask>[
      _QuickTask(
        id: 'segregate_today',
        title: 'Segregate waste before sunset',
        subtitle: 'Separate $cropLabel residue and keep one dry stack ready.',
      ),
      _QuickTask(
        id: 'contact_buyer',
        title: 'Save two local buyer contacts',
        subtitle: district.isEmpty
            ? 'Find one recycler and one mandi contact in your area.'
            : 'Collect recycler or mandi contacts around $district for pickup.',
      ),
      _QuickTask(
        id: 'scheme_check',
        title: 'Check subsidy readiness',
        subtitle: state.isEmpty
            ? 'Review PKVY, GOBARdhan, and NMSA requirements with profile updates.'
            : 'Validate PKVY, GOBARdhan, and NMSA eligibility for $state.',
      ),
      _QuickTask(
        id: 'pilot_batch',
        title: 'Start one pilot batch',
        subtitle:
            'Run a small trial for $topStream and track output this week.',
      ),
    ];
  }

  List<Map<String, dynamic>> _pickSpotlightSchemes({
    required List<Map<String, dynamic>> schemes,
    required Map<String, dynamic> profile,
    required List<String> activeCrops,
  }) {
    if (schemes.isEmpty) return <Map<String, dynamic>>[];

    final state = (profile['state'] ?? '').toString().trim().toLowerCase();
    final cropText = activeCrops.join(' ').toLowerCase();
    const priorityKeywords = <String>[
      'gobar',
      'pkvy',
      'nmsa',
      'organic',
      'biogas',
      'compost',
      'waste',
      'soil',
    ];

    final scored =
        schemes
            .map((scheme) {
              final haystack = [
                scheme['name'],
                scheme['short_name'],
                scheme['description'],
                scheme['category'],
                scheme['state'],
              ].map((e) => e?.toString() ?? '').join(' ').toLowerCase();

              var score = 0;
              for (final keyword in priorityKeywords) {
                if (haystack.contains(keyword)) score += 4;
              }
              if (state.isNotEmpty) {
                final schemeState = (scheme['state'] ?? '')
                    .toString()
                    .trim()
                    .toLowerCase();
                if (schemeState == 'all' || schemeState == state) score += 3;
              }
              if (cropText.isNotEmpty &&
                  cropText.split(' ').any(haystack.contains)) {
                score += 2;
              }
              if (scheme['is_active'] == true) score += 1;

              return (score: score, scheme: scheme);
            })
            .toList(growable: false)
          ..sort((a, b) => b.score.compareTo(a.score));

    final out = <Map<String, dynamic>>[];
    final seen = <String>{};
    for (final row in scored) {
      final scheme = row.scheme;
      final id = (scheme['id'] ?? scheme['name'] ?? '').toString();
      if (id.isEmpty || !seen.add(id)) continue;
      out.add(scheme);
      if (out.length == 3) break;
    }

    return out;
  }

  List<Map<String, dynamic>> _relatedSchemesForStream(_WasteStream stream) {
    if (_allSchemes.isEmpty) return <Map<String, dynamic>>[];
    final keywords = stream.schemeKeywords.map((e) => e.toLowerCase()).toList();

    final matches = _allSchemes
        .where((scheme) {
          final haystack = [
            scheme['name'],
            scheme['short_name'],
            scheme['description'],
            scheme['category'],
          ].map((e) => e?.toString() ?? '').join(' ').toLowerCase();

          return keywords.any(haystack.contains);
        })
        .toList(growable: false);

    if (matches.isNotEmpty) return matches.take(3).toList(growable: false);
    return _spotlightSchemes.take(3).toList(growable: false);
  }

  Future<Set<String>> _readTaskProgress(
    Map<String, dynamic> profile,
    List<_QuickTask> tasks,
  ) async {
    final prefs = await SharedPreferences.getInstance();
    final key = _taskStorageKey(profile);
    final stored = prefs.getStringList(key) ?? const <String>[];

    final knownIds = tasks.map((t) => t.id).toSet();
    return stored.where(knownIds.contains).toSet();
  }

  Future<void> _persistTaskProgress() async {
    final prefs = await SharedPreferences.getInstance();
    final key = _taskStorageKey(_profile);
    await prefs.setStringList(key, _completedTaskIds.toList(growable: false));
  }

  String _taskStorageKey(Map<String, dynamic> profile) {
    final datePart = DateFormat('yyyyMMdd').format(DateTime.now());
    final identity =
        (profile['id'] ?? profile['user_id'] ?? profile['name'] ?? 'guest')
            .toString()
            .replaceAll(' ', '_')
            .toLowerCase();
    return 'waste_quickwins_${identity}_$datePart';
  }

  Future<void> _toggleTask(_QuickTask task, bool selected) async {
    final updated = Set<String>.from(_completedTaskIds);
    final wasCompleted = updated.contains(task.id);

    if (selected) {
      updated.add(task.id);
    } else {
      updated.remove(task.id);
    }

    setState(() {
      _completedTaskIds = updated;
    });
    await _persistTaskProgress();

    if (selected && !wasCompleted && mounted) {
      HapticFeedback.lightImpact();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          content: Row(
            children: <Widget>[
              const Icon(Icons.celebration, color: Colors.white, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text('Great progress. "${task.title}" marked complete.'),
              ),
            ],
          ),
        ),
      );
    }
  }

  Future<void> _generateAiOverview({required bool forceRefresh}) async {
    if (_aiOverviewLoading || _streams.isEmpty) return;

    setState(() {
      _aiOverviewLoading = true;
    });

    try {
      final snippets = <String>[
        _languageInstruction(),
        'Do not include labels like Data now or Data last updated.',
        ..._streams
            .take(6)
            .map((stream) => '${stream.title}: ${stream.valueEstimate}'),
        ..._spotlightSchemes.map((scheme) {
          final name = (scheme['name'] ?? scheme['short_name'] ?? 'Scheme')
              .toString();
          final desc = (scheme['description'] ?? '').toString();
          return 'Scheme: $name - $desc';
        }),
      ];

      final result = await ref
          .read(aiOverviewServiceProvider)
          .generate(
            key: 'waste_economy_overview_v1',
            pageName: 'Best Out Of Waste Hub',
            languageCode: context.locale.languageCode,
            nearbyData: snippets,
            forceRefresh: forceRefresh,
          );

      if (!mounted) return;
      setState(() {
        _overviewSummary = _normalizeAiSummary(result.summary);
        _overviewDetails = _normalizeAiDetails(result.details);
        _overviewUpdatedAt = result.updatedAt;
      });
    } catch (_) {
      // keep existing card if generation fails
    } finally {
      if (mounted) {
        setState(() {
          _aiOverviewLoading = false;
        });
      }
    }
  }

  Future<void> _runImpactCalculation() async {
    final quantity = double.tryParse(_quantityController.text.trim());
    if (quantity == null || quantity <= 0) {
      context.showSnack('Enter a valid waste quantity in kg.', isError: true);
      return;
    }

    final metrics = _computeMetrics(
      quantityKg: quantity,
      wasteType: _selectedWasteType,
      disposalMethod: _selectedDisposal,
    );

    setState(() {
      _impact = metrics;
      _impactAiExplanation = '';
      _impactLoading = true;
    });

    try {
      final location = _locationLabel();
      final prompt = [
        'Build a concise waste-to-wealth explanation for an Indian farmer.',
        _languageInstruction(),
        'Waste type: $_selectedWasteType',
        'Quantity: ${quantity.toStringAsFixed(0)} kg/month',
        'Current disposal: $_selectedDisposal',
        'Location: $location',
        'Calculated monthly earnings: ${metrics.monthlyEarnings.inr}',
        'Calculated annual savings: ${metrics.annualSavings.inr}',
        'Estimated CO2 prevented: ${metrics.co2PreventedKg.toStringAsFixed(0)} kg/month',
        'Respond in 3 short bullet points with practical advice and one caution.',
        'Do not include labels like "Data now" or "Data last updated".',
      ].join('\n');

      final res = await ref
          .read(agentServiceProvider)
          .chat(
            message: prompt,
            language: context.locale.languageCode,
            agentType: 'crop',
          );
      final ai = (res['response'] ?? '').toString().trim();

      if (!mounted) return;
      setState(() {
        _impactAiExplanation = _normalizeAiDetails(ai);
      });
    } catch (_) {
      if (mounted) {
        context.showSnack(
          'Could not generate AI explanation. Metrics are still available.',
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _impactLoading = false;
        });
      }
    }
  }

  _ImpactMetrics _computeMetrics({
    required double quantityKg,
    required String wasteType,
    required String disposalMethod,
  }) {
    final type = wasteType.toLowerCase();
    final disposal = disposalMethod.toLowerCase();

    var earningPerKg = 1.8;
    var savingPerKg = 1.1;
    var co2Factor = 0.7;

    if (type.contains('compost')) {
      earningPerKg = 2.2;
      savingPerKg = 1.6;
      co2Factor = 0.85;
    } else if (type.contains('biogas')) {
      earningPerKg = 2.8;
      savingPerKg = 2.0;
      co2Factor = 1.15;
    } else if (type.contains('vermi')) {
      earningPerKg = 2.5;
      savingPerKg = 1.7;
      co2Factor = 0.95;
    } else if (type.contains('plastic')) {
      earningPerKg = 1.4;
      savingPerKg = 0.9;
      co2Factor = 1.25;
    } else if (type.contains('mushroom')) {
      earningPerKg = 3.1;
      savingPerKg = 1.8;
      co2Factor = 0.65;
    }

    var disposalMultiplier = 1.0;
    if (disposal.contains('burn')) {
      disposalMultiplier = 1.35;
    } else if (disposal.contains('dump')) {
      disposalMultiplier = 1.18;
    } else if (disposal.contains('landfill')) {
      disposalMultiplier = 1.22;
    }

    final monthlyEarnings = quantityKg * earningPerKg;
    final annualSavings =
        (quantityKg * savingPerKg * 12) + (monthlyEarnings * 6.5);
    final co2PreventedKg = quantityKg * co2Factor * disposalMultiplier;

    return _ImpactMetrics(
      monthlyEarnings: monthlyEarnings,
      annualSavings: annualSavings,
      co2PreventedKg: co2PreventedKg,
    );
  }

  Future<void> _shareImpactResult() async {
    final impact = _impact;
    if (impact == null) return;

    final text = [
      'Best Out Of Waste Impact Summary',
      'Location: ${_locationLabel()}',
      'Waste stream: $_selectedWasteType',
      'Current disposal: $_selectedDisposal',
      'Monthly earnings potential: ${impact.monthlyEarnings.inr}',
      'Annual savings potential: ${impact.annualSavings.inr}',
      'CO2 prevented: ${impact.co2PreventedKg.toStringAsFixed(0)} kg/month',
      if (_impactAiExplanation.trim().isNotEmpty) '',
      if (_impactAiExplanation.trim().isNotEmpty) _impactAiExplanation.trim(),
    ].join('\n');

    await SharePlus.instance.share(ShareParams(text: text));
  }

  Future<void> _openSchemeUrl(Map<String, dynamic> scheme) async {
    final raw = (scheme['application_url'] ?? scheme['url'] ?? '')
        .toString()
        .trim();
    if (raw.isEmpty) {
      context.showSnack(
        'Official application link is not available for this scheme.',
      );
      return;
    }

    final uri = Uri.tryParse(raw);
    if (uri == null) {
      context.showSnack('Scheme link is invalid.', isError: true);
      return;
    }

    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!launched && mounted) {
      context.showSnack('Could not open scheme link.', isError: true);
    }
  }

  void _openSchemeDetails(Map<String, dynamic> scheme) {
    final title =
        (scheme['name'] ?? scheme['short_name'] ?? 'Government Scheme')
            .toString();
    final description = (scheme['description'] ?? 'No description available.')
        .toString();
    final eligibility = _firstEligibilityLine(scheme);
    final benefits = _firstBenefitLine(scheme);

    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) {
        return Container(
          decoration: BoxDecoration(
            color: context.theme.scaffoldBackgroundColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
          child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: context.appColors.border,
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  title,
                  style: context.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 12),
                Text(description, style: context.textTheme.bodyMedium),
                const SizedBox(height: 12),
                Text(
                  'Eligibility: $eligibility',
                  style: context.textTheme.bodySmall?.copyWith(
                    color: context.appColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Benefit: $benefits',
                  style: context.textTheme.bodySmall?.copyWith(
                    color: context.appColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: <Widget>[
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _openSchemeInMarket(scheme),
                        icon: const Icon(Icons.storefront_outlined),
                        label: const Text('View in Market'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _openSchemeUrl(scheme),
                        icon: const Icon(Icons.open_in_new),
                        label: const Text('Apply Now'),
                        style: OutlinedButton.styleFrom(
                          backgroundColor: Colors.white.withValues(alpha: 0.84),
                          foregroundColor: AppColors.lightText,
                          side: BorderSide(
                            color: AppColors.primary.withValues(alpha: 0.26),
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(40),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _openPlanChat(String prompt) async {
    final q = Uri.encodeComponent(prompt);
    if (!mounted) return;
    context.push('${RoutePaths.chat}?agent=crop&q=$q');
  }

  Future<void> _openNearbyMandis() async {
    if (!mounted) return;
    context.push('${RoutePaths.marketPrices}?section=mandis');
  }

  Future<void> _openSchemeInMarket(Map<String, dynamic> scheme) async {
    final query =
        (scheme['short_name'] ?? scheme['name'] ?? scheme['title'] ?? '')
            .toString()
            .trim();
    final encoded = Uri.encodeComponent(query.isEmpty ? 'scheme' : query);
    if (!mounted) return;
    context.push('${RoutePaths.marketPrices}?section=schemes&scheme=$encoded');
  }

  void _openStreamGuide(_WasteStream stream) {
    final relatedSchemes = _relatedSchemesForStream(stream);

    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) {
        return DraggableScrollableSheet(
          initialChildSize: 0.78,
          maxChildSize: 0.94,
          minChildSize: 0.50,
          builder: (context, controller) {
            return Container(
              decoration: BoxDecoration(
                color: context.theme.scaffoldBackgroundColor,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(24),
                ),
              ),
              child: ListView(
                controller: controller,
                padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
                children: <Widget>[
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: context.appColors.border,
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: <Widget>[
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: stream.accent.withValues(alpha: 0.16),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(stream.icon, color: stream.accent),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          stream.title,
                          style: context.textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _guideInfoRow(Icons.shopping_bag_outlined, stream.setupCost),
                  _guideInfoRow(Icons.trending_up, stream.monthlyReturn),
                  _guideInfoRow(Icons.schedule, stream.timeToIncome),
                  const SizedBox(height: 12),
                  Text(
                    'Materials Needed',
                    style: context.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: stream.materials
                        .map(
                          (m) => Chip(
                            label: Text(m),
                            side: BorderSide.none,
                            backgroundColor: stream.accent.withValues(
                              alpha: 0.14,
                            ),
                          ),
                        )
                        .toList(growable: false),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    'Step-by-step Guide',
                    style: context.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...stream.steps.asMap().entries.map((entry) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          CircleAvatar(
                            radius: 12,
                            backgroundColor: stream.accent.withValues(
                              alpha: 0.20,
                            ),
                            child: Text(
                              '${entry.key + 1}',
                              style: TextStyle(
                                color: stream.accent,
                                fontWeight: FontWeight.w700,
                                fontSize: 11,
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(child: Text(entry.value)),
                        ],
                      ),
                    );
                  }),
                  if (relatedSchemes.isNotEmpty) ...<Widget>[
                    const SizedBox(height: 6),
                    Text(
                      'Relevant Government Schemes',
                      style: context.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ...relatedSchemes.map((scheme) {
                      final name =
                          (scheme['name'] ?? scheme['short_name'] ?? 'Scheme')
                              .toString();
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          onTap: () {
                            Navigator.of(context).pop();
                            _openSchemeInMarket(scheme);
                          },
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 4,
                          ),
                          title: Text(name),
                          subtitle: Text(
                            _firstEligibilityLine(scheme),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          trailing: TextButton(
                            onPressed: () => _openSchemeUrl(scheme),
                            child: const Text('Apply'),
                          ),
                        ),
                      );
                    }),
                  ],
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.of(context).pop();
                        _openPlanChat(stream.chatPrompt);
                      },
                      icon: const Icon(Icons.smart_toy_outlined),
                      label: const Text('Ask AI For Custom Plan'),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(0, 42),
                        backgroundColor: Colors.white.withValues(alpha: 0.84),
                        foregroundColor: AppColors.lightText,
                        side: BorderSide(
                          color: AppColors.primary.withValues(alpha: 0.26),
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(40),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _guideInfoRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: <Widget>[
          Icon(icon, size: 18, color: context.appColors.textSecondary),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: context.textTheme.bodyMedium?.copyWith(
                color: context.appColors.textSecondary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _firstName() {
    final raw = (_profile['name'] ?? _profile['farmer_name'] ?? 'Farmer')
        .toString()
        .trim();
    if (raw.isEmpty) return 'Farmer';
    return raw.split(' ').first;
  }

  String _greetingLine() {
    final now = DateTime.now().hour;
    final hello = now < 12
        ? 'Good morning'
        : now < 17
        ? 'Good afternoon'
        : 'Good evening';
    final location = _locationLabel();
    return '$hello, ${_firstName()}! Here is what your farm can transform today in $location.';
  }

  String _locationLabel() {
    return ref.read(personalizationServiceProvider).locationLabel(_profile);
  }

  bool _profileNeedsAttention() {
    final state = (_profile['state'] ?? '').toString().trim();
    final district = (_profile['district'] ?? '').toString().trim();
    return state.isEmpty || district.isEmpty;
  }

  String _languageInstruction() {
    if (_languageCode.startsWith('hi')) {
      return 'Respond only in Hindi using Devanagari script. Do not mix English unless it is a proper noun.';
    }
    return 'Respond only in English. Do not mix Hindi or Hinglish.';
  }

  String _normalizeAiSummary(String text) {
    final cleaned = _normalizeAiDetails(text);
    final firstLine = cleaned
        .split('\n')
        .map((line) => line.trim())
        .firstWhere((line) => line.isNotEmpty, orElse: () => '');
    if (firstLine.isEmpty) {
      return 'Generate your AI summary to see the best waste-to-wealth options for today.';
    }
    return firstLine;
  }

  String _normalizeAiDetails(String text) {
    final withoutCr = text.replaceAll('\r', '\n');
    final bulletPrefix = RegExp(r'^[\-\*•>\d\.\)\s]+');
    final metaPrefix = RegExp(
      r'^(\*\*|__)?\s*(data now|data last updated|last updated)\s*(\*\*|__)?\s*[:\-]*\s*',
      caseSensitive: false,
    );
    final lines = withoutCr
        .split('\n')
        .map((line) => line.trim())
        .map((line) => line.replaceFirst(bulletPrefix, ''))
        .map((line) {
          if (line.isEmpty) return '';

          final isLastUpdatedOnly = RegExp(
            r'^(\*\*|__)?\s*(data last updated|last updated)',
            caseSensitive: false,
          ).hasMatch(line);
          if (isLastUpdatedOnly) return '';

          return line.replaceFirst(metaPrefix, '').trim();
        })
        .where(
          (line) => _languageCode.startsWith('hi')
              ? true
              : !RegExp(r'[\u0900-\u097F]').hasMatch(line),
        )
        .where((line) => line.isNotEmpty)
        .toList(growable: false);

    final cleaned = lines.join('\n').trim();
    if (cleaned.isEmpty) {
      return 'This uses your profile, crop records, and nearby policy context.';
    }
    return cleaned;
  }

  String _firstEligibilityLine(Map<String, dynamic> scheme) {
    final eligibility = scheme['eligibility'];
    if (eligibility is List && eligibility.isNotEmpty) {
      return eligibility.first.toString();
    }
    if (eligibility is String && eligibility.trim().isNotEmpty) {
      return eligibility.trim();
    }
    return 'See official criteria before applying.';
  }

  String _firstBenefitLine(Map<String, dynamic> scheme) {
    final benefits = scheme['benefits'];
    if (benefits is List && benefits.isNotEmpty) {
      return benefits.first.toString();
    }
    if (benefits is String && benefits.trim().isNotEmpty) {
      return benefits.trim();
    }
    return 'Benefit details available on official page.';
  }

  double? _toDouble(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value.trim());
    return null;
  }

  List<String> get _wasteTypeOptions {
    if (_streams.isEmpty) {
      return const <String>['Crop Residue to Compost'];
    }
    return _streams.map((s) => s.title).toList(growable: false);
  }

  Future<void> _refreshAll() async {
    await _bootstrap(forceRefresh: true);
    await _generateAiOverview(forceRefresh: true);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final cardColor = Colors.white.withValues(alpha: 0.58);
    final textColor = AppColors.lightText;
    final subColor = AppColors.lightTextSecondary;

    return Scaffold(
      backgroundColor: isDark
          ? AppColors.darkBackground
          : AppColors.lightBackground,
      appBar: AppBar(title: const Text('Best Out Of Waste'), centerTitle: true),
      bottomNavigationBar: _stickyActionBar(),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? <Color>[AppColors.darkBackground, AppColors.darkSurface]
                : <Color>[AppColors.lightBackground, AppColors.lightSurface],
          ),
        ),
        child: SafeArea(
          child: _loading
              ? _skeletonView(cardColor)
              : RefreshIndicator(
                  onRefresh: _refreshAll,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
                    children: <Widget>[
                      _headerCard(cardColor, textColor, subColor),
                      const SizedBox(height: 12),
                      _aiOverviewCard(cardColor, textColor, subColor),
                      if (_loadError != null) ...<Widget>[
                        const SizedBox(height: 12),
                        _glassCard(
                          cardColor: cardColor,
                          child: Row(
                            children: <Widget>[
                              const Icon(
                                Icons.info_outline,
                                color: AppColors.warning,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _loadError!,
                                  style: TextStyle(color: subColor),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                      if (_profileNeedsAttention()) ...<Widget>[
                        const SizedBox(height: 12),
                        _profileAttentionCard(cardColor, textColor, subColor),
                      ],
                      const SizedBox(height: 18),
                      _sectionTitle(
                        'Waste Streams',
                        Icons.layers_outlined,
                        textColor,
                      ),
                      const SizedBox(height: 8),
                      _streamScroller(cardColor, textColor, subColor),
                      const SizedBox(height: 18),
                      _sectionTitle(
                        'Quick Wins For Today',
                        Icons.check_circle_outline,
                        textColor,
                      ),
                      const SizedBox(height: 8),
                      _quickWinsCard(cardColor, textColor, subColor),
                      const SizedBox(height: 18),
                      _sectionTitle(
                        'Impact Calculator',
                        Icons.calculate_outlined,
                        textColor,
                      ),
                      const SizedBox(height: 8),
                      _impactCalculatorCard(cardColor, textColor, subColor),
                      const SizedBox(height: 18),
                      _sectionTitle(
                        'Scheme Spotlight',
                        Icons.account_balance_outlined,
                        textColor,
                      ),
                      const SizedBox(height: 8),
                      _schemeSpotlight(cardColor, textColor, subColor),
                    ],
                  ),
                ),
        ),
      ),
    );
  }

  Widget _headerCard(Color cardColor, Color textColor, Color subColor) {
    final cropLabel = _activeCrops.isEmpty
        ? 'No active crops synced yet'
        : _activeCrops.take(3).join(' • ');

    return _glassCard(
      cardColor: cardColor,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            _greetingLine(),
            style: TextStyle(
              color: textColor,
              fontWeight: FontWeight.w700,
              fontSize: 16,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Active crops: $cropLabel',
            style: TextStyle(color: subColor, height: 1.3),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _activeCrops.isEmpty
                ? <Widget>[
                    Chip(
                      label: const Text('Profile sync pending'),
                      side: BorderSide.none,
                      backgroundColor: Colors.white.withValues(alpha: 0.7),
                    ),
                  ]
                : _activeCrops
                      .take(4)
                      .map(
                        (crop) => Chip(
                          label: Text(crop),
                          side: BorderSide.none,
                          backgroundColor: AppColors.primary.withValues(
                            alpha: 0.14,
                          ),
                        ),
                      )
                      .toList(growable: false),
          ),
        ],
      ),
    );
  }

  Widget _aiOverviewCard(Color cardColor, Color textColor, Color subColor) {
    return _glassCard(
      cardColor: cardColor,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              const Icon(
                Icons.auto_awesome,
                color: AppColors.primaryDark,
                size: 18,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'AI Overview',
                  style: TextStyle(
                    color: textColor,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            _normalizeAiSummary(_overviewSummary),
            style: TextStyle(
              color: textColor,
              fontWeight: FontWeight.w700,
              fontSize: 15,
            ),
          ),
          const SizedBox(height: 6),
          MarkdownBody(
            data: _normalizeAiDetails(_overviewDetails),
            styleSheet: MarkdownStyleSheet.fromTheme(context.theme).copyWith(
              p: TextStyle(color: subColor, height: 1.35),
              listBullet: TextStyle(color: subColor),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _aiOverviewLoading
                  ? null
                  : () => _generateAiOverview(forceRefresh: true),
              icon: Icon(
                _aiOverviewLoading ? Icons.hourglass_top : Icons.refresh,
              ),
              label: Text(
                _aiOverviewLoading
                    ? 'Generating...'
                    : 'Generate Fresh Overview',
              ),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(0, 44),
                backgroundColor: Colors.white.withValues(alpha: 0.85),
                foregroundColor: AppColors.lightText,
                side: BorderSide(
                  color: AppColors.primary.withValues(alpha: 0.26),
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(40),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _profileAttentionCard(
    Color cardColor,
    Color textColor,
    Color subColor,
  ) {
    return _glassCard(
      cardColor: cardColor,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            'Profile data is incomplete',
            style: TextStyle(color: textColor, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          Text(
            'Add state and district in your profile to unlock accurate schemes and better local plans.',
            style: TextStyle(color: subColor, height: 1.35),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: () => context.push(RoutePaths.profile),
            icon: const Icon(Icons.person_outline),
            label: const Text('Complete Profile'),
            style: OutlinedButton.styleFrom(minimumSize: const Size(0, 42)),
          ),
        ],
      ),
    );
  }

  Widget _streamScroller(Color cardColor, Color textColor, Color subColor) {
    if (_streams.isEmpty) {
      return _glassCard(
        cardColor: cardColor,
        child: Text(
          'No waste streams available right now.',
          style: TextStyle(color: subColor),
        ),
      );
    }

    final topStreams = _streams.take(4).toList(growable: false);

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: topStreams.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: AppSpacing.md,
        mainAxisSpacing: AppSpacing.md,
        childAspectRatio: 1.35,
      ),
      itemBuilder: (_, i) {
        final stream = topStreams[i];
        return _glassCard(
          cardColor: cardColor,
          child: InkWell(
            onTap: () {
              HapticFeedback.lightImpact();
              _openStreamGuide(stream);
            },
            borderRadius: BorderRadius.circular(18),
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                color: stream.accent.withValues(alpha: 0.08),
              ),
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      Icon(stream.icon, color: stream.accent),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Text(
                          stream.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: context.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: textColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    stream.investmentTag.toUpperCase(),
                    style: context.textTheme.titleSmall?.copyWith(
                      color: stream.accent,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Expanded(
                    child: Text(
                      stream.valueEstimate,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: context.textTheme.bodySmall?.copyWith(
                        color: textColor,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _quickWinsCard(Color cardColor, Color textColor, Color subColor) {
    return _glassCard(
      cardColor: cardColor,
      child: Column(
        children: _quickTasks
            .map((task) {
              final done = _completedTaskIds.contains(task.id);
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  color: done
                      ? AppColors.primary.withValues(alpha: 0.12)
                      : Colors.white.withValues(alpha: 0.62),
                  border: Border.all(
                    color: done
                        ? AppColors.primary.withValues(alpha: 0.30)
                        : Colors.white.withValues(alpha: 0.75),
                  ),
                ),
                child: ListTile(
                  onTap: () => _toggleTask(task, !done),
                  leading: Checkbox(
                    value: done,
                    onChanged: (value) => _toggleTask(task, value ?? false),
                    activeColor: AppColors.primary,
                  ),
                  title: Text(
                    task.title,
                    style: TextStyle(
                      color: textColor,
                      fontWeight: FontWeight.w700,
                      decoration: done ? TextDecoration.lineThrough : null,
                    ),
                  ),
                  subtitle: Text(
                    task.subtitle,
                    style: TextStyle(color: subColor),
                  ),
                ),
              );
            })
            .toList(growable: false),
      ),
    );
  }

  Widget _impactCalculatorCard(
    Color cardColor,
    Color textColor,
    Color subColor,
  ) {
    return _glassCard(
      cardColor: cardColor,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            'Estimate earnings, savings, and climate impact from your waste stream.',
            style: TextStyle(color: subColor, height: 1.3),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _selectedWasteType,
            decoration: const InputDecoration(
              labelText: 'Waste stream',
              isDense: true,
            ),
            items: _wasteTypeOptions
                .map(
                  (type) =>
                      DropdownMenuItem<String>(value: type, child: Text(type)),
                )
                .toList(growable: false),
            onChanged: (value) {
              if (value == null) return;
              setState(() {
                _selectedWasteType = value;
              });
            },
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _quantityController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(
              labelText: 'Waste quantity (kg per month)',
              hintText: 'e.g. 180',
              isDense: true,
            ),
          ),
          const SizedBox(height: 10),
          DropdownButtonFormField<String>(
            initialValue: _selectedDisposal,
            decoration: const InputDecoration(
              labelText: 'Current disposal method',
              isDense: true,
            ),
            items: _disposalMethods
                .map(
                  (method) => DropdownMenuItem<String>(
                    value: method,
                    child: Text(method),
                  ),
                )
                .toList(growable: false),
            onChanged: (value) {
              if (value == null) return;
              setState(() {
                _selectedDisposal = value;
              });
            },
          ),
          const SizedBox(height: 10),
          TextField(
            enabled: false,
            decoration: InputDecoration(
              labelText: 'Location context',
              isDense: true,
              hintText: _locationLabel(),
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _impactLoading ? null : _runImpactCalculation,
              icon: Icon(
                _impactLoading ? Icons.hourglass_top : Icons.calculate,
              ),
              label: Text(
                _impactLoading ? 'Calculating...' : 'Calculate Impact',
              ),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(0, 44),
                backgroundColor: Colors.white.withValues(alpha: 0.85),
                foregroundColor: AppColors.lightText,
                side: BorderSide(
                  color: AppColors.primary.withValues(alpha: 0.26),
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(40),
                ),
              ),
            ),
          ),
          if (_impact != null) ...<Widget>[
            const SizedBox(height: 12),
            LayoutBuilder(
              builder: (context, constraints) {
                final width = (constraints.maxWidth - 16) / 2;
                return Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: <Widget>[
                    _metricCard(
                      width: width,
                      icon: Icons.payments_outlined,
                      title: 'Monthly earnings',
                      value: _impact!.monthlyEarnings.inr,
                      accent: AppColors.primaryDark,
                    ),
                    _metricCard(
                      width: width,
                      icon: Icons.savings_outlined,
                      title: 'Annual savings',
                      value: _impact!.annualSavings.inr,
                      accent: AppColors.info,
                    ),
                    _metricCard(
                      width: width,
                      icon: Icons.eco_outlined,
                      title: 'CO2 prevented',
                      value:
                          '${_impact!.co2PreventedKg.toStringAsFixed(0)} kg/mo',
                      accent: AppColors.success,
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 12),
            if (_impactAiExplanation.trim().isNotEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.66),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.82),
                  ),
                ),
                child: MarkdownBody(
                  data: _normalizeAiDetails(_impactAiExplanation),
                ),
              ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _shareImpactResult,
                icon: const Icon(Icons.share_outlined),
                label: const Text('Share Result'),
                style: OutlinedButton.styleFrom(minimumSize: const Size(0, 42)),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _metricCard({
    required double width,
    required IconData icon,
    required String title,
    required String value,
    required Color accent,
  }) {
    return SizedBox(
      width: width,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: accent.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Icon(icon, color: accent, size: 18),
            const SizedBox(height: 6),
            Text(
              title,
              style: context.textTheme.labelMedium?.copyWith(
                color: context.appColors.textSecondary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: context.textTheme.titleSmall?.copyWith(
                color: AppColors.lightText,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _schemeSpotlight(Color cardColor, Color textColor, Color subColor) {
    if (_spotlightSchemes.isEmpty) {
      return _glassCard(
        cardColor: cardColor,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              'No personalized schemes found yet.',
              style: TextStyle(color: textColor, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 6),
            Text(
              'Update profile location and try refresh to fetch state-matched subsidy programs.',
              style: TextStyle(color: subColor),
            ),
          ],
        ),
      );
    }

    return Column(
      children: _spotlightSchemes
          .map((scheme) {
            final title = (scheme['name'] ?? scheme['short_name'] ?? 'Scheme')
                .toString();
            final category = (scheme['category'] ?? 'support').toString();
            final eligibility = _firstEligibilityLine(scheme);

            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: GestureDetector(
                onTap: () => _openSchemeInMarket(scheme),
                child: _glassCard(
                  cardColor: cardColor,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Row(
                        children: <Widget>[
                          Expanded(
                            child: Text(
                              title,
                              style: TextStyle(
                                color: textColor,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 5,
                            ),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(999),
                              color: AppColors.primary.withValues(alpha: 0.14),
                            ),
                            child: Text(
                              category.replaceAll('_', ' ').capitalize,
                              style: const TextStyle(
                                color: AppColors.primaryDark,
                                fontWeight: FontWeight.w700,
                                fontSize: 11,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        eligibility,
                        style: TextStyle(color: subColor, height: 1.3),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: <Widget>[
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => _openSchemeDetails(scheme),
                              child: const Text('Details'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => _openSchemeUrl(scheme),
                              style: OutlinedButton.styleFrom(
                                backgroundColor: Colors.white.withValues(
                                  alpha: 0.84,
                                ),
                              ),
                              child: const Text('Apply Now'),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            );
          })
          .toList(growable: false),
    );
  }

  Widget _sectionTitle(String label, IconData icon, Color textColor) {
    return Row(
      children: <Widget>[
        Icon(icon, size: 18, color: AppColors.primaryDark),
        const SizedBox(width: 8),
        Text(
          label,
          style: TextStyle(
            color: textColor,
            fontWeight: FontWeight.w700,
            fontSize: 16,
          ),
        ),
      ],
    );
  }

  Widget _stickyActionBar() {
    final planPrompt = [
      'Build a complete waste-to-wealth plan for my farm profile.',
      'Location: ${_locationLabel()}',
      if (_activeCrops.isNotEmpty) 'Active crops: ${_activeCrops.join(', ')}',
      'Include weekly execution checklist, expected earnings, and scheme shortlist.',
    ].join('\n');

    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.92),
          border: Border(
            top: BorderSide(color: Colors.white.withValues(alpha: 0.94)),
          ),
        ),
        child: Row(
          children: <Widget>[
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => _openPlanChat(planPrompt),
                icon: const Icon(Icons.smart_toy_outlined),
                label: const Text('Ask AI Full Plan'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(0, 42),
                  backgroundColor: Colors.white.withValues(alpha: 0.84),
                  foregroundColor: AppColors.lightText,
                  side: BorderSide(
                    color: AppColors.primary.withValues(alpha: 0.26),
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(40),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _openNearbyMandis,
                icon: const Icon(Icons.storefront_outlined),
                label: const Text('Nearby Mandis'),
                style: OutlinedButton.styleFrom(minimumSize: const Size(0, 42)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _skeletonView(Color cardColor) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
      children: <Widget>[
        _skeletonCard(height: 110, cardColor: cardColor),
        const SizedBox(height: 12),
        _skeletonCard(height: 120, cardColor: cardColor),
        const SizedBox(height: 16),
        _skeletonCard(height: 220, cardColor: cardColor),
        const SizedBox(height: 16),
        _skeletonCard(height: 180, cardColor: cardColor),
      ],
    );
  }

  Widget _skeletonCard({required double height, required Color cardColor}) {
    return Container(
      height: height,
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.85),
          width: 1.1,
        ),
      ),
      child: const Center(
        child: SizedBox(
          width: 22,
          height: 22,
          child: CircularProgressIndicator(strokeWidth: 2.3),
        ),
      ),
    );
  }

  Widget _glassCard({required Color cardColor, required Widget child}) {
    return Container(
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.82),
          width: 1.2,
        ),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: AppColors.primaryDark.withValues(alpha: 0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: child,
      ),
    );
  }
}

class _WasteStream {
  const _WasteStream({
    required this.id,
    required this.title,
    required this.icon,
    required this.accent,
    required this.valueEstimate,
    required this.investmentTag,
    required this.setupCost,
    required this.monthlyReturn,
    required this.timeToIncome,
    required this.materials,
    required this.steps,
    required this.schemeKeywords,
    required this.chatPrompt,
  });

  final String id;
  final String title;
  final IconData icon;
  final Color accent;
  final String valueEstimate;
  final String investmentTag;
  final String setupCost;
  final String monthlyReturn;
  final String timeToIncome;
  final List<String> materials;
  final List<String> steps;
  final List<String> schemeKeywords;
  final String chatPrompt;
}

class _QuickTask {
  const _QuickTask({
    required this.id,
    required this.title,
    required this.subtitle,
  });

  final String id;
  final String title;
  final String subtitle;
}

class _ImpactMetrics {
  const _ImpactMetrics({
    required this.monthlyEarnings,
    required this.annualSavings,
    required this.co2PreventedKg,
  });

  final double monthlyEarnings;
  final double annualSavings;
  final double co2PreventedKg;
}
