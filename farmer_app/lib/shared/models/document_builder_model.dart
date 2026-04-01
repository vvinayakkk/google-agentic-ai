/// Models for the Document Builder (form auto-fill with OCR).
library;

class SchemeForm {
  final String schemeId;
  final String name;
  final String? shortName;
  final String? description;
  final String? category;
  final List<DocFormField> formFields;
  final List<String> requiredDocuments;
  final String? applicationUrl;

  const SchemeForm({
    required this.schemeId,
    required this.name,
    this.shortName,
    this.description,
    this.category,
    this.formFields = const [],
    this.requiredDocuments = const [],
    this.applicationUrl,
  });

  factory SchemeForm.fromJson(Map<String, dynamic> json) => SchemeForm(
    schemeId: json['scheme_id']?.toString() ?? json['id']?.toString() ?? '',
    name: json['name']?.toString() ?? '',
    shortName: json['short_name']?.toString(),
    description: json['description']?.toString(),
    category: json['category']?.toString(),
    formFields:
        (json['form_fields'] as List<dynamic>?)
            ?.map((e) => DocFormField.fromJson(e as Map<String, dynamic>))
            .toList() ??
        [],
    requiredDocuments:
        (json['required_documents'] as List<dynamic>?)
            ?.map((e) => e.toString())
            .toList() ??
        [],
    applicationUrl: json['application_url']?.toString(),
  );
}

class DocFormField {
  final String name;
  final String label;
  final String type; // text, number, date, select, file
  final bool required;
  final String? hint;
  final List<String>? options;

  const DocFormField({
    required this.name,
    required this.label,
    this.type = 'text',
    this.required = false,
    this.hint,
    this.options,
  });

  factory DocFormField.fromJson(Map<String, dynamic> json) => DocFormField(
    name: json['name']?.toString() ?? '',
    label: json['label']?.toString() ?? json['name']?.toString() ?? '',
    type: json['type']?.toString() ?? 'text',
    required: json['required'] == true,
    hint: json['hint']?.toString(),
    options: (json['options'] as List<dynamic>?)
        ?.map((e) => e.toString())
        .toList(),
  );
}

class DocumentSession {
  final String sessionId;
  final String schemeId;
  final Map<String, String> filledFields;
  final List<String> remainingFields;
  final String status; // in_progress, completed, generated

  const DocumentSession({
    required this.sessionId,
    required this.schemeId,
    this.filledFields = const {},
    this.remainingFields = const [],
    this.status = 'in_progress',
  });

  factory DocumentSession.fromJson(Map<String, dynamic> json) =>
      DocumentSession(
        sessionId: json['session_id']?.toString() ?? '',
        schemeId: json['scheme_id']?.toString() ?? '',
        filledFields:
            (json['filled_fields'] as Map<String, dynamic>?)?.map(
              (k, v) => MapEntry(k, v.toString()),
            ) ??
            {},
        remainingFields:
            (json['remaining_fields'] as List<dynamic>?)
                ?.map((e) => e.toString())
                .toList() ??
            [],
        status: json['status']?.toString() ?? 'in_progress',
      );
}

class ExtractedData {
  final String documentType;
  final Map<String, String> fields;
  final double confidence;

  const ExtractedData({
    required this.documentType,
    this.fields = const {},
    this.confidence = 0.0,
  });

  factory ExtractedData.fromJson(Map<String, dynamic> json) => ExtractedData(
    documentType: json['document_type']?.toString() ?? 'unknown',
    fields:
        (json['fields'] as Map<String, dynamic>?)?.map(
          (k, v) => MapEntry(k, v.toString()),
        ) ??
        (json['extracted_data'] as Map<String, dynamic>?)?.map(
          (k, v) => MapEntry(k, v.toString()),
        ) ??
        {},
    confidence: (json['confidence'] as num?)?.toDouble() ?? 0.0,
  );
}

class SchemeDocument {
  final String filename;
  final String schemeName;
  final int? sizeBytes;
  final String? downloadUrl;

  const SchemeDocument({
    required this.filename,
    required this.schemeName,
    this.sizeBytes,
    this.downloadUrl,
  });

  factory SchemeDocument.fromJson(Map<String, dynamic> json) => SchemeDocument(
    filename: json['filename']?.toString() ?? '',
    schemeName: json['scheme_name']?.toString() ?? '',
    sizeBytes: json['size_bytes'] as int?,
    downloadUrl: json['download_url']?.toString(),
  );
}

class SavedDocument {
  final String schemeId;
  final String schemeName;
  final String sessionId;
  final String documentUrl;
  final DateTime generatedAt;
  final String status;

  const SavedDocument({
    required this.schemeId,
    required this.schemeName,
    required this.sessionId,
    required this.documentUrl,
    required this.generatedAt,
    this.status = 'Saved',
  });

  factory SavedDocument.fromJson(Map<String, dynamic> json) {
    final rawDate = (json['generated_at'] ?? '').toString();
    return SavedDocument(
      schemeId: (json['scheme_id'] ?? '').toString(),
      schemeName: (json['scheme_name'] ?? '').toString(),
      sessionId: (json['session_id'] ?? '').toString(),
      documentUrl: (json['document_url'] ?? '').toString(),
      generatedAt: DateTime.tryParse(rawDate) ?? DateTime.now(),
      status: (json['status'] ?? 'Saved').toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'scheme_id': schemeId,
    'scheme_name': schemeName,
    'session_id': sessionId,
    'document_url': documentUrl,
    'generated_at': generatedAt.toIso8601String(),
    'status': status,
  };
}
