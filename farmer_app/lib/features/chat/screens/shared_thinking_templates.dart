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

  static List<String> buildThoughtTemplates({
    required String phase,
    String? contextHint,
  }) {
    final cleanPhase = phase.trim();
    final hint = (contextHint ?? '').trim();
    final lines = <String>[
      'Reading your message carefully',
      'Detecting language and intent',
      'Checking your recent chat context',
      'Planning the best next response',
    ];

    if (cleanPhase.isNotEmpty) {
      lines.add('Current phase: $cleanPhase');
    }

    if (hint.isNotEmpty) {
      if (_marketRx.hasMatch(hint)) {
        lines.add('Looking at market and mandi intent signals');
      }
      if (_weatherRx.hasMatch(hint)) {
        lines.add('Checking weather risk and forecast cues');
      }
      if (_schemeRx.hasMatch(hint)) {
        lines.add('Evaluating scheme and eligibility context');
      }
      if (_equipmentRx.hasMatch(hint)) {
        lines.add('Preparing equipment and rental guidance');
      }
      if (_calendarRx.hasMatch(hint)) {
        lines.add('Checking calendar and reminder intent');
      }
    }

    lines.addAll(const <String>[
      'Validating action suggestions relevance',
      'Composing response in your detected language',
      'Final quality check before sending',
    ]);

    return lines;
  }
}
