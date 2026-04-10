import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';

class AddCropListingScreen extends StatefulWidget {
  const AddCropListingScreen({super.key});

  @override
  State<AddCropListingScreen> createState() => _AddCropListingScreenState();
}

class _AddCropListingScreenState extends State<AddCropListingScreen> {
  final _formKey = GlobalKey<FormState>();
  final _cropController = TextEditingController();
  final _quantityController = TextEditingController();
  final _priceController = TextEditingController();
  final _locationController = TextEditingController();
  final _qualityController = TextEditingController();
  String _unit = 'Quintal';

  @override
  void dispose() {
    _cropController.dispose();
    _quantityController.dispose();
    _priceController.dispose();
    _locationController.dispose();
    _qualityController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final cardColor = Colors.white.withValues(alpha: 0.56);
    final textColor = AppColors.lightText;
    final subColor = AppColors.lightTextSecondary;
    final iconBg = Colors.white.withValues(alpha: 0.56);

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? <Color>[AppColors.darkBackground, AppColors.darkSurface]
                : <Color>[AppColors.lightBackground, AppColors.lightSurface],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: <Widget>[
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 12, 24, 0),
                child: Row(
                  children: <Widget>[
                    _topAction(
                      icon: Icons.arrow_back_rounded,
                      color: AppColors.primaryDark,
                      background: iconBg,
                      onTap: () => Navigator.of(context).maybePop(),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Add Listing',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              color: textColor,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              _headerCard(cardColor: cardColor, textColor: textColor),
              const SizedBox(height: 12),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                  child: _glassCard(
                    cardColor: cardColor,
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          _label('Crop Name', subColor),
                          _input(_cropController, hint: 'e.g. Basmati Rice'),
                          const SizedBox(height: 12),
                          _label('Quantity', subColor),
                          Row(
                            children: <Widget>[
                              Expanded(
                                child: _input(
                                  _quantityController,
                                  hint: '0.00',
                                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.62),
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(color: Colors.white.withValues(alpha: 0.85)),
                                ),
                                child: DropdownButton<String>(
                                  value: _unit,
                                  underline: const SizedBox.shrink(),
                                  onChanged: (value) {
                                    setState(() {
                                      _unit = value ?? _unit;
                                    });
                                  },
                                  items: const <String>['Quintal', 'Kg', 'Ton']
                                      .map((u) => DropdownMenuItem<String>(
                                            value: u,
                                            child: Text(u),
                                          ))
                                      .toList(),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          _label('Expected Price (per unit)', subColor),
                          _input(
                            _priceController,
                            hint: '₹',
                            keyboardType: TextInputType.number,
                          ),
                          const SizedBox(height: 12),
                          _label('Location', subColor),
                          _input(_locationController, hint: 'Village, District, State'),
                          const SizedBox(height: 12),
                          _label('Variety & Quality Notes', subColor),
                          _input(
                            _qualityController,
                            hint: 'Add grain quality, moisture, grade, and any notes',
                            maxLines: 4,
                          ),
                          const SizedBox(height: 18),
                          SizedBox(
                            width: double.infinity,
                            height: 46,
                            child: ElevatedButton.icon(
                              onPressed: () {
                                if (_formKey.currentState?.validate() ?? false) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(
                                        'Listing draft saved. Backend save will be wired next.'
                                            .tr(),
                                      ),
                                    ),
                                  );
                                }
                              },
                              icon: const Icon(Icons.publish_rounded),
                              label: Text(
                                'Publish Listing'.tr(),
                                style: TextStyle(fontWeight: FontWeight.w700),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.white.withValues(alpha: 0.88),
                                foregroundColor: AppColors.lightText,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(40),
                                ),
                                side: BorderSide(color: Colors.white.withValues(alpha: 0.85)),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
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

  Widget _headerCard({required Color cardColor, required Color textColor}) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: <Color>[
            AppColors.primaryDark.withValues(alpha: 0.95),
            AppColors.primary.withValues(alpha: 0.85),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.45)),
      ),
      child: Row(
        children: <Widget>[
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.24),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.agriculture_rounded, color: Colors.white),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'List Your Harvest',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Use complete details for better buyer visibility.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.white.withValues(alpha: 0.9),
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _label(String text, Color subColor) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(
        text,
        style: TextStyle(color: subColor, fontWeight: FontWeight.w600),
      ),
    );
  }

  Widget _input(
    TextEditingController controller, {
    required String hint,
    TextInputType? keyboardType,
    int maxLines = 1,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      maxLines: maxLines,
      validator: (value) {
        if (value == null || value.trim().isEmpty) {
          return 'Required';
        }
        return null;
      },
      decoration: InputDecoration(
        filled: true,
        fillColor: Colors.white.withValues(alpha: 0.62),
        hintText: hint,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.85)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.85)),
        ),
      ),
    );
  }

  Widget _glassCard({required Color cardColor, required Widget child}) {
    return Container(
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.8), width: 1.2),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: AppColors.primaryDark.withValues(alpha: 0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: child,
      ),
    );
  }
}