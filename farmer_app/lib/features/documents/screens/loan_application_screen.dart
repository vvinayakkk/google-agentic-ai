import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/services/document_builder_service.dart';
import '../../../shared/services/farmer_service.dart';
import 'preview_download_screen.dart';

class LoanApplicationScreen extends ConsumerStatefulWidget {
  final String? schemeId;

  const LoanApplicationScreen({Key? key, this.schemeId}) : super(key: key);

  @override
  ConsumerState<LoanApplicationScreen> createState() =>
      _LoanApplicationScreenState();
}

class _LoanApplicationScreenState extends ConsumerState<LoanApplicationScreen> {
  bool _loading = true;
  Map<String, dynamic> _profile = {};

  final TextEditingController _loanC = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  @override
  void dispose() {
    _loanC.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    setState(() => _loading = true);
    try {
      final profile = await ref.read(farmerServiceProvider).getMyProfile();
      if (!mounted) return;
      setState(() {
        _profile = profile;
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Widget _formField(String label, String value, {bool editable = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: context.textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
        ),
        const SizedBox(height: 4),
        Row(
          children: [
            Expanded(
              child: Text(
                value,
                style: context.textTheme.bodyLarge?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            if (editable) Icon(Icons.edit, size: 16, color: AppColors.primary),
          ],
        ),
        const Divider(height: 24),
      ],
    );
  }

  Future<void> _onPreview() async {
    String? sessionId;
    try {
      if (widget.schemeId != null) {
        final svc = ref.read(documentBuilderServiceProvider);
        final session = await svc.startSession(widget.schemeId!);
        sessionId =
            (session['session_id'] ?? session['sessionId'] ?? session['id'])
                ?.toString();
      }
    } catch (e) {
      // ignore and navigate without session
    }

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PreviewDownloadScreen(
          sessionId: sessionId,
          formData: {
            'full_name': _profile['name'] ?? '',
            'village':
                '${_profile['village'] ?? ''}, ${_profile['district'] ?? ''}',
            'land_size': _profile['land_size_acres']?.toString() ?? '',
            'crop_type': _profile['main_crop'] ?? '',
            'loan_amount': _loanC.text,
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Loan Application'),
        actions: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Text(
              'STEP 1 OF 2',
              style: context.textTheme.bodySmall?.copyWith(
                color: AppColors.primary,
              ),
            ),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                LinearProgressIndicator(
                  value: 0.5,
                  color: const Color(0xFF52B788),
                  backgroundColor: const Color(0xFFD8F3DC),
                ),
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              'Personal Details',
                              style: context.textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const Spacer(),
                            IconButton(
                              onPressed: () {},
                              icon: const Icon(
                                Icons.edit,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        _formField(
                          'Full Name',
                          _profile['name'] ?? 'Ramesh Kumar',
                          editable: true,
                        ),
                        _formField(
                          'Village / Gram',
                          '${_profile['village'] ?? ''}, ${_profile['state'] ?? ''}',
                        ),
                        _formField(
                          'Land Size',
                          (_profile['land_size_acres']?.toString() ?? '') +
                              (_profile['land_size_acres'] != null
                                  ? ' Acres'
                                  : ''),
                        ),
                        _formField(
                          'Crop Type',
                          _profile['main_crop'] ?? 'Wheat (Rabi)',
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Loan Amount',
                          style: context.textTheme.bodySmall?.copyWith(
                            color: Colors.grey[600],
                          ),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _loanC,
                          decoration: const InputDecoration(
                            hintText: 'Enter amount ₹',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: const [
                            Icon(
                              Icons.auto_awesome,
                              size: 14,
                              color: Color(0xFF52B788),
                            ),
                            SizedBox(width: 6),
                            Text(
                              'Auto-filled from your profile',
                              style: TextStyle(
                                color: Color(0xFF52B788),
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            height: 200,
                            width: double.infinity,
                            color: Colors.grey[300],
                            child: const Icon(
                              Icons.person,
                              size: 80,
                              color: Colors.grey,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _onPreview,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2D6A4F),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: const Text('PREVIEW'),
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
