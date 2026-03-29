import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/services/document_builder_service.dart';

class PreviewDownloadScreen extends ConsumerStatefulWidget {
  final String? sessionId;
  final Map<String, dynamic>? formData;

  const PreviewDownloadScreen({Key? key, this.sessionId, this.formData})
    : super(key: key);

  @override
  ConsumerState<PreviewDownloadScreen> createState() =>
      _PreviewDownloadScreenState();
}

class _PreviewDownloadScreenState extends ConsumerState<PreviewDownloadScreen> {
  bool _loading = false;
  Map<String, dynamic>? _doc;

  @override
  void initState() {
    super.initState();
    if (widget.sessionId != null) _loadDocument();
  }

  Future<void> _loadDocument() async {
    setState(() => _loading = true);
    try {
      final svc = ref.read(documentBuilderServiceProvider);
      final res = await svc.generateDocument(widget.sessionId!);
      if (!mounted) return;
      setState(() {
        _doc = res;
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _download() {
    final url = _doc?['document_url'] ?? _doc?['download_url'];
    if (url != null && url is String && url.isNotEmpty) {
      Share.share(url);
    } else {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Download not available')));
    }
  }

  void _shareWhatsapp() {
    final url = _doc?['document_url'] ?? _doc?['download_url'];
    if (url != null && url is String && url.isNotEmpty) {
      Share.share(url);
    } else {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Nothing to share')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final primary = AppColors.primary;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Preview & Download'),
        actions: [IconButton(onPressed: () {}, icon: const Icon(Icons.share))],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(color: Colors.grey.withOpacity(0.2), blurRadius: 8),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: primary,
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(12),
                        topRight: Radius.circular(12),
                      ),
                    ),
                    child: const Text(
                      'KISAN CREDIT CARD APPLICATION',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Stack(
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: List.generate(
                            8,
                            (i) => Container(
                              height: 10,
                              margin: const EdgeInsets.only(bottom: 10),
                              color: Colors.grey[200],
                            ),
                          ),
                        ),
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: Container(
                            width: 70,
                            height: 70,
                            color: Colors.grey[200],
                            child: const Center(
                              child: Text(
                                'PHOTO\nSTAMP',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 10,
                                  color: Colors.grey,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.check_circle, color: Colors.green, size: 18),
                const SizedBox(width: 6),
                Text(
                  'AUTO-VERIFIED WITH YOUR PROFILE',
                  style: context.textTheme.bodySmall?.copyWith(
                    color: Colors.green,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _download,
                      icon: const Icon(Icons.download),
                      label: const Text('DOWNLOAD PDF'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: _shareWhatsapp,
                      icon: const Icon(Icons.share),
                      label: const Text('SHARE VIA WHATSAPP'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: primary,
                        side: BorderSide(color: primary),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.edit),
                      label: const Text('EDIT DETAILS'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ),
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
