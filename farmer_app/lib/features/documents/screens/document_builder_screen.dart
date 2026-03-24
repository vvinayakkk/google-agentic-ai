import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shimmer/shimmer.dart';
import 'package:file_picker/file_picker.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/app_cache.dart';
import '../../../shared/services/document_builder_service.dart';
import '../../../shared/models/document_builder_model.dart';

/// AI-powered Document Builder: auto-fill scheme applications from OCR.
class DocumentBuilderScreen extends ConsumerStatefulWidget {
  const DocumentBuilderScreen({super.key});

  @override
  ConsumerState<DocumentBuilderScreen> createState() =>
      _DocumentBuilderScreenState();
}

class _DocumentBuilderScreenState
    extends ConsumerState<DocumentBuilderScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  List<Map<String, dynamic>> _schemes = [];
  List<Map<String, dynamic>> _schemeDocs = [];
  bool _loading = true;

  // Form-fill state
  String? _sessionId;
  List<DocFormField> _formFields = [];
  final Map<String, TextEditingController> _controllers = {};
  int _currentFieldIdx = 0;
  bool _generating = false;
  String? _generatedHtml;
  ExtractedData? _extractedData;
  bool _extracting = false;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
    _loadSchemes();
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _loadSchemes() async {
    setState(() => _loading = true);
    final cached = await AppCache.get('doc_builder_schemes');
    if (cached != null && mounted) {
      setState(() {
        _schemes = (cached as List).cast<Map<String, dynamic>>();
        _loading = false;
      });
    }
    try {
      final svc = ref.read(documentBuilderServiceProvider);
      final results = await Future.wait([
        svc.listSchemes(),
        svc.listSchemeDocs(),
      ]);
      if (mounted) {
        await AppCache.put('doc_builder_schemes', results[0], ttlSeconds: 3600);
        setState(() {
          _schemes = List<Map<String, dynamic>>.from(results[0] as List);
          _schemeDocs = List<Map<String, dynamic>>.from(results[1] as List);
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted && _schemes.isEmpty) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _startSession(String schemeId) async {
    Haptics.medium();
    setState(() {
      _generating = false;
      _generatedHtml = null;
    });

    try {
      final svc = ref.read(documentBuilderServiceProvider);
      final session = await svc.startSession(schemeId);
      final docSession = DocumentSession.fromJson(session);

      // Build form field controllers
      _controllers.clear();
      final schemeData =
          _schemes.firstWhere((s) => s['scheme_id'] == schemeId || s['id'] == schemeId,
              orElse: () => {});
      final fields = (schemeData['form_fields'] as List<dynamic>?)
              ?.map((e) => DocFormField.fromJson(e as Map<String, dynamic>))
              .toList() ??
          docSession.remainingFields
              .map((f) => DocFormField(name: f, label: f))
              .toList();

      for (final f in fields) {
        _controllers[f.name] = TextEditingController(
          text: docSession.filledFields[f.name] ?? '',
        );
      }

      // Auto-fill extracted data if available
      if (_extractedData != null) {
        for (final entry in _extractedData!.fields.entries) {
          final key = entry.key.toLowerCase().replaceAll(' ', '_');
          if (_controllers.containsKey(key)) {
            _controllers[key]!.text = entry.value;
          }
        }
      }

      if (!mounted) return;
      setState(() {
        _sessionId = docSession.sessionId;
        _formFields = fields;
        _currentFieldIdx = 0;
      });
      _tabCtrl.animateTo(1);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  Future<void> _uploadAndExtract() async {
    Haptics.medium();
    if (_sessionId == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Start a session before extraction.')),
        );
      }
      return;
    }

    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
    );
    if (result == null || result.files.single.path == null) return;

    setState(() => _extracting = true);
    try {
      final svc = ref.read(documentBuilderServiceProvider);
      final extracted = await svc.extractText(
        result.files.single.path!,
        sessionId: _sessionId!,
      );
      final data = ExtractedData.fromJson(extracted);

      // Auto-fill matching controllers
      for (final entry in data.fields.entries) {
        final key = entry.key.toLowerCase().replaceAll(' ', '_');
        if (_controllers.containsKey(key)) {
          _controllers[key]!.text = entry.value;
        }
      }

      if (!mounted) return;
      setState(() {
        _extractedData = data;
        _extracting = false;
      });

      if (mounted) {
        Haptics.heavy();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                'Extracted ${data.fields.length} fields from ${data.documentType}'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) setState(() => _extracting = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Extraction failed: $e')),
        );
      }
    }
  }

  Future<void> _submitAllFields() async {
    Haptics.heavy();
    setState(() => _generating = true);
    try {
      final svc = ref.read(documentBuilderServiceProvider);

      // Submit all fields
      for (final field in _formFields) {
        final val = _controllers[field.name]?.text ?? '';
        if (val.isNotEmpty) {
          await svc.submitField(
            sessionId: _sessionId!,
            fieldName: field.name,
            value: val,
          );
        }
      }

      // Generate document
      final doc = await svc.generateDocument(_sessionId!);
      if (!mounted) return;
      setState(() {
        _generatedHtml =
            doc['html'] ?? doc['document'] ?? doc['document_url'] ?? '';
        _generating = false;
      });
      _tabCtrl.animateTo(2);
    } catch (e) {
      if (mounted) setState(() => _generating = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Generation failed: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = context.isDark;
    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        title: const Text('Document Builder'),
        bottom: TabBar(
          controller: _tabCtrl,
          tabs: const [
            Tab(icon: Icon(Icons.library_books), text: 'Schemes'),
            Tab(icon: Icon(Icons.edit_document), text: 'Fill Form'),
            Tab(icon: Icon(Icons.description), text: 'Preview'),
          ],
        ),
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? [AppColors.darkBackground, AppColors.darkSurface]
                : [AppColors.lightBackground, AppColors.lightSurface],
          ),
        ),
        child: TabBarView(
          controller: _tabCtrl,
          children: [
            _buildSchemesTab(theme),
            _buildFormTab(theme),
            _buildPreviewTab(theme),
          ],
        ),
      ),
    );
  }

  // ── Tab 1: Scheme Selection ──────────────────────────────

  Widget _buildSchemesTab(ThemeData theme) {
    if (_loading) {
      return Shimmer.fromColors(
        baseColor: Colors.grey[300]!,
        highlightColor: Colors.grey[100]!,
        child: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: 8,
          itemBuilder: (_, _) => Container(
            height: 80,
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadSchemes,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // OCR upload card
          Card(
            elevation: 0,
            color: theme.colorScheme.tertiaryContainer,
            child: ListTile(
              leading: _extracting
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : Icon(Icons.document_scanner,
                      color: theme.colorScheme.onTertiaryContainer),
              title: const Text('Upload Document for OCR'),
              subtitle: Text(_extractedData != null
                  ? '${_extractedData!.fields.length} fields extracted from ${_extractedData!.documentType}'
                  : 'Aadhaar, Land Record, Bank Passbook'),
              trailing: const Icon(Icons.upload_file),
              onTap: _extracting ? null : _uploadAndExtract,
            ),
          ).animate().fadeIn(duration: 300.ms),

          const SizedBox(height: 16),
          Text('Select a Scheme to Fill',
              style: theme.textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),

          ..._schemes.asMap().entries.map((entry) {
            final i = entry.key;
            final scheme = entry.value;
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor:
                      theme.colorScheme.primaryContainer,
                  child: Text(
                    '${i + 1}',
                    style: TextStyle(
                        color: theme.colorScheme.onPrimaryContainer),
                  ),
                ),
                title: Text(
                  scheme['name']?.toString() ?? 'Scheme',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                subtitle: Text(
                  scheme['category']?.toString().toUpperCase() ?? '',
                  style: const TextStyle(fontSize: 11),
                ),
                trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                onTap: () => _startSession(
                    scheme['scheme_id']?.toString() ??
                        scheme['id']?.toString() ??
                        ''),
              ),
            ).animate().fadeIn(delay: (50 * i).ms, duration: 200.ms);
          }),

          // Scheme documents section
          if (_schemeDocs.isNotEmpty) ...[
            const SizedBox(height: 24),
            Text('Reference Documents (PDF)',
                style: theme.textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ..._schemeDocs.map(
              (doc) => Card(
                child: ListTile(
                  leading: const Icon(Icons.picture_as_pdf,
                      color: Colors.red),
                  title:
                      Text(doc['scheme_name']?.toString() ?? 'Document'),
                  subtitle: Text(doc['filename']?.toString() ?? ''),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ── Tab 2: Form Fill ─────────────────────────────────────

  Widget _buildFormTab(ThemeData theme) {
    if (_sessionId == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.arrow_back, size: 48, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text('Select a scheme first',
                style: theme.textTheme.titleMedium),
          ],
        ),
      );
    }

    return Column(
      children: [
        // Progress indicator
        LinearProgressIndicator(
          value: _formFields.isEmpty
              ? 0
              : (_currentFieldIdx + 1) / _formFields.length,
          backgroundColor: Colors.grey[200],
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              Text(
                  'Field ${_currentFieldIdx + 1} of ${_formFields.length}'),
              const Spacer(),
              if (_extractedData != null)
                Chip(
                  avatar: const Icon(Icons.auto_fix_high, size: 16),
                  label: Text(
                      '${_extractedData!.fields.length} auto-filled'),
                  backgroundColor: Colors.green.shade50,
                ),
            ],
          ),
        ),

        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _formFields.length,
            itemBuilder: (ctx, idx) {
              final field = _formFields[idx];
              final ctrl = _controllers[field.name]!;
              return Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: TextFormField(
                  controller: ctrl,
                  decoration: InputDecoration(
                    labelText: field.label,
                    hintText: field.hint ?? 'Enter ${field.label}',
                    border: const OutlineInputBorder(),
                    suffixIcon: ctrl.text.isNotEmpty
                        ? const Icon(Icons.check_circle,
                            color: Colors.green)
                        : null,
                  ),
                  onChanged: (_) {
                    Haptics.selection();
                    setState(() {
                      _currentFieldIdx = idx;
                    });
                  },
                ),
              ).animate().fadeIn(delay: (30 * idx).ms, duration: 200.ms);
            },
          ),
        ),

        // Submit button
        Padding(
          padding: const EdgeInsets.all(16),
          child: FilledButton.icon(
            onPressed: _generating ? null : _submitAllFields,
            icon: _generating
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.send),
            label: Text(_generating ? 'Generating...' : 'Generate Document'),
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(52),
            ),
          ),
        ),
      ],
    );
  }

  // ── Tab 3: Preview ───────────────────────────────────────

  Widget _buildPreviewTab(ThemeData theme) {
    if (_generatedHtml == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.description_outlined,
                size: 48, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text('Fill and submit a form to preview',
                style: theme.textTheme.titleMedium),
          ],
        ),
      );
    }

    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Card(
              elevation: 2,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: SelectableText(
                  _stripHtml(_generatedHtml!),
                  style: const TextStyle(fontSize: 14, height: 1.6),
                ),
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    Haptics.light();
                    _tabCtrl.animateTo(1);
                  },
                  icon: const Icon(Icons.edit),
                  label: const Text('Edit'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton.icon(
                  onPressed: () {
                    Haptics.heavy();
                    SharePlus.instance.share(
                      ShareParams(text: _stripHtml(_generatedHtml!)),
                    );
                  },
                  icon: const Icon(Icons.share),
                  label: const Text('Share'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  String _stripHtml(String html) {
    return html
        .replaceAll(RegExp(r'<[^>]*>'), '')
        .replaceAll('&nbsp;', ' ')
        .replaceAll('&amp;', '&')
        .trim();
  }
}
