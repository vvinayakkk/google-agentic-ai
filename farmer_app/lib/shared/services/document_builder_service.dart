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
  static const int _ttlSchemeDocs = 21600;
  static const String _allSchemeDocsCacheKey = 'doc_builder:scheme_docs:all';
  static final Map<String, GeneratedDocumentFile> _filePreviewCache =
      <String, GeneratedDocumentFile>{};

  DocumentBuilderService(this._client);

  String _schemeFormCacheKey(String schemeId) =>
      'doc_builder:scheme_form:${schemeId.toLowerCase()}';

  String _schemeDocsCacheKey(String schemeKey) {
    final normalized = _normalizeSchemeKey(schemeKey).replaceAll(' ', '_');
    return 'doc_builder:scheme_docs:$normalized';
  }

  String _schemeDocFileCacheKey(String schemeKey, String docName) {
    final s = _normalizeSchemeKey(schemeKey).replaceAll(' ', '_');
    final d = _normalizeSchemeKey(docName).replaceAll(' ', '_');
    return '$s::$d';
  }

  String _normalizeSchemeKey(String value) {
    return value
        .trim()
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9]+'), ' ')
        .trim();
  }

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

      final routeSafeCandidates = <String>[
        (scheme['short_name'] ?? '').toString().trim(),
        (scheme['scheme_id'] ?? '').toString().trim(),
        (scheme['id'] ?? '').toString().trim(),
        (scheme['name'] ?? '').toString().trim(),
      ];

      for (final candidate in routeSafeCandidates) {
        if (candidate.isEmpty) continue;
        if (!candidate.contains('/')) return candidate;
      }

      final fallback = routeSafeCandidates.firstWhere(
        (candidate) => candidate.isNotEmpty,
        orElse: () => '',
      );
      if (fallback.isNotEmpty) return fallback;
    }
    return null;
  }

  Future<String> _resolveRouteSafeSchemeKey(String schemeKey) async {
    final raw = schemeKey.trim();
    if (raw.isEmpty) return raw;

    final canonical = await _resolveCanonicalSchemeId(raw);
    final candidate = (canonical ?? raw).trim();
    if (candidate.isEmpty) return raw;

    // Slash-containing IDs cannot be used safely in path params.
    return candidate.replaceAll('/', '_');
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

  bool _schemeKeysMatch(String left, String right) {
    final a = _normalizeSchemeKey(left);
    final b = _normalizeSchemeKey(right);
    if (a.isEmpty || b.isEmpty) return false;
    if (a == b) return true;

    final aCompact = a.replaceAll(' ', '');
    final bCompact = b.replaceAll(' ', '');
    if (aCompact == bCompact) return true;

    return a.contains(b) || b.contains(a);
  }

  List<Map<String, dynamic>> _flattenAllSchemeDocsPayload(dynamic data) {
    if (data is List) {
      return data
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e.cast<dynamic, dynamic>()))
          .toList(growable: false);
    }

    if (data is! Map) return const <Map<String, dynamic>>[];

    final map = Map<String, dynamic>.from(data.cast<dynamic, dynamic>());
    final out = <Map<String, dynamic>>[];

    if (map['documents'] is List) {
      out.addAll(
        (map['documents'] as List).whereType<Map>().map(
          (e) => Map<String, dynamic>.from(e.cast<dynamic, dynamic>()),
        ),
      );
    }

    if (map['by_scheme'] is Map) {
      final byScheme = Map<String, dynamic>.from(
        (map['by_scheme'] as Map).cast<dynamic, dynamic>(),
      );
      byScheme.forEach((schemeKey, value) {
        if (value is! Map) return;
        final bucket = Map<String, dynamic>.from(
          value.cast<dynamic, dynamic>(),
        );
        final docs = bucket['documents'];
        if (docs is! List) return;

        for (final rawDoc in docs) {
          if (rawDoc is! Map) continue;
          final doc = Map<String, dynamic>.from(
            rawDoc.cast<dynamic, dynamic>(),
          );
          out.add(<String, dynamic>{
            ...doc,
            'scheme': (doc['scheme'] ?? schemeKey).toString(),
            'scheme_name': (doc['scheme_name'] ?? schemeKey).toString(),
            'scheme_count': bucket['count'],
            'scheme_size': bucket['size'],
            'exists': doc['exists'] ?? true,
          });
        }
      });
    }

    if (map['documents'] is Map) {
      final docsMap = Map<String, dynamic>.from(
        (map['documents'] as Map).cast<dynamic, dynamic>(),
      );
      docsMap.forEach((docId, value) {
        if (value is! Map) return;
        final doc = Map<String, dynamic>.from(value.cast<dynamic, dynamic>());
        out.add(<String, dynamic>{
          ...doc,
          'doc_id': docId,
          'exists': doc['exists'] ?? true,
        });
      });
    }

    return out;
  }

  List<Map<String, dynamic>> _filterDocsByScheme(
    List<Map<String, dynamic>> docs,
    String schemeKey,
  ) {
    return docs
        .where((doc) {
          final docScheme = (doc['scheme'] ?? doc['scheme_name'] ?? '')
              .toString();
          return _schemeKeysMatch(docScheme, schemeKey);
        })
        .toList(growable: false);
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

    try {
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
    } catch (_) {
      final stale = _listFromCache(await AppCache.getStale(key));
      if (stale != null) return stale;
      return <Map<String, dynamic>>[];
    }
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

    final tried = <String>{};
    final candidates = <String>[];
    void pushCandidate(String value) {
      final trimmed = value.trim();
      if (trimmed.isEmpty) return;
      if (tried.add(trimmed)) {
        candidates.add(trimmed);
      }
    }

    pushCandidate(await _resolveRouteSafeSchemeKey(normalizedId));
    pushCandidate(normalizedId.replaceAll('/', '_'));
    if (!normalizedId.contains('/')) {
      pushCandidate(normalizedId);
    }

    DioException? lastDioError;
    for (final candidate in candidates) {
      try {
        final data = await fetchById(candidate);
        await AppCache.put(key, data, ttlSeconds: _ttlSchemeForm);
        await AppCache.put(
          _schemeFormCacheKey(candidate),
          data,
          ttlSeconds: _ttlSchemeForm,
        );
        return data;
      } on DioException catch (e) {
        lastDioError = e;
        if (e.response?.statusCode == 404) {
          continue;
        }
        final stale = _mapFromCache(await AppCache.getStale(key));
        if (stale != null) return stale;
        return <String, dynamic>{
          'scheme_id': normalizedId,
          'fields': <Map<String, dynamic>>[],
          'stale': true,
          'source': 'offline_fallback',
        };
      }
    }

    if (lastDioError != null) {
      final stale = _mapFromCache(await AppCache.getStale(key));
      if (stale != null) return stale;
      return <String, dynamic>{
        'scheme_id': normalizedId,
        'fields': <Map<String, dynamic>>[],
        'stale': true,
        'source': 'offline_fallback',
      };
    }

    final stale = _mapFromCache(await AppCache.getStale(key));
    if (stale != null) return stale;
    return <String, dynamic>{
      'scheme_id': normalizedId,
      'fields': <Map<String, dynamic>>[],
      'stale': true,
      'source': 'offline_fallback',
    };
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
    String? sourceDocumentName,
  }) async {
    final res = await _client.post(
      ApiEndpoints.docBuilderGenerateSession(sessionId),
      data: {
        'format': format,
        if (sourceDocumentName != null && sourceDocumentName.trim().isNotEmpty)
          'source_document_name': sourceDocumentName.trim(),
      },
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
  Future<List<Map<String, dynamic>>> getCachedSchemeDocs() async {
    final cached = _listFromCache(await AppCache.get(_allSchemeDocsCacheKey));
    return cached ?? const <Map<String, dynamic>>[];
  }

  Future<List<Map<String, dynamic>>> getCachedSchemeDocumentsByScheme(
    String schemeKey,
  ) async {
    final key = _schemeDocsCacheKey(schemeKey);
    final cached = _listFromCache(await AppCache.get(key));
    return cached ?? const <Map<String, dynamic>>[];
  }

  Future<List<Map<String, dynamic>>> listSchemeDocs({
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    if (!forceRefresh && preferCache) {
      final cached = await getCachedSchemeDocs();
      if (cached.isNotEmpty) return cached;
    }

    try {
      final res = await _client.get(ApiEndpoints.docBuilderSchemeDocs);
      final out = _flattenAllSchemeDocsPayload(res.data);
      await AppCache.put(
        _allSchemeDocsCacheKey,
        out,
        ttlSeconds: _ttlSchemeDocs,
      );
      return out;
    } catch (_) {
      final stale = _listFromCache(
        await AppCache.getStale(_allSchemeDocsCacheKey),
      );
      if (stale != null) return stale;
      return <Map<String, dynamic>>[];
    }
  }

  /// POST /document-builder/download-scheme-docs/{scheme}.
  Future<Map<String, dynamic>> downloadSchemeDocuments(String schemeKey) async {
    final routeKey = await _resolveRouteSafeSchemeKey(schemeKey);
    final encoded = Uri.encodeComponent(routeKey);
    final res = await _client.post(
      ApiEndpoints.docBuilderDownloadSchemeDocs(encoded),
    );
    await AppCache.invalidate(_schemeDocsCacheKey(schemeKey));
    await AppCache.invalidate(_schemeDocsCacheKey(routeKey));
    await AppCache.invalidate(_allSchemeDocsCacheKey);
    return Map<String, dynamic>.from(
      (res.data as Map).cast<dynamic, dynamic>(),
    );
  }

  /// POST /document-builder/download-all-scheme-docs.
  Future<Map<String, dynamic>> downloadAllSchemeDocuments() async {
    final res = await _client.post(
      '${ApiEndpoints.docBuilderDownloadAllSchemeDocs}?wait=false',
      options: Options(
        sendTimeout: const Duration(minutes: 2),
        receiveTimeout: const Duration(minutes: 8),
      ),
    );
    await AppCache.invalidate(_allSchemeDocsCacheKey);
    await AppCache.invalidatePrefix('doc_builder:scheme_docs:');
    return Map<String, dynamic>.from(
      (res.data as Map).cast<dynamic, dynamic>(),
    );
  }

  /// GET /document-builder/download-all-scheme-docs/status.
  Future<Map<String, dynamic>> getDownloadAllSchemeDocumentsStatus() async {
    final res = await _client.get(
      '${ApiEndpoints.docBuilderDownloadAllSchemeDocs}/status',
    );
    return Map<String, dynamic>.from(
      (res.data as Map).cast<dynamic, dynamic>(),
    );
  }

  /// GET /document-builder/scheme-docs/{scheme}.
  Future<List<Map<String, dynamic>>> listSchemeDocumentsByScheme(
    String schemeKey, {
    bool preferCache = true,
    bool forceRefresh = false,
  }) async {
    final cacheKey = _schemeDocsCacheKey(schemeKey);
    if (!forceRefresh && preferCache) {
      final cached = _listFromCache(await AppCache.get(cacheKey));
      if (cached != null && cached.isNotEmpty) return cached;
    }

    final routeKey = await _resolveRouteSafeSchemeKey(schemeKey);
    final encoded = Uri.encodeComponent(routeKey);
    List<Map<String, dynamic>> docs = const <Map<String, dynamic>>[];
    try {
      final res = await _client.get(
        ApiEndpoints.docBuilderSchemeDocsByName(encoded),
      );
      final data = res.data;
      if (data is Map && data['documents'] is List) {
        docs = (data['documents'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e.cast<dynamic, dynamic>()))
            .toList(growable: false);
      }
    } catch (_) {
      docs = const <Map<String, dynamic>>[];
    }

    if (docs.isEmpty) {
      final all = await listSchemeDocs(
        preferCache: true,
        forceRefresh: forceRefresh,
      );
      docs = _filterDocsByScheme(all, schemeKey);
      if (docs.isEmpty && routeKey != schemeKey) {
        docs = _filterDocsByScheme(all, routeKey);
      }
    }

    await AppCache.put(cacheKey, docs, ttlSeconds: _ttlSchemeDocs);
    return docs;
  }

  String schemeDocumentFileUrl({
    required String schemeKey,
    required String docName,
  }) {
    final safeSchemeKey = schemeKey.trim().replaceAll('/', '_');
    final scheme = Uri.encodeComponent(safeSchemeKey);
    final doc = Uri.encodeComponent(docName);
    return _resolveDocumentUrl(
      ApiEndpoints.docBuilderSchemeDocFile(scheme, doc),
    );
  }

  Future<GeneratedDocumentFile?> downloadSchemeDocumentFile({
    required String schemeKey,
    required String docName,
  }) async {
    final routeKey = await _resolveRouteSafeSchemeKey(schemeKey);
    final scheme = Uri.encodeComponent(routeKey);
    final doc = Uri.encodeComponent(docName);
    final cacheKey = _schemeDocFileCacheKey(schemeKey, docName);

    final cached = _filePreviewCache[cacheKey];
    if (cached != null && await cached.file.exists()) {
      return cached;
    }

    try {
      final response = await _client.get<List<int>>(
        ApiEndpoints.docBuilderSchemeDocFile(scheme, doc),
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
      final fallbackName = docName.trim().isEmpty
          ? 'scheme_document$extension'
          : docName.trim();
      final filename = serverFilename.isNotEmpty
          ? serverFilename
          : (fallbackName.toLowerCase().endsWith(extension)
                ? fallbackName
                : '$fallbackName$extension');
      final file = File('${tempDir.path}/$filename');
      await file.writeAsBytes(bytes, flush: true);

      final generated = GeneratedDocumentFile(
        file: file,
        contentType: contentType,
        fromServer: true,
      );
      _filePreviewCache[cacheKey] = generated;
      return generated;
    } catch (_) {
      return null;
    }
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
    if (lowerName.endsWith('.docx')) {
      return '.docx';
    }
    if (lowerName.endsWith('.doc')) {
      return '.doc';
    }
    if (lowerName.endsWith('.xlsx')) {
      return '.xlsx';
    }
    if (lowerName.endsWith('.xls')) {
      return '.xls';
    }
    if (lowerName.endsWith('.html') || lowerName.endsWith('.htm')) {
      return '.html';
    }
    if (contentType.contains('application/pdf')) {
      return '.pdf';
    }
    if (contentType.contains('officedocument.wordprocessingml.document')) {
      return '.docx';
    }
    if (contentType.contains('application/msword')) {
      return '.doc';
    }
    if (contentType.contains('spreadsheet') ||
        contentType.contains('application/vnd.ms-excel')) {
      return '.xlsx';
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
