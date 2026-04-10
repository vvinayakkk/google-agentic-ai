import 'dart:async';
import 'dart:convert';

import 'package:audioplayers/audioplayers.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';
import 'dart:io';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/models/chat_message_model.dart';
import '../../../shared/services/agent_service.dart';
import 'shared_thinking_templates.dart';

/// AI Chat screen that works with any agent type.
class ChatScreen extends ConsumerStatefulWidget {
  final String agentType;
  final String? sessionId;
  final String? initialMessage;

  const ChatScreen({
    super.key,
    required this.agentType,
    this.sessionId,
    this.initialMessage,
  });

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  final _messages = <ChatMessage>[];
  final _audioPlayer = AudioPlayer();
  final AudioRecorder _micRecorder = AudioRecorder();

  String? _sessionId;
  String? _resumableSessionId;
  bool _isLoading = false;
  String? _playingMessageId;
  bool _hasText = false;
  bool _isMicRecording = false;
  bool _isMicProcessing = false;
  String _responseMode = 'detailed';
  String? _turnLanguageHint;
  int _micWavePhase = 0;
  int _loadingHintIndex = 0;
  String _loadingHint = '';
  Timer? _micWaveTimer;
  Timer? _loadingHintTimer;
  ChatMessage? _replyTarget;

  static const List<String> _loadingHints =
      SharedThinkingTemplates.loadingHints;

  List<String> _activeLoadingHints() {
    if (context.locale.languageCode == 'hi') {
      return const <String>[
        'आपका सवाल समझ रहा हूँ...',
        'भाषा और आशय पहचान रहा हूँ...',
        'ज़रूरी संदर्भ इकट्ठा कर रहा हूँ...',
        'सटीक उत्तर तैयार कर रहा हूँ...',
        'अंतिम उत्तर लिख रहा हूँ...',
      ];
    }
    return _loadingHints;
  }

