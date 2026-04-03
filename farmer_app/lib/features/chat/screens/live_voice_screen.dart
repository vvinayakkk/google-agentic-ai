import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:audioplayers/audioplayers.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/services/agent_service.dart';

/// Live voice conversation screen: Record → /voice/command/text → Play response.
class LiveVoiceScreen extends ConsumerStatefulWidget {
  const LiveVoiceScreen({super.key});

  @override
  ConsumerState<LiveVoiceScreen> createState() => _LiveVoiceScreenState();
}

enum _VoiceState { idle, recording, processing, playing }

class _VoiceTurn {
  final String transcript;
  final String response;
  final DateTime at;

  const _VoiceTurn({
    required this.transcript,
    required this.response,
    required this.at,
  });
}

class _LiveVoiceScreenState extends ConsumerState<LiveVoiceScreen>
  with TickerProviderStateMixin {
  _VoiceState _state = _VoiceState.idle;
  String _transcript = '';
  String _response = '';
  String _activeQuestion = '';
  String? _fadingQuestion;
  String? _sessionId;
  String? _lastAudioBase64;
  bool _isPlaybackPaused = false;
  Duration _playbackPosition = Duration.zero;
  Duration _playbackDuration = Duration.zero;
  int _lastPlaybackUiMs = -1;
  final List<_VoiceTurn> _recentTurns = <_VoiceTurn>[];

  late final AnimationController _pulseController;
  late final AnimationController _flickerController;
  late final AnimationController _waveController;
  late final AnimationController _questionFadeController;
  final AudioRecorder _recorder = AudioRecorder();
  final AudioPlayer _audioPlayer = AudioPlayer();
  String? _recordingPath;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    _flickerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 280),
    );

    _waveController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1700),
    );
    _questionFadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 980),
    );

    _audioPlayer.onPlayerComplete.listen((_) {
      if (mounted) {
        setState(() {
          _state = _VoiceState.idle;
          _isPlaybackPaused = false;
          _playbackPosition = Duration.zero;
          _playbackDuration = Duration.zero;
          _lastPlaybackUiMs = -1;
        });
      }
    });

    _audioPlayer.onDurationChanged.listen((duration) {
      if (!mounted) return;
      setState(() => _playbackDuration = duration);
    });

    _audioPlayer.onPositionChanged.listen((position) {
      if (!mounted) return;
      final atMs = position.inMilliseconds;
      if (_playbackDuration > Duration.zero) {
        final shouldPaint = _lastPlaybackUiMs < 0 ||
            (atMs - _lastPlaybackUiMs) >= 140 ||
            atMs >= (_playbackDuration.inMilliseconds - 80);
        if (!shouldPaint) return;
      }
      setState(() => _playbackPosition = position);
      _lastPlaybackUiMs = atMs;
    });

    _audioPlayer.onPlayerStateChanged.listen((playerState) {
      if (!mounted) return;
      if (playerState == PlayerState.paused && _state == _VoiceState.playing) {
        setState(() => _isPlaybackPaused = true);
      } else if (playerState == PlayerState.playing) {
        setState(() => _isPlaybackPaused = false);
      }
    });
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _flickerController.dispose();
    _waveController.dispose();
    _questionFadeController.dispose();
    _recorder.dispose();
    _audioPlayer.dispose();
    super.dispose();
  }

  Future<void> _onMicTap() async {
    switch (_state) {
      case _VoiceState.idle:
        await _startRecording();
        break;
      case _VoiceState.recording:
        await _stopAndProcess();
        break;
      case _VoiceState.processing:
        break;
      case _VoiceState.playing:
        await _audioPlayer.stop();
        if (!mounted) return;
        setState(() {
          _state = _VoiceState.idle;
          _isPlaybackPaused = false;
          _playbackPosition = Duration.zero;
          _playbackDuration = Duration.zero;
          _lastPlaybackUiMs = -1;
        });
        await _startRecording();
        break;
    }
  }

  Future<void> _startRecording() async {
    final status = await Permission.microphone.request();
    if (!status.isGranted) {
      if (mounted) {
        context.showSnack('voice_assistant.permission_denied'.tr(), isError: true);
      }
      return;
    }

    final dir = await getTemporaryDirectory();
    _recordingPath =
        '${dir.path}/voice_cmd_${DateTime.now().millisecondsSinceEpoch}.wav';

    await _recorder.start(
      const RecordConfig(encoder: AudioEncoder.wav),
      path: _recordingPath!,
    );

    setState(() {
      _state = _VoiceState.recording;
      _isPlaybackPaused = false;
    });
    _pulseController.repeat(reverse: true);
    _flickerController.repeat(reverse: true);
    _waveController.repeat();
  }

  Future<void> _stopAndProcess() async {
    _pulseController.stop();
    _flickerController.stop();
    _flickerController.value = 0;
    _waveController.stop();
    final path = await _recorder.stop();

    if (path == null || path.isEmpty) {
      setState(() => _state = _VoiceState.idle);
      if (mounted) {
        context.showSnack('voice_assistant.no_speech'.tr(), isError: true);
      }
      return;
    }

    await _processVoiceFile(path);
  }

  Future<void> _processVoiceFile(String path, {String? sourcePrompt}) async {
    final languageCode = context.locale.languageCode;
    final hintedQuestion = (sourcePrompt ?? '').trim();

    setState(() {
      _state = _VoiceState.processing;
      _isPlaybackPaused = false;
      _lastAudioBase64 = null;
      _response = '';
    });

    try {
      final voice = ref.read(voiceServiceProvider);
      final data = await voice.voiceCommandText(
        path,
        language: languageCode,
        sessionId: _sessionId,
      );

      if (!mounted) return;

        final transcript =
          (data['transcript'] as String? ?? sourcePrompt ?? '').trim();
        final transcriptDisplay =
          (data['transcript_display'] as String? ?? transcript).trim();
      final response = _cleanDisplayText(data['response'] as String? ?? '');
      final audioBase64 = data['audio_base64'] as String? ?? '';
      _sessionId = data['session_id'] as String? ?? _sessionId;

      final visibleQuestion = transcriptDisplay.isNotEmpty
          ? transcriptDisplay
          : (transcript.isNotEmpty ? transcript : hintedQuestion);
      final previousQuestion = _activeQuestion;

      setState(() {
        _transcript = transcript;
        _response = response;
        _activeQuestion = visibleQuestion;
        _lastAudioBase64 = audioBase64.isEmpty ? null : audioBase64;

        if (response.isNotEmpty && previousQuestion.isNotEmpty && previousQuestion != visibleQuestion) {
          _fadingQuestion = previousQuestion;
          _questionFadeController.forward(from: 0);
        }

        if (transcript.isNotEmpty || response.isNotEmpty) {
          _recentTurns.insert(
            0,
            _VoiceTurn(
              transcript: transcript,
              response: response,
              at: DateTime.now(),
            ),
          );
          if (_recentTurns.length > 4) {
            _recentTurns.removeRange(4, _recentTurns.length);
          }
        }
      });

      if (response.isNotEmpty && previousQuestion.isNotEmpty && previousQuestion != visibleQuestion) {
        _questionFadeController.addStatusListener(_clearQuestionStatusListener);
      }

      // Play audio response
      if (audioBase64.isNotEmpty) {
        await _playAudioBase64(audioBase64);
      } else {
        setState(() => _state = _VoiceState.idle);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _response = 'voice_assistant.error'.tr();
        _state = _VoiceState.idle;
      });
      context.showSnack('voice_assistant.error'.tr(), isError: true);
    }
  }

  void _clearQuestionStatusListener(AnimationStatus status) {
    if (status != AnimationStatus.completed) return;
    _questionFadeController.removeStatusListener(_clearQuestionStatusListener);
    if (!mounted) return;
    setState(() => _fadingQuestion = null);
  }

  Future<void> _runPromptThroughVoice(String prompt) async {
    if (prompt.trim().isEmpty || _state == _VoiceState.recording) return;

    final voice = ref.read(voiceServiceProvider);
    String? tempPath;
    try {
      final generated = await voice.ttsBase64(
        text: prompt,
        language: context.locale.languageCode,
      );
      if (!mounted) return;
      final audioBase64 = (generated['audio_base64'] as String? ?? '').trim();
      if (audioBase64.isEmpty) {
        context.showSnack('voice_assistant.error'.tr(), isError: true);
        return;
      }

      final audioDir = await getTemporaryDirectory();
      final audioFile = File(
        '${audioDir.path}/voice_prompt_${DateTime.now().millisecondsSinceEpoch}.wav',
      );
      await audioFile.writeAsBytes(base64Decode(audioBase64));
      tempPath = audioFile.path;

      await _processVoiceFile(tempPath, sourcePrompt: prompt);
    } catch (_) {
      if (mounted) {
        context.showSnack('voice_assistant.error'.tr(), isError: true);
      }
    } finally {
      if (tempPath != null) {
        try {
          await File(tempPath).delete();
        } catch (_) {}
      }
    }
  }

  Future<void> _playAudioBase64(String base64Audio) async {
    if (base64Audio.isEmpty) return;

    setState(() {
      _state = _VoiceState.playing;
      _isPlaybackPaused = false;
      _playbackPosition = Duration.zero;
      _playbackDuration = Duration.zero;
      _lastPlaybackUiMs = -1;
    });
    final bytes = base64Decode(base64Audio);
    final audioDir = await getTemporaryDirectory();
    final audioFile = File(
      '${audioDir.path}/voice_resp_${DateTime.now().millisecondsSinceEpoch}.wav',
    );
    await audioFile.writeAsBytes(bytes);
    await _audioPlayer.play(DeviceFileSource(audioFile.path));
  }

  Future<void> _replayLastResponse() async {
    if (_lastAudioBase64 != null && _lastAudioBase64!.isNotEmpty) {
      await _playAudioBase64(_lastAudioBase64!);
      return;
    }

    if (_response.isEmpty) {
      context.showSnack('No response available to replay.', isError: true);
      return;
    }

    try {
      final voice = ref.read(voiceServiceProvider);
      final generated = await voice.ttsBase64(
        text: _response,
        language: context.locale.languageCode,
      );
      if (!mounted) return;
      final generatedBase64 = generated['audio_base64'] as String? ?? '';
      if (generatedBase64.isEmpty) {
        context.showSnack('voice_assistant.error'.tr(), isError: true);
        return;
      }
      _lastAudioBase64 = generatedBase64;
      await _playAudioBase64(generatedBase64);
    } catch (_) {
      if (mounted) {
        context.showSnack('voice_assistant.error'.tr(), isError: true);
      }
    }
  }

  Future<void> _togglePauseResume() async {
    if (_state != _VoiceState.playing) return;
    if (_isPlaybackPaused) {
      await _audioPlayer.resume();
      if (mounted) {
        setState(() => _isPlaybackPaused = false);
      }
    } else {
      await _audioPlayer.pause();
      if (mounted) {
        setState(() => _isPlaybackPaused = true);
      }
    }
  }

  void _openChatDirect() {
    context.push('${RoutePaths.chat}?agent=general');
  }

  String get _primarySuggestion {
    final source = ('$_transcript $_response').toLowerCase();
    if (source.contains('price') || source.contains('mandi')) {
      return 'Try this: Compare tomato prices in my nearest 3 mandis.';
    }
    if (source.contains('rain') || source.contains('weather')) {
      return 'Try this: Give me weather risk and farm action for next 3 days.';
    }
    if (source.contains('profile')) {
      return 'Try this: Based on my profile, what should I do first today?';
    }
    return 'Try this: What is my best farm action today based on market and weather?';
  }

  String get _heroText {
    if (_response.isNotEmpty) {
      if (_state == _VoiceState.playing && _playbackDuration > Duration.zero) {
        return _readingWindowText(_response);
      }
      return _previewText(_response, maxChars: 220);
    }
    if (_activeQuestion.isNotEmpty) {
      return _activeQuestion;
    }
    return _primarySuggestion;
  }

  String _previewText(String text, {int maxChars = 220}) {
    final clean = text.trim();
    if (clean.length <= maxChars) return clean;
    return '${clean.substring(0, maxChars).trim()}...';
  }

  String _cleanDisplayText(String text) {
    var out = text.trim();
    if (out.isEmpty) return out;

    out = out.replaceAll('**', '');
    out = out.replaceAll('*', '');
    out = out.replaceAll('_', ' ');

    out = out.replaceAll(RegExp(r'\(\s*source\s*:[^)]+\)', caseSensitive: false), '');
    out = out.replaceAll(RegExp(r'\(\s*timestamp\s*:[^)]+\)', caseSensitive: false), '');
    out = out.replaceAll(RegExp(r'\b(ref|profile)\s*[\-_][a-z0-9\-_]+\b', caseSensitive: false), '');
    out = out.replaceAll(RegExp(r'\b\d{4}-\d{2}-\d{2}t\d{2}:\d{2}:\d{2}[^\s,;)]*', caseSensitive: false), '');
    out = out.replaceAll(RegExp(r'\bdata\s*now\b\s*[:\-]?', caseSensitive: false), '');
    out = out.replaceAll(RegExp(r'\b(last\s+available\s+date|updated\s+at|as\s+of)\b\s*[:\-]?\s*[^.\n]*', caseSensitive: false), '');

    out = out.replaceAll(RegExp(r'\s{2,}'), ' ').trim();
    return out;
  }

  String _readingWindowText(String text) {
    final clean = text.replaceAll(RegExp(r'\s+'), ' ').trim();
    if (clean.length <= 132) return clean;

    final totalMs = _playbackDuration.inMilliseconds;
    final atMs = _playbackPosition.inMilliseconds;
    if (totalMs <= 0) return _previewText(clean, maxChars: 180);

    final progress = (atMs / totalMs).clamp(0.0, 1.0);
    const int windowChars = 132;
    final maxStart = math.max(0, clean.length - windowChars);
    var start = (maxStart * progress).floor();
    if (start > 0) {
      final spaceAt = clean.lastIndexOf(' ', start);
      if (spaceAt > start - 14) {
        start = spaceAt + 1;
      }
    }

    var end = math.min(clean.length, start + windowChars);
    if (end < clean.length) {
      final nextSpace = clean.indexOf(' ', end);
      if (nextSpace != -1 && (nextSpace - end) <= 14) {
        end = nextSpace;
      }
    }
    return clean.substring(start, end).trim();
  }

  @override
  Widget build(BuildContext context) {
    final isActive = _state == _VoiceState.recording;
    final isProcessing = _state == _VoiceState.processing;
    final isPlaying = _state == _VoiceState.playing;
    final choiceCardColor = Colors.white.withValues(alpha: context.isDark ? 0.16 : 0.56);

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: context.isDark
                ? [AppColors.darkBackground, AppColors.darkSurface]
                : [AppColors.lightBackground, AppColors.lightSurface],
          ),
        ),
        child: SafeArea(
          child: Stack(
            children: [
              Positioned(
                top: -80,
                right: -60,
                child: _GlowOrb(
                  size: 220,
                  color: AppColors.primary.withValues(alpha: 0.16),
                ),
              ),
              Positioned(
                left: -40,
                bottom: 80,
                child: _GlowOrb(
                  size: 170,
                  color: AppColors.info.withValues(alpha: 0.12),
                ),
              ),
              Padding(
                padding: AppSpacing.allLg,
                child: Column(
                  children: [
                    Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.arrow_back_rounded),
                          onPressed: () => context.pop(),
                        ),
                        Text(
                          'Krishi Voice',
                          style: GoogleFonts.manrope(
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                            color: context.colors.onSurface,
                            letterSpacing: -0.4,
                          ),
                        ),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: choiceCardColor,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.8),
                            ),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: AppColors.primary,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'CONNECTED',
                                style: GoogleFonts.manrope(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: context.colors.onSurface,
                                  letterSpacing: 0.6,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    Expanded(
                      child: SingleChildScrollView(
                        child: Column(
                          children: [
                            const SizedBox(height: AppSpacing.sm),
                            Text(
                              'VOICE PILOT ASSISTANT',
                              style: GoogleFonts.manrope(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 2,
                                color: context.appColors.textSecondary,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.md),
                            SizedBox(
                              height: 220,
                              child: Stack(
                                alignment: Alignment.center,
                                children: [
                                  AnimatedOpacity(
                                    duration: const Duration(milliseconds: 260),
                                    curve: Curves.easeOut,
                                    opacity: isProcessing ? 0.84 : 1,
                                    child: Text(
                                      _heroText,
                                      textAlign: TextAlign.center,
                                      style: GoogleFonts.sora(
                                        fontSize: 34,
                                        fontWeight: FontWeight.w400,
                                        height: 1.18,
                                        color: context.colors.onSurface.withValues(alpha: 0.96),
                                      ),
                                      maxLines: 4,
                                      overflow: TextOverflow.fade,
                                    ),
                                  ),
                                  if (_fadingQuestion != null)
                                    AnimatedBuilder(
                                      animation: _questionFadeController,
                                      builder: (context, _) {
                                        final t = _questionFadeController.value;
                                        return Positioned(
                                          top: 2 - (26 * t),
                                          left: 0,
                                          right: 0,
                                          child: Opacity(
                                            opacity: (0.9 - t).clamp(0, 1),
                                            child: Text(
                                              _fadingQuestion!,
                                              textAlign: TextAlign.center,
                                              maxLines: 2,
                                              overflow: TextOverflow.fade,
                                              style: GoogleFonts.sora(
                                                fontSize: 24,
                                                fontWeight: FontWeight.w300,
                                                height: 1.15,
                                                color: context.colors.onSurface.withValues(alpha: 0.28),
                                              ),
                                            ),
                                          ),
                                        );
                                      },
                                    ),
                                ],
                              ),
                            ),
                            const SizedBox(height: AppSpacing.lg),
                            Text(
                              _statusLabel,
                              style: context.textTheme.bodyMedium?.copyWith(
                                color: isActive
                                    ? AppColors.primaryDark
                                    : context.appColors.textSecondary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.lg),
                            _ReactiveWaveform(
                              controller: _waveController,
                              isActive: isActive,
                              color: AppColors.primary,
                            ),
                            const SizedBox(height: AppSpacing.lg),
                            if (_recentTurns.isNotEmpty)
                              SizedBox(height: MediaQuery.of(context).size.height * 0.44),
                            if (_recentTurns.isNotEmpty)
                              Container(
                                padding: AppSpacing.allMd,
                                decoration: BoxDecoration(
                                  color: choiceCardColor,
                                  borderRadius: BorderRadius.circular(18),
                                  border: Border.all(
                                    color: Colors.white.withValues(alpha: 0.8),
                                    width: 1.2,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: AppColors.primaryDark.withValues(alpha: 0.08),
                                      blurRadius: 10,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: Column(
                                  children: [
                                    for (final turn in _recentTurns.reversed) ...[
                                      Align(
                                        alignment: Alignment.centerRight,
                                        child: Container(
                                          margin: const EdgeInsets.only(bottom: 8, left: 32),
                                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                          decoration: BoxDecoration(
                                            color: AppColors.primary.withValues(alpha: 0.14),
                                            borderRadius: BorderRadius.circular(14),
                                          ),
                                          child: Text(
                                            turn.transcript,
                                            style: context.textTheme.bodyMedium,
                                          ),
                                        ),
                                      ),
                                      Align(
                                        alignment: Alignment.centerLeft,
                                        child: Container(
                                          margin: const EdgeInsets.only(bottom: 12, right: 32),
                                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                          decoration: BoxDecoration(
                                            color: context.isDark
                                                ? Colors.white.withValues(alpha: 0.08)
                                                : Colors.white.withValues(alpha: 0.65),
                                            borderRadius: BorderRadius.circular(14),
                                          ),
                                          child: Text(
                                            _previewText(turn.response, maxChars: 260),
                                            style: context.textTheme.bodyMedium,
                                            maxLines: 4,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            const SizedBox(height: AppSpacing.xl),
                          ],
                        ),
                      ),
                    ),
                    Container(
                      height: 170,
                      padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
                      decoration: BoxDecoration(
                        color: choiceCardColor,
                        borderRadius: AppRadius.xlAll,
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.8),
                          width: 1.2,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primaryDark.withValues(alpha: 0.08),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Stack(
                        clipBehavior: Clip.none,
                        children: [
                          Positioned(
                            left: 0,
                            right: 0,
                            bottom: -34,
                            top: -30,
                            child: IgnorePointer(
                              child: AnimatedBuilder(
                                animation: _flickerController,
                                builder: (context, _) {
                                  final flick = isActive
                                      ? (0.45 + (_flickerController.value * 0.5))
                                      : 0.2;
                                  return Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: List.generate(20, (i) {
                                      final base = 102 + ((i * 27) % 156).toDouble();
                                      final extra = isActive
                                          ? ((i % 6) * 15.0 * _flickerController.value)
                                          : 0.0;
                                      final alpha = (flick - ((i % 4) * 0.07)).clamp(0.08, 0.92);
                                      return Container(
                                        width: 3.3,
                                        height: base + extra,
                                        margin: const EdgeInsets.symmetric(horizontal: 1.2),
                                        color: AppColors.primary.withValues(alpha: alpha),
                                      );
                                    }),
                                  );
                                },
                              ),
                            ),
                          ),
                          Positioned(
                            left: 6,
                            right: 6,
                            bottom: 0,
                            child: SizedBox(
                              height: 142,
                              child: Stack(
                                alignment: Alignment.bottomCenter,
                                children: [
                                  Positioned(
                                    left: 14,
                                    bottom: 12,
                                    child: _BigControlButton(
                                      icon: isPlaying && !_isPlaybackPaused
                                          ? Icons.pause_rounded
                                          : Icons.more_horiz_rounded,
                                      label: isPlaying ? 'Pause' : 'More',
                                      compact: true,
                                      onTap: isPlaying
                                          ? _togglePauseResume
                                          : _replayLastResponse,
                                    ),
                                  ),
                                  Positioned(
                                    right: 14,
                                    bottom: 12,
                                    child: _BigControlButton(
                                      icon: Icons.chat_rounded,
                                      label: 'Chat',
                                      compact: true,
                                      onTap: _openChatDirect,
                                    ),
                                  ),
                                  Positioned(
                                    bottom: 20,
                                    child: _BigControlButton(
                                      icon: isActive ? Icons.stop_rounded : Icons.mic_rounded,
                                      label: isActive ? 'Listening' : 'Tap to Speak',
                                      isPrimary: true,
                                      onTap: () => _onMicTap(),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String get _statusLabel {
    switch (_state) {
      case _VoiceState.idle:
        return 'voice_assistant.tap_to_speak'.tr();
      case _VoiceState.recording:
        return 'voice_assistant.listening'.tr();
      case _VoiceState.processing:
        return 'voice_assistant.processing'.tr();
      case _VoiceState.playing:
        return _isPlaybackPaused ? 'Playback paused' : 'voice_assistant.playing'.tr();
    }
  }
}

class _ReactiveWaveform extends StatelessWidget {
  final Animation<double> controller;
  final bool isActive;
  final Color color;

  const _ReactiveWaveform({
    required this.controller,
    required this.isActive,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 110,
      child: AnimatedBuilder(
        animation: controller,
        builder: (context, child) {
          final t = controller.value * math.pi * 2;
          return Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(22, (i) {
              final wave = math.sin(t + (i * 0.35)).abs();
              final base = isActive ? 16.0 : 10.0;
              final amp = isActive ? 62.0 : 22.0;
              final h = base + (amp * wave);
              return Container(
                width: 7,
                height: h,
                margin: const EdgeInsets.symmetric(horizontal: 2),
                decoration: BoxDecoration(
                  color: color.withValues(
                    alpha: isActive ? 0.95 - ((i % 4) * 0.12) : 0.36,
                  ),
                  borderRadius: BorderRadius.circular(999),
                ),
              );
            }),
          );
        },
      ),
    );
  }
}

class _BigControlButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final bool isPrimary;
  final bool compact;
  final String label;

  const _BigControlButton({
    required this.icon,
    required this.onTap,
    this.isPrimary = false,
    this.compact = false,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    final background = isPrimary
      ? AppColors.primary.withValues(alpha: 0.26)
        : (context.isDark
            ? Colors.black.withValues(alpha: 0.38)
            : Colors.white.withValues(alpha: 0.95));
    final iconColor = isPrimary
      ? AppColors.primary
        : context.colors.onSurface.withValues(alpha: 0.9);

    final width = compact ? 58.0 : (isPrimary ? 100.0 : 84.0);
    final height = compact ? 58.0 : (isPrimary ? 100.0 : 84.0);
    final radius = compact ? 29.0 : 36.0;

    return InkWell(
      borderRadius: BorderRadius.circular(radius),
      onTap: onTap,
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: background,
          border: Border.all(
            color: isPrimary
                ? AppColors.primary.withValues(alpha: 0.55)
                : AppColors.primary.withValues(alpha: 0.18),
          ),
          borderRadius: BorderRadius.circular(radius),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: iconColor, size: compact ? 24 : (isPrimary ? 36 : 30)),
            if (!compact) ...[
              const SizedBox(height: 4),
              Text(
                label,
                textAlign: TextAlign.center,
                style: context.textTheme.labelSmall?.copyWith(
                  color: isPrimary ? AppColors.primary : context.appColors.textSecondary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _GlowOrb extends StatelessWidget {
  final double size;
  final Color color;

  const _GlowOrb({required this.size, required this.color});

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [color, color.withValues(alpha: 0.0)],
          ),
        ),
      ),
    );
  }
}
