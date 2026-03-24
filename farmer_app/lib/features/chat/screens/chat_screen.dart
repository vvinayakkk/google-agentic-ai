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

/// AI Chat screen that works with any agent type.
class ChatScreen extends ConsumerStatefulWidget {
  final String agentType;
  final String? sessionId;

  const ChatScreen({super.key, required this.agentType, this.sessionId});

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
  bool _isLoading = false;
  String? _playingMessageId;
  bool _hasText = false;
  bool _isMicRecording = false;
  bool _isMicProcessing = false;
  int _micWavePhase = 0;
  Timer? _micWaveTimer;

  @override
  void initState() {
    super.initState();
    _sessionId = widget.sessionId;
    _controller.addListener(_onTextChanged);
    if (_sessionId != null) {
      _loadSession();
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
    _micRecorder.dispose();
    super.dispose();
  }

  // ── Load existing session ──────────────────────────────
  Future<void> _loadSession() async {
    if (_sessionId == null) return;
    setState(() => _isLoading = true);

    try {
      final agent = ref.read(agentServiceProvider);
      final data = await agent.getSession(_sessionId!);
      final msgs = (data['messages'] as List<dynamic>?)
              ?.map((m) => ChatMessage.fromJson(m as Map<String, dynamic>))
              .toList() ??
          [];

      if (mounted) {
        setState(() {
          _messages
            ..clear()
            ..addAll(msgs.reversed);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        context.showSnack('chat.error'.tr(), isError: true);
      }
    }
  }

  // ── Send message ──────────────────────────────────────
  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _isLoading) return;

    _controller.clear();

    setState(() {
      _messages.insert(0, ChatMessage.user(text));
      _messages.insert(0, ChatMessage.loading());
      _isLoading = true;
    });

    try {
      final agent = ref.read(agentServiceProvider);
      final data = await agent.chat(
        message: text,
        language: context.locale.languageCode,
        sessionId: _sessionId,
      );

      final response = ChatMessage.fromJson(data);

      setState(() {
        _messages.removeAt(0);
        _messages.insert(0, response);
        _sessionId ??= data['session_id'] as String?;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _messages.removeAt(0);
        _messages.insert(
          0,
          ChatMessage(
            role: 'assistant',
            content: 'chat.error'.tr(),
            timestamp: DateTime.now(),
          ),
        );
        _isLoading = false;
      });
    }
  }

  // ── TTS playback on AI messages ───────────────────────
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
      final data = await voice.ttsBase64(
        text: message.content,
        language: context.locale.languageCode,
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

  // ── New chat ──────────────────────────────────────────
  void _newChat() {
    setState(() {
      _messages.clear();
      _sessionId = null;
    });
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
        context.showSnack('voice_assistant.permission_denied'.tr(), isError: true);
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
    final languageCode = context.locale.languageCode;
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
      final data = await voice.stt(
        path,
        language: languageCode,
      );

      if (!mounted) return;

      final transcript = (data['transcript'] as String? ?? '').trim();
      if (transcript.isNotEmpty) {
        _controller.text = transcript;
        _controller.selection = TextSelection.fromPosition(
          TextPosition(offset: _controller.text.length),
        );
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

  // ── Chip data with icons ──────────────────────────────
  static const _chipData = <_ChipInfo>[
    _ChipInfo('Marketplace', Icons.storefront_outlined, AppColors.info),
    _ChipInfo('Calendar', Icons.calendar_month_outlined, AppColors.accent),
    _ChipInfo('Cattle', Icons.pets_outlined, AppColors.warning),
    _ChipInfo('Soil Moisture', Icons.water_drop_outlined, AppColors.primary),
    _ChipInfo('Education & Finance', Icons.school_outlined, AppColors.success),
    _ChipInfo('Document Builder', Icons.description_outlined, Color(0xFF2563EB)),
    _ChipInfo('Crop Doctor', Icons.local_florist_outlined, Color(0xFFDC2626)),
    _ChipInfo('Equipment Rental', Icons.agriculture_outlined, Color(0xFF7C3AED)),
    _ChipInfo('Mental Health', Icons.favorite_outline, Color(0xFFDB2777)),
  ];

  void _onChipTap(String text) {
    switch (text) {
      case 'Marketplace':
        context.push(RoutePaths.marketplace);
      case 'Calendar':
        context.push(RoutePaths.calendar);
      case 'Cattle':
        context.push(RoutePaths.cattle);
      case 'Soil Moisture':
        context.push(RoutePaths.soilMoisture);
      case 'Education & Finance':
        context.push(RoutePaths.upi);
      case 'Document Builder':
        context.push(RoutePaths.documents);
      case 'Crop Doctor':
        context.push(RoutePaths.cropDoctor);
      case 'Equipment Rental':
        context.push(RoutePaths.rental);
      case 'Mental Health':
        context.push(RoutePaths.mentalHealth);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final chipBorder = isDark ? Colors.white60 : Colors.black87;
    final headingColor = isDark ? Colors.white : Colors.black87;
    final hasMessages = _messages.isNotEmpty;

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
        title: Text('chat.title'.tr()),
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
            SizedBox(height: MediaQuery.of(context).padding.top + kToolbarHeight),
            Expanded(
            child: hasMessages
                ? ListView.builder(
                    controller: _scrollController,
                    reverse: true,
                    padding: AppSpacing.allLg,
                    itemCount: _messages.length,
                    itemBuilder: (_, i) => _ChatBubble(
                      message: _messages[i],
                      isPlaying: _playingMessageId ==
                          (_messages[i].messageId ??
                              _messages[i].content.hashCode.toString()),
                      onTts: _messages[i].isAssistant &&
                              !_messages[i].isLoading
                          ? () => _playTts(_messages[i])
                          : null,
                    ),
                  )
                : Center(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.xl, vertical: AppSpacing.lg),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // ── Heading ──
                          Text(
                            'What can I help with?',
                            style:
                                context.textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.w700,
                              color: headingColor,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.lg),
                          // ── Chips ──
                          Wrap(
                            alignment: WrapAlignment.center,
                            spacing: 8,
                            runSpacing: 8,
                            children: _chipData.map((chip) {
                              return InkWell(
                                borderRadius: BorderRadius.circular(18),
                                onTap: () => _onChipTap(chip.label),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 12, vertical: 7),
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(18),
                                    border: Border.all(
                                        color: chipBorder, width: 1.1),
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
                                              color: chipBorder, width: 1.1),
                                        ),
                                        child: Center(
                                          child: Icon(chip.icon,
                                              size: 14, color: chip.color),
                                        ),
                                      ),
                                      const SizedBox(width: 7),
                                      Text(
                                        chip.label,
                                        style: context
                                            .textTheme.bodySmall
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

          // ── Input bar ─────────────────────────────────
            _ChatInputBar(
              controller: _controller,
              isLoading: _isLoading,
              hasText: _hasText,
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

// ── Chip info ────────────────────────────────────────────

class _ChipInfo {
  final String label;
  final IconData icon;
  final Color color;
  const _ChipInfo(this.label, this.icon, this.color);
}

// ── Chat bubble ──────────────────────────────────────────

class _ChatBubble extends StatelessWidget {
  final ChatMessage message;
  final bool isPlaying;
  final VoidCallback? onTts;

  const _ChatBubble({
    required this.message,
    this.isPlaying = false,
    this.onTts,
  });

  @override
  Widget build(BuildContext context) {
    if (message.isLoading) return const _TypingIndicator();

    final isUser = message.isUser;

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.78,
        ),
        margin: const EdgeInsets.only(bottom: AppSpacing.sm),
        padding: AppSpacing.allMd,
        decoration: BoxDecoration(
          color: isUser ? AppColors.primary : context.appColors.card,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(AppRadius.md),
            topRight: const Radius.circular(AppRadius.md),
            bottomLeft: Radius.circular(isUser ? AppRadius.md : 0),
            bottomRight: Radius.circular(isUser ? 0 : AppRadius.md),
          ),
          border: isUser
              ? null
              : Border.all(color: context.appColors.border, width: 0.5),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (isUser)
              Text(
                message.content,
                style: context.textTheme.bodyMedium?.copyWith(
                  color: Colors.white,
                ),
              )
            else
              MarkdownBody(
                data: message.content,
                styleSheet:
                    MarkdownStyleSheet.fromTheme(context.theme).copyWith(
                  p: context.textTheme.bodyMedium,
                ),
              ),
            // TTS + Copy row for assistant messages
            if (!isUser) ...[
              const SizedBox(height: AppSpacing.xs),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (onTts != null)
                    InkWell(
                      onTap: onTts,
                      borderRadius: AppRadius.smAll,
                      child: Padding(
                        padding: const EdgeInsets.all(4),
                        child: Icon(
                          isPlaying
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
                          ClipboardData(text: message.content));
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
            ],
          ],
        ),
      ),
    );
  }
}

// ── Typing indicator ─────────────────────────────────────

class _TypingIndicator extends StatefulWidget {
  const _TypingIndicator();

  @override
  State<_TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<_TypingIndicator>
    with SingleTickerProviderStateMixin {
  late final AnimationController _anim;

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _anim.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: AppSpacing.sm),
        padding: AppSpacing.allMd,
        decoration: BoxDecoration(
          color: context.appColors.card,
          borderRadius: AppRadius.mdAll,
          border: Border.all(color: context.appColors.border, width: 0.5),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'chat.typing'.tr(),
              style: context.textTheme.bodySmall?.copyWith(
                color: context.appColors.textSecondary,
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            AnimatedBuilder(
              animation: _anim,
              builder: (context, child) {
                return Row(
                  mainAxisSize: MainAxisSize.min,
                  children: List.generate(3, (i) {
                    final delay = i * 0.33;
                    final t =
                        ((_anim.value - delay) % 1.0).clamp(0.0, 1.0);
                    final opacity =
                        0.3 + 0.7 * (1 - (2 * t - 1).abs());
                    return Padding(
                      padding:
                          const EdgeInsets.symmetric(horizontal: 2),
                      child: Opacity(
                        opacity: opacity,
                        child: Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: AppColors.primary,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ),
                    );
                  }),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

// ── ChatGPT-style input bar ──────────────────────────────

class _ChatInputBar extends StatelessWidget {
  final TextEditingController controller;
  final bool isLoading;
  final bool hasText;
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
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(width: 4),
              GestureDetector(
                onTap: onAdd,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
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
                              isMicProcessing ? 'Processing...' : 'Listening...',
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
                          hintStyle: context.textTheme.bodyMedium
                              ?.copyWith(color: context.appColors.textSecondary),
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
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
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
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                    child: Icon(
                      Icons.graphic_eq,
                      size: 20,
                      color: context.isDark ? Colors.white70 : Colors.black54,
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
                      child: const Icon(Icons.arrow_upward,
                          color: Colors.white, size: 18),
                    ),
                  ),
                )
              else
                const SizedBox(width: 4),
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
  const _AttachmentAction(this.label, this.icon);
}

Future<void> _showAddOptionsSheet(BuildContext context) async {
  final isDark = context.isDark;
  final actions = const <_AttachmentAction>[
    _AttachmentAction('Camera', Icons.photo_camera_outlined),
    _AttachmentAction('Photos', Icons.photo_library_outlined),
    _AttachmentAction('Files', Icons.insert_drive_file_outlined),
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
                          context.showSnack('${action.label} coming soon');
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
                              Icon(action.icon,
                                  size: 22,
                                  color: isDark
                                      ? Colors.white70
                                      : Colors.black54),
                              const SizedBox(height: 8),
                              Text(
                                action.label,
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
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: borderColor, width: 1.1),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Model',
                      style: TextStyle(
                        color: isDark ? Colors.white70 : Colors.black54,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      'Gemini 2.5 Flash',
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
