import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/services/agent_service.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/app_button.dart';

/// UPI Education + Payment Guide for Farmers.
/// Multi-tab: Learn → Apps → Safety → Govt Benefits → FAQ
class UpiScreen extends ConsumerStatefulWidget {
  const UpiScreen({super.key});

  @override
  ConsumerState<UpiScreen> createState() => _UpiScreenState();
}

class _UpiScreenState extends ConsumerState<UpiScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  String? _aiResponse;
  bool _loading = false;
  int _learnStep = 0;

  static const _upiApps = <_UpiApp>[
    _UpiApp(name: 'Google Pay', package: 'com.google.android.apps.nbu.paisa.user', icon: Icons.account_balance_wallet_rounded, color: Color(0xFF4285F4), url: 'https://pay.google.com', desc: 'Google\'s UPI app. Easy to use, works with any bank.'),
    _UpiApp(name: 'PhonePe', package: 'com.phonepe.app', icon: Icons.phone_android_rounded, color: Color(0xFF5F259F), url: 'https://www.phonepe.com', desc: 'Popular in India. Supports recharges, bills & investments.'),
    _UpiApp(name: 'Paytm', package: 'net.one97.paytm', icon: Icons.account_balance_wallet_rounded, color: Color(0xFF00B9F5), url: 'https://paytm.com', desc: 'Wallet + UPI. Accepts payments at local shops.'),
    _UpiApp(name: 'BHIM', package: 'in.org.npci.upiapp', icon: Icons.currency_rupee_rounded, color: Color(0xFF00838F), url: 'https://www.bhimupi.org.in', desc: 'Government app by NPCI. Simple, safe, no clutter.'),
    _UpiApp(name: 'Amazon Pay', package: 'in.amazon.mShop.android.shopping', icon: Icons.shopping_bag_rounded, color: Color(0xFFFF9900), url: 'https://www.amazon.in/amazonpay', desc: 'Amazon\'s UPI. Earn cashback on purchases.'),
    _UpiApp(name: 'WhatsApp Pay', package: 'com.whatsapp', icon: Icons.chat_rounded, color: Color(0xFF25D366), url: 'https://www.whatsapp.com/payments', desc: 'Send money to contacts directly in WhatsApp.'),
  ];

  static const _learnSteps = <_LearnStep>[
    _LearnStep(title: 'What is UPI?', icon: Icons.help_outline_rounded, content: 'UPI (Unified Payments Interface) lets you send and receive money instantly using your phone. No need for cash or cheques!\n\n• Works 24/7, including holidays\n• Free for all transactions\n• Secure with UPI PIN\n• Government of India approved'),
    _LearnStep(title: 'What You Need', icon: Icons.checklist_rounded, content: 'To start using UPI, you need:\n\n✅ An Android or iPhone\n✅ A bank account with your phone number linked\n✅ An active mobile number registered with your bank\n✅ Internet connection (Wi-Fi or mobile data)\n✅ Debit card details (for first-time setup)'),
    _LearnStep(title: 'How to Set Up', icon: Icons.app_settings_alt_rounded, content: 'Step 1: Download any UPI app (Google Pay, PhonePe, BHIM)\n\nStep 2: Open the app and enter your phone number\n\nStep 3: The app will detect your bank account automatically\n\nStep 4: Verify with OTP sent to your phone\n\nStep 5: Create a 6-digit UPI PIN using your debit card\n\nStep 6: You\'re ready! Your UPI ID is created (e.g. name@upi)'),
    _LearnStep(title: 'How to Send Money', icon: Icons.send_rounded, content: 'Option 1: Using UPI ID\n→ Enter receiver\'s UPI ID → Enter amount → Enter PIN → Done!\n\nOption 2: Using Phone Number\n→ Select contact → Enter amount → Enter PIN → Done!\n\nOption 3: Scan QR Code\n→ Scan the QR → Amount auto-fills → Enter PIN → Done!\n\n💡 Tip: Always verify the name before sending money.'),
    _LearnStep(title: 'How to Receive Money', icon: Icons.call_received_rounded, content: 'Share your UPI ID or QR code with the sender.\n\n• Your UPI ID is like: yourname@ybl or 9876543210@upi\n• Show your QR code available in the app\n• You can also request money from someone\n\n💡 Money appears in your bank account instantly!\n💡 No extra charges. Completely free.'),
    _LearnStep(title: 'For Farm Payments', icon: Icons.agriculture_rounded, content: 'Farmers can use UPI for:\n\n🌾 Selling crops — receive payments from traders\n🚜 Equipment rental — pay/receive rental fees\n🏪 Buying seeds, fertilizers at local shops\n💰 Receiving PM-KISAN & government subsidies\n📱 Paying electricity & water bills\n🏦 Loan EMI payments to banks\n\n💡 Keep your UPI PIN secret. Never share it with anyone!'),
  ];

  static const _safetyTips = <_SafetyTip>[
    _SafetyTip(icon: Icons.lock_rounded, title: 'Never share your UPI PIN', desc: 'Your PIN is like your ATM PIN. No bank or company will ask for it.', color: AppColors.danger),
    _SafetyTip(icon: Icons.qr_code_scanner_rounded, title: 'Scan only trusted QR codes', desc: 'Fraudsters can create fake QR codes. Verify the name before paying.', color: AppColors.warning),
    _SafetyTip(icon: Icons.phone_callback_rounded, title: 'Ignore unknown payment requests', desc: 'Don\'t accept collect requests from strangers.', color: AppColors.info),
    _SafetyTip(icon: Icons.verified_user_rounded, title: 'Check the receiver name', desc: 'Before confirming payment, always verify the receiver\'s name shown.', color: AppColors.success),
    _SafetyTip(icon: Icons.refresh_rounded, title: 'No PIN needed to receive money', desc: 'If someone asks your PIN to "send" you money, it\'s a scam!', color: AppColors.danger),
    _SafetyTip(icon: Icons.support_agent_rounded, title: 'Use official helplines only', desc: 'If stuck, contact your bank or app\'s official customer care.', color: AppColors.primary),
  ];

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 5, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchAiContent(String prompt) async {
    setState(() { _loading = true; _aiResponse = null; });
    try {
      final response = await ref.read(agentServiceProvider).chat(message: prompt, language: context.locale.languageCode);
      setState(() { _aiResponse = response['response'] as String? ?? ''; _loading = false; });
    } catch (e) {
      setState(() => _loading = false);
      if (mounted) context.showSnack(e.toString(), isError: true);
    }
  }

  Future<void> _launchApp(_UpiApp app) async {
    final uri = Uri.parse(app.url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (mounted) context.showSnack('${app.name} - ${'common.error'.tr()}', isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('upi.title'.tr()),
        bottom: TabBar(
          controller: _tabCtrl,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          labelColor: AppColors.primary,
          indicatorColor: AppColors.primary,
          tabs: const [
            Tab(icon: Icon(Icons.school_rounded, size: 18), text: 'Learn UPI'),
            Tab(icon: Icon(Icons.apps_rounded, size: 18), text: 'UPI Apps'),
            Tab(icon: Icon(Icons.security_rounded, size: 18), text: 'Safety'),
            Tab(icon: Icon(Icons.account_balance_rounded, size: 18), text: 'Govt Benefits'),
            Tab(icon: Icon(Icons.question_answer_rounded, size: 18), text: 'FAQ'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: [_buildLearnTab(), _buildAppsTab(), _buildSafetyTab(), _buildGovtTab(), _buildFaqTab()],
      ),
    );
  }

  // ═══════════ TAB 1 — Learn UPI (Step-by-Step) ═══════════

  Widget _buildLearnTab() {
    final step = _learnSteps[_learnStep];
    return ListView(
      padding: AppSpacing.allLg,
      children: [
        Row(
          children: List.generate(_learnSteps.length, (i) => Expanded(
            child: Container(
              height: 4,
              margin: const EdgeInsets.symmetric(horizontal: 2),
              decoration: BoxDecoration(
                color: i <= _learnStep ? AppColors.primary : AppColors.primary.withValues(alpha: 0.15),
                borderRadius: AppRadius.fullAll,
              ),
            ),
          )),
        ),
        const SizedBox(height: AppSpacing.sm),
        Text('Step ${_learnStep + 1} of ${_learnSteps.length}', textAlign: TextAlign.center, style: context.textTheme.labelSmall?.copyWith(color: context.appColors.textSecondary)),
        const SizedBox(height: AppSpacing.xl),
        Container(
          padding: AppSpacing.allXl,
          decoration: BoxDecoration(
            gradient: LinearGradient(colors: [AppColors.primary.withValues(alpha: 0.08), AppColors.primaryLight.withValues(alpha: 0.04)], begin: Alignment.topLeft, end: Alignment.bottomRight),
            borderRadius: AppRadius.lgAll,
            border: Border.all(color: AppColors.primary.withValues(alpha: 0.15)),
          ),
          child: Column(
            children: [
              Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.12), shape: BoxShape.circle), child: Icon(step.icon, size: 36, color: AppColors.primary)),
              const SizedBox(height: AppSpacing.lg),
              Text(step.title, style: context.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold, color: AppColors.primaryDark)),
              const SizedBox(height: AppSpacing.lg),
              Text(step.content, style: context.textTheme.bodyMedium?.copyWith(height: 1.6)),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.xl),
        Row(
          children: [
            if (_learnStep > 0) Expanded(
              child: OutlinedButton.icon(
                icon: const Icon(Icons.arrow_back_rounded),
                label: Text('common.previous'.tr()),
                style: OutlinedButton.styleFrom(foregroundColor: AppColors.primary, side: const BorderSide(color: AppColors.primary), padding: const EdgeInsets.symmetric(vertical: AppSpacing.md)),
                onPressed: () => setState(() => _learnStep--),
              ),
            ),
            if (_learnStep > 0) const SizedBox(width: AppSpacing.md),
            Expanded(
              child: ElevatedButton.icon(
                icon: Icon(_learnStep < _learnSteps.length - 1 ? Icons.arrow_forward_rounded : Icons.check_rounded),
                label: Text(_learnStep < _learnSteps.length - 1 ? 'common.next'.tr() : 'common.done'.tr()),
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: AppSpacing.md)),
                onPressed: () { if (_learnStep < _learnSteps.length - 1) { setState(() => _learnStep++); } else { _tabCtrl.animateTo(1); } },
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.xl),
      ],
    );
  }

  // ═══════════ TAB 2 — UPI Apps ═══════════

  Widget _buildAppsTab() {
    return ListView(
      padding: AppSpacing.allLg,
      children: [
        Container(
          padding: AppSpacing.allXl,
          decoration: BoxDecoration(gradient: const LinearGradient(colors: [AppColors.primary, AppColors.primaryDark], begin: Alignment.topLeft, end: Alignment.bottomRight), borderRadius: AppRadius.lgAll),
          child: Column(
            children: [
              const Icon(Icons.apps_rounded, color: Colors.white, size: 36),
              const SizedBox(height: AppSpacing.md),
              Text('Popular UPI Apps in India', style: context.textTheme.titleLarge?.copyWith(color: Colors.white, fontWeight: FontWeight.bold)),
              const SizedBox(height: AppSpacing.xs),
              Text('Tap any app to download or open it', style: context.textTheme.bodyMedium?.copyWith(color: Colors.white70)),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.xl),
        ..._upiApps.map((app) => Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.md),
          child: AppCard(
            padding: AppSpacing.allMd,
            onTap: () => _launchApp(app),
            child: Row(
              children: [
                Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: app.color.withValues(alpha: 0.1), borderRadius: AppRadius.mdAll), child: Icon(app.icon, color: app.color, size: 28)),
                const SizedBox(width: AppSpacing.lg),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(app.name, style: context.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text(app.desc, style: context.textTheme.bodySmall?.copyWith(color: context.appColors.textSecondary)),
                ])),
                Icon(Icons.open_in_new_rounded, color: app.color, size: 20),
              ],
            ),
          ),
        )),
        const SizedBox(height: AppSpacing.xl),
      ],
    );
  }

  // ═══════════ TAB 3 — Safety ═══════════

  Widget _buildSafetyTab() {
    return ListView(
      padding: AppSpacing.allLg,
      children: [
        Container(
          padding: AppSpacing.allLg,
          decoration: BoxDecoration(color: AppColors.danger.withValues(alpha: 0.08), borderRadius: AppRadius.lgAll, border: Border.all(color: AppColors.danger.withValues(alpha: 0.2))),
          child: Row(
            children: [
              const Icon(Icons.shield_rounded, color: AppColors.danger, size: 32),
              const SizedBox(width: AppSpacing.md),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Protect Yourself from UPI Fraud', style: context.textTheme.titleMedium?.copyWith(color: AppColors.danger, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text('Follow these tips to keep your money safe', style: context.textTheme.bodySmall?.copyWith(color: AppColors.danger.withValues(alpha: 0.8))),
              ])),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.xl),
        ..._safetyTips.map((tip) => Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.md),
          child: AppCard(
            padding: AppSpacing.allMd,
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: tip.color.withValues(alpha: 0.1), borderRadius: AppRadius.smAll), child: Icon(tip.icon, color: tip.color, size: 22)),
              const SizedBox(width: AppSpacing.md),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(tip.title, style: context.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(tip.desc, style: context.textTheme.bodySmall?.copyWith(color: context.appColors.textSecondary, height: 1.4)),
              ])),
            ]),
          ),
        )),
        const SizedBox(height: AppSpacing.md),
        AppCard(
          color: AppColors.warning.withValues(alpha: 0.08),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('⚠️ If You Are Scammed:', style: context.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold, color: AppColors.warning)),
            const SizedBox(height: AppSpacing.md),
            _emergRow('1.', 'Call your bank immediately to block UPI'),
            _emergRow('2.', 'Report on https://cybercrime.gov.in'),
            _emergRow('3.', 'Call Cyber Crime Helpline: 1930'),
            _emergRow('4.', 'File complaint in the UPI app under Help'),
          ]),
        ),
        const SizedBox(height: AppSpacing.xl),
      ],
    );
  }

  Widget _emergRow(String n, String t) => Padding(
    padding: const EdgeInsets.only(bottom: AppSpacing.sm),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(n, style: context.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.bold)),
      const SizedBox(width: AppSpacing.sm),
      Expanded(child: Text(t, style: context.textTheme.bodyMedium)),
    ]),
  );

  // ═══════════ TAB 4 — Govt Benefits ═══════════

  Widget _buildGovtTab() {
    return ListView(
      padding: AppSpacing.allLg,
      children: [
        Container(
          padding: AppSpacing.allXl,
          decoration: BoxDecoration(gradient: LinearGradient(colors: [AppColors.success.withValues(alpha: 0.15), AppColors.primary.withValues(alpha: 0.08)], begin: Alignment.topLeft, end: Alignment.bottomRight), borderRadius: AppRadius.lgAll),
          child: Column(children: [
            const Icon(Icons.account_balance_rounded, color: AppColors.primaryDark, size: 36),
            const SizedBox(height: AppSpacing.md),
            Text('Government Benefits via UPI', style: context.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold, color: AppColors.primaryDark)),
            const SizedBox(height: AppSpacing.sm),
            Text('Receive subsidies & payments directly to your bank', textAlign: TextAlign.center, style: context.textTheme.bodyMedium?.copyWith(color: context.appColors.textSecondary)),
          ]),
        ),
        const SizedBox(height: AppSpacing.xl),
        _schemeCard('PM-KISAN Samman Nidhi', '₹6,000/year directly to your bank account', 'Link Aadhaar → Bank → UPI to receive installments', Icons.agriculture_rounded, AppColors.success),
        _schemeCard('PM Fasal Bima Yojana', 'Crop insurance claim settlements via bank/UPI', 'Register at your bank with crop & land details', Icons.verified_rounded, AppColors.info),
        _schemeCard('Kisan Credit Card (KCC)', 'UPI-enabled credit card for farm expenses', 'Apply at bank → Get card → Link to UPI', Icons.credit_card_rounded, AppColors.primary),
        _schemeCard('Direct Benefit Transfer (DBT)', 'All govt subsidies transferred directly to bank', 'Ensure Aadhaar is linked to your bank account', Icons.payments_rounded, AppColors.warning),
        const SizedBox(height: AppSpacing.lg),
        AppButton(
          label: 'Ask AI for Detailed Guide',
          icon: Icons.smart_toy_rounded,
          isLoading: _loading,
          onPressed: _loading ? null : () => _fetchAiContent('How can Indian farmers receive government subsidies and PM-KISAN payments via UPI? Include complete registration, Aadhaar linking, bank linking process for KCC, PMFBY, DBT. Answer in simple language for farmers.'),
        ),
        if (_aiResponse != null && _aiResponse!.isNotEmpty) ...[const SizedBox(height: AppSpacing.lg), _aiCard(_aiResponse!)],
        const SizedBox(height: AppSpacing.xl),
      ],
    );
  }

  Widget _schemeCard(String title, String sub, String action, IconData icon, Color color) => Padding(
    padding: const EdgeInsets.only(bottom: AppSpacing.md),
    child: AppCard(padding: AppSpacing.allMd, child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: AppRadius.smAll), child: Icon(icon, color: color, size: 24)),
      const SizedBox(width: AppSpacing.md),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: context.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Text(sub, style: context.textTheme.bodySmall?.copyWith(color: color)),
        const SizedBox(height: 6),
        Text(action, style: context.textTheme.bodySmall?.copyWith(color: context.appColors.textSecondary, height: 1.4)),
      ])),
    ])),
  );

  // ═══════════ TAB 5 — FAQ ═══════════

  Widget _buildFaqTab() {
    final faqs = <_FaqItem>[
      _FaqItem(q: 'What if my UPI transaction fails but money is deducted?', p: 'My UPI payment failed but money was deducted. What should I do? Step-by-step solution for farmers.'),
      _FaqItem(q: 'How to change my UPI PIN?', p: 'How to change or reset UPI PIN? Give steps for all major apps.'),
      _FaqItem(q: 'Is there a limit on UPI transactions?', p: 'What are UPI transaction limits? Daily, per transaction, monthly for all apps.'),
      _FaqItem(q: 'Can I use UPI without internet?', p: 'Can I use UPI without internet? Tell about *99# USSD method.'),
      _FaqItem(q: 'How to check UPI transaction history?', p: 'How to check UPI transaction history and download statement?'),
      _FaqItem(q: 'What if I send money to the wrong person?', p: 'Sent money to wrong UPI ID. How to get it back? Step by step.'),
    ];
    return ListView(
      padding: AppSpacing.allLg,
      children: [
        Text('Frequently Asked Questions', style: context.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: AppSpacing.sm),
        Text('Tap any question to get a detailed AI answer', style: context.textTheme.bodyMedium?.copyWith(color: context.appColors.textSecondary)),
        const SizedBox(height: AppSpacing.xl),
        ...faqs.map((faq) => Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.md),
          child: AppCard(
            padding: AppSpacing.allMd,
            onTap: () => _fetchAiContent(faq.p),
            child: Row(children: [
              Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.1), shape: BoxShape.circle), child: const Icon(Icons.help_outline_rounded, color: AppColors.primary, size: 20)),
              const SizedBox(width: AppSpacing.md),
              Expanded(child: Text(faq.q, style: context.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w500))),
              const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppColors.primary),
            ]),
          ),
        )),
        if (_loading) const Center(child: Padding(padding: AppSpacing.allXl, child: CircularProgressIndicator(color: AppColors.primary)))
        else if (_aiResponse != null && _aiResponse!.isNotEmpty) ...[const SizedBox(height: AppSpacing.md), _aiCard(_aiResponse!)],
        const SizedBox(height: AppSpacing.xl),
      ],
    );
  }

  Widget _aiCard(String content) => AppCard(
    color: AppColors.primary.withValues(alpha: 0.05),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        const Icon(Icons.smart_toy_rounded, color: AppColors.primary, size: 20),
        const SizedBox(width: AppSpacing.sm),
        Text('AI Answer', style: context.textTheme.titleSmall?.copyWith(color: AppColors.primary)),
      ]),
      const SizedBox(height: AppSpacing.md),
      MarkdownBody(data: content, selectable: true, styleSheet: MarkdownStyleSheet.fromTheme(context.theme).copyWith(p: context.textTheme.bodyMedium, h1: context.textTheme.titleLarge, h2: context.textTheme.titleMedium)),
    ]),
  );
}

class _UpiApp { final String name, package, url, desc; final IconData icon; final Color color; const _UpiApp({required this.name, required this.package, required this.icon, required this.color, required this.url, required this.desc}); }
class _LearnStep { final String title, content; final IconData icon; const _LearnStep({required this.title, required this.icon, required this.content}); }
class _SafetyTip { final IconData icon; final String title, desc; final Color color; const _SafetyTip({required this.icon, required this.title, required this.desc, required this.color}); }
class _FaqItem { final String q, p; const _FaqItem({required this.q, required this.p}); }
