import 'dart:convert';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/app_cache.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/services/agent_service.dart';
import '../../../shared/services/crop_service.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/loading_overlay.dart';

class CalendarScreen extends ConsumerStatefulWidget {
  const CalendarScreen({super.key});

  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends ConsumerState<CalendarScreen> {
  late DateTime _focusedMonth;
  late DateTime _selectedDate;
  String? _aiTip;
  bool _loadingTip = false;
  bool _loadingCrops = false;

  /// Events keyed by 'yyyy-MM-dd'.
  final Map<String, List<_FarmEvent>> _events = {};

  static const _prefsKey = 'farm_calendar_events';

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _focusedMonth = DateTime(now.year, now.month);
    _selectedDate = DateTime(now.year, now.month, now.day);
    _loadData();
  }

  Future<void> _loadData() async {
    // Load local events first (instant), then crops (cached then network)
    await _loadLocalEvents();
    await _loadCropEvents();
    // AI tip is non-blocking — runs in background
    _fetchMonthTip();
  }

  // ── Crop-derived events ───────────────────────────────────────────────

  Future<void> _loadCropEvents() async {
    setState(() => _loadingCrops = true);

    // Try cache first for instant display
    final cachedCrops = await AppCache.get('calendar_crops');
    if (cachedCrops != null) {
      _parseCropEvents(cachedCrops as List);
      if (mounted) setState(() => _loadingCrops = false);
    }

    try {
      final crops = await ref.read(cropServiceProvider).listCrops();
      // Cache for 30 minutes
      await AppCache.put('calendar_crops', crops, ttlSeconds: 1800);
      // Clear old crop events before re-parsing
      for (final key in _events.keys.toList()) {
        _events[key]?.removeWhere((e) => !e.isLocal);
        if (_events[key]?.isEmpty ?? false) _events.remove(key);
      }
      _parseCropEvents(crops);
    } catch (_) {
      // Silently fail – cached data already shown if available
    }
    if (mounted) setState(() => _loadingCrops = false);
  }

  void _parseCropEvents(List<dynamic> crops) {
    for (final crop in crops) {
      final map = crop is Map<String, dynamic> ? crop : <String, dynamic>{};
      final name = map['name'] as String? ?? '';
      final sowingStr = map['sowing_date'] as String?;
      final harvestStr = map['expected_harvest_date'] as String?;

      if (sowingStr != null) {
        final date = DateTime.tryParse(sowingStr);
        if (date != null) {
          final key = _dateKey(date);
          final existing = _events[key] ?? [];
          final alreadyHas = existing.any((e) => e.title.contains(name) && !e.isLocal);
          if (!alreadyHas) {
            _events.putIfAbsent(key, () => []).add(_FarmEvent(
                  title: '${'crop_cycle.sowing_date'.tr()}: $name',
                  description: '${'crop_cycle.season'.tr()}: ${map['season'] ?? ''}',
                  time: '',
                  color: AppColors.success,
                  icon: Icons.grass,
                  date: date,
                  isLocal: false,
                ));
          }
        }
      }
      if (harvestStr != null) {
        final date = DateTime.tryParse(harvestStr);
        if (date != null) {
          final key = _dateKey(date);
          final existing = _events[key] ?? [];
          final alreadyHas = existing.any((e) => e.title.contains(name) && !e.isLocal);
          if (!alreadyHas) {
            _events.putIfAbsent(key, () => []).add(_FarmEvent(
                  title: '${'crop_cycle.expected_harvest'.tr()}: $name',
                  description: '${map['area_acres'] ?? ''} ${'profile.acres'.tr()}',
                  time: '',
                  color: AppColors.warning,
                  icon: Icons.agriculture,
                  date: date,
                  isLocal: false,
                ));
          }
        }
      }
    }
  }

  // ── Local events (SharedPreferences) ──────────────────────────────────

