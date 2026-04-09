class SharedThinkingTemplates {
  static const List<String> loadingHints = <String>[
    'Understanding your question...',
    'Detecting language and intent...',
    'Gathering profile and chat context...',
    'Planning agent workflow and tool calls...',
    'Collecting live data from services...',
    'Reasoning over retrieved evidence...',
    'Drafting a farmer-friendly answer...',
    'Verifying suggestions and next actions...',
    'Finalizing response...',
  ];

  static const List<String> _coreVariants = <String>[
    'Reading your message carefully',
    'Detecting language and intent',
    'Checking your recent chat context',
    'Planning the best next response',
    'Reviewing prior turn continuity',
    'Identifying the main goal of this request',
    'Separating key details from background text',
    'Checking if this needs fresh live data',
    'Validating if location context is required',
    'Mapping your request to the right tool path',
    'Preparing a concise and useful answer structure',
    'Checking if follow-up actions should be suggested',
    'Resolving possible ambiguity in your wording',
    'Keeping your preferred language and style in mind',
    'Balancing speed with response quality',
    'Cross-checking for conflicting signals in context',
    'Prioritizing high-impact points first',
    'Filtering noise from the question intent',
    'Aligning response format with app actions',
    'Selecting a response tone suited for guidance',
    'Preparing references for practical next steps',
    'Checking whether your question is multi-part',
    'Breaking the request into smaller decision blocks',
    'Evaluating confidence before final answer',
    'Verifying consistency with previous advice',
    'Matching suggestions with current user context',
    'Ensuring the answer is actionable and clear',
    'Reducing unnecessary complexity in the output',
    'Making sure the response stays on-topic',
    'Preparing a final quality pass',
    'Extracting priority entities from your input',
    'Checking for urgency and time-sensitive asks',
    'Choosing between quick reply and detailed reply',
    'Reviewing probable edge cases for this query',
    'Assembling evidence before response drafting',
    'Scanning for missing details that affect accuracy',
    'Ensuring instructions are practical for farmers',
    'Keeping response readable on mobile screens',
    'Maintaining continuity with conversation history',
    'Preparing structured hints for next actions',
    'Checking if this is advisory or transactional',
    'Estimating best pathway for tool orchestration',
    'Selecting reliable context for this turn',
    'Avoiding duplicate or circular guidance',
    'Applying language-aware phrasing preferences',
    'Evaluating whether clarification is needed',
    'Mapping answer sections for easy scanning',
    'Confirming intent confidence before conclusion',
    'Locking in final response plan',
    'Preparing final response rendering',
  ];

  // Market tool variants (50+)
  static const List<String> _marketVariants = <String>[
    'Reviewing mandi trend bands for your crop',
    'Comparing modal, min, and max market rates',
    'Checking recent price movement direction',
    'Looking for volatility spikes in local mandis',
    'Matching your crop with nearby market signals',
    'Scanning trade sentiment from latest price spread',
    'Checking if today looks buyer-favorable or seller-favorable',
    'Comparing district-level and state-level price context',
    'Assessing short-term sell timing cues',
    'Estimating risk from sudden mandi dips',
    'Checking if arrivals are pressuring rates',
    'Tracking likely support zone for your crop price',
    'Reviewing trend persistence from recent sessions',
    'Checking whether prices are range-bound today',
    'Comparing your ask with historical mode levels',
    'Analyzing spread between nearby mandis',
    'Checking outlier rates that may be non-representative',
    'Validating whether current rates are stable enough',
    'Reviewing sell-now versus hold signals',
    'Checking which market has better realization potential',
    'Evaluating tradeoff between distance and higher price',
    'Looking for abrupt reversal patterns',
    'Checking if trend is driven by temporary shocks',
    'Reviewing commodity-specific seasonality cues',
    'Comparing this week against last week trajectory',
    'Scanning for likely best window in next few days',
    'Evaluating confidence in market direction',
    'Checking if market momentum is weakening',
    'Reviewing likely resistance level for your crop',
    'Assessing downside cushion based on recent data',
    'Comparing cash market intensity across centers',
    'Checking whether local rates are lagging regional trend',
    'Reviewing practical sell strategy options',
    'Estimating short horizon price opportunity',
    'Checking market depth clues from spread behavior',
    'Analyzing if premium mandis justify transport effort',
    'Reviewing temporal pattern for intraday sentiment',
    'Checking consistency of reported mandi values',
    'Prioritizing actionable market moves for today',
    'Preparing market-based recommendation path',
    'Checking possible upside before next correction',
    'Evaluating downside risk if holding inventory',
    'Reviewing trend quality for decision confidence',
    'Checking pricing context against crop quality assumptions',
    'Scanning market pressure from supply-side signals',
    'Assessing practical route for better net realization',
    'Checking near-term market narrative for your query',
    'Reviewing crop-specific demand pulse indicators',
    'Comparing smart selling checkpoints',
    'Preparing final mandi recommendation inputs',
  ];

  // Weather tool variants (50+)
  static const List<String> _weatherVariants = <String>[
    'Checking short-range weather outlook for your location',
    'Reviewing rainfall probability and intensity window',
    'Analyzing temperature stress risk for your crop stage',
    'Checking wind impact on spray and field operations',
    'Reviewing humidity pattern for disease pressure cues',
    'Scanning cloud cover impact on evapotranspiration',
    'Checking rain timing against your planned activity',
    'Evaluating heat stress risk in coming days',
    'Assessing overnight temperature drop implications',
    'Checking weather volatility around key work windows',
    'Reviewing forecast confidence spread across intervals',
    'Checking if irrigation schedule needs adjustment',
    'Evaluating rainfall uncertainty for field planning',
    'Reviewing likely wet spell versus dry spell sequence',
    'Checking disease-favorable weather combinations',
    'Estimating crop comfort window from temperature band',
    'Reviewing wind safety for pesticide application',
    'Checking soil moisture implications from forecast rain',
    'Analyzing next 24 to 72 hour weather risk',
    'Checking for potential weather-related operation delays',
    'Reviewing heat index pressure for livestock context',
    'Checking fog or dew impacts where relevant',
    'Assessing weather suitability for harvest timing',
    'Reviewing likely drying conditions post-rain',
    'Checking if now is safer for spraying activity',
    'Analyzing stability of local forecast trend',
    'Reviewing expected rain break windows',
    'Checking operational risk from gusty wind periods',
    'Evaluating moisture-loss pressure from forecast profile',
    'Reviewing weather shift speed over next two days',
    'Checking potential thunderstorm disruption risk',
    'Evaluating temperature swing stress on sensitive crops',
    'Reviewing combined heat and humidity signal',
    'Checking likely irrigation opportunity slot',
    'Assessing weather risk to input application plans',
    'Reviewing forecast impact on labor scheduling',
    'Checking rainfall fit with sowing or transplant stage',
    'Evaluating runoff concern from high-intensity rain',
    'Reviewing weather-driven disease watch points',
    'Checking timing for safer field entry',
    'Analyzing resilience of forecast for decision quality',
    'Reviewing temperature threshold crossings',
    'Checking rain probability versus expected accumulation',
    'Assessing if a protective action is needed now',
    'Reviewing agronomic weather triggers for your request',
    'Checking micro-window for lower weather risk',
    'Evaluating near-term climate stress indicators',
    'Reviewing weather alignment with crop priorities',
    'Checking confidence before weather recommendation',
    'Preparing weather-safe guidance for next steps',
  ];

  // Scheme tool variants (50+)
  static const List<String> _schemeVariants = <String>[
    'Checking scheme intent and benefit category fit',
    'Reviewing likely eligibility factors from your context',
    'Mapping your query to relevant government programs',
    'Checking subsidy versus credit support pathways',
    'Reviewing required document readiness checkpoints',
    'Assessing enrollment prerequisites for this scheme type',
    'Checking if land and identity proofs may be required',
    'Reviewing common eligibility blockers to avoid',
    'Mapping state and central program overlap',
    'Checking likely application channel for your case',
    'Reviewing practical timeline expectations',
    'Checking if profile details are sufficient to proceed',
    'Reviewing benefit scope and coverage boundaries',
    'Checking whether this fits smallholder criteria',
    'Assessing likely document bundle completeness',
    'Reviewing next best scheme alternatives',
    'Checking if your query points to insurance support',
    'Evaluating if loan-linked schemes are relevant',
    'Reviewing probable match for income-support programs',
    'Checking how to reduce rejection risk early',
    'Reviewing application sequence and order of steps',
    'Checking profile fields needed for shortlist accuracy',
    'Analyzing scheme relevance by stated goal',
    'Reviewing which documents need pre-verification',
    'Checking possible route for assisted application',
    'Reviewing practical shortlist for quick action',
    'Checking if eligibility depends on location category',
    'Assessing if bank linkage steps are needed',
    'Reviewing expected processing path and waiting points',
    'Checking if this asks for grant, subsidy, or credit',
    'Reviewing constraints before form submission',
    'Checking if ownership and tenancy context matters',
    'Reviewing minimum data needed for guided apply',
    'Checking likely mandatory declarations',
    'Reviewing scheme suitability by use case',
    'Checking fallback options when primary scheme misses',
    'Assessing practical readiness for application start',
    'Reviewing guidance to avoid incomplete forms',
    'Checking if this needs district-level validation',
    'Reviewing benefit realization milestones',
    'Checking if renewal or periodic updates are required',
    'Reviewing simple action plan for first submission',
    'Checking linked portal and office pathways',
    'Assessing document confidence before recommendation',
    'Reviewing support pathways for first-time applicants',
    'Checking alignment with your stated farming objective',
    'Reviewing requirement clarity in plain language',
    'Checking quick-win schemes before advanced ones',
    'Evaluating final scheme ranking for your context',
    'Preparing clear apply-next guidance',
  ];

  // Equipment tool variants (50+)
  static const List<String> _equipmentVariants = <String>[
    'Checking equipment need against farm task type',
    'Reviewing rental versus ownership suitability',
    'Comparing likely operating cost and benefit',
    'Checking machine fit for crop and field condition',
    'Reviewing availability and booking feasibility',
    'Assessing practical equipment size compatibility',
    'Checking cost efficiency for your use window',
    'Reviewing urgency of mechanization for this task',
    'Comparing alternate machine options for same outcome',
    'Checking if hiring center route is better now',
    'Reviewing expected productivity gain potential',
    'Checking task timing versus machine access risk',
    'Assessing transport and turnaround practicality',
    'Reviewing likely rental rate reasonability',
    'Checking maintenance and reliability considerations',
    'Comparing labor substitution impact',
    'Reviewing fuel and runtime tradeoffs',
    'Checking if tool capacity matches field demand',
    'Assessing setup complexity for your scenario',
    'Reviewing shortlisting criteria for best fit machine',
    'Checking compatibility with farm power constraints',
    'Reviewing implement pairing suitability',
    'Checking if partial mechanization is better first',
    'Assessing expected time saved on operation',
    'Reviewing weather-sensitive equipment timing',
    'Checking risk from delayed machine access',
    'Reviewing realistic daily output assumptions',
    'Checking option quality against budget band',
    'Assessing service support availability nearby',
    'Reviewing renting strategy for peak demand days',
    'Checking whether booking in advance is needed',
    'Comparing flexibility across equipment choices',
    'Reviewing machine suitability for soil condition',
    'Checking if custom-hiring is cost-effective',
    'Assessing likely bottlenecks in deployment',
    'Reviewing add-on tool requirements',
    'Checking if ownership economics make sense now',
    'Assessing break-even direction for frequent use',
    'Reviewing practical shortlist for your task plan',
    'Checking local rate trend relevance',
    'Reviewing risk from machine downtime assumptions',
    'Checking if training or operator support is needed',
    'Assessing solution quality for small plots',
    'Reviewing route to reduce manual workload',
    'Checking machine option by urgency and budget',
    'Reviewing nearby alternatives for contingency',
    'Checking alignment with your current farm stage',
    'Assessing confidence in equipment recommendation',
    'Reviewing final machine-action sequence',
    'Preparing equipment guidance you can act on today',
  ];

  // Calendar tool variants (50+)
  static const List<String> _calendarVariants = <String>[
    'Checking task timing against your current schedule',
    'Reviewing reminder priority for this request',
    'Mapping your ask to calendar action steps',
    'Checking if this should be a one-time or recurring task',
    'Reviewing due-date urgency and lead time',
    'Checking schedule conflicts with existing events',
    'Reviewing practical reminder wording and timing',
    'Assessing best notification window for action',
    'Checking task dependencies before scheduling',
    'Reviewing likely completion window by context',
    'Checking if a follow-up reminder is useful',
    'Reviewing today versus tomorrow execution fit',
    'Assessing whether this is weather-sensitive scheduling',
    'Checking if event should be location-tagged',
    'Reviewing morning versus evening reminder utility',
    'Checking sequence order for multiple farm tasks',
    'Reviewing recurring cycle alignment with crop stage',
    'Checking practical cadence for repeated reminders',
    'Assessing schedule clarity before confirmation',
    'Reviewing conflict-free slot availability',
    'Checking if this task needs pre-check reminders',
    'Reviewing weekly planning impact of this event',
    'Checking if backup timing should be suggested',
    'Assessing reminder granularity for reliability',
    'Reviewing concise event title and action cue',
    'Checking calendar fit with field workload pattern',
    'Reviewing reminder persistence for high-priority tasks',
    'Checking if task duration estimate is realistic',
    'Assessing overlap with harvest or spraying windows',
    'Reviewing notification timing to avoid misses',
    'Checking if this should trigger a checklist flow',
    'Reviewing schedule readiness for immediate action',
    'Checking if recurring interval is too frequent',
    'Assessing practical timeline for execution quality',
    'Reviewing event details for clear follow-through',
    'Checking if a same-day nudge is needed',
    'Reviewing reminder plan for busy farm days',
    'Checking whether to attach context notes',
    'Assessing date precision needed for this task',
    'Reviewing calendar confidence before save',
    'Checking if this event needs escalation reminder',
    'Reviewing convenience of suggested reminder slots',
    'Checking sequence dependencies between tasks',
    'Assessing best checkpoint timing for progress',
    'Reviewing long-term recurrence practicality',
    'Checking if late reminder risk is acceptable',
    'Reviewing easy-to-execute calendar guidance',
    'Checking if reminder should align with market hours',
    'Assessing final event structure before output',
    'Preparing schedule-safe next actions',
  ];

  static const List<String> _closingVariants = <String>[
    'Validating action suggestions relevance',
    'Composing response in your detected language',
    'Final quality check before sending',
    'Checking recommendation clarity and confidence',
    'Formatting response for quick mobile reading',
    'Ensuring every recommendation has a clear next step',
    'Applying final consistency pass',
    'Preparing concise output with useful context',
    'Finalizing actionable guidance now',
    'Running one last coherence check',
    'Verifying practical usefulness before reply',
    'Polishing final response structure',
    'Balancing detail with simplicity in output',
    'Checking if follow-up prompts should be included',
    'Finalizing recommendation priorities',
    'Aligning answer with current app actions',
    'Completing final answer assembly',
    'Ensuring response is easy to apply in field conditions',
    'Preparing final response handoff',
    'Readying final answer for delivery',
  ];

  static final RegExp _marketRx = RegExp(
    r'market|mandi|price|rate|bhav|sell|buyer',
    caseSensitive: false,
  );
  static final RegExp _weatherRx = RegExp(
    r'weather|rain|forecast|temperature|humidity|wind',
    caseSensitive: false,
  );
  static final RegExp _schemeRx = RegExp(
    r'scheme|subsidy|eligibility|pm-kisan|kcc|pmfby|document',
    caseSensitive: false,
  );
  static final RegExp _equipmentRx = RegExp(
    r'equipment|rental|tractor|harvester|sprayer|machine',
    caseSensitive: false,
  );
  static final RegExp _calendarRx = RegExp(
    r'calendar|schedule|task|event|reminder',
    caseSensitive: false,
  );

  static int _stableSeed(String input) {
    var hash = 2166136261;
    for (final code in input.codeUnits) {
      hash ^= code;
      hash = (hash * 16777619) & 0x7fffffff;
    }
    return hash;
  }

  static List<String> _pickVariants(
    List<String> pool, {
    required int seed,
    required int count,
  }) {
    if (pool.isEmpty || count <= 0) return const <String>[];
    if (pool.length == 1) return <String>[pool.first];

    final result = <String>[];
    final seen = <int>{};

    final normalizedSeed = seed < 0 ? -seed : seed;
    var index = normalizedSeed % pool.length;
    var stride = (normalizedSeed % (pool.length - 1)) + 1;

    var attempts = 0;
    final maxAttempts = pool.length * 3;
    while (result.length < count && attempts < maxAttempts) {
      if (!seen.contains(index)) {
        seen.add(index);
        result.add(pool[index]);
      }
      index = (index + stride) % pool.length;
      attempts += 1;
    }

    return result;
  }

  static List<String> buildThoughtTemplates({
    required String phase,
    String? contextHint,
  }) {
    final cleanPhase = phase.trim();
    final hint = (contextHint ?? '').trim();
    final seed = _stableSeed('$cleanPhase|$hint');
    final lines = <String>[];

    lines.addAll(_pickVariants(_coreVariants, seed: seed + 11, count: 5));

    if (cleanPhase.isNotEmpty) {
      lines.add('Current phase: $cleanPhase');
    }

    if (hint.isNotEmpty) {
      if (_marketRx.hasMatch(hint)) {
        lines.addAll(_pickVariants(_marketVariants, seed: seed + 101, count: 4));
      }
      if (_weatherRx.hasMatch(hint)) {
        lines.addAll(_pickVariants(_weatherVariants, seed: seed + 202, count: 4));
      }
      if (_schemeRx.hasMatch(hint)) {
        lines.addAll(_pickVariants(_schemeVariants, seed: seed + 303, count: 4));
      }
      if (_equipmentRx.hasMatch(hint)) {
        lines.addAll(_pickVariants(_equipmentVariants, seed: seed + 404, count: 4));
      }
      if (_calendarRx.hasMatch(hint)) {
        lines.addAll(
          _pickVariants(_calendarVariants, seed: seed + 505, count: 4),
        );
      }
    }

    lines.addAll(_pickVariants(_closingVariants, seed: seed + 909, count: 3));

    return lines;
  }
}
