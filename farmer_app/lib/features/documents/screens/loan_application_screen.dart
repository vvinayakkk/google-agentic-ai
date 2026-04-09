import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/services/document_builder_service.dart';
import '../../../shared/services/farmer_service.dart';
import 'preview_download_screen.dart';

class LoanApplicationScreen extends ConsumerStatefulWidget {
  const LoanApplicationScreen({
    super.key,
    required this.schemeId,
    this.docType,
  });

  final String schemeId;
  final String? docType;

  @override
  ConsumerState<LoanApplicationScreen> createState() =>
      _LoanApplicationScreenState();
}

class _LoanApplicationScreenState extends ConsumerState<LoanApplicationScreen> {
  bool _loading = true;
  bool _showAllAtOnce = false;
  bool _reviewMode = false;

  String? _sessionId;
  Map<String, dynamic> _scheme = <String, dynamic>{};
  List<Map<String, dynamic>> _formFields = <Map<String, dynamic>>[];

  final Map<String, String> _answers = <String, String>{};
  final Set<String> _autoFilled = <String>{};
  int _wizardIndex = 0;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    setState(() => _loading = true);
    try {
      final farmerService = ref.read(farmerServiceProvider);
      final docService = ref.read(documentBuilderServiceProvider);

      final profile = await farmerService.getMyProfile(preferCache: true);
      final detail = await docService.getSchemeForm(widget.schemeId);
      final scheme = (detail['scheme'] is Map)
          ? Map<String, dynamic>.from(
              (detail['scheme'] as Map).cast<dynamic, dynamic>(),
            )
          : Map<String, dynamic>.from(detail);

      final session = await docService.startSession(
        widget.schemeId,
        schemeName: (scheme['name'] ?? '').toString(),
        preferredFormat: 'html',
      );

      final sessionId =
          (session['session_id'] ?? session['sessionId'] ?? session['id'])
              .toString();

      final fieldsRaw = scheme['form_fields'];
      final fields = <Map<String, dynamic>>[];
      if (fieldsRaw is List) {
        for (final f in fieldsRaw) {
          if (f is Map) {
            fields.add(Map<String, dynamic>.from(f.cast<dynamic, dynamic>()));
          }
        }
      }

      final preFilled = _profileToFormMap(profile);
      for (final field in fields) {
        final key = (field['field'] ?? field['name'] ?? '').toString().trim();
        if (key.isEmpty) continue;
        final val = preFilled[key];
        if (val != null && val.trim().isNotEmpty) {
          _answers[key] = val;
          _autoFilled.add(key);
          try {
            await docService.submitField(
              sessionId: sessionId,
              fieldName: key,
              value: val,
            );
          } catch (_) {
            // keep local answer even if one network submission fails
          }
        }
      }

      if (!mounted) return;
      setState(() {
        _scheme = scheme;
        _formFields = fields;
        _sessionId = sessionId;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
      });
    }
  }

  Map<String, String> _profileToFormMap(Map<String, dynamic> profile) {
    final map = <String, String>{};
    final fullName = (profile['name'] ?? profile['farmer_name'] ?? '')
        .toString()
        .trim();
    final aadhaar = (profile['aadhaar'] ?? profile['aadhaar_number'] ?? '')
        .toString()
        .trim();
    final mobile = (profile['phone'] ?? profile['mobile_number'] ?? '')
        .toString()
        .trim();
    final state = (profile['state'] ?? '').toString().trim();
    final district = (profile['district'] ?? '').toString().trim();
    final village = (profile['village'] ?? '').toString().trim();
    final landArea = (profile['land_size_acres'] ?? profile['land_area'] ?? '')
        .toString()
        .trim();
    final bankAccount = (profile['bank_account'] ?? '').toString().trim();
    final ifsc = (profile['ifsc'] ?? profile['ifsc_code'] ?? '')
        .toString()
        .trim();
    final bankName = (profile['bank_name'] ?? '').toString().trim();

    final crops = profile['crops'] is List
        ? (profile['crops'] as List).map((e) => e.toString()).join(', ')
        : (profile['main_crop'] ?? profile['crop_name'] ?? '')
              .toString()
              .trim();

    void set(List<String> keys, String value) {
      if (value.isEmpty) return;
      for (final key in keys) {
        map[key] = value;
      }
    }

    set(const <String>[
      'name',
      'applicant_name',
      'farmer_name',
      'full_name',
    ], fullName);
    set(const <String>['aadhaar_number'], aadhaar);
    set(const <String>['mobile_number', 'phone_number'], mobile);
    set(const <String>['state'], state);
    set(const <String>['district'], district);
    set(const <String>['village'], village);
    set(const <String>[
      'land_area',
      'total_land',
      'land_size_acres',
      'land_area_acres',
    ], landArea);
    set(const <String>['bank_account', 'account_number'], bankAccount);
    set(const <String>['ifsc_code', 'ifsc'], ifsc);
    set(const <String>['bank_name'], bankName);
    set(const <String>['crop_name', 'crop_grown'], crops);

    return map;
  }

  List<Map<String, dynamic>> get _needsInputFields {
    return _formFields
        .where((f) {
          final key = (f['field'] ?? f['name'] ?? '').toString().trim();
          return key.isNotEmpty && !_autoFilled.contains(key);
        })
        .toList(growable: false);
  }

  int get _filledCount {
    final unique = _formFields
        .map((f) => (f['field'] ?? f['name'] ?? '').toString().trim())
        .where((k) => k.isNotEmpty)
        .toSet();
    return unique.where((k) => (_answers[k] ?? '').trim().isNotEmpty).length;
  }

  Future<void> _saveField(String key, String value) async {
    _answers[key] = value.trim();
    if ((_sessionId ?? '').isEmpty) return;
    await ref
        .read(documentBuilderServiceProvider)
        .submitField(
          sessionId: _sessionId!,
          fieldName: key,
          value: value.trim(),
        );
  }

  void _goToReview() {
    setState(() {
      _reviewMode = true;
    });
  }

  Future<void> _openOfficialFormsHub() async {
    if (!mounted) return;
    final sid = _sessionId;
    if (sid == null || sid.isEmpty) {
      context.showSnack('Session not ready yet.', isError: true);
      return;
    }

    if (!mounted) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PreviewDownloadScreen(
          sessionId: sid,
          schemeId: widget.schemeId,
          schemeName: (_scheme['name'] ?? '').toString(),
          formData: Map<String, String>.from(_answers),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final cardColor = Colors.white.withValues(alpha: 0.56);

    return Scaffold(
      backgroundColor: isDark
          ? AppColors.darkBackground
          : AppColors.lightBackground,
      appBar: AppBar(
        title: Text(widget.docType ?? 'Document Builder'),
        elevation: 0,
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
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _reviewMode
            ? _reviewScreen(cardColor)
            : _builderScreen(cardColor),
      ),
    );
  }

  Widget _builderScreen(Color cardColor) {
    final needsInput = _needsInputFields;
    final total = _formFields.length;
    final progress = total == 0 ? 0.0 : (_filledCount / total).clamp(0.0, 1.0);

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: <Widget>[
        _glassCard(
          cardColor,
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                '$_filledCount of $total fields filled',
                style: context.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              LinearProgressIndicator(
                value: progress,
                color: AppColors.primary,
                backgroundColor: Colors.white.withValues(alpha: 0.45),
              ),
              const SizedBox(height: 10),
              Text(
                'We filled ${_autoFilled.length} fields for you from your profile.',
                style: context.textTheme.bodyMedium?.copyWith(
                  color: AppColors.success,
                ),
              ),
              const SizedBox(height: 8),
              SwitchListTile(
                value: _showAllAtOnce,
                onChanged: (v) => setState(() => _showAllAtOnce = v),
                title: const Text('Fill All at Once'),
                contentPadding: EdgeInsets.zero,
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        _glassCard(
          cardColor,
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                'Auto-filled from profile',
                style: context.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              if (_autoFilled.isEmpty)
                Text(
                  'No profile values available yet.',
                  style: context.textTheme.bodySmall?.copyWith(
                    color: context.appColors.textSecondary,
                  ),
                )
              else
                ..._autoFilled.map((key) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: <Widget>[
                        const Icon(
                          Icons.check_circle,
                          size: 16,
                          color: AppColors.success,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _labelForField(
                              _fieldByKey(key) ?? <String, dynamic>{},
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Flexible(
                          child: Text(
                            _answers[key] ?? '',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
            ],
          ),
        ),
        const SizedBox(height: 12),
        if (_showAllAtOnce)
          _allAtOnceForm(cardColor, needsInput)
        else
          _wizardForm(cardColor, needsInput),
        const SizedBox(height: 12),
        Text(
          'Saved answers will be remembered for future documents.',
          style: context.textTheme.bodySmall?.copyWith(
            color: context.appColors.textSecondary,
          ),
        ),
      ],
    );
  }

  Widget _allAtOnceForm(Color cardColor, List<Map<String, dynamic>> fields) {
    return _glassCard(
      cardColor,
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            'Needs your input',
            style: context.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          ...fields.map((f) {
            final key = _keyForField(f);
            final required = _isRequired(f);
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: TextFormField(
                initialValue: _answers[key] ?? '',
                decoration: InputDecoration(
                  labelText: '${_labelForField(f)}${required ? ' *' : ''}',
                  border: const OutlineInputBorder(),
                ),
                onChanged: (v) => _answers[key] = v,
                onFieldSubmitted: (v) async {
                  try {
                    await _saveField(key, v);
                  } catch (_) {}
                },
              ),
            );
          }),
          const SizedBox(height: 6),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
              ),
              onPressed: () async {
                for (final f in fields) {
                  final key = _keyForField(f);
                  final val = (_answers[key] ?? '').trim();
                  if (_isRequired(f) && val.isEmpty) {
                    context.showSnack(
                      'Please fill ${_labelForField(f)}',
                      isError: true,
                    );
                    return;
                  }
                }
                for (final f in fields) {
                  final key = _keyForField(f);
                  final val = (_answers[key] ?? '').trim();
                  if (val.isEmpty) continue;
                  try {
                    await _saveField(key, val);
                  } catch (_) {}
                }
                _goToReview();
              },
              child: const Text('Review Answers'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _wizardForm(Color cardColor, List<Map<String, dynamic>> fields) {
    if (fields.isEmpty) {
      return _glassCard(
        cardColor,
        Column(
          children: <Widget>[
            const Text('All required fields are already filled.'),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                ),
                onPressed: _goToReview,
                child: const Text('Go To Review'),
              ),
            ),
          ],
        ),
      );
    }

    if (_wizardIndex >= fields.length) {
      _wizardIndex = fields.length - 1;
    }

    final field = fields[_wizardIndex];
    final key = _keyForField(field);
    final initial = _answers[key] ?? '';
    final controller = TextEditingController(text: initial);

    return _glassCard(
      cardColor,
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            'Question ${_wizardIndex + 1} of ${fields.length}',
            style: context.textTheme.bodySmall?.copyWith(
              color: context.appColors.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _questionForField(field),
            style: context.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: controller,
            decoration: InputDecoration(
              border: const OutlineInputBorder(),
              hintText: 'Enter value',
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: <Widget>[
              if (_wizardIndex > 0)
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => setState(() => _wizardIndex -= 1),
                    child: const Text('Back'),
                  ),
                ),
              if (_wizardIndex > 0) const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: () async {
                    try {
                      await _saveField(key, controller.text);
                    } catch (_) {}
                    if (!mounted) return;
                    if (_wizardIndex == fields.length - 1) {
                      _goToReview();
                    } else {
                      setState(() => _wizardIndex += 1);
                    }
                  },
                  child: Text(
                    _wizardIndex == fields.length - 1 ? 'Review' : 'Next',
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextButton(
                  onPressed: () {
                    if (_wizardIndex == fields.length - 1) {
                      _goToReview();
                    } else {
                      setState(() => _wizardIndex += 1);
                    }
                  },
                  child: const Text('Skip'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _reviewScreen(Color cardColor) {
    final requiredCount = _formFields.where(_isRequired).length;
    final completedRequired = _formFields.where((f) {
      if (!_isRequired(f)) return false;
      return (_answers[_keyForField(f)] ?? '').trim().isNotEmpty;
    }).length;

    final optionalSkipped = _formFields.where((f) {
      if (_isRequired(f)) return false;
      return (_answers[_keyForField(f)] ?? '').trim().isEmpty;
    }).length;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: <Widget>[
        _glassCard(
          cardColor,
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                '$completedRequired/$requiredCount fields complete',
                style: context.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '$completedRequired/$requiredCount required, $optionalSkipped optional skipped',
                style: context.textTheme.bodySmall?.copyWith(
                  color: context.appColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        _glassCard(
          cardColor,
          Column(
            children: _formFields
                .map((f) {
                  final key = _keyForField(f);
                  final value = (_answers[key] ?? '').trim();
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(_labelForField(f)),
                    subtitle: Text(value.isEmpty ? 'Not provided' : value),
                    trailing: const Icon(Icons.edit_outlined),
                    onTap: () {
                      setState(() {
                        _reviewMode = false;
                        _showAllAtOnce = true;
                      });
                    },
                  );
                })
                .toList(growable: false),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: _openOfficialFormsHub,
            child: const Text('Open Official Forms'),
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton(
            onPressed: () => setState(() => _reviewMode = false),
            child: const Text('Go Back to Edit'),
          ),
        ),
      ],
    );
  }

  Map<String, dynamic>? _fieldByKey(String key) {
    for (final field in _formFields) {
      if (_keyForField(field) == key) return field;
    }
    return null;
  }

  bool _isRequired(Map<String, dynamic> field) {
    return field['required'] == true;
  }

  String _keyForField(Map<String, dynamic> field) {
    return (field['field'] ?? field['name'] ?? '').toString().trim();
  }

  String _labelForField(Map<String, dynamic> field) {
    final label = (field['label'] ?? field['field'] ?? field['name'] ?? 'Field')
        .toString()
        .trim();
    return label.isEmpty ? 'Field' : label;
  }

  String _questionForField(Map<String, dynamic> field) {
    final label = _labelForField(field);
    return 'What is your $label?';
  }

  Widget _glassCard(Color cardColor, Widget child) {
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
