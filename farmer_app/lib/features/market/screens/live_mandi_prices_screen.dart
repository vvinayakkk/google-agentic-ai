import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shimmer/shimmer.dart';

import '../../../core/utils/app_cache.dart';
import '../../../shared/services/live_market_service.dart';
import '../../../shared/models/live_market_model.dart';

/// Real-time mandi prices from data.gov.in with MSP comparison.
class LiveMandiPricesScreen extends ConsumerStatefulWidget {
  const LiveMandiPricesScreen({super.key});

  @override
  ConsumerState<LiveMandiPricesScreen> createState() =>
      _LiveMandiPricesScreenState();
}

class _LiveMandiPricesScreenState
    extends ConsumerState<LiveMandiPricesScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  // Filters
  String? _selectedState;
  String? _selectedCommodity;
  List<String> _states = [];
  List<String> _commodities = [];

  // Data
  List<LivePrice> _prices = [];
  Map<String, MspPrice> _mspPrices = {};
  bool _loadingPrices = false;
  bool _loadingFilters = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
    _loadFilters();
    _loadMsp();
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadFilters() async {
    // Try cache
    final cachedStates = await AppCache.get('live_market_states');
    final cachedComm = await AppCache.get('live_market_commodities');
    if (cachedStates != null && cachedComm != null) {
      if (!mounted) return;
      setState(() {
        _states = (cachedStates as List).cast<String>();
        _commodities = (cachedComm as List).cast<String>();
        _loadingFilters = false;
      });
      return;
    }

    try {
      final svc = ref.read(liveMarketServiceProvider);
      final results = await Future.wait([
        svc.getStates(),
        svc.getCommodities(),
      ]);
      if (mounted) {
        await AppCache.put('live_market_states', results[0],
            ttlSeconds: 86400);
        await AppCache.put('live_market_commodities', results[1],
            ttlSeconds: 86400);
        setState(() {
          _states = results[0];
          _commodities = results[1];
          _loadingFilters = false;
        });
      }
    } catch (e) {
      // Provide fallback data
      if (!mounted) return;
      setState(() {
        _states = [
          'Uttar Pradesh', 'Maharashtra', 'Punjab', 'Haryana',
          'Madhya Pradesh', 'Rajasthan', 'Gujarat', 'Karnataka',
          'Tamil Nadu', 'Andhra Pradesh', 'West Bengal', 'Bihar',
        ];
        _commodities = [
          'Wheat', 'Rice', 'Maize', 'Potato', 'Onion', 'Tomato',
          'Cotton', 'Soyabean', 'Sugarcane', 'Mustard',
        ];
        _loadingFilters = false;
      });
    }
  }

  Future<void> _loadMsp() async {
    final cached = await AppCache.get('msp_all');
    if (cached != null) {
      if (!mounted) return;
      setState(() {
        _mspPrices = (cached as Map<String, dynamic>)
            .map((k, v) => MapEntry(k, MspPrice.fromJson(k, v)));
      });
      return;
    }
    try {
      final svc = ref.read(liveMarketServiceProvider);
      final resp = await svc.getAllMsp();
      final msp = resp['msp_prices'] ?? resp;
      if (msp is Map<String, dynamic>) {
        await AppCache.put('msp_all', msp, ttlSeconds: 86400);
        if (!mounted) return;
        setState(() {
          _mspPrices =
              msp.map((k, v) => MapEntry(k, MspPrice.fromJson(k, v)));
        });
      }
    } catch (_) {}
  }

  Future<void> _searchPrices() async {
    if (_selectedState == null && _selectedCommodity == null) return;
    Haptics.medium();
    setState(() {
      _loadingPrices = true;
      _error = null;
    });

    try {
      final svc = ref.read(liveMarketServiceProvider);
      final resp = await svc.getLivePrices(
        state: _selectedState,
        commodity: _selectedCommodity,
        limit: 200,
      );
      final list = (resp['prices'] as List<dynamic>?)
              ?.map((e) => LivePrice.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [];
      if (!mounted) return;
      setState(() {
        _prices = list;
        _loadingPrices = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loadingPrices = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Live Mandi Prices'),
        bottom: TabBar(
          controller: _tabCtrl,
          tabs: const [
            Tab(icon: Icon(Icons.trending_up), text: 'Live Prices'),
            Tab(icon: Icon(Icons.price_check), text: 'MSP Rates'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: [
          _buildLivePricesTab(theme, cs),
          _buildMspTab(theme, cs),
        ],
      ),
    );
  }

  // ── Tab 1: Live Prices ────────────────────────────────────

  Widget _buildLivePricesTab(ThemeData theme, ColorScheme cs) {
    return Column(
      children: [
        // Filters
        Container(
          padding: const EdgeInsets.all(12),
          color: cs.surfaceContainerHighest.withValues(alpha: 0.3),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: _loadingFilters
                        ? const LinearProgressIndicator()
                        : DropdownButtonFormField<String>(
                            value: _selectedState,
                            decoration: const InputDecoration(
                              labelText: 'State',
                              contentPadding: EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 10),
                              border: OutlineInputBorder(),
                              isDense: true,
                            ),
                            items: _states
                                .map((s) =>
                                    DropdownMenuItem(value: s, child: Text(s, overflow: TextOverflow.ellipsis)))
                                .toList(),
                            onChanged: (v) {
                              Haptics.selection();
                              setState(() => _selectedState = v);
                            },
                          ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _loadingFilters
                        ? const LinearProgressIndicator()
                        : DropdownButtonFormField<String>(
                            value: _selectedCommodity,
                            decoration: const InputDecoration(
                              labelText: 'Crop',
                              contentPadding: EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 10),
                              border: OutlineInputBorder(),
                              isDense: true,
                            ),
                            items: _commodities
                                .map((c) =>
                                    DropdownMenuItem(value: c, child: Text(c, overflow: TextOverflow.ellipsis)))
                                .toList(),
                            onChanged: (v) {
                              Haptics.selection();
                              setState(() => _selectedCommodity = v);
                            },
                          ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _loadingPrices ? null : _searchPrices,
                  icon: _loadingPrices
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child:
                              CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.search),
                  label:
                      Text(_loadingPrices ? 'Searching...' : 'Search Prices'),
                ),
              ),
            ],
          ),
        ),

        // Results
        Expanded(
          child: _buildPricesList(theme, cs),
        ),
      ],
    );
  }

  Widget _buildPricesList(ThemeData theme, ColorScheme cs) {
    if (_loadingPrices) {
      return Shimmer.fromColors(
        baseColor: Colors.grey[300]!,
        highlightColor: Colors.grey[100]!,
        child: ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: 10,
          itemBuilder: (_, _) => Container(
            height: 72,
            margin: const EdgeInsets.only(bottom: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        ),
      );
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.wifi_off, size: 48, color: Colors.grey),
            const SizedBox(height: 16),
            const Text('Failed to load prices'),
            FilledButton(onPressed: _searchPrices, child: const Text('Retry')),
          ],
        ),
      );
    }

    if (_prices.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.search, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text('Select state or crop and search',
                style: theme.textTheme.bodyLarge),
            const SizedBox(height: 4),
            Text('Real-time data from data.gov.in',
                style: theme.textTheme.bodySmall),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _searchPrices,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: _prices.length,
        itemBuilder: (ctx, idx) {
          final p = _prices[idx];
          final msp = _mspPrices[p.commodity];
          final aboveMsp = msp != null && p.modalPrice != null
              ? p.modalPrice! >= msp.price
              : null;

          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          p.commodity,
                          style: theme.textTheme.titleSmall
                              ?.copyWith(fontWeight: FontWeight.bold),
                        ),
                      ),
                      if (aboveMsp != null)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: aboveMsp
                                ? Colors.green.shade50
                                : Colors.red.shade50,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            aboveMsp ? '↑ Above MSP' : '↓ Below MSP',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: aboveMsp ? Colors.green : Colors.red,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '${p.market}, ${p.district}',
                    style: theme.textTheme.bodySmall?.copyWith(
                        color: Colors.grey[600]),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      _priceChip('Min', p.minPrice, Colors.orange),
                      const SizedBox(width: 8),
                      _priceChip('Modal', p.modalPrice, cs.primary),
                      const SizedBox(width: 8),
                      _priceChip('Max', p.maxPrice, Colors.green),
                    ],
                  ),
                  if (p.arrivalDate != null) ...[
                    const SizedBox(height: 4),
                    Text(p.arrivalDate!,
                        style: theme.textTheme.bodySmall
                            ?.copyWith(color: Colors.grey)),
                  ],
                ],
              ),
            ),
          ).animate().fadeIn(delay: (20 * idx).ms, duration: 200.ms);
        },
      ),
    );
  }

  Widget _priceChip(String label, double? price, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Text(label,
              style: TextStyle(fontSize: 10, color: color)),
          Text(
            price != null ? '₹${price.toStringAsFixed(0)}' : '-',
            style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14,
                color: color),
          ),
        ],
      ),
    );
  }

  // ── Tab 2: MSP Rates ──────────────────────────────────────

  Widget _buildMspTab(ThemeData theme, ColorScheme cs) {
    if (_mspPrices.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    final entries = _mspPrices.entries.toList()
      ..sort((a, b) => a.key.compareTo(b.key));

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: entries.length,
      itemBuilder: (ctx, idx) {
        final msp = entries[idx].value;
        return Card(
          margin: const EdgeInsets.only(bottom: 6),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: cs.primaryContainer,
              child: Text(msp.crop[0],
                  style: TextStyle(
                      color: cs.onPrimaryContainer,
                      fontWeight: FontWeight.bold)),
            ),
            title: Text(msp.crop),
            trailing: Text(
              '₹${msp.price.toStringAsFixed(0)}/qtl',
              style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: cs.primary),
            ),
          ),
        ).animate().fadeIn(delay: (20 * idx).ms, duration: 200.ms);
      },
    );
  }
}
