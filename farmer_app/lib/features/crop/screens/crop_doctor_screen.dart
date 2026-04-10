import 'dart:io';
import 'dart:ui';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/services/agent_service.dart';
import '../../../shared/services/ai_overview_service.dart';
import '../../../shared/services/crop_service.dart';
import '../../../shared/services/personalization_service.dart';
import '../../../shared/widgets/ai_overview_card.dart';

class CropDoctorScreen extends ConsumerStatefulWidget {
  const CropDoctorScreen({super.key});

  @override
  ConsumerState<CropDoctorScreen> createState() => _CropDoctorScreenState();
}

class _CropDoctorScreenState extends ConsumerState<CropDoctorScreen> {
  final TextEditingController _descCtrl = TextEditingController();
  final ImagePicker _picker = ImagePicker();

  bool _isLoading = false;
  bool _aiLoading = false;
  bool _aiGenerated = false;
  bool _aiExpanded = false;
  String? _selectedImagePath;
  String _aiSummary =
      'Generate AI overview to get crop-health insights for your farm context.';
  String _aiDetails =
      'Uses profile location, crop history, and current disease signals. Cached until refreshed.';
  DateTime? _aiUpdatedAt;

  @override
  void initState() {
    super.initState();
    _loadCachedAiOverview();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (_aiGenerated || _aiLoading) return;
      _generateAiOverview(forceRefresh: false);
    });
  }

  @override
  void dispose() {
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final image = await _picker.pickImage(source: source, maxWidth: 1024);
      if (image != null && mounted) {
        setState(() => _selectedImagePath = image.path);
      }
    } catch (_) {
      if (mounted) {
        context.showSnack('Unable to pick image', isError: true);
      }
    }
  }

  void _clearImage() {
    setState(() => _selectedImagePath = null);
  }

  String _sanitizeText(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) return trimmed;
    final looksMojibake = RegExp(r'[ÃÂâ€]');
    if (!looksMojibake.hasMatch(trimmed)) return trimmed;
    try {
      final repaired = utf8.decode(
        latin1.encode(trimmed),
        allowMalformed: true,
      );
      final normalized = repaired.replaceAll(RegExp(r'\s+'), ' ').trim();
      if (normalized.isNotEmpty) return normalized;
    } catch (_) {
      // Return best-effort cleanup below.
    }
    return trimmed.replaceAll('Â', '').replaceAll(RegExp(r'\s+'), ' ').trim();
  }

  List<Map<String, dynamic>> _extractBoundingBoxes(Map<String, dynamic> data) {
    final dynamic raw =
        data['bounding_boxes'] ?? data['boxes'] ?? data['detections'];
    if (raw is! List) return const <Map<String, dynamic>>[];

    final out = <Map<String, dynamic>>[];
    for (final entry in raw) {
      if (entry is! Map) continue;
      final box = Map<String, dynamic>.from(entry.cast<dynamic, dynamic>());
      final x = double.tryParse(
        (box['x'] ?? box['left'] ?? box['xmin']).toString(),
      );
      final y = double.tryParse(
        (box['y'] ?? box['top'] ?? box['ymin']).toString(),
      );
      final w = double.tryParse((box['width'] ?? box['w']).toString());
      final h = double.tryParse((box['height'] ?? box['h']).toString());
      final x2 = double.tryParse((box['xmax'] ?? box['right']).toString());
      final y2 = double.tryParse((box['ymax'] ?? box['bottom']).toString());

      if (x != null && y != null && w != null && h != null) {
        out.add(<String, dynamic>{'x': x, 'y': y, 'width': w, 'height': h});
        continue;
      }

      if (x != null && y != null && x2 != null && y2 != null) {
        out.add(<String, dynamic>{
          'x': x,
          'y': y,
          'width': (x2 - x).clamp(0, 100),
          'height': (y2 - y).clamp(0, 100),
        });
      }
    }
    return out;
  }

  List<String> _extractSymptoms(Map<String, dynamic> data) {
    final raw = data['symptoms'];
    if (raw is! List) return const <String>[];
    return raw
        .map((e) => e.toString().trim())
        .where((e) => e.isNotEmpty)
        .take(6)
        .toList(growable: false);
  }

  List<Map<String, String>> _extractSolutions(Map<String, dynamic> data) {
    final raw = data['solutions'];
    if (raw is! List) return const <Map<String, String>>[];

    final out = <Map<String, String>>[];
    for (final item in raw) {
      if (item is! Map) continue;
      final mapped = Map<String, dynamic>.from(item.cast<dynamic, dynamic>());
      final title = _sanitizeText(
        (mapped['title'] ?? mapped['name'] ?? '').toString(),
      );
      final details = _sanitizeText(
        (mapped['details'] ?? mapped['description'] ?? '').toString(),
      );
      if (title.isEmpty && details.isEmpty) continue;
      out.add(<String, String>{
        'title': title.isEmpty ? 'Recommendation' : title,
        'details': details,
      });
      if (out.length >= 6) break;
    }
    return out;
  }

  Future<void> _diagnoseWithImage() async {
    if (_selectedImagePath == null) return;

    setState(() => _isLoading = true);
    try {
      final result = await ref
          .read(cropServiceProvider)
          .detectDisease(_selectedImagePath!);
      if (!mounted) return;

      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => DiagnosisResultScreen(
            diseaseName: _sanitizeText(
              result['disease_name']?.toString() ?? 'Unknown Disease',
            ),
            scientificName: _sanitizeText(
              result['scientific_name']?.toString() ?? 'N/A',
            ),
            confidencePercent: () {
              final raw =
                  double.tryParse((result['confidence'] ?? 0.0).toString()) ??
                  0.0;
              final scaled = raw <= 1.0 ? raw * 100.0 : raw;
              return scaled.clamp(0.0, 100.0).round();
            }(),
            description: _sanitizeText(
              result['description']?.toString() ?? 'No description available.',
            ),
            imageUrl: _selectedImagePath,
            isLocalFile: true,
            boundingBoxes: _extractBoundingBoxes(result),
            boundingBoxExplanation: _sanitizeText(
              result['bounding_box_explanation']?.toString() ?? '',
            ),
            symptoms: _extractSymptoms(
              result,
            ).map(_sanitizeText).where((e) => e.isNotEmpty).toList(),
            solutions: _extractSolutions(result),
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      var message = 'Diagnosis failed. Please try again.';
      final raw = e.toString().toLowerCase();
      if (raw.contains('dioexception') || raw.contains('socketexception')) {
        message = 'Cannot reach server. Please check connection and retry.';
      }
      context.showSnack(message, isError: true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _diagnoseBySymptoms() async {
    final symptoms = _descCtrl.text.trim();
    if (symptoms.isEmpty) {
      context.showSnack('Please describe crop symptoms first', isError: true);
      return;
    }

    setState(() => _isLoading = true);
    try {
      final response = await ref
          .read(agentServiceProvider)
          .chat(
            message: 'Diagnose crop disease from these symptoms: $symptoms.',
          );
      if (!mounted) return;

      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => DiagnosisResultScreen(
            diseaseName: 'Symptom Analysis',
            scientificName: 'Description-based diagnosis',
            confidencePercent: 85,
            description:
                response['response']?.toString() ?? 'No analysis available.',
          ),
        ),
      );
    } catch (e) {
      if (mounted) {
        context.showSnack('Analysis failed: $e', isError: true);
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _loadCachedAiOverview() async {
    final cached = await ref
        .read(aiOverviewServiceProvider)
        .getCached('crop_doctor_overview_v1');
    if (!mounted || cached == null) return;
    setState(() {
      _aiSummary = cached.summary;
      _aiDetails = cached.details;
      _aiUpdatedAt = cached.updatedAt;
      _aiGenerated = true;
    });
  }

  String _aiUpdatedLabel() {
    final dt = _aiUpdatedAt;
    if (dt == null) return 'Not generated yet';
    final hh = dt.hour.toString().padLeft(2, '0');
    final mm = dt.minute.toString().padLeft(2, '0');
    return 'Updated at $hh:$mm';
  }

  Future<void> _generateAiOverview({bool forceRefresh = true}) async {
    if (_aiLoading) return;
    setState(() => _aiLoading = true);
    try {
      final languageCode = Localizations.localeOf(context).languageCode;
      final profile = await ref
          .read(personalizationServiceProvider)
          .getProfileContext();
      final crops = await ref.read(cropServiceProvider).listCrops();
      if (!mounted) return;

      final snippets = <String>[];
      final district = (profile['district'] ?? '').toString().trim();
      final state = (profile['state'] ?? '').toString().trim();
      if (district.isNotEmpty || state.isNotEmpty) {
        snippets.add(
          'Farmer profile location: ${[district, state].where((e) => e.isNotEmpty).join(', ')}.',
        );
      }

      snippets.add(
        _selectedImagePath == null
            ? 'No diagnostic image uploaded yet.'
            : 'A crop image is uploaded for visual diagnosis.',
      );

      final symptoms = _descCtrl.text.trim();
      if (symptoms.isNotEmpty) {
        snippets.add('Observed symptoms: $symptoms');
      }

      if (crops.isEmpty) {
        snippets.add('No crop history available yet in profile.');
      } else {
        for (final row in crops.take(6)) {
          final crop =
              (row['name'] ?? row['crop_name'] ?? row['crop'] ?? 'Crop')
                  .toString();
          final season = (row['season'] ?? '').toString();
          final stage = (row['stage'] ?? row['growth_stage'] ?? '').toString();
          snippets.add('History: $crop, season $season, stage $stage.');
        }
      }

      for (final issue in _issues.take(4)) {
        snippets.add(
          'Common issue watchlist: ${issue.label} (${issue.description}).',
        );
      }

      final result = await ref
          .read(aiOverviewServiceProvider)
          .generate(
            key: 'crop_doctor_overview_v1',
            pageName: 'Crop Doctor',
            languageCode: languageCode,
            nearbyData: snippets,
            capabilities: const <String>[
              'Upload crop image and run visual disease diagnosis',
              'Describe symptoms in text and run symptom-based analysis',
              'Review disease confidence, detected symptoms, and treatment steps',
              'Use AI chat to ask follow-up treatment and prevention questions',
              'Plan next field action and monitoring checklist from diagnosis output',
            ],
            forceRefresh: forceRefresh,
          );

      if (!mounted) return;
      setState(() {
        _aiSummary = result.summary;
        _aiDetails = result.details;
        _aiUpdatedAt = result.updatedAt;
        _aiGenerated = true;
      });
    } catch (e) {
      if (mounted) {
        context.showSnack('Failed to generate AI overview: $e', isError: true);
      }
    } finally {
      if (mounted) {
        setState(() => _aiLoading = false);
      }
    }
  }

  void _openAiActionCard(String actionText) {
    final query = Uri.encodeQueryComponent(actionText);
    context.push('${RoutePaths.chat}?agent=general&q=$query');
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final cardColor = isDark
      ? AppColors.darkCard.withValues(alpha: 0.96)
      : Colors.white.withValues(alpha: 0.56);
    final textColor = isDark ? AppColors.darkText : AppColors.lightText;
    final subColor = isDark
      ? AppColors.darkTextSecondary
      : AppColors.lightTextSecondary;
    final iconBg = isDark
      ? AppColors.darkSurface.withValues(alpha: 0.92)
      : Colors.white.withValues(alpha: 0.56);

    return Scaffold(
      backgroundColor: isDark
          ? AppColors.darkBackground
          : AppColors.lightBackground,
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? <Color>[AppColors.darkBackground, AppColors.darkSurface]
                : <Color>[AppColors.lightBackground, AppColors.lightSurface],
          ),
        ),
        child: SafeArea(
          bottom: false,
          child: Column(
            children: <Widget>[
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 12, 24, 0),
                child: SizedBox(
                  height: 48,
                  child: Stack(
                    alignment: Alignment.center,
                    children: <Widget>[
                      Align(
                        alignment: Alignment.centerLeft,
                        child: _topAction(
                          icon: Icons.arrow_back_rounded,
                          color: isDark ? Colors.white : AppColors.primaryDark,
                          background: iconBg,
                          onTap: () => Navigator.of(context).maybePop(),
                        ),
                      ),
                      Text(
                        'Crop Doctor',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: textColor,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Align(
                        alignment: Alignment.centerRight,
                        child: _topAction(
                          icon: Icons.refresh_rounded,
                          color: isDark ? Colors.white : AppColors.primaryDark,
                          background: iconBg,
                          onTap: () {
                            setState(() {
                              _selectedImagePath = null;
                              _descCtrl.clear();
                            });
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),
              _aiOverviewCard(),
              const SizedBox(height: 14),
              Expanded(
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 100),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      _imageCard(
                        cardColor: cardColor,
                        textColor: textColor,
                        subColor: subColor,
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: <Widget>[
                          Expanded(
                            child: SizedBox(
                              height: 44,
                              child: ElevatedButton.icon(
                                onPressed: _isLoading
                                    ? null
                                    : () => _pickImage(ImageSource.camera),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: isDark
                                      ? AppColors.darkSurface.withValues(alpha: 0.92)
                                      : Colors.white.withValues(alpha: 0.88),
                                  foregroundColor: isDark
                                      ? AppColors.darkText
                                      : AppColors.lightText,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(40),
                                  ),
                                  side: BorderSide(
                                    color: isDark
                                        ? AppColors.darkBorder
                                        : Colors.white.withValues(alpha: 0.85),
                                  ),
                                ),
                                icon: const Icon(Icons.camera_alt_outlined),
                                label: const Text(
                                  'Camera',
                                  style: TextStyle(fontWeight: FontWeight.w700),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: SizedBox(
                              height: 44,
                              child: ElevatedButton.icon(
                                onPressed: _isLoading
                                    ? null
                                    : (_selectedImagePath == null
                                          ? () =>
                                                _pickImage(ImageSource.gallery)
                                          : _diagnoseWithImage),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: isDark
                                      ? AppColors.darkSurface
                                      : AppColors.primaryDark,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(40),
                                  ),
                                ),
                                icon: _isLoading
                                    ? const SizedBox(
                                        width: 14,
                                        height: 14,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      )
                                    : Icon(
                                        _selectedImagePath == null
                                            ? Icons.photo_library_outlined
                                            : Icons.search,
                                      ),
                                label: Text(
                                  _isLoading
                                      ? 'Analyzing...'
                                      : (_selectedImagePath == null
                                            ? 'Gallery'
                                            : 'Analyze Image'),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      Row(
                        children: <Widget>[
                          Expanded(
                            child: Divider(
                              color: Colors.white.withValues(alpha: 0.8),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            child: Text(
                              'or',
                              style: TextStyle(
                                color: subColor,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          Expanded(
                            child: Divider(
                              color: Colors.white.withValues(alpha: 0.8),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      _glassCard(
                        cardColor: cardColor,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            Text(
                              'Describe what you see',
                              style: TextStyle(
                                color: textColor,
                                fontWeight: FontWeight.w700,
                                fontSize: 15,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Container(
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.62),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: Colors.white.withValues(alpha: 0.86),
                                ),
                              ),
                              child: TextField(
                                controller: _descCtrl,
                                minLines: 4,
                                maxLines: 4,
                                style: TextStyle(color: textColor),
                                decoration: InputDecoration(
                                  hintText:
                                      'e.g. yellow patches, leaf curling, brown spots near edges',
                                  hintStyle: TextStyle(color: subColor),
                                  border: InputBorder.none,
                                  contentPadding: const EdgeInsets.fromLTRB(
                                    12,
                                    12,
                                    12,
                                    12,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            SizedBox(
                              width: double.infinity,
                              height: 44,
                              child: ElevatedButton.icon(
                                onPressed: _isLoading
                                    ? null
                                    : _diagnoseBySymptoms,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.white.withValues(
                                    alpha: 0.88,
                                  ),
                                  foregroundColor: AppColors.lightText,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(40),
                                  ),
                                  side: BorderSide(
                                    color: Colors.white.withValues(alpha: 0.85),
                                  ),
                                ),
                                icon: _isLoading
                                    ? const SizedBox(
                                        width: 14,
                                        height: 14,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: AppColors.primaryDark,
                                        ),
                                      )
                                    : const Icon(Icons.auto_awesome),
                                label: const Text(
                                  'Analyze Symptoms',
                                  style: TextStyle(fontWeight: FontWeight.w700),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Common Issues',
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(
                              color: textColor,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      const SizedBox(height: 10),
                      GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _issues.length,
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              crossAxisSpacing: 10,
                              mainAxisSpacing: 10,
                              childAspectRatio: 1.25,
                            ),
                        itemBuilder: (_, index) {
                          final issue = _issues[index];
                          return _IssueTile(
                            issue: issue,
                            cardColor: cardColor,
                            textColor: textColor,
                            subColor: subColor,
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _topAction({
    required IconData icon,
    required Color color,
    required Color background,
    required VoidCallback onTap,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.8)),
      ),
      child: IconButton(
        onPressed: onTap,
        icon: Icon(icon, color: color, size: 20),
      ),
    );
  }

  Widget _aiOverviewCard() {
    return AiOverviewCard(
      summary: _aiSummary,
      details: _aiDetails,
      expanded: _aiExpanded,
      loading: _aiLoading,
      updatedLabel: _aiUpdatedLabel(),
      onToggleExpanded: () => setState(() => _aiExpanded = !_aiExpanded),
      onGenerateFresh: () => _generateAiOverview(forceRefresh: true),
      onActionTap: _openAiActionCard,
    );
  }

  Widget _imageCard({
    required Color cardColor,
    required Color textColor,
    required Color subColor,
  }) {
    if (_selectedImagePath == null) {
      return _glassCard(
        cardColor: cardColor,
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () => _pickImage(ImageSource.gallery),
          child: CustomPaint(
            painter: DashedBorderPainter(),
            child: SizedBox(
              width: double.infinity,
              height: 170,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: <Widget>[
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.72),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(
                      Icons.local_florist_outlined,
                      color: AppColors.primaryDark,
                      size: 28,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Upload crop photo',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                      color: textColor,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Take a photo or choose from gallery',
                    style: TextStyle(fontSize: 12, color: subColor),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return _glassCard(
      cardColor: cardColor,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: Stack(
          children: <Widget>[
            Image.file(
              File(_selectedImagePath!),
              width: double.infinity,
              height: 220,
              fit: BoxFit.cover,
            ),
            Positioned(
              top: 8,
              right: 8,
              child: InkWell(
                onTap: _clearImage,
                borderRadius: BorderRadius.circular(999),
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.45),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.close, size: 18, color: Colors.white),
                ),
              ),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                    colors: <Color>[
                      Colors.black.withValues(alpha: 0.65),
                      Colors.transparent,
                    ],
                  ),
                ),
                child: const Text(
                  'Image selected. Tap Analyze Image to diagnose.',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _glassCard({required Color cardColor, required Widget child}) {
    final isDark = context.isDark;
    return Container(
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : Colors.white.withValues(alpha: 0.8),
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
      child: Padding(padding: const EdgeInsets.all(14), child: child),
    );
  }
}

class _IssueSuggestion {
  final IconData icon;
  final String label;
  final String description;

  const _IssueSuggestion({
    required this.icon,
    required this.label,
    required this.description,
  });
}

const List<_IssueSuggestion> _issues = <_IssueSuggestion>[
  _IssueSuggestion(
    icon: Icons.wb_sunny_outlined,
    label: 'Leaf Yellowing',
    description: 'Nutrient deficiency or overwatering',
  ),
  _IssueSuggestion(
    icon: Icons.blur_on_outlined,
    label: 'Brown Spots',
    description: 'Possible fungal infection signs',
  ),
  _IssueSuggestion(
    icon: Icons.water_damage_outlined,
    label: 'Wilting',
    description: 'Heat stress or root disease',
  ),
  _IssueSuggestion(
    icon: Icons.cloud_outlined,
    label: 'White Powder',
    description: 'Common powdery mildew indicator',
  ),
  _IssueSuggestion(
    icon: Icons.bug_report_outlined,
    label: 'Pest Damage',
    description: 'Leaf bites and curling patterns',
  ),
  _IssueSuggestion(
    icon: Icons.grass_outlined,
    label: 'Root Rot',
    description: 'Often linked to excess moisture',
  ),
];

class _IssueTile extends StatelessWidget {
  final _IssueSuggestion issue;
  final Color cardColor;
  final Color textColor;
  final Color subColor;

  const _IssueTile({
    required this.issue,
    required this.cardColor,
    required this.textColor,
    required this.subColor,
  });

  Future<void> _openSearch() async {
    final query = Uri.encodeComponent('${issue.label} crop disease treatment');
    final url = Uri.parse('https://www.google.com/search?q=$query');
    await launchUrl(url, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    return InkWell(
      onTap: _openSearch,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: cardColor,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isDark ? AppColors.darkBorder : Colors.white.withValues(alpha: 0.8),
          ),
          boxShadow: <BoxShadow>[
            BoxShadow(
              color: AppColors.primaryDark.withValues(alpha: 0.06),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                Icon(
                  issue.icon,
                  color: isDark ? Colors.white : AppColors.primaryDark,
                  size: 20,
                ),
                const Spacer(),
                Icon(Icons.open_in_new, color: subColor, size: 14),
              ],
            ),
            const Spacer(),
            Text(
              issue.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: textColor, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            Text(
              issue.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: subColor, fontSize: 12, height: 1.3),
            ),
          ],
        ),
      ),
    );
  }
}

class DiagnosisResultScreen extends StatefulWidget {
  final String diseaseName;
  final String scientificName;
  final int confidencePercent;
  final String description;
  final String? imageUrl;
  final bool isLocalFile;
  final List<Map<String, dynamic>> boundingBoxes;
  final String? boundingBoxExplanation;
  final List<String> symptoms;
  final List<Map<String, String>> solutions;

  const DiagnosisResultScreen({
    super.key,
    required this.diseaseName,
    required this.scientificName,
    required this.confidencePercent,
    required this.description,
    this.imageUrl,
    this.isLocalFile = false,
    this.boundingBoxes = const <Map<String, dynamic>>[],
    this.boundingBoxExplanation,
    this.symptoms = const <String>[],
    this.solutions = const <Map<String, String>>[],
  });

  @override
  State<DiagnosisResultScreen> createState() => _DiagnosisResultScreenState();
}

class _DiagnosisResultScreenState extends State<DiagnosisResultScreen>
    with TickerProviderStateMixin {
  late final AnimationController _cardController;
  late final Animation<Offset> _cardSlideAnimation;
  late final Animation<double> _cardOpacityAnimation;

  @override
  void initState() {
    super.initState();
    _cardController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 350),
    );
    _cardSlideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.1),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _cardController, curve: Curves.easeOut));
    _cardOpacityAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(parent: _cardController, curve: Curves.easeOut));
    _cardController.forward();
  }

  @override
  void dispose() {
    _cardController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final cardColor = isDark
      ? AppColors.darkCard.withValues(alpha: 0.96)
      : Colors.white.withValues(alpha: 0.56);
    final textColor = isDark ? AppColors.darkText : AppColors.lightText;
    final subColor = isDark
      ? AppColors.darkTextSecondary
      : AppColors.lightTextSecondary;

    final confidenceMeta = _confidenceStyle(widget.confidencePercent);

    return Scaffold(
      backgroundColor: isDark
          ? AppColors.darkBackground
          : AppColors.lightBackground,
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? <Color>[AppColors.darkBackground, AppColors.darkSurface]
                : <Color>[AppColors.lightBackground, AppColors.lightSurface],
          ),
        ),
        child: SafeArea(
          bottom: false,
          child: Column(
            children: <Widget>[
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 12, 24, 0),
                child: Row(
                  children: <Widget>[
                    Container(
                      decoration: BoxDecoration(
                        color: isDark
                            ? AppColors.darkSurface.withValues(alpha: 0.92)
                            : Colors.white.withValues(alpha: 0.56),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isDark ? AppColors.darkBorder : Colors.white.withValues(alpha: 0.8),
                        ),
                      ),
                      child: IconButton(
                        onPressed: () => Navigator.of(context).maybePop(),
                        icon: Icon(
                          Icons.arrow_back_rounded,
                          color: isDark ? Colors.white : AppColors.primaryDark,
                          size: 20,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Diagnosis Result',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: textColor,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              Expanded(
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 100),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      if (widget.imageUrl != null)
                        _resultCard(
                          cardColor: cardColor,
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(14),
                            child: SizedBox(
                              height: 210,
                              width: double.infinity,
                              child: Stack(
                                fit: StackFit.expand,
                                children: [
                                  widget.isLocalFile
                                      ? Image.file(
                                          File(widget.imageUrl!),
                                          fit: BoxFit.cover,
                                        )
                                      : Image.network(
                                          widget.imageUrl!,
                                          fit: BoxFit.cover,
                                          errorBuilder:
                                              (
                                                _,
                                                error,
                                                stackTrace,
                                              ) => Container(
                                                color: isDark
                                                    ? AppColors.darkSurface
                                                    : Colors.white.withValues(alpha: 0.62),
                                                alignment: Alignment.center,
                                                child: Icon(
                                                  Icons.grass_outlined,
                                                  size: 44,
                                                  color: isDark
                                                      ? Colors.white70
                                                      : AppColors.primaryDark.withValues(alpha: 0.7),
                                                ),
                                              ),
                                        ),
                                  if (widget.boundingBoxes.isNotEmpty)
                                    CustomPaint(
                                      painter: _BoundingBoxesPainter(
                                        boxes: widget.boundingBoxes,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      if (widget.boundingBoxes.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            'Detected regions: ${widget.boundingBoxes.length}',
                            style: TextStyle(
                              color: subColor,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      if ((widget.boundingBoxExplanation ?? '')
                          .trim()
                          .isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Text(
                            widget.boundingBoxExplanation!.trim(),
                            style: TextStyle(color: subColor, fontSize: 12),
                          ),
                        ),
                      const SizedBox(height: 12),
                      AnimatedBuilder(
                        animation: _cardController,
                        builder: (_, child) => FadeTransition(
                          opacity: _cardOpacityAnimation,
                          child: SlideTransition(
                            position: _cardSlideAnimation,
                            child: child,
                          ),
                        ),
                        child: _resultCard(
                          cardColor: cardColor,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              Text(
                                widget.diseaseName,
                                style: TextStyle(
                                  color: textColor,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 22,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '(${widget.scientificName})',
                                style: TextStyle(
                                  color: subColor,
                                  fontStyle: FontStyle.italic,
                                ),
                              ),
                              const SizedBox(height: 12),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: confidenceMeta.bg,
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Text(
                                  '${widget.confidencePercent}% confidence',
                                  style: TextStyle(
                                    color: confidenceMeta.fg,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                widget.description,
                                style: TextStyle(color: subColor, height: 1.5),
                              ),
                            ],
                          ),
                        ),
                      ),
                      if (widget.symptoms.isNotEmpty) ...[
                        const SizedBox(height: 14),
                        Text(
                          'Observed Symptoms',
                          style: Theme.of(context).textTheme.titleMedium
                              ?.copyWith(
                                color: textColor,
                                fontWeight: FontWeight.w700,
                              ),
                        ),
                        const SizedBox(height: 10),
                        ...widget.symptoms.map(
                          (symptom) => Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: _ResultTip(
                              icon: Icons.check_circle_outline,
                              title: symptom,
                              body: 'Detected from uploaded crop image.',
                            ),
                          ),
                        ),
                      ],
                      const SizedBox(height: 14),
                      Text(
                        'Recommended Steps',
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(
                              color: textColor,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      const SizedBox(height: 10),
                      if (widget.solutions.isNotEmpty)
                        ...widget.solutions.map(
                          (solution) => Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: _ResultTip(
                              icon: Icons.eco_outlined,
                              title: (solution['title'] ?? 'Recommendation')
                                  .trim(),
                              body: (solution['details'] ?? '').trim(),
                            ),
                          ),
                        )
                      else ...[
                        const _ResultTip(
                          icon: Icons.eco_outlined,
                          title: 'Apply targeted treatment',
                          body:
                              'Use disease-specific pesticide or bio-control after verifying symptoms on multiple leaves.',
                        ),
                        const SizedBox(height: 10),
                        const _ResultTip(
                          icon: Icons.water_drop_outlined,
                          title: 'Adjust irrigation',
                          body:
                              'Avoid leaf-wet conditions and improve field drainage where moisture remains high.',
                        ),
                        const SizedBox(height: 10),
                        const _ResultTip(
                          icon: Icons.cleaning_services_outlined,
                          title: 'Sanitize affected area',
                          body:
                              'Remove heavily infected tissue and clean tools to reduce disease spread.',
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  _ConfidenceStyle _confidenceStyle(int score) {
    if (score >= 85) {
      return _ConfidenceStyle(
        bg: AppColors.primary.withValues(alpha: 0.18),
        fg: AppColors.primaryDark,
      );
    }
    if (score >= 60) {
      return _ConfidenceStyle(
        bg: Colors.amber.withValues(alpha: 0.2),
        fg: Colors.amber.shade900,
      );
    }
    return _ConfidenceStyle(
      bg: Colors.red.withValues(alpha: 0.18),
      fg: Colors.red.shade900,
    );
  }

  Widget _resultCard({required Color cardColor, required Widget child}) {
    return Container(
      width: double.infinity,
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
      child: Padding(padding: const EdgeInsets.all(14), child: child),
    );
  }
}

class _ConfidenceStyle {
  final Color bg;
  final Color fg;

  const _ConfidenceStyle({required this.bg, required this.fg});
}

class _ResultTip extends StatelessWidget {
  final IconData icon;
  final String title;
  final String body;

  const _ResultTip({
    required this.icon,
    required this.title,
    required this.body,
  });

  @override
  Widget build(BuildContext context) {
    final cardColor = Colors.white.withValues(alpha: 0.56);
    final textColor = AppColors.lightText;
    final subColor = AppColors.lightTextSecondary;

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.8),
          width: 1.1,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.75),
                borderRadius: BorderRadius.circular(11),
                border: Border.all(color: Colors.white.withValues(alpha: 0.85)),
              ),
              child: Icon(icon, size: 18, color: AppColors.primaryDark),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    title,
                    style: TextStyle(
                      color: textColor,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(body, style: TextStyle(color: subColor, height: 1.4)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BoundingBoxesPainter extends CustomPainter {
  const _BoundingBoxesPainter({required this.boxes});

  final List<Map<String, dynamic>> boxes;

  @override
  void paint(Canvas canvas, Size size) {
    final borderPaint = Paint()
      ..color = const Color(0xFFFF3B30)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    final fillPaint = Paint()
      ..color = const Color(0x33FF3B30)
      ..style = PaintingStyle.fill;

    for (final box in boxes) {
      final x = double.tryParse((box['x'] ?? 0).toString()) ?? 0;
      final y = double.tryParse((box['y'] ?? 0).toString()) ?? 0;
      final w = double.tryParse((box['width'] ?? 0).toString()) ?? 0;
      final h = double.tryParse((box['height'] ?? 0).toString()) ?? 0;

      final left = (x / 100.0).clamp(0.0, 1.0) * size.width;
      final top = (y / 100.0).clamp(0.0, 1.0) * size.height;
      final width = (w / 100.0).clamp(0.0, 1.0) * size.width;
      final height = (h / 100.0).clamp(0.0, 1.0) * size.height;

      if (width <= 1 || height <= 1) continue;

      final rect = Rect.fromLTWH(left, top, width, height);
      canvas.drawRect(rect, fillPaint);
      canvas.drawRect(rect, borderPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _BoundingBoxesPainter oldDelegate) {
    return oldDelegate.boxes != boxes;
  }
}

class DashedBorderPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.primaryDark.withValues(alpha: 0.55)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4;

    final path = Path()
      ..addRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(0, 0, size.width, size.height),
          const Radius.circular(14),
        ),
      );

    const dashWidth = 6.0;
    const dashGap = 4.0;

    final List<PathMetric> metrics = path.computeMetrics().toList();
    for (final metric in metrics) {
      double distance = 0;
      while (distance < metric.length) {
        final dashPath = metric.extractPath(distance, distance + dashWidth);
        canvas.drawPath(dashPath, paint);
        distance += dashWidth + dashGap;
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
