import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_markdown/flutter_markdown.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/extensions.dart';
import '../../../../shared/services/agent_service.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_card.dart';
import '../../../../shared/widgets/app_text_field.dart';
import '../../../../shared/widgets/error_view.dart';

class MarketStrategyScreen extends ConsumerStatefulWidget {
  const MarketStrategyScreen({super.key});

  @override
  ConsumerState<MarketStrategyScreen> createState() =>
      _MarketStrategyScreenState();
}

class _MarketStrategyScreenState extends ConsumerState<MarketStrategyScreen> {
  final _cropController = TextEditingController();
  String? _aiResponse;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _cropController.dispose();
    super.dispose();
  }

  Future<void> _fetchStrategy() async {
    final crop = _cropController.text.trim();
    if (crop.isEmpty) {
      context.showSnack('market_strategy.input_hint'.tr(), isError: true);
      return;
    }
    setState(() {
      _loading = true;
      _aiResponse = null;
      _error = null;
    });
    try {
      final response = await ref.read(agentServiceProvider).chat(
            message:
                'Give market strategy for selling $crop in India. Include '
                'best time to sell, price trends, storage tips, and market '
                'channels.',
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
      appBar: AppBar(title: Text('market_strategy.title'.tr())),
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
                      'market_strategy.title'.tr(),
                      style: context.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      'market_strategy.ai_strategy'.tr(),
                      style: context.textTheme.bodySmall?.copyWith(
                        color: context.appColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    AppTextField(
                      hint: 'market_strategy.input_hint'.tr(),
                      controller: _cropController,
                      prefixIcon: Icons.eco,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    AppButton(
                      label: 'market_strategy.button'.tr(),
                      icon: Icons.trending_up,
                      isLoading: _loading,
                      onPressed: _fetchStrategy,
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
                        Text('market_strategy.generating'.tr()),
                      ],
                    ),
                  ),
                )
              else if (_error != null)
                ErrorView(message: _error!, onRetry: _fetchStrategy)
              else if (_aiResponse != null &&
                  _aiResponse!.isNotEmpty) ...[
                Text(
                  'market_strategy.ai_strategy'.tr(),
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
