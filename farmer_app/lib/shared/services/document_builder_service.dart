import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/network/api_client.dart';
import '../../core/network/api_endpoints.dart';
import '../../core/utils/app_cache.dart';
import '../models/document_builder_model.dart';

/// Service for the AI-powered document builder (form auto-fill from OCR).
class DocumentBuilderService {
  final ApiClient _client;
  static const String _localVaultKey = 'document_vault_v1';
  static const int _ttlSchemes = 1800;
  static const int _ttlSchemeForm = 1800;

  DocumentBuilderService(this._client);

  String _schemeFormCacheKey(String schemeId) =>
      'doc_builder:scheme_form:${schemeId.toLowerCase()}';

  String _normalizeSchemeKey(String value) => value.trim().toLowerCase();

  Future<String?> _resolveCanonicalSchemeId(String schemeId) async {
    final target = _normalizeSchemeKey(schemeId);
    if (target.isEmpty) return null;

    final schemes = await listSchemes(preferCache: true, forceRefresh: false);
    for (final scheme in schemes) {
      final candidateKeys = <String>[
        (scheme['id'] ?? '').toString(),
        (scheme['scheme_id'] ?? '').toString(),
        (scheme['short_name'] ?? '').toString(),
        (scheme['name'] ?? '').toString(),
      ];
      final isMatch = candidateKeys.any(
        (key) => key.trim().isNotEmpty && _normalizeSchemeKey(key) == target,
      );
      if (!isMatch) continue;

      final canonical = (scheme['id'] ?? scheme['scheme_id'] ?? '')
          .toString()
          .trim();
      if (canonical.isNotEmpty) return canonical;
    }
    return null;
  }

