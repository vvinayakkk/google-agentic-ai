import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/document_builder_model.dart';
import '../../../shared/services/document_builder_service.dart';
import '../../../shared/services/farmer_service.dart';

class DocumentVaultScreen extends ConsumerStatefulWidget {
  const DocumentVaultScreen({super.key});

  @override
  ConsumerState<DocumentVaultScreen> createState() =>
      _DocumentVaultScreenState();
}

class _DocumentVaultScreenState extends ConsumerState<DocumentVaultScreen> {
  bool _loading = true;
  Map<String, dynamic> _profile = <String, dynamic>{};
  List<SavedDocument> _savedDocs = <SavedDocument>[];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final profile = await ref
          .read(farmerServiceProvider)
          .getMyProfile(preferCache: true);
      final docs = await ref
          .read(documentBuilderServiceProvider)
          .listSavedDocuments();
      if (!mounted) return;
      setState(() {
        _profile = profile;
        _savedDocs = docs;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
      });
    }
  }

  bool _readyAadhaar() {
    return (_profile['aadhaar'] ?? _profile['aadhaar_number'] ?? '')
        .toString()
        .trim()
        .isNotEmpty;
  }

  bool _readyLand() {
    return (_profile['land_size_acres'] ?? _profile['land_area'] ?? '')
        .toString()
        .trim()
        .isNotEmpty;
  }

  bool _readyBank() {
    final account = (_profile['bank_account'] ?? '')
        .toString()
        .trim()
        .isNotEmpty;
    final ifsc = (_profile['ifsc'] ?? _profile['ifsc_code'] ?? '')
        .toString()
        .trim()
        .isNotEmpty;
    return account && ifsc;
  }

  bool _readyCaste() {
    return _profile['caste_certificate_available'] == true;
  }

  bool _readyPhoto() {
    return (_profile['photo_url'] ?? _profile['profile_photo'] ?? '')
        .toString()
        .trim()
        .isNotEmpty;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final cardColor = Colors.white.withValues(alpha: 0.56);

    return Scaffold(
      backgroundColor: isDark
          ? AppColors.darkBackground
          : AppColors.lightBackground,
      appBar: AppBar(
        title: const Text('Document Vault'),
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? <Color>[AppColors.darkBackground, AppColors.darkSurface]
                : <Color>[AppColors.lightBackground, AppColors.lightSurface],
          ),
        ),
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                  children: <Widget>[
                    _glassCard(
                      cardColor,
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Text(
                            'Core Document Checklist',
                            style: context.textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 10),
                          _checkItem('Aadhaar Card', _readyAadhaar()),
                          _checkItem('Land Records', _readyLand()),
                          _checkItem('Bank Passbook / IFSC', _readyBank()),
                          _checkItem('Caste Certificate', _readyCaste()),
                          _checkItem('Passport Photo', _readyPhoto()),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Saved Documents',
                      style: context.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 8),
                    if (_savedDocs.isEmpty)
                      _glassCard(
                        cardColor,
                        Text(
                          'No documents saved yet. Build a document and save it to your profile.',
                          style: context.textTheme.bodyMedium,
                        ),
                      )
                    else
                      ..._savedDocs.map((doc) => _docCard(doc, cardColor)),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _checkItem(String label, bool ready) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: <Widget>[
          Icon(
            ready ? Icons.check_circle : Icons.radio_button_unchecked,
            color: ready ? AppColors.success : Colors.grey,
            size: 18,
          ),
          const SizedBox(width: 8),
          Expanded(child: Text(label)),
          Text(
            ready ? 'Uploaded' : 'Build',
            style: TextStyle(
              color: ready ? AppColors.success : AppColors.warning,
              fontWeight: FontWeight.w700,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _docCard(SavedDocument doc, Color cardColor) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: _glassCard(
        cardColor,
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              doc.schemeName,
              style: context.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '${doc.generatedAt.day}/${doc.generatedAt.month}/${doc.generatedAt.year}  •  ${doc.status}',
              style: context.textTheme.bodySmall?.copyWith(
                color: context.appColors.textSecondary,
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: <Widget>[
                Expanded(
                  child: OutlinedButton(
                    onPressed: () async {
                      final uri = Uri.tryParse(doc.documentUrl);
                      if (uri != null) {
                        await launchUrl(uri, mode: LaunchMode.inAppWebView);
                      }
                    },
                    child: const Text('Preview'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () async {
                      final uri = Uri.tryParse(doc.documentUrl);
                      if (uri != null) {
                        await launchUrl(
                          uri,
                          mode: LaunchMode.externalApplication,
                        );
                      }
                    },
                    child: const Text('Re-download'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      SharePlus.instance.share(
                        ShareParams(
                          text:
                              'My saved scheme document (${doc.schemeName}): ${doc.documentUrl}',
                        ),
                      );
                    },
                    child: const Text('Share'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _glassCard(Color cardColor, Widget child) {
    return Container(
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.8),
          width: 1.2,
        ),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: AppColors.primaryDark.withValues(alpha: 0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: child,
      ),
    );
  }
}
