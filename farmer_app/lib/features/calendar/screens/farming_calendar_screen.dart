import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:table_calendar/table_calendar.dart';

class FarmingCalendarScreen extends StatefulWidget {
  const FarmingCalendarScreen({super.key});

  @override
  State<FarmingCalendarScreen> createState() => _FarmingCalendarScreenState();
}

class _FarmingCalendarScreenState extends State<FarmingCalendarScreen> {
  DateTime _focusedDay = DateTime(2023, 10, 1);
  DateTime _selectedDay = DateTime(2023, 10, 3);
  bool _heroVisible = false;
  final List<bool> _taskVisible = [false, false, false];

  final Map<DateTime, List<String>> _events = {
    DateTime(2023, 10, 3): ['high', 'normal'],
    DateTime(2023, 10, 8): ['normal'],
    DateTime(2023, 10, 14): ['high'],
    DateTime(2023, 10, 17): ['ai'],
    DateTime(2023, 10, 18): ['normal', 'ai'],
  };

  @override
  void initState() {
    super.initState();
    _startAnimations();
  }

  void _startAnimations() {
    Future.delayed(const Duration(milliseconds: 50), () {
      if (mounted) setState(() => _heroVisible = true);
    });
    const delays = [100, 200, 300];
    for (var i = 0; i < delays.length; i++) {
      Future.delayed(Duration(milliseconds: delays[i]), () {
        if (mounted) {
          setState(() => _taskVisible[i] = true);
        }
      });
    }
  }

  DateTime _stripTime(DateTime d) => DateTime(d.year, d.month, d.day);

  List<String> _getEventsForDay(DateTime day) {
    return _events[_stripTime(day)] ?? const [];
  }

