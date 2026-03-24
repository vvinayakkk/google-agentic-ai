import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shimmer/shimmer.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/utils/app_cache.dart';
import '../../../shared/services/market_service.dart';
import '../../../shared/services/document_builder_service.dart';

/// Detailed view of a single government scheme with PDF download/viewing.
class SchemeDetailScreen extends ConsumerStatefulWidget {
  final String schemeId;
  final String schemeName;

  const SchemeDetailScreen({
    super.key,
    required this.schemeId,
    required this.schemeName,
  });

  @override
  ConsumerState<SchemeDetailScreen> createState() => _SchemeDetailScreenState();
}

class _SchemeDetailScreenState extends ConsumerState<SchemeDetailScreen> {
  Map<String, dynamic>? _scheme;
  List<Map<String, dynamic>> _schemeDocs = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    // Try cache first
    final cached = await AppCache.get('scheme_${widget.schemeId}');
    if (cached != null && mounted) {
      setState(() {
        _scheme = Map<String, dynamic>.from(cached as Map);
        _loading = false;
      });
    }

    try {
      final marketSvc = ref.read(marketServiceProvider);
      final docSvc = ref.read(documentBuilderServiceProvider);

      final results = await Future.wait([
        marketSvc.getSchemeById(widget.schemeId),
        docSvc.listSchemeDocs(),
      ]);

      if (mounted) {
        final scheme = results[0] as Map<String, dynamic>;
        final docs = results[1] as List<Map<String, dynamic>>;
        await AppCache.put('scheme_${widget.schemeId}', scheme,
            ttlSeconds: 7200);
        setState(() {
          _scheme = scheme;
          _schemeDocs = docs;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted && _scheme == null) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.schemeName,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          if (_scheme != null)
            IconButton(
              icon: const Icon(Icons.share),
              onPressed: () {
                Haptics.light();
                SharePlus.instance.share(
                  ShareParams(text: '${widget.schemeName}\n${_scheme!['application_url'] ?? ''}'),
                );
              },
            ),
        ],
      ),
      body: _loading
          ? _buildShimmer()
          : _error != null
              ? _buildError()
              : _buildContent(theme, colorScheme),
    );
  }

  Widget _buildShimmer() {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: List.generate(
          6,
          (_) => Container(
            height: 20,
            margin: const EdgeInsets.only(bottom: 16),
            color: Colors.white,
          ),
        ),
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
          const SizedBox(height: 16),
          Text('Failed to load scheme', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          FilledButton.icon(
            onPressed: _loadData,
            icon: const Icon(Icons.refresh),
            label: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(ThemeData theme, ColorScheme cs) {
    final scheme = _scheme!;
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Header card
          Card(
            elevation: 0,
            color: cs.primaryContainer,
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (scheme['category'] != null)
                    Chip(
                      label: Text(
                        (scheme['category'] as String).toUpperCase(),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: cs.onPrimaryContainer,
                        ),
                      ),
                      backgroundColor: cs.primary.withValues(alpha: 0.15),
                    ),
                  const SizedBox(height: 8),
                  Text(
                    scheme['name'] ?? widget.schemeName,
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: cs.onPrimaryContainer,
                    ),
                  ),
                  if (scheme['description'] != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      scheme['description'],
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: cs.onPrimaryContainer.withValues(alpha: 0.8),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.1),

          const SizedBox(height: 16),

          // Benefits
          if (scheme['benefits'] != null)
            _buildSection(
              icon: Icons.volunteer_activism,
              title: 'Benefits',
              content: scheme['benefits'].toString(),
              color: Colors.green,
            ),

          // Eligibility
          if (scheme['eligibility'] != null)
            _buildSection(
              icon: Icons.checklist,
              title: 'Eligibility',
              content: scheme['eligibility'].toString(),
              color: Colors.blue,
            ),

          // Required Documents
          if (scheme['required_documents'] is List &&
              (scheme['required_documents'] as List).isNotEmpty) ...[
            const SizedBox(height: 16),
            Text('Required Documents',
                style: theme.textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ...List.generate(
              (scheme['required_documents'] as List).length,
              (i) => ListTile(
                dense: true,
                leading: CircleAvatar(
                  radius: 14,
                  backgroundColor: cs.secondaryContainer,
                  child: Text('${i + 1}',
                      style: TextStyle(
                          fontSize: 12, color: cs.onSecondaryContainer)),
                ),
                title: Text(scheme['required_documents'][i].toString()),
              ),
            ),
          ],

          // Helpline
          if (scheme['helpline'] != null) ...[
            const SizedBox(height: 16),
            Card(
              elevation: 0,
              color: Colors.orange.shade50,
              child: ListTile(
                leading: const Icon(Icons.phone, color: Colors.orange),
                title: const Text('Helpline'),
                subtitle: Text(scheme['helpline'].toString()),
                trailing: IconButton(
                  icon: const Icon(Icons.call),
                  onPressed: () {
                    Haptics.medium();
                    launchUrl(Uri.parse('tel:${scheme['helpline']}'));
                  },
                ),
              ),
            ),
          ],

          // Apply button
          if (scheme['application_url'] != null) ...[
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: () {
                Haptics.heavy();
                launchUrl(Uri.parse(scheme['application_url']),
                    mode: LaunchMode.externalApplication);
              },
              icon: const Icon(Icons.open_in_new),
              label: const Text('Apply Online'),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
              ),
            ),
          ],

          // Downloadable PDFs
          if (_schemeDocs.isNotEmpty) ...[
            const SizedBox(height: 24),
            Text('Downloadable Documents',
                style: theme.textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ..._schemeDocs.map(
              (doc) => Card(
                child: ListTile(
                  leading: const Icon(Icons.picture_as_pdf, color: Colors.red),
                  title: Text(doc['scheme_name']?.toString() ?? 'Document'),
                  subtitle: Text(doc['filename']?.toString() ?? ''),
                  trailing: IconButton(
                    icon: const Icon(Icons.download),
                    onPressed: () {
                      Haptics.medium();
                      final url = doc['download_url']?.toString();
                      if (url != null && url.isNotEmpty) {
                        launchUrl(Uri.parse(url),
                            mode: LaunchMode.externalApplication);
                      }
                    },
                  ),
                ),
              ),
            ),
          ],

          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildSection({
    required IconData icon,
    required String title,
    required String content,
    required Color color,
  }) {
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Card(
        elevation: 0,
        color: color.withValues(alpha: 0.06),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(icon, color: color, size: 20),
                  const SizedBox(width: 8),
                  Text(title,
                      style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          color: color)),
                ],
              ),
              const SizedBox(height: 8),
              Text(content, style: const TextStyle(height: 1.5)),
            ],
          ),
        ),
      ),
    ).animate().fadeIn(delay: 100.ms, duration: 300.ms);
  }
}
