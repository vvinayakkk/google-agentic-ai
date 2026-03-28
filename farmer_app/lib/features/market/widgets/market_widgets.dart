import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../constants.dart';

class KisanTopBar extends StatelessWidget {
  const KisanTopBar({
    super.key,
    this.title,
    this.showBack = false,
    this.showBell = true,
    this.onBack,
  });

  final String? title;
  final bool showBack;
  final bool showBell;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 56,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: Color(0xFFF0F0F0), width: 1)),
      ),
      child: Row(
        children: [
          if (showBack)
            IconButton(
              icon: const Icon(Icons.arrow_back),
              color: MarketColors.primaryDark,
              onPressed: onBack ?? () => Navigator.of(context).maybePop(),
            )
          else
            Row(
              children: [
                CircleAvatar(
                  radius: 16,
                  backgroundColor: MarketColors.tagGreenBg,
                  child: Text(
                    'KS',
                    style: GoogleFonts.nunito(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: MarketColors.primaryDark,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'Krishi Sarthi',
                  style: GoogleFonts.nunito(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: MarketColors.textPrimary,
                  ),
                ),
              ],
            ),
          const Spacer(),
          if (title != null)
            Text(
              title!,
              style: GoogleFonts.nunito(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: MarketColors.textPrimary,
              ),
            ),
          const Spacer(),
          if (showBell)
            const Icon(
              Icons.notifications_outlined,
              color: MarketColors.textSecondary,
            )
          else
            const SizedBox(width: 24),
        ],
      ),
    );
  }
}

class KisanBottomNav extends StatelessWidget {
  const KisanBottomNav({super.key, this.activeIndex = 0, this.onTap});

  final int activeIndex;
  final ValueChanged<int>? onTap;

  BottomNavigationBarItem _item({
    required IconData icon,
    required String label,
    required bool active,
  }) {
    return BottomNavigationBarItem(
      label: label,
      icon: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (active)
            Container(
              height: 3,
              width: 24,
              margin: const EdgeInsets.only(bottom: 4),
              decoration: BoxDecoration(
                color: MarketColors.primaryGreen,
                borderRadius: BorderRadius.circular(12),
              ),
            )
          else
            const SizedBox(height: 7),
          Icon(icon),
        ],
      ),
      activeIcon: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            height: 3,
            width: 24,
            margin: const EdgeInsets.only(bottom: 4),
            decoration: BoxDecoration(
              color: MarketColors.primaryGreen,
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          Icon(icon),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BottomNavigationBar(
      currentIndex: activeIndex,
      onTap: onTap,
      type: BottomNavigationBarType.fixed,
      backgroundColor: Colors.white,
      selectedItemColor: MarketColors.primaryGreen,
      unselectedItemColor: MarketColors.textSecondary,
      selectedLabelStyle: GoogleFonts.nunito(
        fontSize: 11,
        fontWeight: FontWeight.w700,
      ),
      unselectedLabelStyle: GoogleFonts.nunito(fontSize: 11),
      items: [
        _item(
          icon: Icons.home_outlined,
          label: 'Home',
          active: activeIndex == 0,
        ),
        _item(
          icon: Icons.sell_outlined,
          label: 'Listings',
          active: activeIndex == 1,
        ),
        _item(
          icon: Icons.bar_chart_outlined,
          label: 'Insights',
          active: activeIndex == 2,
        ),
        _item(
          icon: Icons.person_outline,
          label: 'Profile',
          active: activeIndex == 3,
        ),
      ],
    );
  }
}

class HeroCard extends StatefulWidget {
  const HeroCard({
    super.key,
    required this.badge,
    required this.title,
    required this.subtitle,
    required this.statRow,
    this.bgColor = MarketColors.heroDark,
  });

  final String badge;
  final String title;
  final String subtitle;
  final Widget statRow;
  final Color bgColor;

  @override
  State<HeroCard> createState() => _HeroCardState();
}

