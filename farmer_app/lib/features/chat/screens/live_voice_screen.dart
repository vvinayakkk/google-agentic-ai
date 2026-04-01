import 'dart:convert';
import 'dart:io';

import 'package:audioplayers/audioplayers.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
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

class _LiveVoiceScreenState extends ConsumerState<LiveVoiceScreen>
    with SingleTickerProviderStateMixin {
  _VoiceState _state = _VoiceState.idle;
  String _transcript = '';
  String _response = '';
  String? _sessionId;
  String? _lastAudioBase64;

  late final AnimationController _pulseController;
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
    _audioPlayer.onPlayerComplete.listen((_) {
      if (mounted) {
        setState(() => _state = _VoiceState.idle);
      }
    });
  }

  @override
  void dispose() {
    _pulseController.dispose();
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

    setState(() => _state = _VoiceState.recording);
    _pulseController.repeat(reverse: true);
  }

  Future<void> _stopAndProcess() async {
    final languageCode = context.locale.languageCode;

    _pulseController.stop();
    final path = await _recorder.stop();

    if (path == null || path.isEmpty) {
      setState(() => _state = _VoiceState.idle);
      if (mounted) {
        context.showSnack('voice_assistant.no_speech'.tr(), isError: true);
      }
      return;
    }

    setState(() {
      _state = _VoiceState.processing;
      _transcript = '';
      _response = '';
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

      final transcript = data['transcript'] as String? ?? '';
      final response = data['response'] as String? ?? '';
      final audioBase64 = data['audio_base64'] as String? ?? '';
      _sessionId = data['session_id'] as String? ?? _sessionId;

      setState(() {
        _transcript = transcript;
        _response = response;
        _lastAudioBase64 = audioBase64.isEmpty ? null : audioBase64;
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

  Future<void> _playAudioBase64(String base64Audio) async {
    if (base64Audio.isEmpty) return;

    setState(() => _state = _VoiceState.playing);
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

  void _openTranscriptInChat() {
    final query = _transcript.isNotEmpty ? _transcript : _response;
    if (query.isEmpty) {
      context.showSnack('Speak first to open this in chat.', isError: true);
      return;
    }

    final encoded = Uri.encodeQueryComponent(query);
    context.push('${RoutePaths.chat}?agent=general&q=$encoded');
  }

  void _openSpeechToText() {
    context.push(RoutePaths.speechToText);
  }

  @override
  Widget build(BuildContext context) {
    final isActive = _state == _VoiceState.recording;
    final isProcessing = _state == _VoiceState.processing;
    final isPlaying = _state == _VoiceState.playing;

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
        title: const Text('Kisaan ki Awaaz'),
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: context.isDark
                ? [AppColors.darkBackground, AppColors.darkSurface]
                : [AppColors.lightBackground, AppColors.lightSurface],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: AppSpacing.allXl,
            child: Column(
            children: [
              SizedBox(height: MediaQuery.of(context).padding.top + kToolbarHeight - 16),
              const SizedBox(height: AppSpacing.lg),
              Text(
                isActive ? 'Listening...' : 'Ready to Listen',
                style: context.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: isActive ? AppColors.danger : AppColors.primary,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Voice assistant activated',
                style: context.textTheme.bodySmall?.copyWith(
                  color: context.appColors.textSecondary,
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  24,
                  (i) => _WaveBar(
                    index: i,
                    isActive: isActive || isProcessing || isPlaying,
                  ),
                ),
              ),
              const Spacer(),
              AnimatedBuilder(
                animation: _pulseController,
                builder: (_, child) {
                  final scale =
                      isActive ? 1.0 + _pulseController.value * 0.2 : 1.0;
                  return Transform.scale(scale: scale, child: child);
                },
                child: _MicButton(
                  isListening: isActive,
                  isProcessing: isProcessing,
                  isPlaying: isPlaying,
                  onTap: _onMicTap,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text(
                _statusLabel,
                style: context.textTheme.bodyMedium?.copyWith(
                  color: context.appColors.textSecondary,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              if (_transcript.isNotEmpty) ...[
                Text(
                  'voice_assistant.you_said'.tr(),
                  style: context.textTheme.labelSmall?.copyWith(
                    color: context.appColors.textSecondary,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  _transcript,
                  textAlign: TextAlign.center,
                  style: context.textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
              ],
              if (_response.isNotEmpty)
                Flexible(
                  child: AppCard(
                    padding: AppSpacing.allLg,
                    child: SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.smart_toy,
                                  size: 18, color: AppColors.primary),
                              const SizedBox(width: AppSpacing.sm),
                              Text(
                                'voice_assistant.assistant'.tr(),
                                style:
                                    context.textTheme.labelMedium?.copyWith(
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              if (_state == _VoiceState.playing) ...[
                                const Spacer(),
                                SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: AppSpacing.sm),
                          Text(
                            _response,
                            style: context.textTheme.bodyMedium,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              const Spacer(),
              Container(
                padding: AppSpacing.allMd,
                decoration: BoxDecoration(
                  color: context.isDark
                      ? Colors.white.withValues(alpha: 0.08)
                      : Colors.white.withValues(alpha: 0.5),
                  borderRadius: AppRadius.lgAll,
                  border: Border.all(
                    color: context.isDark
                        ? Colors.white.withValues(alpha: 0.28)
                        : Colors.white.withValues(alpha: 0.82),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _ControlIcon(
                      icon: Icons.keyboard_rounded,
                      onTap: _openTranscriptInChat,
                    ),
                    _ControlIcon(
                      icon: Icons.smart_toy_outlined,
                      onTap: _openTranscriptInChat,
                    ),
                    _ControlIcon(
                      icon: isActive ? Icons.stop_rounded : Icons.mic_rounded,
                      onTap: _onMicTap,
                      isPrimary: true,
                    ),
                    _ControlIcon(
                      icon: Icons.volume_up_rounded,
                      onTap: _replayLastResponse,
                    ),
                    _ControlIcon(
                      icon: Icons.settings_voice_rounded,
                      onTap: _openSpeechToText,
                    ),
                  ],
                ),
              ),
            ],
            ),
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
        return 'voice_assistant.playing'.tr();
    }
  }
}

class _WaveBar extends StatelessWidget {
  final int index;
  final bool isActive;

  const _WaveBar({required this.index, required this.isActive});

  @override
  Widget build(BuildContext context) {
    final heights = [8.0, 16.0, 24.0, 14.0, 20.0, 10.0];
    final h = isActive ? heights[index % heights.length] : 10.0;
    return Container(
      width: 4,
      height: h,
      margin: const EdgeInsets.symmetric(horizontal: 1.6),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: isActive ? 0.9 : 0.35),
        borderRadius: BorderRadius.circular(4),
      ),
    );
  }
}

class _ControlIcon extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final bool isPrimary;

  const _ControlIcon({
    required this.icon,
    required this.onTap,
    this.isPrimary = false,
  });

  @override
  Widget build(BuildContext context) {
    final background = isPrimary
        ? AppColors.primary.withValues(alpha: 0.15)
        : Colors.transparent;
    final iconColor = isPrimary ? AppColors.primary : context.colors.onSurface;

    return InkWell(
      borderRadius: BorderRadius.circular(24),
      onTap: onTap,
      child: Container(
        width: isPrimary ? 46 : 40,
        height: isPrimary ? 46 : 40,
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(24),
        ),
        child: Icon(icon, color: iconColor, size: isPrimary ? 24 : 22),
      ),
    );
  }
}

// ── Large mic button ─────────────────────────────────────

class _MicButton extends StatelessWidget {
  final bool isListening;
  final bool isProcessing;
  final bool isPlaying;
  final VoidCallback onTap;

  const _MicButton({
    required this.isListening,
    required this.isProcessing,
    this.isPlaying = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final bool isDark = context.isDark;
    final Color baseColor;
    final Color iconColor;
    final IconData icon;

    if (isPlaying) {
      baseColor = isDark ? Colors.white : Colors.black;
      iconColor = isDark ? Colors.black : Colors.white;
      icon = Icons.volume_up;
    } else if (isProcessing) {
      baseColor = isDark ? Colors.white : Colors.black;
      iconColor = isDark ? Colors.black : Colors.white;
      icon = Icons.mic;
    } else if (isListening) {
      baseColor = isDark ? Colors.white : Colors.black;
      iconColor = isDark ? Colors.black : Colors.white;
      icon = Icons.stop;
    } else {
      baseColor = isDark ? Colors.white : Colors.black;
      iconColor = isDark ? Colors.black : Colors.white;
      icon = Icons.mic;
    }

    return GestureDetector(
      onTap: (isProcessing || isPlaying) ? null : onTap,
      child: Container(
        width: 120,
        height: 120,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: baseColor,
          boxShadow: [
            BoxShadow(
              color: baseColor.withValues(alpha: 0.4),
              blurRadius: 24,
              spreadRadius: 4,
            ),
          ],
        ),
        child: isProcessing
            ? Center(
                child: SizedBox(
                  width: 36,
                  height: 36,
                  child: CircularProgressIndicator(
                    color: iconColor,
                    strokeWidth: 3,
                  ),
                ),
              )
            : Icon(icon, color: iconColor, size: 48),
      ),
    );
  }
}
