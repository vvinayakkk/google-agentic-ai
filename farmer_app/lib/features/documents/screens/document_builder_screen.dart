import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/services/document_builder_service.dart';
import '../../../shared/services/personalization_service.dart';
import 'scheme_details_page.dart';
import '../utils/document_scheme_map.dart';

class DocumentBuilderScreen extends ConsumerStatefulWidget {
  const DocumentBuilderScreen({super.key});

  @override
  ConsumerState<DocumentBuilderScreen> createState() =>
      _DocumentBuilderScreenState();
}

class _DocumentBuilderScreenState extends ConsumerState<DocumentBuilderScreen> {
  bool _loading = true;
  String _search = '';
  String _selectedCategory = 'All';
  bool _highestBenefit = false;

  Map<String, dynamic> _profile = <String, dynamic>{};
  List<Map<String, dynamic>> _schemes = <Map<String, dynamic>>[];

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
          .listSchemes(forceRefresh: true);

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
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _profile = <String, dynamic>{};
        _schemes = <Map<String, dynamic>>[];
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

  List<Map<String, dynamic>> get _recommendedSchemes {
    final scored =
        _schemes
            .map((s) => (score: _schemeScore(s, _profile), scheme: s))
            .toList(growable: false)
          ..sort((a, b) => b.score.compareTo(a.score));
    return scored.take(8).map((e) => e.scheme).toList(growable: false);
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
      context.showSnack('Document file name missing.', isError: true);
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
        title: const Text('Document Builder'),
        centerTitle: true,
        elevation: 0,
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        actions: <Widget>[
          IconButton(
            onPressed: () => context.push(RoutePaths.documentVault),
            icon: const Icon(Icons.folder_copy_outlined),
            tooltip: 'Document Vault',
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
                    _sectionHeader('Best Schemes for You'),
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
                    _sectionHeader('All Schemes'),
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
      (_readinessForAadhaar(), 'Aadhaar Card'),
      (_readinessForLand(), 'Land Records'),
      (_readinessForBank(), 'Bank Passbook'),
      (_readinessForCaste(), 'Caste Certificate'),
      (_readinessForPhoto(), 'Passport Photo'),
    ];

    return _glassCard(
      cardColor: cardColor,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            'Your Document Readiness',
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
                '$_readyCount of 5 ready',
                style: const TextStyle(
                  color: AppColors.success,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              TextButton(
                onPressed: () => context.push(RoutePaths.profile),
                child: const Text('Complete Profile'),
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
            decoration: const InputDecoration(
              hintText: 'Search by scheme name or category',
              prefixIcon: Icon(Icons.search),
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
                label: const Text('Highest Benefit'),
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
