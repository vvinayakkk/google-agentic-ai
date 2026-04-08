import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_endpoints.dart';

// ═══════════════════════════════════════════════════════════════
//  Agent (Chat / RAG) Service
// ═══════════════════════════════════════════════════════════════

class AgentService {
  final ApiClient _client;

  AgentService(this._client);

  // ── Chat ──────────────────────────────────────────────────

  /// POST /api/v1/agent/chat → {response, session_id}.
  Future<Map<String, dynamic>> chat({
    required String message,
    String? language,
    String? sessionId,
    String? agentType,
    String? responseMode,
  }) async {
    final res = await _client.post(
      ApiEndpoints.agentChat,
      data: {
        'message': message,
        if (language != null) 'language': language,
        if (sessionId != null) 'session_id': sessionId,
        if (agentType != null) 'agent_type': agentType,
        if (responseMode != null) 'response_mode': responseMode,
      },
    );
    return res.data as Map<String, dynamic>;
  }

  /// POST /api/v1/agent/chat/prepare -> fast partial response + request_id.
  Future<Map<String, dynamic>> prepareChat({
    required String message,
    String? language,
    String? sessionId,
    String? agentType,
    bool allowFallback = true,
    String? responseMode,
  }) async {
    final res = await _client.post(
      ApiEndpoints.agentChatPrepare,
      data: {
        'message': message,
        if (language != null) 'language': language,
        if (sessionId != null) 'session_id': sessionId,
        if (agentType != null) 'agent_type': agentType,
        'allow_fallback': allowFallback,
        if (responseMode != null) 'response_mode': responseMode,
      },
    );
    return res.data as Map<String, dynamic>;
  }

  /// POST /api/v1/agent/chat/finalize -> poll completion using request_id.
  Future<Map<String, dynamic>> finalizeChat({
    required String requestId,
    double timeoutSeconds = 0,
  }) async {
    final res = await _client.post(
      ApiEndpoints.agentChatFinalize,
      data: {'request_id': requestId, 'timeout_seconds': timeoutSeconds},
    );
    return res.data as Map<String, dynamic>;
  }

  // ── Sessions ──────────────────────────────────────────────

  /// GET /api/v1/agent/sessions → {sessions: [...]}.
  Future<Map<String, dynamic>> listSessions() async {
    final res = await _client.get(ApiEndpoints.agentSessions);
    return res.data as Map<String, dynamic>;
  }

  /// GET /api/v1/agent/sessions/{id} → session history.
  Future<Map<String, dynamic>> getSession(String id) async {
    final sessionId = id.trim();
    if (sessionId.isEmpty) {
      return <String, dynamic>{'messages': <dynamic>[]};
    }
    final res = await _client.get(ApiEndpoints.agentSessionById(sessionId));
    return res.data as Map<String, dynamic>;
  }

  /// DELETE /api/v1/agent/sessions/{id}.
  Future<void> deleteSession(String id) async {
    final sessionId = id.trim();
    if (sessionId.isEmpty) return;
    await _client.delete(ApiEndpoints.agentSessionById(sessionId));
  }

  /// DELETE /api/v1/agent/sessions.
  Future<Map<String, dynamic>> deleteAllSessions() async {
    final res = await _client.delete(ApiEndpoints.agentSessions);
    return (res.data as Map<String, dynamic>?) ?? <String, dynamic>{};
  }

  // ── RAG search ────────────────────────────────────────────

  /// POST /api/v1/agent/search → {results: [...]}.
  Future<Map<String, dynamic>> search({
    required String query,
    String? collection,
    int? topK,
  }) async {
    final res = await _client.post(
      ApiEndpoints.agentSearch,
      data: {
        'query': query,
        if (collection != null) 'collection': collection,
        if (topK != null) 'top_k': topK,
      },
    );
    return res.data as Map<String, dynamic>;
  }
}

// ═══════════════════════════════════════════════════════════════
//  Voice Service
// ═══════════════════════════════════════════════════════════════

class VoiceService {
  final ApiClient _client;

