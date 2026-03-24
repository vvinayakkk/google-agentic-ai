import 'dart:io';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/services/agent_service.dart';
import '../../../shared/services/crop_service.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/error_view.dart';

class CropDoctorScreen extends ConsumerStatefulWidget {
  const CropDoctorScreen({super.key});

  @override
  ConsumerState<CropDoctorScreen> createState() => _CropDoctorScreenState();
}

class _CropDoctorScreenState extends ConsumerState<CropDoctorScreen> {
  final _symptomsController = TextEditingController();
  final _picker = ImagePicker();

  XFile? _selectedImage;
  Map<String, dynamic>? _diseaseResult;
  String? _symptomAiResponse;
  bool _diagnosing = false;
  String? _error;

  @override
  void dispose() {
    _symptomsController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final image = await _picker.pickImage(source: source, maxWidth: 1024);
      if (image != null) {
        setState(() {
          _selectedImage = image;
          _diseaseResult = null;
          _symptomAiResponse = null;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) {
        context.showSnack('crop_doctor.error'.tr(), isError: true);
      }
    }
  }

  Future<void> _detectDisease() async {
    if (_selectedImage == null) {
      context.showSnack('crop_doctor.instruction'.tr(), isError: true);
      return;
    }
    setState(() {
      _diagnosing = true;
      _diseaseResult = null;
      _error = null;
    });
    try {
      final result = await ref
          .read(cropServiceProvider)
          .detectDisease(_selectedImage!.path);
      setState(() {
        _diseaseResult = result;
        _diagnosing = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _diagnosing = false;
      });
    }
  }

  Future<void> _diagnoseBySymptoms() async {
    final symptoms = _symptomsController.text.trim();
    if (symptoms.isEmpty) {
      context.showSnack('crop_doctor.symptoms_hint'.tr(), isError: true);
      return;
    }
    setState(() {
      _diagnosing = true;
      _symptomAiResponse = null;
      _error = null;
    });
    try {
      final response = await ref.read(agentServiceProvider).chat(
            message:
                'Diagnose crop disease from these symptoms: $symptoms. '
                'Provide disease name, cause, treatment options, preventive '
                'measures, and organic remedies.',
          );
      setState(() {
        _symptomAiResponse = response['response'] as String? ?? '';
        _diagnosing = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _diagnosing = false;
      });
    }
  }

  List<Map<String, double>> _parseBoundingBoxes() {
    if (_diseaseResult == null) return [];
    final boxes = _diseaseResult!['bounding_boxes'];
    if (boxes == null) return [];
    if (boxes is List) {
      return boxes.map<Map<String, double>>((box) {
        if (box is Map) {
          return {
            'x': (box['x'] as num?)?.toDouble() ?? 0,
            'y': (box['y'] as num?)?.toDouble() ?? 0,
            'width': (box['width'] as num?)?.toDouble() ?? 0,
            'height': (box['height'] as num?)?.toDouble() ?? 0,
          };
        }
        return {'x': 0, 'y': 0, 'width': 0, 'height': 0};
      }).toList();
    }
    return [];
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final boxes = _parseBoundingBoxes();

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        title: Text('crop_doctor.title'.tr()),
        actions: [
          if (_selectedImage != null || _diseaseResult != null)
            IconButton(
              icon: const Icon(Icons.refresh),
              tooltip: 'crop_doctor.take_another'.tr(),
              onPressed: () {
                setState(() {
                  _selectedImage = null;
                  _diseaseResult = null;
                  _symptomAiResponse = null;
                  _error = null;
                  _symptomsController.clear();
                });
              },
            ),
        ],
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
        child: SafeArea(
          child: SingleChildScrollView(
          padding: AppSpacing.allLg,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Image Picker ───────────────────────────
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'crop_doctor.subtitle'.tr(),
                      style: context.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      'crop_doctor.instruction'.tr(),
                      style: context.textTheme.bodySmall?.copyWith(
                        color: context.appColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    if (_selectedImage != null) ...[
                      ClipRRect(
                        borderRadius: AppRadius.mdAll,
                        child: Stack(
                          children: [
                            Image.file(
                              File(_selectedImage!.path),
                              height: 250,
                              width: double.infinity,
                              fit: BoxFit.cover,
                            ),
                            if (boxes.isNotEmpty)
                              Positioned.fill(
                                child: CustomPaint(
                                  painter: BoundingBoxPainter(boxes),
                                ),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                    ],
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => _pickImage(ImageSource.camera),
                            icon: const Icon(Icons.camera_alt),
                            label: Text('crop_doctor.camera'.tr()),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () =>
                                _pickImage(ImageSource.gallery),
                            icon: const Icon(Icons.photo_library),
                            label: Text('crop_doctor.gallery'.tr()),
                          ),
                        ),
                      ],
                    ),
                    if (_selectedImage != null) ...[
                      const SizedBox(height: AppSpacing.lg),
                      AppButton(
                        label: 'crop_doctor.diagnose'.tr(),
                        icon: Icons.search,
                        isLoading:
                            _diagnosing && _symptomAiResponse == null,
                        onPressed: _detectDisease,
                      ),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.lg),

              // ── Symptom Input (if no image) ────────────
              if (_selectedImage == null) ...[
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'crop_doctor.describe_symptoms'.tr(),
                        style: context.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      AppTextField(
                        hint: 'crop_doctor.symptoms_hint'.tr(),
                        controller: _symptomsController,
                        prefixIcon: Icons.medical_services,
                        maxLines: 4,
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      AppButton(
                        label: 'crop_doctor.diagnose'.tr(),
                        icon: Icons.search,
                        isLoading: _diagnosing,
                        onPressed: _diagnoseBySymptoms,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
              ],

              // ── Loading ────────────────────────────────
              if (_diagnosing)
                Center(
                  child: Padding(
                    padding: AppSpacing.allXl,
                    child: Column(
                      children: [
                        const CircularProgressIndicator(
                            color: AppColors.danger),
                        const SizedBox(height: AppSpacing.lg),
                        Text('crop_doctor.analyzing'.tr()),
                      ],
                    ),
                  ),
                )
              else if (_error != null)
                ErrorView(
                  message: _error!,
                  onRetry: _selectedImage != null
                      ? _detectDisease
                      : _diagnoseBySymptoms,
                )
              // ── Disease Detection Result ─────────────
              else if (_diseaseResult != null) ...[
                _buildDiseaseResult(),
              ]
              // ── Symptom AI Response ──────────────────
              else if (_symptomAiResponse != null) ...[
                Text(
                  'crop_doctor.diagnosis'.tr(),
                  style: context.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                AppCard(
                  child: MarkdownBody(
                    data: _symptomAiResponse!,
                    selectable: true,
                    styleSheet:
                        MarkdownStyleSheet.fromTheme(context.theme).copyWith(
                      p: context.textTheme.bodyMedium,
                      h1: context.textTheme.titleLarge,
                      h2: context.textTheme.titleMedium,
                      h3: context.textTheme.titleSmall,
                    ),
                  ),
                ),
              ],
            ],
          ),
          ),
        ),
      ),
    );
  }

  Widget _buildDiseaseResult() {
    final result = _diseaseResult!;
    final diseaseName =
        result['disease_name'] as String? ?? 'crop_doctor.no_disease'.tr();
    final confidence = (result['confidence'] as num?)?.toDouble() ?? 0;
    final confidencePercent = (confidence * 100).toStringAsFixed(1);
    final symptoms = result['symptoms'] as List<dynamic>? ?? [];
    final solutions = result['solutions'] as List<dynamic>? ?? [];
    final description = result['description'] as String? ?? '';
    final boxExplanation =
        result['bounding_box_explanation'] as String? ?? '';

    Color severityColor;
    String severityLabel;
    if (confidence >= 0.8) {
      severityColor = AppColors.danger;
      severityLabel = 'crop_doctor.severe'.tr();
    } else if (confidence >= 0.5) {
      severityColor = AppColors.warning;
      severityLabel = 'crop_doctor.moderate'.tr();
    } else {
      severityColor = AppColors.success;
      severityLabel = 'crop_doctor.mild'.tr();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Disease Name + Confidence ────────────────
        Text(
          'crop_doctor.diagnosis'.tr(),
          style: context.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: AppSpacing.allMd,
                    decoration: BoxDecoration(
                      color: severityColor.withValues(alpha: 0.12),
                      borderRadius: AppRadius.smAll,
                    ),
                    child: Icon(Icons.bug_report,
                        color: severityColor, size: 28),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          diseaseName,
                          style: context.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: AppSpacing.sm,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color:
                                    severityColor.withValues(alpha: 0.12),
                                borderRadius: AppRadius.fullAll,
                              ),
                              child: Text(
                                severityLabel,
                                style:
                                    context.textTheme.labelSmall?.copyWith(
                                  color: severityColor,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            const SizedBox(width: AppSpacing.sm),
                            Text(
                              '${'crop_doctor.confidence'.tr()}: $confidencePercent%',
                              style:
                                  context.textTheme.bodySmall?.copyWith(
                                color: context.appColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (description.isNotEmpty) ...[
                const SizedBox(height: AppSpacing.lg),
                Text(
                  description,
                  style: context.textTheme.bodyMedium?.copyWith(
                    height: 1.5,
                  ),
                ),
              ],
            ],
          ),
        ),

        // ── Bounding Box Image with overlay ──────────
        if (_selectedImage != null &&
            _parseBoundingBoxes().isNotEmpty) ...[
          const SizedBox(height: AppSpacing.lg),
          Text(
            'crop_doctor.affected_regions'.tr(),
            style: context.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          ClipRRect(
            borderRadius: AppRadius.mdAll,
            child: Stack(
              children: [
                Image.file(
                  File(_selectedImage!.path),
                  width: double.infinity,
                  fit: BoxFit.contain,
                ),
                Positioned.fill(
                  child: CustomPaint(
                    painter: BoundingBoxPainter(_parseBoundingBoxes()),
                  ),
                ),
              ],
            ),
          ),
          if (boxExplanation.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'crop_doctor.bounding_box'.tr(),
                    style: context.textTheme.labelMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    boxExplanation,
                    style: context.textTheme.bodySmall?.copyWith(
                      color: context.appColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],

        // ── Symptoms ─────────────────────────────────
        if (symptoms.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.lg),
          Text(
            'crop_doctor.symptoms'.tr(),
            style: context.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          AppCard(
            child: Column(
              children: symptoms.map<Widget>((s) {
                final symptom = s is String ? s : s.toString();
                return Padding(
                  padding:
                      const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.circle,
                          size: 8, color: AppColors.warning),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Text(symptom,
                            style: context.textTheme.bodyMedium),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
        ],

        // ── Solutions ────────────────────────────────
        if (solutions.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.lg),
          Text(
            'crop_doctor.solutions'.tr(),
            style: context.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          ...solutions.map<Widget>((sol) {
            if (sol is Map) {
              final title = sol['title'] as String? ??
                  'crop_doctor.treatment'.tr();
              final details = sol['details'] as String? ??
                  sol['description'] as String? ??
                  '';
              return Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.md),
                child: AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: AppColors.success
                                  .withValues(alpha: 0.12),
                              borderRadius: AppRadius.smAll,
                            ),
                            child: const Icon(Icons.check_circle,
                                color: AppColors.success, size: 18),
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          Expanded(
                            child: Text(
                              title,
                              style: context.textTheme.titleSmall
                                  ?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (details.isNotEmpty) ...[
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          details,
                          style:
                              context.textTheme.bodySmall?.copyWith(
                            color: context.appColors.textSecondary,
                            height: 1.5,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              );
            }
            return Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.check_circle,
                      size: 16, color: AppColors.success),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(sol.toString(),
                        style: context.textTheme.bodyMedium),
                  ),
                ],
              ),
            );
          }),
        ],
      ],
    );
  }
}

// ── Bounding Box Painter ───────────────────────────────────

class BoundingBoxPainter extends CustomPainter {
  final List<Map<String, double>> boxes;
  BoundingBoxPainter(this.boxes);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.red.withValues(alpha: 0.5)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    final fillPaint = Paint()
      ..color = Colors.red.withValues(alpha: 0.1)
      ..style = PaintingStyle.fill;

    for (final box in boxes) {
      final rect = Rect.fromLTWH(
        size.width * (box['x']! / 100),
        size.height * (box['y']! / 100),
        size.width * (box['width']! / 100),
        size.height * (box['height']! / 100),
      );
      canvas.drawRect(rect, fillPaint);
      canvas.drawRect(rect, paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
