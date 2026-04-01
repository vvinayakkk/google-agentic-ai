import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/farmer_profile_model.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/providers/locale_provider.dart';
import '../../../shared/providers/theme_provider.dart';
import '../../../shared/services/crop_service.dart';
import '../../../shared/services/farmer_service.dart';
import '../../../shared/services/livestock_service.dart';
import '../../../shared/services/notification_service.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_overlay.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  FarmerProfile? _profile;
  Map<String, dynamic> _dashboard = const {};

  int _cropsCount = 0;
  int _livestockCount = 0;
  int _unreadNotifications = 0;

  bool _isLoading = true;
  bool _isEditing = false;
  bool _isSaving = false;
  String? _error;

  late final TextEditingController _nameCtrl;
  late final TextEditingController _phoneCtrl;
  late final TextEditingController _villageCtrl;
  late final TextEditingController _districtCtrl;
  late final TextEditingController _stateCtrl;
  late final TextEditingController _pincodeCtrl;
  late final TextEditingController _soilTypeCtrl;
  late final TextEditingController _irrigationCtrl;
  late final TextEditingController _landSizeCtrl;
  late final TextEditingController _landUnitCtrl;
  late final TextEditingController _languageCtrl;
  late final TextEditingController _cropsCtrl;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController();
    _phoneCtrl = TextEditingController();
    _villageCtrl = TextEditingController();
    _districtCtrl = TextEditingController();
    _stateCtrl = TextEditingController();
    _pincodeCtrl = TextEditingController();
    _soilTypeCtrl = TextEditingController();
    _irrigationCtrl = TextEditingController();
    _landSizeCtrl = TextEditingController();
    _landUnitCtrl = TextEditingController();
    _languageCtrl = TextEditingController();
    _cropsCtrl = TextEditingController();
    _loadAll();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _villageCtrl.dispose();
    _districtCtrl.dispose();
    _stateCtrl.dispose();
    _pincodeCtrl.dispose();
    _soilTypeCtrl.dispose();
    _irrigationCtrl.dispose();
    _landSizeCtrl.dispose();
    _landUnitCtrl.dispose();
    _languageCtrl.dispose();
    _cropsCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final results = await Future.wait<dynamic>([
        ref
            .read(farmerServiceProvider)
            .getMyProfile()
            .catchError((_) => <String, dynamic>{}),
        ref
            .read(farmerServiceProvider)
            .getDashboard()
            .catchError((_) => <String, dynamic>{}),
        ref
            .read(cropServiceProvider)
            .listCrops()
            .catchError((_) => <Map<String, dynamic>>[]),
        ref
            .read(livestockServiceProvider)
            .listLivestock()
            .catchError((_) => <Map<String, dynamic>>[]),
        ref
            .read(notificationServiceProvider)
            .getUnreadCount()
            .catchError((_) => 0),
      ]);

      final profileJson = results[0] as Map<String, dynamic>;
      final dashboard = results[1] as Map<String, dynamic>;
      final crops = results[2] as List<Map<String, dynamic>>;
      final livestock = results[3] as List<Map<String, dynamic>>;
      final unread = (results[4] as int?) ?? 0;

      _profile =
          profileJson.isNotEmpty ? FarmerProfile.fromJson(profileJson) : null;
      _dashboard = dashboard;
      _cropsCount =
          _readInt(dashboard, const ['active_crops', 'crops_count', 'total_crops']) ??
              crops.length;
      _livestockCount = _readInt(
            dashboard,
            const ['livestock_count', 'total_livestock'],
          ) ??
          livestock.length;
      _unreadNotifications = unread;

      _hydrateForm();
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _hydrateForm() {
    final user = ref.read(authStateProvider).value?.user;

    _nameCtrl.text = _profile?.name.isNotEmpty == true
        ? _profile!.name
        : (user?['name'] as String? ?? '');
    _phoneCtrl.text = _profile?.phone.isNotEmpty == true
        ? _profile!.phone
        : (user?['phone'] as String? ?? '');
    _villageCtrl.text = _profile?.village ?? '';
    _districtCtrl.text = _profile?.district ?? '';
    _stateCtrl.text = _profile?.state ?? '';
    _pincodeCtrl.text = _profile?.pincode ?? '';
    _soilTypeCtrl.text = _profile?.soilType ?? '';
    _irrigationCtrl.text = _profile?.irrigationType ?? '';
    _landSizeCtrl.text = _profile?.landSize?.toString() ?? '';
    _landUnitCtrl.text = _profile?.landUnit ?? 'acres';
    _languageCtrl.text = _profile?.preferredLanguage ?? '';
    _cropsCtrl.text = _profile?.crops.join(', ') ?? '';
  }

  int? _readInt(Map<String, dynamic> source, List<String> keys) {
    for (final key in keys) {
      final value = source[key];
      if (value is int) return value;
      if (value is num) return value.toInt();
      if (value is String) {
        final parsed = int.tryParse(value);
        if (parsed != null) return parsed;
      }
    }
    return null;
  }

  double? _parseDouble(String text) {
    final normalized = text.trim();
    if (normalized.isEmpty) return null;
    return double.tryParse(normalized);
  }

  String? _nullable(String text) {
    final cleaned = text.trim();
    return cleaned.isEmpty ? null : cleaned;
  }

  String _display(String? value) {
    final text = (value ?? '').trim();
    return text.isEmpty ? 'Not set' : text;
  }

  String _displayNum(num? value) {
    if (value == null) return 'Not set';
    if (value % 1 == 0) return value.toStringAsFixed(0);
    return value.toStringAsFixed(2);
  }

  BoxDecoration _choiceCardDecoration({double radius = 18}) {
    return BoxDecoration(
      color: Colors.white.withValues(alpha: 0.56),
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(
        color: Colors.white.withValues(alpha: 0.8),
        width: 1.2,
      ),
      boxShadow: [
        BoxShadow(
          color: AppColors.primaryDark.withValues(alpha: 0.08),
          blurRadius: 10,
          offset: const Offset(0, 4),
        ),
      ],
    );
  }

  void _toggleEditMode() {
    if (_isSaving) return;
    setState(() {
      if (_isEditing) {
        _hydrateForm();
      }
      _isEditing = !_isEditing;
    });
  }

  Future<void> _saveInlineProfile() async {
    if (_isSaving) return;

    setState(() => _isSaving = true);

    try {
      final village = _nullable(_villageCtrl.text);
      final district = _nullable(_districtCtrl.text);
      final state = _nullable(_stateCtrl.text);
      final pinCode = _nullable(_pincodeCtrl.text);
      final soil = _nullable(_soilTypeCtrl.text);
      final irrigation = _nullable(_irrigationCtrl.text);
      final language = _nullable(_languageCtrl.text);
      final name = _nullable(_nameCtrl.text);
      final phone = _nullable(_phoneCtrl.text);
      final landUnit = _nullable(_landUnitCtrl.text);
      final landSize = _parseDouble(_landSizeCtrl.text);
      final crops = _cropsCtrl.text
          .split(',')
          .map((e) => e.trim())
          .where((e) => e.isNotEmpty)
          .toList(growable: false);

      if (_profile == null) {
        if (village == null ||
            district == null ||
            state == null ||
            pinCode == null ||
            landSize == null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Village, district, state, pincode and land size are required to create profile.',
              ),
            ),
          );
          return;
        }

        await ref.read(farmerServiceProvider).createProfile(
              village: village,
              district: district,
              state: state,
              pinCode: pinCode,
              landSizeAcres: landSize,
              soilType: soil,
              irrigationType: irrigation,
              language: language,
            );
      }

      final payload = <String, dynamic>{
        if (name != null) 'name': name,
        if (phone != null) 'phone': phone,
        if (village != null) 'village': village,
        if (district != null) 'district': district,
        if (state != null) 'state': state,
        if (pinCode != null) 'pin_code': pinCode,
        if (soil != null) 'soil_type': soil,
        if (irrigation != null) 'irrigation_type': irrigation,
        if (landSize != null) 'land_size_acres': landSize,
        if (landUnit != null) 'land_unit': landUnit,
        if (language != null) 'language': language,
        'crops': crops,
      };

      final updated = await ref.read(farmerServiceProvider).updateProfile(payload);
      _profile = FarmerProfile.fromJson(updated);

      if (!mounted) return;

      setState(() {
        _isEditing = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile updated successfully.')),
      );

      await _loadAll();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  Future<void> _logout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.danger),
            child: const Text('Logout'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;
    await ref.read(authStateProvider.notifier).logout();
    if (mounted) context.go(RoutePaths.login);
  }

  Future<void> _setLanguage(String code) async {
    await ref.read(localeProvider.notifier).setLocale(context, code);
  }

  Future<void> _setThemeMode(bool darkMode) async {
    await ref
        .read(themeProvider.notifier)
        .setTheme(darkMode ? ThemeMode.dark : ThemeMode.light);
  }

  @override
  Widget build(BuildContext context) {
    final iconTone = context.isDark ? AppColors.darkText : AppColors.lightText;
    final currentLocale = ref.watch(localeProvider);
    final currentTheme = ref.watch(themeProvider);
    final darkMode = currentTheme == ThemeMode.dark;

    final landFromDashboard = _readInt(
      _dashboard,
      const ['land_size_acres', 'land_size'],
    );
    final landSize = _profile?.landSize ?? landFromDashboard?.toDouble();

    return Scaffold(
      backgroundColor:
          context.isDark ? AppColors.darkBackground : AppColors.lightBackground,
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: context.isDark
                ? [AppColors.darkBackground, AppColors.darkSurface]
                : [AppColors.lightBackground, AppColors.lightSurface],
          ),
        ),
        child: _isLoading
            ? const Center(child: LoadingState(itemCount: 5))
            : _error != null && _profile == null
                ? ErrorView(message: _error!, onRetry: _loadAll)
                : SafeArea(
                    bottom: false,
                    child: RefreshIndicator(
                      onRefresh: _loadAll,
                      child: ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(
                          AppSpacing.lg,
                          AppSpacing.sm,
                          AppSpacing.lg,
                          AppSpacing.xxxl,
                        ),
                        children: [
                          Row(
                            children: [
                              IconButton(
                                onPressed: () {
                                  if (Navigator.of(context).canPop()) {
                                    Navigator.of(context).pop();
                                  } else {
                                    context.go(RoutePaths.home);
                                  }
                                },
                                icon: Icon(
                                  Icons.arrow_back_rounded,
                                  color: iconTone,
                                ),
                              ),
                              Expanded(
                                child: Text(
                                  'Profile',
                                  textAlign: TextAlign.center,
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleLarge
                                      ?.copyWith(fontWeight: FontWeight.w900),
                                ),
                              ),
                              IconButton(
                                onPressed: _loadAll,
                                icon: Icon(Icons.refresh_rounded, color: iconTone),
                              ),
                            ],
                          ),
                          const SizedBox(height: AppSpacing.sm),
                          _headerCard(),
                          const SizedBox(height: AppSpacing.md),
                          _statsStrip(landSize: landSize, iconTone: iconTone),
                          const SizedBox(height: AppSpacing.md),
                          _farmerInformationCard(),
                          const SizedBox(height: AppSpacing.md),
                          _preferencesSection(
                            currentLocale: currentLocale,
                            darkMode: darkMode,
                          ),
                          const SizedBox(height: AppSpacing.md),
                          _actionsSection(iconTone: iconTone),
                          const SizedBox(height: AppSpacing.lg),
                          OutlinedButton.icon(
                            onPressed: _logout,
                            icon: const Icon(
                              Icons.logout_rounded,
                              color: AppColors.danger,
                            ),
                            label: const Text(
                              'Logout',
                              style: TextStyle(color: AppColors.danger),
                            ),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: AppColors.danger),
                              minimumSize: const Size(double.infinity, 50),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(AppRadius.md),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
      ),
    );
  }

  Widget _headerCard() {
    final user = ref.watch(authStateProvider).value?.user;
    final role = (user?['role'] ?? 'farmer').toString();

    final name = _display(_nullable(_nameCtrl.text));
    final phone = _display(_nullable(_phoneCtrl.text));

    final location = [
      _nullable(_villageCtrl.text),
      _nullable(_districtCtrl.text),
      _nullable(_stateCtrl.text),
    ].whereType<String>().join(', ');

    final initials = name == 'Not set'
        ? 'F'
        : name
            .split(' ')
            .where((e) => e.isNotEmpty)
            .take(2)
            .map((e) => e[0])
            .join()
            .toUpperCase();

    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: _choiceCardDecoration(radius: 22),
      child: Row(
        children: [
          CircleAvatar(
            radius: 28,
            backgroundColor: context.isDark
                ? AppColors.darkSurface.withValues(alpha: 0.9)
                : Colors.white,
            foregroundColor:
                context.isDark ? AppColors.darkText : AppColors.lightText,
            child: Text(
              initials,
              style: const TextStyle(fontWeight: FontWeight.w900),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 2),
                Text(
                  phone,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: context.isDark
                            ? AppColors.darkTextSecondary
                            : AppColors.lightTextSecondary,
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  location.isEmpty ? 'Location not set' : location,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: context.isDark
                            ? AppColors.darkTextSecondary
                            : AppColors.lightTextSecondary,
                      ),
                ),
              ],
            ),
          ),
          Column(
            children: [
              IconButton(
                onPressed: _toggleEditMode,
                icon: Icon(
                  _isEditing ? Icons.close_rounded : Icons.edit_rounded,
                ),
                tooltip: _isEditing ? 'Cancel editing' : 'Edit here',
              ),
              _tag(role.toUpperCase()),
            ],
          ),
        ],
      ),
    );
  }

  Widget _statsStrip({required double? landSize, required Color iconTone}) {
    final stats = [
      _ProfileStat('Crops', '$_cropsCount', Icons.grass_rounded),
      _ProfileStat('Livestock', '$_livestockCount', Icons.pets_rounded),
      _ProfileStat(
        'Land',
        landSize == null ? 'NA' : _displayNum(landSize),
        Icons.landscape_rounded,
      ),
      _ProfileStat(
        'Alerts',
        '$_unreadNotifications',
        Icons.notifications_active_rounded,
      ),
    ];

    return Wrap(
      spacing: AppSpacing.sm,
      runSpacing: AppSpacing.sm,
      children: stats
          .map(
            (s) => SizedBox(
              width: (MediaQuery.of(context).size.width -
                      (2 * AppSpacing.lg) -
                      AppSpacing.sm -
                      2) /
                  2,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.sm,
                  vertical: AppSpacing.sm,
                ),
                decoration: _choiceCardDecoration(radius: 14),
                child: Row(
                  children: [
                    Icon(s.icon, size: 16, color: iconTone),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            s.value,
                            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.w900,
                                ),
                          ),
                          Text(
                            s.label,
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          )
          .toList(growable: false),
    );
  }

  Widget _farmerInformationCard() {
    final fields = <_EditableFieldConfig>[
      _EditableFieldConfig('Name', _nameCtrl),
      _EditableFieldConfig('Phone', _phoneCtrl, keyboardType: TextInputType.phone),
      _EditableFieldConfig('Village', _villageCtrl),
      _EditableFieldConfig('District', _districtCtrl),
      _EditableFieldConfig('State', _stateCtrl),
      _EditableFieldConfig('Pincode', _pincodeCtrl, keyboardType: TextInputType.number),
      _EditableFieldConfig('Soil Type', _soilTypeCtrl),
      _EditableFieldConfig('Irrigation', _irrigationCtrl),
      _EditableFieldConfig(
        'Land Size (acres)',
        _landSizeCtrl,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
      ),
      _EditableFieldConfig('Land Unit', _landUnitCtrl),
      _EditableFieldConfig('Language', _languageCtrl),
      _EditableFieldConfig(
        'Crops (comma separated)',
        _cropsCtrl,
        maxLines: 2,
      ),
    ];

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: _choiceCardDecoration(radius: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Farmer Information',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
              ),
              if (_isEditing)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.sm,
                    vertical: AppSpacing.xs,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(AppRadius.full),
                  ),
                  child: const Text(
                    'Editing',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          LayoutBuilder(
            builder: (context, constraints) {
              final columns = constraints.maxWidth >= 760
                  ? 3
                  : constraints.maxWidth >= 360
                      ? 2
                      : 1;
              final cellWidth =
                  (constraints.maxWidth - ((columns - 1) * AppSpacing.md)) /
                      columns;
              return Wrap(
                spacing: AppSpacing.md,
                runSpacing: AppSpacing.sm,
                children: fields
                    .map(
                      (field) => SizedBox(
                        width: cellWidth,
                        child: _editableField(field),
                      ),
                    )
                    .toList(growable: false),
              );
            },
          ),
          if (_isEditing) ...[
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _isSaving ? null : _toggleEditMode,
                    child: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: _isSaving ? null : _saveInlineProfile,
                    icon: _isSaving
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.save_rounded),
                    label: Text(_isSaving ? 'Saving...' : 'Save Changes'),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _editableField(_EditableFieldConfig field) {
    final readValue = _display(_nullable(field.controller.text));

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.sm,
      ),
      decoration: _choiceCardDecoration(radius: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            field.label,
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: context.isDark
                      ? AppColors.darkTextSecondary
                      : AppColors.lightTextSecondary,
                ),
          ),
          const SizedBox(height: 4),
          if (_isEditing)
            TextField(
              controller: field.controller,
              keyboardType: field.keyboardType,
              maxLines: field.maxLines,
              decoration: InputDecoration(
                isDense: true,
                filled: true,
                fillColor: context.isDark
                    ? AppColors.darkSurface.withValues(alpha: 0.4)
                    : Colors.white,
                hintText: field.label,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 10,
                ),
              ),
            )
          else
            Text(
              readValue,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
        ],
      ),
    );
  }

  Widget _preferencesSection({
    required Locale currentLocale,
    required bool darkMode,
  }) {
    final currentCode = currentLocale.languageCode;
    final currentName = AppConstants.languageNames[currentCode] ?? currentCode;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: _choiceCardDecoration(radius: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Language & Theme',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: AppSpacing.md),
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.sm,
              vertical: AppSpacing.sm,
            ),
            decoration: _choiceCardDecoration(radius: 12),
            child: Row(
              children: [
                const Icon(Icons.language_rounded, size: 18),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Text(
                    'Language: $currentName',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                ),
                PopupMenuButton<String>(
                  onSelected: _setLanguage,
                  itemBuilder: (ctx) => AppConstants.supportedLocales
                      .map(
                        (code) => PopupMenuItem<String>(
                          value: code,
                          child: Text(AppConstants.languageNames[code] ?? code),
                        ),
                      )
                      .toList(growable: false),
                  child: const Padding(
                    padding: EdgeInsets.symmetric(
                      horizontal: AppSpacing.sm,
                      vertical: AppSpacing.xs,
                    ),
                    child: Icon(Icons.keyboard_arrow_down_rounded),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.sm,
              vertical: AppSpacing.sm,
            ),
            decoration: _choiceCardDecoration(radius: 12),
            child: Row(
              children: [
                Icon(darkMode ? Icons.dark_mode_rounded : Icons.light_mode_rounded, size: 18),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Text(
                    darkMode ? 'Dark Theme' : 'Light Theme',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                ),
                Switch.adaptive(
                  value: darkMode,
                  onChanged: _setThemeMode,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _actionsSection({required Color iconTone}) {
    final actions = [
      _ProfileAction(
        title: 'Equipment Hub',
        icon: Icons.handyman_rounded,
        onTap: () => context.push(RoutePaths.equipmentHub),
      ),
      _ProfileAction(
        title: 'My Bookings',
        icon: Icons.calendar_month_rounded,
        onTap: () => context.push(RoutePaths.myBookings),
      ),
      _ProfileAction(
        title: 'Notifications',
        icon: Icons.notifications_rounded,
        onTap: () => context.push(RoutePaths.notifications),
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Text(
          'Quick Actions',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w900,
              ),
        ),
        const SizedBox(height: AppSpacing.sm),
        Wrap(
          spacing: AppSpacing.sm,
          runSpacing: AppSpacing.sm,
          children: actions
              .map(
                (action) => SizedBox(
                  width: (MediaQuery.of(context).size.width -
                          (2 * AppSpacing.lg) -
                          AppSpacing.sm -
                          2) /
                      2,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(14),
                    onTap: action.onTap,
                    child: Container(
                      padding: const EdgeInsets.all(AppSpacing.sm),
                      decoration: _choiceCardDecoration(radius: 14),
                      child: Row(
                        children: [
                          Icon(action.icon, size: 18, color: iconTone),
                          const SizedBox(width: AppSpacing.sm),
                          Expanded(
                            child: Text(
                              action.title,
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    fontWeight: FontWeight.w700,
                                  ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              )
              .toList(growable: false),
        ),
      ],
    );
  }

  Widget _tag(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AppRadius.full),
      ),
      child: Text(
        text,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }
}

class _ProfileAction {
  final String title;
  final IconData icon;
  final VoidCallback onTap;

  const _ProfileAction({
    required this.title,
    required this.icon,
    required this.onTap,
  });
}

class _ProfileStat {
  final String label;
  final String value;
  final IconData icon;

  const _ProfileStat(this.label, this.value, this.icon);
}

class _EditableFieldConfig {
  final String label;
  final TextEditingController controller;
  final TextInputType? keyboardType;
  final int maxLines;

  const _EditableFieldConfig(
    this.label,
    this.controller, {
    this.keyboardType,
    this.maxLines = 1,
  });
}