  Future<void> _loadLocalEvents() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_prefsKey);
    if (raw == null) return;
    try {
      final list = jsonDecode(raw) as List;
      for (final item in list) {
        final map = item as Map<String, dynamic>;
        final date = DateTime.tryParse(map['date'] as String? ?? '');
        if (date == null) continue;
        final key = _dateKey(date);
        _events.putIfAbsent(key, () => []).add(_FarmEvent(
              title: map['title'] as String? ?? '',
              description: map['description'] as String? ?? '',
              time: map['time'] as String? ?? '',
              color: AppColors.primary,
              icon: Icons.event,
              date: date,
              isLocal: true,
            ));
      }
      if (mounted) setState(() {});
    } catch (_) {}
  }

  Future<void> _saveLocalEvents() async {
    final prefs = await SharedPreferences.getInstance();
    final localEvents = <Map<String, dynamic>>[];
    for (final entry in _events.entries) {
      for (final e in entry.value) {
        if (e.isLocal) {
          localEvents.add({
            'title': e.title,
            'description': e.description,
            'time': e.time,
            'date': e.date.toIso8601String(),
          });
        }
      }
    }
    await prefs.setString(_prefsKey, jsonEncode(localEvents));
  }

  String _dateKey(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  // ── AI Tip ────────────────────────────────────────────────────────────

  Future<void> _fetchMonthTip() async {
    final cacheKey = 'ai_tip_${_focusedMonth.year}_${_focusedMonth.month}';
    // Try cache first
    final cached = await AppCache.get(cacheKey);
    if (cached != null && mounted) {
      setState(() {
        _aiTip = cached.toString();
        _loadingTip = false;
      });
      return;
    }

    setState(() => _loadingTip = true);
    try {
      final monthName = DateFormat('MMMM yyyy').format(_focusedMonth);
      final response = await ref.read(agentServiceProvider).chat(
            message: 'What farming activities should I plan this month ($monthName)? '
                'Include crop recommendations, irrigation schedule, '
                'and weather considerations for Indian farming. '
                'Keep it under 150 words.',
            language: context.locale.languageCode,
          );
      final tip = response['response'] as String? ?? '';
      await AppCache.put(cacheKey, tip, ttlSeconds: 3600);
      if (mounted) {
        setState(() {
          _aiTip = tip;
          _loadingTip = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _loadingTip = false);
    }
  }

  // ── Add Event Sheet ───────────────────────────────────────────────────

  void _showAddEventSheet() {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    var eventDate = _selectedDate;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: AppSpacing.lg,
          right: AppSpacing.lg,
          top: AppSpacing.xl,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + AppSpacing.xl,
        ),
        child: StatefulBuilder(
          builder: (ctx2, setModalState) => Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('calendar.add_event'.tr(),
                  style: context.textTheme.titleLarge
                      ?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: AppSpacing.xl),
              AppTextField(
                label: 'calendar.event_title'.tr(),
                hint: 'calendar.event_title_hint'.tr(),
                controller: titleCtrl,
                prefixIcon: Icons.title,
              ),
              const SizedBox(height: AppSpacing.lg),
              AppTextField(
                label: 'calendar.description'.tr(),
                hint: 'calendar.description_hint'.tr(),
                controller: descCtrl,
                maxLines: 3,
                prefixIcon: Icons.description,
              ),
              const SizedBox(height: AppSpacing.lg),
              InkWell(
                onTap: () async {
                  final picked = await showDatePicker(
                    context: ctx2,
                    initialDate: eventDate,
                    firstDate:
                        DateTime.now().subtract(const Duration(days: 365)),
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                  );
                  if (picked != null) {
                    setModalState(() => eventDate = picked);
                  }
                },
                child: InputDecorator(
                  decoration: InputDecoration(
                    labelText: 'calendar.date'.tr(),
                    prefixIcon: const Icon(Icons.calendar_today),
                  ),
                  child: Text(DateFormat('dd MMM yyyy').format(eventDate)),
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              AppButton(
                label: 'calendar.save'.tr(),
                icon: Icons.save,
                onPressed: () {
                  final title = titleCtrl.text.trim();
                  if (title.isEmpty) {
                    context.showSnack('calendar.error'.tr(), isError: true);
                    return;
                  }
                  setState(() {
                    final key = _dateKey(eventDate);
                    _events.putIfAbsent(key, () => []).add(_FarmEvent(
                          title: title,
                          description: descCtrl.text.trim(),
                          time: DateFormat('hh:mm a').format(DateTime.now()),
                          color: AppColors.primary,
                          icon: Icons.event,
                          date: eventDate,
                          isLocal: true,
                        ));
                  });
                  _saveLocalEvents();
                  Navigator.pop(ctx);
                  context.showSnack('calendar.event_saved'.tr());
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Delete local event ────────────────────────────────────────────────

  void _deleteEvent(String key, int index) {
    final event = _events[key]![index];
    if (!event.isLocal) return;
    setState(() {
      _events[key]!.removeAt(index);
      if (_events[key]!.isEmpty) _events.remove(key);
    });
    _saveLocalEvents();
    context.showSnack('calendar.event_deleted'.tr());
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final eventsForDay = _events[_dateKey(_selectedDate)] ?? [];

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        title: Text('calendar.title'.tr()),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddEventSheet,
        icon: const Icon(Icons.add),
        label: Text('calendar.add_event'.tr()),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? [AppColors.darkBackground, AppColors.darkSurface]
                : [AppColors.lightBackground, AppColors.lightSurface],
          ),
        ),
        child: SafeArea(
          child: _loadingCrops
              ? const Center(child: LoadingState())
              : SingleChildScrollView(
                padding: AppSpacing.allLg,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ── Month Navigation ─────────────────────
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.chevron_left),
                          onPressed: () {
                            setState(() {
                              _focusedMonth = DateTime(
                                  _focusedMonth.year, _focusedMonth.month - 1);
                            });
                            _fetchMonthTip();
                          },
                        ),
                        Text(
                          DateFormat('MMMM yyyy').format(_focusedMonth),
                          style: context.textTheme.titleMedium
                              ?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        IconButton(
                          icon: const Icon(Icons.chevron_right),
                          onPressed: () {
                            setState(() {
                              _focusedMonth = DateTime(
                                  _focusedMonth.year, _focusedMonth.month + 1);
                            });
                            _fetchMonthTip();
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.sm),

                    // ── Weekday headers ──────────────────────
                    Row(
                      children: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                          .map((d) => Expanded(
                                child: Center(
                                  child: Text(
                                    d,
                                    style:
                                        context.textTheme.bodySmall?.copyWith(
                                      fontWeight: FontWeight.bold,
                                      color: context.appColors.textSecondary,
                                    ),
                                  ),
                                ),
                              ))
                          .toList(),
                    ),
                    const SizedBox(height: AppSpacing.sm),

                    // ── Calendar Grid ────────────────────────
                    _buildCalendarGrid(context),
                    const SizedBox(height: AppSpacing.xl),

                    // ── Events for selected date ─────────────
                    Text(
                      '${'calendar.upcoming'.tr()} – ${DateFormat('dd MMM').format(_selectedDate)}',
                      style: context.textTheme.titleMedium
                          ?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    if (eventsForDay.isEmpty)
                      AppCard(
                        child: Center(
                          child: Padding(
                            padding: AppSpacing.allLg,
                            child: Text(
                              'calendar.no_events'.tr(),
                              style: context.textTheme.bodyMedium?.copyWith(
                                color: context.appColors.textSecondary,
                              ),
                            ),
                          ),
                        ),
                      )
                    else
                      ...List.generate(eventsForDay.length, (i) {
                        final e = eventsForDay[i];
                        return Padding(
                          padding:
                              const EdgeInsets.only(bottom: AppSpacing.md),
                          child: Dismissible(
                            key: ValueKey('${_dateKey(e.date)}_${i}_${e.title}'),
                            direction: e.isLocal
                                ? DismissDirection.endToStart
                                : DismissDirection.none,
                            background: Container(
                              alignment: Alignment.centerRight,
                              padding:
                                  const EdgeInsets.only(right: AppSpacing.xl),
                              decoration: BoxDecoration(
                                color: AppColors.danger,
                                borderRadius: AppRadius.mdAll,
                              ),
                              child: const Icon(Icons.delete_outline,
                                  color: Colors.white),
                            ),
                            onDismissed: (_) =>
                                _deleteEvent(_dateKey(e.date), i),
                            child: AppCard(
                              child: Row(
                                children: [
                                  Container(
                                    width: 4,
                                    height: 48,
                                    decoration: BoxDecoration(
                                      color: e.color,
                                      borderRadius: AppRadius.smAll,
                                    ),
                                  ),
                                  const SizedBox(width: AppSpacing.md),
                                  Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: e.color.withValues(alpha: 0.1),
                                      borderRadius: AppRadius.smAll,
                                    ),
                                    child: Icon(e.icon,
                                        size: 20, color: e.color),
                                  ),
                                  const SizedBox(width: AppSpacing.md),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          e.title,
                                          style: context.textTheme.titleSmall
                                              ?.copyWith(
                                                  fontWeight: FontWeight.bold),
                                        ),
                                        if (e.description.isNotEmpty)
                                          Text(
                                            e.description,
                                            style: context.textTheme.bodySmall
                                                ?.copyWith(
                                              color: context
                                                  .appColors.textSecondary,
                                            ),
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                      ],
                                    ),
                                  ),
                                  if (e.time.isNotEmpty)
                                    Text(
                                      e.time,
                                      style:
                                          context.textTheme.labelSmall?.copyWith(
                                        color: context.appColors.textSecondary,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ),
                        );
                      }),
                    const SizedBox(height: AppSpacing.xl),

                    // ── AI Tip of the Month ──────────────────
                    Text(
                      'calendar.ai_tip'.tr(),
                      style: context.textTheme.titleMedium
                          ?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    if (_loadingTip)
                      const Center(child: LoadingState(itemCount: 1))
                    else if (_aiTip != null && _aiTip!.isNotEmpty)
                      AppCard(
                        color: AppColors.primary.withValues(alpha: 0.06),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.lightbulb,
                                color: AppColors.warning, size: 24),
                            const SizedBox(width: AppSpacing.md),
                            Expanded(
                              child: MarkdownBody(
                                data: _aiTip!,
                                selectable: true,
                                styleSheet: MarkdownStyleSheet(
                                  p: context.textTheme.bodyMedium,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
        ),
      ),
    );
  }

  Widget _buildCalendarGrid(BuildContext context) {
    final firstDay = DateTime(_focusedMonth.year, _focusedMonth.month, 1);
    final daysInMonth =
        DateTime(_focusedMonth.year, _focusedMonth.month + 1, 0).day;
    final startWeekday = firstDay.weekday; // 1=Mon..7=Sun
    final totalCells = startWeekday - 1 + daysInMonth;
    final rows = (totalCells / 7).ceil();

    return Column(
      children: List.generate(rows, (row) {
        return Row(
          children: List.generate(7, (col) {
            final index = row * 7 + col;
            final dayNum = index - (startWeekday - 1) + 1;
            if (dayNum < 1 || dayNum > daysInMonth) {
              return const Expanded(child: SizedBox(height: 40));
            }

            final date =
                DateTime(_focusedMonth.year, _focusedMonth.month, dayNum);
            final isSelected = _dateKey(date) == _dateKey(_selectedDate);
            final isToday = _dateKey(date) == _dateKey(DateTime.now());
            final hasEvents = _events.containsKey(_dateKey(date));

            return Expanded(
              child: GestureDetector(
                onTap: () => setState(() => _selectedDate = date),
                child: Container(
                  height: 40,
                  margin: const EdgeInsets.all(2),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppColors.primary
                        : isToday
                            ? AppColors.primary.withValues(alpha: 0.1)
                            : Colors.transparent,
                    borderRadius: AppRadius.smAll,
                  ),
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Text(
                        '$dayNum',
                        style: context.textTheme.bodySmall?.copyWith(
                          fontWeight:
                              isToday ? FontWeight.bold : FontWeight.normal,
                          color: isSelected
                              ? Colors.white
                              : isToday
                                  ? AppColors.primary
                                  : null,
                        ),
                      ),
                      if (hasEvents)
                        Positioned(
                          bottom: 4,
                          child: Container(
                            width: 5,
                            height: 5,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isSelected
                                  ? Colors.white
                                  : AppColors.primary,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            );
          }),
        );
      }),
    );
  }
}

class _FarmEvent {
  final String title;
  final String description;
  final String time;
  final Color color;
  final IconData icon;
  final DateTime date;
  final bool isLocal;

  const _FarmEvent({
    required this.title,
    required this.description,
    required this.time,
    required this.color,
    required this.icon,
    required this.date,
    this.isLocal = false,
  });
}
