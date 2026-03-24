import 'dart:convert';
import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_endpoints.dart';

/// Service for the AI-powered document builder (form auto-fill from OCR).
class DocumentBuilderService {
  final ApiClient _client;

  DocumentBuilderService(this._client);

  /// GET /document-builder/schemes → list all schemes with form templates.
  Future<List<Map<String, dynamic>>> listSchemes() async {
    final res = await _client.get(ApiEndpoints.docBuilderSchemes);
    final data = res.data;
    if (data is Map && data['schemes'] is List) {
      return (data['schemes'] as List).cast<Map<String, dynamic>>();
    }
    if (data is List) return data.cast<Map<String, dynamic>>();
    return [];
  }

  /// GET /document-builder/schemes/{id} → get scheme form detail.
  Future<Map<String, dynamic>> getSchemeForm(String schemeId) async {
    final res =
        await _client.get(ApiEndpoints.docBuilderSchemeById(schemeId));
    return res.data as Map<String, dynamic>;
  }

  /// POST /document-builder/start-session → start a form-fill session.
  Future<Map<String, dynamic>> startSession(String schemeId) async {
    final res = await _client.post(
      ApiEndpoints.docBuilderStartSession,
      data: {'scheme_name': schemeId},
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
        'answers': {
          fieldName: value,
        }
      },
    );
    return res.data as Map<String, dynamic>;
  }

  /// POST /document-builder/generate → generate final document.
  Future<Map<String, dynamic>> generateDocument(String sessionId) async {
    final res = await _client.get(ApiEndpoints.docBuilderSessionById(sessionId));
    return res.data as Map<String, dynamic>;
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
      data: {
        'file_content': b64,
        'filename': fileName,
      },
    );
    return res.data as Map<String, dynamic>;
  }

  /// GET /document-builder/sessions/{id} → get session status.
  Future<Map<String, dynamic>> getSession(String sessionId) async {
    final res =
        await _client.get(ApiEndpoints.docBuilderSessionById(sessionId));
    return res.data as Map<String, dynamic>;
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
}

final documentBuilderServiceProvider =
    Provider<DocumentBuilderService>((ref) {
  return DocumentBuilderService(ref.watch(apiClientProvider));
});
