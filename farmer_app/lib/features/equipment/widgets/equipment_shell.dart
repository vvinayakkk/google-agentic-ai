import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';

class EquipmentPageBackground extends StatelessWidget {
  final Widget child;

  const EquipmentPageBackground({
    super.key,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final top = isDark ? AppColors.darkBackground : AppColors.lightBackground;
    final bottom = isDark ? AppColors.darkSurface : AppColors.lightSurface;

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [top, bottom],
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            top: -70,
            right: -30,
            child: _GlowOrb(
              size: 180,
              color: AppColors.primary.withValues(alpha: isDark ? 0.1 : 0.16),
            ),
          ),
          Positioned(
            top: 180,
            left: -40,
            child: _GlowOrb(
              size: 140,
              color: AppColors.info.withValues(alpha: isDark ? 0.06 : 0.12),
            ),
          ),
          child,
        ],
      ),
    );
  }
}

class EquipmentHeaderCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final List<Widget> badges;
  final Widget? trailing;
  final bool centerContent;

  const EquipmentHeaderCard({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
    this.badges = const <Widget>[],
    this.trailing,
    this.centerContent = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        gradient: const LinearGradient(
          colors: [AppColors.primaryDark, AppColors.primary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.24),
            blurRadius: 22,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: centerContent
                  ? CrossAxisAlignment.center
                  : CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(AppRadius.md),
                  ),
                  child: Icon(icon, color: Colors.white),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  title,
                  textAlign: centerContent ? TextAlign.center : TextAlign.start,
                  style: context.textTheme.titleLarge?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  subtitle,
                  textAlign: centerContent ? TextAlign.center : TextAlign.start,
                  style: context.textTheme.bodyMedium?.copyWith(
                    color: Colors.white.withValues(alpha: 0.9),
                    height: 1.3,
                  ),
                ),
                if (badges.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.sm),
                  Wrap(
                    spacing: AppSpacing.sm,
                    runSpacing: AppSpacing.sm,
                    alignment: centerContent
                        ? WrapAlignment.center
                        : WrapAlignment.start,
                    children: badges,
                  ),
                ],
              ],
            ),
          ),
          if (trailing != null) ...[
            const SizedBox(width: AppSpacing.md),
            trailing!,
          ],
        ],
      ),
    );
  }
}

class EquipmentInfoBadge extends StatelessWidget {
  final String label;

  const EquipmentInfoBadge({
    super.key,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.22),
        borderRadius: BorderRadius.circular(AppRadius.full),
      ),
      child: Text(
        label,
        style: context.textTheme.bodySmall?.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class EquipmentRefreshStrip extends StatelessWidget {
  final bool refreshing;
  final String label;

  const EquipmentRefreshStrip({
    super.key,
    required this.refreshing,
    this.label = 'Refreshing latest prices and availability...',
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      height: refreshing ? 34 : 0,
      margin: EdgeInsets.only(bottom: refreshing ? AppSpacing.sm : 0),
      decoration: BoxDecoration(
        color: AppColors.info.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(AppRadius.full),
      ),
      child: refreshing
          ? Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                const SizedBox(width: AppSpacing.sm),
                Text(
                  label,
                  style: context.textTheme.bodySmall?.copyWith(
                    color: AppColors.info,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            )
          : null,
    );
  }
}

class EquipmentContentSkeleton extends StatelessWidget {
  final int cardCount;

  const EquipmentContentSkeleton({
    super.key,
    this.cardCount = 5,
  });

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.lg),
      physics: const AlwaysScrollableScrollPhysics(),
      itemCount: cardCount + 1,
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
      itemBuilder: (_, i) {
        if (i == 0) {
          return const _SkeletonCard(height: 164, lines: 3);
        }
        return const _SkeletonCard(height: 102, lines: 2);
      },
    );
  }
}

class _SkeletonCard extends StatefulWidget {
  final double height;
  final int lines;

  const _SkeletonCard({
    required this.height,
    required this.lines,
  });

  @override
  State<_SkeletonCard> createState() => _SkeletonCardState();
}

class _SkeletonCardState extends State<_SkeletonCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
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
        final alpha = 0.28 + (0.18 * _controller.value);
        final lineColor = context.appColors.border.withValues(alpha: alpha);

        return Container(
          height: widget.height,
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: context.appColors.card.withValues(alpha: 0.86),
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(color: context.appColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: List.generate(widget.lines, (i) {
              final widthFactor = 0.9 - (0.16 * i);
              return Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                child: FractionallySizedBox(
                  widthFactor: widthFactor,
                  child: Container(
                    height: 12,
                    decoration: BoxDecoration(
                      color: lineColor,
                      borderRadius: BorderRadius.circular(AppRadius.full),
                    ),
                  ),
                ),
              );
            }),
          ),
        );
      },
    );
  }
}

class _GlowOrb extends StatelessWidget {
  final double size;
  final Color color;

  const _GlowOrb({
    required this.size,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          colors: [color, Colors.transparent],
        ),
      ),
    );
  }
}
