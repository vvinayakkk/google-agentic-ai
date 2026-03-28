import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';
import '../../../shared/services/equipment_service.dart';

import '../constants.dart';
import '../widgets/market_widgets.dart';

class MyListingsScreen extends ConsumerStatefulWidget {
  const MyListingsScreen({super.key});

  @override
  ConsumerState<MyListingsScreen> createState() => _MyListingsScreenState();
}

class _MyListingsScreenState extends ConsumerState<MyListingsScreen> {
  int _activeTab = 1;
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _listings = const [];
  String _locationFilter = '';
  final TextEditingController _locationCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchListings();
  }

  @override
  void dispose() {
    _locationCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchListings() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final items = await ref.read(equipmentServiceProvider).listEquipment();
      setState(() {
        _listings = items;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  String _price(Map<String, dynamic> item) {
    final rateDay = (item['rate_per_day'] as num?)?.toDouble();
    final rateHour = (item['rate_per_hour'] as num?)?.toDouble();
    if (rateDay != null) return '₹${rateDay.toStringAsFixed(0)}/day';
    if (rateHour != null) return '₹${rateHour.toStringAsFixed(0)}/hr';
    return '₹—';
  }

  String _quantity(Map<String, dynamic> item) {
    final location = item['location']?.toString();
    return location ?? 'Location not set';
  }

  String _status(Map<String, dynamic> item) {
    final status = item['status']?.toString();
    if (status != null && status.isNotEmpty) return status.toUpperCase();
    final available = item['available'] as bool?;
    return (available ?? true) ? 'ACTIVE' : 'PAUSED';
  }

  Color _statusColor(Map<String, dynamic> item) {
    final s = _status(item);
    if (s == 'PAUSED') return MarketColors.textSecondary;
    if (s.contains('PREMIUM')) return MarketColors.amber;
    return MarketColors.primaryGreen;
  }

  List<Map<String, dynamic>> get _filteredListings {
    if (_locationFilter.isEmpty) return _listings;
    final q = _locationFilter.toLowerCase();
    return _listings
        .where(
          (item) =>
              (item['location']?.toString().toLowerCase() ?? '').contains(q),
        )
        .toList();
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
                      bgColor: MarketColors.heroDeep,
                      badge: 'INVENTORY DASHBOARD',
                      title: 'My Listings',
                      subtitle:
                          'Manage and track your active\nharvests in the marketplace.',
                      statRow: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'TOTAL ACTIVE',
                                  style: GoogleFonts.nunito(
                                    fontSize: 10,
                                    color: Colors.white.withOpacity(0.7),
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Row(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.baseline,
                                  textBaseline: TextBaseline.alphabetic,
                                  children: [
                                    Text(
                                      '${_listings.length}',
                                      style: GoogleFonts.nunito(
                                        fontSize: 28,
                                        fontWeight: FontWeight.w800,
                                        color: Colors.white,
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      'Listings',
                                      style: GoogleFonts.nunito(
                                        fontSize: 12,
                                        color: Colors.white.withOpacity(0.7),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const KisanSearchBar(hint: 'Search your listings...'),
                    const SizedBox(height: 12),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _locationCtrl,
                              decoration: InputDecoration(
                                filled: true,
                                fillColor: Colors.white,
                                prefixIcon: const Icon(
                                  Icons.location_on_outlined,
                                  color: Color(0xFF9CA3AF),
                                ),
                                hintText: 'Filter by location (optional)',
                                hintStyle: GoogleFonts.nunito(
                                  fontSize: 13,
                                  color: const Color(0xFF9CA3AF),
                                ),
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 12,
                                ),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: const BorderSide(
                                    color: Color(0xFFE0E0E0),
                                  ),
                                ),
                              ),
                              onSubmitted: (_) {
                                setState(
                                  () => _locationFilter = _locationCtrl.text
                                      .trim(),
                                );
                              },
                            ),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton(
                            onPressed: () {
                              setState(
                                () =>
                                    _locationFilter = _locationCtrl.text.trim(),
                              );
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: MarketColors.primaryGreen,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 12,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: const Text('Apply'),
                          ),
                          const Spacer(),
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: MarketColors.primaryGreen,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(
                              Icons.grid_view,
                              size: 18,
                              color: Colors.white,
                            ),
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
                          if (i == 0) {
                            context.go(RoutePaths.marketplace);
                          }
                        },
                      ),
                    ),
                    const SizedBox(height: 16),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Row(
                        children: [
                          Text(
                            'Active Listings',
                            style: MarketTextStyles.sectionTitle,
                          ),
                          const Spacer(),
                          TextButton(
                            onPressed: () {},
                            child: Text(
                              'View Archive →',
                              style: GoogleFonts.nunito(
                                fontSize: 12,
                                color: MarketColors.primaryGreen,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Column(
                        children: [
                          if (_loading)
                            const Padding(
                              padding: EdgeInsets.all(24),
                              child: Center(child: CircularProgressIndicator()),
                            )
                          else if (_error != null) ...[
                            Text(
                              'Could not load listings',
                              style: GoogleFonts.nunito(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: MarketColors.deltaRed,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(_error!, style: MarketTextStyles.bodySm),
                            const SizedBox(height: 12),
                            TextButton(
                              onPressed: _fetchListings,
                              child: const Text('Retry'),
                            ),
                          ] else if (_listings.isEmpty) ...[
                            const SizedBox(height: 12),
                            Text(
                              'No listings yet',
                              style: MarketTextStyles.bodySm,
                            ),
                            const SizedBox(height: 12),
                            TextButton(
                              onPressed: _fetchListings,
                              child: const Text('Refresh'),
                            ),
                          ] else
                            RefreshIndicator(
                              onRefresh: _fetchListings,
                              child: _filteredListings.isEmpty
                                  ? ListView(
                                      shrinkWrap: true,
                                      physics:
                                          const AlwaysScrollableScrollPhysics(),
                                      children: [
                                        const SizedBox(height: 12),
                                        Text(
                                          'No listings match that location',
                                          style: MarketTextStyles.bodySm,
                                        ),
                                        const SizedBox(height: 12),
                                        TextButton(
                                          onPressed: () {
                                            setState(() {
                                              _locationFilter = '';
                                              _locationCtrl.clear();
                                            });
                                          },
                                          child: const Text('Clear filter'),
                                        ),
                                      ],
                                    )
                                  : ListView.separated(
                                      shrinkWrap: true,
                                      physics:
                                          const AlwaysScrollableScrollPhysics(),
                                      itemCount: _filteredListings.length,
                                      separatorBuilder: (_, __) =>
                                          const SizedBox(height: 12),
                                      itemBuilder: (_, i) {
                                        final item = _filteredListings[i];
                                        return ListingCard(
                                          imagePath:
                                              'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop',
                                          status: _status(item),
                                          statusColor: _statusColor(item),
                                          title:
                                              item['name']?.toString() ??
                                              'Equipment',
                                          variety:
                                              item['type']?.toString() ??
                                              'Listing',
                                          price: _price(item),
                                          quantity: _quantity(item),
                                          views: ((item['views'] ?? 0) as num)
                                              .toInt(),
                                          interested:
                                              ((item['interested'] ?? 0) as num)
                                                  .toInt(),
                                        );
                                      },
                                    ),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 80),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: MarketColors.primaryGreen,
        elevation: 6,
        onPressed: () => context.push(RoutePaths.addListing),
        child: const Icon(Icons.add, color: Colors.white, size: 28),
      ),
    );
  }
}
