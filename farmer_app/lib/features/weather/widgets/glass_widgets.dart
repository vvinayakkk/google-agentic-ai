import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/app_cache.dart';

/// Reusable glassmorphism card used across weather screens.
class GlassCard extends StatelessWidget {
  final Widget child;
  final bool featured;
  final EdgeInsetsGeometry padding;
  final double radius;
  final VoidCallback? onTap;

  const GlassCard({
    Key? key,
    required this.child,
    this.featured = false,
    this.padding = AppSpacing.allLg,
    this.radius = 18.0,
    this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final cardColor = isDark ? Colors.black : Colors.white.withOpacity(0.56);
    final borderColor = isDark ? Colors.white : Colors.white.withOpacity(0.8);

    final baseShadow = BoxShadow(
      color: isDark ? Colors.transparent : AppColors.primaryDark.withOpacity(0.08),
      blurRadius: 12,
      offset: const Offset(0, 6),
    );

    final glow = featured
        ? BoxShadow(
            color: isDark ? Colors.transparent : AppColors.primary.withOpacity(0.18),
            blurRadius: 24,
            spreadRadius: 1,
          )
        : const BoxShadow(color: Colors.transparent);

    final decoration = BoxDecoration(
      color: cardColor,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: borderColor),
      boxShadow: [baseShadow, glow],
    );

    final card = Container(
      padding: padding,
      decoration: decoration,
      child: child,
    );

    if (onTap == null) return card;
    return GestureDetector(
      onTap: () {
        Haptics.light();
        onTap!.call();
      },
      child: card,
    );
  }
}

/// Small glass icon button used in top bars.
class GlassIconButton extends StatelessWidget {
  final Widget icon;
  final VoidCallback? onPressed;
  final double size;

  const GlassIconButton({
    Key? key,
    required this.icon,
    this.onPressed,
    this.size = 44,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final bg = isDark ? Colors.black : Colors.white.withOpacity(0.56);
    final border = isDark ? Colors.white : Colors.white.withOpacity(0.8);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onPressed == null
            ? null
            : () {
                Haptics.light();
                onPressed!.call();
              },
        borderRadius: BorderRadius.circular(12),
        child: Container(
          height: size,
          width: size,
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: border),
            boxShadow: [
              BoxShadow(
                color: isDark ? Colors.transparent : AppColors.primaryDark.withOpacity(0.04),
                blurRadius: 6,
              ),
            ],
          ),
          child: Center(child: icon),
        ),
      ),
    );
  }
}
