class ChatMessage {
  final String? messageId;
  final String role; // 'user' | 'assistant'
  final String content;
  final String? replyToSnippet;
  final String? agentType;
  final String? sessionId;
  final String? stage;
  final bool isPartial;
  final DateTime timestamp;
  final bool isLoading;
  final List<String>? suggestions;

  const ChatMessage({
    this.messageId,
    required this.role,
    required this.content,
    this.replyToSnippet,
    this.agentType,
    this.sessionId,
    this.stage,
    this.isPartial = false,
    required this.timestamp,
    this.isLoading = false,
    this.suggestions,
  });

  bool get isUser => role == 'user';
  bool get isAssistant => role == 'assistant';

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    List<String>? sugg;
    if (json['suggestions'] is List) {
      sugg = (json['suggestions'] as List)
          .whereType<String>()
          .toList(growable: false);
    }
    return ChatMessage(
      messageId: json['message_id'] as String?,
      role: json['role'] as String? ?? 'assistant',
      content: json['content'] as String? ?? json['response'] as String? ?? '',
      replyToSnippet: json['reply_to_snippet'] as String?,
      agentType: json['agent_type'] as String?,
      sessionId: json['session_id'] as String?,
      stage: json['stage'] as String? ?? json['response_stage'] as String?,
      isPartial: json['is_partial'] as bool? ?? false,
      timestamp: json['timestamp'] != null
          ? DateTime.tryParse(json['timestamp'] as String) ?? DateTime.now()
          : DateTime.now(),
      suggestions: sugg,
    );
  }

      factory ChatMessage.user(String content, {String? replyToSnippet}) => ChatMessage(
        role: 'user',
        content: content,
        replyToSnippet: replyToSnippet,
        timestamp: DateTime.now(),
      );

      factory ChatMessage.loading({String? stage}) => ChatMessage(
        role: 'assistant',
        content: '',
        stage: stage,
        timestamp: DateTime.now(),
        isLoading: true,
      );
}

class ChatSession {
  final String sessionId;
  final String farmerId;
  final String? agentType;
  final int messageCount;
  final DateTime? createdAt;
  final DateTime? lastActivity;

  const ChatSession({
    required this.sessionId,
    required this.farmerId,
    this.agentType,
    this.messageCount = 0,
    this.createdAt,
    this.lastActivity,
  });

  factory ChatSession.fromJson(Map<String, dynamic> json) => ChatSession(
        sessionId: json['session_id'] as String? ?? '',
        farmerId: json['farmer_id'] as String? ?? '',
        agentType: json['agent_type'] as String?,
        messageCount: json['message_count'] as int? ?? 0,
        createdAt: json['created_at'] != null
            ? DateTime.tryParse(json['created_at'] as String)
            : null,
        lastActivity: json['last_activity'] != null
            ? DateTime.tryParse(json['last_activity'] as String)
            : null,
      );
}
