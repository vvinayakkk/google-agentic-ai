import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_markdown/flutter_markdown.dart';

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

class CropIntelligenceScreen extends ConsumerStatefulWidget {
  const CropIntelligenceScreen({super.key});

  @override
  ConsumerState<CropIntelligenceScreen> createState() =>
      _CropIntelligenceScreenState();
}

class _CropIntelligenceScreenState
    extends ConsumerState<CropIntelligenceScreen> {
  final _cropController = TextEditingController();
  String? _aiResponse;
  Map<String, dynamic>? _recommendations;
  bool _analyzing = false;
  String? _error;

  @override
  void dispose() {
    _cropController.dispose();
    super.dispose();
  }

  Future<void> _analyze() async {
    final crop = _cropController.text.trim();
    if (crop.isEmpty) {
      context.showSnack('crop_intelligence.input_hint'.tr(), isError: true);
      return;
    }
    setState(() {
      _analyzing = true;
      _aiResponse = null;
      _recommendations = null;
      _error = null;
    });
    try {
      // Fire both requests in parallel
      final results = await Future.wait([
        ref.read(agentServiceProvider).chat(
              message:
                  'Analyze crop: $crop. Give detailed info about duration, '
                  'water needs, season, soil requirements, pest management, '
                  'yield estimation, growth stages, market outlook, and best '
                  'practices.',
            ),
        ref.read(cropServiceProvider).getRecommendations(
              soilType: 'Loamy',
              season: 'Kharif',
            ),
      ]);
      setState(() {
        _aiResponse =
            (results[0])['response'] as String? ?? '';
        _recommendations = results[1];
        _analyzing = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _analyzing = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('crop_intelligence.title'.tr())),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: AppSpacing.allLg,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Input Section ──────────────────────────
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'crop_intelligence.title'.tr(),
                      style: context.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      'crop_intelligence.ai_insights'.tr(),
                      style: context.textTheme.bodySmall?.copyWith(
                        color: context.appColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    AppTextField(
                      hint: 'crop_intelligence.input_hint'.tr(),
                      controller: _cropController,
                      prefixIcon: Icons.eco,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    AppButton(
                      label: 'crop_intelligence.analyze'.tr(),
                      icon: Icons.psychology,
                      isLoading: _analyzing,
                      onPressed: _analyze,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.xl),

              // ── Loading ────────────────────────────────
              if (_analyzing)
                Center(
                  child: Padding(
                    padding: AppSpacing.allXl,
                    child: Column(
                      children: [
                        const CircularProgressIndicator(
                            color: AppColors.primary),
                        const SizedBox(height: AppSpacing.lg),
                        Text('crop_intelligence.analyzing'.tr()),
                      ],
                    ),
                  ),
                )
              else if (_error != null)
                ErrorView(
                  message: _error!,
                  onRetry: _analyze,
                )
              else if (_aiResponse != null) ...[
                // ── AI Insights ──────────────────────────
                Text(
                  'crop_intelligence.ai_insights'.tr(),
                  style: context.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                AppCard(
                  child: MarkdownBody(
                    data: _aiResponse!,
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

                // ── Recommendations ──────────────────────
                if (_recommendations != null) ...[
                  const SizedBox(height: AppSpacing.xl),
                  Text(
                    'crop_intelligence.best_practices'.tr(),
                    style: context.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  AppCard(
                    child: _buildRecommendations(),
                  ),
                ],
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRecommendations() {
    final recs = _recommendations!;
    final recList = recs['recommendations'] as List<dynamic>? ?? [];
    if (recList.isEmpty) {
      return MarkdownBody(
        data: recs.toString(),
        selectable: true,
        styleSheet: MarkdownStyleSheet.fromTheme(context.theme).copyWith(
          p: context.textTheme.bodyMedium,
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: recList.map<Widget>((rec) {
        final item = rec as Map<String, dynamic>;
        final name =
            item['name'] as String? ?? item['crop'] as String? ?? '';
        final reason = item['reason'] as String? ??
            item['description'] as String? ??
            '';
        return Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.md),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.12),
                  borderRadius: AppRadius.smAll,
                ),
                child:
                    const Icon(Icons.eco, color: AppColors.primary, size: 18),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: context.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (reason.isNotEmpty)
                      Text(
                        reason,
                        style: context.textTheme.bodySmall?.copyWith(
                          color: context.appColors.textSecondary,
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}