  @override
  void initState() {
    super.initState();
    final incomingSession = widget.sessionId?.trim();
    _sessionId = (incomingSession == null || incomingSession.isEmpty)
        ? null
        : incomingSession;
    _controller.addListener(_onTextChanged);
    _loadResumableSessionFromDb();

    if (_sessionId != null) {
      _loadSession();
    }

    final initial = widget.initialMessage?.trim();
    if (initial != null && initial.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _newChat();
        _controller.text = initial;
        _send();
      });
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_loadingHint.isEmpty) {
      _loadingHint = _activeLoadingHints().first;
    }
  }

  void _onTextChanged() {
    final hasText = _controller.text.trim().isNotEmpty;
    if (hasText != _hasText) {
      setState(() => _hasText = hasText);
    }
  }

  @override
  void dispose() {
    _controller.removeListener(_onTextChanged);
    _controller.dispose();
    _scrollController.dispose();
    _audioPlayer.dispose();
    _micWaveTimer?.cancel();
    _loadingHintTimer?.cancel();
    _micRecorder.dispose();
    super.dispose();
  }

  String get _chatTitle {
    switch (widget.agentType.toLowerCase()) {
      case 'weather':
        return 'screen.chat_screen.weather_ai'.tr();
      case 'market':
        return 'screen.chat_screen.market_ai'.tr();
      case 'cattle':
        return 'screen.chat_screen.cattle_ai'.tr();
      case 'crop':
        return 'screen.chat_screen.crop_ai'.tr();
      case 'mental_health':
        return 'screen.chat_screen.mental_health_ai'.tr();
      default:
        return 'screen.chat_screen.kisan_ai_chat'.tr();
    }
  }

  Future<void> _loadResumableSessionFromDb() async {
    try {
      final agent = ref.read(agentServiceProvider);
      final data = await agent.listSessions();
      final all = (data['sessions'] as List<dynamic>? ?? <dynamic>[])
          .map((s) => ChatSession.fromJson(s as Map<String, dynamic>))
          .where((s) => s.sessionId.isNotEmpty)
          .toList();

      all.sort((a, b) {
        final lhs = a.lastActivity ?? a.createdAt ?? DateTime(2000);
        final rhs = b.lastActivity ?? b.createdAt ?? DateTime(2000);
        return rhs.compareTo(lhs);
      });

      final normalizedAgent = widget.agentType.toLowerCase();
      final match = all.where((s) {
        final sid = s.sessionId.trim();
        if (sid.isEmpty || sid == _sessionId) return false;
        final type = (s.agentType ?? '').toLowerCase().trim();
        return type == normalizedAgent;
      });

      final resumable = match.isNotEmpty
          ? match.first.sessionId
          : (all
                    .where(
                      (s) =>
                          s.sessionId.trim().isNotEmpty &&
                          s.sessionId != _sessionId,
                    )
                    .isNotEmpty
                ? all
                      .firstWhere(
                        (s) =>
                            s.sessionId.trim().isNotEmpty &&
                            s.sessionId != _sessionId,
                      )
                      .sessionId
                : null);

      if (!mounted) return;
      setState(() => _resumableSessionId = resumable);
    } catch (_) {
      if (!mounted) return;
      setState(() => _resumableSessionId = null);
    }
  }

  void _startLoadingHints() {
    final hints = _activeLoadingHints();
    _loadingHintTimer?.cancel();
    _loadingHintIndex = 0;
    _loadingHint = hints.first;
    _loadingHintTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      if (!mounted || !_isLoading) return;
      setState(() {
        _loadingHintIndex = (_loadingHintIndex + 1) % hints.length;
        _loadingHint = hints[_loadingHintIndex];
      });
    });
  }

  void _stopLoadingHints() {
    final hints = _activeLoadingHints();
    _loadingHintTimer?.cancel();
    _loadingHintTimer = null;
    _loadingHintIndex = 0;
    _loadingHint = hints.first;
  }

  void _scrollToLatest() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_scrollController.hasClients) return;
      _scrollController.animateTo(
        0,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _resumeLastSession() async {
    final sid = _resumableSessionId;
    if (sid == null || sid.isEmpty) return;
    setState(() {
      _sessionId = sid;
      _messages.clear();
      _resumableSessionId = null;
    });
    await _loadSession();
  }

  String _replySnippet(ChatMessage? msg) {
    if (msg == null) return '';
    final compact = msg.content.replaceAll(RegExp(r'\s+'), ' ').trim();
    if (compact.length <= 160) return compact;
    return '${compact.substring(0, 157)}...';
  }

  String _buildPromptWithReplyContext(String message, String replySnippet) {
    final cleanMessage = message.trim();
    final cleanReply = replySnippet.trim();
    if (cleanReply.isEmpty) return cleanMessage;
    return [
      'Referenced context from earlier chat:',
      cleanReply,
      '',
      'Current question:',
      cleanMessage,
    ].join('\n');
  }

  Map<String, String>? _parseActionCardLabels(dynamic raw) {
    if (raw is! Map) return null;
    final out = <String, String>{};
    for (final entry in raw.entries) {
      final key = entry.key.toString().trim();
      final value = entry.value.toString().trim();
      if (key.isEmpty || value.isEmpty) continue;
      out[key] = value;
    }
    return out.isEmpty ? null : out;
  }

  Future<bool> _pollFinalizeAndRender(
    AgentService agent,
    String requestId,
  ) async {
    const maxAttempts = 8;
    for (var i = 0; i < maxAttempts; i++) {
      final payload = await agent.finalizeChat(
        requestId: requestId,
        timeoutSeconds: 4,
      );
      final status = (payload['status'] ?? '').toString().toLowerCase();

      if (status == 'completed') {
        final finalResult =
            (payload['result'] as Map<String, dynamic>?) ?? <String, dynamic>{};
        List<String>? suggestions;
        List<String>? uiActionCards;
        Map<String, String>? uiActionCardLabels;
        if (finalResult['suggestions'] is List) {
          suggestions = (finalResult['suggestions'] as List)
              .whereType<String>()
              .where((e) => e.trim().isNotEmpty)
              .toList(growable: false);
        } else if (payload['suggestions'] is List) {
          suggestions = (payload['suggestions'] as List)
              .whereType<String>()
              .where((e) => e.trim().isNotEmpty)
              .toList(growable: false);
        }
        if (finalResult['ui_action_cards'] is List) {
          uiActionCards = (finalResult['ui_action_cards'] as List)
              .whereType<String>()
              .where((e) => e.trim().isNotEmpty)
              .toList(growable: false);
        } else if (payload['ui_action_cards'] is List) {
          uiActionCards = (payload['ui_action_cards'] as List)
              .whereType<String>()
              .where((e) => e.trim().isNotEmpty)
              .toList(growable: false);
        }
        uiActionCardLabels =
            _parseActionCardLabels(finalResult['ui_action_card_labels']) ??
            _parseActionCardLabels(payload['ui_action_card_labels']);
        final finalText =
            (payload['final_response'] ??
                    finalResult['response'] ??
                    payload['merged_response'] ??
                    finalResult['content'] ??
                    '')
                .toString()
                .trim();
        final uiRedirectTag =
            (finalResult['ui_redirect_tag'] ?? payload['ui_redirect_tag'] ?? '')
                .toString()
                .trim();
        var transientRemoved = 0;

        setState(() {
          // Replace transient partial/loading assistant content with one final reply.
          final beforeCount = _messages.length;
          _messages.removeWhere(
            (m) =>
                m.role == 'assistant' &&
                (m.isLoading || m.isPartial || m.stage == 'partial'),
          );
          transientRemoved = beforeCount - _messages.length;

          if (finalText.isNotEmpty) {
            _messages.insert(
              0,
              ChatMessage(
                role: 'assistant',
                content: finalText,
                timestamp: DateTime.now(),
                stage: 'final',
                suggestions: suggestions,
                uiRedirectTag: uiRedirectTag.isEmpty ? null : uiRedirectTag,
                uiActionCards: uiActionCards,
                uiActionCardLabels: uiActionCardLabels,
              ),
            );
          }
        });
        debugPrint(
          'chat_finalize_replace request_id=$requestId removed_transient=$transientRemoved inserted_final=${finalText.isNotEmpty}',
        );
        return true;
      }

      if (status == 'failed') {
        final err = (payload['error'] ?? 'Failed to finalize live response.')
            .toString();
        setState(() {
          if (_messages.isNotEmpty && _messages.first.isLoading) {
            _messages.removeAt(0);
          }
          _messages.insert(
            0,
            ChatMessage(
              role: 'assistant',
              content: err,
              timestamp: DateTime.now(),
            ),
          );
        });
        return true;
      }
    }
    return false;
  }

  Future<void> _sendLegacyChat(
    AgentService agent,
    String outboundPrompt,
  ) async {
    final turnLanguage = _turnLanguageHint ?? context.locale.languageCode;
    final data = await agent.chat(
      message: outboundPrompt,
      language: turnLanguage,
      sessionId: _sessionId,
      agentType: widget.agentType,
      responseMode: _responseMode,
    );
    final response = ChatMessage.fromJson(data);
    _sessionId ??= data['session_id'] as String?;

    setState(() {
      if (_messages.isNotEmpty && _messages.first.isLoading) {
        _messages.removeAt(0);
      }
      _messages.insert(0, response);
    });
  }

  String _messageSignature(ChatMessage message) {
    final normalizedContent = message.content
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim()
        .toLowerCase();
    final stage = (message.stage ?? '').trim().toLowerCase();
    return '${message.role}|$stage|$normalizedContent';
  }

  List<ChatMessage> _dedupeLoadedMessages(List<ChatMessage> input) {
    if (input.length < 2) return input;

    final byId = <ChatMessage>[];
    final seenIds = <String>{};
    for (final message in input) {
      final id = (message.messageId ?? '').trim();
      if (id.isNotEmpty && !seenIds.add(id)) {
        continue;
      }
      byId.add(message);
    }

    if (byId.length < 2) return byId;

    final noAdjacentDupes = <ChatMessage>[];
    for (final message in byId) {
      if (noAdjacentDupes.isNotEmpty &&
          _messageSignature(noAdjacentDupes.last) ==
              _messageSignature(message)) {
        continue;
      }
      noAdjacentDupes.add(message);
    }

    if (noAdjacentDupes.length < 4) return noAdjacentDupes;

    final out = <ChatMessage>[];
    var i = 0;
    while (i < noAdjacentDupes.length) {
      if (i + 3 < noAdjacentDupes.length) {
        final first = noAdjacentDupes[i];
        final second = noAdjacentDupes[i + 1];
        final sigFirst = _messageSignature(first);
        final sigSecond = _messageSignature(second);

        if (first.role != second.role) {
          var j = i + 2;
          var repeats = 1;
          while (j + 1 < noAdjacentDupes.length &&
              _messageSignature(noAdjacentDupes[j]) == sigFirst &&
              _messageSignature(noAdjacentDupes[j + 1]) == sigSecond &&
              noAdjacentDupes[j].role == first.role &&
              noAdjacentDupes[j + 1].role == second.role) {
            repeats += 1;
            j += 2;
          }

          if (repeats > 1) {
            out.add(first);
            out.add(second);
            i = j;
            continue;
          }
        }
      }

      out.add(noAdjacentDupes[i]);
      i += 1;
    }

    return out;
  }

  // â”€â”€ Load existing session â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  Future<void> _loadSession() async {
    if (_sessionId == null || _sessionId!.trim().isEmpty) return;
    setState(() => _isLoading = true);

    try {
      final agent = ref.read(agentServiceProvider);
      final data = await agent.getSession(_sessionId!);
      final rawMsgs =
          (data['messages'] as List<dynamic>?)
              ?.map((m) => ChatMessage.fromJson(m as Map<String, dynamic>))
              .toList() ??
          [];
      final msgs = _dedupeLoadedMessages(rawMsgs);

      if (mounted) {
        setState(() {
          _messages
            ..clear()
            ..addAll(msgs.reversed);
          _isLoading = false;
        });
        _loadResumableSessionFromDb();
        _scrollToLatest();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _sessionId = null;
        });
        _loadResumableSessionFromDb();
        context.showSnack('chat.error'.tr(), isError: true);
      }
    }
  }

  // â”€â”€ Send message â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _isLoading) return;

    final replySnippet = _replySnippet(_replyTarget);
    final outboundPrompt = _buildPromptWithReplyContext(text, replySnippet);
    _controller.clear();

    setState(() {
      _messages.insert(0, ChatMessage.user(text, replyToSnippet: replySnippet));
      _messages.insert(0, ChatMessage.loading(stage: 'partial'));
      _replyTarget = null;
      _isLoading = true;
    });
    _loadingHint = _loadingHints.first;
    _startLoadingHints();
    _scrollToLatest();

    try {
      final agent = ref.read(agentServiceProvider);
      if (text.toLowerCase().startsWith('/search ')) {
        final query = text.substring(8).trim();
        final data = await agent.search(query: query);
        final results = (data['results'] as List?) ?? const [];
        final lines = <String>[
          'Search results for "$query":',
          if (results.isEmpty) 'No relevant matches found.',
        ];

        for (final item in results.take(5)) {
          if (item is Map<String, dynamic>) {
            final title =
                (item['title'] ?? item['source'] ?? item['id'] ?? 'Result')
                    .toString();
            final snippet =
                (item['snippet'] ?? item['text'] ?? item['content'] ?? '')
                    .toString()
                    .trim();
            lines.add('- $title${snippet.isNotEmpty ? ': $snippet' : ''}');
          } else {
            lines.add('- ${item.toString()}');
          }
        }

        setState(() {
          if (_messages.isNotEmpty && _messages.first.isLoading) {
            _messages.removeAt(0);
          }
          _messages.insert(
            0,
            ChatMessage(
              role: 'assistant',
              content: lines.join('\n'),
              timestamp: DateTime.now(),
            ),
          );
        });
      } else {
        final turnLanguage = _turnLanguageHint ?? context.locale.languageCode;
        final prepare = await agent.prepareChat(
          message: outboundPrompt,
          language: turnLanguage,
          sessionId: _sessionId,
          agentType: widget.agentType,
          allowFallback: true,
          responseMode: _responseMode,
        );
        _sessionId ??= (prepare['session_id'] as String?);

        final partialText =
            (prepare['partial_response'] ?? prepare['response'] ?? '')
                .toString()
                .trim();

        final requestId = (prepare['request_id'] ?? '').toString().trim();
        final prepareStatus = (prepare['status'] ?? '')
            .toString()
            .trim()
            .toLowerCase();
        var completed = false;
        if (requestId.isNotEmpty) {
          setState(() {
            _loadingHintIndex = 4;
            _loadingHint = _loadingHints[_loadingHintIndex];
          });
          completed = await _pollFinalizeAndRender(agent, requestId);
        } else if (prepareStatus == 'completed' && partialText.isNotEmpty) {
          final uiRedirectTag = (prepare['ui_redirect_tag'] ?? '')
              .toString()
              .trim();
          List<String>? uiActionCards;
          Map<String, String>? uiActionCardLabels;
          if (prepare['ui_action_cards'] is List) {
            uiActionCards = (prepare['ui_action_cards'] as List)
                .whereType<String>()
                .where((e) => e.trim().isNotEmpty)
                .toList(growable: false);
          }
          uiActionCardLabels = _parseActionCardLabels(
            prepare['ui_action_card_labels'],
          );
          setState(() {
            if (_messages.isNotEmpty && _messages.first.isLoading) {
              _messages.removeAt(0);
            }
            _messages.insert(
              0,
              ChatMessage(
                role: 'assistant',
                content: partialText,
                timestamp: DateTime.now(),
                stage: 'final',
                uiRedirectTag: uiRedirectTag.isEmpty ? null : uiRedirectTag,
                uiActionCards: uiActionCards,
                uiActionCardLabels: uiActionCardLabels,
              ),
            );
          });
          completed = true;
        }

        if (!completed) {
          await _sendLegacyChat(agent, outboundPrompt);
          if (_messages.isNotEmpty && _messages.first.isLoading) {
            setState(() {
              _messages.removeAt(0);
            });
          }
        }
      }

      setState(() {
        if (_messages.isNotEmpty && _messages.first.isLoading) {
          _messages.removeAt(0);
        }
        _isLoading = false;
        _turnLanguageHint = null;
      });
      _stopLoadingHints();
      _loadResumableSessionFromDb();
      _scrollToLatest();
    } catch (e) {
      setState(() {
        if (_messages.isNotEmpty && _messages.first.isLoading) {
          _messages.removeAt(0);
        }
        _messages.insert(
          0,
          ChatMessage(
            role: 'assistant',
            content: 'chat.error'.tr(),
            timestamp: DateTime.now(),
          ),
        );
        _isLoading = false;
        _turnLanguageHint = null;
      });
      _stopLoadingHints();
      _loadResumableSessionFromDb();
      _scrollToLatest();
    }
  }

  // â”€â”€ TTS playback on AI messages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  Future<void> _playTts(ChatMessage message) async {
    final msgId = message.messageId ?? message.content.hashCode.toString();
    if (_playingMessageId == msgId) {
      await _audioPlayer.stop();
      setState(() => _playingMessageId = null);
      return;
    }

    setState(() => _playingMessageId = msgId);

    try {
      final voice = ref.read(voiceServiceProvider);
      final ttsLanguage =
          message.language ?? _turnLanguageHint ?? context.locale.languageCode;
      final data = await voice.ttsBase64(
        text: message.content,
        language: ttsLanguage,
      );

      final audioBase64 = data['audio_base64'] as String? ?? '';
      if (audioBase64.isEmpty) {
        if (mounted) setState(() => _playingMessageId = null);
        return;
      }

      final bytes = base64Decode(audioBase64);
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/tts_${msgId.hashCode}.wav');
      await file.writeAsBytes(bytes);

      await _audioPlayer.play(DeviceFileSource(file.path));
      _audioPlayer.onPlayerComplete.listen((_) {
        if (mounted) setState(() => _playingMessageId = null);
      });
    } catch (e) {
      if (mounted) {
        setState(() => _playingMessageId = null);
        context.showSnack('chat.error'.tr(), isError: true);
      }
    }
  }

  // â”€â”€ New chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  void _newChat() {
    setState(() {
      _messages.clear();
      _sessionId = null;
      _controller.clear();
      _isLoading = false;
    });
    _stopLoadingHints();
    _loadResumableSessionFromDb();
  }

  Future<void> _toggleInlineMic() async {
    if (_isMicProcessing) return;
    if (_isMicRecording) {
      await _stopInlineMic();
    } else {
      await _startInlineMic();
    }
  }

  Future<void> _startInlineMic() async {
    final status = await Permission.microphone.request();
    if (!status.isGranted) {
      if (mounted) {
        context.showSnack(
          'voice_assistant.permission_denied'.tr(),
          isError: true,
        );
      }
      return;
    }

    final dir = await getTemporaryDirectory();
    final recordPath =
        '${dir.path}/chat_stt_${DateTime.now().millisecondsSinceEpoch}.wav';

    await _micRecorder.start(
      const RecordConfig(encoder: AudioEncoder.wav),
      path: recordPath,
    );

    _micWaveTimer?.cancel();
    _micWaveTimer = Timer.periodic(const Duration(milliseconds: 140), (_) {
      if (!mounted || !_isMicRecording) return;
      setState(() {
        _micWavePhase = (_micWavePhase + 1) % 1000;
      });
    });

    setState(() {
      _isMicRecording = true;
      _isMicProcessing = false;
    });
  }

  Future<void> _stopInlineMic() async {
    _micWaveTimer?.cancel();
    final path = await _micRecorder.stop();

    setState(() {
      _isMicRecording = false;
      _isMicProcessing = true;
    });

    if (path == null || path.isEmpty) {
      if (mounted) {
        setState(() => _isMicProcessing = false);
        context.showSnack('speech_to_text.no_result'.tr(), isError: true);
      }
      return;
    }

    try {
      final voice = ref.read(voiceServiceProvider);
      final data = await voice.stt(path, language: 'auto');

      if (!mounted) return;

      final transcript = (data['transcript'] as String? ?? '').trim();
      final detectedLanguage = (data['language_code'] as String? ?? '').trim();
      if (transcript.isNotEmpty) {
        _controller.text = transcript;
        _controller.selection = TextSelection.fromPosition(
          TextPosition(offset: _controller.text.length),
        );
        if (detectedLanguage.isNotEmpty) {
          _turnLanguageHint = detectedLanguage;
        }
      } else {
        context.showSnack('speech_to_text.no_result'.tr(), isError: true);
      }

      setState(() {
        _isMicProcessing = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isMicProcessing = false;
      });
      context.showSnack('voice_assistant.error'.tr(), isError: true);
    }
  }

  // â”€â”€ Chip data with icons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  static const _chipData = <_ChipInfo>[
    _ChipInfo(
      'screen.chat_screen.marketplace',
      Icons.storefront_outlined,
      AppColors.info,
      RoutePaths.marketplace,
    ),
    _ChipInfo(
      'screen.chat_screen.calendar',
      Icons.calendar_month_outlined,
      AppColors.accent,
      RoutePaths.calendar,
    ),
    _ChipInfo(
      'screen.chat_screen.cattle',
      Icons.pets_outlined,
      AppColors.warning,
      RoutePaths.cattle,
    ),
    _ChipInfo(
      'screen.chat_screen.weather',
      Icons.cloud_outlined,
      AppColors.primary,
      RoutePaths.weather,
    ),
    _ChipInfo(
      'screen.chat_screen.soil_moisture',
      Icons.water_drop_outlined,
      AppColors.primary,
      RoutePaths.soilMoisture,
    ),
    _ChipInfo(
      'screen.chat_screen.best_out_of_waste',
      Icons.recycling_outlined,
      AppColors.success,
      RoutePaths.waste,
    ),
    _ChipInfo(
      'screen.chat_screen.education_finance',
      Icons.school_outlined,
      AppColors.success,
      RoutePaths.upi,
    ),
    _ChipInfo(
      'screen.chat_screen.document_builder',
      Icons.description_outlined,
      Color(0xFF2563EB),
      RoutePaths.documents,
    ),
    _ChipInfo(
      'screen.chat_screen.crop_doctor',
      Icons.local_florist_outlined,
      Color(0xFFDC2626),
      RoutePaths.cropDoctor,
    ),
    _ChipInfo(
      'screen.chat_screen.equipment_rental',
      Icons.agriculture_outlined,
      Color(0xFF7C3AED),
      RoutePaths.rental,
    ),
    _ChipInfo(
      'screen.chat_screen.mental_health_2',
      Icons.favorite_outline,
      Color(0xFFDB2777),
      RoutePaths.mentalHealth,
    ),
  ];

  Widget _modeChip(BuildContext context, String value, String labelKey) {
    final selected = _responseMode == value;
    return ChoiceChip(
      label: Text(labelKey.tr()),
      selected: selected,
      checkmarkColor: context.isDark ? Colors.white : Colors.black87,
      onSelected: (_) {
        setState(() => _responseMode = value);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final chipBorder = isDark ? Colors.white60 : Colors.black87;
    final headingColor = isDark ? Colors.white : Colors.black87;
    final hasMessages = _messages.isNotEmpty;
    String? latestUserPrompt;
    for (final m in _messages) {
      if (m.isUser) {
        latestUserPrompt = m.content;
        break;
      }
    }

    return Scaffold(
      backgroundColor: Colors.transparent,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: Text(_chatTitle),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_comment_outlined),
            tooltip: 'chat.new_chat'.tr(),
            onPressed: _newChat,
          ),
          IconButton(
            icon: const Icon(Icons.history),
            tooltip: 'chat_history.title'.tr(),
            onPressed: () => context.push(RoutePaths.chatHistory),
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
            Expanded(
              child: hasMessages
                  ? ListView.builder(
                      controller: _scrollController,
                      reverse: true,
                      padding: AppSpacing.allLg,
                      itemCount: _messages.length,
                      itemBuilder: (_, i) {
                        final msg = _messages[i];
                        final keySeed =
                            msg.messageId ??
                            '${msg.timestamp.microsecondsSinceEpoch}-${msg.role}-${msg.content.hashCode}';
                        return _ChatBubble(
                          key: ValueKey(keySeed),
                          message: msg,
                          loadingText: _loadingHint,
                          thinkingContext: latestUserPrompt,
                          allowTypingAnimation:
                              i == 0 && msg.isAssistant && !msg.isLoading,
                          isPlaying:
                              _playingMessageId ==
                              (msg.messageId ??
                                  msg.content.hashCode.toString()),
                          onTts: msg.isAssistant && !msg.isLoading
                              ? () => _playTts(msg)
                              : null,
                          onReply: msg.isLoading
                              ? null
                              : () {
                                  setState(() => _replyTarget = msg);
                                  context.showSnack(
                                    'screen.chat_screen.reply_target_selected'
                                        .tr(),
                                  );
                                },
                          onSuggestionTap: (suggestion) {
                            final clean = suggestion.trim();
                            if (clean.isEmpty) return;
                            _controller.text = clean;
                            _controller.selection = TextSelection.fromPosition(
                              TextPosition(offset: _controller.text.length),
                            );
                            _send();
                          },
                        );
                      },
                    )
                  : Center(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.xl,
                          vertical: AppSpacing.lg,
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (_resumableSessionId != null &&
                                _resumableSessionId!.isNotEmpty) ...[
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(12),
                                margin: const EdgeInsets.only(bottom: 12),
                                decoration: BoxDecoration(
                                  color: isDark
                                      ? Colors.white.withValues(alpha: 0.08)
                                      : Colors.white.withValues(alpha: 0.56),
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(
                                    color: isDark
                                        ? Colors.white.withValues(alpha: 0.18)
                                        : Colors.white.withValues(alpha: 0.8),
                                    width: 1.2,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color:
                                          (isDark
                                                  ? Colors.black
                                                  : AppColors.primaryDark)
                                              .withValues(
                                                alpha: isDark ? 0.22 : 0.08,
                                              ),
                                      blurRadius: 10,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: Row(
                                  children: [
                                    const Icon(
                                      Icons.history,
                                      color: AppColors.primary,
                                      size: 18,
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        'screen.chat_screen.resume_your_previous_chat_session'
                                            .tr(),
                                        style: context.textTheme.bodyMedium,
                                      ),
                                    ),
                                    TextButton(
                                      onPressed: _resumeLastSession,
                                      child: Text('screen.chat_screen.resume'.tr()),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                            // â”€â”€ Heading â”€â”€
                            Text(
                              'screen.chat_screen.what_can_i_help_with'.tr(),
                              style: context.textTheme.headlineSmall?.copyWith(
                                fontWeight: FontWeight.w700,
                                color: headingColor,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.lg),
                            // â”€â”€ Chips â”€â”€
                            Wrap(
                              alignment: WrapAlignment.center,
                              spacing: 8,
                              runSpacing: 8,
                              children: _chipData.map((chip) {
                                return InkWell(
                                  borderRadius: BorderRadius.circular(18),
                                  onTap: () => context.push(chip.route),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 7,
                                    ),
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(18),
                                      border: Border.all(
                                        color: chipBorder,
                                        width: 1.1,
                                      ),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Container(
                                          width: 24,
                                          height: 24,
                                          decoration: BoxDecoration(
                                            shape: BoxShape.circle,
                                            border: Border.all(
                                              color: chipBorder,
                                              width: 1.1,
                                            ),
                                          ),
                                          child: Center(
                                            child: Icon(
                                              chip.icon,
                                              size: 14,
                                              color: chip.color,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 7),
                                        Text(
                                          chip.labelKey.tr(),
                                          style: context.textTheme.bodySmall
                                              ?.copyWith(color: chipBorder),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              }).toList(),
                            ),
                          ],
                        ),
                      ),
                    ),
            ),

            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.xs,
              ),
              child: Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  _modeChip(context, 'brief', 'screen.chat_screen.brief'),
                  _modeChip(context, 'detailed', 'screen.chat_screen.detailed'),
                  _modeChip(context, 'step-by-step', 'screen.chat_screen.step_by_step'),
                  _modeChip(context, 'voice-friendly', 'screen.chat_screen.voice'),
                ],
              ),
            ),

            // â”€â”€ Input bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            _ChatInputBar(
              controller: _controller,
              isLoading: _isLoading,
              hasText: _hasText,
              replySnippet: _replySnippet(_replyTarget),
              onClearReply: _replyTarget == null
                  ? null
                  : () {
                      setState(() => _replyTarget = null);
                    },
              onSend: _send,
              onAdd: () => _showAddOptionsSheet(context),
              onMic: _toggleInlineMic,
              onLiveVoice: () => context.push(RoutePaths.liveVoice),
              isMicRecording: _isMicRecording,
              isMicProcessing: _isMicProcessing,
              micWavePhase: _micWavePhase,
            ),
          ],
        ),
      ),
    );
  }
}

