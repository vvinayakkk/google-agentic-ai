import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../constants.dart';
import '../widgets/market_widgets.dart';

class AddCropListingScreen extends StatefulWidget {
  const AddCropListingScreen({super.key});

  @override
  State<AddCropListingScreen> createState() => _AddCropListingScreenState();
}

class _AddCropListingScreenState extends State<AddCropListingScreen> {
  int _selectedCrop = 1;
  final TextEditingController _quantityCtrl = TextEditingController();
  final TextEditingController _priceCtrl = TextEditingController();
  final TextEditingController _varietyCtrl = TextEditingController();
  String _unit = 'Quintals';

  @override
  void dispose() {
    _quantityCtrl.dispose();
    _priceCtrl.dispose();
    _varietyCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: MarketColors.bgColor,
      body: SafeArea(
        child: Column(
          children: [
            Container(
              height: 56,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(
                  bottom: BorderSide(color: Color(0xFFF0F0F0), width: 1),
                ),
              ),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () => Navigator.of(context).maybePop(),
                    child: const Icon(
                      Icons.arrow_back,
                      color: MarketColors.primaryDark,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Center(
                      child: Text(
                        'Add Crop Listing',
                        style: GoogleFonts.nunito(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: MarketColors.textPrimary,
                        ),
                      ),
                    ),
                  ),
                  Container(
                    width: 30,
                    height: 30,
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: MarketColors.primaryGreen,
                        width: 1.5,
                      ),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.help_outline,
                      color: MarketColors.primaryGreen,
                      size: 18,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      height: 180,
                      child: Stack(
                        children: [
                          Container(
                            width: double.infinity,
                            decoration: const BoxDecoration(
                              gradient: LinearGradient(
                                colors: [Color(0xFF1a2e0a), Color(0xFF2d4a1a)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                            ),
                          ),
                          Positioned(
                            left: 16,
                            bottom: 16,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const _BadgePill(text: 'NEW ENTRY'),
                                const SizedBox(height: 8),
                                Text(
                                  'List Your Harvest',
                                  style: GoogleFonts.playfairDisplay(
                                    fontSize: 26,
                                    fontStyle: FontStyle.italic,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.white,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text(
                        'Select Crop',
                        style: MarketTextStyles.label.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          CropChip(
                            emoji: '🌾',
                            label: 'WHEAT',
                            selected: _selectedCrop == 0,
                            onTap: () => setState(() => _selectedCrop = 0),
                          ),
                          const SizedBox(width: 10),
                          CropChip(
                            emoji: '🌾',
                            label: 'RICE',
                            selected: _selectedCrop == 1,
                            onTap: () => setState(() => _selectedCrop = 1),
                          ),
                          const SizedBox(width: 10),
                          CropChip(
                            emoji: '🌽',
                            label: 'CORN',
                            selected: _selectedCrop == 2,
                            onTap: () => setState(() => _selectedCrop = 2),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text(
                        'Total Quantity',
                        style: MarketTextStyles.label.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Row(
                        children: [
                          Expanded(
                            child: Container(
                              height: 52,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: const Color(0xFFE0E0E0),
                                ),
                              ),
                              child: TextField(
                                controller: _quantityCtrl,
                                keyboardType:
                                    const TextInputType.numberWithOptions(
                                      decimal: true,
                                    ),
                                style: GoogleFonts.nunito(
                                  fontSize: 20,
                                  color: const Color(0xFF4B5563),
                                  fontStyle: FontStyle.italic,
                                  fontFeatures: const [
                                    FontFeature.tabularFigures(),
                                  ],
                                ),
                                decoration: InputDecoration(
                                  hintText: '0.00',
                                  hintStyle: GoogleFonts.nunito(
                                    fontSize: 20,
                                    color: const Color(0xFF9CA3AF),
                                    fontStyle: FontStyle.italic,
                                  ),
                                  border: InputBorder.none,
                                  contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 16,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Container(
                            height: 52,
                            padding: const EdgeInsets.symmetric(horizontal: 14),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: const Color(0xFFE0E0E0),
                              ),
                            ),
                            child: DropdownButton<String>(
                              value: _unit,
                              underline: const SizedBox.shrink(),
                              icon: const Icon(
                                Icons.keyboard_arrow_down,
                                color: MarketColors.textSecondary,
                              ),
                              style: GoogleFonts.nunito(
                                fontSize: 14,
                                color: MarketColors.textPrimary,
                              ),
                              onChanged: (v) =>
                                  setState(() => _unit = v ?? _unit),
                              items: const [
                                DropdownMenuItem(
                                  value: 'Quintals',
                                  child: Text('Quintals'),
                                ),
                                DropdownMenuItem(
                                  value: 'Kg',
                                  child: Text('Kg'),
                                ),
                                DropdownMenuItem(
                                  value: 'Tonnes',
                                  child: Text('Tonnes'),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text(
                        'Expected Price',
                        style: MarketTextStyles.label.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Container(
                        height: 52,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE0E0E0)),
                        ),
                        child: TextField(
                          controller: _priceCtrl,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            prefixIcon: Padding(
                              padding: const EdgeInsets.only(
                                left: 14,
                                right: 8,
                                top: 16,
                              ),
                              child: Text(
                                '₹',
                                style: GoogleFonts.nunito(
                                  fontSize: 16,
                                  color: MarketColors.textSecondary,
                                ),
                              ),
                            ),
                            prefixIconConstraints: const BoxConstraints(
                              minWidth: 0,
                              minHeight: 0,
                            ),
                            hintText: 'Price per unit',
                            hintStyle: GoogleFonts.nunito(
                              fontSize: 14,
                              color: const Color(0xFF9CA3AF),
                              fontStyle: FontStyle.italic,
                            ),
                            border: InputBorder.none,
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 14,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const MarketRefBadge(
                      crop: 'RICE (BASMATI)',
                      price: '₹2,840 / quintal',
                      delta: '▲+4.2%',
                    ),
                    const SizedBox(height: 16),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text(
                        'Variety & Quality',
                        style: MarketTextStyles.label.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE0E0E0)),
                        ),
                        child: TextField(
                          controller: _varietyCtrl,
                          maxLines: 3,
                          minLines: 3,
                          decoration: InputDecoration(
                            hintText:
                                'Describe the variety (e.g. Basmati, Sharbati) and grain quality...',
                            hintStyle: GoogleFonts.nunito(
                              fontSize: 13,
                              color: const Color(0xFF9CA3AF),
                              fontStyle: FontStyle.italic,
                            ),
                            border: InputBorder.none,
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 14,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text(
                        'Add Crop Photos',
                        style: MarketTextStyles.label.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Row(
                        children: [
                          Container(
                            width: 72,
                            height: 72,
                            decoration: BoxDecoration(
                              border: Border.all(
                                color: const Color(0xFFBDBDBD),
                                width: 1.5,
                              ),
                              borderRadius: BorderRadius.circular(36),
                            ),
                            child: const Center(
                              child: Icon(
                                Icons.camera_alt_outlined,
                                color: Color(0xFFBDBDBD),
                                size: 28,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Container(
                            width: 72,
                            height: 72,
                            decoration: BoxDecoration(
                              border: Border.all(
                                color: MarketColors.primaryGreen,
                                width: 2,
                              ),
                              borderRadius: BorderRadius.circular(36),
                              image: const DecorationImage(
                                image: NetworkImage(
                                  'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200',
                                ),
                                fit: BoxFit.cover,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: PrimaryButton(
                        label: '🌿  List My Harvest',
                        onPressed: () {},
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BadgePill extends StatelessWidget {
  const _BadgePill({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: MarketDecorations.pill(Colors.white.withOpacity(0.15)),
      child: Text(
        text,
        style: GoogleFonts.nunito(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: Colors.white,
          letterSpacing: 1.2,
        ),
      ),
    );
  }
}
