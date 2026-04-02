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
  String? _sessionId;
  String? _lastAudioBase64;
  bool _isPlaybackPaused = false;
  final List<_VoiceTurn> _recentTurns = <_VoiceTurn>[];

  late final AnimationController _pulseController;
  late final AnimationController _waveController;
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

    _waveController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1700),
    )..repeat();

    _audioPlayer.onPlayerComplete.listen((_) {
      if (mounted) {
        setState(() {
          _state = _VoiceState.idle;
          _isPlaybackPaused = false;
        });
      }
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
    _waveController.dispose();
    _recorder.dispose();
    _audioPlayer.dispose();
    super.dispose();
  }

  void _onMicTap() {
    switch (_state) {
      case _VoiceState.idle:
        _startRecording();
        break;
      case _VoiceState.recording:
        _stopAndProcess();
        break;
      case _VoiceState.processing:
      case _VoiceState.playing:
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
  }

  Future<void> _stopAndProcess() async {
    _pulseController.stop();
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

    setState(() {
      _state = _VoiceState.processing;
      _isPlaybackPaused = false;
      _lastAudioBase64 = null;
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
      final response = _cleanDisplayText(data['response'] as String? ?? '');
      final audioBase64 = data['audio_base64'] as String? ?? '';
      _sessionId = data['session_id'] as String? ?? _sessionId;

      setState(() {
        _transcript = transcript;
        _response = response;
        _lastAudioBase64 = audioBase64.isEmpty ? null : audioBase64;
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
      return _previewText(_response, maxChars: 220);
    }
    if (_transcript.isNotEmpty) {
      return _transcript;
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

  @override
  Widget build(BuildContext context) {
    final isActive = _state == _VoiceState.recording;
    final isProcessing = _state == _VoiceState.processing;
    final isPlaying = _state == _VoiceState.playing;
    final bool isBusy = isProcessing || isPlaying;

    return Scaffold(
      backgroundColor: context.isDark ? AppColors.darkBackground : const Color(0xFFF2F7F6),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: context.isDark
                ? const [Color(0xFF111414), Color(0xFF1D2524)]
                : const [Color(0xFFF8FAFA), Color(0xFFEAF4F2)],
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
                            color: AppColors.primary.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(
                              color: AppColors.primary.withValues(alpha: 0.25),
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
                                  color: AppColors.primaryDark,
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
                            AnimatedSwitcher(
                              duration: const Duration(milliseconds: 350),
                              child: Text(
                                _heroText,
                                key: ValueKey(_heroText),
                                textAlign: TextAlign.center,
                                style: GoogleFonts.sora(
                                  fontSize: 30,
                                  fontWeight: FontWeight.w700,
                                  height: 1.2,
                                  color: context.colors.onSurface,
                                ),
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
                              isActive: isActive || isBusy,
                              color: AppColors.primary,
                            ),
                            const SizedBox(height: AppSpacing.lg),
                            if (_response.isEmpty && _transcript.isEmpty)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(18),
                                  onTap: isBusy ? null : () => _runPromptThroughVoice(_primarySuggestion),
                                  child: Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                                    decoration: BoxDecoration(
                                      color: context.isDark
                                          ? Colors.white.withValues(alpha: 0.06)
                                          : Colors.white,
                                      borderRadius: BorderRadius.circular(18),
                                      border: Border.all(
                                        color: AppColors.primary.withValues(alpha: 0.28),
                                      ),
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.bolt_rounded,
                                            color: AppColors.primary, size: 20),
                                        const SizedBox(width: 10),
                                        Expanded(
                                          child: Text(
                                            _primarySuggestion,
                                            style: context.textTheme.titleSmall?.copyWith(
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            if (_recentTurns.isNotEmpty)
                              AppCard(
                                padding: AppSpacing.allMd,
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
                                                ? Colors.white.withValues(alpha: 0.06)
                                                : const Color(0xFFF4F6F8),
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
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: context.isDark
                            ? Colors.white.withValues(alpha: 0.08)
                            : Colors.white.withValues(alpha: 0.82),
                        borderRadius: AppRadius.xlAll,
                        border: Border.all(
                          color: context.isDark
                              ? Colors.white.withValues(alpha: 0.18)
                              : Colors.white.withValues(alpha: 0.9),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _BigControlButton(
                            icon: isPlaying && !_isPlaybackPaused
                                ? Icons.pause_rounded
                                : Icons.play_arrow_rounded,
                            label: isPlaying ? 'Pause' : 'Replay',
                            onTap: isPlaying ? _togglePauseResume : _replayLastResponse,
                          ),
                          AnimatedBuilder(
                            animation: _pulseController,
                            builder: (_, child) {
                              final scale = isActive
                                  ? 1.0 + _pulseController.value * 0.12
                                  : 1.0;
                              return Transform.scale(scale: scale, child: child);
                            },
                            child: _BigControlButton(
                              icon: isActive ? Icons.stop_rounded : Icons.mic_rounded,
                              label: isActive ? 'Stop' : 'Speak',
                              isPrimary: true,
                              onTap: isBusy ? () {} : _onMicTap,
                            ),
                          ),
                          _BigControlButton(
                            icon: Icons.chat_rounded,
                            label: 'Chat Mode',
                            onTap: _openChatDirect,
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
  final String label;

  const _BigControlButton({
    required this.icon,
    required this.onTap,
    this.isPrimary = false,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    final Color effective = AppColors.primary;
    final background = isPrimary
        ? effective.withValues(alpha: 0.2)
        : effective.withValues(alpha: 0.08);
    final iconColor = isPrimary ? effective : context.colors.onSurface.withValues(alpha: 0.9);

    return InkWell(
      borderRadius: BorderRadius.circular(36),
      onTap: onTap,
      child: Container(
        width: isPrimary ? 92 : 84,
        height: isPrimary ? 92 : 84,
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(36),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: iconColor, size: isPrimary ? 34 : 30),
            const SizedBox(height: 4),
            Text(
              label,
              style: context.textTheme.labelSmall?.copyWith(
                color: isPrimary ? effective : context.appColors.textSecondary,
                fontWeight: FontWeight.w700,
              ),
            ),
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
