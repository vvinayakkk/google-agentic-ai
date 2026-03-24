import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/models/farmer_profile_model.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/services/farmer_service.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_overlay.dart';

/// Full farmer profile detail / edit screen with sectioned form.
class FarmerProfileScreen extends ConsumerStatefulWidget {
  const FarmerProfileScreen({super.key});

  @override
  ConsumerState<FarmerProfileScreen> createState() =>
      _FarmerProfileScreenState();
}

class _FarmerProfileScreenState extends ConsumerState<FarmerProfileScreen> {
  FarmerProfile? _profile;
  bool _isLoading = true;
  bool _isSaving = false;
  bool _isEditing = false;
  bool _isNewProfile = false;
  String? _error;

  final _formKey = GlobalKey<FormState>();

  // Controllers
  late final TextEditingController _nameCtrl;
  late final TextEditingController _villageCtrl;
  late final TextEditingController _districtCtrl;
  late final TextEditingController _stateCtrl;
  late final TextEditingController _pincodeCtrl;
  late final TextEditingController _landSizeCtrl;
  late final TextEditingController _cropsCtrl;

  // Dropdown values
  String? _selectedSoilType;
  String? _selectedIrrigationType;

  static const _soilTypes = [
    'Alluvial',
    'Black Cotton',
    'Red',
    'Laterite',
    'Sandy',
    'Clayey',
    'Loamy',
    'Saline',
    'Peaty',
    'Forest',
  ];