  List<Map<String, dynamic>>? _listFromCache(dynamic cached) {
    if (cached is! List) return null;
    return cached
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e.cast<dynamic, dynamic>()))
        .toList(growable: false);
  }

  Map<String, dynamic>? _mapFromCache(dynamic cached) {
    if (cached is! Map) return null;
    return Map<String, dynamic>.from(cached.cast<dynamic, dynamic>());
  }

  /// GET /document-builder/schemes → list all schemes with form templates.
  Future<List<Map<String, dynamic>>> listSchemes({
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    const key = 'doc_builder:schemes';
    if (!forceRefresh && preferCache) {
      final cached = _listFromCache(await AppCache.get(key));
      if (cached != null) return cached;
    }

    final res = await _client.get(ApiEndpoints.docBuilderSchemes);
    final data = res.data;
    List<Map<String, dynamic>> out;
    if (data is Map && data['schemes'] is List) {
      out = (data['schemes'] as List)
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e.cast<dynamic, dynamic>()))
          .toList(growable: false);
    } else if (data is List) {
      out = data
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e.cast<dynamic, dynamic>()))
          .toList(growable: false);
    } else {
      out = <Map<String, dynamic>>[];
    }

    await AppCache.put(key, out, ttlSeconds: _ttlSchemes);
    return out;
  }

  /// GET /document-builder/schemes/{id} → get scheme form detail.
  Future<Map<String, dynamic>> getSchemeForm(
    String schemeId, {
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    final normalizedId = schemeId.trim();
    final key = _schemeFormCacheKey(normalizedId);
    if (!forceRefresh && preferCache) {
      final cached = _mapFromCache(await AppCache.get(key));
      if (cached != null) return cached;
    }

    Future<Map<String, dynamic>> fetchById(String id) async {
      final encoded = Uri.encodeComponent(id.trim());
      final res = await _client.get(ApiEndpoints.docBuilderSchemeById(encoded));
      return Map<String, dynamic>.from(
        (res.data as Map).cast<dynamic, dynamic>(),
      );
    }

    try {
      final data = await fetchById(normalizedId);
      await AppCache.put(key, data, ttlSeconds: _ttlSchemeForm);
      return data;
    } on DioException catch (e) {
      if (e.response?.statusCode != 404) rethrow;

      final canonicalId = await _resolveCanonicalSchemeId(normalizedId);
      if (canonicalId == null || canonicalId == normalizedId) rethrow;

      final data = await fetchById(canonicalId);
      await AppCache.put(key, data, ttlSeconds: _ttlSchemeForm);
      await AppCache.put(
        _schemeFormCacheKey(canonicalId),
        data,
        ttlSeconds: _ttlSchemeForm,
      );
      return data;
    }
  }

  /// POST /document-builder/sessions/start → start a form-fill session.
  Future<Map<String, dynamic>> startSession(
    String schemeId, {
    String? schemeName,
    String preferredFormat = 'html',
  }) async {
    final res = await _client.post(
      ApiEndpoints.docBuilderStartSession,
      data: {
        'scheme_id': schemeId,
        if (schemeName != null && schemeName.trim().isNotEmpty)
          'scheme_name': schemeName.trim(),
        'preferred_format': preferredFormat,
      },
    );
    return res.data as Map<String, dynamic>;
  }

  /// POST /document-builder/submit-field → submit a single field value.
  Future<Map<String, dynamic>> submitField({
    required String sessionId,
    required String fieldName,
    required String value,
  }) async {
    final res = await _client.post(
      ApiEndpoints.docBuilderSubmitAnswers(sessionId),
      data: {
        'answers': {fieldName: value},
      },
    );
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> submitFields({
    required String sessionId,
    required Map<String, String> values,
  }) async {
    final res = await _client.post(
      ApiEndpoints.docBuilderSubmitAnswers(sessionId),
      data: {'answers': values},
    );
    return res.data as Map<String, dynamic>;
  }

  /// POST /document-builder/sessions/{id}/generate → generate final output.
  Future<Map<String, dynamic>> generateDocument(
    String sessionId, {
    String format = 'html',
  }) async {
    final res = await _client.post(
      ApiEndpoints.docBuilderGenerateSession(sessionId),
      data: {'format': format},
    );
    final generated = Map<String, dynamic>.from(
      (res.data as Map).cast<dynamic, dynamic>(),
    );

    final session = await getSession(sessionId);
    final resolvedUrl = _resolveDocumentUrl(
      (generated['document_url'] ?? session['document_url'] ?? '').toString(),
    );
    return {
      ...session,
      ...generated,
      'document_html':
          generated['document_html'] ?? session['document_html'] ?? '',
      'document_url': resolvedUrl,
    };
  }

  /// POST /document-builder/extract-text → extract text from uploaded file via LangExtract OCR.
  Future<Map<String, dynamic>> extractText(
    String filePath, {
    required String sessionId,
  }) async {
    final bytes = await File(filePath).readAsBytes();
    final b64 = base64Encode(bytes);
    final fileName = filePath.split(RegExp(r'[\\/]')).last;

    final res = await _client.post(
      ApiEndpoints.docBuilderExtractSession(sessionId),
      data: {'file_content': b64, 'filename': fileName},
    );
    return res.data as Map<String, dynamic>;
  }

  /// GET /document-builder/sessions/{id} → get session status.
  Future<Map<String, dynamic>> getSession(String sessionId) async {
    final res = await _client.get(
      ApiEndpoints.docBuilderSessionById(sessionId),
    );
    return Map<String, dynamic>.from(
      (res.data as Map).cast<dynamic, dynamic>(),
    );
  }

  /// GET /document-builder/scheme-docs → list downloadable scheme PDFs.
  Future<List<Map<String, dynamic>>> listSchemeDocs() async {
    final res = await _client.get(ApiEndpoints.docBuilderSchemeDocs);
    final data = res.data;
    if (data is Map && data['documents'] is List) {
      return (data['documents'] as List).cast<Map<String, dynamic>>();
    }
    if (data is List) return data.cast<Map<String, dynamic>>();
    return [];
  }

  /// POST /document-builder/download-scheme-docs/{scheme}.
  Future<Map<String, dynamic>> downloadSchemeDocuments(String schemeKey) async {
    final encoded = Uri.encodeComponent(schemeKey);
    final res = await _client.post(
      ApiEndpoints.docBuilderDownloadSchemeDocs(encoded),
    );
    return Map<String, dynamic>.from(
      (res.data as Map).cast<dynamic, dynamic>(),
    );
  }

  /// GET /document-builder/scheme-docs/{scheme}.
  Future<List<Map<String, dynamic>>> listSchemeDocumentsByScheme(
    String schemeKey,
  ) async {
    final encoded = Uri.encodeComponent(schemeKey);
    final res = await _client.get(
      ApiEndpoints.docBuilderSchemeDocsByName(encoded),
    );
    final data = res.data;
    if (data is Map && data['documents'] is List) {
      return (data['documents'] as List)
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e.cast<dynamic, dynamic>()))
          .toList(growable: false);
    }
    return const <Map<String, dynamic>>[];
  }

  String schemeDocumentFileUrl({
    required String schemeKey,
    required String docName,
  }) {
    final scheme = Uri.encodeComponent(schemeKey);
    final doc = Uri.encodeComponent(docName);
    return _resolveDocumentUrl(
      ApiEndpoints.docBuilderSchemeDocFile(scheme, doc),
    );
  }

  Future<List<SavedDocument>> listSavedDocuments() async {
    final local = await _readLocalSavedDocuments();

    try {
      final res = await _client.get(ApiEndpoints.farmerProfile);
      final profile = Map<String, dynamic>.from(
        (res.data as Map).cast<dynamic, dynamic>(),
      );
      final remoteRaw = profile['saved_documents'];
      if (remoteRaw is List) {
        final remote = remoteRaw
            .whereType<Map>()
            .map((e) => SavedDocument.fromJson(Map<String, dynamic>.from(e)))
            .map(_withResolvedUrl)
            .toList(growable: false);
        final merged = _mergeSavedDocuments(local, remote);
        await _writeLocalSavedDocuments(merged);
        return merged;
      }
    } catch (_) {
      // Fallback to local vault cache.
    }

    return local;
  }

  Future<List<SavedDocument>> saveDocumentToProfile(SavedDocument doc) async {
    final existing = await listSavedDocuments();
    final merged = _mergeSavedDocuments(existing, <SavedDocument>[
      _withResolvedUrl(doc),
    ]);

    try {
      await _client.patch(
        ApiEndpoints.farmerMe,
        data: {
          'saved_documents': merged
              .map(
                (d) => {
                  'scheme_id': d.schemeId,
                  'scheme_name': d.schemeName,
                  'session_id': d.sessionId,
                  'document_url': d.documentUrl,
                  'generated_at': d.generatedAt.toIso8601String(),
                },
              )
              .toList(growable: false),
        },
      );
    } catch (_) {
      // Local fallback still gives the farmer a usable vault.
    }

    await _writeLocalSavedDocuments(merged);
    return merged;
  }

  Future<GeneratedDocumentFile?> downloadGeneratedDocumentFile(
    String sessionId,
  ) async {
    try {
      final response = await _client.get<List<int>>(
        ApiEndpoints.docBuilderDownloadSession(sessionId),
        options: Options(responseType: ResponseType.bytes),
      );

      final bytes = response.data;
      if (bytes == null || bytes.isEmpty) return null;

      final contentType =
          response.headers.value('content-type')?.toLowerCase() ?? '';
      final disposition = response.headers.value('content-disposition') ?? '';
      final serverFilename = _extractFilename(disposition);

      final extension = _extensionForContentType(contentType, serverFilename);
      final tempDir = await getTemporaryDirectory();
      final filename = serverFilename.isNotEmpty
          ? serverFilename
          : 'application_$sessionId$extension';
      final file = File('${tempDir.path}/$filename');
      await file.writeAsBytes(bytes, flush: true);

      return GeneratedDocumentFile(
        file: file,
        contentType: contentType,
        fromServer: true,
      );
    } catch (_) {
      return null;
    }
  }

  List<SavedDocument> _mergeSavedDocuments(
    List<SavedDocument> base,
    List<SavedDocument> incoming,
  ) {
    final bySession = <String, SavedDocument>{
      for (final item in base)
        if (item.sessionId.trim().isNotEmpty) item.sessionId.trim(): item,
    };

    for (final item in incoming) {
      final key = item.sessionId.trim();
      if (key.isEmpty) continue;
      bySession[key] = item;
    }

    final merged = bySession.values.toList(growable: false)
      ..sort((a, b) => b.generatedAt.compareTo(a.generatedAt));
    return merged;
  }

  Future<List<SavedDocument>> _readLocalSavedDocuments() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_localVaultKey);
    if (raw == null || raw.trim().isEmpty) return const <SavedDocument>[];

    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return const <SavedDocument>[];
      return decoded
          .whereType<Map>()
          .map((e) => SavedDocument.fromJson(Map<String, dynamic>.from(e)))
          .map(_withResolvedUrl)
          .toList(growable: false);
    } catch (_) {
      return const <SavedDocument>[];
    }
  }

  Future<void> _writeLocalSavedDocuments(List<SavedDocument> docs) async {
    final prefs = await SharedPreferences.getInstance();
    final jsonList = docs.map((e) => e.toJson()).toList(growable: false);
    await prefs.setString(_localVaultKey, jsonEncode(jsonList));
  }

  SavedDocument _withResolvedUrl(SavedDocument doc) {
    return SavedDocument(
      schemeId: doc.schemeId,
      schemeName: doc.schemeName,
      sessionId: doc.sessionId,
      documentUrl: _resolveDocumentUrl(doc.documentUrl),
      generatedAt: doc.generatedAt,
      status: doc.status,
    );
  }

  String _resolveDocumentUrl(String rawUrl) {
    final value = rawUrl.trim();
    if (value.isEmpty) return value;

    final parsed = Uri.tryParse(value);
    if (parsed == null) return value;
    if (parsed.hasScheme) return parsed.toString();

    final base = Uri.tryParse(_client.dio.options.baseUrl);
    if (base == null) return value;
    return base.resolveUri(parsed).toString();
  }

  String _extractFilename(String disposition) {
    final match = RegExp(
      r'filename="?([^";]+)"?',
      caseSensitive: false,
    ).firstMatch(disposition);
    if (match == null) return '';
    return (match.group(1) ?? '').trim();
  }

  String _extensionForContentType(String contentType, String filename) {
    final lowerName = filename.toLowerCase();
    if (lowerName.endsWith('.pdf')) {
      return '.pdf';
    }
    if (lowerName.endsWith('.html') || lowerName.endsWith('.htm')) {
      return '.html';
    }
    if (contentType.contains('application/pdf')) {
      return '.pdf';
    }
    if (contentType.contains('text/html')) {
      return '.html';
    }
    return '.bin';
  }
}

class GeneratedDocumentFile {
  const GeneratedDocumentFile({
    required this.file,
    required this.contentType,
    required this.fromServer,
  });

  final File file;
  final String contentType;
  final bool fromServer;

  bool get isPdf =>
      contentType.contains('application/pdf') ||
      file.path.toLowerCase().endsWith('.pdf');
}

final documentBuilderServiceProvider = Provider<DocumentBuilderService>((ref) {
  return DocumentBuilderService(ref.watch(apiClientProvider));
});
