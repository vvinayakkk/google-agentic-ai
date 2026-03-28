import 'dart:io';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../shared/services/agent_service.dart';
import '../../../shared/services/crop_service.dart';
import '../../../core/utils/extensions.dart';

// ── DESIGN SYSTEM CONSTANTS ────────────────────────────────
class AppColors {
  static const bgColor = Color(0xFFF2F5F0);
  static const primaryDark = Color(0xFF1B5E20);
  static const primaryGreen = Color(0xFF4CAF50);
  static const cardBg = Color(0xFFFFFFFF);
  static const tagGreenBg = Color(0xFFE8F5E9);
  static const tagGreenText = Color(0xFF2E7D32);
  static const textPrimary = Color(0xFF1A1A1A);
  static const textSecondary = Color(0xFF6B7280);
  static const divider = Color(0xFFEEEEEE);
  static const issueBg1 = Color(0xFFFFF8E1);
  static const issueBg2 = Color(0xFFE8F5E9);
  static const issueBg3 = Color(0xFFFFEBEE);
}

final cardDecor = BoxDecoration(
  color: AppColors.cardBg,
  borderRadius: BorderRadius.circular(14),
  boxShadow: [
    BoxShadow(
      color: Colors.black.withValues(alpha: 0.06),
      blurRadius: 10,
      offset: const Offset(0, 2),
    ),
  ],
);

// ── SCREEN 1: CropDoctorScreen ─────────────────────────────
class CropDoctorScreen extends ConsumerStatefulWidget {
  const CropDoctorScreen({super.key});

  @override
  ConsumerState<CropDoctorScreen> createState() => _CropDoctorScreenState();
}

class _CropDoctorScreenState extends ConsumerState<CropDoctorScreen> {
  final _descCtrl = TextEditingController();
  final _picker = ImagePicker();
  bool _isLoading = false;
  String? _selectedImagePath;