  VoiceService(this._client);

  String _normalizeVoiceLanguage(String? language) {
    if (language == null || language.trim().isEmpty) return 'hi-IN';
    final raw = language.trim();
    if (raw.contains('-')) return raw;

    const mapping = {
      'en': 'en-IN',
      'hi': 'hi-IN',
      'bn': 'bn-IN',
      'gu': 'gu-IN',
      'kn': 'kn-IN',
      'ml': 'ml-IN',
      'mr': 'mr-IN',
      'od': 'od-IN',
      'pa': 'pa-IN',
      'ta': 'ta-IN',
      'te': 'te-IN',
    };
    return mapping[raw.toLowerCase()] ?? 'hi-IN';
  }

  // ── TTS ───────────────────────────────────────────────────

  /// POST /api/v1/voice/tts → binary audio/wav.
  Future<List<int>> tts({
    required String text,
    String? language,
    String? speaker,
  }) async {
    final normalizedLanguage = _normalizeVoiceLanguage(language);
    final res = await _client.post(
      ApiEndpoints.voiceTts,
      data: {
        'text': text,
        'language': normalizedLanguage,
        if (speaker != null) 'speaker': speaker,
      },
      options: Options(responseType: ResponseType.bytes),
    );
    return res.data as List<int>;
  }

  /// POST /api/v1/voice/tts/base64 → {audio_base64, format}.
  Future<Map<String, dynamic>> ttsBase64({
    required String text,
    String? language,
    String? speaker,
  }) async {
    final normalizedLanguage = _normalizeVoiceLanguage(language);
    final res = await _client.post(
      ApiEndpoints.voiceTtsBase64,
      data: {
        'text': text,
        'language': normalizedLanguage,
        if (speaker != null) 'speaker': speaker,
      },
    );
    return res.data as Map<String, dynamic>;
  }

  // ── STT ───────────────────────────────────────────────────

  /// POST /api/v1/voice/stt → multipart file + language → {transcript, language_code}.
  Future<Map<String, dynamic>> stt(String filePath, {String? language}) async {
    final normalizedLanguage = _normalizeVoiceLanguage(language);
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath),
      'language': normalizedLanguage,
    });
    final res = await _client.upload(ApiEndpoints.voiceStt, formData: formData);
    return res.data as Map<String, dynamic>;
  }

  // ── Voice command ─────────────────────────────────────────

  /// POST /api/v1/voice/command → multipart file → binary audio + headers.
  Future<List<int>> voiceCommand(
    String filePath, {
    String? language,
    String? sessionId,
  }) async {
    final normalizedLanguage = _normalizeVoiceLanguage(language);
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath),
      'language': normalizedLanguage,
      if (sessionId != null) 'session_id': sessionId,
    });
    final res = await _client.dio.post(
      ApiEndpoints.voiceCommand,
      data: formData,
      options: Options(
        contentType: 'multipart/form-data',
        responseType: ResponseType.bytes,
      ),
    );
    return res.data as List<int>;
  }

  /// POST /api/v1/voice/command/text
  /// → {transcript, response, audio_base64, session_id, language}.
  Future<Map<String, dynamic>> voiceCommandText(
    String filePath, {
    String? language,
    String? sessionId,
  }) async {
    final normalizedLanguage = _normalizeVoiceLanguage(language);
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath),
      'language': normalizedLanguage,
      if (sessionId != null) 'session_id': sessionId,
    });
    final res = await _client.upload(
      ApiEndpoints.voiceCommandText,
      formData: formData,
      options: Options(
        receiveTimeout: const Duration(seconds: 75),
        sendTimeout: const Duration(seconds: 75),
      ),
    );
    return res.data as Map<String, dynamic>;
  }
}

// ── Riverpod providers ──────────────────────────────────────────
final agentServiceProvider = Provider<AgentService>((ref) {
  return AgentService(ref.watch(apiClientProvider));
});

final voiceServiceProvider = Provider<VoiceService>((ref) {
  return VoiceService(ref.watch(apiClientProvider));
});
