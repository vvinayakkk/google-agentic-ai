import 'dart:io';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/services/agent_service.dart';
import '../../../shared/services/crop_service.dart';

class CropDoctorScreen extends ConsumerStatefulWidget {
  const CropDoctorScreen({super.key});

  @override
  ConsumerState<CropDoctorScreen> createState() => _CropDoctorScreenState();
}

class _CropDoctorScreenState extends ConsumerState<CropDoctorScreen> {
  final TextEditingController _descCtrl = TextEditingController();
  final ImagePicker _picker = ImagePicker();

  bool _isLoading = false;
  bool _aiExpanded = false;
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
    } catch (_) {
      if (mounted) {
        context.showSnack('Unable to pick image', isError: true);
      }
    }
  }

  void _clearImage() {
    setState(() => _selectedImagePath = null);
  }

  Future<void> _diagnoseWithImage() async {
    if (_selectedImagePath == null) return;

    setState(() => _isLoading = true);
    try {
      final result = await ref.read(cropServiceProvider).detectDisease(_selectedImagePath!);
      if (!mounted) return;

      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => DiagnosisResultScreen(
            diseaseName: result['disease_name']?.toString() ?? 'Unknown Disease',
            scientificName: result['scientific_name']?.toString() ?? 'N/A',
            confidencePercent: ((result['confidence'] ?? 0.0) * 100).toInt(),
            description: result['description']?.toString() ?? 'No description available.',
            imageUrl: _selectedImagePath,
            isLocalFile: true,
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      var message = 'Diagnosis failed. Please try again.';
      final raw = e.toString().toLowerCase();
      if (raw.contains('dioexception') || raw.contains('socketexception')) {
        message = 'Cannot reach server. Please check connection and retry.';
      }
      context.showSnack(message, isError: true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _diagnoseBySymptoms() async {
    final symptoms = _descCtrl.text.trim();
    if (symptoms.isEmpty) {
      context.showSnack('Please describe crop symptoms first', isError: true);
      return;
    }

    setState(() => _isLoading = true);
    try {
      final response = await ref.read(agentServiceProvider).chat(
            message: 'Diagnose crop disease from these symptoms: $symptoms.',
          );
      if (!mounted) return;

      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => DiagnosisResultScreen(
            diseaseName: 'Symptom Analysis',
            scientificName: 'Description-based diagnosis',
            confidencePercent: 85,
            description: response['response']?.toString() ?? 'No analysis available.',
          ),
        ),
      );
    } catch (e) {
      if (mounted) {
        context.showSnack('Analysis failed: $e', isError: true);
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
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
          bottom: false,
          child: Column(
            children: <Widget>[
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 12, 24, 0),
                child: SizedBox(
                  height: 48,
                  child: Stack(
                    alignment: Alignment.center,
                    children: <Widget>[
                      Align(
                        alignment: Alignment.centerLeft,
                        child: _topAction(
                          icon: Icons.arrow_back_rounded,
                          color: AppColors.primaryDark,
                          background: iconBg,
                          onTap: () => Navigator.of(context).maybePop(),
                        ),
                      ),
                      Text(
                        'Crop Doctor',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              color: textColor,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      Align(
                        alignment: Alignment.centerRight,
                        child: _topAction(
                          icon: Icons.refresh_rounded,
                          color: AppColors.primaryDark,
                          background: iconBg,
                          onTap: () {
                            setState(() {
                              _selectedImagePath = null;
                              _descCtrl.clear();
                            });
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),
              _aiOverviewCard(cardColor: cardColor, textColor: textColor),
              const SizedBox(height: 14),
              Expanded(
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 100),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      _imageCard(cardColor: cardColor, textColor: textColor, subColor: subColor),
                      const SizedBox(height: 12),
                      Row(
                        children: <Widget>[
                          Expanded(
                            child: SizedBox(
                              height: 44,
                              child: ElevatedButton.icon(
                                onPressed: _isLoading ? null : () => _pickImage(ImageSource.camera),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.white.withValues(alpha: 0.88),
                                  foregroundColor: AppColors.lightText,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(40),
                                  ),
                                  side: BorderSide(color: Colors.white.withValues(alpha: 0.85)),
                                ),
                                icon: const Icon(Icons.camera_alt_outlined),
                                label: const Text(
                                  'Camera',
                                  style: TextStyle(fontWeight: FontWeight.w700),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: SizedBox(
                              height: 44,
                              child: ElevatedButton.icon(
                                onPressed: _isLoading
                                    ? null
                                    : (_selectedImagePath == null
                                        ? () => _pickImage(ImageSource.gallery)
                                        : _diagnoseWithImage),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primaryDark,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(40),
                                  ),
                                ),
                                icon: _isLoading
                                    ? const SizedBox(
                                        width: 14,
                                        height: 14,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      )
                                    : Icon(
                                        _selectedImagePath == null
                                            ? Icons.photo_library_outlined
                                            : Icons.search,
                                      ),
                                label: Text(
                                  _isLoading
                                      ? 'Analyzing...'
                                      : (_selectedImagePath == null ? 'Gallery' : 'Analyze Image'),
                                  style: const TextStyle(fontWeight: FontWeight.w700),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      Row(
                        children: <Widget>[
                          Expanded(child: Divider(color: Colors.white.withValues(alpha: 0.8))),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            child: Text('or', style: TextStyle(color: subColor, fontWeight: FontWeight.w600)),
                          ),
                          Expanded(child: Divider(color: Colors.white.withValues(alpha: 0.8))),
                        ],
                      ),
                      const SizedBox(height: 14),
                      _glassCard(
                        cardColor: cardColor,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            Text(
                              'Describe what you see',
                              style: TextStyle(
                                color: textColor,
                                fontWeight: FontWeight.w700,
                                fontSize: 15,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Container(
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.62),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: Colors.white.withValues(alpha: 0.86)),
                              ),
                              child: TextField(
                                controller: _descCtrl,
                                minLines: 4,
                                maxLines: 4,
                                style: TextStyle(color: textColor),
                                decoration: InputDecoration(
                                  hintText: 'e.g. yellow patches, leaf curling, brown spots near edges',
                                  hintStyle: TextStyle(color: subColor),
                                  border: InputBorder.none,
                                  contentPadding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            SizedBox(
                              width: double.infinity,
                              height: 44,
                              child: ElevatedButton.icon(
                                onPressed: _isLoading ? null : _diagnoseBySymptoms,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.white.withValues(alpha: 0.88),
                                  foregroundColor: AppColors.lightText,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(40),
                                  ),
                                  side: BorderSide(color: Colors.white.withValues(alpha: 0.85)),
                                ),
                                icon: _isLoading
                                    ? const SizedBox(
                                        width: 14,
                                        height: 14,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: AppColors.primaryDark,
                                        ),
                                      )
                                    : const Icon(Icons.auto_awesome),
                                label: const Text(
                                  'Analyze Symptoms',
                                  style: TextStyle(fontWeight: FontWeight.w700),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Common Issues',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              color: textColor,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      const SizedBox(height: 10),
                      GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _issues.length,
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          crossAxisSpacing: 10,
                          mainAxisSpacing: 10,
                          childAspectRatio: 1.25,
                        ),
                        itemBuilder: (_, index) {
                          final issue = _issues[index];
                          return _IssueTile(issue: issue, cardColor: cardColor, textColor: textColor, subColor: subColor);
                        },
                      ),
                    ],
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

  Widget _aiOverviewCard({required Color cardColor, required Color textColor}) {
    const summary =
        'As of March 2026, crop stress patterns suggest fungal pressure in humid belts and nutrient stress in late-irrigation pockets. '
        'Use image diagnosis early and compare with field symptoms before treatment.';
    const full =
        'As of March 2026, crop stress patterns suggest fungal pressure in humid belts and nutrient stress in late-irrigation pockets. '
        'Use image diagnosis early and compare with field symptoms before treatment. '
        'If lesions are spreading fast, isolate affected patches and avoid broad spraying before confirmation. '
        'Track new symptoms over 48 hours and prioritize disease-specific treatment only after confidence is reasonable.';

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.5), width: 1),
        color: cardColor,
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: AppColors.primaryDark.withValues(alpha: 0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.18),
            blurRadius: 24,
            spreadRadius: 1,
          ),
          BoxShadow(
            color: Colors.white.withValues(alpha: 0.25),
            blurRadius: 6,
            spreadRadius: -2,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Stack(
        children: <Widget>[
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                children: <Widget>[
                  Icon(
                    Icons.auto_awesome,
                    color: AppColors.primaryDark.withValues(alpha: 0.8),
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'AI Overview',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: textColor,
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                _aiExpanded ? full : summary,
                maxLines: _aiExpanded ? null : 3,
                overflow: _aiExpanded ? TextOverflow.visible : TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: textColor,
                      height: 1.35,
                    ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 40,
                child: ElevatedButton(
                  onPressed: () {
                    setState(() {
                      _aiExpanded = !_aiExpanded;
                    });
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white.withValues(alpha: 0.7),
                    foregroundColor: textColor,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(30),
                    ),
                    side: BorderSide(color: Colors.white.withValues(alpha: 0.85)),
                    elevation: 0,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: <Widget>[
                      Text(
                        _aiExpanded ? 'Show less' : 'Show more',
                        style: TextStyle(
                          color: textColor,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Icon(
                        _aiExpanded
                            ? Icons.keyboard_arrow_up_rounded
                            : Icons.chevron_right_rounded,
                        size: 18,
                        color: textColor,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _imageCard({
    required Color cardColor,
    required Color textColor,
    required Color subColor,
  }) {
    if (_selectedImagePath == null) {
      return _glassCard(
        cardColor: cardColor,
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () => _pickImage(ImageSource.gallery),
          child: CustomPaint(
            painter: DashedBorderPainter(),
            child: SizedBox(
              width: double.infinity,
              height: 170,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: <Widget>[
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.72),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(Icons.local_florist_outlined, color: AppColors.primaryDark, size: 28),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Upload crop photo',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                      color: textColor,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Take a photo or choose from gallery',
                    style: TextStyle(fontSize: 12, color: subColor),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return _glassCard(
      cardColor: cardColor,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: Stack(
          children: <Widget>[
            Image.file(
              File(_selectedImagePath!),
              width: double.infinity,
              height: 220,
              fit: BoxFit.cover,
            ),
            Positioned(
              top: 8,
              right: 8,
              child: InkWell(
                onTap: _clearImage,
                borderRadius: BorderRadius.circular(999),
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.45),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.close, size: 18, color: Colors.white),
                ),
              ),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                    colors: <Color>[Colors.black.withValues(alpha: 0.65), Colors.transparent],
                  ),
                ),
                child: const Text(
                  'Image selected. Tap Analyze Image to diagnose.',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 12),
                ),
              ),
            ),
          ],
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

class _IssueSuggestion {
  final IconData icon;
  final String label;
  final String description;

  const _IssueSuggestion({
    required this.icon,
    required this.label,
    required this.description,
  });
}

const List<_IssueSuggestion> _issues = <_IssueSuggestion>[
  _IssueSuggestion(
    icon: Icons.wb_sunny_outlined,
    label: 'Leaf Yellowing',
    description: 'Nutrient deficiency or overwatering',
  ),
  _IssueSuggestion(
    icon: Icons.blur_on_outlined,
    label: 'Brown Spots',
    description: 'Possible fungal infection signs',
  ),
  _IssueSuggestion(
    icon: Icons.water_damage_outlined,
    label: 'Wilting',
    description: 'Heat stress or root disease',
  ),
  _IssueSuggestion(
    icon: Icons.cloud_outlined,
    label: 'White Powder',
    description: 'Common powdery mildew indicator',
  ),
  _IssueSuggestion(
    icon: Icons.bug_report_outlined,
    label: 'Pest Damage',
    description: 'Leaf bites and curling patterns',
  ),
  _IssueSuggestion(
    icon: Icons.grass_outlined,
    label: 'Root Rot',
    description: 'Often linked to excess moisture',
  ),
];

class _IssueTile extends StatelessWidget {
  final _IssueSuggestion issue;
  final Color cardColor;
  final Color textColor;
  final Color subColor;

  const _IssueTile({
    required this.issue,
    required this.cardColor,
    required this.textColor,
    required this.subColor,
  });

  Future<void> _openSearch() async {
    final query = Uri.encodeComponent('${issue.label} crop disease treatment');
    final url = Uri.parse('https://www.google.com/search?q=$query');
    await launchUrl(url, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: _openSearch,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: cardColor,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withValues(alpha: 0.8)),
          boxShadow: <BoxShadow>[
            BoxShadow(
              color: AppColors.primaryDark.withValues(alpha: 0.06),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                Icon(issue.icon, color: AppColors.primaryDark, size: 20),
                const Spacer(),
                Icon(Icons.open_in_new, color: subColor, size: 14),
              ],
            ),
            const Spacer(),
            Text(
              issue.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: textColor, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            Text(
              issue.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: subColor, fontSize: 12, height: 1.3),
            ),
          ],
        ),
      ),
    );
  }
}

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

class _DiagnosisResultScreenState extends State<DiagnosisResultScreen>
    with TickerProviderStateMixin {
  late final AnimationController _cardController;
  late final Animation<Offset> _cardSlideAnimation;
  late final Animation<double> _cardOpacityAnimation;

  @override
  void initState() {
    super.initState();
    _cardController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 350),
    );
    _cardSlideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.1),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(parent: _cardController, curve: Curves.easeOut),
    );
    _cardOpacityAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _cardController, curve: Curves.easeOut),
    );
    _cardController.forward();
  }

  @override
  void dispose() {
    _cardController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final cardColor = Colors.white.withValues(alpha: 0.56);
    final textColor = AppColors.lightText;
    final subColor = AppColors.lightTextSecondary;

    final confidenceMeta = _confidenceStyle(widget.confidencePercent);

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
          bottom: false,
          child: Column(
            children: <Widget>[
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 12, 24, 0),
                child: Row(
                  children: <Widget>[
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.56),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.8)),
                      ),
                      child: IconButton(
                        onPressed: () => Navigator.of(context).maybePop(),
                        icon: const Icon(Icons.arrow_back_rounded, color: AppColors.primaryDark, size: 20),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Diagnosis Result',
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
              Expanded(
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 100),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      if (widget.imageUrl != null)
                        _resultCard(
                          cardColor: cardColor,
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(14),
                            child: widget.isLocalFile
                                ? Image.file(
                                    File(widget.imageUrl!),
                                    width: double.infinity,
                                    height: 210,
                                    fit: BoxFit.cover,
                                  )
                                : Image.network(
                                    widget.imageUrl!,
                                    width: double.infinity,
                                    height: 210,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, error, stackTrace) => Container(
                                      color: Colors.white.withValues(alpha: 0.62),
                                      height: 210,
                                      alignment: Alignment.center,
                                      child: Icon(
                                        Icons.grass_outlined,
                                        size: 44,
                                        color: AppColors.primaryDark.withValues(alpha: 0.7),
                                      ),
                                    ),
                                  ),
                          ),
                        ),
                      const SizedBox(height: 12),
                      AnimatedBuilder(
                        animation: _cardController,
                        builder: (_, child) => FadeTransition(
                          opacity: _cardOpacityAnimation,
                          child: SlideTransition(position: _cardSlideAnimation, child: child),
                        ),
                        child: _resultCard(
                          cardColor: cardColor,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              Text(
                                widget.diseaseName,
                                style: TextStyle(
                                  color: textColor,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 22,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '(${widget.scientificName})',
                                style: TextStyle(
                                  color: subColor,
                                  fontStyle: FontStyle.italic,
                                ),
                              ),
                              const SizedBox(height: 12),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                decoration: BoxDecoration(
                                  color: confidenceMeta.bg,
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Text(
                                  '${widget.confidencePercent}% confidence',
                                  style: TextStyle(
                                    color: confidenceMeta.fg,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                widget.description,
                                style: TextStyle(color: subColor, height: 1.5),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),
                      Text(
                        'Recommended Steps',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              color: textColor,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      const SizedBox(height: 10),
                      const _ResultTip(
                        icon: Icons.eco_outlined,
                        title: 'Apply targeted treatment',
                        body: 'Use disease-specific pesticide or bio-control after verifying symptoms on multiple leaves.',
                      ),
                      const SizedBox(height: 10),
                      const _ResultTip(
                        icon: Icons.water_drop_outlined,
                        title: 'Adjust irrigation',
                        body: 'Avoid leaf-wet conditions and improve field drainage where moisture remains high.',
                      ),
                      const SizedBox(height: 10),
                      const _ResultTip(
                        icon: Icons.cleaning_services_outlined,
                        title: 'Sanitize affected area',
                        body: 'Remove heavily infected tissue and clean tools to reduce disease spread.',
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  _ConfidenceStyle _confidenceStyle(int score) {
    if (score >= 85) {
      return _ConfidenceStyle(
        bg: AppColors.primary.withValues(alpha: 0.18),
        fg: AppColors.primaryDark,
      );
    }
    if (score >= 60) {
      return _ConfidenceStyle(
        bg: Colors.amber.withValues(alpha: 0.2),
        fg: Colors.amber.shade900,
      );
    }
    return _ConfidenceStyle(
      bg: Colors.red.withValues(alpha: 0.18),
      fg: Colors.red.shade900,
    );
  }

  Widget _resultCard({required Color cardColor, required Widget child}) {
    return Container(
      width: double.infinity,
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

class _ConfidenceStyle {
  final Color bg;
  final Color fg;

  const _ConfidenceStyle({required this.bg, required this.fg});
}

class _ResultTip extends StatelessWidget {
  final IconData icon;
  final String title;
  final String body;

  const _ResultTip({
    required this.icon,
    required this.title,
    required this.body,
  });

  @override
  Widget build(BuildContext context) {
    final cardColor = Colors.white.withValues(alpha: 0.56);
    final textColor = AppColors.lightText;
    final subColor = AppColors.lightTextSecondary;

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.8), width: 1.1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.75),
                borderRadius: BorderRadius.circular(11),
                border: Border.all(color: Colors.white.withValues(alpha: 0.85)),
              ),
              child: Icon(icon, size: 18, color: AppColors.primaryDark),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    title,
                    style: TextStyle(
                      color: textColor,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    body,
                    style: TextStyle(color: subColor, height: 1.4),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class DashedBorderPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.primaryDark.withValues(alpha: 0.55)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4;

    final path = Path()
      ..addRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(0, 0, size.width, size.height),
          const Radius.circular(14),
        ),
      );

    const dashWidth = 6.0;
    const dashGap = 4.0;

    final List<PathMetric> metrics = path.computeMetrics().toList();
    for (final metric in metrics) {
      double distance = 0;
      while (distance < metric.length) {
        final dashPath = metric.extractPath(distance, distance + dashWidth);
        canvas.drawPath(dashPath, paint);
        distance += dashWidth + dashGap;
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
