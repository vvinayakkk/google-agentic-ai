import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';

class UpiScreen extends StatelessWidget {
  const UpiScreen({super.key});

  static const _upiApps = <_UpiApp>[
    _UpiApp(
      name: 'Google Pay',
      icon: Icons.account_balance_wallet_rounded,
      color: Color(0xFF4285F4),
      url: 'https://pay.google.com',
      desc: 'Easy to use and works with any bank account.',
    ),
    _UpiApp(
      name: 'PhonePe',
      icon: Icons.phone_android_rounded,
      color: Color(0xFF5F259F),
      url: 'https://www.phonepe.com',
      desc: 'Popular app for UPI, bills, and daily payments.',
    ),
    _UpiApp(
      name: 'Paytm',
      icon: Icons.account_balance_wallet_rounded,
      color: Color(0xFF00B9F5),
      url: 'https://paytm.com',
      desc: 'Wallet plus UPI with wide merchant support.',
    ),
    _UpiApp(
      name: 'BHIM',
      icon: Icons.currency_rupee_rounded,
      color: Color(0xFF00838F),
      url: 'https://www.bhimupi.org.in',
      desc: 'Official NPCI app focused on simple UPI usage.',
    ),
    _UpiApp(
      name: 'Amazon Pay',
      icon: Icons.shopping_bag_rounded,
      color: Color(0xFFFF9900),
      url: 'https://www.amazon.in/amazonpay',
      desc: 'UPI payments integrated with Amazon services.',
    ),
    _UpiApp(
      name: 'WhatsApp Pay',
      icon: Icons.chat_rounded,
      color: Color(0xFF25D366),
      url: 'https://www.whatsapp.com/payments',
      desc: 'Send money directly to contacts in WhatsApp.',
    ),
  ];

  Future<void> _launchApp(BuildContext context, _UpiApp app) async {
    final uri = Uri.parse(app.url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (context.mounted) {
        context.showSnack('${app.name} - ${'common.error'.tr()}', isError: true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final cardColor = isDark
        ? AppColors.darkCard.withValues(alpha: 0.72)
        : Colors.white.withValues(alpha: 0.74);
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
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: isDark
                ? <Color>[AppColors.darkBackground, AppColors.darkSurface, AppColors.darkBackground]
                : <Color>[AppColors.lightBackground, AppColors.lightSurface, AppColors.lightBackground],
          ),
        ),
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.lg,
                  AppSpacing.sm,
                  AppSpacing.lg,
                  0,
                ),
                child: Row(
                  children: [
                    _topAction(
                      icon: Icons.arrow_back_rounded,
                      color: AppColors.primaryDark,
                      background: iconBg,
                      onTap: () => context.pop(),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Text(
                            'Education & Finance',
                            textAlign: TextAlign.center,
                            style: context.textTheme.titleLarge?.copyWith(
                              color: textColor,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          Text(
                            'Choose one app to start learning',
                            textAlign: TextAlign.center,
                            style: context.textTheme.bodySmall?.copyWith(
                              color: subColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                    _topAction(
                      icon: Icons.home_rounded,
                      color: AppColors.primaryDark,
                      background: iconBg,
                      onTap: () => context.push(RoutePaths.home),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Expanded(
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final cardWidth = ((constraints.maxWidth - AppSpacing.md) / 2)
                        .clamp(148.0, 220.0)
                        .toDouble();

                    return SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(
                        AppSpacing.lg,
                        0,
                        AppSpacing.lg,
                        AppSpacing.xxxl,
                      ),
                      child: ConstrainedBox(
                        constraints: BoxConstraints(minHeight: constraints.maxHeight),
                        child: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                'Choose one app to start learning',
                                textAlign: TextAlign.center,
                                style: context.textTheme.titleMedium?.copyWith(
                                  color: textColor,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: AppSpacing.xs),
                              Text(
                                'Tap any card to open the app',
                                textAlign: TextAlign.center,
                                style: context.textTheme.bodySmall?.copyWith(
                                  color: subColor,
                                ),
                              ),
                              const SizedBox(height: AppSpacing.lg),
                              Wrap(
                                alignment: WrapAlignment.center,
                                runAlignment: WrapAlignment.center,
                                spacing: AppSpacing.md,
                                runSpacing: AppSpacing.md,
                                children: _upiApps
                                    .map(
                                      (app) => SizedBox(
                                        width: cardWidth,
                                        child: _upiAppCard(
                                          context: context,
                                          app: app,
                                          cardColor: cardColor,
                                          textColor: textColor,
                                          subColor: subColor,
                                          isDark: isDark,
                                        ),
                                      ),
                                    )
                                    .toList(growable: false),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
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

  Widget _upiAppCard({
    required BuildContext context,
    required _UpiApp app,
    required Color cardColor,
    required Color textColor,
    required Color subColor,
    required bool isDark,
  }) {
    return InkWell(
      borderRadius: AppRadius.mdAll,
      onTap: () => _launchApp(context, app),
      child: Container(
        height: 196,
        padding: AppSpacing.allMd,
        decoration: BoxDecoration(
          color: cardColor,
          borderRadius: AppRadius.mdAll,
          border: Border.all(
            color: Colors.white.withValues(alpha: 0.7),
          ),
          boxShadow: [
            BoxShadow(
              color: (isDark ? Colors.black : AppColors.primaryDark)
                  .withValues(alpha: isDark ? 0.2 : 0.08),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  decoration: BoxDecoration(
                    color: app.color.withValues(alpha: 0.12),
                    borderRadius: AppRadius.smAll,
                  ),
                  child: Icon(app.icon, color: app.color, size: 24),
                ),
                const Spacer(),
                Icon(
                  Icons.open_in_new_rounded,
                  size: 18,
                  color: app.color,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              app.name,
              style: context.textTheme.titleSmall?.copyWith(
                color: textColor,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              app.desc,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: context.textTheme.bodySmall?.copyWith(
                color: subColor,
                height: 1.35,
              ),
            ),
            const Spacer(),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm,
                vertical: AppSpacing.xs,
              ),
              decoration: BoxDecoration(
                color: app.color.withValues(alpha: 0.1),
                borderRadius: AppRadius.fullAll,
              ),
              child: Text(
                'Open App',
                textAlign: TextAlign.center,
                style: context.textTheme.labelSmall?.copyWith(
                  color: app.color,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _UpiApp {
  final String name;
  final String url;
  final String desc;
  final IconData icon;
  final Color color;

  const _UpiApp({
    required this.name,
    required this.icon,
    required this.color,
    required this.url,
    required this.desc,
  });
}
