import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/providers/locale_provider.dart';
import '../../../core/constants/app_constants.dart';

class ChoiceScreen extends ConsumerStatefulWidget {
  const ChoiceScreen({super.key});

  @override
  ConsumerState<ChoiceScreen> createState() => _ChoiceScreenState();
}

class _ChoiceScreenState extends ConsumerState<ChoiceScreen> {
  static const primaryGreen = Color(0xFF10B981);
  String _locationName = '';

  @override
  void initState() {
    super.initState();
    _loadLocationName();
    _refreshLiveLocation(showError: false);
  }

  Future<void> _loadLocationName() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('last_location_name') ?? '';
    if (!mounted) return;
    setState(() {
      _locationName = saved;
    });
  }

  Future<void> _saveLocationName(String name) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('last_location_name', name);
    if (!mounted) return;
    setState(() {
      _locationName = name;
    });
  }

  Future<void> _refreshLiveLocation({bool showError = true}) async {
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission != LocationPermission.whileInUse &&
          permission != LocationPermission.always) {
        if (mounted && showError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content:
                  Text('screen.choice_screen.location_permission_denied'.tr()),
            ),
          );
        }
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 8),
        ),
      );

      final marks = await placemarkFromCoordinates(
        position.latitude,
        position.longitude,
      );

      String name = 'screen.choice_screen.location_detected'.tr();
      if (marks.isNotEmpty) {
        final p = marks.first;
        final parts = <String>[
          if ((p.subLocality ?? '').trim().isNotEmpty) p.subLocality!.trim(),
          if ((p.locality ?? '').trim().isNotEmpty) p.locality!.trim(),
          if ((p.administrativeArea ?? '').trim().isNotEmpty)
            p.administrativeArea!.trim(),
        ];
        if (parts.isNotEmpty) name = parts.join(', ');
      }

      await _saveLocationName(name);
    } catch (_) {
      if (mounted && showError) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('screen.choice_screen.could_not_fetch_live_location'.tr()),
          ),
        );
      }
    }
  }

  Future<void> _setManualLocation() async {
    final controller = TextEditingController(text: _locationName);
    final manual = await showDialog<String>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: Text('screen.choice_screen.set_location_manually'.tr()),
          content: TextField(
            controller: controller,
            autofocus: true,
            decoration: InputDecoration(
              hintText: 'screen.choice_screen.village_city_state'.tr(),
              border: OutlineInputBorder(),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: Text('screen.choice_screen.cancel'.tr()),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(ctx).pop(controller.text.trim()),
              child: Text('screen.choice_screen.save'.tr()),
            ),
          ],
        );
      },
    );

    if (manual == null || manual.isEmpty) return;
    await _saveLocationName(manual);
  }

  @override
  Widget build(BuildContext context) {
    final screenHeight = MediaQuery.of(context).size.height;
    final logoSize = screenHeight * 0.20;
    final isDark = context.isDark;
    final cardColor = Colors.white.withValues(alpha: 0.56);
    final textColor = AppColors.lightText;
    final subColor = AppColors.lightTextSecondary;
    final iconBg = Colors.white.withValues(alpha: 0.56);

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) {
          context.go(RoutePaths.fetchingLocation);
        }
      },
      child: Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      extendBody: true,
      body: Container(
        width: double.infinity,
        height: double.infinity,
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
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              children: [
                const SizedBox(height: 12),
                Row(
                  children: [
                    SizedBox(
                      width: 190,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.58),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.8),
                          ),
                        ),
                        child: PopupMenuButton<String>(
                          padding: EdgeInsets.zero,
                          onSelected: (value) {
                            if (value == 'live') {
                              _refreshLiveLocation();
                            } else if (value == 'manual') {
                              _setManualLocation();
                            }
                          },
                          itemBuilder: (_) => [
                            PopupMenuItem(
                              value: 'live',
                              child: Text('screen.choice_screen.fetch_live_location'.tr()),
                            ),
                            PopupMenuItem(
                              value: 'manual',
                              child: Text('screen.choice_screen.enter_manually'.tr()),
                            ),
                          ],
                          child: Row(
                            children: [
                              const Icon(Icons.location_on_outlined,
                                  color: AppColors.primaryDark, size: 18),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  _locationName.isEmpty
                                      ? 'screen.choice_screen.location_unavailable'.tr()
                                      : _locationName,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: AppColors.lightText,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              const Icon(
                                Icons.keyboard_arrow_down_rounded,
                                color: AppColors.primaryDark,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const Spacer(),
                    const SizedBox(width: 8),
                    _languageMenu(ref, context, iconBg),
                    const SizedBox(width: 8),
                    _topIcon(
                      Icons.person_rounded,
                      AppColors.primaryDark,
                      context,
                      iconBg,
                      route: RoutePaths.profile,
                    ),
                  ],
                ),

              const SizedBox(height: 6),

              SizedBox(
                height: logoSize,
                width: logoSize,
                child: ClipOval(
                  child: Image.asset(
                    'assets/images/logo.png',
                    fit: BoxFit.contain,
                  ),
                ),
              ),

              const SizedBox(height: 6),

              Text(
                'screen.choice_screen.choose_interaction_mode'.tr(),
                textAlign: TextAlign.center,
                style: context.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  fontSize: 20,
                  color: textColor,
                ),
              ),

              const SizedBox(height: 16),

              _interactionCard(
                context: context,
                icon: Icons.mic,
                title: 'screen.choice_screen.voice_pilot'.tr(),
                subtitle:
                    'screen.choice_screen.speak_naturally_to_get_instant_farming_advice'.tr(),
                onTap: () => context.push(RoutePaths.liveVoice),
                cardColor: cardColor,
                textColor: textColor,
                subColor: subColor,
              ),

              const SizedBox(height: 14),

              _orDivider(subColor),

              const SizedBox(height: 14),

              _interactionCard(
                context: context,
                icon: Icons.edit,
                title: 'screen.choice_screen.manual_mode'.tr(),
                subtitle:
                    'screen.choice_screen.type_your_questions_for_detailed_responses'.tr(),
                onTap: () => context.push(RoutePaths.chat),
                cardColor: cardColor,
                textColor: textColor,
                subColor: subColor,
              ),

              const SizedBox(height: 22),

              Center(
                child: Text(
                  'screen.choice_screen.quick_access'.tr(),
                  style: context.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: textColor,
                  ),
                ),
              ),

              const SizedBox(height: 14),

              Row(
                children: [
                  Expanded(
                    child: _quickCard(
                      context: context,
                      icon: Icons.recycling,
                      iconColor: primaryGreen,
                      title: 'screen.choice_screen.best_out_of_waste'.tr(),
                      subtitle: 'screen.choice_screen.sustainable_solutions'.tr(),
                      onTap: () => context.push(RoutePaths.waste),
                      cardColor: cardColor,
                      textColor: textColor,
                      subColor: subColor,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _quickCard(
                      context: context,
                      icon: Icons.trending_up,
                      iconColor: Colors.orange,
                      title: 'screen.choice_screen.view_market_prices'.tr(),
                      subtitle: 'screen.choice_screen.real_time_rates'.tr(),
                      onTap: () => context.push(RoutePaths.marketPrices),
                      cardColor: cardColor,
                      textColor: textColor,
                      subColor: subColor,
                    ),
                  ),
                ],
              ),

                const SizedBox(height: 100),
              ],
            ),
          ),
        ),
      ),

      floatingActionButton: FloatingActionButton(
        backgroundColor: primaryGreen,
        onPressed: () => context.push(RoutePaths.mentalHealth),
        child: const Icon(Icons.help_outline, color: Colors.white),
      ),
      ),
    );
  }

  Widget _topIcon(
    IconData icon,
    Color color,
    BuildContext context,
    Color bg, {
    required String route,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: IconButton(
        icon: Icon(icon, color: color, size: 20),
        onPressed: () => context.push(route),
      ),
    );
  }

  Widget _languageMenu(WidgetRef ref, BuildContext context, Color bg) {
    return Container(
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: PopupMenuButton<String>(
        icon: const Icon(Icons.language, color: Colors.orange, size: 20),
        onSelected: (code) async {
          await ref.read(localeProvider.notifier).setLocale(context, code);
        },
        itemBuilder: (ctx) => AppConstants.supportedLocales.map((code) {
          final name = AppConstants.languageNames[code] ?? code;
          return PopupMenuItem<String>(
            value: code,
            child: Text(name),
          );
        }).toList(),
      ),
    );
  }

  Widget _interactionCard({
    required BuildContext context,
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    required Color cardColor,
    required Color textColor,
    required Color subColor,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.8), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryDark.withValues(alpha: 0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 120),
          child: Padding(
            padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: primaryGreen.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: primaryGreen),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                            color: textColor)),
                    const SizedBox(height: 4),
                    Text(subtitle,
                        style: TextStyle(fontSize: 12, color: subColor)),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: subColor),
            ],
          ),
          ),
        ),
      ),
    );
  }

  Widget _orDivider(Color subColor) {
    return Row(
      children: [
        const Expanded(child: Divider()),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Text('screen.choice_screen.or'.tr(),
              style: TextStyle(fontWeight: FontWeight.w600, color: subColor)),
        ),
        const Expanded(child: Divider()),
      ],
    );
  }

  Widget _quickCard({
    required BuildContext context,
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    required Color cardColor,
    required Color textColor,
    required Color subColor,
  }) {
    return Container(
      height: 130,
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.8), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryDark.withValues(alpha: 0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: iconColor),
              ),
              const SizedBox(height: 10),
              Text(title,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      fontWeight: FontWeight.bold, color: textColor)),
              Text(subtitle,
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12, color: subColor)),
            ],
          ),
        ),
      ),
    );
  }
}