  static const _irrigationTypes = [
    'Drip',
    'Sprinkler',
    'Flood',
    'Canal',
    'Well',
    'Tube Well',
    'Rain-fed',
    'Furrow',
    'Centre Pivot',
  ];

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController();
    _villageCtrl = TextEditingController();
    _districtCtrl = TextEditingController();
    _stateCtrl = TextEditingController();
    _pincodeCtrl = TextEditingController();
    _landSizeCtrl = TextEditingController();
    _cropsCtrl = TextEditingController();
    _loadProfile();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _villageCtrl.dispose();
    _districtCtrl.dispose();
    _stateCtrl.dispose();
    _pincodeCtrl.dispose();
    _landSizeCtrl.dispose();
    _cropsCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final data = await ref.read(farmerServiceProvider).getMyProfile();
      final profile = FarmerProfile.fromJson(data);
      _profile = profile;
      _isNewProfile = false;
      _populateControllers(profile);
    } catch (e) {
      // If 404 or no profile, allow creation
      if (e.toString().contains('404') || e.toString().contains('not found')) {
        _isNewProfile = true;
        _isEditing = true;
        // Pre-fill name from auth
        final authState = ref.read(authStateProvider);
        final user = authState.value?.user;
        _nameCtrl.text = user?['name'] as String? ?? '';
      } else {
        _error = e.toString();
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _populateControllers(FarmerProfile p) {
    _nameCtrl.text = p.name;
    _villageCtrl.text = p.village ?? '';
    _districtCtrl.text = p.district ?? '';
    _stateCtrl.text = p.state ?? '';
    _pincodeCtrl.text = p.pincode ?? '';
    _landSizeCtrl.text = p.landSize?.toString() ?? '';
    _cropsCtrl.text = p.crops.join(', ');
    _selectedSoilType =
        _soilTypes.contains(p.soilType) ? p.soilType : null;
    _selectedIrrigationType =
        _irrigationTypes.contains(p.irrigationType) ? p.irrigationType : null;
  }

  Future<void> _saveProfile() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() => _isSaving = true);
    try {
      final data = <String, dynamic>{
        'village': _villageCtrl.text.trim(),
        'district': _districtCtrl.text.trim(),
        'state': _stateCtrl.text.trim(),
        'pin_code': _pincodeCtrl.text.trim(),
        if (_selectedSoilType != null) 'soil_type': _selectedSoilType,
        if (_selectedIrrigationType != null)
          'irrigation_type': _selectedIrrigationType,
        'crops': _cropsCtrl.text
            .split(',')
            .map((e) => e.trim())
            .where((e) => e.isNotEmpty)
            .toList(),
      };
      final landSize = double.tryParse(_landSizeCtrl.text.trim());
      if (landSize != null) data['land_size_acres'] = landSize;

      Map<String, dynamic> result;
      if (_isNewProfile) {
        result = await ref.read(farmerServiceProvider).createProfile(
              village: _villageCtrl.text.trim(),
              district: _districtCtrl.text.trim(),
              state: _stateCtrl.text.trim(),
              pinCode: _pincodeCtrl.text.trim(),
              landSizeAcres: landSize ?? 0,
              soilType: _selectedSoilType,
              irrigationType: _selectedIrrigationType,
            );
      } else {
        result = await ref.read(farmerServiceProvider).updateProfile(data);
      }

      _profile = FarmerProfile.fromJson(result);
      _populateControllers(_profile!);
      _isNewProfile = false;
      setState(() => _isEditing = false);
      if (mounted) {
        context.showSnack('farmer_profile.saved'.tr());
      }
    } catch (e) {
      if (mounted) context.showSnack(e.toString(), isError: true);
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _deleteProfile() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: AppRadius.lgAll),
        title: Row(
          children: [
            const Icon(Icons.warning_amber_rounded,
                color: AppColors.danger, size: 24),
            const SizedBox(width: AppSpacing.sm),
            Text('Delete Profile',
                style: ctx.textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold)),
          ],
        ),
        content: const Text(
            'This will permanently delete your farmer profile. This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('farmer_profile.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.danger),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _isSaving = true);
    try {
      await ref.read(farmerServiceProvider).deleteProfile();
      if (mounted) {
        context.showSnack('Profile deleted');
        context.pop();
      }
    } catch (e) {
      if (mounted) context.showSnack(e.toString(), isError: true);
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  void _toggleEdit() {
    if (_isEditing && _profile != null) {
      _populateControllers(_profile!);
    }
    setState(() => _isEditing = !_isEditing);
  }

  String _initials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final user = authState.value?.user;
    final authName = user?['name'] as String? ?? '';
    final authPhone = user?['phone'] as String? ?? '';

    return Scaffold(
      appBar: AppBar(
        title: Text('farmer_profile.title'.tr()),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
        actions: [
          if (_profile != null && !_isEditing)
            IconButton(
              icon: const Icon(Icons.edit_rounded),
              tooltip: 'profile.edit'.tr(),
              onPressed: _toggleEdit,
            ),
          if (_isEditing && !_isNewProfile)
            IconButton(
              icon: const Icon(Icons.close_rounded),
              tooltip: 'farmer_profile.cancel'.tr(),
              onPressed: _toggleEdit,
            ),
        ],
      ),
      body: _buildBody(authName, authPhone),
    );
  }

  Widget _buildBody(String authName, String authPhone) {
    if (_isLoading) {
      return const Center(child: LoadingState(itemCount: 4));
    }
    if (_error != null) {
      return ErrorView(message: _error!, onRetry: _loadProfile);
    }

    final displayName = _profile?.name ?? authName;
    final displayPhone = _profile?.phone ?? authPhone;

    return Stack(
      children: [
        RefreshIndicator(
          onRefresh: _loadProfile,
          color: AppColors.primary,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: AppSpacing.allLg,
            child: Form(
              key: _formKey,
              child: Column(
                children: [
                  // ── Avatar Header ────────────────────────
                  _ProfileHeader(
                    name: displayName,
                    phone: displayPhone,
                    initials: _initials(displayName),
                    isNew: _isNewProfile,
                  ),
                  const SizedBox(height: AppSpacing.xl),

                  // ── Personal Info Section ────────────────
                  _SectionHeader(
                    icon: Icons.person_outline_rounded,
                    title: 'farmer_profile.personal_info'.tr(),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  _buildPersonalInfo(authName, authPhone),
                  const SizedBox(height: AppSpacing.xl),

                  // ── Location Section ─────────────────────
                  _SectionHeader(
                    icon: Icons.location_on_outlined,
                    title: 'farmer_profile.location'.tr(),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  _buildLocationSection(),
                  const SizedBox(height: AppSpacing.xl),

                  // ── Farm Details Section ─────────────────
                  _SectionHeader(
                    icon: Icons.agriculture_rounded,
                    title: 'farmer_profile.farm_details'.tr(),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  _buildFarmDetailsSection(),
                  const SizedBox(height: AppSpacing.xl),

                  // ── GPS Section (Read-only) ──────────────
                  if (_profile != null &&
                      (_profile!.latitude != null ||
                          _profile!.longitude != null)) ...[
                    _SectionHeader(
                      icon: Icons.my_location_rounded,
                      title: 'GPS Coordinates',
                    ),
                    const SizedBox(height: AppSpacing.md),
                    _InfoTile(
                      icon: Icons.north_east_rounded,
                      label: 'farmer_profile.latitude'.tr(),
                      value: _profile!.latitude?.toStringAsFixed(6) ??
                          'farmer_profile.not_set'.tr(),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    _InfoTile(
                      icon: Icons.east_rounded,
                      label: 'farmer_profile.longitude'.tr(),
                      value: _profile!.longitude?.toStringAsFixed(6) ??
                          'farmer_profile.not_set'.tr(),
                    ),
                    const SizedBox(height: AppSpacing.xl),
                  ],

                  // ── Save / Cancel ────────────────────────
                  if (_isEditing) ...[
                    AppButton(
                      label: _isNewProfile
                          ? 'profile.save'.tr()
                          : 'farmer_profile.save_changes'.tr(),
                      icon: Icons.save_rounded,
                      isLoading: _isSaving,
                      onPressed: _saveProfile,
                    ),
                    const SizedBox(height: AppSpacing.md),
                    if (!_isNewProfile)
                      AppButton(
                        label: 'farmer_profile.cancel'.tr(),
                        isOutlined: true,
                        onPressed: _toggleEdit,
                      ),
                  ],

                  // ── Delete Profile ───────────────────────
                  if (!_isNewProfile && !_isEditing) ...[
                    const SizedBox(height: AppSpacing.lg),
                    const Divider(),
                    const SizedBox(height: AppSpacing.lg),
                    OutlinedButton.icon(
                      onPressed: _deleteProfile,
                      icon: const Icon(Icons.delete_forever_rounded,
                          color: AppColors.danger),
                      label: Text(
                        'Delete Profile',
                        style: const TextStyle(color: AppColors.danger),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppColors.danger),
                        minimumSize: const Size(double.infinity, 48),
                        shape: RoundedRectangleBorder(
                            borderRadius: AppRadius.mdAll),
                      ),
                    ),
                  ],
                  const SizedBox(height: AppSpacing.xxxl),
                ],
              ),
            ),
          ),
        ),

        // Loading overlay
        if (_isSaving)
          const LoadingOverlay(message: 'Saving...'),
      ],
    );
  }

  // ── Personal Info ──────────────────────────────────────

  Widget _buildPersonalInfo(String authName, String authPhone) {
    if (_isEditing) {
      return _CardContainer(
        child: Column(
          children: [
            AppTextField(
              label: 'farmer_profile.name'.tr(),
              hint: 'farmer_profile.name_hint'.tr(),
              controller: _nameCtrl,
              prefixIcon: Icons.person_rounded,
              enabled: false, // Name from auth, read-only
            ),
            const SizedBox(height: AppSpacing.lg),
            AppTextField(
              label: 'farmer_profile.phone'.tr(),
              hint: 'farmer_profile.phone_hint'.tr(),
              controller: TextEditingController(text: authPhone),
              prefixIcon: Icons.phone_rounded,
              enabled: false, // Phone is read-only
            ),
          ],
        ),
      );
    }

    return _CardContainer(
      child: Column(
        children: [
          _InfoTile(
            icon: Icons.person_rounded,
            label: 'farmer_profile.name'.tr(),
            value: _profile?.name ?? authName,
          ),
          Divider(height: AppSpacing.xl, color: context.appColors.border),
          _InfoTile(
            icon: Icons.phone_rounded,
            label: 'farmer_profile.phone'.tr(),
            value: _profile?.phone ?? authPhone,
          ),
        ],
      ),
    );
  }

  // ── Location ───────────────────────────────────────────

  Widget _buildLocationSection() {
    if (_isEditing) {
      return _CardContainer(
        child: Column(
          children: [
            AppTextField(
              label: 'farmer_profile.village'.tr(),
              hint: 'farmer_profile.village_hint'.tr(),
              controller: _villageCtrl,
              prefixIcon: Icons.location_city_rounded,
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: AppSpacing.lg),
            AppTextField(
              label: 'farmer_profile.district'.tr(),
              hint: 'farmer_profile.district_hint'.tr(),
              controller: _districtCtrl,
              prefixIcon: Icons.map_rounded,
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: AppSpacing.lg),
            Row(
              children: [
                Expanded(
                  child: AppTextField(
                    label: 'farmer_profile.state'.tr(),
                    hint: 'farmer_profile.state_hint'.tr(),
                    controller: _stateCtrl,
                    prefixIcon: Icons.flag_rounded,
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Required' : null,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: AppTextField(
                    label: 'farmer_profile.pincode'.tr(),
                    hint: 'farmer_profile.pincode_hint'.tr(),
                    controller: _pincodeCtrl,
                    prefixIcon: Icons.pin_drop_rounded,
                    keyboardType: TextInputType.number,
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) return 'Required';
                      if (v.trim().length != 6) return 'Invalid';
                      return null;
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
      );
    }

    return _CardContainer(
      child: Column(
        children: [
          _InfoTile(
            icon: Icons.location_city_rounded,
            label: 'farmer_profile.village'.tr(),
            value: _profile?.village ?? 'farmer_profile.not_set'.tr(),
          ),
          Divider(height: AppSpacing.xl, color: context.appColors.border),
          _InfoTile(
            icon: Icons.map_rounded,
            label: 'farmer_profile.district'.tr(),
            value: _profile?.district ?? 'farmer_profile.not_set'.tr(),
          ),
          Divider(height: AppSpacing.xl, color: context.appColors.border),
          Row(
            children: [
              Expanded(
                child: _InfoTile(
                  icon: Icons.flag_rounded,
                  label: 'farmer_profile.state'.tr(),
                  value: _profile?.state ?? 'farmer_profile.not_set'.tr(),
                ),
              ),
              const SizedBox(width: AppSpacing.lg),
              Expanded(
                child: _InfoTile(
                  icon: Icons.pin_drop_rounded,
                  label: 'farmer_profile.pincode'.tr(),
                  value: _profile?.pincode ?? 'farmer_profile.not_set'.tr(),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── Farm Details ───────────────────────────────────────

  Widget _buildFarmDetailsSection() {
    if (_isEditing) {
      return _CardContainer(
        child: Column(
          children: [
            AppTextField(
              label: 'farmer_profile.land_size'.tr(),
              hint: 'farmer_profile.land_size_hint'.tr(),
              controller: _landSizeCtrl,
              prefixIcon: Icons.landscape_rounded,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              validator: (v) {
                if (v != null && v.isNotEmpty) {
                  if (double.tryParse(v) == null) return 'Invalid number';
                }
                return null;
              },
            ),
            const SizedBox(height: AppSpacing.lg),

            // Soil Type Dropdown
            _DropdownField(
              label: 'farmer_profile.soil_type'.tr(),
              hint: 'farmer_profile.soil_type_hint'.tr(),
              icon: Icons.terrain_rounded,
              value: _selectedSoilType,
              items: _soilTypes,
              onChanged: (v) => setState(() => _selectedSoilType = v),
            ),
            const SizedBox(height: AppSpacing.lg),

            // Irrigation Type Dropdown
            _DropdownField(
              label: 'farmer_profile.irrigation_type'.tr(),
              hint: 'farmer_profile.irrigation_type_hint'.tr(),
              icon: Icons.water_drop_rounded,
              value: _selectedIrrigationType,
              items: _irrigationTypes,
              onChanged: (v) => setState(() => _selectedIrrigationType = v),
            ),
            const SizedBox(height: AppSpacing.lg),

            AppTextField(
              label: 'farmer_profile.crops'.tr(),
              hint: 'farmer_profile.crops_hint'.tr(),
              controller: _cropsCtrl,
              prefixIcon: Icons.grass_rounded,
              maxLines: 2,
            ),
          ],
        ),
      );
    }

    return _CardContainer(
      child: Column(
        children: [
          _InfoTile(
            icon: Icons.landscape_rounded,
            label: 'farmer_profile.land_size'.tr(),
            value: _profile?.landSize != null
                ? '${_profile!.landSize} ${_profile!.landUnit ?? 'acres'}'
                : 'farmer_profile.not_set'.tr(),
            valueColor: AppColors.success,
          ),
          Divider(height: AppSpacing.xl, color: context.appColors.border),
          _InfoTile(
            icon: Icons.terrain_rounded,
            label: 'farmer_profile.soil_type'.tr(),
            value: _profile?.soilType ?? 'farmer_profile.not_set'.tr(),
            valueColor: AppColors.warning,
          ),
          Divider(height: AppSpacing.xl, color: context.appColors.border),
          _InfoTile(
            icon: Icons.water_drop_rounded,
            label: 'farmer_profile.irrigation_type'.tr(),
            value:
                _profile?.irrigationType ?? 'farmer_profile.not_set'.tr(),
            valueColor: AppColors.info,
          ),
          Divider(height: AppSpacing.xl, color: context.appColors.border),
          _InfoTile(
            icon: Icons.grass_rounded,
            label: 'farmer_profile.crops'.tr(),
            value: _profile != null && _profile!.crops.isNotEmpty
                ? _profile!.crops.join(', ')
                : 'farmer_profile.not_set'.tr(),
            valueColor: AppColors.primary,
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// Private Widgets
// ═══════════════════════════════════════════════════════════════

class _ProfileHeader extends StatelessWidget {
  final String name;
  final String phone;
  final String initials;
  final bool isNew;

  const _ProfileHeader({
    required this.name,
    required this.phone,
    required this.initials,
    required this.isNew,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withValues(alpha: 0.2),
                blurRadius: 20,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: CircleAvatar(
            radius: 48,
            backgroundColor: AppColors.primary.withValues(alpha: 0.12),
            child: Text(
              initials,
              style: context.textTheme.headlineMedium?.copyWith(
                color: AppColors.primary,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        Text(
          name,
          style: context.textTheme.titleLarge
              ?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          phone,
          style: context.textTheme.bodyMedium
              ?.copyWith(color: context.appColors.textSecondary),
        ),
        if (isNew) ...[
          const SizedBox(height: AppSpacing.md),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.info.withValues(alpha: 0.1),
              borderRadius: AppRadius.fullAll,
              border: Border.all(color: AppColors.info.withValues(alpha: 0.3)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.info_outline_rounded,
                    size: 16, color: AppColors.info),
                const SizedBox(width: 6),
                Text(
                  'Create your farm profile',
                  style: context.textTheme.labelMedium?.copyWith(
                    color: AppColors.info,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final String title;

  const _SectionHeader({required this.icon, required this.title});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1),
            borderRadius: AppRadius.smAll,
          ),
          child: Icon(icon, size: 18, color: AppColors.primary),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Text(
            title,
            style: context.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: AppColors.primary,
            ),
          ),
        ),
      ],
    );
  }
}

class _CardContainer extends StatelessWidget {
  final Widget child;

  const _CardContainer({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: AppSpacing.allLg,
      decoration: BoxDecoration(
        color: context.appColors.card,
        borderRadius: AppRadius.mdAll,
        border: Border.all(color: context.appColors.border, width: 0.5),
      ),
      child: child,
    );
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  const _InfoTile({
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 20, color: valueColor ?? context.appColors.textSecondary),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: context.textTheme.bodySmall?.copyWith(
                  color: context.appColors.textSecondary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: context.textTheme.bodyLarge?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _DropdownField extends StatelessWidget {
  final String label;
  final String hint;
  final IconData icon;
  final String? value;
  final List<String> items;
  final ValueChanged<String?> onChanged;

  const _DropdownField({
    required this.label,
    required this.hint,
    required this.icon,
    required this.value,
    required this.items,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label, style: Theme.of(context).textTheme.labelMedium),
        const SizedBox(height: AppSpacing.xs),
        DropdownButtonFormField<String>(
          initialValue: value,
          hint: Text(hint),
          isExpanded: true,
          decoration: InputDecoration(
            prefixIcon: Icon(icon),
          ),
          items: items
              .map((s) => DropdownMenuItem(value: s, child: Text(s)))
              .toList(),
          onChanged: onChanged,
        ),
      ],
    );
  }
}