// â”€â”€ Chip info â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class _ChipInfo {
  final String labelKey;
  final IconData icon;
  final Color color;
  final String route;
  const _ChipInfo(this.labelKey, this.icon, this.color, this.route);
}

// â”€â”€ Chat bubble â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class _ChatBubble extends StatefulWidget {
  final ChatMessage message;
  final String loadingText;
  final String? thinkingContext;
  final bool allowTypingAnimation;
  final bool isPlaying;
  final VoidCallback? onTts;
  final VoidCallback? onReply;
  final void Function(String suggestion)? onSuggestionTap;

  const _ChatBubble({
    super.key,
    required this.message,
    this.loadingText = '',
    this.thinkingContext,
    this.allowTypingAnimation = true,
    this.isPlaying = false,
    this.onTts,
    this.onReply,
    this.onSuggestionTap,
  });

  @override
  State<_ChatBubble> createState() => _ChatBubbleState();

  List<String> _normalizedActionTags() {
    final alias = <String, String>{
      'market': 'marketplace',
      'scheme': 'documents',
      'schemes': 'documents',
      'equipment': 'equipment_marketplace',
      'livestock': 'cattle',
      'live-voice': 'live_voice',
      'livevoice': 'live_voice',
      'chat-history': 'chat_history',
      'soilmoisture': 'soil_moisture',
      'farmviz': 'farm_viz',
      'languageselect': 'language_select',
    };
    final out = <String>[];
    final seen = <String>{};

    void addTag(String? rawTag) {
      var key = (rawTag ?? '').trim().toLowerCase();
      if (key.isEmpty) return;
      key = key.replaceAll('-', '_').replaceAll(' ', '_');
      key = alias[key] ?? key;
      if (seen.add(key)) out.add(key);
    }

    for (final t in message.uiActionCards ?? const <String>[]) {
      addTag(t);
    }

    if (out.isEmpty) {
      addTag(message.uiRedirectTag);
    }

    return out;
  }

  List<({String label, IconData icon, String route})> _contextActions(
    BuildContext context,
  ) {
    final actionsByTag =
        <String, ({String label, IconData icon, String route})>{
          'home': (
            label: 'screen.chat_screen.open_home'.tr(),
            icon: Icons.home_outlined,
            route: RoutePaths.home,
          ),
          'featured': (
            label: 'screen.chat_screen.open_featured'.tr(),
            icon: Icons.star_outline,
            route: RoutePaths.featured,
          ),
          'chat': (
            label: 'screen.chat_screen.open_chat'.tr(),
            icon: Icons.chat_bubble_outline,
            route: RoutePaths.chat,
          ),
          'live_voice': (
            label: 'screen.chat_screen.open_live_voice'.tr(),
            icon: Icons.keyboard_voice_outlined,
            route: RoutePaths.liveVoice,
          ),
          'chat_history': (
            label: 'screen.chat_screen.open_chat_history'.tr(),
            icon: Icons.history_outlined,
            route: RoutePaths.chatHistory,
          ),
          'profile': (
            label: 'screen.chat_screen.open_profile'.tr(),
            icon: Icons.person_outline,
            route: RoutePaths.profile,
          ),
          'crop_cycle': (
            label: 'screen.chat_screen.open_crop_cycle'.tr(),
            icon: Icons.timeline_outlined,
            route: RoutePaths.cropCycle,
          ),
          'crop_intelligence': (
            label: 'screen.chat_screen.open_crop_intelligence'.tr(),
            icon: Icons.insights_outlined,
            route: RoutePaths.cropIntelligence,
          ),
          'crop_doctor': (
            label: 'screen.chat_screen.open_crop_doctor'.tr(),
            icon: Icons.medical_services_outlined,
            route: RoutePaths.cropDoctor,
          ),
          'contract_farming': (
            label: 'screen.chat_screen.open_contract_farming'.tr(),
            icon: Icons.description_outlined,
            route: RoutePaths.contractFarming,
          ),
          'credit_sources': (
            label: 'screen.chat_screen.open_credit_sources'.tr(),
            icon: Icons.account_balance_outlined,
            route: RoutePaths.creditSources,
          ),
          'crop_insurance': (
            label: 'screen.chat_screen.open_crop_insurance'.tr(),
            icon: Icons.shield_outlined,
            route: RoutePaths.cropInsurance,
          ),
          'market_strategy': (
            label: 'screen.chat_screen.open_market_strategy'.tr(),
            icon: Icons.trending_up_outlined,
            route: RoutePaths.marketStrategy,
          ),
          'power_supply': (
            label: 'screen.chat_screen.open_power_supply'.tr(),
            icon: Icons.bolt_outlined,
            route: RoutePaths.powerSupply,
          ),
          'soil_health': (
            label: 'screen.chat_screen.open_soil_health'.tr(),
            icon: Icons.science_outlined,
            route: RoutePaths.soilHealth,
          ),
          'marketplace': (
            label: 'screen.chat_screen.open_marketplace'.tr(),
            icon: Icons.storefront_outlined,
            route: RoutePaths.marketplace,
          ),
          'market_prices': (
            label: 'screen.chat_screen.open_market_prices'.tr(),
            icon: Icons.attach_money_outlined,
            route: RoutePaths.marketPrices,
          ),
          'add_listing': (
            label: 'screen.chat_screen.open_add_listing'.tr(),
            icon: Icons.add_box_outlined,
            route: RoutePaths.addListing,
          ),
          'rental': (
            label: 'screen.chat_screen.open_rental_hub'.tr(),
            icon: Icons.build_outlined,
            route: RoutePaths.rental,
          ),
          'equipment_hub': (
            label: 'screen.chat_screen.open_equipment_hub'.tr(),
            icon: Icons.handyman_outlined,
            route: RoutePaths.equipmentHub,
          ),
          'equipment_marketplace': (
            label: 'screen.chat_screen.open_equipment'.tr(),
            icon: Icons.agriculture_outlined,
            route: RoutePaths.equipmentMarketplace,
          ),
          'rental_ticket': (
            label: 'screen.chat_screen.open_rental_ticket'.tr(),
            icon: Icons.confirmation_number_outlined,
            route: RoutePaths.rentalTicket,
          ),
          'rental_rate_detail': (
            label: 'screen.chat_screen.open_rental_rate_detail'.tr(),
            icon: Icons.receipt_long_outlined,
            route: RoutePaths.rentalRateDetail,
          ),
          'my_equipment': (
            label: 'screen.chat_screen.open_my_equipment'.tr(),
            icon: Icons.inventory_2_outlined,
            route: RoutePaths.myEquipment,
          ),
          'listing_details': (
            label: 'screen.chat_screen.open_listing_details'.tr(),
            icon: Icons.bookmark_outline,
            route: RoutePaths.listingDetails,
          ),
          'my_bookings': (
            label: 'screen.chat_screen.open_my_bookings'.tr(),
            icon: Icons.event_available_outlined,
            route: RoutePaths.myBookings,
          ),
          'earnings': (
            label: 'screen.chat_screen.open_earnings'.tr(),
            icon: Icons.payments_outlined,
            route: RoutePaths.earnings,
          ),
          'weather': (
            label: 'screen.chat_screen.open_weather'.tr(),
            icon: Icons.cloud_outlined,
            route: RoutePaths.weather,
          ),
          'soil_moisture': (
            label: 'screen.chat_screen.open_soil_moisture'.tr(),
            icon: Icons.water_drop_outlined,
            route: RoutePaths.soilMoisture,
          ),
          'cattle': (
            label: 'screen.chat_screen.open_cattle'.tr(),
            icon: Icons.pets_outlined,
            route: RoutePaths.cattle,
          ),
          'calendar': (
            label: 'screen.chat_screen.open_calendar'.tr(),
            icon: Icons.calendar_month_outlined,
            route: RoutePaths.calendar,
          ),
          'notifications': (
            label: 'screen.chat_screen.open_notifications'.tr(),
            icon: Icons.notifications_outlined,
            route: RoutePaths.notifications,
          ),
          'upi': (
            label: 'screen.chat_screen.open_upi'.tr(),
            icon: Icons.account_balance_wallet_outlined,
            route: RoutePaths.upi,
          ),
          'documents': (
            label: 'screen.chat_screen.open_schemes'.tr(),
            icon: Icons.account_balance_wallet_outlined,
            route: RoutePaths.documents,
          ),
          'document_builder': (
            label: 'screen.chat_screen.open_documents'.tr(),
            icon: Icons.description_outlined,
            route: RoutePaths.documentBuilder,
          ),
          'document_build': (
            label: 'screen.chat_screen.open_document_build'.tr(),
            icon: Icons.description_outlined,
            route: RoutePaths.documentBuild,
          ),
          'document_vault': (
            label: 'screen.chat_screen.open_document_vault'.tr(),
            icon: Icons.folder_outlined,
            route: RoutePaths.documentVault,
          ),
          'document_agent': (
            label: 'screen.chat_screen.open_document_agent'.tr(),
            icon: Icons.chat_bubble_outline,
            route: RoutePaths.documentAgent,
          ),
          'equipment_rental_rates': (
            label: 'screen.chat_screen.open_equipment_rates'.tr(),
            icon: Icons.attach_money_outlined,
            route: RoutePaths.equipmentRentalRates,
          ),
          'waste': (
            label: 'screen.chat_screen.open_waste'.tr(),
            icon: Icons.recycling_outlined,
            route: RoutePaths.waste,
          ),
          'mental_health': (
            label: 'screen.chat_screen.open_mental_health'.tr(),
            icon: Icons.self_improvement_outlined,
            route: RoutePaths.mentalHealth,
          ),
          'farm_viz': (
            label: 'screen.chat_screen.open_farm_viz'.tr(),
            icon: Icons.map_outlined,
            route: RoutePaths.farmViz,
          ),
          'language_select': (
            label: 'screen.chat_screen.open_language'.tr(),
            icon: Icons.language_outlined,
            route: RoutePaths.languageSelect,
          ),
          'login': (
            label: 'screen.chat_screen.open_login'.tr(),
            icon: Icons.person_outline,
            route: RoutePaths.login,
          ),
          'fetching_location': (
            label: 'screen.chat_screen.open_location_setup'.tr(),
            icon: Icons.map_outlined,
            route: RoutePaths.fetchingLocation,
          ),
          'splash': (
            label: 'screen.chat_screen.open_splash'.tr(),
            icon: Icons.star_outline,
            route: RoutePaths.splash,
          ),
        };

    final localizedLabels =
        message.uiActionCardLabels ?? const <String, String>{};
    if (localizedLabels.isNotEmpty) {
      for (final entry in localizedLabels.entries) {
        final tag = entry.key.trim();
        final localized = entry.value.trim();
        final action = actionsByTag[tag];
        if (tag.isEmpty || localized.isEmpty || action == null) continue;
        actionsByTag[tag] = (
          label: localized,
          icon: action.icon,
          route: action.route,
        );
      }
    }

    final out = <({String label, IconData icon, String route})>[];
    final seen = <String>{};
    for (final tag in _normalizedActionTags()) {
      final action = actionsByTag[tag];
      if (action == null) continue;
      if (seen.add(action.route)) {
        out.add(action);
      }
      if (out.length >= 4) break;
    }
    return out;
  }

  String _messageTopic() {
    final tags = _normalizedActionTags().toSet();
    if (tags.contains('calendar')) {
      return 'calendar';
    }
    if (tags.contains('weather') || tags.contains('soil_moisture')) {
      return 'weather';
    }
    if (tags.contains('marketplace') ||
        tags.contains('market_prices') ||
        tags.contains('market_strategy') ||
        tags.contains('add_listing')) {
      return 'market';
    }
    if (tags.contains('equipment_marketplace') ||
        tags.contains('equipment_hub') ||
        tags.contains('rental') ||
        tags.contains('equipment_rental_rates')) {
      return 'equipment';
    }
    if (tags.contains('documents') ||
        tags.contains('document_builder') ||
        tags.contains('document_build') ||
        tags.contains('document_vault') ||
        tags.contains('document_agent') ||
        tags.contains('crop_insurance') ||
        tags.contains('credit_sources')) {
      return 'schemes';
    }
    if (tags.contains('cattle')) {
      return 'livestock';
    }
    if (tags.contains('crop_cycle') ||
        tags.contains('crop_intelligence') ||
        tags.contains('crop_doctor') ||
        tags.contains('soil_health')) {
      return 'crop';
    }
    return 'general';
  }

  bool _suggestionMatchesTopic(String suggestion, String topic) {
    final s = suggestion.toLowerCase();
    switch (topic) {
      case 'calendar':
        return RegExp(
          r'calendar|event|schedule|task|reminder|undo|reschedule',
        ).hasMatch(s);
      case 'weather':
        return RegExp(
          r'weather|rain|forecast|temperature|humidity|soil',
        ).hasMatch(s);
      case 'market':
        return RegExp(r'market|mandi|price|rate|sell|buyer').hasMatch(s);
      case 'equipment':
        return RegExp(
          r'equipment|rental|tractor|harvester|sprayer',
        ).hasMatch(s);
      case 'schemes':
        return RegExp(
          r'scheme|subsidy|eligibility|document|pm-kisan|kcc|pmfby',
        ).hasMatch(s);
      case 'livestock':
        return RegExp(r'livestock|dairy|cattle|goat|poultry').hasMatch(s);
      default:
        return true;
    }
  }

  List<String> _relevantSuggestions() {
    final topic = _messageTopic();
    final all = (message.suggestions ?? const <String>[])
        .where((s) => s.trim().isNotEmpty)
        .toList(growable: false);
    if (all.isEmpty || topic == 'general') {
      return all.take(4).toList(growable: false);
    }

    final filtered = all
        .where((s) => _suggestionMatchesTopic(s, topic))
        .toList(growable: false);

    if (filtered.isNotEmpty) {
      return filtered.take(4).toList(growable: false);
    }
    return all.take(2).toList(growable: false);
  }
}

