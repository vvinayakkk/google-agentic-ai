import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/services/document_builder_service.dart';
import 'official_form_preview_page.dart';
import 'preview_download_screen.dart';
import '../utils/document_scheme_map.dart';

class SchemeDetailsPage extends ConsumerStatefulWidget {
  const SchemeDetailsPage({
    super.key,
    required this.scheme,
    required this.profile,
  });

  final Map<String, dynamic> scheme;
  final Map<String, dynamic> profile;

  @override
  ConsumerState<SchemeDetailsPage> createState() => _SchemeDetailsPageState();
}

class _SchemeDetailsPageState extends ConsumerState<SchemeDetailsPage> {
  late Map<String, dynamic> _scheme;
  late Future<List<Map<String, dynamic>>> _downloadedDocsFuture;

  @override
  void initState() {
    super.initState();
    _scheme = Map<String, dynamic>.from(widget.scheme);
    _downloadedDocsFuture = _loadDownloadedSchemeDocs(
      autoDownloadIfEmpty: true,
    );
  }

  String _schemeId() {
    return (_scheme['id'] ??
            _scheme['scheme_id'] ??
            _scheme['short_name'] ??
            _scheme['name'] ??
            '')
        .toString()
        .trim();
  }

  String _schemeLookupKey() {
    final key = (_scheme['short_name'] ?? _scheme['name'] ?? _schemeId())
        .toString()
        .trim();
    return key.isEmpty ? _schemeId() : key;
  }

  List<String> _requiredDocuments() {
    final docs = _scheme['required_documents'] ?? _scheme['documents_required'];
    if (docs is List) {
      return docs
          .map((e) => e.toString())
          .where((e) => e.trim().isNotEmpty)
          .toList(growable: false);
    }
    return const <String>[];
  }

  List<String> _eligibilityItems() {
    final raw = _scheme['eligibility'];
    if (raw is List) {
      return raw
          .map((e) => e.toString())
          .where((e) => e.trim().isNotEmpty)
          .toList(growable: false);
    }
    if (raw is String && raw.trim().isNotEmpty) {
      return raw
          .split(RegExp(r'\.|\n'))
          .map((e) => e.trim())
          .where((e) => e.isNotEmpty)
          .toList(growable: false);
    }
    return const <String>[
      'Check official portal for latest eligibility criteria.',
    ];
  }

  List<String> _benefitItems() {
    final raw = _scheme['benefits'];
    if (raw is List) {
      return raw
          .map((e) => e.toString().trim())
          .where((e) => e.isNotEmpty)
          .toList(growable: false);
    }
    if (raw is String && raw.trim().isNotEmpty) {
      return raw
          .split(RegExp(r'\n|\.'))
          .map((e) => e.trim())
          .where((e) => e.isNotEmpty)
          .toList(growable: false);
    }
    return const <String>['Benefit details available on official portal.'];
  }

  List<String> _howToApplySteps() {
    final raw = _scheme['application_process'] ?? _scheme['how_to_apply'];
    if (raw is List) {
      return raw
          .map((e) => e.toString())
          .where((e) => e.trim().isNotEmpty)
          .toList(growable: false);
    }
    if (raw is String && raw.trim().isNotEmpty) {
      return raw
          .split(RegExp(r'\n|\.'))
          .map((e) => e.trim())
          .where((e) => e.isNotEmpty)
          .toList(growable: false);
    }
    return const <String>[
      'Visit the official portal and submit required details.',
    ];
  }

  List<Map<String, String>> _formDownloadItems() {
    final raw = _scheme['form_download_urls'];
    if (raw is! List) return const <Map<String, String>>[];

    final items = <Map<String, String>>[];
    for (final item in raw) {
      if (item is String && item.trim().isNotEmpty) {
        items.add(<String, String>{
          'name': 'Form Download',
          'url': item.trim(),
        });
        continue;
      }
      if (item is Map) {
        final map = Map<String, dynamic>.from(item.cast<dynamic, dynamic>());
        final name = (map['name'] ?? map['title'] ?? 'Form Download')
            .toString()
            .trim();
        final url = (map['url'] ?? map['link'] ?? '').toString().trim();
        if (url.isNotEmpty) {
          items.add(<String, String>{'name': name, 'url': url});
        }
      }
    }
    return items;
  }

