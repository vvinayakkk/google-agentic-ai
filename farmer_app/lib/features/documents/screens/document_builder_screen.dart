import 'package:easy_localization/easy_localization.dart';
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
import '../../../shared/services/personalization_service.dart';
import 'official_form_preview_page.dart';
import 'preview_download_screen.dart';
import 'scheme_details_page.dart';
import '../utils/document_scheme_map.dart';

class DocumentBuilderScreen extends ConsumerStatefulWidget {
  const DocumentBuilderScreen({super.key});

  @override
  ConsumerState<DocumentBuilderScreen> createState() =>
      _DocumentBuilderScreenState();
}

class _DocumentBuilderScreenState extends ConsumerState<DocumentBuilderScreen> {
  static const String _pilotAutofillDocName = 'document_1399033a05ab.html';

  bool _loading = true;
  bool _syncingAllForms = false;
  String _search = '';
  String _selectedCategory = 'All';
  bool _highestBenefit = false;
  bool _loadingFormPreviews = false;
  bool _autofillPreviewInProgress = false;

  Map<String, dynamic> _profile = <String, dynamic>{};
  List<Map<String, dynamic>> _schemes = <Map<String, dynamic>>[];
  List<_FormPreviewCardData> _formPreviewCards = <_FormPreviewCardData>[];

  static const List<String> _categories = <String>[
    'All',
    'Income Support',
    'Crop Insurance',
    'Credit',
    'Mechanisation',
    'Irrigation',
    'Organic',
    'State',
  ];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final personalization = ref.read(personalizationServiceProvider);
      final profile = await personalization.getProfileContext();
      final schemes = await ref
          .read(documentBuilderServiceProvider)
          .listSchemes(forceRefresh: false);

      final ranked =
          schemes
              .map((s) => Map<String, dynamic>.from(s))
              .toList(growable: false)
            ..sort(
              (a, b) =>
                  _schemeScore(b, profile).compareTo(_schemeScore(a, profile)),
            );

