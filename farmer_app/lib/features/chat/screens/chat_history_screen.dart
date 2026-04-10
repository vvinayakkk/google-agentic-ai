import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/models/chat_message_model.dart';
import '../../../shared/services/agent_service.dart';
import '../../../shared/widgets/error_view.dart';

/// Chat history / sessions list screen – fetches real data from backend.
class ChatHistoryScreen extends ConsumerStatefulWidget {
  const ChatHistoryScreen({super.key});

  @override
  ConsumerState<ChatHistoryScreen> createState() => _ChatHistoryScreenState();
}

class _ChatHistoryScreenState extends ConsumerState<ChatHistoryScreen> {
  List<ChatSession> _sessions = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final agent = ref.read(agentServiceProvider);
      final data = await agent.listSessions();

      final list = (data['sessions'] as List<dynamic>?)
              ?.map((s) => ChatSession.fromJson(s as Map<String, dynamic>))
              .where((s) => s.sessionId.trim().isNotEmpty)
              .toList() ??
          [];

      // Sort newest first
      list.sort((a, b) =>
          (b.lastActivity ?? b.createdAt ?? DateTime(2000))
              .compareTo(a.lastActivity ?? a.createdAt ?? DateTime(2000)));

      if (mounted) {
        setState(() {
          _sessions = list;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _delete(ChatSession session) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: context.appColors.card,
        surfaceTintColor: Colors.transparent,
        title: Text('chat_history.delete'.tr()),
        content: Text('chat_history.delete_confirm'.tr()),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(
              'common.delete'.tr(),
              style: const TextStyle(color: AppColors.danger),
            ),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final agent = ref.read(agentServiceProvider);
      await agent.deleteSession(session.sessionId);

      setState(() {
        _sessions.removeWhere((s) => s.sessionId == session.sessionId);
      });

      if (mounted) context.showSnack('chat_history.delete'.tr());
    } catch (e) {
      if (mounted) context.showSnack('common.error'.tr(), isError: true);
    }
  }

  Future<void> _clearAll() async {
    if (_sessions.isEmpty) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: context.appColors.card,
        surfaceTintColor: Colors.transparent,
        title: Text('screen.chat_history_screen.clear_all_chat_history'.tr()),
        content: Text(
          'screen.chat_history_screen.this_will_permanently_delete_all_your_chat_sessions'
              .tr(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(
              'screen.chat_history_screen.clear_all'.tr(),
              style: TextStyle(color: AppColors.danger),
            ),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final agent = ref.read(agentServiceProvider);
      await agent.deleteAllSessions();

      if (!mounted) return;
      setState(() => _sessions = []);
      context.showSnack('screen.chat_history_screen.chat_history_cleared'.tr());
    } catch (_) {
      if (!mounted) return;
      context.showSnack('common.error'.tr(), isError: true);
    }
  }

  void _openSession(ChatSession session) {
    if (session.sessionId.trim().isEmpty) {
      context.showSnack('screen.chat_history_screen.invalid_chat_session'.tr(), isError: true);
      return;
    }
    final agentType = session.agentType ?? 'general';
    context.push(
      '${RoutePaths.chat}?agent=$agentType&session=${session.sessionId}',
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final titleColor = isDark ? AppColors.darkText : AppColors.lightText;

    return Scaffold(
      backgroundColor: Colors.transparent,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'chat_history.title'.tr(),
          style: context.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w700,
            color: titleColor,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'common.refresh'.tr(),
            onPressed: _load,
          ),
          IconButton(
            icon: const Icon(Icons.delete_sweep_outlined),
            tooltip: 'screen.chat_history_screen.clear_all_sessions'.tr(),
            onPressed: _clearAll,
          ),
        ],
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
        child: Column(
          children: [
            SizedBox(
              height: MediaQuery.of(context).padding.top + kToolbarHeight,
            ),
            Expanded(child: _buildBody()),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.primary));
    }

    if (_error != null) {
      return Padding(
        padding: AppSpacing.allLg,
        child: ErrorView(
          message: _error!,
          onRetry: _load,
        ),
      );
    }

    if (_sessions.isEmpty) {
      return Center(
        child: Padding(
          padding: AppSpacing.allLg,
          child: Container(
            width: double.infinity,
            padding: AppSpacing.allXl,
            decoration: BoxDecoration(
              color: context.isDark
                  ? Colors.white.withValues(alpha: 0.08)
                  : Colors.white.withValues(alpha: 0.56),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: context.isDark
                    ? Colors.white.withValues(alpha: 0.18)
                    : Colors.white.withValues(alpha: 0.8),
                width: 1.2,
              ),
              boxShadow: [
                BoxShadow(
                  color: (context.isDark ? Colors.black : AppColors.primaryDark)
                      .withValues(alpha: context.isDark ? 0.22 : 0.08),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: EmptyView(
              icon: Icons.forum_outlined,
              title: 'chat_history.empty'.tr(),
              subtitle: 'chat_history.subtitle'.tr(),
            ),
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.primary,
      child: ListView(
        padding: AppSpacing.allLg,
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          Container(
            width: double.infinity,
            padding: AppSpacing.allMd,
            decoration: BoxDecoration(
              color: context.isDark
                  ? Colors.white.withValues(alpha: 0.08)
                  : Colors.white.withValues(alpha: 0.56),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: context.isDark
                    ? Colors.white.withValues(alpha: 0.18)
                    : Colors.white.withValues(alpha: 0.8),
                width: 1.2,
              ),
              boxShadow: [
                BoxShadow(
                  color: (context.isDark ? Colors.black : AppColors.primaryDark)
                      .withValues(alpha: context.isDark ? 0.22 : 0.08),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                const Icon(Icons.history_rounded, color: AppColors.primary),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Text(
                    'Recent conversations',
                    style: context.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                Text(
                  '${_sessions.length}',
                  style: context.textTheme.labelLarge?.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          ...List.generate(_sessions.length, (i) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: i == _sessions.length - 1 ? AppSpacing.xl : AppSpacing.md,
              ),
              child: _SessionCard(
                session: _sessions[i],
                onTap: () => _openSession(_sessions[i]),
                onDelete: () => _delete(_sessions[i]),
              ),
            );
          }),
        ],
      ),
    );
  }
}

// ── Session card ─────────────────────────────────────────

class _SessionCard extends StatelessWidget {
  final ChatSession session;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  const _SessionCard({
    required this.session,
    required this.onTap,
    required this.onDelete,
  });

  static const _agentColors = <String, Color>{
    'crop': AppColors.primary,
    'market': AppColors.info,
    'scheme': AppColors.accent,
    'weather': AppColors.warning,
    'cattle': Color(0xFFEC4899),
    'general': AppColors.primary,
  };

  @override
  Widget build(BuildContext context) {
    final agentType = session.agentType ?? 'general';
    final color = _agentColors[agentType] ?? AppColors.primary;
    final cardColor = context.isDark
        ? Colors.white.withValues(alpha: 0.08)
        : Colors.white.withValues(alpha: 0.56);
    final borderColor = context.isDark
        ? Colors.white.withValues(alpha: 0.18)
        : Colors.white.withValues(alpha: 0.8);

    return Dismissible(
      key: ValueKey(session.sessionId),
      direction: DismissDirection.endToStart,
      confirmDismiss: (_) async {
        onDelete();
        return false; // deletion handled in onDelete with dialog
      },
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: AppSpacing.xl),
        decoration: BoxDecoration(
          color: AppColors.danger,
          borderRadius: AppRadius.mdAll,
        ),
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      child: InkWell(
        borderRadius: AppRadius.mdAll,
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            color: cardColor,
            borderRadius: AppRadius.mdAll,
            border: Border.all(color: borderColor, width: 1.2),
            boxShadow: [
              BoxShadow(
                color: (context.isDark ? Colors.black : AppColors.primaryDark)
                    .withValues(alpha: context.isDark ? 0.22 : 0.08),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          padding: AppSpacing.allMd,
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: color.withValues(alpha: 0.14),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            agentType.capitalize,
                            style: context.textTheme.labelSmall?.copyWith(
                              color: color,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${session.messageCount} messages',
                          style: context.textTheme.bodySmall?.copyWith(
                            color: context.appColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Session ${session.sessionId.substring(0, session.sessionId.length > 10 ? 10 : session.sessionId.length)}',
                      style: context.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              if (session.lastActivity != null)
                Text(
                  session.lastActivity!.timeAgo,
                  style: context.textTheme.labelSmall?.copyWith(
                    color: context.appColors.textSecondary,
                  ),
                ),
              const SizedBox(width: 8),
              Icon(
                Icons.chevron_right_rounded,
                size: 18,
                color: context.appColors.textSecondary,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
