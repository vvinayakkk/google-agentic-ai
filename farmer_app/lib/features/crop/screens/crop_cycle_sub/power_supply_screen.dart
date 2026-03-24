import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_markdown/flutter_markdown.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/services/agent_service.dart';
import '../../../../shared/widgets/app_card.dart';
import '../../../../shared/widgets/error_view.dart';

class PowerSupplyScreen extends ConsumerStatefulWidget {
  const PowerSupplyScreen({super.key});

  @override
  ConsumerState<PowerSupplyScreen> createState() => _PowerSupplyScreenState();
}

class _PowerSupplyScreenState extends ConsumerState<PowerSupplyScreen> {
  String? _aiResponse;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchInfo();
  }

  Future<void> _fetchInfo() async {
    setState(() {
      _loading = true;
      _aiResponse = null;
      _error = null;
    });
    try {
      final response = await ref.read(agentServiceProvider).chat(
            message:
                'Explain power supply options for Indian farmers. Include '
                'solar pumps, government subsidies, biogas, and grid '
                'connection schemes.',
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
      appBar: AppBar(title: Text('power_supply.title'.tr())),
      body: SafeArea(
        child: _loading
            ? Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const CircularProgressIndicator(
                        color: AppColors.primary),
                    const SizedBox(height: AppSpacing.lg),
                    Text('power_supply.loading'.tr()),
                  ],
                ),
              )
            : _error != null
                ? ErrorView(message: _error!, onRetry: _fetchInfo)
                : SingleChildScrollView(
                    padding: AppSpacing.allLg,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (_aiResponse != null &&
                            _aiResponse!.isNotEmpty)
                          AppCard(
                            child: MarkdownBody(
                              data: _aiResponse!,
                              selectable: true,
                              styleSheet: MarkdownStyleSheet.fromTheme(
                                      context.theme)
                                  .copyWith(
                                p: context.textTheme.bodyMedium,
                                h1: context.textTheme.titleLarge,
                                h2: context.textTheme.titleMedium,
                                h3: context.textTheme.titleSmall,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
      ),
    );
  }
}
