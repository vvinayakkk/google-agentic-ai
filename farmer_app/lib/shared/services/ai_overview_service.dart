import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/utils/app_cache.dart';
import 'agent_service.dart';
import 'personalization_service.dart';

class AiOverviewResult {
  const AiOverviewResult({
    required this.summary,
    required this.details,
    required this.updatedAt,
    this.isFromCache = false,
  });

  final String summary;
  final String details;
  final DateTime updatedAt;
  final bool isFromCache;

  Map<String, dynamic> toJson() => {
        'summary': summary,
        'details': details,
        'updated_at': updatedAt.toIso8601String(),
      };

  static AiOverviewResult? fromCache(dynamic cached) {
    if (cached is! Map) return null;
    final map = Map<String, dynamic>.from(cached.cast<dynamic, dynamic>());
    final summary = (map['summary'] ?? '').toString().trim();
    final details = (map['details'] ?? '').toString().trim();
    final updatedRaw = (map['updated_at'] ?? '').toString();
    final updatedAt = DateTime.tryParse(updatedRaw);
    if (summary.isEmpty || details.isEmpty || updatedAt == null) return null;
    return AiOverviewResult(
      summary: summary,
      details: details,
      updatedAt: updatedAt,
      isFromCache: true,
    );
  }
}

class AiOverviewService {
  AiOverviewService(this._ref);

  final Ref _ref;

  String _cacheKey(String key) => 'ai_overview_$key';

  Future<AiOverviewResult?> getCached(String key) async {
    final cached = await AppCache.get(_cacheKey(key));
    return AiOverviewResult.fromCache(cached);
  }

  Future<AiOverviewResult> generate({
    required String key,
    required String pageName,
    required String languageCode,
    required List<String> nearbyData,
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
      maxSnippets: 8,
      maxChars: 900,
    );

    final prompt = [
      'You are generating an AI overview card for a farmer app screen.',
      'Use the farmer profile and nearby data below.',
      'Rules:',
      '- Keep it personalized for farmer location.',
      '- Keep answer concise but practical.',
      '- Output exactly 2 lines only.',
      '- Line 1: short summary (max 18 words).',
      '- Line 2: actionable recommendation (max 55 words).',
      '',
      contextBlock,
    ].join('\n');

    final response = await _ref.read(agentServiceProvider).chat(
          message: prompt,
          language: languageCode,
        );

    final raw = (response['response'] ?? '').toString().trim();
    final lines = raw
        .split('\n')
        .map((l) => l.trim())
        .where((l) => l.isNotEmpty)
        .toList(growable: false);

    final fallbackSummary =
        'Personalized overview ready for ${pageName.toLowerCase()}.';
    final fallbackDetails =
        'Use nearby data and your profile context to decide the next action for today.';

    final result = AiOverviewResult(
      summary: lines.isNotEmpty ? lines.first : fallbackSummary,
      details: lines.length > 1 ? lines.sublist(1).join(' ') : fallbackDetails,
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