class _HeroCardState extends State<HeroCard> {
  bool _visible = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        setState(() => _visible = true);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedSlide(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOut,
      offset: _visible ? Offset.zero : const Offset(0, 0.05),
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 300),
        opacity: _visible ? 1 : 0,
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          padding: const EdgeInsets.all(20),
          decoration: MarketDecorations.heroDecor.copyWith(
            color: widget.bgColor,
          ),
          child: Stack(
            children: [
              Positioned(
                top: -6,
                right: -6,
                child: Opacity(
                  opacity: 0.06,
                  child: Icon(Icons.grass, size: 80, color: Colors.white),
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _BadgePill(text: widget.badge),
                  const SizedBox(height: 8),
                  Text(widget.title, style: MarketTextStyles.heroTitle),
                  const SizedBox(height: 4),
                  Text(widget.subtitle, style: MarketTextStyles.heroSubtitle),
                  const SizedBox(height: 16),
                  widget.statRow,
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BadgePill extends StatelessWidget {
  const _BadgePill({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: MarketDecorations.pill(Colors.white.withOpacity(0.15)),
      child: Text(
        text,
        style: GoogleFonts.nunito(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: Colors.white,
          letterSpacing: 1.2,
        ),
      ),
    );
  }
}

class KisanSearchBar extends StatelessWidget {
  const KisanSearchBar({super.key, required this.hint});

  final String hint;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: TextField(
        decoration: InputDecoration(
          prefixIcon: const Icon(Icons.search, color: Color(0xFF9CA3AF)),
          hintText: hint,
          hintStyle: GoogleFonts.nunito(
            fontSize: 14,
            color: const Color(0xFF9CA3AF),
          ),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 20,
            vertical: 12,
          ),
        ),
      ),
    );
  }
}

class FilterPill extends StatelessWidget {
  const FilterPill({super.key, required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      style: OutlinedButton.styleFrom(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        side: const BorderSide(color: Color(0xFFE0E0E0)),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      ),
      onPressed: () {},
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: MarketColors.textSecondary),
          const SizedBox(width: 4),
          Text(
            label,
            style: GoogleFonts.nunito(
              fontSize: 13,
              color: MarketColors.textSecondary,
            ),
          ),
          const SizedBox(width: 4),
          const Icon(
            Icons.keyboard_arrow_down,
            size: 14,
            color: MarketColors.textSecondary,
          ),
        ],
      ),
    );
  }
}

class TabSwitcher extends StatelessWidget {
  const TabSwitcher({
    super.key,
    required this.tabs,
    required this.active,
    required this.onTap,
  });

  final List<String> tabs;
  final int active;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0xFFF0F0F0), width: 1)),
      ),
      child: Row(
        children: [
          for (var i = 0; i < tabs.length; i++) ...[
            Expanded(
              child: TextButton(
                onPressed: () => onTap(i),
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  foregroundColor: Colors.transparent,
                  overlayColor: Colors.transparent,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      tabs[i],
                      style: GoogleFonts.nunito(
                        fontSize: 15,
                        fontWeight: i == active
                            ? FontWeight.w700
                            : FontWeight.w600,
                        color: i == active
                            ? MarketColors.primaryGreen
                            : MarketColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      height: 2,
                      width: 40,
                      color: i == active
                          ? MarketColors.primaryGreen
                          : Colors.transparent,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class InsightRow extends StatelessWidget {
  const InsightRow({
    super.key,
    required this.emoji,
    required this.crop,
    required this.variety,
    required this.price,
    required this.delta,
    required this.isPositive,
  });

  final String emoji;
  final String crop;
  final String variety;
  final String price;
  final String delta;
  final bool isPositive;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          _EmojiCircle(emoji: emoji),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  crop,
                  style: GoogleFonts.nunito(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: MarketColors.textPrimary,
                  ),
                ),
                Text(
                  variety,
                  style: GoogleFonts.nunito(
                    fontSize: 12,
                    color: MarketColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(price, style: MarketTextStyles.priceText),
              const SizedBox(height: 2),
              DeltaBadge(delta: delta, isPositive: isPositive),
            ],
          ),
        ],
      ),
    );
  }
}

class _EmojiCircle extends StatelessWidget {
  const _EmojiCircle({required this.emoji});
  final String emoji;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        color: MarketColors.tagGreenBg,
        shape: BoxShape.circle,
      ),
      alignment: Alignment.center,
      child: Text(emoji, style: const TextStyle(fontSize: 16)),
    );
  }
}

class DeltaBadge extends StatelessWidget {
  const DeltaBadge({super.key, required this.delta, required this.isPositive});

  final String delta;
  final bool isPositive;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: MarketDecorations.pill(
        isPositive ? MarketColors.tagGreenBg : MarketColors.deltaRedBg,
      ),
      child: Text(
        delta,
        style: GoogleFonts.nunito(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: isPositive ? MarketColors.tagGreenText : MarketColors.deltaRed,
        ),
      ),
    );
  }
}

class ListingCard extends StatefulWidget {
  const ListingCard({
    super.key,
    required this.imagePath,
    required this.status,
    required this.statusColor,
    required this.title,
    required this.variety,
    required this.price,
    required this.quantity,
    required this.views,
    required this.interested,
  });

  final String imagePath;
  final String status;
  final Color statusColor;
  final String title;
  final String variety;
  final String price;
  final String quantity;
  final int views;
  final int interested;

  @override
  State<ListingCard> createState() => _ListingCardState();
}

class _ListingCardState extends State<ListingCard> {
  bool _pressed = false;