  void _changeMonth(int delta) {
    setState(() {
      _focusedDay = DateTime(_focusedDay.year, _focusedDay.month + delta, 1);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: CalendarColors.bgColor,
      body: SafeArea(
        child: Column(
          children: [
            _Header(),
            Expanded(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AnimatedSlide(
                      offset: _heroVisible
                          ? Offset.zero
                          : const Offset(0, -0.05),
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeOut,
                      child: AnimatedOpacity(
                        duration: const Duration(milliseconds: 300),
                        opacity: _heroVisible ? 1 : 0,
                        child: _HeroCard(),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Text(
                          'Farming Calendar',
                          style: CalendarTextStyles.sectionHead,
                        ),
                        const Spacer(),
                        IconButton(
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          icon: const Icon(
                            Icons.chevron_left,
                            color: CalendarColors.textSecondary,
                            size: 20,
                          ),
                          onPressed: () => _changeMonth(-1),
                        ),
                        Text(
                          _monthLabel(_focusedDay),
                          style: CalendarTextStyles.calMonthYear,
                        ),
                        IconButton(
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          icon: const Icon(
                            Icons.chevron_right,
                            color: CalendarColors.textSecondary,
                            size: 20,
                          ),
                          onPressed: () => _changeMonth(1),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _CalendarCard(
                      focusedDay: _focusedDay,
                      selectedDay: _selectedDay,
                      onDaySelected: (selected, focused) {
                        setState(() {
                          _selectedDay = selected;
                          _focusedDay = focused;
                        });
                      },
                      eventLoader: _getEventsForDay,
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'Upcoming Tasks',
                      style: CalendarTextStyles.sectionHead,
                    ),
                    const SizedBox(height: 12),
                    _AnimatedTaskCard(
                      visible: _taskVisible[0],
                      child: _TaskCard(
                        iconBg: const Color(0xFFFFEBEE),
                        iconColor: const Color(0xFFC62828),
                        icon: Icons.bug_report_outlined,
                        title: 'Pest Treatment',
                        subtitle: 'Wheat Field C – Aphid infestation warning',
                        dateTime: 'Oct 08  •  08:30 AM',
                        priority: 'HIGH',
                        isHigh: true,
                        onTap: () => _showSnack('Opening Pest Treatment...'),
                      ),
                    ),
                    const SizedBox(height: 10),
                    _AnimatedTaskCard(
                      visible: _taskVisible[1],
                      child: _TaskCard(
                        iconBg: const Color(0xFFE3F2FD),
                        iconColor: const Color(0xFF1565C0),
                        icon: Icons.water_drop_outlined,
                        title: 'Irrigation for Wheat',
                        subtitle: 'North Quad – Standard hydration cycle',
                        dateTime: 'Oct 08  •  05:30 AM',
                        priority: 'NORMAL',
                        isHigh: false,
                        onTap: () =>
                            _showSnack('Opening Irrigation for Wheat...'),
                      ),
                    ),
                    const SizedBox(height: 10),
                    _AnimatedTaskCard(
                      visible: _taskVisible[2],
                      child: _TaskCard(
                        iconBg: CalendarColors.tagGreenBg,
                        iconColor: CalendarColors.primaryDark,
                        icon: Icons.science_outlined,
                        title: 'Soil Fertilization',
                        subtitle: 'Organic Zone 2 – Nitrogen boost required',
                        dateTime: 'Oct 08  •  07:00 AM',
                        priority: 'NORMAL',
                        isHigh: false,
                        onTap: () =>
                            _showSnack('Opening Soil Fertilization...'),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Center(
                      child: TextButton(
                        onPressed: () {},
                        child: Text(
                          'View All Tasks  →',
                          style: CalendarTextStyles.link,
                        ),
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

  String _monthLabel(DateTime date) {
    final months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return '${months[date.month - 1]} ${date.year}';
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), duration: const Duration(seconds: 1)),
    );
  }
}

class _Header extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 56,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(color: CalendarColors.divider, width: 1),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: CalendarColors.primaryGreen,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.grass, color: Colors.white, size: 18),
          ),
          const SizedBox(width: 8),
          Text('Krishi Sarthi', style: CalendarTextStyles.screenTitle),
          const Spacer(),
          IconButton(
            onPressed: () {},
            icon: const Icon(
              Icons.notifications_outlined,
              color: CalendarColors.textSecondary,
              size: 22,
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: CalendarDecorations.heroDecor,
      padding: const EdgeInsets.all(18),
      child: Stack(
        children: [
          Positioned(
            top: -10,
            right: -10,
            child: Opacity(
              opacity: 0.07,
              child: Icon(Icons.eco, color: Colors.white, size: 90),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: CalendarColors.primaryGreen.withOpacity(0.30),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  'DAILY AI RECOMMENDATION',
                  style: CalendarTextStyles.heroLabel,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                'Optimal Irrigation\nWindow Detected',
                style: CalendarTextStyles.heroTitle,
              ),
              const SizedBox(height: 8),
              Text(
                'Soil moisture levels in the North Quad are at 18%. Based on the 4 PM forecast, we recommend starting irrigation at 05:00 AM tomorrow.',
                style: CalendarTextStyles.heroBody,
              ),
              const SizedBox(height: 14),
              ElevatedButton(
                onPressed: () {},
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: CalendarColors.primaryDark,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 10,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  elevation: 0,
                ),
                child: Text('Schedule Now', style: CalendarTextStyles.button),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _CalendarCard extends StatelessWidget {
  const _CalendarCard({
    required this.focusedDay,
    required this.selectedDay,
    required this.onDaySelected,
    required this.eventLoader,
  });

  final DateTime focusedDay;
  final DateTime selectedDay;
  final void Function(DateTime selected, DateTime focused) onDaySelected;
  final List<String> Function(DateTime day) eventLoader;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: CalendarDecorations.cardDecor,
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: const [
              _DayHeader(label: 'MON'),
              _DayHeader(label: 'TUE'),
              _DayHeader(label: 'WED'),
              _DayHeader(label: 'THU'),
              _DayHeader(label: 'FRI'),
              _DayHeader(label: 'SAT'),
              _DayHeader(label: 'SUN'),
            ],
          ),
          const SizedBox(height: 8),
          TableCalendar<String>(
            firstDay: DateTime(2023, 1, 1),
            lastDay: DateTime(2025, 12, 31),
            focusedDay: focusedDay,
            selectedDayPredicate: (day) => isSameDay(selectedDay, day),
            onDaySelected: onDaySelected,
            eventLoader: eventLoader,
            headerVisible: false,
            daysOfWeekVisible: false,
            calendarFormat: CalendarFormat.month,
            availableCalendarFormats: const {CalendarFormat.month: 'Month'},
            calendarStyle: CalendarStyle(
              defaultTextStyle: CalendarTextStyles.calDate,
              weekendTextStyle: CalendarTextStyles.calDate.copyWith(
                color: CalendarColors.textSecondary,
              ),
              outsideTextStyle: CalendarTextStyles.calDate.copyWith(
                color: CalendarColors.textSecondary.withOpacity(0.4),
              ),
              todayTextStyle: CalendarTextStyles.calDate.copyWith(
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
              selectedTextStyle: CalendarTextStyles.calDate.copyWith(
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
              selectedDecoration: const BoxDecoration(
                color: CalendarColors.primaryGreen,
                shape: BoxShape.circle,
              ),
              todayDecoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: CalendarColors.primaryGreen,
                  width: 1.4,
                ),
                color: Colors.transparent,
              ),
              markerDecoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: CalendarColors.primaryGreen,
              ),
              markersMaxCount: 3,
              markerSize: 5,
              markerMargin: const EdgeInsets.symmetric(horizontal: 1),
              cellMargin: const EdgeInsets.all(4),
              outsideDaysVisible: false,
            ),
            calendarBuilders: CalendarBuilders<String>(
              markerBuilder: (context, day, events) {
                if (events.isEmpty) return const SizedBox.shrink();
                return Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    for (final e in events)
                      Container(
                        width: 5,
                        height: 5,
                        margin: const EdgeInsets.only(
                          top: 2,
                          right: 2,
                          left: 2,
                        ),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: e == 'high'
                              ? CalendarColors.highDot
                              : e == 'ai'
                              ? CalendarColors.aiDot
                              : CalendarColors.normalDot,
                        ),
                      ),
                  ],
                );
              },
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: const [
              _LegendDot(color: CalendarColors.normalDot, label: 'NORMAL'),
              SizedBox(width: 16),
              _LegendDot(color: CalendarColors.highDot, label: 'HIGH PRIORITY'),
              SizedBox(width: 16),
              _LegendDot(color: CalendarColors.aiDot, label: 'AI INSIGHT'),
            ],
          ),
        ],
      ),
    );
  }
}

class _AnimatedTaskCard extends StatelessWidget {
  const _AnimatedTaskCard({required this.child, required this.visible});

  final Widget child;
  final bool visible;

  @override
  Widget build(BuildContext context) {
    return AnimatedSlide(
      offset: visible ? Offset.zero : const Offset(0, 0.1),
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOut,
      child: AnimatedOpacity(
        opacity: visible ? 1 : 0,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
        child: child,
      ),
    );
  }
}

class _TaskCard extends StatelessWidget {
  const _TaskCard({
    required this.iconBg,
    required this.iconColor,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.dateTime,
    required this.priority,
    required this.isHigh,
    required this.onTap,
  });

  final Color iconBg;
  final Color iconColor;
  final IconData icon;
  final String title;
  final String subtitle;
  final String dateTime;
  final String priority;
  final bool isHigh;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Container(
        decoration: CalendarDecorations.cardDecor,
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: iconBg,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(title, style: CalendarTextStyles.taskTitle),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: isHigh
                              ? CalendarColors.highBadgeBg
                              : CalendarColors.normalBadgeBg,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          priority,
                          style: CalendarTextStyles.badge.copyWith(
                            color: isHigh
                                ? CalendarColors.highBadgeText
                                : CalendarColors.normalBadgeText,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(subtitle, style: CalendarTextStyles.taskSub),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(
                        Icons.access_time_outlined,
                        color: CalendarColors.textSecondary,
                        size: 12,
                      ),
                      const SizedBox(width: 4),
                      Text(dateTime, style: CalendarTextStyles.taskMeta),
                    ],
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

class _LegendDot extends StatelessWidget {
  const _LegendDot({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 7,
          height: 7,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 5),
        Text(label, style: CalendarTextStyles.legend),
      ],
    );
  }
}

class _DayHeader extends StatelessWidget {
  const _DayHeader({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 32,
      child: Center(child: Text(label, style: CalendarTextStyles.calDayHead)),
    );
  }
}

class CalendarColors {
  static const bgColor = Color(0xFFF2F5F0);
  static const primaryDark = Color(0xFF1B5E20);
  static const primaryGreen = Color(0xFF4CAF50);
  static const heroCardBg = Color(0xFF2D4A1E);
  static const cardBg = Color(0xFFFFFFFF);
  static const tagGreenBg = Color(0xFFE8F5E9);
  static const tagGreenText = Color(0xFF2E7D32);
  static const textPrimary = Color(0xFF1A1A1A);
  static const textSecondary = Color(0xFF6B7280);
  static const divider = Color(0xFFEEEEEE);
  static const normalDot = Color(0xFF9E9E9E);
  static const highDot = Color(0xFFFF8F00);
  static const aiDot = Color(0xFF1565C0);
  static const highBadgeBg = Color(0xFFFFEBEE);
  static const highBadgeText = Color(0xFFC62828);
  static const normalBadgeBg = Color(0xFFE8F5E9);
  static const normalBadgeText = Color(0xFF2E7D32);
}

class CalendarTextStyles {
  static final screenTitle = GoogleFonts.nunito(
    fontSize: 15,
    fontWeight: FontWeight.w700,
    color: CalendarColors.textPrimary,
  );
  static final heroLabel = GoogleFonts.nunito(
    fontSize: 10,
    fontWeight: FontWeight.w700,
    color: Colors.white,
    letterSpacing: 1.2,
  );
  static final heroTitle = GoogleFonts.nunito(
    fontSize: 18,
    fontWeight: FontWeight.w800,
    color: Colors.white,
  );
  static final heroBody = GoogleFonts.nunito(
    fontSize: 12,
    color: Colors.white.withOpacity(0.8),
    height: 1.5,
  );
  static final button = GoogleFonts.nunito(
    fontSize: 13,
    fontWeight: FontWeight.w700,
    color: CalendarColors.primaryDark,
  );
  static final sectionHead = GoogleFonts.nunito(
    fontSize: 16,
    fontWeight: FontWeight.w700,
    color: CalendarColors.textPrimary,
  );
  static final calMonthYear = GoogleFonts.nunito(
    fontSize: 15,
    fontWeight: FontWeight.w700,
    color: CalendarColors.textPrimary,
  );
  static final calDayHead = GoogleFonts.nunito(
    fontSize: 11,
    fontWeight: FontWeight.w700,
    letterSpacing: 0.5,
    color: CalendarColors.textSecondary,
  );
  static final calDate = GoogleFonts.nunito(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    color: CalendarColors.textPrimary,
  );
  static final taskTitle = GoogleFonts.nunito(
    fontSize: 14,
    fontWeight: FontWeight.w700,
    color: CalendarColors.textPrimary,
  );
  static final taskSub = GoogleFonts.nunito(
    fontSize: 12,
    color: CalendarColors.textSecondary,
  );
  static final taskMeta = GoogleFonts.nunito(
    fontSize: 11,
    color: CalendarColors.textSecondary,
  );
  static final badge = GoogleFonts.nunito(
    fontSize: 10,
    fontWeight: FontWeight.w700,
    letterSpacing: 0.5,
  );
  static final legend = GoogleFonts.nunito(
    fontSize: 10,
    color: CalendarColors.textSecondary,
    letterSpacing: 0.5,
  );
  static final link = GoogleFonts.nunito(
    fontSize: 13,
    fontWeight: FontWeight.w700,
    color: CalendarColors.primaryGreen,
    letterSpacing: 0.3,
  );
}

class CalendarDecorations {
  static final cardDecor = BoxDecoration(
    color: CalendarColors.cardBg,
    borderRadius: BorderRadius.circular(16),
    boxShadow: [
      BoxShadow(
        color: Colors.black.withOpacity(0.06),
        blurRadius: 10,
        offset: const Offset(0, 2),
      ),
    ],
  );

  static final heroDecor = BoxDecoration(
    color: CalendarColors.heroCardBg,
    borderRadius: BorderRadius.circular(16),
    boxShadow: [
      BoxShadow(
        color: Colors.black.withOpacity(0.15),
        blurRadius: 16,
        offset: const Offset(0, 4),
      ),
    ],
  );
}
