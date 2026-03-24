import 'dart:convert';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/services/agent_service.dart';
import '../../../shared/widgets/app_card.dart';

import '../../../shared/widgets/app_text_field.dart';

// ═══════════════════════════════════════════════════════════════
//  Document Agent Screen — 4 Tab Design
// ═══════════════════════════════════════════════════════════════

class DocumentAgentScreen extends ConsumerStatefulWidget {
  const DocumentAgentScreen({super.key});

  @override
  ConsumerState<DocumentAgentScreen> createState() =>
      _DocumentAgentScreenState();
}

class _DocumentAgentScreenState extends ConsumerState<DocumentAgentScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  // ── Tab 1 state ──────────────────────────────────────────
  static const _prefsKey = 'doc_checklist_v2';
  late List<_DocItem> _documents;
  bool _checklistLoaded = false;

  // ── Tab 2 state ──────────────────────────────────────────
  final _schemeSearchCtrl = TextEditingController();
  String _schemeFilter = '';

  // ── Tab 3 state ──────────────────────────────────────────
  String? _selectedTopic;
  String _guideResponse = '';
  bool _guideLoading = false;
  final _questionCtrl = TextEditingController();

  // ── Tab 4 state ──────────────────────────────────────────
  String _formResponse = '';
  bool _formLoading = false;

  // ── Shared ───────────────────────────────────────────────
  String _aiResponse = '';
  bool _aiLoading = false;

  // ── Default documents ────────────────────────────────────
  static List<_DocItem> get _defaultDocs => [
        _DocItem('Aadhaar Card', Icons.fingerprint, false),
        _DocItem('PAN Card', Icons.credit_card, false),
        _DocItem('Land Records (7/12)', Icons.landscape, false),
        _DocItem('Kisan Credit Card', Icons.agriculture, false),
        _DocItem('Bank Passbook', Icons.account_balance, false),
        _DocItem('Soil Health Card', Icons.eco, false),
        _DocItem('Ration Card', Icons.card_membership, false),
        _DocItem('Voter ID', Icons.how_to_vote, false),
        _DocItem('Crop Insurance (PMFBY)', Icons.security, false),
        _DocItem('Driving License', Icons.drive_eta, false),
        _DocItem('Caste Certificate', Icons.description, false),
        _DocItem('Income Certificate', Icons.receipt_long, false),
      ];

  // ── Government schemes data ──────────────────────────────
  static final List<_SchemeInfo> _schemes = [
    _SchemeInfo(
      name: 'PM-KISAN',
      description: 'Direct income support of ₹6,000/year to farmer families.',
      docs: ['Aadhaar Card', 'Land Records', 'Bank Account Details'],
      icon: Icons.payments,
      color: AppColors.success,
    ),
    _SchemeInfo(
      name: 'PMFBY',
      description:
          'Pradhan Mantri Fasal Bima Yojana — crop insurance at low premium.',
      docs: ['Aadhaar Card', 'Land Records', 'Bank Passbook', 'Sowing Certificate'],
      icon: Icons.security,
      color: AppColors.info,
    ),
    _SchemeInfo(
      name: 'Kisan Credit Card (KCC)',
      description: 'Affordable credit for crop production and allied activities.',
      docs: ['Aadhaar Card', 'PAN Card', 'Land Records', 'Passport Photo'],
      icon: Icons.credit_card,
      color: AppColors.warning,
    ),
    _SchemeInfo(
      name: 'PM-KUSUM',
      description: 'Solar pumps & grid-connected renewable power for farmers.',
      docs: ['Aadhaar Card', 'Land Records', 'Electricity Bill', 'Bank Details'],
      icon: Icons.solar_power,
      color: AppColors.accent,
    ),
    _SchemeInfo(
      name: 'Soil Health Card Scheme',
      description: 'Free soil testing and nutrient-based recommendations.',
      docs: ['Aadhaar Card', 'Land Records', 'Soil Samples'],
      icon: Icons.eco,
      color: AppColors.primaryDark,
    ),
    _SchemeInfo(
      name: 'National Mission for Sustainable Agriculture',
      description: 'Promotes sustainable farming through climate adaptation.',
      docs: ['Aadhaar Card', 'Land Records', 'Farm Plan', 'Bank Details'],
      icon: Icons.nature,
      color: AppColors.primary,
    ),
  ];

  // ── Guide topics ─────────────────────────────────────────
  static const _guideTopics = [
    ('Overview', Icons.info_outline),
    ('Land Records', Icons.landscape),
    ('Kisan Card', Icons.agriculture),
    ('Insurance Docs', Icons.security),
    ('Bank Accounts', Icons.account_balance),
    ('Identity Docs', Icons.badge),
  ];

  // ── Common forms ─────────────────────────────────────────
  static final List<_FormInfo> _forms = [
    _FormInfo(
      name: 'PM-KISAN Registration',
      fields: ['Name', 'Aadhaar No.', 'Bank IFSC', 'Land Survey No.'],
      docsNeeded: ['Aadhaar', 'Land Records', 'Bank Passbook'],
      submitAt: 'CSC Centre / PM-KISAN Portal',
    ),
    _FormInfo(
      name: 'PMFBY Enrollment',
      fields: ['Crop Details', 'Season', 'Area Sown', 'Premium Amount'],
      docsNeeded: ['Aadhaar', 'Land Records', 'Bank Passbook', 'Sowing Certificate'],
      submitAt: 'Bank Branch / CSC Centre',
    ),
    _FormInfo(
      name: 'KCC Application',
      fields: ['Loan Amount', 'Crop Plan', 'Land Details', 'Income Proof'],
      docsNeeded: ['Aadhaar', 'PAN Card', 'Land Records', 'Photo'],
      submitAt: 'Nearest Bank Branch',
    ),
    _FormInfo(
      name: 'Land Mutation',
      fields: ['Old Owner', 'New Owner', 'Survey No.', 'Area', 'Transaction Type'],
      docsNeeded: ['Sale Deed', 'Land Records 7/12', 'ID Proof'],
      submitAt: 'Talathi / Tehsildar Office',
    ),
    _FormInfo(
      name: 'Aadhaar Update',
      fields: ['Name', 'Address', 'Mobile No.', 'Biometrics'],
      docsNeeded: ['Old Aadhaar', 'Address Proof', 'Photo'],
      submitAt: 'Aadhaar Enrolment Centre',
    ),
  ];

  // ── Lifecycle ────────────────────────────────────────────

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadChecklist();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _schemeSearchCtrl.dispose();
    _questionCtrl.dispose();
    super.dispose();
  }

  // ── Icon lookup (avoids non-constant IconData for tree-shaking) ─────────
  static final Map<int, IconData> _knownIcons = {
    Icons.fingerprint.codePoint: Icons.fingerprint,
    Icons.credit_card.codePoint: Icons.credit_card,
    Icons.landscape.codePoint: Icons.landscape,
    Icons.agriculture.codePoint: Icons.agriculture,
    Icons.account_balance.codePoint: Icons.account_balance,
    Icons.eco.codePoint: Icons.eco,
    Icons.card_membership.codePoint: Icons.card_membership,
    Icons.how_to_vote.codePoint: Icons.how_to_vote,
    Icons.security.codePoint: Icons.security,
    Icons.drive_eta.codePoint: Icons.drive_eta,
    Icons.description.codePoint: Icons.description,
    Icons.receipt_long.codePoint: Icons.receipt_long,
    Icons.payments.codePoint: Icons.payments,
    Icons.wb_sunny.codePoint: Icons.wb_sunny,
    Icons.water.codePoint: Icons.water,
    Icons.grass.codePoint: Icons.grass,
    Icons.store.codePoint: Icons.store,
    Icons.assignment.codePoint: Icons.assignment,
    Icons.folder.codePoint: Icons.folder,
  };

  // ── Persistence ──────────────────────────────────────────

  Future<void> _loadChecklist() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_prefsKey);
    if (raw != null) {
      final List<dynamic> list = jsonDecode(raw);
      _documents =
          list.map((e) => _DocItem(e['name'], _iconFromName(e['icon']), e['done'])).toList();
    } else {
      _documents = _defaultDocs;
    }
    setState(() => _checklistLoaded = true);
  }

  Future<void> _saveChecklist() async {
    final prefs = await SharedPreferences.getInstance();
    final data = _documents
        .map((d) => {'name': d.name, 'icon': d.icon.codePoint, 'done': d.done})
        .toList();
    await prefs.setString(_prefsKey, jsonEncode(data));
  }

  IconData _iconFromName(dynamic codePoint) {
    if (codePoint is int) return _knownIcons[codePoint] ?? Icons.description;
    return Icons.description;
  }

  // ── AI helpers ───────────────────────────────────────────

  Future<void> _askAI(String prompt, {bool isGuide = false, bool isForm = false}) async {
    if (isGuide) {
      setState(() {
        _guideLoading = true;
        _guideResponse = '';
      });
    } else if (isForm) {
      setState(() {
        _formLoading = true;
        _formResponse = '';
      });
    } else {
      setState(() {
        _aiLoading = true;
        _aiResponse = '';
      });
    }

    try {
      final result = await ref.read(agentServiceProvider).chat(
            message: prompt,
            language: context.locale.languageCode,
          );
      final text = (result['response'] ?? 'No response received.').toString();
      setState(() {
        if (isGuide) {
          _guideResponse = text;
        } else if (isForm) {
          _formResponse = text;
        } else {
          _aiResponse = text;
        }
      });
    } catch (e) {
      final errorMsg = 'documents.error'.tr();
      if (mounted) context.showSnack(errorMsg, isError: true);
    } finally {
      setState(() {
        _aiLoading = false;
        _guideLoading = false;
        _formLoading = false;
      });
    }
  }

  // ── Build ────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('documents.title'.tr()),
        actions: [
          IconButton(
            tooltip: 'Smart Document Builder',
            icon: const Icon(Icons.auto_awesome),
            onPressed: () {
              HapticFeedback.lightImpact();
              context.push(RoutePaths.documentBuilder);
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          tabs: const [
            Tab(icon: Icon(Icons.checklist), text: 'My Documents'),
            Tab(icon: Icon(Icons.search), text: 'Scheme Finder'),
            Tab(icon: Icon(Icons.menu_book), text: 'Document Guide'),
            Tab(icon: Icon(Icons.edit_note), text: 'Form Helper'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildMyDocumentsTab(),
          _buildSchemeFinderTab(),
          _buildDocumentGuideTab(),
          _buildFormHelperTab(),
        ],
      ),
      floatingActionButton: _buildFab(),
    );
  }

  // ── FAB (only on Tab 1) ──────────────────────────────────

  Widget? _buildFab() {
    return AnimatedBuilder(
      animation: _tabController,
      builder: (context, _) {
        if (_tabController.index != 0) return const SizedBox.shrink();
        return FloatingActionButton.extended(
          onPressed: _showAddDocumentDialog,
          icon: const Icon(Icons.add),
          label: const Text('Add Document'),
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
        );
      },
    );
  }

  void _showAddDocumentDialog() {
    final ctrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Custom Document'),
        content: AppTextField(
          hint: 'Document name',
          controller: ctrl,
          prefixIcon: Icons.description,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              final name = ctrl.text.trim();
              if (name.isNotEmpty) {
                setState(() => _documents.add(_DocItem(name, Icons.note_add, false)));
                _saveChecklist();
                Navigator.pop(ctx);
              }
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  TAB 1 — My Documents (Checklist + Progress)
  // ═══════════════════════════════════════════════════════════

  Widget _buildMyDocumentsTab() {
    if (!_checklistLoaded) {
      return const Center(child: CircularProgressIndicator());
    }

    final done = _documents.where((d) => d.done).length;
    final total = _documents.length;
    final progress = total > 0 ? done / total : 0.0;

    return Column(
      children: [
        // ── Progress header ──
        Container(
          width: double.infinity,
          margin: AppSpacing.allLg,
          padding: AppSpacing.allLg,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [AppColors.primary, AppColors.primaryDark],
            ),
            borderRadius: AppRadius.lgAll,
          ),
          child: Column(
            children: [
              Text(
                '$done / $total Documents Ready',
                style: context.textTheme.titleMedium
                    ?.copyWith(color: Colors.white, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: AppSpacing.sm),
              ClipRRect(
                borderRadius: AppRadius.fullAll,
                child: LinearProgressIndicator(
                  value: progress,
                  minHeight: 10,
                  backgroundColor: Colors.white.withValues(alpha: 0.3),
                  valueColor: const AlwaysStoppedAnimation(Colors.white),
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                '${(progress * 100).toInt()}% complete',
                style: context.textTheme.bodySmall?.copyWith(color: Colors.white70),
              ),
            ],
          ),
        ),

        // ── Checklist ──
        Expanded(
          child: ListView.separated(
            padding: AppSpacing.hLg,
            itemCount: _documents.length,
            separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
            itemBuilder: (_, i) => _buildDocCheckItem(i),
          ),
        ),

        // ── AI response panel ──
        if (_aiResponse.isNotEmpty || _aiLoading) _buildAIPanel(_aiResponse, _aiLoading),
      ],
    );
  }

  Widget _buildDocCheckItem(int index) {
    final doc = _documents[index];
    return AppCard(
      padding: AppSpacing.allMd,
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: (doc.done ? AppColors.success : AppColors.primary)
                  .withValues(alpha: 0.08),
              borderRadius: AppRadius.smAll,
            ),
            child: Icon(doc.icon,
                color: doc.done ? AppColors.success : AppColors.primary, size: 22),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Text(
              doc.name,
              style: context.textTheme.bodyMedium?.copyWith(
                decoration: doc.done ? TextDecoration.lineThrough : null,
                color: doc.done ? context.appColors.textSecondary : null,
              ),
            ),
          ),
          // Status indicator
          Icon(
            doc.done ? Icons.check_circle : Icons.radio_button_unchecked,
            color: doc.done ? AppColors.success : context.appColors.textSecondary,
            size: 24,
          ),
          const SizedBox(width: 8),
          // Toggle tap
          GestureDetector(
            onTap: () {
              setState(() => _documents[index] = doc.copyWith(done: !doc.done));
              _saveChecklist();
            },
            child: Text(
              doc.done ? 'Done' : 'Mark',
              style: context.textTheme.labelSmall?.copyWith(
                color: doc.done ? AppColors.success : AppColors.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  TAB 2 — Scheme Finder
  // ═══════════════════════════════════════════════════════════

  Widget _buildSchemeFinderTab() {
    final filtered = _schemeFilter.isEmpty
        ? _schemes
        : _schemes
            .where((s) =>
                s.name.toLowerCase().contains(_schemeFilter) ||
                s.description.toLowerCase().contains(_schemeFilter))
            .toList();

    return Column(
      children: [
        Padding(
          padding: AppSpacing.allLg,
          child: AppTextField(
            hint: 'Search schemes...',
            controller: _schemeSearchCtrl,
            prefixIcon: Icons.search,
            onChanged: (v) => setState(() => _schemeFilter = v.toLowerCase()),
          ),
        ),
        Expanded(
          child: filtered.isEmpty
              ? Center(
                  child: Text('No schemes found',
                      style: context.textTheme.bodyLarge
                          ?.copyWith(color: context.appColors.textSecondary)))
              : ListView.separated(
                  padding: AppSpacing.hLg,
                  itemCount: filtered.length,
                  separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.md),
                  itemBuilder: (_, i) => _buildSchemeCard(filtered[i]),
                ),
        ),
        if (_aiResponse.isNotEmpty || _aiLoading) _buildAIPanel(_aiResponse, _aiLoading),
      ],
    );
  }

  Widget _buildSchemeCard(_SchemeInfo scheme) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: scheme.color.withValues(alpha: 0.08),
                  borderRadius: AppRadius.smAll,
                ),
                child: Icon(scheme.icon, color: scheme.color, size: 24),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Text(scheme.name,
                    style: context.textTheme.titleSmall
                        ?.copyWith(fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(scheme.description,
              style: context.textTheme.bodySmall
                  ?.copyWith(color: context.appColors.textSecondary)),
          const SizedBox(height: AppSpacing.sm),
          Text('Required Documents:',
              style: context.textTheme.labelSmall
                  ?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: AppSpacing.xs),
          Wrap(
            spacing: AppSpacing.xs,
            runSpacing: AppSpacing.xs,
            children: scheme.docs
                .map((d) => Chip(
                      label: Text(d, style: const TextStyle(fontSize: 11)),
                      visualDensity: VisualDensity.compact,
                      backgroundColor: scheme.color.withValues(alpha: 0.08),
                      side: BorderSide.none,
                    ))
                .toList(),
          ),
          const SizedBox(height: AppSpacing.md),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => _askAI(
                'Explain the ${scheme.name} scheme for Indian farmers in detail. '
                'Include: eligibility, step-by-step application process, required documents, '
                'benefits, important deadlines, and helpline numbers.',
              ),
              icon: const Icon(Icons.smart_toy, size: 18),
              label: const Text('Ask AI for Details'),
              style: OutlinedButton.styleFrom(
                foregroundColor: scheme.color,
                side: BorderSide(color: scheme.color),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  TAB 3 — Document Guide
  // ═══════════════════════════════════════════════════════════

  Widget _buildDocumentGuideTab() {
    return Column(
      children: [
        // ── Topic chips ──
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: AppSpacing.allLg,
          child: Row(
            children: _guideTopics.map((t) {
              final selected = _selectedTopic == t.$1;
              return Padding(
                padding: const EdgeInsets.only(right: AppSpacing.sm),
                child: FilterChip(
                  avatar: Icon(t.$2, size: 18),
                  label: Text(t.$1),
                  selected: selected,
                  selectedColor: AppColors.primary.withValues(alpha: 0.08),
                  checkmarkColor: AppColors.primary,
                  onSelected: (_) {
                    setState(() => _selectedTopic = t.$1);
                    _askAI(
                      'Give a comprehensive guide about "${t.$1}" documents for Indian farmers. '
                      'Include types, how to obtain, where to apply, fees, and tips.',
                      isGuide: true,
                    );
                  },
                ),
              );
            }).toList(),
          ),
        ),

        // ── AI guide response ──
        Expanded(
          child: _guideLoading
              ? const Center(child: CircularProgressIndicator())
              : _guideResponse.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.menu_book,
                              size: 64,
                              color: AppColors.primary.withValues(alpha: 0.3)),
                          const SizedBox(height: AppSpacing.md),
                          Text('Select a topic above to get AI guidance',
                              style: context.textTheme.bodyMedium?.copyWith(
                                  color: context.appColors.textSecondary)),
                        ],
                      ),
                    )
                  : SingleChildScrollView(
                      padding: AppSpacing.allLg,
                      child: AppCard(
                        child: MarkdownBody(
                          data: _guideResponse,
                          selectable: true,
                          styleSheet: MarkdownStyleSheet.fromTheme(context.theme)
                              .copyWith(
                            p: context.textTheme.bodyMedium,
                            h1: context.textTheme.titleLarge,
                            h2: context.textTheme.titleMedium,
                          ),
                        ),
                      ),
                    ),
        ),

        // ── Custom question ──
        Padding(
          padding: AppSpacing.allLg,
          child: Row(
            children: [
              Expanded(
                child: AppTextField(
                  hint: 'Ask a document question...',
                  controller: _questionCtrl,
                  prefixIcon: Icons.help_outline,
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              IconButton.filled(
                onPressed: _guideLoading
                    ? null
                    : () {
                        final q = _questionCtrl.text.trim();
                        if (q.isNotEmpty) {
                          _askAI(q, isGuide: true);
                          _questionCtrl.clear();
                        }
                      },
                icon: const Icon(Icons.send),
                style: IconButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  TAB 4 — Form Helper
  // ═══════════════════════════════════════════════════════════

  Widget _buildFormHelperTab() {
    return Column(
      children: [
        Expanded(
          child: _formResponse.isNotEmpty || _formLoading
              ? _buildFormResponseView()
              : ListView.separated(
                  padding: AppSpacing.allLg,
                  itemCount: _forms.length,
                  separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.md),
                  itemBuilder: (_, i) => _buildFormCard(_forms[i]),
                ),
        ),
      ],
    );
  }

  Widget _buildFormCard(_FormInfo form) {
    return AppCard(
      onTap: () => _askAI(
        'Help a farmer fill the "${form.name}" form step by step. '
        'Explain each field in simple language: ${form.fields.join(", ")}. '
        'Documents needed: ${form.docsNeeded.join(", ")}. '
        'Where to submit: ${form.submitAt}. '
        'Include tips for common mistakes.',
        isForm: true,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: AppColors.info.withValues(alpha: 0.08),
                  borderRadius: AppRadius.smAll,
                ),
                child: const Icon(Icons.edit_note, color: AppColors.info, size: 24),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Text(form.name,
                    style: context.textTheme.titleSmall
                        ?.copyWith(fontWeight: FontWeight.w600)),
              ),
              Icon(Icons.arrow_forward_ios,
                  size: 14, color: context.appColors.textSecondary),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          _infoRow(Icons.text_fields, 'Fields', form.fields.join(', ')),
          const SizedBox(height: AppSpacing.xs),
          _infoRow(Icons.folder_open, 'Documents', form.docsNeeded.join(', ')),
          const SizedBox(height: AppSpacing.xs),
          _infoRow(Icons.location_on, 'Submit at', form.submitAt),
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 14, color: context.appColors.textSecondary),
        const SizedBox(width: AppSpacing.xs),
        Text('$label: ',
            style: context.textTheme.labelSmall
                ?.copyWith(fontWeight: FontWeight.w600)),
        Expanded(
          child: Text(value,
              style: context.textTheme.labelSmall
                  ?.copyWith(color: context.appColors.textSecondary)),
        ),
      ],
    );
  }

  Widget _buildFormResponseView() {
    return Column(
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: Padding(
            padding: const EdgeInsets.only(
                left: AppSpacing.lg, top: AppSpacing.md),
            child: TextButton.icon(
              onPressed: () => setState(() {
                _formResponse = '';
                _formLoading = false;
              }),
              icon: const Icon(Icons.arrow_back, size: 18),
              label: const Text('Back to forms'),
            ),
          ),
        ),
        Expanded(
          child: _formLoading
              ? const Center(child: CircularProgressIndicator())
              : SingleChildScrollView(
                  padding: AppSpacing.allLg,
                  child: AppCard(
                    child: MarkdownBody(
                      data: _formResponse,
                      selectable: true,
                      styleSheet: MarkdownStyleSheet.fromTheme(context.theme)
                          .copyWith(
                        p: context.textTheme.bodyMedium,
                        h1: context.textTheme.titleLarge,
                        h2: context.textTheme.titleMedium,
                      ),
                    ),
                  ),
                ),
        ),
      ],
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  Shared AI Response Panel
  // ═══════════════════════════════════════════════════════════

  Widget _buildAIPanel(String response, bool loading) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      constraints: const BoxConstraints(maxHeight: 260),
      decoration: BoxDecoration(
        color: context.appColors.card,
        border: Border(top: BorderSide(color: context.appColors.border)),
      ),
      child: Column(
        children: [
          // ── Header bar ──
          Container(
            padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.lg, vertical: AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.08),
            ),
            child: Row(
              children: [
                const Icon(Icons.smart_toy, size: 18, color: AppColors.primary),
                const SizedBox(width: AppSpacing.sm),
                Text('AI Response',
                    style: context.textTheme.labelMedium
                        ?.copyWith(fontWeight: FontWeight.w600)),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close, size: 18),
                  onPressed: () => setState(() {
                    _aiResponse = '';
                    _aiLoading = false;
                  }),
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
          ),
          // ── Content ──
          Expanded(
            child: loading
                ? Center(child: Text('common.loading'.tr()))
                : SingleChildScrollView(
                    padding: AppSpacing.allMd,
                    child: MarkdownBody(
                      data: response,
                      selectable: true,
                      styleSheet: MarkdownStyleSheet.fromTheme(context.theme)
                          .copyWith(p: context.textTheme.bodySmall),
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
//  Data Models
// ═══════════════════════════════════════════════════════════════

class _DocItem {
  final String name;
  final IconData icon;
  final bool done;

  const _DocItem(this.name, this.icon, this.done);

  _DocItem copyWith({String? name, IconData? icon, bool? done}) =>
      _DocItem(name ?? this.name, icon ?? this.icon, done ?? this.done);
}

class _SchemeInfo {
  final String name;
  final String description;
  final List<String> docs;
  final IconData icon;
  final Color color;

  const _SchemeInfo({
    required this.name,
    required this.description,
    required this.docs,
    required this.icon,
    required this.color,
  });
}

class _FormInfo {
  final String name;
  final List<String> fields;
  final List<String> docsNeeded;
  final String submitAt;

  const _FormInfo({
    required this.name,
    required this.fields,
    required this.docsNeeded,
    required this.submitAt,
  });
}
