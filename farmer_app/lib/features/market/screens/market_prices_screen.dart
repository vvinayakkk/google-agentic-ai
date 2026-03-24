import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_markdown/flutter_markdown.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/services/market_service.dart';
import '../../../shared/services/agent_service.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_overlay.dart';

class MarketPricesScreen extends ConsumerStatefulWidget {
  const MarketPricesScreen({super.key});

  @override
  ConsumerState<MarketPricesScreen> createState() =>
      _MarketPricesScreenState();
}

class _MarketPricesScreenState extends ConsumerState<MarketPricesScreen> {
  final _searchController = TextEditingController();
  bool _loading = false;
  String? _error;
  List<Map<String, dynamic>> _prices = [];
  String? _selectedChip;

  static const _cropChips = [
    'Rice',
    'Wheat',
    'Cotton',
    'Soybean',
    'Sugarcane',
  ];

  @override
  void initState() {
    super.initState();
    _fetchPrices();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchPrices() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ref
          .read(marketServiceProvider)
          .listPrices(crop: _selectedChip);
      final items = (res['items'] as List<dynamic>?)
              ?.cast<Map<String, dynamic>>() ??
          [];
      setState(() {
        _prices = items;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  List<Map<String, dynamic>> get _filtered {
    final q = _searchController.text.trim().toLowerCase();
    if (q.isEmpty) return _prices;
    return _prices
        .where((p) =>
            (p['crop_name']?.toString() ?? '').toLowerCase().contains(q) ||
            (p['market']?.toString() ?? '').toLowerCase().contains(q))
        .toList();
  }

  void _selectChip(String label) {
    setState(() {
      _selectedChip = _selectedChip == label ? null : label;
    });
    _fetchPrices();
  }

  void _showTrendSheet(Map<String, dynamic> price) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius:
            BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
      ),
      builder: (_) => _TrendSheet(
        price: price,
        agentService: ref.read(agentServiceProvider),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final items = _filtered;

    return Scaffold(
      appBar: AppBar(title: Text('market_prices.title'.tr())),
      body: Column(
        children: [
          // ── Search ──
          Padding(
            padding: const EdgeInsets.fromLTRB(
                AppSpacing.lg, AppSpacing.md, AppSpacing.lg, 0),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'market_prices.search_hint'.tr(),
                prefixIcon: const Icon(Icons.search),
              ),
              onChanged: (_) => setState(() {}),
            ),
          ),

          // ── Filter chips ──
          SizedBox(
            height: 52,
            child: ListView.separated(
              padding: AppSpacing.hLg,
              scrollDirection: Axis.horizontal,
              itemCount: _cropChips.length,
              separatorBuilder: (_, _) =>
                  const SizedBox(width: AppSpacing.sm),
              itemBuilder: (_, i) {
                final label = _cropChips[i];
                final selected = _selectedChip == label;
                return FilterChip(
                  label: Text(label),
                  selected: selected,
                  onSelected: (_) => _selectChip(label),
                  selectedColor: AppColors.primary.withValues(alpha: 0.15),
                  checkmarkColor: AppColors.primary,
                );
              },
            ),
          ),

          const SizedBox(height: AppSpacing.sm),

          // ── Content ──
          Expanded(
            child: _loading
                ? const LoadingState(itemCount: 8)
                : _error != null
                    ? ErrorView(message: _error!, onRetry: _fetchPrices)
                    : items.isEmpty
                        ? EmptyView(
                            icon: Icons.bar_chart_outlined,
                            title: 'market_prices.no_prices'.tr(),
                          )
                        : RefreshIndicator(
                            onRefresh: _fetchPrices,
                            child: ListView.builder(
                              padding: AppSpacing.hLg,
                              itemCount: items.length,
                              itemBuilder: (_, i) => _PriceRow(
                                price: items[i],
                                index: i,
                                onTap: () => _showTrendSheet(items[i]),
                              ),
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
//  AI Trend Analysis Bottom Sheet
// ═══════════════════════════════════════════════════════════════

class _TrendSheet extends StatefulWidget {
  final Map<String, dynamic> price;
  final AgentService agentService;
  const _TrendSheet({required this.price, required this.agentService});

  @override
  State<_TrendSheet> createState() => _TrendSheetState();
}

class _TrendSheetState extends State<_TrendSheet> {
  String? _aiAnalysis;
  bool _analysisLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchAnalysis();
  }

  Future<void> _fetchAnalysis() async {
    try {
      final crop = widget.price['crop_name'] ?? '';
      final market = widget.price['market'] ?? '';
      final res = await widget.agentService.chat(
        message:
            'Analyze the current market price trend for $crop at $market mandi. '
            'Min price: ${widget.price['min_price']}, '
            'Max price: ${widget.price['max_price']}, '
            'Modal price: ${widget.price['modal_price']}. '
            'Provide a brief price trend analysis, forecast, and recommendations for farmers.',
      );
      if (mounted) {
        setState(() {
          _aiAnalysis = res['response']?.toString() ?? '';
          _analysisLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _aiAnalysis = 'market_prices.error'.tr();
          _analysisLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.price;
    final min = (p['min_price'] as num?)?.toDouble();
    final max = (p['max_price'] as num?)?.toDouble();
    final modal = (p['modal_price'] as num?)?.toDouble();

    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      maxChildSize: 0.95,
      minChildSize: 0.4,
      expand: false,
      builder: (_, scrollController) => SingleChildScrollView(
        controller: scrollController,
        padding: AppSpacing.allXl,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: AppSpacing.lg),
                decoration: BoxDecoration(
                  color: context.appColors.border,
                  borderRadius: AppRadius.fullAll,
                ),
              ),
            ),
            Text(
              '${p['crop_name'] ?? '-'} – ${'market_prices.trends'.tr()}',
              style: context.textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: AppSpacing.lg),
            _infoRow(context, 'market_prices.mandi'.tr(),
                p['market']?.toString() ?? '-'),
            _infoRow(context, 'market_prices.state'.tr(),
                p['state']?.toString() ?? '-'),
            _infoRow(
                context, 'market_prices.min_price'.tr(), min?.inr ?? '-'),
            _infoRow(
                context, 'market_prices.max_price'.tr(), max?.inr ?? '-'),
            _infoRow(context, 'market_prices.modal_price'.tr(),
                modal?.inr ?? '-'),
            const SizedBox(height: AppSpacing.xl),
            Text(
              'market_prices.trends'.tr(),
              style: context.textTheme.titleSmall
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: AppSpacing.md),
            if (_analysisLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(AppSpacing.xl),
                  child:
                      CircularProgressIndicator(color: AppColors.primary),
                ),
              )
            else if (_aiAnalysis != null)
              AppCard(
                child: MarkdownBody(
                  data: _aiAnalysis!,
                  selectable: true,
                  styleSheet: MarkdownStyleSheet(
                    p: context.textTheme.bodyMedium,
                    h1: context.textTheme.titleLarge,
                    h2: context.textTheme.titleMedium,
                    h3: context.textTheme.titleSmall,
                  ),
                ),
              ),
            const SizedBox(height: AppSpacing.lg),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(BuildContext context, String label, String value) =>
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          children: [
            SizedBox(
              width: 110,
              child: Text(label,
                  style: context.textTheme.bodySmall
                      ?.copyWith(color: context.appColors.textSecondary)),
            ),
            Expanded(
              child: Text(value,
                  style: context.textTheme.bodyMedium
                      ?.copyWith(fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      );
}

// ═══════════════════════════════════════════════════════════════
//  Price Row
// ═══════════════════════════════════════════════════════════════

class _PriceRow extends StatelessWidget {
  final Map<String, dynamic> price;
  final int index;
  final VoidCallback onTap;

  const _PriceRow({
    required this.price,
    required this.index,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isAlt = index.isOdd;
    final min = (price['min_price'] as num?)?.toDouble();
    final max = (price['max_price'] as num?)?.toDouble();
    final modal = (price['modal_price'] as num?)?.toDouble();
    final dateStr = price['date']?.toString();
    final date = dateStr != null ? DateTime.tryParse(dateStr) : null;

    return InkWell(
      onTap: onTap,
      borderRadius: AppRadius.smAll,
      child: Container(
        padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md, vertical: AppSpacing.md),
        decoration: BoxDecoration(
          color: isAlt
              ? context.appColors.card
              : context.appColors.card.withValues(alpha: 0.5),
          border: Border(
            bottom:
                BorderSide(color: context.appColors.border, width: 0.5),
          ),
        ),
        child: Row(
          children: [
            // Crop + market
            Expanded(
              flex: 3,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    price['crop_name']?.toString() ?? '-',
                    style: context.textTheme.titleSmall
                        ?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  if (price['market'] != null)
                    Text(
                      price['market'].toString(),
                      style: context.textTheme.bodySmall?.copyWith(
                        color: context.appColors.textSecondary,
                        fontSize: 11,
                      ),
                    ),
                ],
              ),
            ),
            // Min
            Expanded(
              flex: 2,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('market_prices.min_price'.tr(),
                      style: context.textTheme.bodySmall?.copyWith(
                          color: context.appColors.textSecondary,
                          fontSize: 10)),
                  Text(min?.inr ?? '-',
                      style: context.textTheme.bodySmall
                          ?.copyWith(fontWeight: FontWeight.w600)),
                ],
              ),
            ),
            // Max
            Expanded(
              flex: 2,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('market_prices.max_price'.tr(),
                      style: context.textTheme.bodySmall?.copyWith(
                          color: context.appColors.textSecondary,
                          fontSize: 10)),
                  Text(max?.inr ?? '-',
                      style: context.textTheme.bodySmall
                          ?.copyWith(fontWeight: FontWeight.w600)),
                ],
              ),
            ),
            // Modal
            Expanded(
              flex: 2,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('market_prices.modal_price'.tr(),
                      style: context.textTheme.bodySmall?.copyWith(
                          color: context.appColors.textSecondary,
                          fontSize: 10)),
                  Text(
                    modal?.inr ?? '-',
                    style: context.textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppColors.success,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: AppSpacing.xs),
            if (date != null)
              Text(
                date.shortDate,
                style: context.textTheme.bodySmall?.copyWith(
                  color: context.appColors.textSecondary,
                  fontSize: 10,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
