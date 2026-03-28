import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';
import '../../../shared/services/market_service.dart';
import '../constants.dart';
import '../widgets/market_widgets.dart';

class MarketplaceHomeScreen extends ConsumerStatefulWidget {
  const MarketplaceHomeScreen({super.key});

  @override
  ConsumerState<MarketplaceHomeScreen> createState() =>
      _MarketplaceHomeScreenState();
}

class _MarketplaceHomeScreenState extends ConsumerState<MarketplaceHomeScreen> {
  int _activeTab = 0;
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _insights = const [];
  Map<String, dynamic>? _heroItem;
  bool _showAll = false;

  @override
  void initState() {
    super.initState();
    _fetchInsights();
  }

  Future<void> _fetchInsights() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ref
          .read(marketServiceProvider)
          .listPrices(perPage: _showAll ? 50 : 6);
      final items = (res['items'] as List<dynamic>? ?? [])
          .cast<Map<String, dynamic>>();
      setState(() {
        _insights = items;
        _heroItem = items.isNotEmpty ? items.first : null;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  String _formatPrice(Map<String, dynamic> item) {
    final modal = (item['modal_price'] as num?)?.toDouble();
    final max = (item['max_price'] as num?)?.toDouble();
    final min = (item['min_price'] as num?)?.toDouble();
    final value = modal ?? max ?? min;
    if (value == null) return '₹—';
    return '₹${value.toStringAsFixed(0)}/q';
  }

  String _delta(Map<String, dynamic> item) {
    final modal = (item['modal_price'] as num?)?.toDouble();
    final max = (item['max_price'] as num?)?.toDouble();
    if (modal != null && max != null && modal != 0) {
      final pct = ((max - modal) / modal) * 100;
      final sign = pct >= 0 ? '+' : '';
      return '$sign${pct.toStringAsFixed(1)}%';
    }
    return '+1.0%';
  }

  Widget _insightsSection() {
    if (_loading) {
      return Container(
        margin: const EdgeInsets.symmetric(horizontal: 16),
        padding: const EdgeInsets.all(24),
        decoration: MarketDecorations.cardDecor,
        alignment: Alignment.center,
        child: const CircularProgressIndicator(),
      );
    }
    if (_error != null) {
      return Container(
        margin: const EdgeInsets.symmetric(horizontal: 16),
        padding: const EdgeInsets.all(16),
        decoration: MarketDecorations.cardDecor,
        child: Column(
          children: [
            Text(
              'Could not load insights',
              style: GoogleFonts.nunito(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: MarketColors.deltaRed,
              ),
            ),
            const SizedBox(height: 8),
            Text(_error!, style: MarketTextStyles.bodySm),
            const SizedBox(height: 12),
            TextButton(onPressed: _fetchInsights, child: const Text('Retry')),
          ],
        ),
      );
    }
    if (_insights.isEmpty) {
      return Container(
        margin: const EdgeInsets.symmetric(horizontal: 16),
        padding: const EdgeInsets.all(24),
        decoration: MarketDecorations.cardDecor,
        alignment: Alignment.center,
        child: Text('No market prices yet', style: MarketTextStyles.bodySm),
      );
    }
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: MarketDecorations.cardDecor,
      child: Column(
        children: [
          for (
            var i = 0;
            i < _insights.length && (_showAll ? true : i < 3);
            i++
          ) ...[
            InsightRow(
              emoji: i == 0
                  ? '🌾'
                  : i == 1
                  ? '🌽'
                  : '🌱',
              crop: _insights[i]['crop_name']?.toString() ?? 'Crop',
              variety: _insights[i]['market']?.toString() ?? 'Market',
              price: _formatPrice(_insights[i]),
              delta: _delta(_insights[i]),
              isPositive: true,
            ),
            if (_showAll ? i < _insights.length - 1 : i < 2)
              const Divider(height: 1, indent: 64),
          ],
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: MarketColors.bgColor,
      body: SafeArea(
        child: Column(
          children: [
            const KisanTopBar(),
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 16),
                    HeroCard(
                      badge: 'MARKETPLACE',
                      title: 'Krishi Bazaar',
                      subtitle: 'Live mandi signals and your listings',
                      statRow: Row(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'TODAY\'S BEST',
                                style: GoogleFonts.nunito(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white.withOpacity(0.8),
                                  letterSpacing: 1,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                _heroItem != null
                                    ? _formatPrice(_heroItem!)
                                    : '₹—',
                                style: GoogleFonts.nunito(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                ),
                              ),
                              Text(
                                _heroItem?['market']?.toString() ??
                                    'Waiting for prices...',
                                style: GoogleFonts.nunito(
                                  fontSize: 12,
                                  color: Colors.white.withOpacity(0.8),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(width: 12),
                          DeltaBadge(
                            delta: _heroItem != null
                                ? _delta(_heroItem!)
                                : '+1.0%',
                            isPositive: true,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    const KisanSearchBar(
                      hint: 'Search crops, seeds, or equipment...',
                    ),
                    const SizedBox(height: 12),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Row(
                        children: const [
                          FilterPill(
                            icon: Icons.location_on_outlined,
                            label: 'Punjab, Ludhiana',
                          ),
                          SizedBox(width: 8),
                          FilterPill(
                            icon: Icons.category_outlined,
                            label: 'All Categories',
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: TabSwitcher(
                        tabs: const ['Market Prices', 'My Listings'],
                        active: _activeTab,
                        onTap: (i) {
                          if (i == _activeTab) return;
                          setState(() => _activeTab = i);
                          if (i == 1) context.go(RoutePaths.myListings);
                        },
                      ),
                    ),
                    const SizedBox(height: 16),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Row(
                        children: [
                          Text(
                            'Today\'s Insight',
                            style: MarketTextStyles.sectionTitle,
                          ),
                          const Spacer(),
                          TextButton(
                            onPressed: _fetchInsights,
                            child: const Text('Refresh ↻'),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    _insightsSection(),
                    const SizedBox(height: 16),
                    Center(
                      child: TextButton(
                        onPressed: () {
                          setState(() => _showAll = !_showAll);
                          _fetchInsights();
                        },
                        child: Text(
                          _showAll
                              ? 'VIEW FEWER INSIGHTS  ▴'
                              : 'VIEW MORE INSIGHTS  ▾',
                          style: GoogleFonts.nunito(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: MarketColors.primaryGreen,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
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
