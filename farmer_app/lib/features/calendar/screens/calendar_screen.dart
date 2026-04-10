import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
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
  DateTime _focusedDay = DateTime(2026, 3, 1);
  DateTime _selectedDay = DateTime(2026, 3, 3);

  bool _heroVisible = false;
  final List<bool> _taskVisible = <bool>[false, false, false];

  bool _backendLoading = false;
  bool _heroLoading = true;
  String? _heroRecommendation;
  List<_TaskEntry> _backendTasks = <_TaskEntry>[];

  static final Map<DateTime, List<String>> _seedEvents =
      <DateTime, List<String>>{
        DateTime(2026, 3, 3): <String>['high', 'normal'],
        DateTime(2026, 3, 8): <String>['normal'],
        DateTime(2026, 3, 14): <String>['high'],
        DateTime(2026, 3, 17): <String>['ai'],
        DateTime(2026, 3, 18): <String>['normal', 'ai'],
      };

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
    const months = <String>[
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '${months[date.month - 1]} ${date.day.toString().padLeft(2, '0')}';
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
            final fieldBg = Colors.white.withValues(alpha: 0.72);
            final borderColor = Colors.white.withValues(alpha: 0.88);
            final titleStyle = Theme.of(context).textTheme.titleMedium
                ?.copyWith(
                  color: AppColors.lightText,
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
                  color: Colors.white.withValues(alpha: 0.9),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.9),
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
                      Text('Schedule New Task', style: titleStyle),
                      const SizedBox(height: 4),
                      Text(
                        'Add a quick farm task for your selected date.',
                        style: TextStyle(
                          color: AppColors.lightTextSecondary,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Task Name',
                        style: TextStyle(
                          color: AppColors.lightText,
                          fontWeight: FontWeight.w600,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: titleController,
                        decoration: InputDecoration(
                          hintText: 'Task title',
                          filled: true,
                          fillColor: fieldBg,
                          prefixIcon: const Icon(
                            Icons.assignment_outlined,
                            size: 18,
                            color: AppColors.primaryDark,
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
                        'Details',
                        style: TextStyle(
                          color: AppColors.lightText,
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
                          hintText: 'Details (optional)',
                          filled: true,
                          fillColor: fieldBg,
                          prefixIcon: const Padding(
                            padding: EdgeInsets.only(bottom: 24),
                            child: Icon(
                              Icons.notes_rounded,
                              size: 18,
                              color: AppColors.primaryDark,
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
                        'Schedule',
                        style: TextStyle(
                          color: AppColors.lightText,
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
                                foregroundColor: AppColors.lightText,
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
                                foregroundColor: AppColors.lightText,
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
                        'Priority',
                        style: TextStyle(
                          color: AppColors.lightText,
                          fontWeight: FontWeight.w600,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: <Widget>[
                          Expanded(
                            child: ChoiceChip(
                              label: const Text('Normal'),
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
                                color: AppColors.lightText,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: ChoiceChip(
                              label: const Text('High'),
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
                              _showSnack('Please enter task title');
                              return;
                            }

                            final details = notesController.text.trim();

                            setState(() {
                              _customTasks.insert(
                                0,
                                _TaskEntry(
                                  title: title,
                                  subtitle: details.isEmpty
                                      ? 'Planned task from calendar'
                                      : details,
                                  date: pickedDate,
                                  time: pickedTime,
                                  isHigh: highPriority,
                                ),
                              );
                              _rebuildEventMap();
                            });

                            Navigator.of(sheetContext).pop();
                            _showSnack('Task scheduled successfully');
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primaryDark,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(40),
                            ),
                            elevation: 0,
                          ),
                          icon: const Icon(Icons.add_task_rounded),
                          label: const Text(
                            'Save Task',
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
    final cardColor = Colors.white.withValues(alpha: 0.56);
    final textColor = AppColors.lightText;
    final subColor = AppColors.lightTextSecondary;
    final iconBg = Colors.white.withValues(alpha: 0.56);

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
                          color: AppColors.primaryDark,
                          background: iconBg,
                          onTap: () => Navigator.of(context).maybePop(),
                        ),
                      ),
                      Text(
                        'Calendar',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: textColor,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Align(
                        alignment: Alignment.centerRight,
                        child: _topAction(
                          icon: Icons.notifications_outlined,
                          color: AppColors.primaryDark,
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
                            child: _HeroCard(
                              recommendation: _heroRecommendation,
                              isLoading: _heroLoading,
                              onSchedule: _openScheduleTaskSheet,
                            ),
                          ),
                        ),
                        const SizedBox(height: 18),
                        Row(
                          children: <Widget>[
                            Text(
                              'Farming Calendar',
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
                          'Upcoming Tasks',
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
                              backgroundColor: Colors.white.withValues(
                                alpha: 0.86,
                              ),
                              foregroundColor: AppColors.lightText,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(40),
                              ),
                              side: BorderSide(
                                color: Colors.white.withValues(alpha: 0.88),
                              ),
                            ),
                            icon: const Icon(Icons.add_task_rounded),
                            label: const Text(
                              'Schedule New Task',
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
                                    priority: task.isHigh ? 'HIGH' : 'SYNCED',
                                    isHigh: task.isHigh,
                                    cardColor: cardColor,
                                    textColor: textColor,
                                    subColor: subColor,
                                    onTap: () => _showSnack(
                                      'Synced task: ${task.title}',
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
                            title: 'Pest Treatment',
                            subtitle:
                                'Wheat Field C - Aphid infestation warning',
                            dateTime: 'Mar 08  •  08:30 AM',
                            priority: 'HIGH',
                            isHigh: true,
                            cardColor: cardColor,
                            textColor: textColor,
                            subColor: subColor,
                            onTap: () =>
                                _showSnack('Opening Pest Treatment...'),
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
                            subtitle: 'North Quad - Standard hydration cycle',
                            dateTime: 'Mar 08  •  05:30 AM',
                            priority: 'NORMAL',
                            isHigh: false,
                            cardColor: cardColor,
                            textColor: textColor,
                            subColor: subColor,
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
                            subtitle:
                                'Organic Zone 2 - Nitrogen boost required',
                            dateTime: 'Mar 08  •  07:00 AM',
                            priority: 'NORMAL',
                            isHigh: false,
                            cardColor: cardColor,
                            textColor: textColor,
                            subColor: subColor,
                            onTap: () =>
                                _showSnack('Opening Soil Fertilization...'),
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
                                priority: task.isHigh ? 'HIGH' : 'NORMAL',
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
                              'View All Tasks  →',
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
    return Container(
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.8)),
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
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        width: 26,
        height: 26,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.56),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white.withValues(alpha: 0.8)),
        ),
        child: Icon(icon, size: 18, color: subColor),
      ),
    );
  }

  String _monthLabel(DateTime date) {
    const months = <String>[
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
                isLoading
                    ? 'Syncing backend recommendations...'
                    : (recommendation ??
                          'Soil moisture levels in the North Quad are at 18%. Based on the 4 PM forecast, we recommend starting irrigation at 05:00 AM tomorrow.'),
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
              _DayHeader(label: 'MON', subColor: subColor),
              _DayHeader(label: 'TUE', subColor: subColor),
              _DayHeader(label: 'WED', subColor: subColor),
              _DayHeader(label: 'THU', subColor: subColor),
              _DayHeader(label: 'FRI', subColor: subColor),
              _DayHeader(label: 'SAT', subColor: subColor),
              _DayHeader(label: 'SUN', subColor: subColor),
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
                border: Border.all(color: Colors.white.withValues(alpha: 0.88)),
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
            color: AppColors.lightTextSecondary,
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