class _ChatBubbleState extends State<_ChatBubble> {
  bool _typingComplete = false;

  String _calendarComposerRoute() {
    final raw = widget.message.content.trim();
    final firstLine = raw.split('\n').first.trim();
    final titleSeed = firstLine.isEmpty
        ? 'Farm Task from AI Chat'
        : (firstLine.length > 72
              ? '${firstLine.substring(0, 72)}...'
              : firstLine);
    final notesSeed = raw.length > 400 ? raw.substring(0, 400) : raw;
    return Uri(
      path: RoutePaths.calendar,
      queryParameters: <String, String>{
        'open_add': '1',
        'title': titleSeed,
        if (notesSeed.isNotEmpty) 'notes': notesSeed,
      },
    ).toString();
  }

  void _openContextRoute(String route) {
    if (route == RoutePaths.calendar) {
      context.push(_calendarComposerRoute());
      return;
    }
    context.push(route);
  }

  bool _shouldAnimateTypingFor(ChatMessage msg) {
    return widget.allowTypingAnimation &&
        !msg.isUser &&
        DateTime.now().difference(msg.timestamp).inSeconds <= 15;
  }

  @override
  void initState() {
    super.initState();
    _typingComplete = !_shouldAnimateTypingFor(widget.message);
  }

  @override
  void didUpdateWidget(covariant _ChatBubble oldWidget) {
    super.didUpdateWidget(oldWidget);
    final messageChanged =
        oldWidget.message.messageId != widget.message.messageId ||
        oldWidget.message.content != widget.message.content ||
        oldWidget.message.timestamp != widget.message.timestamp ||
        oldWidget.message.isLoading != widget.message.isLoading ||
        oldWidget.message.stage != widget.message.stage;
    if (messageChanged) {
      _typingComplete = !_shouldAnimateTypingFor(widget.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.message.isLoading) {
      return _TypingIndicator(
        text: widget.loadingText,
        contextHint: widget.thinkingContext,
      );
    }

    final isUser = widget.message.isUser;
    final isDark = context.isDark;
    final userBg = isDark
        ? const Color(0xFF233146).withValues(alpha: 0.86)
        : const Color(0xFFDDE7F7).withValues(alpha: 0.94);
    final assistantBg = isDark
        ? Colors.white.withValues(alpha: 0.08)
        : Colors.white.withValues(alpha: 0.42);
    final replyText = (widget.message.replyToSnippet ?? '').trim();
    final shouldAnimateTyping = _shouldAnimateTypingFor(widget.message);
    final showTailUi = !shouldAnimateTyping || _typingComplete;
    final contextActions = isUser
        ? const <({String label, IconData icon, String route})>[]
      : widget._contextActions(context);

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: GestureDetector(
        onHorizontalDragEnd: (details) {
          if (widget.onReply == null) return;
          final vx = details.primaryVelocity ?? 0;
          if (vx.abs() > 260) widget.onReply!.call();
        },
        child: Container(
          constraints: BoxConstraints(
            maxWidth: MediaQuery.sizeOf(context).width * 0.82,
          ),
          margin: const EdgeInsets.only(bottom: AppSpacing.sm),
          padding: AppSpacing.allMd,
          decoration: BoxDecoration(
            color: isUser ? userBg : assistantBg,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(AppRadius.md),
              topRight: const Radius.circular(AppRadius.md),
              bottomLeft: Radius.circular(isUser ? AppRadius.md : 0),
              bottomRight: Radius.circular(isUser ? 0 : AppRadius.md),
            ),
            border: Border.all(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.15)
                  : Colors.white.withValues(alpha: 0.88),
              width: 0.9,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (replyText.isNotEmpty) ...[
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.08)
                        : Colors.white.withValues(alpha: 0.58),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.16)
                          : Colors.white.withValues(alpha: 0.86),
                    ),
                  ),
                  child: Text(
                    replyText,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: context.textTheme.bodySmall?.copyWith(
                      color: context.appColors.textSecondary,
                    ),
                  ),
                ),
              ],
              if (isUser)
                Text(
                  widget.message.content,
                  style: context.textTheme.bodyMedium?.copyWith(
                    color: isDark ? Colors.white : const Color(0xFF1C2430),
                    fontWeight: FontWeight.w500,
                  ),
                )
              else
                _TypewriterMarkdown(
                  text: widget.message.content,
                  animate: shouldAnimateTyping,
                  forcePlainText:
                      widget.message.isPartial ||
                      widget.message.stage == 'partial',
                  onCompleted: () {
                    if (!mounted || _typingComplete) return;
                    setState(() => _typingComplete = true);
                  },
                ),
              if (!isUser) ...[
                const SizedBox(height: AppSpacing.xs),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (widget.onTts != null)
                      InkWell(
                        onTap: widget.onTts,
                        borderRadius: AppRadius.smAll,
                        child: Padding(
                          padding: const EdgeInsets.all(4),
                          child: Icon(
                            widget.isPlaying
                                ? Icons.stop_circle_outlined
                                : Icons.volume_up_outlined,
                            size: 18,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    const SizedBox(width: AppSpacing.sm),
                    InkWell(
                      onTap: () {
                        Clipboard.setData(
                          ClipboardData(text: widget.message.content),
                        );
                        context.showSnack('chat.copied'.tr());
                      },
                      borderRadius: AppRadius.smAll,
                      child: Padding(
                        padding: const EdgeInsets.all(4),
                        child: Icon(
                          Icons.copy_outlined,
                          size: 16,
                          color: context.appColors.textSecondary,
                        ),
                      ),
                    ),
                  ],
                ),
                if ((widget.message.stage == 'final' ||
                        !(widget.message.isPartial)) &&
                    !widget.message.isLoading &&
                    showTailUi) ...[
                  const SizedBox(height: 8),
                  if (contextActions.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: contextActions
                            .map(
                              (action) => ActionChip(
                                label: Text(action.label),
                                avatar: Icon(action.icon, size: 16),
                                onPressed: () =>
                                    _openContextRoute(action.route),
                              ),
                            )
                            .toList(growable: false),
                      ),
                    ),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      ...(widget
                          ._relevantSuggestions()
                          .take(4)
                          .map(
                            (s) => ActionChip(
                              label: Text(s),
                              onPressed: widget.onSuggestionTap == null
                                  ? null
                                  : () => widget.onSuggestionTap!(s),
                            ),
                          )),
                    ],
                  ),
                ],
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _TypewriterMarkdown extends StatefulWidget {
  final String text;
  final bool animate;
  final bool forcePlainText;
  final VoidCallback? onCompleted;

  const _TypewriterMarkdown({
    required this.text,
    required this.animate,
    this.forcePlainText = false,
    this.onCompleted,
  });

  @override
  State<_TypewriterMarkdown> createState() => _TypewriterMarkdownState();
}

