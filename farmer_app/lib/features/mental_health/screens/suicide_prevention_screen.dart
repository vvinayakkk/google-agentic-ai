import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';

class SuicidePreventionScreen extends ConsumerStatefulWidget {
  const SuicidePreventionScreen({super.key});

  @override
  ConsumerState<SuicidePreventionScreen> createState() =>
      _SuicidePreventionScreenState();
}

class _SuicidePreventionScreenState
  extends ConsumerState<SuicidePreventionScreen> {
  int? _selectedMood;

  static const _moods = [
    {'emoji': '😊', 'key': 'great', 'color': 0xFF10B981},
    {'emoji': '🙂', 'key': 'good', 'color': 0xFF34D399},
    {'emoji': '😐', 'key': 'okay', 'color': 0xFFFBBF24},
    {'emoji': '😟', 'key': 'not_good', 'color': 0xFFF97316},
    {'emoji': '😢', 'key': 'need_help', 'color': 0xFFEF4444},
  ];

  static const _helplines = [
    {
      'name': 'KIRAN Helpline',
      'number': '1800-599-0019',
      'desc': 'Govt of India — Free, 24/7',
      'icon': Icons.local_hospital_rounded,
    },
    {
      'name': 'Farmer Distress Helpline',
      'number': '14447',
      'desc': 'Agriculture Ministry',
      'icon': Icons.agriculture_rounded,
    },
    {
      'name': 'iCall',
      'number': '9152987821',
      'desc': 'Tata Institute of Social Sciences',
      'icon': Icons.school_rounded,
    },
    {
      'name': 'Vandrevala Foundation',
      'number': '1860-2662-345',
      'desc': '24/7 Multilingual Support',
      'icon': Icons.language_rounded,
    },
    {
      'name': 'AASRA',
      'number': '9820466726',
      'desc': 'Mumbai-based, 24/7',
      'icon': Icons.phone_in_talk_rounded,
    },
    {
      'name': 'Snehi',
      'number': '044-24640050',
      'desc': 'Chennai-based Support',
      'icon': Icons.support_agent_rounded,
    },
    {
      'name': 'NIMHANS',
      'number': '080-46110007',
      'desc': 'Bangalore — National Institute',
      'icon': Icons.medical_services_rounded,
    },
    {
      'name': 'Mann Kiske',
      'number': '1800-121-3820',
      'desc': 'Toll-Free Helpline',
      'icon': Icons.favorite_rounded,
    },
  ];

  // ── Helpers ────────────────────────────────────────────────────────────

  Future<void> _callNumber(String number) async {
    final cleaned = number.replaceAll(RegExp(r'[^0-9+]'), '');
    final uri = Uri.parse('tel:$cleaned');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      if (mounted) context.showSnack('Could not open dialer', isError: true);
    }
  }

  void _navigateToAiCounselor() {
    context.push('${RoutePaths.chat}?agent=mental_health');
  }

  void _onMoodSelected(int index) {
    setState(() => _selectedMood = index);
  }

  String _moodResponse(int index) {
    switch (index) {
      case 0:
        return 'Wonderful! Keep nurturing that positive energy. 🌿';
      case 1:
        return 'Glad to hear you\'re doing well. Remember to take breaks!';
      case 2:
        return 'It\'s okay to feel neutral. Consider a short walk in nature.';
      case 3:
        return 'We\'re sorry you\'re struggling. Please reach out — help is '
            'just a call away. 💚';
      case 4:
        return 'You matter. Please talk to someone now. Call any helpline '
            'below — they\'re free and confidential. 🤝';
      default:
        return '';
    }
  }

  bool get _showUrgentBanner =>
      _selectedMood != null && _selectedMood! >= 3;

  // ── Build ──────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final textColor = isDark ? AppColors.darkText : AppColors.lightText;
    final subColor = isDark
        ? AppColors.darkTextSecondary
        : AppColors.lightTextSecondary;
    final iconBg = isDark
        ? AppColors.darkCard.withValues(alpha: 0.92)
        : Colors.white.withValues(alpha: 0.88);

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
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
          bottom: false,
          child: SingleChildScrollView(
            padding: AppSpacing.allLg,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    _topAction(
                      icon: Icons.arrow_back_rounded,
                      color: AppColors.primaryDark,
                      background: iconBg,
                      onTap: () => Navigator.of(context).maybePop(),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Text(
                            'mental_health.title'.tr(),
                            textAlign: TextAlign.center,
                            style: context.textTheme.titleLarge?.copyWith(
                              color: textColor,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          Text(
                            'Support and emergency resources',
                            textAlign: TextAlign.center,
                            style: context.textTheme.bodySmall?.copyWith(
                              color: subColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                    _topAction(
                      icon: Icons.info_outline_rounded,
                      color: AppColors.primaryDark,
                      background: iconBg,
                      onTap: () => context.showSnack(
                        'Tap any call icon to connect instantly.',
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.lg),
                _buildHeroBanner(),
                const SizedBox(height: AppSpacing.xl),
                _buildMoodSelector(),
                if (_showUrgentBanner) ...[
                  const SizedBox(height: AppSpacing.lg),
                  _buildUrgentBanner(),
                ],
                const SizedBox(height: AppSpacing.xl),
                _buildSectionTitle(
                  'mental_health.resources'.tr(),
                  Icons.library_books_rounded,
                ),
                const SizedBox(height: AppSpacing.sm),
                _buildAdditionalResources(),
                const SizedBox(height: AppSpacing.xl),
                _buildSectionTitle(
                  'mental_health.emergency_helplines'.tr(),
                  Icons.phone_rounded,
                ),
                const SizedBox(height: AppSpacing.sm),
                _buildHelplinesCarousel(),
                const SizedBox(height: AppSpacing.xl),
                _buildAiCompanionCard(),
                const SizedBox(height: AppSpacing.xxxl),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _topAction({
    required IconData icon,
    required Color color,
    required Color background,
    required VoidCallback onTap,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.8)),
      ),
      child: IconButton(
        onPressed: onTap,
        icon: Icon(icon, color: color, size: 20),
      ),
    );
  }

  // ── Section 1: Hero Banner ─────────────────────────────────────────────

  Widget _buildHeroBanner() {
    return _buildChoiceEffectCard(
      padding: const EdgeInsets.symmetric(
        vertical: AppSpacing.xxl,
        horizontal: AppSpacing.xl,
      ),
      child: Column(
        children: [
          Container(
            decoration: BoxDecoration(
              color: context.appColors.card.withValues(alpha: 0.7),
              border: Border.all(
                color: context.appColors.border,
              ),
              shape: BoxShape.circle,
            ),
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Icon(
              Icons.favorite_rounded,
              size: 48,
              color: context.appColors.textSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'You Are Not Alone',
            style: context.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'mental_health.subtitle'.tr().isNotEmpty
                ? 'mental_health.subtitle'.tr()
                : 'It\'s okay to ask for help. We\'re here for you.',
            style: context.textTheme.bodyMedium?.copyWith(
              color: context.appColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  // ── Section 2: Mood Selector ───────────────────────────────────────────

  Widget _buildMoodSelector() {
    return _buildChoiceEffectCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'mental_health.how_feeling'.tr(),
            style: context.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(_moods.length, (i) {
              final mood = _moods[i];
              final selected = _selectedMood == i;
              final label = i < 4
                  ? 'mental_health.${mood['key']}'.tr()
                  : 'Need Help';
              return GestureDetector(
                onTap: () => _onMoodSelected(i),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  padding: const EdgeInsets.symmetric(
                    vertical: AppSpacing.sm,
                    horizontal: AppSpacing.xs,
                  ),
                  decoration: BoxDecoration(
                    color: selected
                        ? Color(mood['color'] as int).withValues(alpha: 0.15)
                        : Colors.transparent,
                    borderRadius: AppRadius.mdAll,
                    border: selected
                        ? Border.all(
                            color: Color(mood['color'] as int),
                            width: 2,
                          )
                        : null,
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        mood['emoji'] as String,
                        style: const TextStyle(fontSize: 28),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        label,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight:
                              selected ? FontWeight.w700 : FontWeight.w500,
                          color: selected
                              ? Color(mood['color'] as int)
                              : context.appColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ),
          if (_selectedMood != null) ...[
            const SizedBox(height: AppSpacing.md),
            Container(
              width: double.infinity,
              padding: AppSpacing.allMd,
              decoration: BoxDecoration(
                color: Color(_moods[_selectedMood!]['color'] as int)
                    .withValues(alpha: 0.08),
                borderRadius: AppRadius.mdAll,
              ),
              child: Text(
                _moodResponse(_selectedMood!),
                style: context.textTheme.bodyMedium?.copyWith(
                  color: Color(_moods[_selectedMood!]['color'] as int),
                  fontWeight: FontWeight.w500,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildUrgentBanner() {
    return Container(
      padding: AppSpacing.allMd,
      decoration: BoxDecoration(
        color: AppColors.danger.withValues(alpha: 0.1),
        borderRadius: AppRadius.mdAll,
        border: Border.all(color: AppColors.danger.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          const Icon(Icons.warning_amber_rounded,
              color: AppColors.danger, size: 28),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Please reach out now',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: AppColors.danger,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Call KIRAN Helpline (free, 24/7):',
                  style: TextStyle(
                    color: AppColors.danger.withValues(alpha: 0.8),
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          ElevatedButton.icon(
            onPressed: () => _callNumber('1800-599-0019'),
            icon: const Icon(Icons.call, size: 18),
            label: const Text('Call'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.danger,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.sm,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: AppRadius.mdAll,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Section 3: Emergency Helplines ─────────────────────────────────────

  Widget _buildHelplinesCarousel() {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _helplines.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: AppSpacing.sm,
        mainAxisSpacing: AppSpacing.sm,
        mainAxisExtent: 156,
      ),
      itemBuilder: (context, index) => _buildHelplineCard(_helplines[index]),
    );
  }

  Widget _buildHelplineCard(Map<String, dynamic> h) {
    return _buildChoiceEffectCard(
      padding: AppSpacing.allMd,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                decoration: BoxDecoration(
                  color: AppColors.info.withValues(alpha: 0.12),
                  borderRadius: AppRadius.mdAll,
                ),
                padding: const EdgeInsets.all(AppSpacing.sm),
                child: Icon(
                  h['icon'] as IconData,
                  color: AppColors.info,
                  size: 20,
                ),
              ),
              const Spacer(),
              OutlinedButton(
                onPressed: () => _callNumber(h['number'] as String),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.info,
                  side: BorderSide(
                    color: AppColors.info.withValues(alpha: 0.5),
                  ),
                  minimumSize: const Size(40, 40),
                  padding: EdgeInsets.zero,
                  shape: RoundedRectangleBorder(
                    borderRadius: AppRadius.mdAll,
                  ),
                ),
                child: const Icon(Icons.call, size: 18),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            h['name'] as String,
            style: context.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            h['number'] as String,
            style: context.textTheme.bodyMedium?.copyWith(
              color: context.theme.colorScheme.onSurface,
              fontWeight: FontWeight.w700,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          Text(
            h['desc'] as String,
            style: context.textTheme.bodySmall?.copyWith(
              color: context.appColors.textSecondary,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  // ── Section 4: AI Wellness Companion ───────────────────────────────────

  Widget _buildAiCompanionCard() {
    return _buildChoiceEffectCard(
      padding: const EdgeInsets.all(AppSpacing.xl),
      child: Column(
        children: [
          Container(
            decoration: BoxDecoration(
              color: AppColors.info.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: const Icon(
              Icons.smart_toy_rounded,
              color: AppColors.info,
              size: 40,
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'mental_health.talk_to_ai'.tr(),
            style: context.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Private, judgment-free, and available anytime.\n'
            'Share what\'s on your mind in your language.',
            style: context.textTheme.bodyMedium?.copyWith(
              color: context.appColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            'mental_health.available_24x7'.tr(),
            style: context.textTheme.bodySmall?.copyWith(
              color: context.appColors.textSecondary,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _navigateToAiCounselor,
              icon: const Icon(Icons.chat_bubble_rounded),
              label: Text('mental_health.chat'.tr()),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.info,
                side: BorderSide(color: AppColors.info.withValues(alpha: 0.5)),
                padding: const EdgeInsets.symmetric(
                  vertical: AppSpacing.md,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: AppRadius.mdAll,
                ),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Container(
            padding: AppSpacing.allSm,
            decoration: BoxDecoration(
              color: AppColors.warning.withValues(alpha: 0.08),
              borderRadius: AppRadius.smAll,
            ),
            child: Text(
              'mental_health.disclaimer'.tr().isNotEmpty
                  ? 'mental_health.disclaimer'.tr()
                  : 'This AI is not a replacement for professional help. '
                      'In an emergency, please call a helpline.',
              style: context.textTheme.bodySmall?.copyWith(
                color: context.appColors.textSecondary,
                fontStyle: FontStyle.italic,
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }

  // ── Section 5: Additional Resources ────────────────────────────────────

  Widget _buildAdditionalResources() {
    return Column(
      children: [
        _resourceCard(
          Icons.currency_rupee_rounded,
          'Financial Stress?',
          'Talk to PM-KISAN helpline: 155261 or 011-24300606. '
              'Government schemes exist to help you.',
          '155261',
        ),
        const SizedBox(height: AppSpacing.sm),
        _resourceCard(
          Icons.report_problem_rounded,
          'Crop Loss?',
          'Contact your Pradhan Mantri Fasal Bima Yojana (PMFBY) '
              'insurance provider or call 1800-180-1551.',
          '1800-180-1551',
        ),
        const SizedBox(height: AppSpacing.sm),
        _buildChoiceEffectCard(
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: AppColors.info.withValues(alpha: 0.12),
                  borderRadius: AppRadius.mdAll,
                ),
                child: const Icon(Icons.groups_rounded,
                    color: AppColors.info, size: 24),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Community Support Groups',
                      style: context.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Connect with local farmer support groups, '
                      'Krishi Vigyan Kendras, and community networks '
                      'near you for peer support.',
                      style: context.textTheme.bodySmall?.copyWith(
                        color: context.appColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _resourceCard(
      IconData icon, String title, String desc, String number) {
    return _buildChoiceEffectCard(
      padding: AppSpacing.allMd,
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.info.withValues(alpha: 0.12),
              borderRadius: AppRadius.mdAll,
            ),
            child: Icon(icon, color: AppColors.info, size: 24),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: context.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  desc,
                  style: context.textTheme.bodySmall?.copyWith(
                    color: context.appColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () => _callNumber(number),
            icon: const Icon(Icons.call_rounded, color: AppColors.info),
            tooltip: 'Call $number',
          ),
        ],
      ),
    );
  }

  // ── Shared ─────────────────────────────────────────────────────────────

  Widget _buildSectionTitle(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, color: AppColors.info, size: 22),
        const SizedBox(width: AppSpacing.sm),
        Text(
          title,
          style: context.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildChoiceEffectCard({
    required Widget child,
    EdgeInsetsGeometry? padding,
  }) {
    final isDark = context.isDark;
    final cardColor = isDark
        ? Colors.white.withValues(alpha: 0.08)
        : Colors.white.withValues(alpha: 0.56);
    final borderColor = isDark
        ? Colors.white.withValues(alpha: 0.18)
        : Colors.white.withValues(alpha: 0.8);

    return Container(
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: borderColor, width: 1.2),
        boxShadow: [
          BoxShadow(
            color: (isDark ? Colors.black : AppColors.primaryDark)
                .withValues(alpha: isDark ? 0.22 : 0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: padding ?? AppSpacing.allLg,
        child: child,
      ),
    );
  }
}
