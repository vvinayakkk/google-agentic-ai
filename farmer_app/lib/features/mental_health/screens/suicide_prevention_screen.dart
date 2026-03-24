import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/services/agent_service.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/app_button.dart';

class SuicidePreventionScreen extends ConsumerStatefulWidget {
  const SuicidePreventionScreen({super.key});

  @override
  ConsumerState<SuicidePreventionScreen> createState() =>
      _SuicidePreventionScreenState();
}

class _SuicidePreventionScreenState
    extends ConsumerState<SuicidePreventionScreen>
    with SingleTickerProviderStateMixin {
  int? _selectedMood;
  bool _isLoadingTips;
  String? _aiTips;
  late AnimationController _breathController;
  late Animation<double> _breathAnimation;

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

  static const _affirmations = [
    'You are doing important work feeding the nation. 🌾',
    'Tough seasons pass — your strength remains.',
    'Asking for help is a sign of courage, not weakness.',
    'Your family and community care about you deeply.',
    'Every sunrise brings a new chance for growth. 🌅',
  ];

  _SuicidePreventionScreenState() : _isLoadingTips = false;

  @override
  void initState() {
    super.initState();
    _breathController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 12),
    )..repeat();
    _breathAnimation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _breathController, curve: Curves.linear),
    );
  }

  @override
  void dispose() {
    _breathController.dispose();
    super.dispose();
  }

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

  Future<void> _fetchAiTips() async {
    setState(() => _isLoadingTips = true);
    try {
      final service = ref.read(agentServiceProvider);
      final result = await service.chat(
        message: 'Give me 5 simple self-care and mental wellness tips '
            'specifically for Indian farmers dealing with stress. '
            'Use markdown bullet points.',
        language: 'en',
      );
      setState(() => _aiTips = result['response'] as String?);
    } catch (_) {
      if (mounted) {
        context.showSnack('Unable to fetch tips right now', isError: true);
      }
    } finally {
      if (mounted) setState(() => _isLoadingTips = false);
    }
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
    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        title: Text('mental_health.title'.tr()),
        centerTitle: true,
      ),
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
        child: SingleChildScrollView(
          padding: AppSpacing.allLg,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildHeroBanner(),
              const SizedBox(height: AppSpacing.xl),
              _buildMoodSelector(),
              if (_showUrgentBanner) ...[
                const SizedBox(height: AppSpacing.lg),
                _buildUrgentBanner(),
              ],
              const SizedBox(height: AppSpacing.xl),
              _buildSectionTitle(
                'mental_health.emergency_helplines'.tr(),
                Icons.phone_rounded,
              ),
              const SizedBox(height: AppSpacing.sm),
              ..._helplines.map(_buildHelplineCard),
              const SizedBox(height: AppSpacing.xl),
              _buildAiCompanionCard(),
              const SizedBox(height: AppSpacing.xl),
              _buildSectionTitle(
                'mental_health.self_care_tips'.tr(),
                Icons.spa_rounded,
              ),
              const SizedBox(height: AppSpacing.sm),
              _buildBreathingExercise(),
              const SizedBox(height: AppSpacing.md),
              _buildAffirmations(),
              const SizedBox(height: AppSpacing.md),
              _buildGroundingExercise(),
              const SizedBox(height: AppSpacing.md),
              _buildSleepTips(),
              const SizedBox(height: AppSpacing.xl),
              _buildAiTipsSection(),
              const SizedBox(height: AppSpacing.xl),
              _buildSectionTitle(
                'mental_health.resources'.tr(),
                Icons.library_books_rounded,
              ),
              const SizedBox(height: AppSpacing.sm),
              _buildAdditionalResources(),
              const SizedBox(height: AppSpacing.xxxl),
            ],
          ),
        ),
      ),
    );
  }

  // ── Section 1: Hero Banner ─────────────────────────────────────────────

  Widget _buildHeroBanner() {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primary,
            AppColors.primary.withValues(alpha: 0.75),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: AppRadius.lgAll,
      ),
      padding: const EdgeInsets.symmetric(
        vertical: AppSpacing.xxl,
        horizontal: AppSpacing.xl,
      ),
      child: Column(
        children: [
          Container(
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: const Icon(
              Icons.favorite_rounded,
              size: 48,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          const Text(
            'You Are Not Alone',
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'mental_health.subtitle'.tr().isNotEmpty
                ? 'mental_health.subtitle'.tr()
                : 'It\'s okay to ask for help. We\'re here for you.',
            style: TextStyle(
              fontSize: 15,
              color: Colors.white.withValues(alpha: 0.9),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  // ── Section 2: Mood Selector ───────────────────────────────────────────

  Widget _buildMoodSelector() {
    return AppCard(
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

  Widget _buildHelplineCard(Map<String, dynamic> h) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: AppCard(
        child: Row(
          children: [
            Container(
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: AppRadius.mdAll,
              ),
              padding: const EdgeInsets.all(AppSpacing.sm),
              child: Icon(
                h['icon'] as IconData,
                color: AppColors.primary,
                size: 24,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    h['name'] as String,
                    style: context.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    h['number'] as String,
                    style: context.textTheme.bodyMedium?.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Text(
                    h['desc'] as String,
                    style: context.textTheme.bodySmall?.copyWith(
                      color: context.appColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            ElevatedButton.icon(
              onPressed: () => _callNumber(h['number'] as String),
              icon: const Icon(Icons.call, size: 16),
              label: Text('mental_health.call_now'.tr()),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
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
      ),
    );
  }

  // ── Section 4: AI Wellness Companion ───────────────────────────────────

  Widget _buildAiCompanionCard() {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.info.withValues(alpha: 0.08),
            AppColors.primary.withValues(alpha: 0.06),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: AppRadius.lgAll,
        border: Border.all(color: AppColors.info.withValues(alpha: 0.25)),
      ),
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
              color: AppColors.primary,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          AppButton(
            label: 'mental_health.chat'.tr(),
            onPressed: _navigateToAiCounselor,
            icon: Icons.chat_bubble_rounded,
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

  // ── Section 5: Self-Care Toolkit ───────────────────────────────────────

  Widget _buildBreathingExercise() {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.air_rounded,
                  color: AppColors.primary, size: 22),
              const SizedBox(width: AppSpacing.sm),
              Text(
                'mental_health.breathing_exercise'.tr(),
                style: context.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          AnimatedBuilder(
            animation: _breathAnimation,
            builder: (context, _) {
              final value = _breathAnimation.value;
              String phase;
              Color phaseColor;
              double progress;

              if (value < 1 / 3) {
                phase = 'Breathe In…';
                phaseColor = AppColors.primary;
                progress = value * 3;
              } else if (value < 2 / 3) {
                phase = 'Hold…';
                phaseColor = AppColors.info;
                progress = (value - 1 / 3) * 3;
              } else {
                phase = 'Breathe Out…';
                phaseColor = AppColors.accent;
                progress = (value - 2 / 3) * 3;
              }

              return Column(
                children: [
                  Container(
                    height: 80,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: phaseColor.withValues(alpha: 0.08),
                      borderRadius: AppRadius.mdAll,
                    ),
                    child: Text(
                      phase,
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: phaseColor,
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  ClipRRect(
                    borderRadius: AppRadius.smAll,
                    child: LinearProgressIndicator(
                      value: progress,
                      minHeight: 6,
                      backgroundColor: phaseColor.withValues(alpha: 0.12),
                      valueColor:
                          AlwaysStoppedAnimation<Color>(phaseColor),
                    ),
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Breathe In (4s) → Hold (4s) → Breathe Out (4s)',
            style: context.textTheme.bodySmall?.copyWith(
              color: context.appColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildAffirmations() {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.auto_awesome_rounded,
                  color: AppColors.warning, size: 22),
              const SizedBox(width: AppSpacing.sm),
              Text(
                'Daily Affirmations',
                style: context.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          ..._affirmations.map(
            (a) => Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: Container(
                width: double.infinity,
                padding: AppSpacing.allMd,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.05),
                  borderRadius: AppRadius.smAll,
                  border: Border.all(
                    color: AppColors.primary.withValues(alpha: 0.12),
                  ),
                ),
                child: Text(
                  a,
                  style: context.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGroundingExercise() {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.self_improvement_rounded,
                  color: AppColors.info, size: 22),
              const SizedBox(width: AppSpacing.sm),
              Text(
                'Grounding Exercise (5-4-3-2-1)',
                style: context.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          _groundingRow('5', 'things you can SEE 👀', AppColors.primary),
          _groundingRow('4', 'things you can TOUCH ✋', AppColors.info),
          _groundingRow('3', 'things you can HEAR 👂', AppColors.warning),
          _groundingRow('2', 'things you can SMELL 👃', AppColors.accent),
          _groundingRow('1', 'thing you can TASTE 👅', AppColors.danger),
        ],
      ),
    );
  }

  Widget _groundingRow(String number, String text, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Text(
              number,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: color,
                fontSize: 16,
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Text(
              text,
              style: context.textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSleepTips() {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.bedtime_rounded,
                  color: AppColors.accent, size: 22),
              const SizedBox(width: AppSpacing.sm),
              Text(
                'Sleep Tips',
                style: context.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          _sleepTipRow(Icons.phone_android_rounded,
              'Put your phone away 30 min before bed'),
          _sleepTipRow(Icons.free_breakfast_rounded,
              'Avoid tea/coffee after 4 PM'),
          _sleepTipRow(Icons.schedule_rounded,
              'Try to sleep and wake at the same time daily'),
          _sleepTipRow(Icons.dark_mode_rounded,
              'Keep your room dark and cool'),
        ],
      ),
    );
  }

  Widget _sleepTipRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        children: [
          Icon(icon,
              size: 18, color: context.appColors.textSecondary),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(text, style: context.textTheme.bodyMedium),
          ),
        ],
      ),
    );
  }

  // ── Section 6: AI Self-Care Tips ───────────────────────────────────────

  Widget _buildAiTipsSection() {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.psychology_rounded,
                  color: AppColors.primary, size: 22),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  'AI-Powered Self-Care Tips',
                  style: context.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          if (_aiTips == null && !_isLoadingTips)
            AppButton(
              label: 'Get Personalized Tips',
              onPressed: _fetchAiTips,
              icon: Icons.auto_awesome_rounded,
            ),
          if (_isLoadingTips)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(AppSpacing.lg),
                child: CircularProgressIndicator(),
              ),
            ),
          if (_aiTips != null)
            MarkdownBody(
              data: _aiTips!,
              styleSheet: MarkdownStyleSheet.fromTheme(context.theme).copyWith(
                p: context.textTheme.bodyMedium,
              ),
            ),
        ],
      ),
    );
  }

  // ── Section 7: Additional Resources ────────────────────────────────────

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
        AppCard(
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.1),
                  borderRadius: AppRadius.mdAll,
                ),
                child: const Icon(Icons.groups_rounded,
                    color: AppColors.success, size: 24),
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
    return AppCard(
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.warning.withValues(alpha: 0.1),
              borderRadius: AppRadius.mdAll,
            ),
            child: Icon(icon, color: AppColors.warning, size: 24),
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
            icon: const Icon(Icons.call_rounded, color: AppColors.primary),
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
        Icon(icon, color: AppColors.primary, size: 22),
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
}
