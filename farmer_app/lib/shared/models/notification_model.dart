class AppNotification {
  final String notificationId;
  final String userId;
  final String title;
  final String body;
  final String? type;
  final bool read;
  final Map<String, dynamic>? data;
  final DateTime? createdAt;

  const AppNotification({
    required this.notificationId,
    required this.userId,
    required this.title,
    required this.body,
    this.type,
    this.read = false,
    this.data,
    this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) =>
      AppNotification(
        notificationId: json['notification_id'] as String? ?? '',
        userId: json['user_id'] as String? ?? '',
        title: json['title'] as String? ?? '',
        body: json['body'] as String? ?? '',
        type: json['type'] as String?,
        read: json['read'] as bool? ?? false,
        data: json['data'] as Map<String, dynamic>?,
        createdAt: json['created_at'] != null
            ? DateTime.tryParse(json['created_at'] as String)
            : null,
      );
}