  List<Map<String, dynamic>> _formFieldItems() {
    final raw = _scheme['form_fields'];
    if (raw is! List) return const <Map<String, dynamic>>[];

    return raw
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e.cast<dynamic, dynamic>()))
        .toList(growable: false);
  }

  double _landHectares() {
    final acres = double.tryParse(
      (widget.profile['land_size_acres'] ??
              widget.profile['land_area'] ??
              widget.profile['land'] ??
              '')
          .toString(),
    );
    if (acres != null && acres > 0) return acres * 0.4047;

    final hectares = double.tryParse(
      (widget.profile['land_size_hectares'] ?? '').toString(),
    );
    return hectares ?? 0;
  }

  bool _criterionMatchesProfile(String criterion) {
    final c = criterion.toLowerCase();
    final state = (widget.profile['state'] ?? '').toString().toLowerCase();
    final caste = (widget.profile['caste'] ?? '').toString().toLowerCase();
    final land = _landHectares();

    if (c.contains('state') && state.isEmpty) return false;
    if ((c.contains('sc') || c.contains('st')) &&
        !(caste.contains('sc') || caste.contains('st'))) {
      return false;
    }
    if (c.contains('land') && land <= 0) return false;
    if (c.contains('aadhaar')) {
      final aadhaar =
          (widget.profile['aadhaar'] ?? widget.profile['aadhaar_number'] ?? '')
              .toString();
      if (aadhaar.trim().isEmpty) return false;
    }
    return true;
  }

  bool _isDocInProfile(String doc) {
    final d = doc.toLowerCase();
    if (d.contains('aadhaar')) {
      return (widget.profile['aadhaar'] ??
              widget.profile['aadhaar_number'] ??
              '')
          .toString()
          .trim()
          .isNotEmpty;
    }
    if (d.contains('land')) {
      return _landHectares() > 0 ||
          widget.profile['land_records_available'] == true;
    }
    if (d.contains('bank') || d.contains('ifsc') || d.contains('passbook')) {
      final account = (widget.profile['bank_account'] ?? '')
          .toString()
          .trim()
          .isNotEmpty;
      final ifsc = (widget.profile['ifsc'] ?? widget.profile['ifsc_code'] ?? '')
          .toString()
          .trim()
          .isNotEmpty;
      return account && ifsc;
    }
    if (d.contains('caste')) {
      return widget.profile['caste_certificate_available'] == true;
    }
    if (d.contains('photo')) {
      return (widget.profile['photo_url'] ??
              widget.profile['profile_photo'] ??
              '')
          .toString()
          .trim()
          .isNotEmpty;
    }
    return false;
  }

  Future<List<Map<String, dynamic>>> _loadDownloadedSchemeDocs({
    bool autoDownloadIfEmpty = false,
    bool forceDownload = false,
  }) async {
    final key = _schemeLookupKey().trim();
    if (key.isEmpty) return const <Map<String, dynamic>>[];

    final docService = ref.read(documentBuilderServiceProvider);

    if (forceDownload) {
      await docService.downloadSchemeDocuments(key);
    }

    var docs = await docService.listSchemeDocumentsByScheme(key);
    if (autoDownloadIfEmpty && docs.isEmpty) {
      await docService.downloadSchemeDocuments(key);
      docs = await docService.listSchemeDocumentsByScheme(key);
    }
    return docs;
  }

  Future<void> _refreshSchemeDetails() async {
    final schemeId = _schemeId();
    if (schemeId.isEmpty) return;

    try {
      final detail = await ref
          .read(documentBuilderServiceProvider)
          .getSchemeForm(schemeId, preferCache: false, forceRefresh: true);

      Map<String, dynamic> resolved;
      if (detail['scheme'] is Map) {
        resolved = Map<String, dynamic>.from(
          (detail['scheme'] as Map).cast<dynamic, dynamic>(),
        );
      } else {
        resolved = Map<String, dynamic>.from(
          (detail as Map).cast<dynamic, dynamic>(),
        );
      }

      if (!mounted) return;
      setState(() {
        _scheme.addAll(resolved);
        _downloadedDocsFuture = _loadDownloadedSchemeDocs(
          autoDownloadIfEmpty: true,
        );
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _downloadedDocsFuture = _loadDownloadedSchemeDocs(
          autoDownloadIfEmpty: true,
        );
      });
    }
  }

  Future<void> _downloadAllDocs() async {
    setState(() {
      _downloadedDocsFuture = _loadDownloadedSchemeDocs(forceDownload: true);
    });
  }

  Future<void> _openDownloadedSchemeDocument(Map<String, dynamic> doc) async {
    final fileName = (doc['filename'] ?? doc['name'] ?? '').toString().trim();
    if (fileName.isEmpty) {
      context.showSnack('Document file name missing.', isError: true);
      return;
    }

    final url = ref
        .read(documentBuilderServiceProvider)
        .schemeDocumentFileUrl(
          schemeKey: _schemeLookupKey(),
          docName: fileName,
        );

    await _openExternalUrl(url);
  }

  Future<void> _openExternalUrl(String raw) async {
    final link = raw.trim();
    if (link.isEmpty) {
      context.showSnack(
        'Official link not available right now.',
        isError: true,
      );
      return;
    }
    final uri = Uri.tryParse(link);
    if (uri == null) {
      context.showSnack('Invalid scheme URL.', isError: true);
      return;
    }
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  String _normalizeDocKey(String raw) {
    return raw
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9]+'), ' ')
        .trim();
  }

  int _docMatchScore(
    String fileName, {
    required String requiredDoc,
    required String docType,
  }) {
    final normalizedName = _normalizeDocKey(fileName);
    if (normalizedName.isEmpty) return 0;

    final normalizedDoc = _normalizeDocKey(requiredDoc);
    final normalizedType = _normalizeDocKey(docType);
    var score = 0;

    if (normalizedDoc.isNotEmpty) {
      if (normalizedName == normalizedDoc) score += 80;
      if (normalizedName.contains(normalizedDoc)) score += 60;
      for (final token in normalizedDoc.split(' ')) {
        if (token.length > 2 && normalizedName.contains(token)) {
          score += 5;
        }
      }
    }

    if (normalizedType.isNotEmpty) {
      if (normalizedName == normalizedType) score += 40;
      if (normalizedName.contains(normalizedType)) score += 30;
      for (final token in normalizedType.split(' ')) {
        if (token.length > 2 && normalizedName.contains(token)) {
          score += 3;
        }
      }
    }

    final lower = fileName.toLowerCase();
    if (lower.endsWith('.pdf')) score += 8;

    return score;
  }

  Map<String, dynamic>? _pickBestDocForRequiredItem(
    List<Map<String, dynamic>> docs, {
    required String requiredDoc,
    required String docType,
  }) {
    Map<String, dynamic>? best;
    var bestScore = 0;

    for (final doc in docs) {
      final exists = doc['exists'];
      if (exists is bool && !exists) continue;

      final fileName = (doc['filename'] ?? doc['name'] ?? '')
          .toString()
          .trim();
      if (fileName.isEmpty) continue;

      final score = _docMatchScore(
        fileName,
        requiredDoc: requiredDoc,
        docType: docType,
      );
      if (score > bestScore) {
        bestScore = score;
        best = doc;
      }
    }

    // Keep direct-open behavior strict so wrong files are not shown.
    return bestScore >= 20 ? best : null;
  }

  String _docTypeLabel(String name) {
    final value = name.toLowerCase();
    if (value.endsWith('.pdf')) return 'PDF';
    if (value.endsWith('.docx')) return 'DOCX';
    if (value.endsWith('.doc')) return 'DOC';
    if (value.endsWith('.xlsx') || value.endsWith('.xls')) return 'XLS';
    if (value.endsWith('.html') || value.endsWith('.htm')) return 'HTML';
    return 'FILE';
  }

  String _firstOfficialSchemeUrl() {
    final appUrl = (_scheme['application_url'] ?? '').toString().trim();
    if (appUrl.isNotEmpty) return appUrl;

    final links = _formDownloadItems();
    if (links.isNotEmpty) {
      return (links.first['url'] ?? '').trim();
    }

    return '';
  }

  Future<void> _sharePreviewFile(GeneratedDocumentFile file) async {
    await SharePlus.instance.share(
      ShareParams(
        text: 'Official form downloaded from KisanKiAwaaz',
        files: <XFile>[XFile(file.file.path)],
      ),
    );
    if (!mounted) return;
    context.showSnack('Document is ready to save/share from this sheet.');
  }

  Future<void> _openOfficialFormsHub({String? initialDocumentName}) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PreviewDownloadScreen(
          sessionId: 'scheme-${DateTime.now().millisecondsSinceEpoch}',
          schemeId: _schemeId(),
          schemeName:
              (_scheme['short_name'] ?? _scheme['name'] ?? _schemeId())
                  .toString(),
          initialDocumentName: initialDocumentName,
        ),
      ),
    );
  }

  Future<void> _openBuildScreen(String requiredDoc, String docType) async {
    final key = _schemeLookupKey().trim();
    if (key.isEmpty) {
      context.showSnack('Scheme details are incomplete.', isError: true);
      return;
    }

    final docService = ref.read(documentBuilderServiceProvider);
    var docs = await docService.listSchemeDocumentsByScheme(key);
    if (docs.isEmpty) {
      await docService.downloadSchemeDocuments(key);
      docs = await docService.listSchemeDocumentsByScheme(key);
    }

    if (!mounted) return;

    final selected = _pickBestDocForRequiredItem(
      docs,
      requiredDoc: requiredDoc,
      docType: docType,
    );
    if (selected == null) {
      context.showSnack(
        'Opening Official Forms Hub to pick the matching form.',
      );
      await _openOfficialFormsHub(initialDocumentName: requiredDoc);
      return;
    }

    final docName = (selected['filename'] ?? selected['name'] ?? '')
        .toString()
        .trim();
    if (docName.isEmpty) {
      await _openOfficialFormsHub(initialDocumentName: requiredDoc);
      return;
    }

    final file = await docService.downloadSchemeDocumentFile(
      schemeKey: key,
      docName: docName,
    );

    if (!mounted) return;
    if (file == null) {
      context.showSnack(
        'Could not open direct preview. Opening Official Forms Hub instead.',
      );
      await _openOfficialFormsHub(initialDocumentName: requiredDoc);
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => OfficialFormPreviewPage(
          title: docName,
          typeLabel: _docTypeLabel(docName),
          file: file,
          onAutofill: () async {
            context.showSnack(
              'Autofill helper is available in Official Forms Hub.',
            );
          },
          onDownload: () async {
            await _sharePreviewFile(file);
          },
          onOpenExternal: () async {
            await _openExternalUrl(_firstOfficialSchemeUrl());
          },
          onOpenHub: () {
            Navigator.of(context).pop();
            _openOfficialFormsHub(initialDocumentName: docName);
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final cardColor = Colors.white.withValues(alpha: 0.56);
    final textColor = AppColors.lightText;
    final subColor = AppColors.lightTextSecondary;

    final docs = _requiredDocuments();
    final eligibility = _eligibilityItems();
    final benefits = _benefitItems();
    final howToApply = _howToApplySteps();
    final formDownloads = _formDownloadItems();
    final formFields = _formFieldItems();

    final category = (_scheme['category'] ?? 'General').toString();
    final categoryColor = colorForSchemeCategory(category);
    final amountRange = (_scheme['amount_range'] ?? '').toString().trim();
    final stateCoverage = (_scheme['state'] ?? 'All').toString();
    final ministry = (_scheme['ministry'] ?? 'Not specified').toString();
    final launched =
        (_scheme['launched_year'] ?? _scheme['launch_year'] ?? 'N/A')
            .toString();
    final status = (_scheme['is_active'] == false) ? 'Inactive' : 'Active';
    final helpline = (_scheme['helpline'] ?? '').toString().trim();
    final description = (_scheme['description'] ?? '').toString().trim();
    final shortName = (_scheme['short_name'] ?? 'Scheme').toString();

    return Scaffold(
      backgroundColor: isDark
          ? AppColors.darkBackground
          : AppColors.lightBackground,
      appBar: AppBar(
        title: Text(shortName),
        elevation: 0,
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? <Color>[AppColors.darkBackground, AppColors.darkSurface]
                : <Color>[AppColors.lightBackground, AppColors.lightSurface],
          ),
        ),
        child: RefreshIndicator(
          onRefresh: _refreshSchemeDetails,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            children: <Widget>[
              _glassCard(
                cardColor: cardColor,
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    color: cardColor,
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.65),
                    ),
                  ),
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        (_scheme['name'] ?? 'Scheme').toString(),
                        style: TextStyle(
                          color: textColor,
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: <Widget>[
                          _StatusChip(label: category, color: categoryColor),
                          _StatusChip(
                            label: 'State: $stateCoverage',
                            color: AppColors.info,
                          ),
                          _StatusChip(
                            label: status,
                            color: status == 'Active'
                                ? AppColors.success
                                : Colors.grey,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              _glassCard(
                cardColor: cardColor,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      'Scheme Snapshot',
                      style: context.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: textColor,
                      ),
                    ),
                    const SizedBox(height: 10),
                    _factRow('Ministry', ministry),
                    _factRow('Launched', launched),
                    _factRow(
                      'Benefit Range',
                      amountRange.isEmpty ? 'See details below' : amountRange,
                    ),
                    _factRow(
                      'Required Documents',
                      '${docs.length}',
                      isLast: helpline.isEmpty,
                    ),
                    if (helpline.isNotEmpty)
                      _factRow('Helpline', helpline, isLast: true),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              _glassCard(
                cardColor: cardColor,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      'Required Documents (${docs.length})',
                      style: context.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: textColor,
                      ),
                    ),
                    const SizedBox(height: 10),
                    ...docs.map((doc) {
                      final inProfile = _isDocInProfile(doc);
                      final buildable = findBuildableDocumentForText(doc);
                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: cardColor,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.8),
                          ),
                        ),
                        child: Row(
                          children: <Widget>[
                            Expanded(
                              child: Text(
                                doc,
                                style: TextStyle(color: textColor),
                              ),
                            ),
                            if (inProfile)
                              const _StatusChip(
                                label: 'In Profile',
                                color: AppColors.success,
                              )
                            else if (buildable != null)
                              TextButton(
                                onPressed: () =>
                                    _openBuildScreen(doc, buildable.documentType),
                                child: const Text('Build Now'),
                              )
                            else
                              const _StatusChip(
                                label: 'Bring Original',
                                color: Colors.grey,
                              ),
                          ],
                        ),
                      );
                    }),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              if (description.isNotEmpty)
                _glassCard(
                  cardColor: cardColor,
                  child: Text(
                    description,
                    style: context.textTheme.bodyMedium?.copyWith(
                      color: textColor,
                      height: 1.35,
                    ),
                  ),
                ),
              if (description.isNotEmpty) const SizedBox(height: 12),
              _glassCard(
                cardColor: cardColor,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      'Benefits',
                      style: context.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: textColor,
                      ),
                    ),
                    const SizedBox(height: 10),
                    ...benefits.map(
                      (item) => _bulletTile(item, AppColors.success),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              _glassCard(
                cardColor: cardColor,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      'Eligibility Check',
                      style: context.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: textColor,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: eligibility
                          .map((criterion) {
                            final ok = _criterionMatchesProfile(criterion);
                            return Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 8,
                              ),
                              decoration: BoxDecoration(
                                color: ok
                                    ? AppColors.success.withValues(alpha: 0.14)
                                    : AppColors.danger.withValues(alpha: 0.14),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: <Widget>[
                                  Icon(
                                    ok ? Icons.check_circle : Icons.cancel,
                                    size: 14,
                                    color: ok
                                        ? AppColors.success
                                        : AppColors.danger,
                                  ),
                                  const SizedBox(width: 6),
                                  ConstrainedBox(
                                    constraints: const BoxConstraints(
                                      maxWidth: 250,
                                    ),
                                    child: Text(criterion),
                                  ),
                                ],
                              ),
                            );
                          })
                          .toList(growable: false),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              _glassCard(
                cardColor: cardColor,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Row(
                      children: <Widget>[
                        Expanded(
                          child: Text(
                            'Downloaded Official Documents',
                            style: context.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w800,
                              color: textColor,
                            ),
                          ),
                        ),
                        TextButton.icon(
                          onPressed: _downloadAllDocs,
                          icon: const Icon(Icons.download),
                          label: const Text('Download All'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    FutureBuilder<List<Map<String, dynamic>>>(
                      future: _downloadedDocsFuture,
                      builder: (context, snapshot) {
                        if (snapshot.connectionState ==
                            ConnectionState.waiting) {
                          return const Row(
                            children: <Widget>[
                              SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              ),
                              SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  'Downloading and loading official documents...',
                                ),
                              ),
                            ],
                          );
                        }

                        if (snapshot.hasError) {
                          return Text(
                            'Could not fetch downloaded docs. Tap Download All to retry.',
                            style: context.textTheme.bodySmall?.copyWith(
                              color: AppColors.danger,
                            ),
                          );
                        }

                        final downloaded =
                            snapshot.data ?? const <Map<String, dynamic>>[];
                        if (downloaded.isEmpty) {
                          return Text(
                            'No downloadable files found yet for this scheme.',
                            style: context.textTheme.bodySmall?.copyWith(
                              color: subColor,
                            ),
                          );
                        }

                        return Column(
                          children: downloaded
                              .map((doc) {
                                final label =
                                    (doc['name'] ??
                                            doc['filename'] ??
                                            'Document')
                                        .toString();
                                final size = (doc['size'] ?? 0) is num
                                    ? (doc['size'] as num)
                                    : 0;
                                final sizeKb = (size / 1024).toStringAsFixed(1);
                                return Container(
                                  margin: const EdgeInsets.only(bottom: 10),
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: cardColor,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: Colors.white.withValues(
                                        alpha: 0.8,
                                      ),
                                    ),
                                  ),
                                  child: Row(
                                    children: <Widget>[
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: <Widget>[
                                            Text(
                                              label,
                                              style: TextStyle(
                                                color: textColor,
                                                fontWeight: FontWeight.w700,
                                              ),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              'Downloaded file • $sizeKb KB',
                                              style: TextStyle(color: subColor),
                                            ),
                                          ],
                                        ),
                                      ),
                                      TextButton.icon(
                                        onPressed: () =>
                                            _openDownloadedSchemeDocument(doc),
                                        icon: const Icon(Icons.open_in_new),
                                        label: const Text('Open'),
                                      ),
                                    ],
                                  ),
                                );
                              })
                              .toList(growable: false),
                        );
                      },
                    ),
                  ],
                ),
              ),
              if (formDownloads.isNotEmpty) ...<Widget>[
                const SizedBox(height: 12),
                _glassCard(
                  cardColor: cardColor,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        'Official Forms and Guidelines',
                        style: context.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: textColor,
                        ),
                      ),
                      const SizedBox(height: 10),
                      ...formDownloads.map((item) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Row(
                            children: <Widget>[
                              Expanded(
                                child: Text(
                                  item['name'] ?? 'Form Download',
                                  style: TextStyle(
                                    color: textColor,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              TextButton.icon(
                                onPressed: () =>
                                    _openExternalUrl(item['url'] ?? ''),
                                icon: const Icon(Icons.download),
                                label: const Text('Open'),
                              ),
                            ],
                          ),
                        );
                      }),
                    ],
                  ),
                ),
              ],
              if (formFields.isNotEmpty) ...<Widget>[
                const SizedBox(height: 12),
                _glassCard(
                  cardColor: cardColor,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        'Form Data Required (${formFields.length} fields)',
                        style: context.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: textColor,
                        ),
                      ),
                      const SizedBox(height: 10),
                      ...formFields.map((field) {
                        final label =
                            (field['label'] ?? field['field'] ?? 'Field')
                                .toString();
                        final type = (field['type'] ?? 'text').toString();
                        final required = field['required'] == true;
                        return Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: cardColor,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.8),
                            ),
                          ),
                          child: Row(
                            children: <Widget>[
                              Expanded(
                                child: Text(
                                  label,
                                  style: TextStyle(
                                    color: textColor,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              _StatusChip(
                                label: type.toUpperCase(),
                                color: AppColors.info,
                              ),
                              const SizedBox(width: 6),
                              _StatusChip(
                                label: required ? 'Required' : 'Optional',
                                color: required
                                    ? AppColors.warning
                                    : Colors.grey,
                              ),
                            ],
                          ),
                        );
                      }),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 12),
              _glassCard(
                cardColor: cardColor,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      'How to Apply',
                      style: context.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: textColor,
                      ),
                    ),
                    const SizedBox(height: 10),
                    ...howToApply.asMap().entries.map((entry) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            CircleAvatar(
                              radius: 12,
                              backgroundColor: AppColors.primary.withValues(
                                alpha: 0.15,
                              ),
                              child: Text(
                                '${entry.key + 1}',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                entry.value,
                                style: TextStyle(color: textColor),
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () => _openExternalUrl(
                          (_scheme['application_url'] ?? '').toString(),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                        ),
                        icon: const Icon(Icons.open_in_new),
                        label: const Text('Apply Online'),
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextButton.icon(
                      onPressed: () => context.push(RoutePaths.documentAgent),
                      icon: const Icon(Icons.smart_toy_outlined),
                      label: const Text('Ask AI About This Scheme'),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _factRow(String label, String value, {bool isLast = false}) {
    return Container(
      padding: EdgeInsets.only(bottom: isLast ? 0 : 8),
      margin: EdgeInsets.only(bottom: isLast ? 0 : 8),
      decoration: BoxDecoration(
        border: isLast
            ? null
            : Border(
                bottom: BorderSide(color: Colors.white.withValues(alpha: 0.45)),
              ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Expanded(
            flex: 3,
            child: Text(
              label,
              style: TextStyle(
                color: context.appColors.textSecondary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            flex: 4,
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: TextStyle(
                color: context.colors.onSurface,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _bulletTile(String text, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Container(
            margin: const EdgeInsets.only(top: 7),
            width: 7,
            height: 7,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 8),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }

  Widget _glassCard({required Color cardColor, required Widget child}) {
    return Container(
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.8),
          width: 1.2,
        ),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: AppColors.primaryDark.withValues(alpha: 0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: child,
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
