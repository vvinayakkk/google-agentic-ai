import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_theme.dart';

class AiOverviewCard extends StatelessWidget {
  const AiOverviewCard({
    super.key,
    required this.summary,
    required this.details,
    required this.expanded,
    required this.loading,
    required this.updatedLabel,
    required this.onToggleExpanded,
    required this.onGenerateFresh,
    this.title = 'AI Overview',
    this.margin,
    this.cardColor,
    this.textColor,
    this.subColor,
    this.animateText = false,
    this.actionItems,
    this.onActionTap,
    this.collapsedLines = 10,
  });

  final String summary;
  final String details;
  final bool expanded;
  final bool loading;
  final String updatedLabel;
  final VoidCallback onToggleExpanded;
  final VoidCallback onGenerateFresh;
  final String title;
  final EdgeInsetsGeometry? margin;
  final Color? cardColor;
  final Color? textColor;
  final Color? subColor;
  final bool animateText;
  final List<String>? actionItems;
  final ValueChanged<String>? onActionTap;
  final int collapsedLines;

  List<String> _resolvedActionItems() {
    final actionRegex = RegExp(
      r'^(?:action|next action|step)\s*:\s*(.+)$',
      caseSensitive: false,
      multiLine: true,
    );
    final tagged = actionRegex
        .allMatches(details)
        .map((m) => m.group(1)?.trim() ?? '')
        .where((item) => item.isNotEmpty)
        .take(5)
        .toList(growable: false);
    if (tagged.isNotEmpty) return tagged;

    final provided = (actionItems ?? const <String>[])
        .map((item) => item.trim())
        .where((item) => item.isNotEmpty)
        .toList(growable: false);
    if (provided.isNotEmpty) {
      return provided.take(4).toList(growable: false);
    }

    final source = details.trim().isNotEmpty ? details : summary;
    if (source.isEmpty) return const <String>[];

    final normalized = source
        .replaceAll('•', '\n')
        .replaceAll(' - ', '\n')
        .replaceAll(RegExp(r'\s{2,}'), ' ')
        .trim();
    if (normalized.isEmpty) return const <String>[];

    final chunks = normalized
        .split(RegExp(r'\n+|(?<=[.!?])\s+'))
        .map((part) => part.trim())
        .where((part) => part.length > 10)
        .toList(growable: false);

    final out = <String>[];
    for (final part in chunks) {
      final compact = part.replaceAll(RegExp(r'^[\-\d.)\s]+'), '').trim();
      if (compact.isEmpty) continue;
      out.add(compact);
      if (out.length >= 4) break;
    }
    return out;
  }

  IconData _actionIconFor(String action) {
    final text = action.toLowerCase();
    if (text.contains('rain') || text.contains('weather')) {
      return Icons.cloud_outlined;
    }
    if (text.contains('water') || text.contains('irrig')) {
      return Icons.water_drop_outlined;
    }
    if (text.contains('spray') || text.contains('pest')) {
      return Icons.bug_report_outlined;
    }
    if (text.contains('soil') || text.contains('nutrient')) {
      return Icons.grass_outlined;
    }
    if (text.contains('market') ||
        text.contains('sell') ||
        text.contains('price')) {
      return Icons.storefront_outlined;
    }
    if (text.contains('health') ||
        text.contains('vet') ||
        text.contains('disease')) {
      return Icons.health_and_safety_outlined;
    }
    return Icons.bolt_outlined;
  }

