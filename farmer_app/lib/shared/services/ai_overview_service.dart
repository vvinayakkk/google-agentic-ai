import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/utils/app_cache.dart';
import 'agent_service.dart';
import 'personalization_service.dart';

class AiOverviewResult {
  const AiOverviewResult({
    required this.summary,
    required this.details,
    required this.updatedAt,
    this.actions = const <String>[],
    this.isFromCache = false,
  });

  final String summary;
  final String details;
  final DateTime updatedAt;
    final List<String> actions;
  final bool isFromCache;

  Map<String, dynamic> toJson() => {
        'summary': summary,
        'details': details,
        'updated_at': updatedAt.toIso8601String(),
      'actions': actions,
      };

  static AiOverviewResult? fromCache(dynamic cached) {
    if (cached is! Map) return null;
    final map = Map<String, dynamic>.from(cached.cast<dynamic, dynamic>());
    final summary = (map['summary'] ?? '').toString().trim();
    final details = (map['details'] ?? '').toString().trim();
    final actions = (map['actions'] as List?)
            ?.map((e) => e.toString().trim())
            .where((e) => e.isNotEmpty)
            .take(5)
            .toList(growable: false) ??
        const <String>[];
    final updatedRaw = (map['updated_at'] ?? '').toString();
    final updatedAt = DateTime.tryParse(updatedRaw);
    if (summary.isEmpty || details.isEmpty || updatedAt == null) return null;
    return AiOverviewResult(
      summary: summary,
      details: details,
      updatedAt: updatedAt,
      actions: actions,
      isFromCache: true,
    );
  }
}

class AiOverviewService {
  AiOverviewService(this._ref);

  final Ref _ref;

  String _cacheKey(String key) => 'ai_overview_$key';

  String _cleanLine(String input) {
    return input
        .replaceAll(RegExp(r'\s+'), ' ')
        .replaceAll(RegExp(r'^[-*•\d.)\s]+'), '')
        .trim();
  }

  String _sanitizeDetails(String input) {
    final normalized = input
        .replaceAll(RegExp(r'\r\n?'), '\n')
        .replaceAll(RegExp(r'\n{3,}'), '\n\n')
        .trim();
    return normalized;
  }

  Map<String, dynamic>? _decodeStructuredResponse(String raw) {
    if (raw.isEmpty) return null;

    try {
      final direct = jsonDecode(raw);
      if (direct is Map) {
        return Map<String, dynamic>.from(direct.cast<dynamic, dynamic>());
      }
    } catch (_) {
      // Fall through to bracket extraction.
    }

    final start = raw.indexOf('{');
    final end = raw.lastIndexOf('}');
    if (start < 0 || end <= start) return null;

    try {
      final snippet = raw.substring(start, end + 1);
      final parsed = jsonDecode(snippet);
      if (parsed is Map) {
        return Map<String, dynamic>.from(parsed.cast<dynamic, dynamic>());
      }
    } catch (_) {
      return null;
    }
    return null;
  }

  List<String> _extractActionsFromLines(List<String> lines) {
    final actions = <String>[];
    for (final line in lines) {
      final lower = line.toLowerCase();
      if (!lower.startsWith('action:') &&
          !lower.startsWith('next action:') &&
          !lower.startsWith('step:')) {
        continue;
      }
      final cleaned = _cleanLine(line.split(':').skip(1).join(':'));
      if (cleaned.isEmpty) continue;
      actions.add(cleaned);
      if (actions.length >= 5) break;
    }
    return actions;
  }

  Future<AiOverviewResult?> getCached(String key) async {
    final cached = await AppCache.get(_cacheKey(key));
    return AiOverviewResult.fromCache(cached);
  }

