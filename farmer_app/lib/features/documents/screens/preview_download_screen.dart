import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:share_plus/share_plus.dart';
import 'package:syncfusion_flutter_pdfviewer/pdfviewer.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/models/document_builder_model.dart';
import '../../../shared/services/document_builder_service.dart';
import '../../../shared/services/farmer_service.dart';

class PreviewDownloadScreen extends ConsumerStatefulWidget {
  const PreviewDownloadScreen({
    super.key,
    required this.sessionId,
    required this.schemeId,
    required this.schemeName,
    this.formData,
  });

  final String sessionId;
  final String schemeId;
  final String schemeName;
  final Map<String, String>? formData;

  @override
  ConsumerState<PreviewDownloadScreen> createState() =>
      _PreviewDownloadScreenState();
}

class _PreviewDownloadScreenState extends ConsumerState<PreviewDownloadScreen> {
  static const List<_ProfileField> _profileFields = <_ProfileField>[
    _ProfileField('applicant_name', 'Applicant Name', Icons.person_outline),
    _ProfileField('phone', 'Phone Number', Icons.call_outlined),
    _ProfileField('village', 'Village', Icons.location_city_outlined),
    _ProfileField('district', 'District', Icons.map_outlined),
    _ProfileField('state', 'State', Icons.public_outlined),
    _ProfileField('pin_code', 'PIN Code', Icons.pin_drop_outlined),
    _ProfileField('land_size_acres', 'Land Size (acres)', Icons.agriculture_outlined),
  ];

  bool _loading = true;
  bool _saving = false;
  bool _regenerating = false;

  Map<String, dynamic> _doc = <String, dynamic>{};
  List<SavedDocument> _savedDocs = <SavedDocument>[];
  final Map<String, TextEditingController> _profileControllers =
      <String, TextEditingController>{};

  File? _previewPdfFile;
  String? _previewError;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    for (final controller in _profileControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);

