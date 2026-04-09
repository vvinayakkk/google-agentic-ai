import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/models/document_builder_model.dart';
import '../../../shared/services/document_builder_service.dart';
import '../../../shared/services/farmer_service.dart';
import 'official_form_preview_page.dart';

class PreviewDownloadScreen extends ConsumerStatefulWidget {
  const PreviewDownloadScreen({
    super.key,
    required this.sessionId,
    required this.schemeId,
    required this.schemeName,
    this.initialDocumentName,
    this.formData,
  });

  final String sessionId;
  final String schemeId;
  final String schemeName;
  final String? initialDocumentName;
  final Map<String, String>? formData;

  @override
  ConsumerState<PreviewDownloadScreen> createState() =>
      _PreviewDownloadScreenState();
}

class _PreviewDownloadScreenState extends ConsumerState<PreviewDownloadScreen>
    with SingleTickerProviderStateMixin {
  bool _loading = true;
  bool _syncing = false;
  bool _saving = false;

  Map<String, dynamic> _scheme = <String, dynamic>{};
  List<Map<String, String>> _officialLinks = <Map<String, String>>[];
  List<Map<String, dynamic>> _downloadedDocs = <Map<String, dynamic>>[];
  List<SavedDocument> _savedDocs = <SavedDocument>[];
  Map<String, String> _autofill = <String, String>{};
  final Map<String, GeneratedDocumentFile> _docFileCache =
      <String, GeneratedDocumentFile>{};
  String _docSearch = '';
  String _docFilter = 'ALL';
  bool _sortByLargest = true;
  Set<String> _readinessDone = <String>{};

  late final AnimationController _entryController;

  @override
  void initState() {
    super.initState();
    _entryController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _load();
  }

  @override
  void dispose() {
    _entryController.dispose();
    super.dispose();
  }

  // ── All original logic untouched ─────────────────────────────────────────

  String _schemeLookupKey() {
    final fromScheme =
        (_scheme['short_name'] ?? _scheme['name'] ?? '').toString().trim();
    if (fromScheme.isNotEmpty) return fromScheme;
    return widget.schemeName.trim().isNotEmpty
        ? widget.schemeName.trim()
        : widget.schemeId.trim();
  }

  List<Map<String, String>> _parseFormLinks(dynamic raw) {
    if (raw is! List) return const <Map<String, String>>[];
    final out = <Map<String, String>>[];
    for (final item in raw) {
      if (item is String && item.trim().isNotEmpty) {
        out.add(<String, String>{
          'name': 'Official Form Link',
          'url': item.trim(),
        });
        continue;
      }
      if (item is Map) {
        final map = Map<String, dynamic>.from(item.cast<dynamic, dynamic>());
        final url = (map['url'] ?? map['link'] ?? '').toString().trim();
        if (url.isEmpty) continue;
        final name =
            (map['name'] ?? map['title'] ?? 'Official Form Link').toString().trim();
        out.add(<String, String>{'name': name, 'url': url});
      }
    }
    return out;
  }

  Map<String, String> _extractProfileAutofill(Map<String, dynamic> profile) {
    String pick(List<String> keys) {
      for (final key in keys) {
        final value = (profile[key] ?? '').toString().trim();
        if (value.isNotEmpty) return value;
      }
      return '';
    }

    final map = <String, String>{
      ...?widget.formData,
      'applicant_name': pick(<String>['name', 'farmer_name']),
      'phone': pick(<String>['phone', 'mobile', 'mobile_number']),
      'village': pick(<String>['village']),
      'district': pick(<String>['district']),
      'state': pick(<String>['state']),
      'pin_code': pick(<String>['pin_code', 'pincode']),
      'land_size_acres': pick(<String>['land_size_acres', 'land_size']),
      'aadhaar_number': pick(<String>['aadhaar', 'aadhaar_number']),
      'bank_account': pick(<String>['bank_account', 'account_number']),
      'ifsc_code': pick(<String>['ifsc', 'ifsc_code']),
    };
    map.removeWhere((_, value) => value.trim().isEmpty);
    return map;
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final docService = ref.read(documentBuilderServiceProvider);
      final farmerService = ref.read(farmerServiceProvider);

      final detail = await docService.getSchemeForm(widget.schemeId);
      final scheme = (detail['scheme'] is Map)
          ? Map<String, dynamic>.from(
              (detail['scheme'] as Map).cast<dynamic, dynamic>(),
            )
          : Map<String, dynamic>.from(detail);

      final profile = await farmerService.getMyProfile(preferCache: true);
      final autofill = _extractProfileAutofill(profile);
      final links = _parseFormLinks(scheme['form_download_urls']);
      final saved = await docService.listSavedDocuments();

      if (!mounted) return;
      setState(() {
        _scheme = scheme;
        _officialLinks = links;
        _autofill = autofill;
        _savedDocs = saved;
        _readinessDone = _seedReadinessFromProfile(scheme, autofill);
      });

      final key = _schemeLookupKey();
      final cachedDocs = await docService.getCachedSchemeDocumentsByScheme(key);
      if (!mounted) return;
      if (cachedDocs.isNotEmpty) {
        setState(() => _downloadedDocs = _prioritizeInitialDoc(cachedDocs));
      }

      _syncDownloadedDocs(
        forceDownloadIfEmpty: cachedDocs.isEmpty,
        forceRefresh: cachedDocs.isEmpty,
      );
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _scheme = <String, dynamic>{};
        _officialLinks = const <Map<String, String>>[];
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
        _entryController.forward();
      }
    }
  }

  String _normalizeDocName(String value) => value
      .toLowerCase()
      .replaceAll(RegExp(r'\s+'), ' ')
      .replaceAll(RegExp(r'[\-_]+'), ' ')
      .trim();

  List<Map<String, dynamic>> _prioritizeInitialDoc(
      List<Map<String, dynamic>> docs) {
    final target = (widget.initialDocumentName ?? '').trim();
    if (target.isEmpty || docs.isEmpty) return docs;
    final normalizedTarget = _normalizeDocName(target);
    final sorted = List<Map<String, dynamic>>.from(docs);
    sorted.sort((a, b) {
      final aName =
          _normalizeDocName((a['filename'] ?? a['name'] ?? '').toString());
      final bName =
          _normalizeDocName((b['filename'] ?? b['name'] ?? '').toString());
      final aScore =
          (aName == normalizedTarget || aName.contains(normalizedTarget))
              ? 1
              : 0;
      final bScore =
          (bName == normalizedTarget || bName.contains(normalizedTarget))
              ? 1
              : 0;
      return bScore.compareTo(aScore);
    });
    return sorted;
  }

  Future<void> _syncDownloadedDocs({
    bool forceDownloadIfEmpty = false,
    bool forceRefresh = false,
  }) async {
    final key = _schemeLookupKey();
    if (key.trim().isEmpty) return;
    setState(() => _syncing = true);
    try {
      final docService = ref.read(documentBuilderServiceProvider);
      var docs = await docService.listSchemeDocumentsByScheme(key,
          preferCache: !forceRefresh, forceRefresh: forceRefresh);
      if (forceDownloadIfEmpty && docs.isEmpty) {
        await docService.downloadSchemeDocuments(key);
        docs = await docService.listSchemeDocumentsByScheme(key,
            preferCache: false, forceRefresh: true);
      }
      docs = _prioritizeInitialDoc(docs);
      if (!mounted) return;
      setState(() => _downloadedDocs = docs);
    } catch (_) {
      if (!mounted) return;
      setState(() => _downloadedDocs = const <Map<String, dynamic>>[]);
    } finally {
      if (mounted) setState(() => _syncing = false);
    }
  }

  Future<void> _downloadAllNow() async {
    final key = _schemeLookupKey();
    if (key.trim().isEmpty) return;
    setState(() => _syncing = true);
    try {
      await ref.read(documentBuilderServiceProvider).downloadSchemeDocuments(key);
      await _syncDownloadedDocs(forceDownloadIfEmpty: false, forceRefresh: true);
      if (!mounted) return;
      context.showSnack('Official forms synced for this scheme.');
    } catch (_) {
      if (!mounted) return;
      context.showSnack('Could not sync official forms right now.', isError: true);
      setState(() => _syncing = false);
    }
  }

  Future<void> _openExternalUrl(String raw) async {
    final link = raw.trim();
    if (link.isEmpty) {
      context.showSnack('Official link is not available.', isError: true);
      return;
    }
    Uri? uri = Uri.tryParse(link);
    if (uri != null && !uri.hasScheme) {
      uri = Uri.tryParse('https://$link');
    }
    if (uri == null || (uri.scheme != 'http' && uri.scheme != 'https')) {
      context.showSnack('Invalid URL.', isError: true);
      return;
    }
    try {
      final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!opened && mounted) {
        context.showSnack('Could not open this website right now.', isError: true);
      }
    } catch (_) {
      if (!mounted) return;
      context.showSnack('Could not open this website right now.', isError: true);
    }
  }

  Future<void> _previewDownloadedDoc(Map<String, dynamic> doc) async {
    final file = await _fetchDownloadedDocFile(doc);
    if (file == null || !mounted) return;
    final title = (doc['name'] ?? doc['filename'] ?? 'Document').toString();
    final typeLabel = _docTypeLabel(doc);
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => OfficialFormPreviewPage(
          title: title,
          typeLabel: typeLabel,
          file: file,
          onAutofill: () async {
            if (!mounted) return;
            context.showSnack(
              'Autofill helper is available in Official Forms Hub.',
            );
          },
          onDownload: () => _downloadDownloadedDoc(doc),
          onOpenExternal: _openPrimaryOfficialLink,
          onOpenHub: () {
            Navigator.of(context).maybePop();
          },
        ),
      ),
    );
  }

  Future<GeneratedDocumentFile?> _fetchDownloadedDocFile(
      Map<String, dynamic> doc) async {
    final fileName = (doc['filename'] ?? doc['name'] ?? '').toString().trim();
    if (fileName.isEmpty) {
      context.showSnack('Downloaded file name missing.', isError: true);
      return null;
    }
    final schemeKey = _schemeLookupKey();
    final cacheKey = '${schemeKey.toLowerCase()}::$fileName';
    final cached = _docFileCache[cacheKey];
    if (cached != null && await cached.file.exists()) return cached;
    final file = await ref
        .read(documentBuilderServiceProvider)
        .downloadSchemeDocumentFile(schemeKey: schemeKey, docName: fileName);
    if (file == null) {
      if (mounted) {
        context.showSnack('Could not fetch preview for this document.',
            isError: true);
      }
      return null;
    }
    _docFileCache[cacheKey] = file;
    return file;
  }

  Future<void> _shareDownloadedDoc(GeneratedDocumentFile file) async {
    await SharePlus.instance.share(ShareParams(
      text: 'Official form downloaded from KisanKiAwaaz',
      files: <XFile>[XFile(file.file.path)],
    ));
    if (!mounted) return;
    context.showSnack('Document is ready to save/share from this sheet.');
  }

  String _docDisplayName(Map<String, dynamic> doc) =>
      (doc['name'] ?? doc['filename'] ?? 'Document').toString();

  Future<void> _downloadDownloadedDoc(Map<String, dynamic> doc) async {
    final file = await _fetchDownloadedDocFile(doc);
    if (file == null) return;
    await _shareDownloadedDoc(file);
  }

  Future<void> _copyAutofill() async {
    if (_autofill.isEmpty) {
      context.showSnack('No autofill data available yet.');
      return;
    }
    final lines =
        _autofill.entries.map((e) => '${e.key}: ${e.value}').toList();
    await Clipboard.setData(ClipboardData(text: lines.join('\n')));
    if (!mounted) return;
    context.showSnack('Autofill data copied. Paste into official form.');
  }

  Future<void> _copySingleField(String key, String value) async {
    await Clipboard.setData(ClipboardData(text: value));
    if (!mounted) return;
    context.showSnack('$key copied.');
  }

  Future<void> _shareAutofill() async {
    if (_autofill.isEmpty) {
      context.showSnack('No autofill values available yet.');
      return;
    }
    final text =
        _autofill.entries.map((e) => '${e.key}: ${e.value}').join('\n');
    await SharePlus.instance.share(ShareParams(text: text));
  }

  List<String> _requiredDocsFromScheme(Map<String, dynamic> scheme) {
    final raw = scheme['required_documents'];
    if (raw is! List) return const <String>[];
    final out = <String>[];
    for (final item in raw) {
      if (item is String && item.trim().isNotEmpty) {
        out.add(item.trim());
      } else if (item is Map) {
        final map = Map<String, dynamic>.from(item.cast<dynamic, dynamic>());
        final name = (map['name'] ?? map['document'] ?? '').toString().trim();
        if (name.isNotEmpty) out.add(name);
      }
    }
    return out;
  }

  Set<String> _seedReadinessFromProfile(
      Map<String, dynamic> scheme, Map<String, String> autofill) {
    final reqs = _requiredDocsFromScheme(scheme);
    final ready = <String>{};
    for (final req in reqs) {
      final d = req.toLowerCase();
      if (d.contains('aadhaar') && (autofill['aadhaar_number'] ?? '').isNotEmpty)
        ready.add(req);
      if (d.contains('bank') &&
          (autofill['bank_account'] ?? '').isNotEmpty &&
          (autofill['ifsc_code'] ?? '').isNotEmpty) ready.add(req);
      if ((d.contains('land') || d.contains('khasra')) &&
          (autofill['land_size_acres'] ?? '').isNotEmpty) ready.add(req);
      if ((d.contains('mobile') || d.contains('phone')) &&
          (autofill['phone'] ?? '').isNotEmpty) ready.add(req);
    }
    return ready;
  }

  Future<void> _copyReadinessChecklist() async {
    final reqs = _requiredDocsFromScheme(_scheme);
    if (reqs.isEmpty) {
      context.showSnack('No required-doc checklist available.');
      return;
    }
    final lines = reqs
        .map((item) =>
            '${_readinessDone.contains(item) ? '[x]' : '[ ]'} $item')
        .join('\n');
    await Clipboard.setData(ClipboardData(text: lines));
    if (!mounted) return;
    context.showSnack('Checklist copied.');
  }

  List<Map<String, dynamic>> get _visibleDocs {
    final q = _docSearch.trim().toLowerCase();
    final out = _downloadedDocs.where((doc) {
      final name = _docDisplayName(doc).toLowerCase();
      final type = _docTypeLabel(doc);
      return (q.isEmpty || name.contains(q)) &&
          (_docFilter == 'ALL' || type == _docFilter);
    }).toList();
    out.sort((a, b) {
      if (_sortByLargest) {
        final as_ = (a['size'] is num) ? (a['size'] as num).toDouble() : 0;
        final bs = (b['size'] is num) ? (b['size'] as num).toDouble() : 0;
        return bs.compareTo(as_);
      }
      return _docDisplayName(a)
          .toLowerCase()
          .compareTo(_docDisplayName(b).toLowerCase());
    });
    return out;
  }

  Future<void> _openPrimaryOfficialLink() async {
    final appUrl = (_scheme['application_url'] ?? '').toString().trim();
    if (appUrl.isNotEmpty) {
      await _openExternalUrl(appUrl);
      return;
    }
    if (_officialLinks.isNotEmpty) {
      await _openExternalUrl(_officialLinks.first['url'] ?? '');
      return;
    }
    context.showSnack('No official portal link available.', isError: true);
  }

  String _docTypeLabel(Map<String, dynamic> doc) {
    final fileName =
        (doc['filename'] ?? doc['name'] ?? '').toString().toLowerCase();
    final contentType = (doc['content_type'] ?? '').toString().toLowerCase();
    if (fileName.endsWith('.pdf') || contentType.contains('pdf')) return 'PDF';
    if (fileName.endsWith('.docx') || contentType.contains('wordprocessingml'))
      return 'DOCX';
    if (fileName.endsWith('.doc') || contentType.contains('msword')) return 'DOC';
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) return 'XLS';
    if (fileName.endsWith('.html') || contentType.contains('html')) return 'HTML';
    return 'FILE';
  }

  Future<void> _saveToProfile() async {
    if (_saving) return;
    final appUrl = (_scheme['application_url'] ?? '').toString().trim();
    final link = _officialLinks.isNotEmpty
        ? (_officialLinks.first['url'] ?? '').trim()
        : appUrl;
    if (link.isEmpty) {
      context.showSnack('No official form link available to save.',
          isError: true);
      return;
    }
    setState(() => _saving = true);
    try {
      final saved = SavedDocument(
        schemeId: widget.schemeId,
        schemeName: widget.schemeName,
        sessionId: widget.sessionId,
        documentUrl: link,
        generatedAt: DateTime.now(),
      );
      final docs = await ref
          .read(documentBuilderServiceProvider)
          .saveDocumentToProfile(saved);
      if (!mounted) return;
      setState(() => _savedDocs = docs);
      context.showSnack('Official form reference saved to profile vault.');
    } catch (_) {
      if (!mounted) return;
      context.showSnack('Could not save right now.', isError: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  // ── Build ────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final requiredDocs = _requiredDocsFromScheme(_scheme);
    final completed = requiredDocs.where(_readinessDone.contains).length;
    final readiness =
        requiredDocs.isEmpty ? 0.0 : completed / requiredDocs.length;

    return Scaffold(
      backgroundColor:
          isDark ? AppColors.darkBackground : AppColors.lightBackground,
      appBar: AppBar(
        title: const Text('Official Forms Hub'),
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
                      ? <Color>[
                          AppColors.darkBackground,
                          AppColors.darkSurface,
                        ]
                      : <Color>[
                          AppColors.lightBackground,
                          AppColors.lightSurface,
                        ],
                ),
              ),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                children: <Widget>[
                  // ── 1. Command Center ──────────────────────────────
                  _HubSection(
                    icon: Icons.dashboard_rounded,
                    iconColor: AppColors.primary,
                    title: 'Command Center',
                    subtitle: widget.schemeName,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        // Stats row
                        Row(
                          children: <Widget>[
                            Expanded(
                              child: _StatTile(
                                icon: Icons.file_copy_outlined,
                                label: 'Downloaded',
                                value: '${_downloadedDocs.length}',
                                isDark: isDark,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _StatTile(
                                icon: Icons.task_alt_outlined,
                                label: 'Readiness',
                                value: '${(readiness * 100).round()}%',
                                isDark: isDark,
                                highlight: readiness == 1.0,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _StatTile(
                                icon: Icons.link_outlined,
                                label: 'Links',
                                value: '${_officialLinks.length}',
                                isDark: isDark,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: <Widget>[
                            Expanded(
                              child: _OutlineBtn(
                                icon: Icons.public_rounded,
                                label: 'Scheme Portal',
                                onTap: _openPrimaryOfficialLink,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _OutlineBtn(
                                icon: Icons.history_rounded,
                                label: 'Last Saved',
                                onTap: _savedDocs.isEmpty
                                    ? null
                                    : () => _openExternalUrl(
                                        _savedDocs.first.documentUrl),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 12),

                  // ── 2. Readiness Tracker ───────────────────────────
                  _HubSection(
                    icon: Icons.checklist_rounded,
                    iconColor: AppColors.primary,
                    title: 'Application Readiness',
                    subtitle: 'Mark what you have ready before filling',
                    child: requiredDocs.isEmpty
                        ? _EmptyHint(
                            text:
                                'No required-doc checklist found for this scheme.',
                          )
                        : Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              // Progress bar + label
                              Row(
                                children: <Widget>[
                                  Expanded(
                                    child: ClipRRect(
                                      borderRadius: BorderRadius.circular(99),
                                      child: LinearProgressIndicator(
                                        value: readiness,
                                        minHeight: 7,
                                        backgroundColor: AppColors.primary
                                            .withValues(alpha: 0.12),
                                        valueColor:
                                            AlwaysStoppedAnimation<Color>(
                                          readiness == 1.0
                                              ? Colors.green
                                              : AppColors.primary,
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Text(
                                    '$completed/${requiredDocs.length}',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w800,
                                      color: isDark ? Colors.white : Colors.black,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              LayoutBuilder(
                                builder: (context, constraints) {
                                  final maxLabelWidth =
                                      (constraints.maxWidth - 54)
                                          .clamp(120.0, 260.0)
                                          .toDouble();
                                  return Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: requiredDocs.map((item) {
                                      final done =
                                          _readinessDone.contains(item);
                                      return _CheckChip(
                                        label: item,
                                        checked: done,
                                        maxLabelWidth: maxLabelWidth,
                                        onTap: () => setState(() {
                                          if (done) {
                                            _readinessDone = _readinessDone
                                                .where((e) => e != item)
                                                .toSet();
                                          } else {
                                            _readinessDone = {
                                              ..._readinessDone,
                                              item,
                                            };
                                          }
                                        }),
                                      );
                                    }).toList(),
                                  );
                                },
                              ),
                              const SizedBox(height: 12),
                              Align(
                                alignment: Alignment.centerRight,
                                child: _IconActionBtn(
                                  icon: Icons.checklist_rtl_outlined,
                                  tooltip: 'Copy Checklist',
                                  onTap: _copyReadinessChecklist,
                                  outlined: true,
                                ),
                              ),
                            ],
                          ),
                  ),

                  const SizedBox(height: 12),

                  // ── 3. Preview Forms ───────────────────────────────
                  _HubSection(
                    icon: Icons.visibility_rounded,
                    iconColor: AppColors.primary,
                    title: 'Preview & Download',
                    subtitle: 'Browse and open downloaded forms',
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        // Search
                        TextField(
                          onChanged: (v) => setState(() => _docSearch = v),
                          decoration: InputDecoration(
                            prefixIcon: const Icon(Icons.search, size: 20),
                            hintText: 'Search downloaded forms…',
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 10),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                        const SizedBox(height: 10),

                        // Filter chips + sort toggle
                        Row(
                          children: <Widget>[
                            Expanded(
                              child: SingleChildScrollView(
                                scrollDirection: Axis.horizontal,
                                child: Row(
                                  children: <Widget>[
                                    for (final f in const <String>[
                                      'ALL',
                                      'PDF',
                                      'DOC',
                                      'DOCX',
                                      'XLS',
                                      'HTML',
                                    ])
                                      Padding(
                                        padding:
                                            const EdgeInsets.only(right: 6),
                                        child: _FilterPill(
                                          label: f,
                                          selected: _docFilter == f,
                                          onTap: () => setState(
                                              () => _docFilter = f),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(width: 4),
                            Tooltip(
                              message: _sortByLargest
                                  ? 'Largest first'
                                  : 'Name A–Z',
                              child: InkWell(
                                borderRadius: BorderRadius.circular(10),
                                onTap: () => setState(
                                  () => _sortByLargest = !_sortByLargest,
                                ),
                                child: Padding(
                                  padding: const EdgeInsets.all(7),
                                  child: Icon(
                                    _sortByLargest
                                        ? Icons.sort_by_alpha_outlined
                                        : Icons.straighten_outlined,
                                    size: 20,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),

                        // Doc cards
                        if (_downloadedDocs.isEmpty)
                          _EmptyHint(
                            text:
                                'No downloaded docs yet. Sync once to start previewing.',
                          )
                        else if (_visibleDocs.isEmpty)
                          _EmptyHint(
                              text: 'No forms match your current filters.')
                        else
                          SizedBox(
                            height: 200,
                            child: ListView.separated(
                              scrollDirection: Axis.horizontal,
                              itemCount: _visibleDocs.length,
                              separatorBuilder: (_, __) =>
                                  const SizedBox(width: 10),
                              itemBuilder: (_, i) {
                                final doc = _visibleDocs[i];
                                final name = _docDisplayName(doc);
                                final size = (doc['size'] is num)
                                    ? (doc['size'] as num).toDouble()
                                    : 0;
                                final sizeKb =
                                    (size / 1024).toStringAsFixed(1);
                                return SizedBox(
                                  width: 260,
                                  child: _DocCard(
                                    title: name,
                                    sizeLabel: '$sizeKb KB',
                                    typeLabel: _docTypeLabel(doc),
                                    isDark: isDark,
                                    onOpen: () => _previewDownloadedDoc(doc),
                                    onPreview: () =>
                                        _previewDownloadedDoc(doc),
                                    onDownload: () =>
                                        _downloadDownloadedDoc(doc),
                                    onAutofill: _copyAutofill,
                                  ),
                                );
                              },
                            ),
                          ),

                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: <Widget>[
                            _IconActionBtn(
                              icon: _syncing
                                  ? Icons.hourglass_top_rounded
                                  : Icons.sync_rounded,
                              tooltip: 'Sync Forms',
                              onTap: _syncing ? null : _downloadAllNow,
                              outlined: true,
                            ),
                            _IconActionBtn(
                              icon: Icons.play_arrow_rounded,
                              tooltip: 'Quick Preview',
                              onTap: _visibleDocs.isEmpty
                                  ? null
                                  : () => _previewDownloadedDoc(
                                      _visibleDocs.first),
                              outlined: true,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 12),

                  // ── 4. Official Sources ────────────────────────────
                  _HubSection(
                    icon: Icons.link_rounded,
                    iconColor: Colors.orange,
                    title: 'Official Sources',
                    subtitle: widget.schemeName,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        if (_officialLinks.isEmpty)
                          _EmptyHint(
                            text:
                                'No mapped official links yet. Use Sync to discover links from the scheme portal.',
                          )
                        else
                          ..._officialLinks.map((link) => _LinkRow(
                                name: link['name'] ?? 'Official Form Link',
                                onOpen: () =>
                                    _openExternalUrl(link['url'] ?? ''),
                              )),
                        const SizedBox(height: 12),
                        Align(
                          alignment: Alignment.centerRight,
                          child: _IconActionBtn(
                            icon: _syncing
                                ? Icons.hourglass_top_rounded
                                : Icons.download_rounded,
                            tooltip: 'Download All Official Forms',
                            onTap: _syncing ? null : _downloadAllNow,
                            outlined: true,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 12),

                  // ── 5. Autofill Helper ─────────────────────────────
                  _HubSection(
                    icon: Icons.auto_fix_high_rounded,
                    iconColor: AppColors.primary,
                    title: 'Autofill Helper',
                    subtitle: 'Tap any field to copy it instantly',
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        if (_autofill.isEmpty)
                          _EmptyHint(text: 'No autofill values available.')
                        else
                          ..._autofill.entries.map((e) => _AutofillRow(
                                fieldKey: e.key,
                                value: e.value,
                                onTap: () =>
                                    _copySingleField(e.key, e.value),
                              )),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: <Widget>[
                            _IconActionBtn(
                              icon: Icons.copy_all_outlined,
                              tooltip: 'Copy All',
                              onTap: _copyAutofill,
                              outlined: true,
                            ),
                            _IconActionBtn(
                              icon: Icons.share_outlined,
                              tooltip: 'Share',
                              onTap: _shareAutofill,
                              outlined: true,
                            ),
                            _IconActionBtn(
                              icon: _saving
                                  ? Icons.hourglass_top_rounded
                                  : Icons.save_outlined,
                              tooltip: 'Save Link',
                              onTap: _saving ? null : _saveToProfile,
                              outlined: true,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 12),

                  // ── 6. Saved References ────────────────────────────
                  _HubSection(
                    icon: Icons.bookmark_rounded,
                    iconColor: AppColors.primary,
                    title: 'Saved References',
                    subtitle: 'Recent official form links in your vault',
                    child: _savedDocs.isEmpty
                        ? _EmptyHint(text: 'No saved references yet.')
                        : Column(
                            children: _savedDocs.take(5).map((d) {
                              return _SavedRefTile(
                                schemeName: d.schemeName,
                                date:
                                    '${d.generatedAt.day}/${d.generatedAt.month}/${d.generatedAt.year}',
                                onTap: () =>
                                    _openExternalUrl(d.documentUrl),
                              );
                            }).toList(),
                          ),
                  ),
                ],
              ),
            ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Section wrapper
// ─────────────────────────────────────────────────────────────────────────────

class _HubSection extends StatelessWidget {
  const _HubSection({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.child,
  });

  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final titleColor = isDark ? Colors.white : Colors.black;
    final subtitleColor = isDark ? Colors.white70 : Colors.black54;
    return Container(
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.08)
            : Colors.white.withValues(alpha: 0.56),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.18)
              : Colors.white.withValues(alpha: 0.8),
          width: 1.2,
        ),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: AppColors.primaryDark.withValues(alpha: isDark ? 0.06 : 0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                Icon(icon, size: 20, color: iconColor),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        title,
                        style: context.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: titleColor,
                        ),
                      ),
                      Text(
                        subtitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: context.textTheme.bodySmall?.copyWith(
                          color: subtitleColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Divider(
              height: 1,
              thickness: 1,
              color: isDark
                  ? Colors.white.withValues(alpha: 0.12)
                  : Colors.white.withValues(alpha: 0.75),
            ),
            const SizedBox(height: 14),
            child,
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Stat tile
// ─────────────────────────────────────────────────────────────────────────────

class _StatTile extends StatelessWidget {
  const _StatTile({
    required this.icon,
    required this.label,
    required this.value,
    required this.isDark,
    this.highlight = false,
  });

  final IconData icon;
  final String label;
  final String value;
  final bool isDark;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    final color = highlight ? AppColors.primaryDark : AppColors.primary;
    final isDark = context.isDark;
    final textColor = isDark ? Colors.white : Colors.black;
    final muted = isDark ? Colors.white70 : Colors.black54;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.05)
            : Colors.white.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.08)
              : Colors.white.withValues(alpha: 0.8),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(icon, size: 20, color: color),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w900,
              color: textColor,
            ),
          ),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: muted,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Check chip
// ─────────────────────────────────────────────────────────────────────────────

class _CheckChip extends StatelessWidget {
  const _CheckChip({
    required this.label,
    required this.checked,
    required this.maxLabelWidth,
    required this.onTap,
  });

  final String label;
  final bool checked;
  final double maxLabelWidth;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final textColor = isDark ? Colors.white : Colors.black;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(99),
          border: Border.all(
            color: checked
                ? AppColors.primary.withValues(alpha: 0.55)
                : AppColors.primary.withValues(alpha: 0.25),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(
              checked
                  ? Icons.check_circle_rounded
                  : Icons.radio_button_unchecked_rounded,
              size: 18,
              color: AppColors.primary,
            ),
            const SizedBox(width: 6),
            ConstrainedBox(
              constraints: BoxConstraints(maxWidth: maxLabelWidth),
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                softWrap: false,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: textColor,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Filter pill
// ─────────────────────────────────────────────────────────────────────────────

class _FilterPill extends StatelessWidget {
  const _FilterPill({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final textColor = isDark ? Colors.white : Colors.black;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(99),
          border: Border.all(
            color: selected
                ? AppColors.primary.withValues(alpha: 0.7)
                : AppColors.primary.withValues(alpha: 0.25),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: textColor,
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Doc card
// ─────────────────────────────────────────────────────────────────────────────

class _DocCard extends StatelessWidget {
  const _DocCard({
    required this.title,
    required this.sizeLabel,
    required this.typeLabel,
    required this.isDark,
    required this.onOpen,
    required this.onPreview,
    required this.onDownload,
    required this.onAutofill,
  });

  final String title;
  final String sizeLabel;
  final String typeLabel;
  final bool isDark;
  final VoidCallback onOpen;
  final VoidCallback onPreview;
  final VoidCallback onDownload;
  final VoidCallback onAutofill;

  IconData get _typeIcon {
    switch (typeLabel) {
      case 'PDF': return Icons.picture_as_pdf_outlined;
      case 'DOC':
      case 'DOCX': return Icons.description_outlined;
      case 'XLS': return Icons.table_chart_outlined;
      case 'HTML': return Icons.language_outlined;
      default: return Icons.insert_drive_file_outlined;
    }
  }

  Color get _typeColor {
    switch (typeLabel) {
      case 'PDF': return Colors.red;
      case 'DOC':
      case 'DOCX': return AppColors.primaryDark;
      case 'XLS': return AppColors.primary;
      case 'HTML': return Colors.orange;
      default: return AppColors.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final textColor = isDark ? Colors.white : Colors.black;
    final muted = isDark ? Colors.white70 : Colors.black54;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onOpen,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          decoration: BoxDecoration(
            color: isDark
                ? Colors.white.withValues(alpha: 0.08)
                : Colors.white.withValues(alpha: 0.56),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.18)
                  : Colors.white.withValues(alpha: 0.8),
              width: 1.2,
            ),
            boxShadow: <BoxShadow>[
              BoxShadow(
                color: AppColors.primaryDark.withValues(alpha: isDark ? 0.06 : 0.08),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          padding: const EdgeInsets.all(13),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              // Type badge + title
              Row(
                children: <Widget>[
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _typeColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: <Widget>[
                        Icon(_typeIcon, size: 16, color: _typeColor),
                        const SizedBox(width: 4),
                        Text(
                          typeLabel,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: isDark ? Colors.white : Colors.black,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  Text(
                    sizeLabel,
                    style: TextStyle(
                      fontSize: 11,
                      color: muted,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: context.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  height: 1.3,
                  color: textColor,
                ),
              ),
              const Spacer(),
              // Action buttons
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: <Widget>[
                      _MiniBtn(
                        icon: Icons.visibility_outlined,
                        tooltip: 'Preview',
                        onTap: onPreview,
                        outlined: true,
                      ),
                      const SizedBox(width: 5),
                      _MiniBtn(
                        icon: Icons.download_outlined,
                        tooltip: 'Download',
                        onTap: onDownload,
                        outlined: true,
                      ),
                      const SizedBox(width: 5),
                      _MiniBtn(
                        icon: Icons.auto_fix_high,
                        tooltip: 'Autofill',
                        onTap: onAutofill,
                        outlined: true,
                      ),
                    ],
                  ),
                ],
              ),
        ),
      ),
    );
  }
}

class _MiniBtn extends StatelessWidget {
  const _MiniBtn({
    required this.icon,
    required this.tooltip,
    required this.onTap,
    required this.outlined,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;
  final bool outlined;

  @override
  Widget build(BuildContext context) {
    final enabledColor = AppColors.primary;
    return Tooltip(
      message: tooltip,
      child: GestureDetector(
        onTap: onTap,
        child: SizedBox(
          width: 34,
          height: 34,
          child: Icon(
            icon,
            size: 22,
            color: enabledColor,
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Link row
// ─────────────────────────────────────────────────────────────────────────────

class _LinkRow extends StatelessWidget {
  const _LinkRow({required this.name, required this.onOpen});
  final String name;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final textColor = isDark ? Colors.white : Colors.black;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: <Widget>[
          Icon(Icons.link_rounded, size: 20, color: AppColors.primary),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              name,
              style: context.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: textColor,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 8),
          _IconActionBtn(
            icon: Icons.open_in_new_rounded,
            tooltip: 'Open Link',
            onTap: onOpen,
            outlined: true,
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Autofill row
// ─────────────────────────────────────────────────────────────────────────────

class _AutofillRow extends StatelessWidget {
  const _AutofillRow({
    required this.fieldKey,
    required this.value,
    required this.onTap,
  });

  final String fieldKey;
  final String value;
  final VoidCallback onTap;

  String get _displayKey => fieldKey
      .replaceAll('_', ' ')
      .split(' ')
      .map((w) => w.isEmpty ? '' : '${w[0].toUpperCase()}${w.substring(1)}')
      .join(' ');

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final textColor = isDark ? Colors.white : Colors.black;
    final keyColor = isDark ? Colors.white70 : Colors.black54;
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
          decoration: BoxDecoration(
            color: isDark
                ? Colors.white.withValues(alpha: 0.04)
                : Colors.white.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.07)
                  : Colors.white.withValues(alpha: 0.78),
            ),
          ),
          child: Row(
            children: <Widget>[
              SizedBox(
                width: 120,
                child: Text(
                  _displayKey,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: keyColor,
                  ),
                ),
              ),
              Expanded(
                child: Text(
                  value,
                  style: context.textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: textColor,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Icon(
                Icons.copy_rounded,
                size: 18,
                color: AppColors.primary.withValues(alpha: 0.5),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Saved ref tile
// ─────────────────────────────────────────────────────────────────────────────

class _SavedRefTile extends StatelessWidget {
  const _SavedRefTile({
    required this.schemeName,
    required this.date,
    required this.onTap,
  });

  final String schemeName;
  final String date;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final textColor = isDark ? Colors.white : Colors.black;
    final muted = isDark ? Colors.white70 : Colors.black54;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: <Widget>[
            Icon(Icons.bookmark_outlined, size: 20, color: AppColors.primary),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                schemeName,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: context.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: textColor,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Text(
              date,
              style: context.textTheme.bodySmall?.copyWith(
                color: muted,
              ),
            ),
            const SizedBox(width: 6),
            Icon(Icons.chevron_right_rounded, size: 18, color: muted),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Shared button components
// ─────────────────────────────────────────────────────────────────────────────

class _OutlineBtn extends StatelessWidget {
  const _OutlineBtn({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final textColor = context.isDark ? Colors.white : Colors.black;
    return OutlinedButton.icon(
      onPressed: onTap,
      icon: Icon(icon, size: 18),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        foregroundColor: textColor,
        side: BorderSide(color: AppColors.primary.withValues(alpha: 0.5)),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
      ),
    );
  }
}

class _EmptyHint extends StatelessWidget {
  const _EmptyHint({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    return Text(
      text,
      style: context.textTheme.bodySmall?.copyWith(
        color: isDark ? Colors.white70 : Colors.black54,
        height: 1.5,
      ),
    );
  }
}

class _IconActionBtn extends StatelessWidget {
  const _IconActionBtn({
    required this.icon,
    required this.tooltip,
    required this.onTap,
    required this.outlined,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback? onTap;
  final bool outlined;

  @override
  Widget build(BuildContext context) {
    final enabled = onTap != null;
    final iconColor = enabled
        ? AppColors.primary
        : (context.isDark ? Colors.white54 : Colors.black38);
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: SizedBox(
          width: 36,
          height: 36,
          child: Icon(
            icon,
            size: 23,
            color: iconColor,
          ),
        ),
      ),
    );
  }
}