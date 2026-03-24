import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_markdown/flutter_markdown.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/services/agent_service.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_card.dart';
import '../../../../shared/widgets/error_view.dart';

class SoilHealthScreen extends ConsumerStatefulWidget {
  const SoilHealthScreen({super.key});

  @override
  ConsumerState<SoilHealthScreen> createState() => _SoilHealthScreenState();
}

class _SoilHealthScreenState extends ConsumerState<SoilHealthScreen> {
  String _selectedSoilType = 'Loamy';
  String? _aiResponse;
  bool _loading = false;
  String? _error;

  static const _soilTypes = [
    'Alluvial',
    'Black (Regur)',
    'Red',
    'Laterite',
    'Sandy',
    'Loamy',
    'Clay',
    'Saline',
    'Peaty',
  ];

  Future<void> _analyze() async {
    setState(() {
      _loading = true;
      _aiResponse = null;
      _error = null;
    });
    try {
      final response = await ref.read(agentServiceProvider).chat(
            message:
                'Analyze soil health for $_selectedSoilType soil. Include '
                'nutrient content, suitable crops, improvement methods, and '
                'testing recommendations.',
          );
      setState(() {
        _aiResponse = response['response'] as String? ?? '';
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('soil_health.title'.tr())),
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
                      'soil_health.title'.tr(),
                      style: context.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      'soil_health.select_soil'.tr(),
                      style: context.textTheme.bodySmall?.copyWith(
                        color: context.appColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    DropdownButtonFormField<String>(
                      initialValue: _selectedSoilType,
                      decoration: InputDecoration(
                        labelText: 'soil_health.select_soil'.tr(),
                        prefixIcon: const Icon(Icons.grass),
                      ),
                      items: _soilTypes
                          .map((t) => DropdownMenuItem(
                              value: t, child: Text(t)))
                          .toList(),
                      onChanged: (v) {
                        if (v != null) {
                          setState(() => _selectedSoilType = v);
                        }
                      },
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    AppButton(
                      label: 'soil_health.analyze'.tr(),
                      icon: Icons.grass,
                      isLoading: _loading,
                      onPressed: _analyze,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.xl),

              // ── Results ────────────────────────────────
              if (_loading)
                Center(
                  child: Padding(
                    padding: AppSpacing.allXl,
                    child: Column(
                      children: [
                        const CircularProgressIndicator(
                            color: AppColors.primary),
                        const SizedBox(height: AppSpacing.lg),
                        Text('soil_health.analyzing'.tr()),
                      ],
                    ),
                  ),
                )
              else if (_error != null)
                ErrorView(message: _error!, onRetry: _analyze)
              else if (_aiResponse != null &&
                  _aiResponse!.isNotEmpty) ...[
                Text(
                  'soil_health.ai_recommendations'.tr(),
                  style: context.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                AppCard(
                  child: MarkdownBody(
                    data: _aiResponse!,
                    selectable: true,
                    styleSheet: MarkdownStyleSheet.fromTheme(context.theme)
                        .copyWith(
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
    );
  }
}