  void _setPressed(bool value) => setState(() => _pressed = value);

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 120),
      transform: Matrix4.identity()..scale(_pressed ? 0.97 : 1.0),
      curve: Curves.easeOut,
      child: GestureDetector(
        onTapDown: (_) => _setPressed(true),
        onTapUp: (_) => _setPressed(false),
        onTapCancel: () => _setPressed(false),
        child: Container(
          decoration: MarketDecorations.cardDecor,
          clipBehavior: Clip.hardEdge,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Stack(
                children: [
                  SizedBox(
                    width: double.infinity,
                    height: 160,
                    child: Image.network(
                      widget.imagePath,
                      fit: BoxFit.cover,
                      loadingBuilder: (context, child, progress) {
                        if (progress == null) return child;
                        return Container(color: MarketColors.tagGreenBg);
                      },
                      errorBuilder: (context, error, stack) => Container(
                        color: MarketColors.tagGreenBg,
                        alignment: Alignment.center,
                        child: const Icon(
                          Icons.image_outlined,
                          color: MarketColors.textSecondary,
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 8,
                    left: 8,
                    child: _StatusPill(
                      text: widget.status,
                      color: widget.statusColor,
                    ),
                  ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Row(
                      children: const [
                        _ImageIconBtn(icon: Icons.edit_outlined),
                        SizedBox(width: 6),
                        _ImageIconBtn(icon: Icons.share_outlined),
                      ],
                    ),
                  ),
                ],
              ),
              Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.title,
                      style: GoogleFonts.nunito(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: MarketColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      widget.variety,
                      style: GoogleFonts.nunito(
                        fontSize: 13,
                        color: MarketColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        _StatChip(
                          emoji: '💰',
                          value: widget.price,
                          label: 'Price',
                        ),
                        const SizedBox(width: 12),
                        _StatChip(
                          emoji: '📦',
                          value: widget.quantity,
                          label: 'Qty',
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(
                          Icons.visibility_outlined,
                          size: 14,
                          color: MarketColors.textSecondary,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${widget.views} Views',
                          style: GoogleFonts.nunito(
                            fontSize: 12,
                            color: MarketColors.textSecondary,
                          ),
                        ),
                        const SizedBox(width: 12),
                        const Icon(
                          Icons.people_outline,
                          size: 14,
                          color: MarketColors.textSecondary,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${widget.interested} Interested',
                          style: GoogleFonts.nunito(
                            fontSize: 12,
                            color: MarketColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.text, required this.color});
  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: MarketDecorations.pill(color.withOpacity(0.9)),
      child: Text(
        text,
        style: GoogleFonts.nunito(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: Colors.white,
          letterSpacing: 0.8,
        ),
      ),
    );
  }
}

class _ImageIconBtn extends StatelessWidget {
  const _ImageIconBtn({required this.icon});
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.92),
        shape: BoxShape.circle,
      ),
      child: Icon(icon, size: 18, color: MarketColors.textPrimary),
    );
  }
}

class _StatChip extends StatelessWidget {
  const _StatChip({
    required this.emoji,
    required this.value,
    required this.label,
  });
  final String emoji;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: MarketDecorations.pill(MarketColors.tagGreenBg),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(emoji, style: const TextStyle(fontSize: 14)),
          const SizedBox(width: 6),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: GoogleFonts.nunito(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: MarketColors.textPrimary,
                ),
              ),
              Text(
                label,
                style: GoogleFonts.nunito(
                  fontSize: 11,
                  color: MarketColors.textSecondary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class CropChip extends StatelessWidget {
  const CropChip({
    super.key,
    required this.emoji,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String emoji;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 90,
        height: 40,
        decoration: BoxDecoration(
          color: selected ? MarketColors.primaryGreen : Colors.white,
          borderRadius: BorderRadius.circular(999),
          border: selected ? null : Border.all(color: const Color(0xFFE0E0E0)),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 10),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 16)),
            const SizedBox(width: 4),
            Text(
              label,
              style: GoogleFonts.nunito(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: selected ? Colors.white : MarketColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class PrimaryButton extends StatelessWidget {
  const PrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
  });

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 54,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: MarketColors.primaryDark,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(999),
          ),
          elevation: 4,
          shadowColor: MarketColors.primaryDark.withOpacity(0.4),
        ),
        onPressed: onPressed,
        child: Text(
          label,
          style: GoogleFonts.nunito(
            fontSize: 16,
            fontWeight: FontWeight.w800,
            color: Colors.white,
          ),
        ),
      ),
    );
  }
}

class MarketRefBadge extends StatelessWidget {
  const MarketRefBadge({
    super.key,
    required this.crop,
    required this.price,
    required this.delta,
  });

  final String crop;
  final String price;
  final String delta;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: MarketColors.tagGreenBg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'MARKET REFERENCE: $crop',
                style: GoogleFonts.nunito(
                  fontSize: 10,
                  letterSpacing: 1,
                  color: MarketColors.textSecondary,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                price,
                style: GoogleFonts.nunito(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: MarketColors.primaryDark,
                ),
              ),
            ],
          ),
          const Spacer(),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              DeltaBadge(delta: delta, isPositive: true),
              const SizedBox(height: 4),
              Text(
                'Updated 30m ago',
                style: GoogleFonts.nunito(
                  fontSize: 11,
                  color: MarketColors.textSecondary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