    try {
      final svc = ref.read(documentBuilderServiceProvider);
      final savedDocs = await svc.listSavedDocuments();
      final profile = await ref.read(farmerServiceProvider).getMyProfile();

      _initProfileControllers(_extractProfileAutofill(profile));
      await _regeneratePreview(showSnack: false);

      if (!mounted) return;
      setState(() {
        _savedDocs = savedDocs;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _previewError = 'Could not prepare preview: $error';
      });
    }
  }

  void _initProfileControllers(Map<String, String> values) {
    for (final field in _profileFields) {
      final controller = _profileControllers.putIfAbsent(
        field.key,
        TextEditingController.new,
      );
      if (controller.text.trim().isEmpty) {
        controller.text = (values[field.key] ?? '').trim();
      }
    }
  }

  Map<String, String> _extractProfileAutofill(Map<String, dynamic> profile) {
    String pick(List<String> keys) {
      for (final key in keys) {
        final value = (profile[key] ?? '').toString().trim();
        if (value.isNotEmpty) return value;
      }
      return '';
    }

    return <String, String>{
      'applicant_name': pick(<String>['name', 'farmer_name']),
      'phone': pick(<String>['phone', 'mobile', 'mobile_number']),
      'village': pick(<String>['village']),
      'district': pick(<String>['district']),
      'state': pick(<String>['state']),
      'pin_code': pick(<String>['pin_code', 'pincode']),
      'land_size_acres': pick(<String>['land_size_acres', 'land_size']),
    };
  }

  String _labelForKey(String key) {
    return key
        .split('_')
        .where((part) => part.trim().isNotEmpty)
        .map((part) => '${part[0].toUpperCase()}${part.substring(1)}')
        .join(' ');
  }

  Map<String, String> _mergedFormValues() {
    final merged = <String, String>{
      ...?widget.formData,
    };
    for (final entry in _profileControllers.entries) {
      final value = entry.value.text.trim();
      if (value.isNotEmpty) {
        merged[entry.key] = value;
      }
    }
    merged.removeWhere((_, value) => value.trim().isEmpty);
    return merged;
  }

  Future<File> _buildLocalPdf(Map<String, String> values) async {
    final document = pw.Document();
    final generatedAt = DateTime.now();
    final rows = values.entries.toList(growable: false)
      ..sort((a, b) => a.key.compareTo(b.key));

    document.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(24),
        build: (_) => <pw.Widget>[
          pw.Text(
            'KisanKiAwaaz Application Preview',
            style: pw.TextStyle(fontSize: 20, fontWeight: pw.FontWeight.bold),
          ),
          pw.SizedBox(height: 6),
          pw.Text(widget.schemeName, style: const pw.TextStyle(fontSize: 14)),
          pw.SizedBox(height: 4),
          pw.Text(
            'Generated: ${generatedAt.day}/${generatedAt.month}/${generatedAt.year}',
            style: const pw.TextStyle(fontSize: 11),
          ),
          pw.SizedBox(height: 14),
          pw.Table(
            border: pw.TableBorder.all(color: PdfColors.grey400, width: 0.6),
            children: <pw.TableRow>[
              pw.TableRow(
                decoration: const pw.BoxDecoration(color: PdfColors.grey200),
                children: <pw.Widget>[
                  pw.Padding(
                    padding: const pw.EdgeInsets.all(8),
                    child: pw.Text(
                      'Field',
                      style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                    ),
                  ),
                  pw.Padding(
                    padding: const pw.EdgeInsets.all(8),
                    child: pw.Text(
                      'Value',
                      style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                    ),
                  ),
                ],
              ),
              ...rows.map(
                (entry) => pw.TableRow(
                  children: <pw.Widget>[
                    pw.Padding(
                      padding: const pw.EdgeInsets.all(8),
                      child: pw.Text(_labelForKey(entry.key)),
                    ),
                    pw.Padding(
                      padding: const pw.EdgeInsets.all(8),
                      child: pw.Text(entry.value),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );

    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/application_${widget.sessionId}.pdf');
    await file.writeAsBytes(await document.save(), flush: true);
    return file;
  }

  Future<void> _regeneratePreview({required bool showSnack}) async {
    if (!mounted) return;
    setState(() => _regenerating = true);

    try {
      final svc = ref.read(documentBuilderServiceProvider);
      final values = _mergedFormValues();
      if (values.isNotEmpty) {
        await svc.submitFields(sessionId: widget.sessionId, values: values);
      }

      final generated = await svc.generateDocument(widget.sessionId, format: 'pdf');
      final downloaded = await svc.downloadGeneratedDocumentFile(widget.sessionId);

      File? file;
      String? previewInfo;
      if (downloaded != null && downloaded.isPdf) {
        file = downloaded.file;
      } else {
        file = await _buildLocalPdf(values.isNotEmpty ? values : <String, String>{
          'scheme_name': widget.schemeName,
        });
        previewInfo = downloaded == null
            ? 'Server PDF is not available right now. Showing local PDF preview.'
            : 'Server returned non-PDF output. Showing local PDF preview.';
      }

      if (!mounted) return;
      setState(() {
        _doc = generated;
        _previewPdfFile = file;
        _previewError = previewInfo;
      });
      if (showSnack && previewInfo != null) {
        context.showSnack(previewInfo);
      }
    } catch (error) {
      if (!mounted) return;
      setState(() => _previewError = 'Could not regenerate preview: $error');
      context.showSnack('Could not regenerate preview.', isError: true);
    } finally {
      if (mounted) {
        setState(() => _regenerating = false);
      }
    }
  }

  String get _docUrl => (_doc['document_url'] ?? '').toString();

  Future<void> _downloadPdf() async {
    final file = _previewPdfFile;
    if (file == null || !(await file.exists())) {
      if (!mounted) return;
      context.showSnack('PDF preview is not ready yet.', isError: true);
      return;
    }

    await SharePlus.instance.share(
      ShareParams(
        text: 'Generated scheme application form PDF',
        files: <XFile>[XFile(file.path)],
      ),
    );
  }

  Future<void> _saveToProfile() async {
    if (_saving) return;
    final url = _docUrl.trim();
    if (url.isEmpty) {
      context.showSnack('Server document link is not ready yet.', isError: true);
      return;
    }

    setState(() => _saving = true);
    try {
      final saved = SavedDocument(
        schemeId: widget.schemeId,
        schemeName: widget.schemeName,
        sessionId: widget.sessionId,
        documentUrl: url,
        generatedAt: DateTime.now(),
      );

      final docs = await ref
          .read(documentBuilderServiceProvider)
          .saveDocumentToProfile(saved);
      if (!mounted) return;
      setState(() => _savedDocs = docs);
      context.showSnack('Saved for future use.');
    } catch (_) {
      if (!mounted) return;
      context.showSnack('Could not save right now.', isError: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;

    return Scaffold(
      backgroundColor: isDark
          ? AppColors.darkBackground
          : AppColors.lightBackground,
      appBar: AppBar(
        title: const Text('Document Preview'),
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: isDark
                      ? <Color>[AppColors.darkBackground, AppColors.darkSurface]
                      : <Color>[AppColors.lightBackground, AppColors.lightSurface],
                ),
              ),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 22),
                children: <Widget>[
                  _SectionCard(
                    title: 'PDF Preview',
                    subtitle: widget.schemeName,
                    child: Column(
                      children: <Widget>[
                        SizedBox(
                          height: 460,
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(14),
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: _previewPdfFile == null
                                  ? _PreviewUnavailable(
                                      message: _previewError ??
                                          'Generating PDF preview...',
                                    )
                                  : SfPdfViewer.file(_previewPdfFile!),
                            ),
                          ),
                        ),
                        if (_previewError != null) ...<Widget>[
                          const SizedBox(height: 10),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              Icon(
                                Icons.info_outline,
                                color: context.appColors.textSecondary,
                                size: 18,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _previewError!,
                                  style: context.textTheme.bodySmall?.copyWith(
                                    color: context.appColors.textSecondary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: _regenerating
                                ? null
                                : () => _regeneratePreview(showSnack: true),
                            icon: const Icon(Icons.refresh_outlined),
                            label: Text(
                              _regenerating
                                  ? 'Regenerating Preview...'
                                  : 'Apply Autofill and Regenerate PDF',
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: <Widget>[
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: _downloadPdf,
                                icon: const Icon(Icons.download_outlined),
                                label: const Text('Download PDF'),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: _saving ? null : _saveToProfile,
                                icon: const Icon(Icons.save_outlined),
                                label: Text(
                                  _saving ? 'Saving...' : 'Save to Profile',
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  _SectionCard(
                    title: 'Basic Profile Autofill',
                    subtitle:
                        'We prefilled available profile fields. You can edit these before regenerating the PDF.',
                    child: Column(
                      children: _profileFields.map((field) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: TextFormField(
                            controller: _profileControllers[field.key],
                            keyboardType: field.key == 'phone' || field.key == 'pin_code'
                                ? TextInputType.phone
                                : TextInputType.text,
                            decoration: InputDecoration(
                              prefixIcon: Icon(field.icon),
                              labelText: field.label,
                            ),
                          ),
                        );
                      }).toList(growable: false),
                    ),
                  ),
                  const SizedBox(height: 12),
                  _SectionCard(
                    title: 'My Saved Documents',
                    subtitle: 'Recent saved applications from your profile vault.',
                    child: _savedDocs.isEmpty
                        ? Text(
                            'No saved documents yet.',
                            style: context.textTheme.bodySmall?.copyWith(
                              color: context.appColors.textSecondary,
                            ),
                          )
                        : Column(
                            children: _savedDocs.take(4).map((d) {
                              return ListTile(
                                contentPadding: EdgeInsets.zero,
                                title: Text(
                                  d.schemeName,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                subtitle: Text(
                                  '${d.generatedAt.day}/${d.generatedAt.month}/${d.generatedAt.year}',
                                ),
                              );
                            }).toList(growable: false),
                          ),
                  ),
                ],
              ),
            ),
    );
  }
}

class _PreviewUnavailable extends StatelessWidget {
  const _PreviewUnavailable({
    required this.message,
  });

  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(
              Icons.visibility_off_outlined,
              size: 28,
              color: context.appColors.textSecondary,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: context.textTheme.bodyMedium?.copyWith(
                color: context.appColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.subtitle,
    required this.child,
  });

  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    return Container(
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.04)
            : Colors.white.withValues(alpha: 0.62),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.09)
              : Colors.white.withValues(alpha: 0.88),
        ),
        boxShadow: isDark
            ? null
            : <BoxShadow>[
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 18,
                  offset: const Offset(0, 10),
                ),
              ],
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              title,
              style: context.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: context.textTheme.bodySmall?.copyWith(
                color: context.appColors.textSecondary,
              ),
            ),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}

class _ProfileField {
  const _ProfileField(this.key, this.label, this.icon);

  final String key;
  final String label;
  final IconData icon;
}
