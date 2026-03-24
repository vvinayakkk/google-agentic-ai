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
import '../../../shared/widgets/app_card.dart';
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

  void _openSession(ChatSession session) {
    final agentType = session.agentType ?? 'general';
    context.push(
      '${RoutePaths.chat}?agent=$agentType&session=${session.sessionId}',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: Text('chat_history.title'.tr()),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return ErrorView(
        message: _error!,
        onRetry: _load,
      );
    }

    if (_sessions.isEmpty) {
      return EmptyView(
        icon: Icons.forum_outlined,
        title: 'chat_history.empty'.tr(),
        subtitle: 'chat_history.subtitle'.tr(),
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.primary,
      child: ListView.separated(
        padding: AppSpacing.allLg,
        itemCount: _sessions.length,
        separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.md),
        itemBuilder: (_, i) => _SessionCard(
          session: _sessions[i],
          onTap: () => _openSession(_sessions[i]),
          onDelete: () => _delete(_sessions[i]),
        ),
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

  static const _agentIcons = <String, IconData>{
    'crop': Icons.agriculture,
    'market': Icons.trending_up,
    'scheme': Icons.account_balance,
    'weather': Icons.cloud,
    'cattle': Icons.pets,
    'general': Icons.smart_toy,
  };

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
    final icon = _agentIcons[agentType] ?? Icons.smart_toy;
    final color = _agentColors[agentType] ?? AppColors.primary;

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
      child: AppCard(
        onTap: onTap,
        child: Row(
          children: [
            // Agent icon
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: AppSpacing.md),
            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    agentType.capitalize,
                    style: context.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    '${session.messageCount} messages',
                    style: context.textTheme.bodySmall?.copyWith(
                      color: context.appColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            // Timestamp
            if (session.lastActivity != null)
              Text(
                session.lastActivity!.timeAgo,
                style: context.textTheme.labelSmall?.copyWith(
                  color: context.appColors.textSecondary,
                ),
              ),
            const SizedBox(width: AppSpacing.sm),
            Icon(
              Icons.chevron_right,
              size: 18,
              color: context.appColors.textSecondary,
            ),
          ],
        ),
      ),
    );
  }
}