      if (!mounted) return;
      setState(() {
        _profile = profile;
        _schemes = ranked;
        _loading = false;
      });
      await _loadFormPreviewCards();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _profile = <String, dynamic>{};
        _schemes = <Map<String, dynamic>>[];
        _formPreviewCards = <_FormPreviewCardData>[];
        _loading = false;
      });
    }
  }

  int _schemeScore(Map<String, dynamic> scheme, Map<String, dynamic> profile) {
    var score = 0;
    final schemeText = [
      scheme['name'],
      scheme['short_name'],
      scheme['description'],
      scheme['category'],
      scheme['state'],
    ].map((e) => (e ?? '').toString().toLowerCase()).join(' ');

    final landHa = _landHectares(profile);
    final crops = _profileCrops(profile);
    final state = (profile['state'] ?? '').toString().toLowerCase();
    final isOrganic =
        profile['is_organic'] == true ||
        (profile['farming_type'] ?? '').toString().toLowerCase().contains(
          'organic',
        );

    if (landHa > 0 && landHa <= 2) {
      if (_containsAny(schemeText, const <String>[
        'pm-kisan',
        'kcc',
        'pm-kmy',
        'pmfby',
      ])) {
        score += 9;
      }
    }

    if (crops.any((c) => c.contains('rice') || c.contains('wheat'))) {
      if (_containsAny(schemeText, const <String>['pmfby', 'nfsm', 'msp'])) {
        score += 7;
      }
    }

    if (state.contains('maharashtra') &&
        _containsAny(schemeText, const <String>[
          'mahadbt',
          'mjpsky',
          'nsmsny',
        ])) {
      score += 8;
    }
    if (state.contains('telangana') && schemeText.contains('rythu bandhu')) {
      score += 8;
    }
    if (state.contains('andhra') && schemeText.contains('rythu bharosa')) {
      score += 8;
    }

    if (isOrganic &&
        _containsAny(schemeText, const <String>['pkvy', 'nmkf', 'organic'])) {
      score += 7;
    }

    if (crops.isEmpty &&
        _containsAny(schemeText, const <String>[
          'pm-kisan',
          'kcc',
          'shc',
          'pmfby',
        ])) {
      score += 6;
    }

    if (scheme['required_documents'] is List) {
      score += 2;
    }

    final docsNeeded = _requiredDocuments(scheme).length;
    score -= docsNeeded ~/ 3;
    return score;
  }

  bool _containsAny(String text, List<String> keys) {
    for (final key in keys) {
      if (text.contains(key)) return true;
    }
    return false;
  }

  double _landHectares(Map<String, dynamic> profile) {
    final acres = double.tryParse(
      (profile['land_size_acres'] ??
              profile['land_area'] ??
              profile['land'] ??
              '')
          .toString(),
    );
    if (acres != null && acres > 0) return acres * 0.4047;

    final hectares = double.tryParse(
      (profile['land_size_hectares'] ?? '').toString(),
    );
    return hectares ?? 0;
  }

  List<String> _profileCrops(Map<String, dynamic> profile) {
    final crops = <String>[];
    final raw = profile['crops'];
    if (raw is List) {
      crops.addAll(raw.map((e) => e.toString().toLowerCase()));
    }
    final mainCrop = (profile['main_crop'] ?? profile['crop_name'] ?? '')
        .toString()
        .trim();
    if (mainCrop.isNotEmpty) crops.add(mainCrop.toLowerCase());
    return crops;
  }

  String _normalizeSchemeLookup(String value) {
    return value.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), ' ').trim();
  }

  Map<String, dynamic>? _findSchemeForDownloadedKey(String rawKey) {
    final target = _normalizeSchemeLookup(rawKey);
    if (target.isEmpty) return null;

    for (final scheme in _schemes) {
      final keys = <String>[
        (scheme['id'] ?? '').toString(),
        (scheme['scheme_id'] ?? '').toString(),
        (scheme['short_name'] ?? '').toString(),
        (scheme['name'] ?? '').toString(),
      ];

      final matches = keys.any((key) {
        final normalized = _normalizeSchemeLookup(key);
        return normalized.isNotEmpty && normalized == target;
      });
      if (matches) return scheme;
    }

    return null;
  }

  Map<String, dynamic>? _findSchemeForPreviewItem(_FormPreviewCardData item) {
    final byId = _findSchemeForDownloadedKey(item.schemeId);
    if (byId != null) return byId;
    return _findSchemeForDownloadedKey(item.schemeLookupKey);
  }

  String _firstOfficialUrlForScheme(Map<String, dynamic> scheme) {
    final appUrl = (scheme['application_url'] ?? '').toString().trim();
    if (appUrl.isNotEmpty) return appUrl;

    final links = _formDownloadItems(scheme);
    if (links.isNotEmpty) {
      return (links.first['url'] ?? '').trim();
    }

    return '';
  }

  Future<void> _openSchemePortalForPreviewItem(
    _FormPreviewCardData item,
  ) async {
    final scheme = _findSchemeForPreviewItem(item);
    if (scheme == null) {
      context.showSnack(
        'screen.document_builder_screen.official_portal_link_not_available_for_this_scheme'
            .tr(),
      );
      return;
    }

    await _hydrateSchemeDetailsInPlace(scheme);
    final link = _firstOfficialUrlForScheme(scheme);
    await _openExternalUrl(link);
  }

  Future<void> _sharePreviewFile(GeneratedDocumentFile file) async {
    await SharePlus.instance.share(
      ShareParams(
        text:
            'screen.document_builder_screen.official_form_downloaded_from_kisankiawaaz'
                .tr(),
        files: <XFile>[XFile(file.file.path)],
      ),
    );
    if (!mounted) return;
    context.showSnack(
      'screen.document_builder_screen.document_is_ready_to_save_share_from_this_sheet'
          .tr(),
    );
  }

  Map<String, String> _profileAutofillForPreview() {
    String pick(List<String> keys) {
      for (final key in keys) {
        final value = (_profile[key] ?? '').toString().trim();
        if (value.isNotEmpty) return value;
      }
      return '';
    }

    String composedAddress() {
      final parts = <String>[
        pick(<String>['address']),
        pick(<String>['village']),
        pick(<String>['sub_district', 'tehsil', 'taluka', 'block']),
        pick(<String>['district']),
        pick(<String>['state']),
        pick(<String>['pin_code', 'pincode']),
      ].where((part) => part.isNotEmpty).toList(growable: false);
      return parts.join(', ');
    }

    final map = <String, String>{
      'applicant_name': pick(<String>['name', 'farmer_name']),
      'farmer_name': pick(<String>['farmer_name', 'name']),
      'father_name': pick(<String>[
        'father_name',
        'father_or_husband_name',
        'husband_name',
      ]),
      'phone': pick(<String>['phone', 'mobile', 'mobile_number']),
      'mobile_number': pick(<String>['mobile_number', 'phone', 'mobile']),
      'village': pick(<String>['village']),
      'block': pick(<String>['block']),
      'sub_district': pick(<String>['sub_district', 'tehsil', 'taluka']),
      'district': pick(<String>['district']),
      'state': pick(<String>['state']),
      'pin_code': pick(<String>['pin_code', 'pincode']),
      'land_size_acres': pick(<String>['land_size_acres', 'land_size']),
      'land_area_hectares': pick(<String>['land_size_hectares', 'land_area_hectares']),
      'aadhaar_number': pick(<String>['aadhaar', 'aadhaar_number']),
      'gender': pick(<String>['gender']),
      'category': pick(<String>['category']),
      'bank_account': pick(<String>['bank_account', 'account_number']),
      'bank_account_holder_name': pick(<String>[
        'bank_account_holder_name',
        'name',
        'farmer_name',
      ]),
      'ifsc_code': pick(<String>['ifsc', 'ifsc_code']),
      'address': composedAddress(),
      'area_type': pick(<String>['area_type']),
    };
    if ((map['area_type'] ?? '').isEmpty) {
      map['area_type'] = 'Rural';
    }
    map.removeWhere((_, value) => value.trim().isEmpty);
    return map;
  }

  Map<String, String> _sessionAutofillAnswersForPreview() {
    final out = _profileAutofillForPreview();

    String pick(List<String> keys) {
      for (final key in keys) {
        final value = (out[key] ?? '').toString().trim();
        if (value.isNotEmpty) return value;
      }
      return '';
    }

    void setIfMissing(String target, List<String> candidates) {
      if ((out[target] ?? '').trim().isNotEmpty) return;
      final value = pick(candidates);
      if (value.isNotEmpty) out[target] = value;
    }

    setIfMissing('farmer_name', ['applicant_name']);
    setIfMissing('full_name', ['applicant_name', 'farmer_name']);
    setIfMissing('mobile_number', ['phone']);
    setIfMissing('bank_account_number', ['bank_account']);
    setIfMissing('land_area_acres', ['land_size_acres']);
    setIfMissing('bank_account_holder_name', ['applicant_name', 'farmer_name']);

    out.removeWhere((_, value) => value.trim().isEmpty);
    return out;
  }

  List<String> _sessionSeedsForPreviewItem(
    _FormPreviewCardData item,
    Map<String, dynamic>? scheme,
  ) {
    final seeds = <String>{};
    void add(dynamic raw) {
      final value = (raw ?? '').toString().trim();
      if (value.isNotEmpty) seeds.add(value);
    }

    add(item.schemeId);
    add(item.schemeLookupKey);
    add(item.schemeName);
    add(scheme?['id']);
    add(scheme?['scheme_id']);
    add(scheme?['short_name']);
    add(scheme?['name']);

    return seeds.toList(growable: false);
  }

  Future<void> _autofillAndOpenDirectPreview(_FormPreviewCardData item) async {
    if (_autofillPreviewInProgress) {
      context.showSnack('Autofill is already running. Please wait.');
      return;
    }

    final docName = item.documentName.trim();
    if (docName.isEmpty || item.typeLabel != 'HTML') {
      context.showSnack(
        'Only fillable HTML forms are supported for in-app autofill.',
        isError: true,
      );
      return;
    }

    setState(() => _autofillPreviewInProgress = true);
    try {
      final docService = ref.read(documentBuilderServiceProvider);
      final mapped = _findSchemeForPreviewItem(item);
      final scheme = mapped == null
          ? <String, dynamic>{}
          : Map<String, dynamic>.from(mapped);
      if (scheme.isNotEmpty) {
        await _hydrateSchemeDetailsInPlace(scheme);
      }

      final schemeName = (scheme['name'] ?? item.schemeName).toString().trim();

      Map<String, dynamic>? started;
      Object? lastError;
      for (final seed in _sessionSeedsForPreviewItem(item, scheme)) {
        try {
          started = await docService.startSession(
            seed,
            schemeName: schemeName.isEmpty ? null : schemeName,
            preferredFormat: 'html',
          );
          final sid = (started['session_id'] ?? '').toString().trim();
          if (sid.isNotEmpty) break;
        } catch (e) {
          lastError = e;
        }
      }

      final sessionId = (started?['session_id'] ?? '').toString().trim();
      if (sessionId.isEmpty) {
        throw lastError ?? Exception('Could not start autofill session');
      }

      final answers = _sessionAutofillAnswersForPreview();
      if (answers.isNotEmpty) {
        await docService.submitFields(sessionId: sessionId, values: answers);
      }

      await docService.generateDocument(
        sessionId,
        format: 'html',
        sourceDocumentName: docName,
      );

      final generated = await docService.downloadGeneratedDocumentFile(
        sessionId,
      );
      if (generated == null) {
        throw Exception('Autofilled document not available');
      }

      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => OfficialFormPreviewPage(
            title: '$docName (Autofilled)',
            typeLabel: 'HTML',
            file: generated,
            onAutofill: () => _autofillAndOpenDirectPreview(item),
            onDownload: () => _sharePreviewFile(generated),
            onOpenExternal: () => _openSchemePortalForPreviewItem(item),
            onOpenHub: () => Navigator.of(context).maybePop(),
          ),
        ),
      );

      if (!mounted) return;
      context.showSnack('Autofilled preview generated from your profile data.');
    } catch (_) {
      if (!mounted) return;
      context.showSnack(
        'Could not autofill this form right now. Please try again.',
        isError: true,
      );
    } finally {
      if (mounted) {
        setState(() => _autofillPreviewInProgress = false);
      }
    }
  }

  List<Map<String, dynamic>> get _recommendedSchemes {
    final scored =
        _schemes
            .map((s) => (score: _schemeScore(s, _profile), scheme: s))
            .toList(growable: false)
          ..sort((a, b) => b.score.compareTo(a.score));
    return scored.take(8).map((e) => e.scheme).toList(growable: false);
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

  bool _isHtmlDownloadedDoc(Map<String, dynamic> doc) {
    final fileName = (doc['filename'] ?? doc['name'] ?? '')
        .toString()
        .toLowerCase();
    final contentType = (doc['content_type'] ?? '').toString().toLowerCase();
    return fileName.endsWith('.html') ||
        fileName.endsWith('.htm') ||
        contentType.contains('html');
  }

  bool _isAutofillCapableDownloadedDoc(Map<String, dynamic> doc) {
    if (!_isHtmlDownloadedDoc(doc)) return false;

    final fileName = (doc['filename'] ?? doc['name'] ?? '')
        .toString()
        .trim()
        .toLowerCase();
    if (fileName != _pilotAutofillDocName) {
      return false;
    }

    final explicit = doc['autofill_possible'];
    if (explicit is bool) return explicit;

    final candidate = doc['is_form_candidate'];
    if (candidate is bool) return candidate;

    return true;
  }

  Future<void> _openOfficialFormsHub([_FormPreviewCardData? preferred]) async {
    _FormPreviewCardData? selected = preferred;
    if (selected == null && _formPreviewCards.isNotEmpty) {
      selected = _formPreviewCards.first;
    }

    if (selected == null && _recommendedSchemes.isNotEmpty) {
      final scheme = _recommendedSchemes.first;
      final id = _schemeId(scheme);
      final name = (scheme['name'] ?? scheme['short_name'] ?? id).toString();
      final lookup = (scheme['short_name'] ?? scheme['name'] ?? id).toString();
      selected = _FormPreviewCardData(
        schemeId: id,
        schemeName: name,
        schemeLookupKey: lookup,
        documentName: '',
        documentSizeKb: 0,
        typeLabel: 'FILE',
      );
    }

    final target = selected;
    if (target == null) {
      context.showSnack(
        'screen.document_builder_screen.no_scheme_available_right_now'.tr(),
        isError: true,
      );
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PreviewDownloadScreen(
          sessionId: 'preview-${DateTime.now().millisecondsSinceEpoch}',
          schemeId: target.schemeId,
          schemeName: target.schemeName,
          initialDocumentName: target.documentName,
        ),
      ),
    );
  }

  Future<void> _openDirectPreview(_FormPreviewCardData item) async {
    final docName = item.documentName.trim();
    if (docName.isEmpty) {
      await _openOfficialFormsHub(item);
      return;
    }

    final service = ref.read(documentBuilderServiceProvider);
    final file = await service.downloadSchemeDocumentFile(
      schemeKey: item.schemeLookupKey,
      docName: docName,
    );

    if (!mounted) return;
    if (file == null) {
      context.showSnack(
        'Could not open instant preview. Opening forms hub instead.',
      );
      await _openOfficialFormsHub(item);
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => OfficialFormPreviewPage(
          title: item.documentName,
          typeLabel: item.typeLabel,
          file: file,
          onAutofill: () async {
            await _autofillAndOpenDirectPreview(item);
          },
          onDownload: () async {
            await _sharePreviewFile(file);
          },
          onOpenExternal: () async {
            await _openSchemePortalForPreviewItem(item);
          },
          onOpenHub: () {
            Navigator.of(context).pop();
            _openOfficialFormsHub(item);
          },
        ),
      ),
    );
  }

  List<_FormPreviewCardData> _buildPreviewCardsFromDocs(
    List<Map<String, dynamic>> allDownloaded, {
    int limit = 20,
  }) {
    final previews = <_FormPreviewCardData>[];
    final seen = <String>{};

    for (final doc in allDownloaded) {
      final exists = doc['exists'];
      if (exists is bool && !exists) continue;
      if (!_isAutofillCapableDownloadedDoc(doc)) continue;

      final docName = (doc['filename'] ?? doc['name'] ?? '').toString().trim();
      if (docName.isEmpty) continue;

      final rawSchemeKey = (doc['scheme'] ?? doc['scheme_name'] ?? '')
          .toString()
          .trim();
      final mappedScheme = _findSchemeForDownloadedKey(rawSchemeKey);

      final schemeId = mappedScheme != null
          ? _schemeId(mappedScheme)
          : rawSchemeKey;
      if (schemeId.trim().isEmpty) continue;

      final schemeName = mappedScheme != null
          ? (mappedScheme['name'] ?? mappedScheme['short_name'] ?? schemeId)
                .toString()
          : (rawSchemeKey.isEmpty ? 'Official Scheme Form' : rawSchemeKey);

      final lookupKey = mappedScheme != null
          ? (mappedScheme['short_name'] ?? mappedScheme['name'] ?? schemeId)
                .toString()
          : (rawSchemeKey.isEmpty ? schemeId : rawSchemeKey);

      final dedupeKey = '${schemeId.toLowerCase()}::${docName.toLowerCase()}';
      if (!seen.add(dedupeKey)) continue;

      final sizeRaw = doc['size'];
      final sizeBytes = sizeRaw is num ? sizeRaw.toDouble() : 0;

      previews.add(
        _FormPreviewCardData(
          schemeId: schemeId,
          schemeName: schemeName,
          schemeLookupKey: lookupKey,
          documentName: docName,
          documentSizeKb: sizeBytes > 0 ? (sizeBytes / 1024) : 0,
          typeLabel: _docTypeLabel(docName),
        ),
      );

      if (previews.length >= limit) break;
    }

    return previews;
  }

  Future<void> _loadFormPreviewCards() async {
    if (_schemes.isEmpty) {
      if (mounted) {
        setState(() {
          _formPreviewCards = <_FormPreviewCardData>[];
          _loadingFormPreviews = false;
        });
      }
      return;
    }

    if (mounted) setState(() => _loadingFormPreviews = true);

    try {
      final docService = ref.read(documentBuilderServiceProvider);
      final cached = await docService.getCachedSchemeDocs();
      final cachedPreviews = _buildPreviewCardsFromDocs(cached);
      if (mounted && cachedPreviews.isNotEmpty) {
        setState(() {
          _formPreviewCards = cachedPreviews;
        });
      }

      final allDownloaded = await docService.listSchemeDocs(
        preferCache: true,
        forceRefresh: cachedPreviews.isEmpty,
      );
      final previews = _buildPreviewCardsFromDocs(allDownloaded);

      if (previews.isEmpty) {
        for (final scheme in _recommendedSchemes) {
          final schemeId = _schemeId(scheme);
          if (schemeId.trim().isEmpty) continue;

          final schemeName =
              (scheme['name'] ?? scheme['short_name'] ?? schemeId).toString();
          final schemeKey = (scheme['short_name'] ?? scheme['name'] ?? schemeId)
              .toString();

          var docs = await docService.listSchemeDocumentsByScheme(
            schemeKey,
            preferCache: true,
            forceRefresh: false,
          );
          if (docs.isEmpty && schemeKey != schemeId) {
            docs = await docService.listSchemeDocumentsByScheme(
              schemeId,
              preferCache: true,
              forceRefresh: false,
            );
          }

          docs = docs
              .where(_isAutofillCapableDownloadedDoc)
              .toList(growable: false);
          if (docs.isEmpty) continue;

          for (final doc in docs.take(2)) {
            final docName = (doc['filename'] ?? doc['name'] ?? 'Document')
                .toString();
            final size = (doc['size'] is num)
                ? (doc['size'] as num).toDouble()
                : 0;
            previews.add(
              _FormPreviewCardData(
                schemeId: schemeId,
                schemeName: schemeName,
                schemeLookupKey: schemeKey,
                documentName: docName,
                documentSizeKb: (size / 1024),
                typeLabel: _docTypeLabel(docName),
              ),
            );
            if (previews.length >= 12) break;
          }

          if (previews.length >= 12) break;
        }
      }

      if (!mounted) return;
      setState(() {
        _formPreviewCards = previews;
        _loadingFormPreviews = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loadingFormPreviews = false;
      });
    }
  }

  List<Map<String, dynamic>> get _filteredSchemes {
    var out = _schemes
        .where((scheme) {
          final hay = [
            scheme['name'],
            scheme['short_name'],
            scheme['description'],
            scheme['category'],
          ].map((e) => (e ?? '').toString().toLowerCase()).join(' ');
          final matchesSearch =
              _search.trim().isEmpty ||
              hay.contains(_search.trim().toLowerCase());
          if (!matchesSearch) return false;

          if (_selectedCategory == 'All') return true;
          final cat = (scheme['category'] ?? '').toString().toLowerCase();
          switch (_selectedCategory) {
            case 'Income Support':
              return cat.contains('income') || hay.contains('pm-kisan');
            case 'Crop Insurance':
              return cat.contains('insurance') || hay.contains('pmfby');
            case 'Credit':
              return cat.contains('credit') || hay.contains('kcc');
            case 'Mechanisation':
              return cat.contains('mechan') || hay.contains('smam');
            case 'Irrigation':
              return cat.contains('irrigation') || hay.contains('water');
            case 'Organic':
              return cat.contains('organic') ||
                  hay.contains('soil') ||
                  hay.contains('pkvy');
            case 'State':
              return cat.contains('state') ||
                  hay.contains('mahadbt') ||
                  hay.contains('rythu') ||
                  hay.contains('bharosa');
            default:
              return true;
          }
        })
        .toList(growable: false);

    if (_highestBenefit) {
      out.sort((a, b) => _benefitValue(b).compareTo(_benefitValue(a)));
    } else {
      out.sort(
        (a, b) =>
            _schemeScore(b, _profile).compareTo(_schemeScore(a, _profile)),
      );
    }

    return out;
  }

  double _benefitValue(Map<String, dynamic> scheme) {
    final text = _benefitLabel(scheme);
    final match = RegExp(r'(\d+[\d,]*)').firstMatch(text.replaceAll('.', ''));
    if (match == null) return 0;
    return double.tryParse(match.group(1)!.replaceAll(',', '')) ?? 0;
  }

  String _schemeId(Map<String, dynamic> scheme) {
    final id =
        (scheme['id'] ??
                scheme['scheme_id'] ??
                scheme['short_name'] ??
                scheme['name'] ??
                '')
            .toString()
            .trim();
    return id;
  }

  String _benefitLabel(Map<String, dynamic> scheme) {
    final benefits = scheme['benefits'];
    if (benefits is List && benefits.isNotEmpty) {
      return benefits.first.toString();
    }
    if (benefits is String && benefits.trim().isNotEmpty) {
      return benefits.trim();
    }
    return 'Benefit details on portal';
  }

  String _matchLabel(Map<String, dynamic> scheme) {
    final score = _schemeScore(scheme, _profile);
    if (score >= 12) return 'Strong Match';
    if (score >= 7) return 'Likely Eligible';
    return 'Check Eligibility';
  }

  Color _matchColor(String label) {
    if (label == 'Strong Match') return AppColors.success;
    if (label == 'Likely Eligible') return AppColors.warning;
    return AppColors.info;
  }

  List<String> _requiredDocuments(Map<String, dynamic> scheme) {
    final docs = scheme['required_documents'] ?? scheme['documents_required'];
    if (docs is List) {
      return docs
          .map((e) => e.toString())
          .where((e) => e.trim().isNotEmpty)
          .toList();
    }
    return const <String>[];
  }

  List<String> _eligibilityItems(Map<String, dynamic> scheme) {
    final raw = scheme['eligibility'];
    if (raw is List) {
      return raw
          .map((e) => e.toString())
          .where((e) => e.trim().isNotEmpty)
          .toList();
    }
    if (raw is String && raw.trim().isNotEmpty) {
      return raw
          .split(RegExp(r'\.|\n'))
          .map((e) => e.trim())
          .where((e) => e.isNotEmpty)
          .toList();
    }
    return const <String>[
      'Check official portal for latest eligibility criteria.',
    ];
  }

  List<String> _benefitItems(Map<String, dynamic> scheme) {
    final raw = scheme['benefits'];
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

  List<Map<String, String>> _formDownloadItems(Map<String, dynamic> scheme) {
    final raw = scheme['form_download_urls'];
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

  List<Map<String, dynamic>> _formFieldItems(Map<String, dynamic> scheme) {
    final raw = scheme['form_fields'];
    if (raw is! List) return const <Map<String, dynamic>>[];

    final out = <Map<String, dynamic>>[];
    for (final item in raw) {
      if (item is Map) {
        out.add(Map<String, dynamic>.from(item.cast<dynamic, dynamic>()));
      }
    }
    return out;
  }

  Map<String, dynamic> _additionalSchemeDetails(Map<String, dynamic> scheme) {
    const hidden = <String>{
      'name',
      'short_name',
      'description',
      'category',
      'state',
      'eligibility',
      'benefits',
      'required_documents',
      'application_process',
      'how_to_apply',
      'application_url',
      'form_download_urls',
      'form_fields',
      'ministry',
      'launched_year',
      'launch_year',
      'is_active',
      'amount_range',
      'helpline',
      'id',
      'scheme_id',
    };

    final extras = <String, dynamic>{};
    for (final entry in scheme.entries) {
      if (hidden.contains(entry.key)) continue;
      final value = entry.value;
      if (value == null) continue;
      if (value is String && value.trim().isEmpty) continue;
      if (value is List && value.isEmpty) continue;
      if (value is Map && value.isEmpty) continue;
      extras[entry.key] = value;
    }
    return extras;
  }

  String _prettyKey(String key) {
    return key
        .replaceAll('_', ' ')
        .split(' ')
        .where((e) => e.trim().isNotEmpty)
        .map((e) => '${e[0].toUpperCase()}${e.substring(1)}')
        .join(' ');
  }

  String _prettyValue(dynamic value) {
    if (value == null) return '';
    if (value is List) {
      return value.map((e) => e.toString()).join(', ');
    }
    if (value is Map) {
      return value.entries.map((e) => '${e.key}: ${e.value}').join(', ');
    }
    return value.toString();
  }

  bool _criterionMatchesProfile(String criterion) {
    final c = criterion.toLowerCase();
    final state = (_profile['state'] ?? '').toString().toLowerCase();
    final caste = (_profile['caste'] ?? '').toString().toLowerCase();
    final land = _landHectares(_profile);

    if (c.contains('state') && state.isEmpty) return false;
    if ((c.contains('sc') || c.contains('st')) &&
        !(caste.contains('sc') || caste.contains('st'))) {
      return false;
    }
    if (c.contains('land') && land <= 0) return false;
    if (c.contains('aadhaar')) {
      final aadhaar = (_profile['aadhaar'] ?? _profile['aadhaar_number'] ?? '')
          .toString();
      if (aadhaar.trim().isEmpty) return false;
    }
    return true;
  }

  _ReadinessState _readinessForAadhaar() {
    final aadhaar = (_profile['aadhaar'] ?? _profile['aadhaar_number'] ?? '')
        .toString()
        .trim();
    if (aadhaar.isNotEmpty) return _ReadinessState.ready;
    return _ReadinessState.missing;
  }

  _ReadinessState _readinessForLand() {
    final hasArea = _landHectares(_profile) > 0;
    final hasRecord = _profile['land_records_available'] == true;
    if (hasArea && hasRecord) return _ReadinessState.ready;
    if (hasArea || hasRecord) return _ReadinessState.partial;
    return _ReadinessState.missing;
  }

  _ReadinessState _readinessForBank() {
    final hasAccount = (_profile['bank_account'] ?? '')
        .toString()
        .trim()
        .isNotEmpty;
    final hasIfsc = (_profile['ifsc'] ?? _profile['ifsc_code'] ?? '')
        .toString()
        .trim()
        .isNotEmpty;
    if (hasAccount && hasIfsc) return _ReadinessState.ready;
    if (hasAccount || hasIfsc) return _ReadinessState.partial;
    return _ReadinessState.missing;
  }

  _ReadinessState _readinessForCaste() {
    final caste = (_profile['caste'] ?? '').toString().toLowerCase().trim();
    if (!(caste.contains('sc') || caste.contains('st'))) {
      return _ReadinessState.missing;
    }
    final hasDoc = _profile['caste_certificate_available'] == true;
    return hasDoc ? _ReadinessState.ready : _ReadinessState.partial;
  }

  _ReadinessState _readinessForPhoto() {
    final hasPhoto = (_profile['photo_url'] ?? _profile['profile_photo'] ?? '')
        .toString()
        .trim()
        .isNotEmpty;
    return hasPhoto ? _ReadinessState.ready : _ReadinessState.partial;
  }

  int get _readyCount {
    final states = <_ReadinessState>[
      _readinessForAadhaar(),
      _readinessForLand(),
      _readinessForBank(),
      _readinessForCaste(),
      _readinessForPhoto(),
    ];
    return states.where((s) => s == _ReadinessState.ready).length;
  }

  String _schemeLookupKey(Map<String, dynamic> scheme) {
    final key =
        (scheme['short_name'] ?? scheme['name'] ?? _schemeId(scheme) ?? '')
            .toString()
            .trim();
    if (key.isNotEmpty) return key;
    return _schemeId(scheme);
  }

  Future<List<Map<String, dynamic>>> _loadDownloadedSchemeDocs(
    String schemeLookupKey, {
    bool autoDownloadIfEmpty = false,
    bool forceDownload = false,
  }) async {
    final key = schemeLookupKey.trim();
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

  Future<void> _openDownloadedSchemeDocument(
    String schemeLookupKey,
    Map<String, dynamic> doc,
  ) async {
    final fileName = (doc['filename'] ?? doc['name'] ?? '').toString().trim();
    if (fileName.isEmpty) {
      context.showSnack(
        'screen.document_builder_screen.document_file_name_missing'.tr(),
        isError: true,
      );
      return;
    }

    final url = ref
        .read(documentBuilderServiceProvider)
        .schemeDocumentFileUrl(schemeKey: schemeLookupKey, docName: fileName);

    await _openExternalUrl(url);
  }

  Future<void> _hydrateSchemeDetailsInPlace(Map<String, dynamic> scheme) async {
    final schemeId = _schemeId(scheme);
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

      if (resolved.isNotEmpty) {
        scheme.addAll(resolved);
      }
    } catch (_) {
      // Keep listing payload when detail fetch fails.
    }
  }

  Future<void> _openSchemeBottomSheet(Map<String, dynamic> scheme) async {
    await _hydrateSchemeDetailsInPlace(scheme);
    if (!mounted) return;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => SchemeDetailsPage(
          scheme: Map<String, dynamic>.from(scheme),
          profile: Map<String, dynamic>.from(_profile),
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
                bottom: BorderSide(color: Colors.grey.withValues(alpha: 0.2)),
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
              style: const TextStyle(fontWeight: FontWeight.w700),
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

  List<String> _howToApplySteps(Map<String, dynamic> scheme) {
    final raw = scheme['application_process'] ?? scheme['how_to_apply'];
    if (raw is List) {
      return raw
          .map((e) => e.toString())
          .where((e) => e.trim().isNotEmpty)
          .toList();
    }
    if (raw is String && raw.trim().isNotEmpty) {
      return raw
          .split(RegExp(r'\n|\.'))
          .map((e) => e.trim())
          .where((e) => e.isNotEmpty)
          .toList();
    }
    return const <String>[
      'Visit the official portal and submit required details.',
    ];
  }

  bool _isDocInProfile(String doc) {
    final d = doc.toLowerCase();
    if (d.contains('aadhaar')) {
      return (_profile['aadhaar'] ?? _profile['aadhaar_number'] ?? '')
          .toString()
          .trim()
          .isNotEmpty;
    }
    if (d.contains('land')) {
      return _landHectares(_profile) > 0 ||
          _profile['land_records_available'] == true;
    }
    if (d.contains('bank') || d.contains('ifsc') || d.contains('passbook')) {
      final account = (_profile['bank_account'] ?? '')
          .toString()
          .trim()
          .isNotEmpty;
      final ifsc = (_profile['ifsc'] ?? _profile['ifsc_code'] ?? '')
          .toString()
          .trim()
          .isNotEmpty;
      return account && ifsc;
    }
    if (d.contains('caste')) {
      return _profile['caste_certificate_available'] == true;
    }
    if (d.contains('photo')) {
      return (_profile['photo_url'] ?? _profile['profile_photo'] ?? '')
          .toString()
          .trim()
          .isNotEmpty;
    }
    return false;
  }

  Future<void> _openExternalUrl(String raw) async {
    final link = raw.trim();
    if (link.isEmpty) {
      context.showSnack(
        'screen.document_builder_screen.official_link_not_available_right_now'
            .tr(),
        isError: true,
      );
      return;
    }
    Uri? uri = Uri.tryParse(link);
    if (uri != null && !uri.hasScheme) {
      uri = Uri.tryParse('https://$link');
    }
    if (uri == null || (uri.scheme != 'http' && uri.scheme != 'https')) {
      context.showSnack(
        'screen.document_builder_screen.invalid_scheme_url'.tr(),
        isError: true,
      );
      return;
    }
    try {
      final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!opened && mounted) {
        context.showSnack(
          'screen.document_builder_screen.could_not_open_this_website_right_now'
              .tr(),
          isError: true,
        );
      }
    } catch (_) {
      if (!mounted) return;
      context.showSnack(
        'screen.document_builder_screen.could_not_open_this_website_right_now'
            .tr(),
        isError: true,
      );
    }
  }

  Future<void> _syncAllOfficialForms() async {
    if (_syncingAllForms) return;
    setState(() => _syncingAllForms = true);
    try {
      final docService = ref.read(documentBuilderServiceProvider);
      final trigger = await docService.downloadAllSchemeDocuments();

      final state = (trigger['state'] ?? '').toString().toLowerCase();
      if (state == 'started' || state == 'running') {
        if (!mounted) return;
        context.showSnack(
          'screen.document_builder_screen.bulk_sync_started_fetching_documents_in_background'
              .tr(),
        );

        final polled = await _pollBulkSyncStatus(docService);
        if (!mounted) return;

        if (polled == null) {
          context.showSnack(
            'screen.document_builder_screen.bulk_sync_is_still_running_forms_will_keep_appearing'
                .tr(),
          );
        } else if ((polled['state'] ?? '').toString().toLowerCase() ==
            'failed') {
          final msg =
              (polled['error'] ??
                      'screen.document_builder_screen.bulk_sync_failed'.tr())
                  .toString();
          context.showSnack(msg, isError: true);
        } else {
          final summary = (polled['summary'] is Map)
              ? Map<String, dynamic>.from(
                  (polled['summary'] as Map).cast<dynamic, dynamic>(),
                )
              : <String, dynamic>{};
          final downloaded = (summary['total_downloaded'] ?? 0).toString();
          final cached = (summary['total_cached'] ?? 0).toString();
          final failed = (summary['total_failed'] ?? 0).toString();
          context.showSnack(
            'Official forms sync complete. Downloaded: $downloaded, Cached: $cached, Failed: $failed',
          );
        }
      } else {
        final downloaded = (trigger['total_downloaded'] ?? 0).toString();
        final cached = (trigger['total_cached'] ?? 0).toString();
        final failed = (trigger['total_failed'] ?? 0).toString();
        if (!mounted) return;
        context.showSnack(
          'Official forms sync complete. Downloaded: $downloaded, Cached: $cached, Failed: $failed',
        );
      }

      await _loadFormPreviewCards();
    } catch (_) {
      if (!mounted) return;
      context.showSnack(
        'Could not sync all official forms right now.',
        isError: true,
      );
    } finally {
      if (mounted) setState(() => _syncingAllForms = false);
    }
  }

  Future<Map<String, dynamic>?> _pollBulkSyncStatus(
    DocumentBuilderService docService,
  ) async {
    for (var attempt = 0; attempt < 40; attempt++) {
      if (!mounted) return null;
      await Future<void>.delayed(const Duration(seconds: 2));
      final statusResp = await docService.getDownloadAllSchemeDocumentsStatus();
      final status = (statusResp['status'] is Map)
          ? Map<String, dynamic>.from(
              (statusResp['status'] as Map).cast<dynamic, dynamic>(),
            )
          : <String, dynamic>{};

      final state = (status['state'] ?? '').toString().toLowerCase();
      if (state == 'completed' || state == 'failed') {
        return status;
      }
    }
    return null;
  }

  void _openBuildScreen({required String schemeId, required String docType}) {
    final sid = Uri.encodeComponent(schemeId);
    final dtype = Uri.encodeComponent(docType);
    context.push('${RoutePaths.documentBuild}?scheme_id=$sid&doc_type=$dtype');
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final cardColor = Colors.white.withValues(alpha: 0.56);
    final textColor = AppColors.lightText;
    final subColor = AppColors.lightTextSecondary;

    return Scaffold(
      backgroundColor: isDark
          ? AppColors.darkBackground
          : AppColors.lightBackground,
      appBar: AppBar(
        title: Text('screen.document_builder_screen.document_builder'.tr()),
        centerTitle: true,
        elevation: 0,
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        actions: <Widget>[
          IconButton(
            onPressed: () => _openOfficialFormsHub(),
            icon: const Icon(Icons.dashboard_customize_outlined),
            tooltip: 'screen.document_builder_screen.go_to_forms_hub'.tr(),
          ),
          IconButton(
            onPressed: _syncingAllForms ? null : _syncAllOfficialForms,
            icon: _syncingAllForms
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.cloud_download_outlined),
            tooltip: 'screen.document_builder_screen.sync_official_forms'.tr(),
          ),
          IconButton(
            onPressed: () => context.push(RoutePaths.documentVault),
            icon: const Icon(Icons.folder_copy_outlined),
            tooltip: 'screen.document_builder_screen.document_vault'.tr(),
          ),
        ],
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
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _loadData,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                  children: <Widget>[
                    _readinessBanner(cardColor, textColor, subColor),
                    const SizedBox(height: 16),
                    _sectionHeader(
                      'screen.document_builder_screen.forms_you_can_preview'
                          .tr(),
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      height: 210,
                      child: _loadingFormPreviews && _formPreviewCards.isEmpty
                          ? const Center(child: CircularProgressIndicator())
                          : _formPreviewCards.isEmpty
                          ? _glassCard(
                              cardColor: cardColor,
                              child: Center(
                                child: Text(
                                  'screen.document_builder_screen.no_local_forms_yet_use_sync_official_forms_once'
                                      .tr(),
                                  style: TextStyle(color: subColor),
                                ),
                              ),
                            )
                          : ListView.separated(
                              scrollDirection: Axis.horizontal,
                              itemCount: _formPreviewCards.length,
                              separatorBuilder: (_, index) =>
                                  const SizedBox(width: 12),
                              itemBuilder: (_, i) {
                                final item = _formPreviewCards[i];
                                return SizedBox(
                                  width: 240,
                                  child: _glassCard(
                                    cardColor: cardColor,
                                    child: InkWell(
                                      onTap: () => _openDirectPreview(item),
                                      borderRadius: BorderRadius.circular(18),
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: <Widget>[
                                          Row(
                                            children: <Widget>[
                                              Expanded(
                                                child: Text(
                                                  item.documentName,
                                                  maxLines: 2,
                                                  overflow:
                                                      TextOverflow.ellipsis,
                                                  style: TextStyle(
                                                    color: textColor,
                                                    fontWeight: FontWeight.w700,
                                                  ),
                                                ),
                                              ),
                                              const SizedBox(width: 8),
                                              _DocStatusChip(
                                                label: item.typeLabel,
                                                color: AppColors.primary,
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 8),
                                          Text(
                                            item.schemeName,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(
                                              color: subColor,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                          const SizedBox(height: 6),
                                          Text(
                                            'screen.document_builder_screen.ready_to_preview_before_filling'
                                                .tr(),
                                            style: TextStyle(color: subColor),
                                          ),
                                          const Spacer(),
                                          Row(
                                            children: <Widget>[
                                              Icon(
                                                Icons.remove_red_eye_outlined,
                                                size: 16,
                                                color: AppColors.primary,
                                              ),
                                              const SizedBox(width: 6),
                                              Expanded(
                                                child: Text(
                                                  '${item.documentSizeKb.toStringAsFixed(1)} KB',
                                                  style: TextStyle(
                                                    color: subColor,
                                                    fontSize: 12,
                                                  ),
                                                ),
                                              ),
                                              const Icon(
                                                Icons.chevron_right,
                                                color: AppColors.primary,
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
                    ),
                    const SizedBox(height: 18),
                    _sectionHeader(
                      'screen.document_builder_screen.best_schemes_for_you'
                          .tr(),
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      height: 230,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: _recommendedSchemes.length,
                        separatorBuilder: (_, _) => const SizedBox(width: 12),
                        itemBuilder: (_, i) {
                          final scheme = _recommendedSchemes[i];
                          return _recommendedCard(
                            scheme,
                            cardColor,
                            textColor,
                            subColor,
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 18),
                    _sectionHeader(
                      'screen.document_builder_screen.all_schemes'.tr(),
                    ),
                    const SizedBox(height: 8),
                    _searchAndFilters(cardColor),
                    const SizedBox(height: 10),
                    ..._filteredSchemes.map(
                      (scheme) => _schemeListCard(
                        scheme,
                        cardColor,
                        textColor,
                        subColor,
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _readinessBanner(Color cardColor, Color textColor, Color subColor) {
    final docs = <(_ReadinessState, String)>[
      (
        _readinessForAadhaar(),
        'screen.document_builder_screen.aadhaar_card'.tr(),
      ),
      (_readinessForLand(), 'screen.document_builder_screen.land_records'.tr()),
      (
        _readinessForBank(),
        'screen.document_builder_screen.bank_passbook'.tr(),
      ),
      (
        _readinessForCaste(),
        'screen.document_builder_screen.caste_certificate'.tr(),
      ),
      (
        _readinessForPhoto(),
        'screen.document_builder_screen.passport_photo'.tr(),
      ),
    ];

    return _glassCard(
      cardColor: cardColor,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            'screen.document_builder_screen.your_document_readiness'.tr(),
            style: TextStyle(
              color: textColor,
              fontWeight: FontWeight.w800,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: docs
                .map((doc) {
                  final state = doc.$1;
                  final color = switch (state) {
                    _ReadinessState.ready => AppColors.success,
                    _ReadinessState.partial => AppColors.warning,
                    _ReadinessState.missing => Colors.grey,
                  };
                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 3),
                      child: Column(
                        children: <Widget>[
                          CircleAvatar(
                            radius: 16,
                            backgroundColor: color.withValues(alpha: 0.18),
                            child: Icon(
                              state == _ReadinessState.ready
                                  ? Icons.check
                                  : state == _ReadinessState.partial
                                  ? Icons.remove
                                  : Icons.close,
                              color: color,
                              size: 16,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            doc.$2,
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(color: subColor, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                  );
                })
                .toList(growable: false),
          ),
          const SizedBox(height: 12),
          Row(
            children: <Widget>[
              Text(
                'screen.document_builder_screen.readycount_of_5_ready'
                    .tr()
                    .replaceAll(r'$_readyCount', _readyCount.toString()),
                style: const TextStyle(
                  color: AppColors.success,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              TextButton(
                onPressed: () => _openOfficialFormsHub(),
                child: Text(
                  'screen.document_builder_screen.complete_profile'.tr(),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _sectionHeader(String title) {
    return Text(
      title,
      style: context.textTheme.titleMedium?.copyWith(
        fontWeight: FontWeight.w800,
      ),
    );
  }

  Widget _recommendedCard(
    Map<String, dynamic> scheme,
    Color cardColor,
    Color textColor,
    Color subColor,
  ) {
    final shortName = (scheme['short_name'] ?? scheme['name'] ?? 'Scheme')
        .toString();
    final category = (scheme['category'] ?? 'General').toString();
    final categoryColor = colorForSchemeCategory(category);
    final match = _matchLabel(scheme);
    final matchColor = _matchColor(match);

    return SizedBox(
      width: 210,
      child: _glassCard(
        cardColor: cardColor,
        child: InkWell(
          onTap: () => _openSchemeBottomSheet(scheme),
          borderRadius: BorderRadius.circular(18),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              color: categoryColor.withValues(alpha: 0.08),
            ),
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Row(
                  children: <Widget>[
                    Icon(Icons.description_outlined, color: categoryColor),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Text(
                        shortName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: textColor,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  match.toUpperCase(),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: matchColor,
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Expanded(
                  child: Text(
                    _benefitLabel(scheme),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: textColor),
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Row(
                  children: <Widget>[
                    Expanded(
                      child: Text(
                        category,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: subColor,
                          fontWeight: FontWeight.w700,
                          fontSize: 11,
                        ),
                      ),
                    ),
                    Icon(Icons.chevron_right, color: categoryColor),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _searchAndFilters(Color cardColor) {
    return Column(
      children: <Widget>[
        _glassCard(
          cardColor: cardColor,
          child: TextField(
            decoration: InputDecoration(
              hintText:
                  'screen.document_builder_screen.search_by_scheme_name_or_category'
                      .tr(),
              prefixIcon: const Icon(Icons.search),
              border: InputBorder.none,
            ),
            onChanged: (v) => setState(() => _search = v),
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 38,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: <Widget>[
              ..._categories.map((cat) {
                final selected = cat == _selectedCategory;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    selected: selected,
                    label: Text(cat),
                    onSelected: (_) => setState(() => _selectedCategory = cat),
                  ),
                );
              }),
              FilterChip(
                selected: _highestBenefit,
                label: Text(
                  'screen.document_builder_screen.highest_benefit'.tr(),
                ),
                onSelected: (v) => setState(() => _highestBenefit = v),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _schemeListCard(
    Map<String, dynamic> scheme,
    Color cardColor,
    Color textColor,
    Color subColor,
  ) {
    final docsCount = _requiredDocuments(scheme).length;
    final categoryColor = colorForSchemeCategory(
      (scheme['category'] ?? '').toString(),
    );

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: _glassCard(
        cardColor: cardColor,
        child: InkWell(
          onTap: () => _openSchemeBottomSheet(scheme),
          borderRadius: BorderRadius.circular(18),
          child: Row(
            children: <Widget>[
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: categoryColor.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(Icons.description_outlined, color: categoryColor),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      (scheme['name'] ?? 'Scheme').toString(),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: textColor,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _benefitLabel(scheme),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: subColor),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: <Widget>[
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.14),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      '$docsCount docs',
                      style: const TextStyle(
                        color: AppColors.primaryDark,
                        fontSize: 11,
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Icon(Icons.chevron_right, color: subColor),
                ],
              ),
            ],
          ),
        ),
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

class _FormPreviewCardData {
  const _FormPreviewCardData({
    required this.schemeId,
    required this.schemeName,
    required this.schemeLookupKey,
    required this.documentName,
    required this.documentSizeKb,
    required this.typeLabel,
  });

  final String schemeId;
  final String schemeName;
  final String schemeLookupKey;
  final String documentName;
  final double documentSizeKb;
  final String typeLabel;
}

enum _ReadinessState { ready, partial, missing }

class _DocStatusChip extends StatelessWidget {
  const _DocStatusChip({required this.label, required this.color});

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
