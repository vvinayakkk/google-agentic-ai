import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/models/notification_model.dart';
import '../../../shared/services/notification_service.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_overlay.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  List<AppNotification>? _notifications;
  int _unreadCount = 0;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchNotifications();
  }

  Future<void> _fetchNotifications() async {
    if (!mounted) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final svc = ref.read(notificationServiceProvider);
      final data = await svc.list();
      if (!mounted) return;

      // Parse paginated response
      final items = (data['items'] as List<dynamic>?) ??
          (data['notifications'] as List<dynamic>?) ??
          [];
      final parsed = items
          .map((e) => AppNotification.fromJson(e as Map<String, dynamic>))
          .toList();

      int unread;
      try {
        unread = await svc.getUnreadCount();
      } catch (_) {
        unread = parsed.where((n) => !n.read).length;
      }

      if (!mounted) return;

      setState(() {
        _notifications = parsed;
        _unreadCount = unread;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  Future<void> _markAllRead() async {
    try {
      await ref.read(notificationServiceProvider).markAllRead();
      if (!mounted) return;
      setState(() {
        _notifications = _notifications
            ?.map((n) => AppNotification(
                  notificationId: n.notificationId,
                  userId: n.userId,
                  title: n.title,
                  body: n.body,
                  type: n.type,
                  read: true,
                  data: n.data,
                  createdAt: n.createdAt,
                ))
            .toList();
        _unreadCount = 0;
      });
      if (mounted) context.showSnack('notifications.mark_all_read'.tr());
    } catch (e) {
      if (mounted) context.showSnack(e.toString(), isError: true);
    }
  }

  Future<void> _markRead(int index) async {
    final n = _notifications![index];
    if (n.read) return;
    try {
      await ref.read(notificationServiceProvider).markRead(n.notificationId);
      if (!mounted) return;
      setState(() {
        _notifications![index] = AppNotification(
          notificationId: n.notificationId,
          userId: n.userId,
          title: n.title,
          body: n.body,
          type: n.type,
          read: true,
          data: n.data,
          createdAt: n.createdAt,
        );
        _unreadCount = (_unreadCount - 1).clamp(0, 999);
      });
    } catch (_) {}
  }

  Future<void> _deleteNotification(int index) async {
    final n = _notifications![index];
    try {
      await ref.read(notificationServiceProvider).delete(n.notificationId);
      if (!mounted) return;
      setState(() => _notifications!.removeAt(index));
      if (mounted) context.showSnack('notifications.delete'.tr());
    } catch (e) {
      if (mounted) context.showSnack(e.toString(), isError: true);
    }
  }

  IconData _iconForType(String? type) {
    switch (type) {
      case 'weather':
        return Icons.wb_sunny;
      case 'crop':
        return Icons.eco;
      case 'market':
        return Icons.store;
      case 'alert':
        return Icons.warning_amber;
      case 'order':
        return Icons.shopping_bag;
      case 'payment':
        return Icons.payments;
      case 'reminder':
        return Icons.alarm;
      default:
        return Icons.notifications;
    }
  }

  Color _colorForType(String? type) {
    switch (type) {
      case 'weather':
        return AppColors.warning;
      case 'crop':
        return AppColors.success;
      case 'market':
        return AppColors.info;
      case 'alert':
        return AppColors.danger;
      case 'order':
        return AppColors.accent;
      case 'payment':
        return AppColors.primaryDark;
      case 'reminder':
        return AppColors.warning;
      default:
        return AppColors.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('notifications.title'.tr()),
        actions: [
          if (_notifications != null && _notifications!.isNotEmpty)
            TextButton(
              onPressed: _markAllRead,
              child: Text('notifications.mark_all_read'.tr()),
            ),
        ],
      ),
      body: SafeArea(
        child: _loading
            ? const Center(child: LoadingState())
            : _error != null
                ? ErrorView(
                    message: _error!,
                    onRetry: _fetchNotifications,
                  )
                : _notifications == null || _notifications!.isEmpty
                    ? EmptyView(
                        icon: Icons.notifications_none,
                        title: 'notifications.empty'.tr(),
                        subtitle: 'notifications.subtitle'.tr(),
                      )
                    : Column(
                        children: [
                          // Unread count badge
                          if (_unreadCount > 0)
                            Container(
                              width: double.infinity,
                              padding: AppSpacing.allMd,
                              color: AppColors.primary.withValues(alpha: 0.08),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: AppSpacing.sm,
                                        vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary,
                                      borderRadius: AppRadius.fullAll,
                                    ),
                                    child: Text(
                                      '$_unreadCount',
                                      style: context.textTheme.labelSmall
                                          ?.copyWith(color: Colors.white),
                                    ),
                                  ),
                                  const SizedBox(width: AppSpacing.sm),
                                  Text(
                                    'notifications.unread'.tr(),
                                    style:
                                        context.textTheme.bodySmall?.copyWith(
                                      color: AppColors.primary,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          Expanded(
                            child: RefreshIndicator(
                              onRefresh: _fetchNotifications,
                              child: ListView.separated(
                                padding: AppSpacing.allLg,
                                itemCount: _notifications!.length,
                                separatorBuilder: (_, _) =>
                                    const SizedBox(height: AppSpacing.sm),
                                itemBuilder: (context, index) {
                                  final n = _notifications![index];
                                  final icon = _iconForType(n.type);
                                  final color = _colorForType(n.type);

                                  return Dismissible(
                                    key: ValueKey(n.notificationId),
                                    direction: DismissDirection.endToStart,
                                    background: Container(
                                      alignment: Alignment.centerRight,
                                      padding: const EdgeInsets.only(
                                          right: AppSpacing.xl),
                                      decoration: BoxDecoration(
                                        color: AppColors.danger,
                                        borderRadius: AppRadius.mdAll,
                                      ),
                                      child: const Icon(Icons.delete_outline,
                                          color: Colors.white),
                                    ),
                                    onDismissed: (_) =>
                                        _deleteNotification(index),
                                    child: AppCard(
                                      onTap: () => _markRead(index),
                                      child: Row(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.all(10),
                                            decoration: BoxDecoration(
                                              color: color
                                                  .withValues(alpha: 0.1),
                                              borderRadius: AppRadius.smAll,
                                            ),
                                            child: Icon(icon,
                                                size: 22, color: color),
                                          ),
                                          const SizedBox(width: AppSpacing.md),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  n.title,
                                                  style: context
                                                      .textTheme.titleSmall
                                                      ?.copyWith(
                                                    fontWeight: n.read
                                                        ? FontWeight.normal
                                                        : FontWeight.bold,
                                                  ),
                                                ),
                                                const SizedBox(height: 2),
                                                Text(
                                                  n.body,
                                                  style: context
                                                      .textTheme.bodySmall
                                                      ?.copyWith(
                                                    color: context.appColors
                                                        .textSecondary,
                                                  ),
                                                  maxLines: 2,
                                                  overflow:
                                                      TextOverflow.ellipsis,
                                                ),
                                                if (n.createdAt != null) ...[
                                                  const SizedBox(
                                                      height: AppSpacing.xs),
                                                  Text(
                                                    n.createdAt!.timeAgo,
                                                    style: context
                                                        .textTheme.labelSmall
                                                        ?.copyWith(
                                                      color: context.appColors
                                                          .textSecondary,
                                                    ),
                                                  ),
                                                ],
                                              ],
                                            ),
                                          ),
                                          if (!n.read)
                                            Container(
                                              width: 10,
                                              height: 10,
                                              margin: const EdgeInsets.only(
                                                  top: 4),
                                              decoration: const BoxDecoration(
                                                shape: BoxShape.circle,
                                                color: AppColors.primary,
                                              ),
                                            ),
                                        ],
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ),
                          ),
                        ],
                      ),
      ),
    );
  }
}
