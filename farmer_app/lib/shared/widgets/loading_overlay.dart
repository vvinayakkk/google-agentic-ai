import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_theme.dart';

/// Full-screen loading overlay.
class LoadingOverlay extends StatelessWidget {
  final String? message;

  const LoadingOverlay({super.key, this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black38,
      child: Center(
        child: Container(
          width: 260,
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: context.appColors.card,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: context.appColors.border),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.15),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(color: AppColors.primary),
              if (message != null) ...[
                const SizedBox(height: 14),
                Text(
                  message!,
                  style: Theme.of(context).textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Inline loading state with a subtle pulse skeleton.
class LoadingState extends StatefulWidget {
  final int itemCount;
  final bool includeHero;

  const LoadingState({
    super.key,
    this.itemCount = 3,
    this.includeHero = true,
  });

  @override
  State<LoadingState> createState() => _LoadingStateState();
}

class _LoadingStateState extends State<LoadingState>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1150),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (_, __) {
        final alpha = 0.22 + (_controller.value * 0.2);
        final lineColor = context.appColors.border.withValues(alpha: alpha);

        return ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          padding: const EdgeInsets.all(AppSpacing.lg),
          itemCount: widget.itemCount + (widget.includeHero ? 1 : 0),
          separatorBuilder: (_, _) => const SizedBox(height: 12),
          itemBuilder: (_, index) {
            final isHero = widget.includeHero && index == 0;
            return Container(
              height: isHero ? 160 : 88,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: context.appColors.card.withValues(alpha: 0.84),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: context.appColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _line(widthFactor: isHero ? 0.58 : 0.44, color: lineColor),
                  const SizedBox(height: 10),
                  _line(widthFactor: isHero ? 0.82 : 0.72, color: lineColor),
                  if (isHero) ...[
                    const SizedBox(height: 10),
                    _line(widthFactor: 0.66, color: lineColor),
                  ],
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _line({
    required double widthFactor,
    required Color color,
  }) {
    return FractionallySizedBox(
      widthFactor: widthFactor,
      child: Container(
        height: 12,
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(AppRadius.full),
        ),
      ),
    );
  }
}