  String _detailsWithoutActionLines(String input) {
    return input
        .split('\n')
        .where((line) {
          final lower = line.trim().toLowerCase();
          return !(lower.startsWith('action:') ||
              lower.startsWith('next action:') ||
              lower.startsWith('step:'));
        })
        .join('\n')
        .trim();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final surface = cardColor ?? (isDark ? Colors.black : Colors.white.withValues(alpha: 0.56));
    final primaryText = textColor ?? (isDark ? Colors.white : AppColors.lightText);
    final secondaryText = subColor ?? (isDark ? Colors.white : AppColors.lightTextSecondary);
    final detailsText = _detailsWithoutActionLines(details);
    final hasDetails = detailsText.isNotEmpty;
    final resolvedActions = _resolvedActionItems();

    return Container(
      margin: margin ?? const EdgeInsets.symmetric(horizontal: 24),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? Colors.white : Colors.white.withValues(alpha: 0.5),
          width: 1,
        ),
        color: surface,
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: isDark
                ? Colors.transparent
                : AppColors.primaryDark.withValues(alpha: 0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
          BoxShadow(
            color: isDark
                ? Colors.transparent
                : AppColors.primary.withValues(alpha: 0.18),
            blurRadius: 24,
            spreadRadius: 1,
          ),
          BoxShadow(
            color: isDark
                ? Colors.transparent
                : Colors.white.withValues(alpha: 0.25),
            blurRadius: 6,
            spreadRadius: -2,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Icon(
                Icons.auto_awesome,
                color: isDark
                    ? Colors.white
                    : AppColors.primaryDark.withValues(alpha: 0.8),
                size: 18,
              ),
              const SizedBox(width: 8),
              Text(
                title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: primaryText,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            summary,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: primaryText,
              height: 1.35,
              fontWeight: FontWeight.w700,
            ),
          ),
          if (hasDetails) ...<Widget>[
            const SizedBox(height: 10),
            _TypewriterPlainText(
              text: detailsText,
              animate: animateText && !loading,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: primaryText,
                height: 1.45,
                fontWeight: FontWeight.w500,
              ),
              maxLines: expanded ? null : collapsedLines,
            ),
          ],
          if (resolvedActions.isNotEmpty) ...<Widget>[
            const SizedBox(height: 14),
            Text(
              'Suggested Actions',
              style: Theme.of(context).textTheme.labelLarge?.copyWith(
                color: secondaryText,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            LayoutBuilder(
              builder: (context, constraints) {
                final isWide = constraints.maxWidth > 560;
                final tileWidth = isWide
                    ? (constraints.maxWidth - 8) / 2
                    : constraints.maxWidth;

                return Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: List<Widget>.generate(resolvedActions.length, (i) {
                    final item = resolvedActions[i];
                    return SizedBox(
                      width: tileWidth,
                      child: InkWell(
                        onTap: () {
                          if (onActionTap != null) {
                            onActionTap!(item);
                          } else {
                            onToggleExpanded();
                          }
                        },
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isDark
                                ? Colors.black
                                : Colors.white.withValues(alpha: 0.44),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: isDark
                                  ? Colors.white
                                  : Colors.white.withValues(alpha: 0.76),
                            ),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              Container(
                                width: 30,
                                height: 30,
                                decoration: BoxDecoration(
                                  color: AppColors.primaryDark.withValues(
                                    alpha: 0.1,
                                  ),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Icon(
                                  _actionIconFor(item),
                                  color: AppColors.primaryDark,
                                  size: 17,
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  item,
                                  maxLines: 4,
                                  overflow: TextOverflow.ellipsis,
                                  style: Theme.of(context).textTheme.bodySmall
                                      ?.copyWith(
                                        color: primaryText,
                                        fontWeight: FontWeight.w700,
                                        height: 1.25,
                                      ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
                );
              },
            ),
          ],
          if (loading) ...<Widget>[
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: <Widget>[
                const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                const SizedBox(width: 8),
                Text(
                  'Generating insights...',
                  style: Theme.of(
                    context,
                  ).textTheme.bodySmall?.copyWith(color: secondaryText),
                ),
              ],
            ),
          ],
          const SizedBox(height: 12),
          Row(
            children: <Widget>[
              Expanded(
                child: Text(
                  updatedLabel,
                  style: Theme.of(
                    context,
                  ).textTheme.labelSmall?.copyWith(color: secondaryText),
                ),
              ),
              TextButton(
                onPressed: onToggleExpanded,
                style: TextButton.styleFrom(
                  foregroundColor: primaryText,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                ),
                child: Text(expanded ? 'Show less' : 'Show more'),
              ),
              IconButton(
                onPressed: loading ? null : onGenerateFresh,
                tooltip: 'Generate Fresh',
                icon: Icon(
                  Icons.refresh_rounded,
                  color: loading ? secondaryText : AppColors.success,
                  size: 20,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TypewriterPlainText extends StatefulWidget {
  const _TypewriterPlainText({
    required this.text,
    required this.animate,
    this.style,
    this.maxLines,
  });

  final String text;
  final bool animate;
  final TextStyle? style;
  final int? maxLines;

  @override
  State<_TypewriterPlainText> createState() => _TypewriterPlainTextState();
}

class _TypewriterPlainTextState extends State<_TypewriterPlainText> {
  Timer? _timer;
  int _visibleChars = 0;

  @override
  void initState() {
    super.initState();
    _restartAnimation();
  }

  @override
  void didUpdateWidget(covariant _TypewriterPlainText oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.text != widget.text || oldWidget.animate != widget.animate) {
      _restartAnimation();
    }
  }

  void _restartAnimation() {
    _timer?.cancel();

    final text = widget.text;
    if (text.isEmpty) {
      setState(() => _visibleChars = 0);
      return;
    }

    if (!widget.animate) {
      setState(() => _visibleChars = text.length);
      return;
    }

    int step = (text.length / 90).ceil();
    if (step < 1) step = 1;
    if (step > 8) step = 8;

    setState(() => _visibleChars = 1);
    _timer = Timer.periodic(const Duration(milliseconds: 16), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      final next = _visibleChars + step;
      if (next >= text.length) {
        setState(() => _visibleChars = text.length);
        timer.cancel();
      } else {
        setState(() => _visibleChars = next);
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final shown = (widget.animate && _visibleChars < widget.text.length)
        ? widget.text.substring(0, _visibleChars)
        : widget.text;

    return Text(
      shown,
      maxLines: widget.maxLines,
      overflow: widget.maxLines == null
          ? TextOverflow.visible
          : TextOverflow.ellipsis,
      style: widget.style,
    );
  }
}
