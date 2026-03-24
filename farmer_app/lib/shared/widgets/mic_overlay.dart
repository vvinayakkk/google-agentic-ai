import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_theme.dart';

/// Floating microphone overlay for voice input.
class MicOverlay extends StatefulWidget {
  final bool isListening;
  final VoidCallback onTap;
  final String? label;

  const MicOverlay({
    super.key,
    required this.isListening,
    required this.onTap,
    this.label,
  });

  @override
  State<MicOverlay> createState() => _MicOverlayState();
}

class _MicOverlayState extends State<MicOverlay>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (widget.label != null) ...[
          Text(
            widget.label!,
            style: context.textTheme.bodySmall?.copyWith(
              color: context.appColors.textSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
        ],
        AnimatedBuilder(
          animation: _pulse,
          builder: (_, child) {
            final scale = widget.isListening ? 1.0 + _pulse.value * 0.15 : 1.0;
            return Transform.scale(scale: scale, child: child);
          },
          child: GestureDetector(
            onTap: widget.onTap,
            child: Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: widget.isListening
                    ? AppColors.danger
                    : AppColors.primary,
                boxShadow: [
                  BoxShadow(
                    color: (widget.isListening
                            ? AppColors.danger
                            : AppColors.primary)
                        .withValues(alpha: 0.4),
                    blurRadius: 16,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: const Icon(Icons.mic, color: Colors.white, size: 28),
            ),
          ),
        ),
      ],
    );
  }
}