class _TypewriterMarkdownState extends State<_TypewriterMarkdown> {
  Timer? _timer;
  int _visibleChars = 0;
  bool _didNotifyCompleted = false;

  void _notifyCompleted() {
    if (_didNotifyCompleted) return;
    _didNotifyCompleted = true;
    widget.onCompleted?.call();
  }

  @override
  void initState() {
    super.initState();
    _restartAnimation();
  }

  @override
  void didUpdateWidget(covariant _TypewriterMarkdown oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.text != widget.text || oldWidget.animate != widget.animate) {
      _restartAnimation();
    }
  }

  void _restartAnimation() {
    _timer?.cancel();
    _didNotifyCompleted = false;

    final text = widget.text;
    if (text.isEmpty) {
      setState(() => _visibleChars = 0);
      _notifyCompleted();
      return;
    }

    if (!widget.animate) {
      setState(() => _visibleChars = text.length);
      _notifyCompleted();
      return;
    }

    int step = (text.length / 90).ceil();
    if (step < 1) step = 1;
    if (step > 8) step = 8;

    setState(() => _visibleChars = 1);
    _timer = Timer.periodic(const Duration(milliseconds: 16), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      final next = _visibleChars + step;
      if (next >= text.length) {
        setState(() => _visibleChars = text.length);
        timer.cancel();
        _notifyCompleted();
      } else {
        setState(() => _visibleChars = next);
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final fullText = widget.text;
    final isPartial = widget.animate && _visibleChars < fullText.length;
    final shown = isPartial ? fullText.substring(0, _visibleChars) : fullText;
    final usePlainText = widget.forcePlainText || isPartial;

    if (usePlainText) {
      // Render plain text while streaming to avoid malformed markdown flashes
      // when fences/lists/links are still incomplete.
      return Text(
        shown,
        style: context.textTheme.bodyMedium,
      );
    }

    return MarkdownBody(
      data: shown,
      styleSheet: MarkdownStyleSheet.fromTheme(
        context.theme,
      ).copyWith(p: context.textTheme.bodyMedium),
    );
  }
}

// â”€â”€ Typing indicator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class _TypingIndicator extends StatefulWidget {
  final String text;
  final String? contextHint;

  const _TypingIndicator({required this.text, this.contextHint});

  @override
  State<_TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<_TypingIndicator>
    with SingleTickerProviderStateMixin {
  late final AnimationController _anim;
  Timer? _feedTimer;
  Timer? _elapsedTimer;
  int _elapsedSeconds = 0;
  bool _expanded = true;
  final List<String> _thoughtFeed = <String>[];
  int _cursor = 0;

  static const List<String> _fallbackHints = <String>[
    'Understanding your request',
    'Checking recent context',
    'Preparing an accurate response',
    'Verifying useful next steps',
    'Finalizing answer',
  ];

  String _cleanLine(String raw) {
    final compact = raw.replaceAll(RegExp(r'\s+'), ' ').trim();
    if (compact.isEmpty) return '';
    return compact.length > 110 ? '${compact.substring(0, 110)}...' : compact;
  }

  List<String> _templates() {
    final phase = _cleanLine(widget.text);
    final built = SharedThinkingTemplates.buildThoughtTemplates(
      phase: phase,
      contextHint: widget.contextHint,
    );

    final cleaned = built
        .map(_cleanLine)
        .where((e) => e.isNotEmpty)
        .take(12)
        .toList(growable: false);

    return cleaned.isNotEmpty ? cleaned : _fallbackHints;
  }

  void _seedFeed() {
    final templates = _templates();
    _thoughtFeed
      ..clear()
      ..addAll(templates.take(2));
    _cursor = _thoughtFeed.length;
  }

  void _startLoop() {
    _feedTimer?.cancel();
    _elapsedTimer?.cancel();

    _elapsedTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() => _elapsedSeconds += 1);
    });

    _feedTimer = Timer.periodic(const Duration(milliseconds: 950), (_) {
      if (!mounted) return;
      final templates = _templates();
      if (templates.isEmpty) return;
      final line = templates[_cursor % templates.length];
      setState(() {
        _thoughtFeed.add(line);
        _cursor += 1;
        if (_thoughtFeed.length > 4) {
          _thoughtFeed.removeAt(0);
        }
      });
    });
  }

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
    _seedFeed();
    _startLoop();
  }

  @override
  void didUpdateWidget(covariant _TypingIndicator oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.text != widget.text ||
        oldWidget.contextHint != widget.contextHint) {
      if (!mounted) return;
      setState(() {
        _seedFeed();
      });
    }
  }

  @override
  void dispose() {
    _feedTimer?.cancel();
    _elapsedTimer?.cancel();
    _anim.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final shellColor = context.appColors.card.withValues(
      alpha: isDark ? 0.92 : 0.88,
    );
    final borderColor = context.appColors.border.withValues(
      alpha: isDark ? 0.72 : 0.62,
    );
    final bodyColor = context.appColors.textSecondary;
    final phaseColor = context.colors.onSurface.withValues(alpha: 0.9);

    final phase = _cleanLine(widget.text).isEmpty
        ? 'screen.chat_screen.thinking'.tr()
        : _cleanLine(widget.text);

    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.86,
        ),
        margin: const EdgeInsets.only(bottom: AppSpacing.sm),
        decoration: BoxDecoration(
          color: shellColor,
          borderRadius: AppRadius.mdAll,
          border: Border.all(color: borderColor, width: 0.9),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            InkWell(
              borderRadius: AppRadius.mdAll,
              onTap: () => setState(() => _expanded = !_expanded),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 10, 10, 8),
                child: Row(
                  children: [
                    Icon(
                      Icons.help_outline_rounded,
                      size: 14,
                      color: AppColors.primary,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'screen.chat_screen.thinking'.tr(),
                      style: context.textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: context.colors.onSurface,
                      ),
                    ),
                    SizedBox(
                      width: 22,
                      child: AnimatedBuilder(
                        animation: _anim,
                        builder: (context, _) {
                          final dots = (_anim.value * 3).floor() % 3 + 1;
                          return Text(
                            '.' * dots,
                            style: context.textTheme.bodySmall?.copyWith(
                              color: bodyColor,
                            ),
                          );
                        },
                      ),
                    ),
                    const Spacer(),
                    Text(
                      '${_elapsedSeconds}s',
                      style: context.textTheme.labelSmall?.copyWith(
                        color: bodyColor,
                      ),
                    ),
                    const SizedBox(width: 4),
                    AnimatedRotation(
                      turns: _expanded ? 0.0 : -0.5,
                      duration: const Duration(milliseconds: 180),
                      child: Icon(
                        Icons.expand_more,
                        size: 18,
                        color: bodyColor,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (_expanded) Divider(height: 1, thickness: 1, color: borderColor),
            AnimatedCrossFade(
              duration: const Duration(milliseconds: 220),
              crossFadeState: _expanded
                  ? CrossFadeState.showSecond
                  : CrossFadeState.showFirst,
              firstChild: const SizedBox.shrink(),
              secondChild: Padding(
                padding: const EdgeInsets.fromLTRB(12, 2, 12, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        phase,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: context.textTheme.bodySmall?.copyWith(
                          color: phaseColor,
                          fontWeight: FontWeight.w600,
                          height: 1.35,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    ..._thoughtFeed.map(
                      (line) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Text(
                          line,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: context.textTheme.bodySmall?.copyWith(
                            color: bodyColor,
                            height: 1.35,
                          ),
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
}

class _ChatInputBar extends StatelessWidget {
  final TextEditingController controller;
  final bool isLoading;
  final bool hasText;
  final String replySnippet;
  final VoidCallback? onClearReply;
  final bool isMicRecording;
  final bool isMicProcessing;
  final int micWavePhase;
  final VoidCallback onSend;
  final VoidCallback onAdd;
  final VoidCallback onMic;
  final VoidCallback onLiveVoice;

  const _ChatInputBar({
    required this.controller,
    required this.isLoading,
    required this.hasText,
    required this.replySnippet,
    this.onClearReply,
    required this.isMicRecording,
    required this.isMicProcessing,
    required this.micWavePhase,
    required this.onSend,
    required this.onAdd,
    required this.onMic,
    required this.onLiveVoice,
  });

  @override
  Widget build(BuildContext context) {
    final isMicBusy = isMicRecording || isMicProcessing;
    final hasReply = replySnippet.trim().isNotEmpty;

    return Container(
      color: Colors.transparent,
      padding: const EdgeInsets.fromLTRB(10, 8, 10, 12),
      child: SafeArea(
        top: false,
        child: Container(
          decoration: BoxDecoration(
            color: context.isDark
                ? Colors.white.withValues(alpha: 0.08)
                : Colors.white.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: context.isDark
                  ? Colors.white.withValues(alpha: 0.15)
                  : Colors.white.withValues(alpha: 0.9),
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (hasReply)
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.fromLTRB(10, 10, 10, 0),
                  padding: const EdgeInsets.fromLTRB(10, 8, 8, 8),
                  decoration: BoxDecoration(
                    color: context.isDark
                        ? Colors.white.withValues(alpha: 0.09)
                        : Colors.white.withValues(alpha: 0.62),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: context.isDark
                          ? Colors.white.withValues(alpha: 0.18)
                          : Colors.white.withValues(alpha: 0.9),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.reply,
                        size: 15,
                        color: context.appColors.textSecondary,
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          replySnippet,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: context.textTheme.bodySmall?.copyWith(
                            color: context.appColors.textSecondary,
                          ),
                        ),
                      ),
                      InkWell(
                        onTap: onClearReply,
                        borderRadius: BorderRadius.circular(12),
                        child: Padding(
                          padding: const EdgeInsets.all(2),
                          child: Icon(
                            Icons.close,
                            size: 16,
                            color: context.appColors.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const SizedBox(width: 4),
                  GestureDetector(
                    onTap: onAdd,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 8,
                      ),
                      child: Icon(
                        Icons.add,
                        size: 20,
                        color: context.isDark ? Colors.white70 : Colors.black54,
                      ),
                    ),
                  ),
                  Expanded(
                    child: isMicBusy
                        ? Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 12,
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  isMicProcessing
                                      ? Icons.hourglass_top_rounded
                                      : Icons.graphic_eq,
                                  size: 18,
                                  color: context.appColors.textSecondary,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  isMicProcessing
                                      ? 'screen.chat_screen.processing'.tr()
                                      : 'screen.chat_screen.listening'.tr(),
                                  style: context.textTheme.bodyMedium?.copyWith(
                                    color: context.appColors.textSecondary,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                if (isMicRecording) ...[
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: _InlineMicWave(phase: micWavePhase),
                                  ),
                                ],
                              ],
                            ),
                          )
                        : TextField(
                            controller: controller,
                            textInputAction: TextInputAction.send,
                            onSubmitted: (_) => onSend(),
                            maxLines: 5,
                            minLines: 1,
                            style: context.textTheme.bodyMedium,
                            decoration: InputDecoration(
                              hintText: 'chat.input_hint'.tr(),
                              hintStyle: context.textTheme.bodyMedium?.copyWith(
                                color: context.appColors.textSecondary,
                              ),
                              border: InputBorder.none,
                              enabledBorder: InputBorder.none,
                              focusedBorder: InputBorder.none,
                              filled: false,
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 12,
                              ),
                            ),
                          ),
                  ),
                  GestureDetector(
                    onTap: onMic,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 8,
                      ),
                      child: Icon(
                        isMicRecording ? Icons.close : Icons.mic_none_outlined,
                        size: 20,
                        color: context.isDark ? Colors.white70 : Colors.black54,
                      ),
                    ),
                  ),
                  if (!isMicBusy)
                    GestureDetector(
                      onTap: onLiveVoice,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 8,
                        ),
                        child: Icon(
                          Icons.graphic_eq,
                          size: 20,
                          color: context.isDark
                              ? Colors.white70
                              : Colors.black54,
                        ),
                      ),
                    ),
                  if (hasText && !isMicBusy)
                    Padding(
                      padding: const EdgeInsets.only(right: 6, bottom: 3),
                      child: GestureDetector(
                        onTap: isLoading ? null : onSend,
                        child: Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: isLoading
                                ? AppColors.primary.withValues(alpha: 0.4)
                                : AppColors.primary,
                          ),
                          child: const Icon(
                            Icons.arrow_upward,
                            color: Colors.white,
                            size: 18,
                          ),
                        ),
                      ),
                    )
                  else
                    const SizedBox(width: 4),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InlineMicWave extends StatelessWidget {
  final int phase;

  const _InlineMicWave({required this.phase});

  @override
  Widget build(BuildContext context) {
    final bars = List.generate(16, (i) {
      final h = 6 + ((phase + i * 7) % 12);
      return Container(
        width: 3,
        height: h.toDouble(),
        margin: const EdgeInsets.symmetric(horizontal: 1),
        decoration: BoxDecoration(
          color: context.appColors.textSecondary.withValues(alpha: 0.85),
          borderRadius: BorderRadius.circular(2),
        ),
      );
    });

    return Row(
      mainAxisAlignment: MainAxisAlignment.start,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: bars,
    );
  }
}

class _AttachmentAction {
  final String label;
  final IconData icon;
  final String route;
  const _AttachmentAction(this.label, this.icon, this.route);
}

Future<void> _showAddOptionsSheet(BuildContext context) async {
  final isDark = context.isDark;
  final actions = const <_AttachmentAction>[
    _AttachmentAction(
      'screen.chat_screen.camera',
      Icons.photo_camera_outlined,
      RoutePaths.cropDoctor,
    ),
    _AttachmentAction(
      'screen.chat_screen.photos',
      Icons.photo_library_outlined,
      RoutePaths.cropDoctor,
    ),
    _AttachmentAction(
      'screen.chat_screen.files',
      Icons.insert_drive_file_outlined,
      RoutePaths.documents,
    ),
  ];

  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: false,
    backgroundColor: isDark ? const Color(0xFF1A1A1A) : Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (sheetContext) {
      final borderColor = isDark ? Colors.white24 : Colors.black12;
      final textColor = isDark ? Colors.white : Colors.black87;

      return SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white24 : Colors.black26,
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: actions.map((action) {
                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: () {
                          Navigator.of(sheetContext).pop();
                          WidgetsBinding.instance.addPostFrameCallback((_) {
                            if (!context.mounted) return;
                            context.push(action.route);
                          });
                        },
                        child: Container(
                          height: 88,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: borderColor, width: 1.2),
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                action.icon,
                                size: 22,
                                color: isDark ? Colors.white70 : Colors.black54,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                action.label.tr(),
                                style: TextStyle(
                                  color: textColor,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 14),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: borderColor, width: 1.1),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'screen.chat_screen.model'.tr(),
                      style: TextStyle(
                        color: isDark ? Colors.white70 : Colors.black54,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      'screen.chat_screen.gemini_2_5_flash'.tr(),
                      style: TextStyle(
                        color: textColor,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
    },
  );
}
