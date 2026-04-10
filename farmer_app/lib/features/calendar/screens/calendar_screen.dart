import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:table_calendar/table_calendar.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/services/agent_service.dart';
import '../../../shared/services/notification_service.dart';

class _TaskEntry {
  final String title;
  final String subtitle;
  final DateTime date;
  final TimeOfDay time;
  final bool isHigh;

  const _TaskEntry({
    required this.title,
    required this.subtitle,
    required this.date,
    required this.time,
    required this.isHigh,
  });
}

class CalendarScreen extends ConsumerStatefulWidget {
  final bool openComposer;
  final String? prefillTitle;
  final String? prefillNotes;

  const CalendarScreen({
    super.key,
    this.openComposer = false,
    this.prefillTitle,
    this.prefillNotes,
  });

  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends ConsumerState<CalendarScreen> {
  DateTime _focusedDay = DateTime.now();
  DateTime _selectedDay = DateTime.now();

  bool _heroVisible = false;
  final List<bool> _taskVisible = <bool>[false, false, false];

  bool _backendLoading = false;
  bool _heroLoading = true;
  String? _heroRecommendation;
  List<_TaskEntry> _backendTasks = <_TaskEntry>[];

  late final Map<DateTime, List<String>> _seedEvents = _buildSeedEvents();

  Map<DateTime, List<String>> _events = <DateTime, List<String>>{};

  final List<_TaskEntry> _customTasks = <_TaskEntry>[];

  @override
  void initState() {
    super.initState();
    _rebuildEventMap();
    _startAnimations();
    _loadBackendCalendarSignals();
    if (widget.openComposer) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _openScheduleTaskSheet(
          initialTitle: widget.prefillTitle,
          initialNotes: widget.prefillNotes,
        );
      });
    }
  }

  void _startAnimations() {
    Future<void>.delayed(const Duration(milliseconds: 50), () {
      if (mounted) setState(() => _heroVisible = true);
    });

    const delays = <int>[100, 200, 300];
    for (var i = 0; i < delays.length; i++) {
      Future<void>.delayed(Duration(milliseconds: delays[i]), () {
        if (mounted) setState(() => _taskVisible[i] = true);
      });
    }
  }

  DateTime _stripTime(DateTime d) => DateTime(d.year, d.month, d.day);

  Map<DateTime, List<String>> _buildSeedEvents() {
    final today = _stripTime(DateTime.now());
    return <DateTime, List<String>>{
      today: <String>['high', 'normal'],
      today.add(const Duration(days: 2)): <String>['normal'],
      today.add(const Duration(days: 6)): <String>['high'],
      today.add(const Duration(days: 9)): <String>['ai'],
      today.add(const Duration(days: 10)): <String>['normal', 'ai'],
    };
  }

  void _rebuildEventMap() {
    final rebuilt = <DateTime, List<String>>{};
    for (final entry in _seedEvents.entries) {
      rebuilt[entry.key] = List<String>.from(entry.value);
    }

    for (final task in _customTasks) {
      final key = _stripTime(task.date);
      final list = List<String>.from(rebuilt[key] ?? const <String>[]);
      list.add(task.isHigh ? 'high' : 'normal');
      rebuilt[key] = list;
    }

    for (final task in _backendTasks) {
      final key = _stripTime(task.date);
      final list = List<String>.from(rebuilt[key] ?? const <String>[]);
      list.add(task.isHigh ? 'high' : 'ai');
      rebuilt[key] = list;
    }

    _events = rebuilt;
  }

  TimeOfDay _parseTime(dynamic value) {
    final str = value?.toString().trim() ?? '';
    if (str.isEmpty) return const TimeOfDay(hour: 9, minute: 0);

    final match = RegExp(r'^(\d{1,2}):(\d{2})').firstMatch(str);
    if (match == null) return const TimeOfDay(hour: 9, minute: 0);

    final h = int.tryParse(match.group(1) ?? '') ?? 9;
    final m = int.tryParse(match.group(2) ?? '') ?? 0;
    return TimeOfDay(hour: h.clamp(0, 23), minute: m.clamp(0, 59));
  }

  String _fallbackRecommendation() {
    if (_backendTasks.isEmpty) {
      return 'Plan one irrigation and one field-inspection task today, then review weather before spraying.';
    }

    final highCount = _backendTasks.where((t) => t.isHigh).length;
    if (highCount > 0) {
      return 'Prioritize $highCount high-priority task${highCount > 1 ? 's' : ''} first, then complete routine operations.';
    }
    return 'Follow your synced calendar tasks in order and keep a short buffer before sunset for follow-up checks.';
  }

  Future<void> _loadBackendCalendarSignals() async {
    if (!mounted) return;

    setState(() {
      _backendLoading = true;
      _heroLoading = true;
    });

    try {
      final notificationService = ref.read(notificationServiceProvider);
      final raw = await notificationService.list(perPage: 100);
      final items =
          (raw['items'] as List?) ??
          (raw['notifications'] as List?) ??
          const <dynamic>[];

      final parsedTasks = <_TaskEntry>[];
      for (final item in items) {
        if (item is! Map) continue;
        final map = Map<String, dynamic>.from(item);
        final title = (map['title'] ?? '').toString().trim();
        final body = (map['body'] ?? '').toString().trim();
        final type = (map['type'] ?? '').toString().toLowerCase();
        final data = (map['data'] is Map)
            ? Map<String, dynamic>.from(map['data'] as Map<dynamic, dynamic>)
            : <String, dynamic>{};

        final rawDate = data['task_date'] ?? data['date'] ?? map['created_at'];
        final parsedDate = DateTime.tryParse(rawDate?.toString() ?? '');
        if (parsedDate == null) continue;

        final isTaskLike =
            type.contains('reminder') ||
            type.contains('calendar') ||
            type.contains('crop') ||
            type.contains('weather');
        if (!isTaskLike && title.isEmpty && body.isEmpty) continue;

        final isHigh =
            type.contains('alert') ||
            title.toLowerCase().contains('urgent') ||
            body.toLowerCase().contains('urgent') ||
            title.toLowerCase().contains('high');

        parsedTasks.add(
          _TaskEntry(
            title: title.isNotEmpty ? title : 'Farm Task',
            subtitle: body.isNotEmpty
                ? body
                : 'Synced from backend notifications',
            date: parsedDate,
            time: _parseTime(data['time']),
            isHigh: isHigh,
          ),
        );
      }

      String recommendation = _fallbackRecommendation();
      try {
        final topTasks = parsedTasks
            .take(3)
            .map(
              (t) =>
                  '${t.title} on ${_shortDate(t.date)} at ${_formatTime(t.time)}',
            )
            .join('; ');
        final prompt =
            'Give one concise daily farming recommendation in 1-2 sentences for calendar planning. '
            'Upcoming tasks: ${topTasks.isEmpty ? 'None provided' : topTasks}.';
        final ai = await ref
            .read(agentServiceProvider)
            .chat(message: prompt, language: 'en');
        final text = ai['response']?.toString().trim();
        if (text != null && text.isNotEmpty) {
          recommendation = text;
        }
      } catch (_) {
        // keep fallback recommendation
      }

      if (!mounted) return;
      setState(() {
        _backendTasks = parsedTasks;
        _heroRecommendation = recommendation;
        _backendLoading = false;
        _heroLoading = false;
        _rebuildEventMap();
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _backendLoading = false;
        _heroLoading = false;
        _heroRecommendation = _fallbackRecommendation();
      });
    }
  }

  List<String> _getEventsForDay(DateTime day) =>
      _events[_stripTime(day)] ?? const <String>[];

  void _changeMonth(int delta) {
    setState(() {
      _focusedDay = DateTime(_focusedDay.year, _focusedDay.month + delta, 1);
    });
  }

  String _shortDate(DateTime date) {
    return DateFormat('MMM dd', context.locale.toString()).format(date);
  }

  String _formatTime(TimeOfDay time) {
    final hour = time.hourOfPeriod == 0 ? 12 : time.hourOfPeriod;
    final minute = time.minute.toString().padLeft(2, '0');
    final period = time.period == DayPeriod.am ? 'AM' : 'PM';
    return '$hour:$minute $period';
  }

  Future<void> _openScheduleTaskSheet({
    String? initialTitle,
    String? initialNotes,
  }) async {
    final titleController = TextEditingController(
      text: initialTitle?.trim() ?? '',
    );
    final notesController = TextEditingController(
      text: initialNotes?.trim() ?? '',
    );
    var pickedDate = _selectedDay;
    var pickedTime = TimeOfDay.now();
    var highPriority = false;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (sheetContext, setSheetState) {
            final isDark = Theme.of(context).brightness == Brightness.dark;
            final fieldBg = isDark
                ? AppColors.darkCard
                : Colors.white.withValues(alpha: 0.72);
            final borderColor = isDark
                ? Colors.white
                : Colors.white.withValues(alpha: 0.88);
            final titleStyle = Theme.of(context).textTheme.titleMedium
                ?.copyWith(
                  color: isDark ? AppColors.darkText : AppColors.lightText,
                  fontWeight: FontWeight.w700,
                );

            return Padding(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                bottom: MediaQuery.of(sheetContext).viewInsets.bottom + 16,
                top: 16,
              ),
              child: Container(
                decoration: BoxDecoration(
                  color: isDark
                      ? AppColors.darkCard
                      : Colors.white.withValues(alpha: 0.9),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: borderColor,
                  ),
                  boxShadow: <BoxShadow>[
                    BoxShadow(
                      color: AppColors.primaryDark.withValues(alpha: 0.08),
                      blurRadius: 18,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Center(
                        child: Container(
                          width: 44,
                          height: 4,
                          decoration: BoxDecoration(
                            color: AppColors.lightTextSecondary.withValues(
                              alpha: 0.35,
                            ),
                            borderRadius: BorderRadius.circular(999),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text('screen.calendar_screen.schedule_new_task'.tr(), style: titleStyle),
                      const SizedBox(height: 4),
                      Text(
                        'screen.calendar_screen.add_a_quick_farm_task_for_your_selected_date'.tr(),
                        style: TextStyle(
                          color: isDark
                              ? AppColors.darkTextSecondary
                              : AppColors.lightTextSecondary,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'screen.calendar_screen.task_name'.tr(),
                        style: TextStyle(
                          color: isDark ? AppColors.darkText : AppColors.lightText,
                          fontWeight: FontWeight.w600,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: titleController,
                        decoration: InputDecoration(
                          hintText: 'screen.calendar_screen.task_title'.tr(),
                          filled: true,
                          fillColor: fieldBg,
                          prefixIcon: const Icon(
                            Icons.assignment_outlined,
                            size: 18,
                            color: AppColors.primary,
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide(color: borderColor),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide(color: borderColor),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide(
                              color: AppColors.primaryDark.withValues(
                                alpha: 0.65,
                              ),
                              width: 1.2,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'screen.calendar_screen.details'.tr(),
                        style: TextStyle(
                          color: isDark ? AppColors.darkText : AppColors.lightText,
                          fontWeight: FontWeight.w600,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: notesController,
                        minLines: 2,
                        maxLines: 2,
                        decoration: InputDecoration(
                          hintText: 'screen.calendar_screen.details_optional'.tr(),
                          filled: true,
                          fillColor: fieldBg,
                          prefixIcon: const Padding(
                            padding: EdgeInsets.only(bottom: 24),
                            child: Icon(
                              Icons.notes_rounded,
                              size: 18,
                              color: AppColors.primary,
                            ),
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide(color: borderColor),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide(color: borderColor),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide(
                              color: AppColors.primaryDark.withValues(
                                alpha: 0.65,
                              ),
                              width: 1.2,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'screen.calendar_screen.schedule'.tr(),
                        style: TextStyle(
                          color: isDark ? AppColors.darkText : AppColors.lightText,
                          fontWeight: FontWeight.w600,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: <Widget>[
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () async {
                                final picked = await showDatePicker(
                                  context: context,
                                  initialDate: pickedDate,
                                  firstDate: DateTime(2023, 1, 1),
                                  lastDate: DateTime(2028, 12, 31),
                                );
                                if (picked != null) {
                                  setSheetState(() {
                                    pickedDate = picked;
                                  });
                                }
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: fieldBg,
                                foregroundColor: isDark
                                  ? AppColors.darkText
                                  : AppColors.lightText,
                                elevation: 0,
                                side: BorderSide(color: borderColor),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              icon: const Icon(Icons.event_outlined, size: 16),
                              label: Text(
                                _shortDate(pickedDate),
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () async {
                                final picked = await showTimePicker(
                                  context: context,
                                  initialTime: pickedTime,
                                );
                                if (picked != null) {
                                  setSheetState(() {
                                    pickedTime = picked;
                                  });
                                }
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: fieldBg,
                                foregroundColor: isDark
                                  ? AppColors.darkText
                                  : AppColors.lightText,
                                elevation: 0,
                                side: BorderSide(color: borderColor),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              icon: const Icon(Icons.access_time, size: 16),
                              label: Text(
                                _formatTime(pickedTime),
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'screen.calendar_screen.priority'.tr(),
                        style: TextStyle(
                          color: isDark ? AppColors.darkText : AppColors.lightText,
                          fontWeight: FontWeight.w600,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: <Widget>[
                          Expanded(
                            child: ChoiceChip(
                              label: Text('screen.calendar_screen.normal'.tr()),
                              selected: !highPriority,
                              onSelected: (_) {
                                setSheetState(() {
                                  highPriority = false;
                                });
                              },
                              backgroundColor: fieldBg,
                              selectedColor: AppColors.primary.withValues(
                                alpha: 0.2,
                              ),
                              side: BorderSide(color: borderColor),
                              labelStyle: TextStyle(
                                color: isDark
                                    ? AppColors.darkText
                                    : AppColors.lightText,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: ChoiceChip(
                              label: Text('screen.calendar_screen.high'.tr()),
                              selected: highPriority,
                              onSelected: (_) {
                                setSheetState(() {
                                  highPriority = true;
                                });
                              },
                              backgroundColor: fieldBg,
                              selectedColor: CalendarColors.highBadgeBg,
                              side: BorderSide(
                                color: CalendarColors.highBadgeText.withValues(
                                  alpha: 0.3,
                                ),
                              ),
                              labelStyle: TextStyle(
                                color: CalendarColors.highBadgeText,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      SizedBox(
                        width: double.infinity,
                        height: 46,
                        child: ElevatedButton.icon(
                          onPressed: () {
                            final title = titleController.text.trim();
                            if (title.isEmpty) {
                              _showSnack('screen.calendar_screen.please_enter_task_title'.tr());
                              return;
                            }

                            final details = notesController.text.trim();

                            setState(() {
                              _customTasks.insert(
                                0,
                                _TaskEntry(
                                  title: title,
                                  subtitle: details.isEmpty
                                      ? 'screen.calendar_screen.planned_task_from_calendar'.tr()
                                      : details,
                                  date: pickedDate,
                                  time: pickedTime,
                                  isHigh: highPriority,
                                ),
                              );
                              _rebuildEventMap();
                            });

                            Navigator.of(sheetContext).pop();
                            _showSnack('screen.calendar_screen.task_scheduled_successfully'.tr());
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(40),
                            ),
                            elevation: 0,
                          ),
                          icon: const Icon(Icons.add_task_rounded),
                          label: Text(
                            'screen.calendar_screen.save_task'.tr(),
                            style: TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );

    titleController.dispose();
    notesController.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final cardColor = isDark
      ? AppColors.darkCard
      : Colors.white.withValues(alpha: 0.56);
    final textColor = isDark ? AppColors.darkText : AppColors.lightText;
    final subColor = isDark
      ? AppColors.darkTextSecondary
      : AppColors.lightTextSecondary;
    final iconBg = isDark
      ? Colors.transparent
      : Colors.white.withValues(alpha: 0.56);

    return Scaffold(
      backgroundColor: isDark
          ? AppColors.darkBackground
          : AppColors.lightBackground,
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? <Color>[AppColors.darkBackground, AppColors.darkSurface]
                : <Color>[AppColors.lightBackground, AppColors.lightSurface],
          ),
        ),
        child: SafeArea(
          bottom: false,
          child: Column(
            children: <Widget>[
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 12, 24, 0),
                child: SizedBox(
                  height: 48,
                  child: Stack(
                    alignment: Alignment.center,
                    children: <Widget>[
                      Align(
                        alignment: Alignment.centerLeft,
                        child: _topAction(
                          icon: Icons.arrow_back_rounded,
                          color: AppColors.primary,
                          background: iconBg,
                          onTap: () => Navigator.of(context).maybePop(),
                        ),
                      ),
                      Text(
                        'screen.calendar_screen.calendar'.tr(),
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: textColor,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Align(
                        alignment: Alignment.centerRight,
                        child: _topAction(
                          icon: Icons.notifications_outlined,
                          color: AppColors.primary,
                          background: iconBg,
                          onTap: () => context.push(RoutePaths.notifications),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: _loadBackendCalendarSignals,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(24, 0, 24, 100),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        AnimatedSlide(
                          offset: _heroVisible
                              ? Offset.zero
                              : const Offset(0, -0.05),
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeOut,
                          child: AnimatedOpacity(
                            duration: const Duration(milliseconds: 300),
                            opacity: _heroVisible ? 1 : 0,
                            child: SizedBox(
                              width: double.infinity,
                              child: _HeroCard(
                                recommendation: _heroRecommendation,
                                isLoading: _heroLoading,
                                onSchedule: _openScheduleTaskSheet,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 18),
                        Row(
                          children: <Widget>[
                            Text(
                              'screen.calendar_screen.farming_calendar'.tr(),
                              style: Theme.of(context).textTheme.titleMedium
                                  ?.copyWith(
                                    color: textColor,
                                    fontWeight: FontWeight.w700,
                                  ),
                            ),
                            const Spacer(),
                            _miniMonthAction(
                              icon: Icons.chevron_left_rounded,
                              subColor: subColor,
                              onTap: () => _changeMonth(-1),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              _monthLabel(_focusedDay),
                              style: TextStyle(
                                color: textColor,
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(width: 6),
                            _miniMonthAction(
                              icon: Icons.chevron_right_rounded,
                              subColor: subColor,
                              onTap: () => _changeMonth(1),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        _CalendarCard(
                          focusedDay: _focusedDay,
                          selectedDay: _selectedDay,
                          eventLoader: _getEventsForDay,
                          cardColor: cardColor,
                          textColor: textColor,
                          subColor: subColor,
                          onDaySelected: (selected, focused) {
                            setState(() {
                              _selectedDay = selected;
                              _focusedDay = focused;
                            });
                          },
                        ),
                        const SizedBox(height: 20),
                        Text(
                          'screen.calendar_screen.upcoming_tasks'.tr(),
                          style: Theme.of(context).textTheme.titleMedium
                              ?.copyWith(
                                color: textColor,
                                fontWeight: FontWeight.w700,
                              ),
                        ),
                        const SizedBox(height: 8),
                        SizedBox(
                          width: double.infinity,
                          height: 42,
                          child: ElevatedButton.icon(
                            onPressed: _openScheduleTaskSheet,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: isDark
                                  ? AppColors.darkCard
                                  : Colors.white.withValues(alpha: 0.86),
                              foregroundColor: isDark
                                  ? AppColors.darkText
                                  : AppColors.lightText,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(40),
                              ),
                              side: BorderSide(
                                color: isDark
                                    ? Colors.white
                                    : Colors.white.withValues(alpha: 0.88),
                              ),
                            ),
                            icon: const Icon(Icons.add_task_rounded),
                            label: Text(
                              'screen.calendar_screen.schedule_new_task'.tr(),
                              style: TextStyle(fontWeight: FontWeight.w700),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        if (_backendLoading)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: LinearProgressIndicator(
                              backgroundColor: Colors.white.withValues(
                                alpha: 0.45,
                              ),
                              color: AppColors.primaryDark,
                            ),
                          ),
                        if (_backendTasks.isNotEmpty) ...<Widget>[
                          ..._backendTasks
                              .take(3)
                              .map(
                                (task) => Padding(
                                  padding: const EdgeInsets.only(bottom: 10),
                                  child: _TaskCard(
                                    iconBg: task.isHigh
                                        ? const Color(0xFFFFEBEE)
                                        : const Color(0xFFE8F5E9),
                                    iconColor: task.isHigh
                                        ? const Color(0xFFC62828)
                                        : AppColors.primaryDark,
                                    icon: task.isHigh
                                        ? Icons.priority_high_rounded
                                        : Icons.notifications_active_outlined,
                                    title: task.title,
                                    subtitle: task.subtitle,
                                    dateTime:
                                        '${_shortDate(task.date)}  •  ${_formatTime(task.time)}',
                                    priority: task.isHigh
                                        ? 'screen.calendar_screen.high'.tr()
                                        : 'screen.calendar_screen.synced'.tr(),
                                    isHigh: task.isHigh,
                                    cardColor: cardColor,
                                    textColor: textColor,
                                    subColor: subColor,
                                    onTap: () => _showSnack(
                                      '${'screen.calendar_screen.synced'.tr()}: ${task.title}',
                                    ),
                                  ),
                                ),
                              ),
                        ],
                        _AnimatedTaskCard(
                          visible: _taskVisible[0],
                          child: _TaskCard(
                            iconBg: const Color(0xFFFFEBEE),
                            iconColor: const Color(0xFFC62828),
                            icon: Icons.bug_report_outlined,
                            title: 'screen.calendar_screen.pest_treatment'.tr(),
                            subtitle: 'screen.calendar_screen.wheat_field_c_aphid_infestation_warning'.tr(),
                            dateTime:
                              '${_shortDate(DateTime.now().add(const Duration(days: 1)))}  •  08:30 AM',
                            priority: 'screen.calendar_screen.high'.tr(),
                            isHigh: true,
                            cardColor: cardColor,
                            textColor: textColor,
                            subColor: subColor,
                            onTap: () =>
                                _showSnack('screen.calendar_screen.opening_pest_treatment'.tr()),
                          ),
                        ),
                        const SizedBox(height: 10),
                        _AnimatedTaskCard(
                          visible: _taskVisible[1],
                          child: _TaskCard(
                            iconBg: const Color(0xFFE3F2FD),
                            iconColor: const Color(0xFF1565C0),
                            icon: Icons.water_drop_outlined,
                            title: 'screen.calendar_screen.irrigation_for_wheat'.tr(),
                            subtitle: 'screen.calendar_screen.north_quad_standard_hydration_cycle'.tr(),
                            dateTime:
                              '${_shortDate(DateTime.now().add(const Duration(days: 1)))}  •  05:30 AM',
                            priority: 'screen.calendar_screen.normal'.tr(),
                            isHigh: false,
                            cardColor: cardColor,
                            textColor: textColor,
                            subColor: subColor,
                            onTap: () =>
                                _showSnack('screen.calendar_screen.opening_irrigation_for_wheat'.tr()),
                          ),
                        ),
                        const SizedBox(height: 10),
                        _AnimatedTaskCard(
                          visible: _taskVisible[2],
                          child: _TaskCard(
                            iconBg: CalendarColors.tagGreenBg,
                            iconColor: CalendarColors.primaryDark,
                            icon: Icons.science_outlined,
                            title: 'screen.calendar_screen.soil_fertilization'.tr(),
                            subtitle: 'screen.calendar_screen.organic_zone_2_nitrogen_boost_required'.tr(),
                            dateTime:
                              '${_shortDate(DateTime.now().add(const Duration(days: 1)))}  •  07:00 AM',
                            priority: 'screen.calendar_screen.normal'.tr(),
                            isHigh: false,
                            cardColor: cardColor,
                            textColor: textColor,
                            subColor: subColor,
                            onTap: () =>
                                _showSnack('screen.calendar_screen.opening_soil_fertilization'.tr()),
                          ),
                        ),
                        if (_customTasks.isNotEmpty) ...<Widget>[
                          const SizedBox(height: 10),
                          ..._customTasks.map(
                            (task) => Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: _TaskCard(
                                iconBg: task.isHigh
                                    ? const Color(0xFFFFEBEE)
                                    : const Color(0xFFE8F5E9),
                                iconColor: task.isHigh
                                    ? const Color(0xFFC62828)
                                    : AppColors.primaryDark,
                                icon: Icons.event_note_rounded,
                                title: task.title,
                                subtitle: task.subtitle,
                                dateTime:
                                    '${_shortDate(task.date)}  •  ${_formatTime(task.time)}',
                                priority: task.isHigh
                                  ? 'screen.calendar_screen.high'.tr()
                                  : 'screen.calendar_screen.normal'.tr(),
                                isHigh: task.isHigh,
                                cardColor: cardColor,
                                textColor: textColor,
                                subColor: subColor,
                                onTap: () =>
                                  _showSnack('Opening ${task.title}...'),
                              ),
                            ),
                          ),
                        ],
                        const SizedBox(height: 16),
                        Center(
                          child: TextButton(
                            onPressed: () =>
                                context.push(RoutePaths.notifications),
                            child: Text(
                              'screen.calendar_screen.view_all_tasks'.tr(),
                              style: TextStyle(
                                color: AppColors.primaryDark,
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _topAction({
    required IconData icon,
    required Color color,
    required Color background,
    required VoidCallback onTap,
  }) {
    final isDark = context.isDark;
    return Container(
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(12),
        border: isDark ? null : Border.all(color: Colors.white.withValues(alpha: 0.8)),
      ),
      child: IconButton(
        onPressed: onTap,
        icon: Icon(icon, color: color, size: 20),
      ),
    );
  }

  Widget _miniMonthAction({
    required IconData icon,
    required Color subColor,
    required VoidCallback onTap,
  }) {
    final isDark = context.isDark;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        width: 26,
        height: 26,
        decoration: BoxDecoration(
          color: isDark
              ? Colors.transparent
              : Colors.white.withValues(alpha: 0.56),
          shape: BoxShape.circle,
          border: isDark
              ? null
              : Border.all(color: Colors.white.withValues(alpha: 0.8)),
        ),
        child: Icon(icon, size: 18, color: AppColors.primary),
      ),
    );
  }

  String _monthLabel(DateTime date) {
    return DateFormat('MMMM yyyy', context.locale.toString()).format(date);
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), duration: const Duration(seconds: 1)),
    );
  }
}

class _HeroCard extends StatelessWidget {
  final String? recommendation;
  final bool isLoading;
  final VoidCallback onSchedule;

  const _HeroCard({
    this.recommendation,
    required this.isLoading,
    required this.onSchedule,
  });

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
                  color: CalendarColors.primaryGreen.withValues(alpha: 0.30),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  'screen.calendar_screen.daily_ai_recommendation'.tr(),
                  style: CalendarTextStyles.heroLabel,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                'screen.calendar_screen.optimal_irrigation_window_detected'.tr(),
                style: CalendarTextStyles.heroTitle,
              ),
              const SizedBox(height: 8),
              Text(
                isLoading
                    ? 'screen.calendar_screen.syncing_backend_recommendations'.tr()
                    : (recommendation ??
                          'screen.calendar_screen.soil_moisture_levels_in_the_north_quad_are_at_18_bas'.tr()),
                style: CalendarTextStyles.heroBody,
              ),
              const SizedBox(height: 14),
              ElevatedButton(
                onPressed: onSchedule,
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
                child: Text(
                  'screen.calendar_screen.schedule_now'.tr(),
                  style: CalendarTextStyles.button,
                ),
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
    required this.cardColor,
    required this.textColor,
    required this.subColor,
  });

  final DateTime focusedDay;
  final DateTime selectedDay;
  final void Function(DateTime selected, DateTime focused) onDaySelected;
  final List<String> Function(DateTime day) eventLoader;
  final Color cardColor;
  final Color textColor;
  final Color subColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.8),
          width: 1.2,
        ),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: AppColors.primaryDark.withValues(alpha: 0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        children: <Widget>[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: <Widget>[
              _DayHeader(label: 'screen.calendar_screen.mon'.tr(), subColor: subColor),
              _DayHeader(label: 'screen.calendar_screen.tue'.tr(), subColor: subColor),
              _DayHeader(label: 'screen.calendar_screen.wed'.tr(), subColor: subColor),
              _DayHeader(label: 'screen.calendar_screen.thu'.tr(), subColor: subColor),
              _DayHeader(label: 'screen.calendar_screen.fri'.tr(), subColor: subColor),
              _DayHeader(label: 'screen.calendar_screen.sat'.tr(), subColor: subColor),
              _DayHeader(label: 'screen.calendar_screen.sun'.tr(), subColor: subColor),
            ],
          ),
          const SizedBox(height: 8),
          TableCalendar<String>(
            firstDay: DateTime(2023, 1, 1),
            lastDay: DateTime(2028, 12, 31),
            focusedDay: focusedDay,
            selectedDayPredicate: (day) => isSameDay(selectedDay, day),
            onDaySelected: onDaySelected,
            eventLoader: eventLoader,
            headerVisible: false,
            daysOfWeekVisible: false,
            calendarFormat: CalendarFormat.month,
            availableCalendarFormats: const <CalendarFormat, String>{
              CalendarFormat.month: 'Month',
            },
            calendarStyle: CalendarStyle(
              defaultTextStyle: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: textColor,
              ),
              weekendTextStyle: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: subColor,
              ),
              outsideTextStyle: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: subColor.withValues(alpha: 0.4),
              ),
              todayTextStyle: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
              selectedTextStyle: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
              selectedDecoration: const BoxDecoration(
                color: AppColors.primaryDark,
                shape: BoxShape.circle,
              ),
              todayDecoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.primaryDark, width: 1.4),
                color: Colors.transparent,
              ),
              markerDecoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.primary,
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
                  children: <Widget>[
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
            children: const <Widget>[
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
    required this.cardColor,
    required this.textColor,
    required this.subColor,
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
  final Color cardColor;
  final Color textColor;
  final Color subColor;

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final badgeColor = isHigh
        ? CalendarColors.highBadgeText
        : AppColors.primaryDark;

    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: cardColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isDark
                ? Colors.white
                : Colors.white.withValues(alpha: 0.8),
            width: 1.2,
          ),
          boxShadow: <BoxShadow>[
            BoxShadow(
              color: AppColors.primaryDark.withValues(alpha: 0.08),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: iconBg.withValues(alpha: 0.22),
                borderRadius: BorderRadius.circular(10),
                border: isDark
                    ? null
                    : Border.all(color: Colors.white.withValues(alpha: 0.88)),
                boxShadow: <BoxShadow>[
                  BoxShadow(
                    color: AppColors.primaryDark.withValues(alpha: 0.06),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Icon(
                icon,
                color: iconColor.withValues(alpha: 0.92),
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      Expanded(
                        child: Text(
                          title,
                          style: TextStyle(
                            color: textColor,
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.78),
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(
                            color: badgeColor.withValues(alpha: 0.28),
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: <Widget>[
                            Container(
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: badgeColor,
                              ),
                            ),
                            const SizedBox(width: 5),
                            Text(
                              priority,
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.5,
                                color: badgeColor,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: TextStyle(color: subColor, fontSize: 12),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: <Widget>[
                      Icon(
                        Icons.access_time_outlined,
                        color: subColor,
                        size: 12,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        dateTime,
                        style: TextStyle(color: subColor, fontSize: 11),
                      ),
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
    final colorText = context.isDark
        ? AppColors.darkTextSecondary
        : AppColors.lightTextSecondary;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        Container(
          width: 7,
          height: 7,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 5),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            color: colorText,
            letterSpacing: 0.5,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

class _DayHeader extends StatelessWidget {
  const _DayHeader({required this.label, required this.subColor});

  final String label;
  final Color subColor;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 34,
      child: Center(
        child: FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            label,
            maxLines: 1,
            softWrap: false,
            overflow: TextOverflow.visible,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
              color: subColor,
            ),
          ),
        ),
      ),
    );
  }
}

class CalendarColors {
  static const primaryDark = Color(0xFF1B5E20);
  static const primaryGreen = Color(0xFF4CAF50);
  static const heroCardBg = Color(0xFF2D4A1E);
  static const tagGreenBg = Color(0xFFE8F5E9);
  static const normalDot = Color(0xFF9E9E9E);
  static const highDot = Color(0xFFFF8F00);
  static const aiDot = Color(0xFF1565C0);
  static const highBadgeBg = Color(0xFFFFEBEE);
  static const highBadgeText = Color(0xFFC62828);
  static const normalBadgeBg = Color(0xFFE8F5E9);
  static const normalBadgeText = Color(0xFF2E7D32);
}

class CalendarTextStyles {
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
    color: Colors.white.withValues(alpha: 0.8),
    height: 1.5,
  );

  static final button = GoogleFonts.nunito(
    fontSize: 13,
    fontWeight: FontWeight.w700,
    color: CalendarColors.primaryDark,
  );
}

class CalendarDecorations {
  static final heroDecor = BoxDecoration(
    color: CalendarColors.heroCardBg,
    borderRadius: BorderRadius.circular(16),
    boxShadow: <BoxShadow>[
      BoxShadow(
        color: Colors.black.withValues(alpha: 0.15),
        blurRadius: 16,
        offset: const Offset(0, 4),
      ),
    ],
  );
}
