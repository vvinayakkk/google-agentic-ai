
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/app_card.dart';

/// Feature hub screen showing featured tools, quick actions, and all tools.
class FeaturedScreen extends StatelessWidget {
  const FeaturedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final topTools = [
      _FeatureTileData(
        icon: Icons.biotech_rounded,
        title: 'Crop Doctor',
        subtitle: 'Disease detection',
        route: RoutePaths.cropDoctor,
      ),
      _FeatureTileData(
        icon: Icons.agriculture_rounded,
        title: 'Crop Cycle',
        subtitle: 'Plan growth stages',
        route: RoutePaths.cropCycle,
      ),
      _FeatureTileData(
        icon: Icons.cloud_rounded,
        title: 'Weather',
        subtitle: 'Live weather updates',
        route: RoutePaths.weather,
      ),
    ];

    final allTools = [
      _ListToolData(
        icon: Icons.pets_rounded,
        title: 'Cattle Management',
        subtitle: 'Care and health tracking',
        route: RoutePaths.cattle,
      ),
      _ListToolData(
        icon: Icons.account_balance_wallet_rounded,
        title: 'AgriFinance',
        subtitle: 'Loans and financial planning',
        route: RoutePaths.upi,
      ),
      _ListToolData(
        icon: Icons.build_circle_rounded,
        title: 'Equipment Rental',
        subtitle: 'Tools on demand',
        route: RoutePaths.rental,
      ),
      _ListToolData(
        icon: Icons.description_rounded,
        title: 'Documentation',
        subtitle: 'Upload and manage files',
        route: RoutePaths.documents,
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
        title: Text('Agri-Suite Features'.tr()),
      ),
      body: ListView(
        padding: AppSpacing.allLg,
        children: [
          Center(
            child: Text(
              'Kisaan ki Awaaz',
              style: context.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
          Text(
            'Featured Tools',
            style: context.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          ...topTools.map(
            (tool) => Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.md),
              child: _FeatureTile(data: tool),
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
          Text(
            'Quick Actions',
            style: context.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: _ActionCard(
                  icon: Icons.trending_up_rounded,
                  title: 'Market',
                  onTap: () => context.push(RoutePaths.marketPrices),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: _ActionCard(
                  icon: Icons.auto_awesome_rounded,
                  title: 'Weather',
                  onTap: () => context.push(RoutePaths.weather),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xl),
          Text(
            'All Tools',
            style: context.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          ...allTools.map(
            (tool) => Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.md),
              child: _ToolListTile(data: tool),
            ),
          ),
        ],
      ),
    );
  }
}

// helper widgets
class _FeatureTile extends StatelessWidget {
  final _FeatureTileData data;
  const _FeatureTile({required this.data});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: () => context.push(data.route),
      child: Row(
        children: [
          Container(
            padding: AppSpacing.allMd,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.14),
              borderRadius: AppRadius.mdAll,
            ),
            child: Icon(data.icon, color: AppColors.primary, size: 28),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  data.title,
                  style: context.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  data.subtitle,
                  style: context.textTheme.bodySmall?.copyWith(
                    color: context.appColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Icon(
            Icons.chevron_right_rounded,
            color: context.appColors.textSecondary,
          ),
        ],
      ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback onTap;

  const _ActionCard({
    required this.icon,
    required this.title,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            padding: AppSpacing.allMd,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.12),
              borderRadius: AppRadius.mdAll,
            ),
            child: Icon(icon, color: AppColors.primary, size: 30),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            title,
            style: context.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _ToolListTile extends StatelessWidget {
  final _ListToolData data;

  const _ToolListTile({required this.data});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: () => context.push(data.route),
      child: Row(
        children: [
          Container(
            padding: AppSpacing.allSm,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.12),
              borderRadius: AppRadius.smAll,
            ),
            child: Icon(data.icon, color: AppColors.primary, size: 22),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  data.title,
                  style: context.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  data.subtitle,
                  style: context.textTheme.bodySmall?.copyWith(
                    color: context.appColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Icon(Icons.chevron_right_rounded,
              color: context.appColors.textSecondary),
        ],
      ),
    );
  }
}

class _FeatureTileData {
  final IconData icon;
  final String title;
  final String subtitle;
  final String route;

  const _FeatureTileData({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.route,
  });
}

class _ListToolData {
  final IconData icon;
  final String title;
  final String subtitle;
  final String route;

  const _ListToolData({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.route,
  });
}