  @override
  void dispose() {
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final image = await _picker.pickImage(source: source, maxWidth: 1024);
      if (image != null && mounted) {
        setState(() => _selectedImagePath = image.path);
      }
    } catch (e) {
      if (mounted) {
        context.showSnack("Error picking image", isError: true);
      }
    }
  }

  void _analyzeSelectedImage() {
    if (_selectedImagePath != null) {
      _diagnoseWithImage(_selectedImagePath!);
    }
  }

  void _clearImage() {
    setState(() => _selectedImagePath = null);
  }

  Future<void> _diagnoseWithImage(String path) async {
    setState(() => _isLoading = true);
    try {
      final result = await ref.read(cropServiceProvider).detectDisease(path);
      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => DiagnosisResultScreen(
              diseaseName: result['disease_name'] ?? "Unknown Disease",
              scientificName: result['scientific_name'] ?? "N/A",
              confidencePercent: ((result['confidence'] ?? 0.0) * 100).toInt(),
              description: result['description'] ?? "No description available.",
              imageUrl: path,
              isLocalFile: true,
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        String msg = "Diagnosis failed";
        if (e.toString().contains('DioException') || e.toString().contains('SocketException')) {
          msg = "Cannot reach server. Please check your connection and try again.";
        }
        context.showSnack(msg, isError: true);
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _diagnoseBySymptoms() async {
    final symptoms = _descCtrl.text.trim();
    if (symptoms.isEmpty) {
      context.showSnack("Please describe the symptoms", isError: true);
      return;
    }
    setState(() => _isLoading = true);
    try {
      final response = await ref.read(agentServiceProvider).chat(
            message: "Diagnose crop disease from these symptoms: $symptoms.",
          );
      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => DiagnosisResultScreen(
              diseaseName: "Symptom Analysis",
              scientificName: "Based on description",
              confidencePercent: 85,
              description: response['response'] ?? "No analysis available.",
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) context.showSnack("Analysis failed: $e", isError: true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgColor,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Container(
              height: 56,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(bottom: BorderSide(color: AppColors.divider)),
              ),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back, color: AppColors.primaryDark),
                    onPressed: () => Navigator.pop(context),
                  ),
                  Expanded(
                    child: Center(
                      child: Text(
                        "Crop Doctor",
                        style: GoogleFonts.nunito(
                          fontWeight: FontWeight.bold,
                          fontSize: 17,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                  ),
                  const IconButton(
                    icon: Icon(Icons.camera_alt_outlined, color: AppColors.textSecondary, size: 22),
                    onPressed: null,
                  ),
                  const IconButton(
                    icon: Icon(Icons.history, color: AppColors.textSecondary, size: 22),
                    onPressed: null,
                  ),
                ],
              ),
            ),

            // Body
            Expanded(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Upload Card / Image Preview
                    _selectedImagePath == null
                        ? GestureDetector(
                            onTap: () => _pickImage(ImageSource.gallery),
                            child: CustomPaint(
                              painter: DashedBorderPainter(),
                              child: Container(
                                height: 140,
                                width: double.infinity,
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Container(
                                      width: 52,
                                      height: 52,
                                      decoration: BoxDecoration(
                                        color: AppColors.tagGreenBg,
                                        borderRadius: BorderRadius.circular(14),
                                      ),
                                      child: const Icon(Icons.local_florist_outlined, color: AppColors.primaryDark, size: 28),
                                    ),
                                    const SizedBox(height: 10),
                                    Text(
                                      "Upload Crop Photo",
                                      style: GoogleFonts.nunito(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      "Take a photo or choose from gallery",
                                      style: GoogleFonts.nunito(fontSize: 12, color: AppColors.textSecondary),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          )
                        : Stack(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(14),
                                child: Image.file(
                                  File(_selectedImagePath!),
                                  width: double.infinity,
                                  height: 200,
                                  fit: BoxFit.cover,
                                ),
                              ),
                              Positioned(
                                top: 8,
                                right: 8,
                                child: GestureDetector(
                                  onTap: _clearImage,
                                  child: Container(
                                    padding: const EdgeInsets.all(6),
                                    decoration: BoxDecoration(
                                      color: Colors.black.withValues(alpha: 0.5),
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(Icons.close, color: Colors.white, size: 18),
                                  ),
                                ),
                              ),
                              Positioned(
                                bottom: 0,
                                left: 0,
                                right: 0,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                  decoration: BoxDecoration(
                                    borderRadius: const BorderRadius.only(
                                      bottomLeft: Radius.circular(14),
                                      bottomRight: Radius.circular(14),
                                    ),
                                    gradient: LinearGradient(
                                      begin: Alignment.bottomCenter,
                                      end: Alignment.topCenter,
                                      colors: [Colors.black.withValues(alpha: 0.7), Colors.transparent],
                                    ),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.check_circle, color: AppColors.primaryGreen, size: 18),
                                      const SizedBox(width: 6),
                                      Expanded(
                                        child: Text(
                                          "Image selected — tap Analyze to diagnose",
                                          style: GoogleFonts.nunito(fontSize: 12, color: Colors.white, fontWeight: FontWeight.w600),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),

                    const SizedBox(height: 14),

                    // Camera / Gallery / Analyze Buttons
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => _pickImage(ImageSource.camera),
                            icon: const Icon(Icons.camera_alt_outlined, color: AppColors.primaryGreen, size: 16),
                            label: Text("CAMERA", style: GoogleFonts.nunito(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primaryGreen)),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: AppColors.primaryGreen, width: 1.5),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _selectedImagePath != null
                              ? ElevatedButton.icon(
                                  onPressed: _isLoading ? null : _analyzeSelectedImage,
                                  icon: _isLoading
                                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                      : const Icon(Icons.search, color: Colors.white, size: 16),
                                  label: Text(
                                    _isLoading ? "ANALYZING..." : "ANALYZE",
                                    style: GoogleFonts.nunito(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white),
                                  ),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primaryGreen,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    elevation: 0,
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                  ),
                                )
                              : ElevatedButton.icon(
                                  onPressed: () => _pickImage(ImageSource.gallery),
                                  icon: const Icon(Icons.photo_library_outlined, color: Colors.white, size: 16),
                                  label: Text("GALLERY", style: GoogleFonts.nunito(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white)),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primaryDark,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    elevation: 0,
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                  ),
                                ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 20),

                    // OR Divider
                    Row(
                      children: [
                        const Expanded(child: Divider(color: AppColors.divider, thickness: 1)),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          child: Text("or", style: GoogleFonts.nunito(fontSize: 13, color: AppColors.textSecondary)),
                        ),
                        const Expanded(child: Divider(color: AppColors.divider, thickness: 1)),
                      ],
                    ),

                    const SizedBox(height: 16),

                    // Describe Field
                    Container(
                      decoration: cardDecor,
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text("Describe what you see", style: GoogleFonts.nunito(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary)),
                          const SizedBox(height: 8),
                          Container(
                            decoration: BoxDecoration(color: AppColors.tagGreenBg, borderRadius: BorderRadius.circular(10)),
                            child: TextField(
                              controller: _descCtrl,
                              maxLines: 3,
                              minLines: 3,
                              style: GoogleFonts.nunito(fontSize: 13, color: AppColors.textPrimary),
                              decoration: InputDecoration(
                                hintText: "e.g. Yellow spots on leaves...",
                                hintStyle: GoogleFonts.nunito(fontStyle: FontStyle.italic, fontSize: 13, color: AppColors.textSecondary),
                                border: InputBorder.none,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                suffixIcon: const Padding(
                                  padding: EdgeInsets.only(bottom: 8),
                                  child: Icon(Icons.mic, color: AppColors.primaryGreen, size: 22),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Common Issues
                    Text("Common Issues", style: GoogleFonts.nunito(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary)),
                    const SizedBox(height: 12),
                    GridView.count(
                      physics: const NeverScrollableScrollPhysics(),
                      shrinkWrap: true,
                      crossAxisCount: 2,
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                      childAspectRatio: 1.35,
                      children: const [
                        _IssueTile(icon: "🟡", label: "Leaf Yellowing", description: "Nutrient deficiency or overwatering", bgColor: AppColors.issueBg1),
                        _IssueTile(icon: "🟤", label: "Brown Spots", description: "Fungal infection signs", bgColor: AppColors.issueBg2),
                        _IssueTile(icon: "🔴", label: "Wilting", description: "Root disease or heat stress", bgColor: AppColors.issueBg3),
                        _IssueTile(icon: "⬜", label: "White Powder", description: "Powdery mildew indicator", bgColor: AppColors.cardBg),
                        _IssueTile(icon: "🐛", label: "Pest Damage", description: "Insect bites & leaf curling", bgColor: AppColors.issueBg1),
                        _IssueTile(icon: "🟢", label: "Root Rot", description: "Overwatering or fungal cause", bgColor: AppColors.issueBg2),
                      ],
                    ),

                    const SizedBox(height: 20),

                    // Floating Input
                    GestureDetector(
                      onTap: _diagnoseBySymptoms,
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(30),
                          boxShadow: [
                            BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 12, offset: const Offset(0, 2)),
                          ],
                          border: Border.all(color: AppColors.divider),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.add, color: AppColors.textSecondary, size: 20),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text("Ask about your crop...", style: GoogleFonts.nunito(fontSize: 13, color: AppColors.textSecondary)),
                            ),
                            Container(
                              width: 36,
                              height: 36,
                              decoration: const BoxDecoration(color: AppColors.primaryGreen, shape: BoxShape.circle),
                              child: _isLoading
                                  ? const Padding(
                                      padding: EdgeInsets.all(8.0),
                                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                    )
                                  : const Icon(Icons.arrow_upward, color: Colors.white, size: 18),
                            ),
                          ],
                        ),
                      ),
                    ),
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

class _IssueTile extends StatelessWidget {
  final String icon;
  final String label;
  final String description;
  final Color bgColor;

  const _IssueTile({required this.icon, required this.label, required this.description, required this.bgColor});

  void _openGoogleSearch() async {
    final query = Uri.encodeComponent('$label crop disease');
    final url = Uri.parse('https://www.google.com/search?q=$query');
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _openGoogleSearch,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.divider),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(icon, style: const TextStyle(fontSize: 22)),
                const Spacer(),
                const Icon(Icons.open_in_new, color: AppColors.textSecondary, size: 14),
              ],
            ),
            const Spacer(),
            Text(label, style: GoogleFonts.nunito(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
            const SizedBox(height: 2),
            Text(description, style: GoogleFonts.nunito(fontSize: 11, color: AppColors.textSecondary, height: 1.3), maxLines: 2, overflow: TextOverflow.ellipsis),
          ],
        ),
      ),
    );
  }
}

// ── SCREEN 2: DiagnosisResultScreen ────────────────────────
class DiagnosisResultScreen extends StatefulWidget {
  final String diseaseName;
  final String scientificName;
  final int confidencePercent;
  final String description;
  final String? imageUrl;
  final bool isLocalFile;

  const DiagnosisResultScreen({
    super.key,
    required this.diseaseName,
    required this.scientificName,
    required this.confidencePercent,
    required this.description,
    this.imageUrl,
    this.isLocalFile = false,
  });

  @override
  State<DiagnosisResultScreen> createState() => _DiagnosisResultScreenState();
}

class _DiagnosisResultScreenState extends State<DiagnosisResultScreen> with TickerProviderStateMixin {
  late final AnimationController _cardController;
  late final Animation<Offset> _cardSlideAnimation;
  late final Animation<double> _cardOpacityAnimation;

  @override
  void initState() {
    super.initState();
    _cardController = AnimationController(vsync: this, duration: const Duration(milliseconds: 350));
    _cardSlideAnimation = Tween<Offset>(begin: const Offset(0, 0.1), end: Offset.zero).animate(CurvedAnimation(parent: _cardController, curve: Curves.easeOut));
    _cardOpacityAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(CurvedAnimation(parent: _cardController, curve: Curves.easeOut));
    _cardController.forward();
  }

  @override
  void dispose() {
    _cardController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    Color badgeBg;
    Color badgeText;
    if (widget.confidencePercent >= 85) {
      badgeBg = AppColors.tagGreenBg;
      badgeText = AppColors.tagGreenText;
    } else if (widget.confidencePercent >= 60) {
      badgeBg = AppColors.issueBg1;
      badgeText = Colors.amber.shade900;
    } else {
      badgeBg = AppColors.issueBg3;
      badgeText = Colors.red.shade900;
    }

    return Scaffold(
      backgroundColor: AppColors.bgColor,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Container(
              height: 56,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(bottom: BorderSide(color: AppColors.divider)),
              ),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back, color: AppColors.primaryDark),
                    onPressed: () => Navigator.pop(context),
                  ),
                  Expanded(
                    child: Center(
                      child: Text(
                        "Diagnosis Results",
                        style: GoogleFonts.nunito(fontWeight: FontWeight.bold, fontSize: 17, color: AppColors.textPrimary),
                      ),
                    ),
                  ),
                  const SizedBox(width: 40),
                ],
              ),
            ),

            // Body
            Expanded(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Hero Image
                    Stack(
                      children: [
                        widget.imageUrl != null
                            ? (widget.isLocalFile
                                ? Image.file(File(widget.imageUrl!), width: double.infinity, height: 200, fit: BoxFit.cover)
                                : Image.network(
                                    widget.imageUrl!,
                                    width: double.infinity,
                                    height: 200,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => Container(color: AppColors.tagGreenBg, child: const Icon(Icons.grass, color: AppColors.primaryGreen, size: 40)),
                                  ))
                            : Image.network(
                                "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600",
                                width: double.infinity,
                                height: 200,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => Container(color: AppColors.tagGreenBg, height: 200, width: double.infinity, child: const Icon(Icons.grass, color: AppColors.primaryGreen, size: 40)),
                              ),
                        Positioned(
                          bottom: 0,
                          left: 0,
                          right: 0,
                          child: Container(
                            height: 80,
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.bottomCenter,
                                end: Alignment.topCenter,
                                colors: [Colors.black.withValues(alpha: 0.7), Colors.transparent],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),

                    // Disease Card
                    AnimatedBuilder(
                      animation: _cardController,
                      builder: (context, child) => FadeTransition(
                        opacity: _cardOpacityAnimation,
                        child: SlideTransition(
                          position: _cardSlideAnimation,
                          child: child,
                        ),
                      ),
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 16).copyWith(top: -24),
                        decoration: cardDecor,
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(widget.diseaseName, style: GoogleFonts.nunito(fontWeight: FontWeight.w800, fontSize: 22, color: AppColors.textPrimary)),
                            const SizedBox(height: 2),
                            Text("(${widget.scientificName})", style: GoogleFonts.nunito(fontStyle: FontStyle.italic, fontSize: 13, color: AppColors.textSecondary)),
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(color: badgeBg, borderRadius: BorderRadius.circular(20)),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.primaryGreen, shape: BoxShape.circle)),
                                  const SizedBox(width: 6),
                                  Text("${widget.confidencePercent}% CONFIDENCE", style: GoogleFonts.nunito(fontWeight: FontWeight.bold, fontSize: 12, color: badgeText, letterSpacing: 0.5)),
                                ],
                              ),
                            ),
                            const SizedBox(height: 12),
                            Text(widget.description, style: GoogleFonts.nunito(fontSize: 13, color: AppColors.textSecondary, height: 1.5)),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Treatments
                    Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: Text("Recommended Treatments", style: GoogleFonts.nunito(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primaryDark))),
                    const SizedBox(height: 12),
                    const _TreatmentCard(
                      icon: Icons.eco_outlined,
                      iconBg: Color(0xFFE8F5E9),
                      iconColor: AppColors.primaryDark,
                      title: "Fungicide Application",
                      body: "Apply Tebuconazole or Propiconazole based fungicide at the first sign of pustules.",
                    ),
                    const SizedBox(height: 10),
                    const _TreatmentCard(
                      icon: Icons.water_drop_outlined,
                      iconBg: Color(0xFFE3F2FD),
                      iconColor: Color(0xFF1565C0),
                      title: "Irrigation Management",
                      body: "Avoid overhead irrigation to reduce leaf moisture, which encourages fungal growth.",
                    ),
                    const SizedBox(height: 10),
                    const _TreatmentCard(
                      icon: Icons.cleaning_services_outlined,
                      iconBg: Color(0xFFFFEBEE),
                      iconColor: Color(0xFFC62828),
                      title: "Field Cleanup",
                      body: "Remove and destroy heavily infected plants or crop debris to limit spreading.",
                    ),

                    const SizedBox(height: 24),

                    // Prevention
                    Container(
                      margin: const EdgeInsets.symmetric(horizontal: 16),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.tagGreenBg,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.primaryGreen.withValues(alpha: 0.3), width: 1),
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.shield_outlined, color: AppColors.primaryDark, size: 20),
                              const SizedBox(width: 8),
                              Text("Prevention for Next Season", style: GoogleFonts.nunito(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primaryDark)),
                            ],
                          ),
                          const SizedBox(height: 12),
                          const _PreventionBullet(icon: Icons.check_circle_outline, iconColor: AppColors.primaryGreen, text: "Use certified rust-resistant wheat varieties suitable for your region."),
                          const SizedBox(height: 8),
                          const _PreventionBullet(icon: Icons.rotate_right, iconColor: Color(0xFF1565C0), text: "Ensure proper crop rotation, avoiding continuous wheat cultivation."),
                          const SizedBox(height: 8),
                          const _PreventionBullet(icon: Icons.visibility_outlined, iconColor: Colors.amber, text: "Monitor fields early in the season, especially during humid weather."),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Action Bar
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: AppColors.divider))),
                      child: Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () {},
                              icon: const Icon(Icons.headset_mic_outlined, color: AppColors.primaryDark, size: 18),
                              label: Text("TALK TO EXPERT", style: GoogleFonts.nunito(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primaryDark)),
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: AppColors.primaryDark, width: 1.5),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                padding: const EdgeInsets.symmetric(vertical: 14),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () {},
                              icon: const Icon(Icons.shopping_cart_outlined, color: Colors.white, size: 18),
                              label: Text("BUY REMEDIES", style: GoogleFonts.nunito(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primaryDark,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                elevation: 2,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
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

class _TreatmentCard extends StatelessWidget {
  final IconData icon;
  final Color iconBg;
  final Color iconColor;
  final String title;
  final String body;

  const _TreatmentCard({required this.icon, required this.iconBg, required this.iconColor, required this.title, required this.body});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(14),
      decoration: cardDecor,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(color: iconBg, borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: iconColor, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: GoogleFonts.nunito(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary)),
                const SizedBox(height: 4),
                Text(body, style: GoogleFonts.nunito(fontSize: 13, color: AppColors.textSecondary, height: 1.5)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PreventionBullet extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String text;

  const _PreventionBullet({required this.icon, required this.iconColor, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: iconColor, size: 18),
        const SizedBox(width: 8),
        Expanded(child: Text(text, style: GoogleFonts.nunito(fontSize: 13, color: AppColors.textPrimary, height: 1.5))),
      ],
    );
  }
}

// ── CUSTOM PAINTERS ────────────────────────────────────────
class DashedBorderPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.primaryGreen
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    final path = Path()
      ..addRRect(RRect.fromRectAndRadius(Rect.fromLTWH(0, 0, size.width, size.height), const Radius.circular(14)));

    const dashWidth = 6.0;
    const dashGap = 4.0;

    final List<PathMetric> metrics = path.computeMetrics().toList();
    for (final metric in metrics) {
      double distance = 0;
      while (distance < metric.length) {
        final length = dashWidth;
        final dashPath = metric.extractPath(distance, distance + length);
        canvas.drawPath(dashPath, paint);
        distance += length + dashGap;
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
