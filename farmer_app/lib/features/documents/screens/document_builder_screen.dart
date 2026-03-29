import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/services/document_builder_service.dart';
import '../../../shared/services/farmer_service.dart';
import 'loan_application_screen.dart';

class DocumentBuilderScreen extends ConsumerStatefulWidget {
  const DocumentBuilderScreen({super.key});

  @override
  ConsumerState<DocumentBuilderScreen> createState() =>
      _DocumentBuilderScreenState();
}

class _DocumentBuilderScreenState extends ConsumerState<DocumentBuilderScreen> {
  List<Map<String, dynamic>> _schemes = [];
  bool _loading = true;

  final List<Map<String, String>> _recent = [
    {'title': 'KCC Application', 'subtitle': 'Edited 2h ago'},
  ];

  @override
  void initState() {
    super.initState();
    _loadSchemes();
  }

  Future<void> _loadSchemes() async {
    setState(() => _loading = true);
    try {
      final svc = ref.read(documentBuilderServiceProvider);
      final list = await svc.listSchemes();
      if (!mounted) return;
      setState(() {
        _schemes = List<Map<String, dynamic>>.from(list);
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _openLoanApp(String? schemeId) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => LoanApplicationScreen(schemeId: schemeId),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final primary = AppColors.primary;

    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(),
        title: Text(
          'Document Builder',
          style: context.textTheme.titleLarge?.copyWith(color: primary),
        ),
        centerTitle: true,
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(onPressed: () {}, icon: const Icon(Icons.info_outline)),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: primary,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'INSTANT GENERATION',
                          style: context.textTheme.labelSmall?.copyWith(
                            color: Colors.white,
                            fontSize: 11,
                            letterSpacing: 1.2,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Generate official farming\ndocuments instantly 📄',
                          style: context.textTheme.titleMedium?.copyWith(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Icon(Icons.description, color: Colors.white, size: 40),
                ],
              ),
            ),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                'CHOOSE DOCUMENT TYPE',
                style: context.textTheme.labelMedium?.copyWith(
                  color: Colors.grey[600],
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),

            const SizedBox(height: 12),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _buildGrid(context),
            ),

            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                'RECENT DOCUMENTS',
                style: context.textTheme.labelMedium?.copyWith(
                  color: Colors.grey[600],
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),

            const SizedBox(height: 8),
            ..._recent.map(
              (d) => ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFD8F3DC),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    Icons.description,
                    color: const Color(0xFF2D6A4F),
                  ),
                ),
                title: Text(
                  d['title'] ?? '',
                  style: context.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                subtitle: Text(
                  d['subtitle'] ?? '',
                  style: context.textTheme.bodySmall?.copyWith(
                    color: Colors.grey[600],
                  ),
                ),
                trailing: ElevatedButton(
                  onPressed: () {},
                  style: ElevatedButton.styleFrom(backgroundColor: primary),
                  child: const Text('OPEN'),
                ),
              ),
            ),

            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black12,
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Need help with legal terms?',
                            style: context.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Ask our virtual expert for clarity on any document section.',
                            style: context.textTheme.bodySmall?.copyWith(
                              color: Colors.grey[600],
                            ),
                          ),
                          const SizedBox(height: 12),
                          ElevatedButton(
                            onPressed: () {},
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primaryDark,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            child: const Text('ASK EXPERT'),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Container(
                      width: 90,
                      height: 90,
                      decoration: BoxDecoration(
                        color: Colors.grey[200],
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.person,
                        size: 48,
                        color: Colors.grey,
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

  Widget _buildGrid(BuildContext context) {
    final items = [
      {
        'icon': Icons.credit_card,
        'color': Colors.orange,
        'title': 'Loan Application',
        'subtitle': 'For Kisan Credit Card',
        'action': 'loan',
      },
      {
        'icon': Icons.grass,
        'color': AppColors.success,
        'title': 'Crop Declaration',
        'subtitle': 'Declare sowing details',
        'action': 'crop',
      },
      {
        'icon': Icons.account_balance,
        'color': Colors.blue,
        'title': 'Subsidy Claim',
        'subtitle': 'Govt scheme claims',
        'action': 'subsidy',
      },
      {
        'icon': Icons.bar_chart,
        'color': Colors.purple,
        'title': 'Income Certificate',
        'subtitle': 'Farming income proof',
        'action': 'income',
      },
      {
        'icon': Icons.map,
        'color': Colors.teal,
        'title': 'Land Records',
        'subtitle': 'Digitize patta/khata',
        'action': 'land',
      },
      {
        'icon': Icons.shield,
        'color': AppColors.success,
        'title': 'Insurance Form',
        'subtitle': 'PMFSY application',
        'action': 'insurance',
      },
    ];

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: EdgeInsets.zero,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.3,
      children: items.map((it) {
        return Card(
          elevation: 2,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          child: InkWell(
            onTap: () {
              if (it['action'] == 'loan') {
                final match = _schemes.firstWhere((s) {
                  final name = (s['name'] ?? '').toString().toLowerCase();
                  return name.contains('kisan') || name.contains('kcc');
                }, orElse: () => <String, dynamic>{});
                final schemeId = (match['scheme_id'] ?? match['id'])
                    ?.toString();
                _openLoanApp(schemeId);
              } else {
                _openLoanApp(null);
              }
            },
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: (it['color'] as Color).withOpacity(0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      it['icon'] as IconData,
                      color: it['color'] as Color,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    it['title'] as String,
                    style: context.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    it['subtitle'] as String,
                    style: context.textTheme.bodySmall?.copyWith(
                      color: Colors.grey[600],
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}