  Future<AiOverviewResult> generate({
    required String key,
    required String pageName,
    required String languageCode,
    required List<String> nearbyData,
    List<String> capabilities = const <String>[],
    bool forceRefresh = false,
    int ttlSeconds = 86400,
  }) async {
    if (!forceRefresh) {
      final cached = await getCached(key);
      if (cached != null) return cached;
    }

    final personalization = _ref.read(personalizationServiceProvider);
    final profile = await personalization.getProfileContext();
    final contextBlock = personalization.compactContext(
      pageName: pageName,
      profile: profile,
      snippets: nearbyData,
      maxSnippets: 12,
      maxChars: 2500,
    );

    final capabilitiesBlock = capabilities
        .map((c) => c.trim())
        .where((c) => c.isNotEmpty)
        .take(10)
        .map((c) => '- $c')
        .join('\n');

    final prompt = [
      'You are generating a dedicated AI OVERVIEW block for one specific app page.',
      'Page name: $pageName',
      'This is NOT a general chat response. It must be page-specific, data-aware, and COMPREHENSIVE.',
      '',
      'Return ONLY valid JSON with this exact shape:',
      '{"summary":"...","details":"...","actions":["...","...","...","..."]}',
      '',
      'Rules:',
      '- summary: 20-40 words, crisp and informative headline for this page right now. Include a specific data point.',
      '- details: 250-500 words, COMPREHENSIVE and practical. This is the main content block.',
      '  * Start with current situation assessment based on the data context provided.',
      '  * Identify 2-3 specific opportunities with concrete numbers or recommendations.',
      '  * Highlight 1-2 risk signals or things to watch out for.',
      '  * Provide step-by-step action guidance specific to this page.',
      '  * Include seasonal/timing considerations relevant to Indian farming.',
      '  * End with a forward-looking recommendation for the next 7-14 days.',
      '- details should tell user what to do NOW on this page with specific data references, not generic farming advice.',
      '- actions: exactly 4 action strings, each 5-14 words, imperative tone.',
      '- actions MUST align with available page capabilities listed below; do not invent unavailable features.',
      '- If uncertain, prefer chat-guided actions like "Ask AI in chat to ...".',
      '- Write in the language matching the language code below.',
      '- No markdown, no code fences, no extra keys.',
      '',
      'Available page capabilities:',
      if (capabilitiesBlock.isNotEmpty) capabilitiesBlock else '- Ask AI in chat for an action plan',
      '',
      'Context:',
      contextBlock,
    ].join('\n');

    final response = await _ref.read(agentServiceProvider).chat(
          message: prompt,
          language: languageCode,
        );

    final raw = (response['response'] ?? '').toString().trim();
    final parsed = _decodeStructuredResponse(raw);

    String summary = '';
    String details = '';
    List<String> actions = const <String>[];

    if (parsed != null) {
      summary = _cleanLine((parsed['summary'] ?? '').toString());
      details = _sanitizeDetails((parsed['details'] ?? '').toString());
      actions = (parsed['actions'] as List?)
              ?.map((e) => _cleanLine(e.toString()))
              .where((e) => e.isNotEmpty)
              .take(5)
              .toList(growable: false) ??
          const <String>[];
    }

    final lines = raw
        .split('\n')
        .map((l) => l.trim())
        .where((l) => l.isNotEmpty)
        .toList(growable: false);

    if (summary.isEmpty && lines.isNotEmpty) {
      summary = _cleanLine(lines.first);
    }

    if (details.isEmpty && lines.length > 1) {
      final nonActionLines = lines
          .where((line) {
            final lower = line.toLowerCase();
            return !lower.startsWith('action:') &&
                !lower.startsWith('next action:') &&
                !lower.startsWith('step:');
          })
          .skip(1)
          .join('\n');
      details = _sanitizeDetails(nonActionLines);
    }

    if (actions.isEmpty) {
      actions = _extractActionsFromLines(lines);
    }

    final fallbackSummary =
        'Comprehensive AI overview ready for ${pageName.toLowerCase()} — review current data and take action.';
    final fallbackDetails =
        'Based on your farm profile and the data available on this page, here is a comprehensive analysis to guide your next steps.\n\n'
        'Current Situation: Review the latest data points shown on this page to understand your current position. '
        'Look for any changes compared to your previous visit and note trends that could affect your farming decisions.\n\n'
        'Opportunities: Identify the highest-impact action you can take right now using the tools on this page. '
        'Consider seasonal timing — the current agricultural season presents specific windows of opportunity that should not be missed. '
        'Cross-reference with market conditions and weather forecasts for optimal decision-making.\n\n'
        'Risk Signals: Watch for any declining metrics or adverse conditions flagged in the data. '
        'Early intervention is key — addressing small issues now prevents larger problems during critical growth phases.\n\n'
        'Recommended Actions: Start with the most time-sensitive task, then work through routine maintenance items. '
        'Use the in-app AI chat for personalized step-by-step guidance on any complex decisions. '
        'Set calendar reminders for follow-up checks within the next 7 days to track progress on actions taken today.';
    final fallbackActions = capabilities
        .map(_cleanLine)
        .where((c) => c.isNotEmpty)
        .take(4)
        .toList(growable: false);

    final resolvedActions = actions.isNotEmpty
        ? actions
        : (fallbackActions.isNotEmpty
            ? fallbackActions
            : const <String>[
                'Ask AI in chat for a step-by-step plan',
                'Review and refresh current data on this page',
                'Open related tool and execute first task now',
                'Set reminders in calendar from chat guidance',
              ]);

    final normalizedDetails = details.isNotEmpty ? details : fallbackDetails;
    final detailsWithActions = [
      normalizedDetails,
      ...resolvedActions.map((a) => 'ACTION: $a'),
    ].join('\n');

    final result = AiOverviewResult(
      summary: summary.isNotEmpty ? summary : fallbackSummary,
      details: detailsWithActions,
      actions: resolvedActions,
      updatedAt: DateTime.now(),
      isFromCache: false,
    );

    await AppCache.put(_cacheKey(key), result.toJson(), ttlSeconds: ttlSeconds);
    return result;
  }
}

final aiOverviewServiceProvider = Provider<AiOverviewService>((ref) {
  return AiOverviewService(ref);
});
