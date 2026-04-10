import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';

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
import 'package:url_launcher/url_launcher.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/app_cache.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/services/agent_service.dart';
import 'shared_thinking_templates.dart';

class LiveVoiceScreen extends ConsumerStatefulWidget {
  const LiveVoiceScreen({super.key});

  @override
  ConsumerState<LiveVoiceScreen> createState() => _LiveVoiceScreenState();
}

enum _VoiceState { idle, recording, processing, playing }

class _VoiceActionCard {
  final String label;
  final IconData icon;
  final String route;

  const _VoiceActionCard({
    required this.label,
    required this.icon,
    required this.route,
  });
}

class _LiveVoiceScreenState extends ConsumerState<LiveVoiceScreen>
    with TickerProviderStateMixin {
  static const int _maxActionCards = 8;
  static const Duration _cardsStaggerStep = Duration(milliseconds: 380);
  static const Duration _cardPopDuration = Duration(milliseconds: 420);

  _VoiceState _state = _VoiceState.idle;
  String _response = '';
  String _activeQuestion = '';
  String? _fadingQuestion;
  String? _sessionId;
  String? _lastAudioBase64;
  bool _isPlaybackPaused = false;
  bool _responseExpanded = false;
  bool _thinkingExpanded = false;

  final List<String> _thinkingSteps = <String>[];
  int _thinkingElapsedSeconds = 0;
  int _thinkingTemplateCursor = 0;
  Timer? _thinkingTimer;

  Timer? _sessionTimer;
  int _sessionElapsedSeconds = 0;

  Timer? _cardsStaggerTimer;
  List<_VoiceActionCard> _actionCards = <_VoiceActionCard>[];
  int _visibleCardCount = 0;

  final ValueNotifier<double> _hazeAmplitudeNotifier = ValueNotifier<double>(0);
  StreamSubscription<Amplitude>? _amplitudeSub;

  late final AnimationController _hazeController;
  late final AnimationController _questionFadeController;

  final ScrollController _thinkingScrollController = ScrollController();

  final AudioRecorder _recorder = AudioRecorder();
  final AudioPlayer _audioPlayer = AudioPlayer();
  final AudioPlayer _uiSfxPlayer = AudioPlayer();
  late final Uint8List _micTapSfxBytes;
  String? _recordingPath;

  int _responseFlowKeySeed = 0;
  Duration _responseRevealDuration = const Duration(milliseconds: 2800);
  bool _responseFlowCompleted = false;

  void _resetHazeAmplitude() {
    if (_hazeAmplitudeNotifier.value.abs() < 0.0005) return;
    _hazeAmplitudeNotifier.value = 0;
  }

  Uint8List _buildPcm16MonoWavHeader({
    required int sampleRate,
    required int sampleCount,
  }) {
    const numChannels = 1;
    const bitsPerSample = 16;
    final blockAlign = numChannels * bitsPerSample ~/ 8;
    final byteRate = sampleRate * blockAlign;
    final dataChunkSize = sampleCount * blockAlign;
    final riffChunkSize = 36 + dataChunkSize;

    final header = ByteData(44);

    header.setUint8(0, 0x52); // R
    header.setUint8(1, 0x49); // I
    header.setUint8(2, 0x46); // F
    header.setUint8(3, 0x46); // F
    header.setUint32(4, riffChunkSize, Endian.little);
    header.setUint8(8, 0x57); // W
    header.setUint8(9, 0x41); // A
    header.setUint8(10, 0x56); // V
    header.setUint8(11, 0x45); // E

    header.setUint8(12, 0x66); // f
    header.setUint8(13, 0x6D); // m
    header.setUint8(14, 0x74); // t
    header.setUint8(15, 0x20); // ' '
    header.setUint32(16, 16, Endian.little); // PCM chunk size
    header.setUint16(20, 1, Endian.little); // PCM format
    header.setUint16(22, numChannels, Endian.little);
    header.setUint32(24, sampleRate, Endian.little);
    header.setUint32(28, byteRate, Endian.little);
    header.setUint16(32, blockAlign, Endian.little);
    header.setUint16(34, bitsPerSample, Endian.little);

    header.setUint8(36, 0x64); // d
    header.setUint8(37, 0x61); // a
    header.setUint8(38, 0x74); // t
    header.setUint8(39, 0x61); // a
    header.setUint32(40, dataChunkSize, Endian.little);

    return header.buffer.asUint8List();
  }

  Uint8List _buildMicTapWav({
    Duration duration = const Duration(milliseconds: 46),
    int sampleRate = 24000,
    double volume = 0.86,
  }) {
    final sampleCount = (duration.inMilliseconds * sampleRate / 1000)
        .round()
        .clamp(1, 200000);
    final pcmData = ByteData(sampleCount * 2);
    final random = math.Random(17);

    for (var i = 0; i < sampleCount; i++) {
      final t = sampleCount == 1 ? 0.0 : i / (sampleCount - 1);
      final noise = (random.nextDouble() * 2 - 1) * math.exp(-38 * t);
      final clickSnap = math.sin(2 * math.pi * 1820 * t) * math.exp(-55 * t);
      final clickBody = math.sin(2 * math.pi * 320 * t) * math.exp(-12 * t);
      final sample =
          ((noise * 0.78) + (clickSnap * 0.52) + (clickBody * 0.18)) * volume;
      final clamped = sample.clamp(-1.0, 1.0);
      pcmData.setInt16(i * 2, (clamped * 32767).round(), Endian.little);
    }

    final header = _buildPcm16MonoWavHeader(
      sampleRate: sampleRate,
      sampleCount: sampleCount,
    );
    final bytes = BytesBuilder(copy: false)
      ..add(header)
      ..add(pcmData.buffer.asUint8List());
    return bytes.toBytes();
  }

  Future<void> _playMicToggleFeedback({required bool activating}) async {
    if (activating) {
      Haptics.light();
    } else {
      Haptics.heavy();
    }
    try {
      await _uiSfxPlayer.stop();
      await _uiSfxPlayer.setVolume(activating ? 0.98 : 0.9);
      await _uiSfxPlayer.play(BytesSource(_micTapSfxBytes));
    } catch (_) {
      try {
        await SystemSound.play(SystemSoundType.click);
      } catch (_) {
        // Best-effort mic toggle feedback.
      }
    }
  }

  @override
  void initState() {
    super.initState();
    _micTapSfxBytes = _buildMicTapWav();

    unawaited(_uiSfxPlayer.setReleaseMode(ReleaseMode.stop));

    _hazeController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat();
    _questionFadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
      value: 1,
    );

    _audioPlayer.onPlayerComplete.listen((_) {
      if (!mounted) return;
      _stopPlayPulseIfNeeded();
      setState(() {
        _state = _VoiceState.idle;
        _isPlaybackPaused = false;
      });
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
    _thinkingTimer?.cancel();
    _sessionTimer?.cancel();
    _cardsStaggerTimer?.cancel();
    _amplitudeSub?.cancel();

    _hazeController.dispose();
    _hazeAmplitudeNotifier.dispose();
    _questionFadeController.dispose();
    _thinkingScrollController.dispose();

    _recorder.dispose();
    _uiSfxPlayer.dispose();
    _audioPlayer.dispose();
    super.dispose();
  }

  Future<void> _onMicTap() async {
    switch (_state) {
      case _VoiceState.idle:
        await _playMicToggleFeedback(activating: true);
        await _startRecording();
        break;
      case _VoiceState.recording:
        await _playMicToggleFeedback(activating: false);
        await _stopAndProcess();
        break;
      case _VoiceState.processing:
        break;
      case _VoiceState.playing:
        await _playMicToggleFeedback(activating: true);
        await _audioPlayer.stop();
        if (!mounted) return;
        _stopPlayPulseIfNeeded();
        setState(() {
          _state = _VoiceState.idle;
          _isPlaybackPaused = false;
        });
        await _startRecording();
        break;
    }
  }

  Future<void> _startRecording() async {
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
    _recordingPath =
        '${dir.path}/voice_cmd_${DateTime.now().millisecondsSinceEpoch}.wav';

    await _recorder.start(
      const RecordConfig(encoder: AudioEncoder.wav),
      path: _recordingPath!,
    );

    _amplitudeSub?.cancel();
    _amplitudeSub = _recorder
        .onAmplitudeChanged(const Duration(milliseconds: 32))
        .listen((amp) {
          if (!mounted || _state != _VoiceState.recording) return;
          final db = amp.current;
          final rawAmp = db.isFinite
              ? ((db + 60) / 60).clamp(0.0, 1.0).toDouble()
              : 0.0;

          final prevAmp = _hazeAmplitudeNotifier.value;
          // Fast attack for speech onset, slower release for smooth decay.
          final smoothing = rawAmp >= prevAmp ? 0.44 : 0.22;
          final smoothedAmp =
              (prevAmp * (1 - smoothing)) + (rawAmp * smoothing);
          final emphasizedAmp = ((smoothedAmp * 0.85) + (rawAmp * 0.15))
              .clamp(0.0, 1.0)
              .toDouble();
          if ((prevAmp - emphasizedAmp).abs() < 0.002) {
            return;
          }
          _hazeAmplitudeNotifier.value = emphasizedAmp;
        });

    _stopThinkingTicker();
    _cardsStaggerTimer?.cancel();
    _stopPlayPulseIfNeeded();

    setState(() {
      _state = _VoiceState.recording;
      _isPlaybackPaused = false;
      _response = '';
      _activeQuestion = '';
      _fadingQuestion = null;
      _thinkingSteps.clear();
      _thinkingElapsedSeconds = 0;
      _thinkingTemplateCursor = 0;
      _actionCards = <_VoiceActionCard>[];
      _visibleCardCount = 0;
      _responseExpanded = false;
      _responseFlowCompleted = false;
      _thinkingExpanded = false;
    });
    _resetHazeAmplitude();
  }

  Future<void> _stopAndProcess() async {
    final seededThinking = SharedThinkingTemplates.buildThoughtTemplates(
      phase: 'Transcribing your speech',
      contextHint: _activeQuestion,
    );
    _amplitudeSub?.cancel();
    _amplitudeSub = null;

    setState(() {
      _state = _VoiceState.processing;
      _isPlaybackPaused = false;
      _lastAudioBase64 = null;
      _response = '';
      _thinkingSteps
        ..clear()
        ..addAll(seededThinking.take(2));
      _thinkingElapsedSeconds = 0;
      _thinkingTemplateCursor = _thinkingSteps.length;
      _visibleCardCount = 0;
      _thinkingExpanded = true;
    });
    _resetHazeAmplitude();

    _cardsStaggerTimer?.cancel();
    _startThinkingTicker();
    _scheduleThinkingAutoScroll();

    final path = await _recorder.stop();
    if (path == null || path.isEmpty) {
      _stopThinkingTicker();
      if (!mounted) return;
      setState(() {
        _state = _VoiceState.idle;
      });
      _resetHazeAmplitude();
      context.showSnack('voice_assistant.no_speech'.tr(), isError: true);
      return;
    }

    await _processVoiceFileStream(path);
  }

  void _startThinkingTicker() {
    _thinkingTimer?.cancel();
    _thinkingTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted || _state != _VoiceState.processing) return;
      setState(() {
        _thinkingElapsedSeconds += 1;
        final fallback = _thinkingFallbackForElapsed(_thinkingElapsedSeconds);
        if (fallback.isNotEmpty) {
          _appendThinkingStepInState(fallback);
        }
      });
      _scheduleThinkingAutoScroll();
    });
  }

  void _stopThinkingTicker() {
    _thinkingTimer?.cancel();
    _thinkingTimer = null;
  }

  String _thinkingFallbackForElapsed(int elapsed) {
    if (elapsed < 2 || elapsed.isOdd || _thinkingSteps.length >= 24) return '';
    return _nextSharedThinkingStep(
      phase: 'Analyzing your voice request',
      contextHint: _activeQuestion,
    );
  }

  String _nextSharedThinkingStep({required String phase, String? contextHint}) {
    final templates = SharedThinkingTemplates.buildThoughtTemplates(
      phase: phase,
      contextHint: contextHint,
    );
    while (_thinkingTemplateCursor < templates.length) {
      final candidate = templates[_thinkingTemplateCursor];
      _thinkingTemplateCursor += 1;
      final duplicate = _thinkingSteps.any(
        (step) => step.toLowerCase() == candidate.toLowerCase(),
      );
      if (!duplicate) {
        return candidate;
      }
    }
    return '';
  }

  void _appendThinkingStepInState(String step) {
    final clean = step.trim();
    if (clean.isEmpty) return;
    if (_thinkingSteps.isNotEmpty &&
        _thinkingSteps.last.toLowerCase() == clean.toLowerCase()) {
      return;
    }
    _thinkingSteps.add(clean);
    if (_thinkingSteps.length > 24) {
      _thinkingSteps.removeRange(0, _thinkingSteps.length - 24);
    }
  }

  void _scheduleThinkingAutoScroll() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_thinkingScrollController.hasClients) return;
      final max = _thinkingScrollController.position.maxScrollExtent;
      _thinkingScrollController.animateTo(
        max,
        duration: const Duration(milliseconds: 230),
        curve: Curves.easeOutCubic,
      );
    });
  }

  void _startSessionTickerIfNeeded() {
    _sessionTimer ??= Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      if (_sessionId == null || _sessionId!.isEmpty) return;
      setState(() => _sessionElapsedSeconds += 1);
    });
  }

  void _syncSession(String? nextSessionId) {
    final clean = (nextSessionId ?? '').trim();
    if (clean.isEmpty) return;
    if (_sessionId != clean) {
      _sessionElapsedSeconds = 0;
    }
    _sessionId = clean;
    _startSessionTickerIfNeeded();
  }

  void _startCardsStagger() {
    _cardsStaggerTimer?.cancel();
    final blockedState =
        _state == _VoiceState.processing || _state == _VoiceState.recording;

    if (!mounted || _actionCards.isEmpty || blockedState) {
      if (mounted) {
        setState(() => _visibleCardCount = 0);
      }
      return;
    }

    if (_visibleCardCount >= _actionCards.length && _visibleCardCount > 0) {
      return;
    }

    setState(() => _visibleCardCount = 0);
    _cardsStaggerTimer = Timer.periodic(_cardsStaggerStep, (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_state == _VoiceState.processing || _state == _VoiceState.recording) {
        timer.cancel();
        return;
      }
      final next = _visibleCardCount + 1;
      if (next > _actionCards.length) {
        timer.cancel();
        return;
      }
      setState(() => _visibleCardCount = next);
      if (next >= _actionCards.length) {
        timer.cancel();
      }
    });
  }

  Future<void> _processVoiceFileStream(
    String path, {
    String? sourcePrompt,
  }) async {
    final languageCode = context.locale.languageCode;
    const requestLanguage = 'auto';
    final hintedQuestion = (sourcePrompt ?? '').trim();
    final voice = ref.read(voiceServiceProvider);
    var handledResult = false;

    Future<void> fallbackToNonStreaming() async {
      final data = await voice.voiceCommandText(
        path,
        language: requestLanguage,
        sessionId: _sessionId,
      );
      if (!mounted) return;
      await _handleVoiceResult(
        data,
        languageCode: languageCode,
        sourcePrompt: hintedQuestion,
      );
    }

    try {
      final stream = voice.voiceCommandTextStream(
        path,
        language: requestLanguage,
        sessionId: _sessionId,
      );

      await for (final event in stream) {
        if (!mounted) return;
        final type = (event['type'] ?? '').toString();

        if (type == 'stt_done') {
          final display =
              (event['transcript_display'] ?? event['transcript'] ?? '')
                  .toString()
                  .trim();
          final sttDoneStep = _nextSharedThinkingStep(
            phase: 'Transcription complete',
            contextHint: display,
          );
          if (display.isNotEmpty) {
            final previousQuestion = _activeQuestion;
            setState(() {
              _activeQuestion = display;
              if (sttDoneStep.isNotEmpty) {
                _appendThinkingStepInState(sttDoneStep);
              }
              if (previousQuestion.isNotEmpty && previousQuestion != display) {
                _fadingQuestion = previousQuestion;
              }
            });
            _questionFadeController.forward(from: 0);
            if (_fadingQuestion != null) {
              _questionFadeController.addStatusListener(
                _clearQuestionStatusListener,
              );
            }
          } else {
            setState(() {
              if (sttDoneStep.isNotEmpty) {
                _appendThinkingStepInState(sttDoneStep);
              }
            });
          }
          _scheduleThinkingAutoScroll();
          continue;
        }

        if (type == 'thinking') {
          final step = (event['step'] ?? '').toString().trim();
          if (step.isNotEmpty) {
            setState(() => _appendThinkingStepInState(step));
            _scheduleThinkingAutoScroll();
          }
          continue;
        }

        if (type == 'result') {
          handledResult = true;
          await _handleVoiceResult(
            event,
            languageCode: languageCode,
            sourcePrompt: hintedQuestion,
          );
          continue;
        }

        if (type == 'done' && handledResult) {
          break;
        }
      }

      if (!handledResult) {
        if (mounted) {
          setState(() {
            _appendThinkingStepInState(
              languageCode.toLowerCase().startsWith('hi')
                  ? 'Streaming slow hai, backup path try kar raha hoon'
                  : 'Streaming is slow, trying backup path',
            );
          });
        }
        await fallbackToNonStreaming();
      }
    } catch (_) {
      try {
        if (mounted) {
          setState(() {
            _appendThinkingStepInState(
              languageCode.toLowerCase().startsWith('hi')
                  ? 'Network issue, backup request bhej raha hoon'
                  : 'Network issue, sending backup request',
            );
          });
        }
        await fallbackToNonStreaming();
      } catch (_) {
        _stopThinkingTicker();
        _cardsStaggerTimer?.cancel();
        if (!mounted) return;
        setState(() {
          _response = 'voice_assistant.error'.tr();
          _state = _VoiceState.idle;
          _visibleCardCount = 0;
        });
        context.showSnack('voice_assistant.error'.tr(), isError: true);
      }
    }
  }

  Future<void> _handleVoiceResult(
    Map<String, dynamic> data, {
    required String languageCode,
    String? sourcePrompt,
  }) async {
    if (!mounted) return;

    final hintedQuestion = (sourcePrompt ?? '').trim();
    final transcript = (data['transcript'] as String? ?? sourcePrompt ?? '')
        .trim();
    final transcriptDisplay =
        (data['transcript_display'] as String? ?? transcript).trim();
    final responseLanguage = (data['language'] as String? ?? '').trim();
    final effectiveLanguageCode = responseLanguage.isNotEmpty
        ? responseLanguage
        : languageCode;
    final baseResponse = _cleanDisplayText(data['response'] as String? ?? '');
    final audioBase64 = data['audio_base64'] as String? ?? '';

    final actionTags = _extractActionTags(data);
    final actionCardLabels = _extractActionCardLabels(data);
    var cards = _buildVoiceActionCards(
      actionTags,
      actionCardLabels: actionCardLabels,
    );

    final retryStyleResponse = _isRetryStyleResponse(baseResponse);
    final weatherIntent = _isWeatherIntent(
      '$transcript $transcriptDisplay $hintedQuestion',
    );
    final schemeIntent = _isSchemeIntent(
      '$transcript $transcriptDisplay $hintedQuestion',
    );

    var effectiveResponse = baseResponse;
    if (retryStyleResponse && weatherIntent) {
      effectiveResponse = _weatherFallbackResponse(effectiveLanguageCode);
      cards = _mergePriorityCards(cards, const <String>[
        'weather',
        'soil_moisture',
      ], actionCardLabels: actionCardLabels);
    } else if (retryStyleResponse && schemeIntent) {
      effectiveResponse = _schemeFallbackResponse(effectiveLanguageCode);
      cards = _mergePriorityCards(cards, const <String>[
        'documents',
      ], actionCardLabels: actionCardLabels);
    }

    final responseForDisplay = effectiveResponse.trim();
    final responseForSpeech = responseForDisplay;

    final nextSession = data['session_id'] as String?;
    _syncSession(nextSession ?? _sessionId);

    final requestedLang = effectiveLanguageCode.trim().toLowerCase();
    final requestedIndic = <String>{
      'hi',
      'mr',
      'bn',
      'gu',
      'kn',
      'ml',
      'od',
      'or',
      'pa',
      'ta',
      'te',
      'as',
    }.contains(requestedLang);
    final transcriptHasLatin = RegExp(r'[A-Za-z]').hasMatch(transcript);
    final transcriptHasIndicScript = RegExp(
      r'[\u0900-\u0D7F]',
    ).hasMatch(transcript);
    final allowTranscriptFallback =
        !(requestedIndic &&
            transcriptDisplay.isEmpty &&
            transcriptHasLatin &&
            !transcriptHasIndicScript);

    final visibleQuestion = transcriptDisplay.isNotEmpty
        ? transcriptDisplay
        : (allowTranscriptFallback && transcript.isNotEmpty
              ? transcript
              : hintedQuestion);
    final previousQuestion = _activeQuestion;

    _stopThinkingTicker();

    setState(() {
      _response = '';
      _activeQuestion = visibleQuestion;
      _actionCards = cards;
      _visibleCardCount = 0;
      _responseExpanded = true;
      _responseFlowCompleted = false;
      _thinkingSteps.clear();
      _thinkingElapsedSeconds = 0;
      _thinkingTemplateCursor = 0;
      _thinkingExpanded = false;

      if (effectiveResponse.isNotEmpty &&
          previousQuestion.isNotEmpty &&
          previousQuestion != visibleQuestion) {
        _fadingQuestion = previousQuestion;
        _questionFadeController.forward(from: 0);
      }
    });

    if (effectiveResponse.isNotEmpty &&
        previousQuestion.isNotEmpty &&
        previousQuestion != visibleQuestion) {
      _questionFadeController.addStatusListener(_clearQuestionStatusListener);
    }

    String audioToPlay = audioBase64;
    if (audioToPlay.trim().isEmpty && responseForSpeech.isNotEmpty) {
      try {
        final voice = ref.read(voiceServiceProvider);
        final regenerated = await voice.ttsBase64(
          text: responseForSpeech,
          language: effectiveLanguageCode,
        );
        final regeneratedAudio = (regenerated['audio_base64'] as String? ?? '')
            .trim();
        if (regeneratedAudio.isNotEmpty) {
          audioToPlay = regeneratedAudio;
        }
      } catch (_) {
        // Keep empty audio fallback behavior.
      }
    }

    final revealDuration = _deriveRevealDuration(
      responseForDisplay,
      audioToPlay,
    );
    if (!mounted) return;

    setState(() {
      _responseRevealDuration = revealDuration;
      _responseFlowCompleted = false;
      _responseFlowKeySeed += 1;
      _response = responseForDisplay;
    });
    Haptics.selection();

    if (audioToPlay.isNotEmpty) {
      _lastAudioBase64 = audioToPlay;
      final played = await _playAudioBase64(audioToPlay);
      if (!played && mounted) {
        setState(() => _state = _VoiceState.idle);
      }
    } else {
      _lastAudioBase64 = null;
      setState(() => _state = _VoiceState.idle);
    }
  }

  Duration _deriveRevealDuration(String text, String audioBase64) {
    final words = _wordCount(text);
    if (words <= 0) {
      return const Duration(milliseconds: 1200);
    }

    final audioDuration = _estimateWavDurationFromBase64(audioBase64);
    if (audioDuration != null && audioDuration.inMilliseconds > 0) {
      final minMs = words * 80;
      final maxMs = words * 420;
      final rawMs = audioDuration.inMilliseconds;
      final boundedMs = rawMs < minMs ? minMs : (rawMs > maxMs ? maxMs : rawMs);
      return Duration(milliseconds: boundedMs);
    }

    final fallbackMs = words * 170;
    final boundedMs = fallbackMs < 1400
        ? 1400
        : (fallbackMs > 12000 ? 12000 : fallbackMs);
    return Duration(milliseconds: boundedMs);
  }

  int _wordCount(String text) {
    if (text.trim().isEmpty) return 0;
    return text
        .trim()
        .split(RegExp(r'\s+'))
        .where((w) => w.trim().isNotEmpty)
        .length;
  }

  Duration? _estimateWavDurationFromBase64(String base64Audio) {
    final raw = base64Audio.trim();
    if (raw.isEmpty) return null;

    try {
      final bytes = base64Decode(raw);
      if (bytes.length < 44) return null;

      final byteData = ByteData.sublistView(bytes);
      final byteRate = byteData.getUint32(28, Endian.little);
      if (byteRate <= 0) return null;

      var dataSize = bytes.length > 44 ? bytes.length - 44 : bytes.length;
      for (var i = 12; i + 8 < bytes.length; i++) {
        if (bytes[i] == 0x64 &&
            bytes[i + 1] == 0x61 &&
            bytes[i + 2] == 0x74 &&
            bytes[i + 3] == 0x61) {
          final dataChunk = ByteData.sublistView(
            bytes,
            i + 4,
            i + 8,
          ).getUint32(0, Endian.little);
          if (dataChunk > 0) {
            dataSize = dataChunk;
          }
          break;
        }
      }

      final millis = ((dataSize / byteRate) * 1000).round();
      if (millis <= 0) return null;
      return Duration(milliseconds: millis);
    } catch (_) {
      return null;
    }
  }

  void _clearQuestionStatusListener(AnimationStatus status) {
    if (status != AnimationStatus.completed) return;
    _questionFadeController.removeStatusListener(_clearQuestionStatusListener);
    if (!mounted) return;
    setState(() => _fadingQuestion = null);
  }

  void _onResponseRevealComplete() {
    if (!mounted || _responseFlowCompleted) return;
    setState(() {
      _responseFlowCompleted = true;
      if (_responseExpanded) {
        _responseExpanded = false;
      }
    });
    _startCardsStagger();
  }

  Future<bool> _playAudioBase64(String base64Audio) async {
    if (base64Audio.isEmpty) return false;

    try {
      if (!mounted) return false;
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
      return true;
    } catch (_) {
      if (!mounted) return false;
      _stopPlayPulseIfNeeded();
      setState(() {
        _state = _VoiceState.idle;
        _isPlaybackPaused = false;
      });
      return false;
    }
  }

  void _stopPlayPulseIfNeeded() {
    // Legacy wave/pulse animation removed; haze is now the only animation layer.
  }

  Future<void> _replayLastResponse() async {
    if (_lastAudioBase64 != null && _lastAudioBase64!.isNotEmpty) {
      final replayed = await _playAudioBase64(_lastAudioBase64!);
      if (!replayed && mounted) {
        context.showSnack('voice_assistant.error'.tr(), isError: true);
      }
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
      final replayed = await _playAudioBase64(generatedBase64);
      if (!replayed && mounted) {
        context.showSnack('voice_assistant.error'.tr(), isError: true);
      }
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
      if (mounted) setState(() => _isPlaybackPaused = false);
    } else {
      await _audioPlayer.pause();
      if (mounted) setState(() => _isPlaybackPaused = true);
    }
  }

  void _openChatContinuation() {
    final sid = (_sessionId ?? '').trim();
    if (sid.isNotEmpty) {
      final encodedSession = Uri.encodeQueryComponent(sid);
      context.push('${RoutePaths.chat}?agent=general&session=$encodedSession');
      return;
    }

    final q = _activeQuestion.trim();
    if (q.isNotEmpty) {
      final encodedQ = Uri.encodeQueryComponent(q);
      context.push('${RoutePaths.chat}?agent=general&q=$encodedQ');
      return;
    }
    context.push('${RoutePaths.chat}?agent=general');
  }

  Future<void> _openResponseDetailsSheet() async {
    if (_response.trim().isEmpty) return;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF111827) : Colors.white;
    final textColor = isDark ? AppColors.darkText : AppColors.lightText;
    final links = _extractUrls(_response);

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) {
        return FractionallySizedBox(
          heightFactor: 0.84,
          child: Container(
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(24),
              ),
            ),
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
                child: Column(
                  children: [
                    Container(
                      width: 42,
                      height: 4,
                      decoration: BoxDecoration(
                        color: textColor.withValues(alpha: 0.26),
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Text(
                          'Voice Response',
                          style: TextStyle(
                            color: textColor,
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const Spacer(),
                        if ((_sessionId ?? '').trim().isNotEmpty)
                          TextButton.icon(
                            onPressed: () {
                              Navigator.of(context).pop();
                              _openChatContinuation();
                            },
                            icon: const Icon(Icons.chat_bubble_outline_rounded),
                            label: Text('Continue in Chat'.tr()),
                          ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Expanded(
                      child: SingleChildScrollView(
                        physics: const BouncingScrollPhysics(),
                        child: MarkdownBody(
                          data: _response,
                          selectable: true,
                          styleSheet: MarkdownStyleSheet(
                            p: TextStyle(
                              color: textColor,
                              fontSize: 15.5,
                              height: 1.5,
                            ),
                          ),
                          onTapLink: (text, href, title) {
                            if (href == null) return;
                            _openExternalLink(href);
                          },
                        ),
                      ),
                    ),
                    if (links.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          'References',
                          style: TextStyle(
                            color: textColor,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          for (final link in links.take(5))
                            ActionChip(
                              label: Text(link),
                              onPressed: () => _openExternalLink(link),
                            ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Future<void> _openExternalLink(String href) async {
    final uri = Uri.tryParse(href);
    if (uri == null) return;
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  List<String> _extractUrls(String text) {
    final matches = RegExp(r'https?:\/\/[^\s)]+').allMatches(text);
    final out = <String>[];
    for (final m in matches) {
      final value = m.group(0);
      if (value == null) continue;
      if (!out.contains(value)) out.add(value);
    }
    return out;
  }

  List<String> _responseChunks(String text) {
    final clean = text.trim();
    if (clean.isEmpty) return const <String>[];

    final chunks = <String>[];
    final parts = clean
        .split(RegExp(r'(?<=[.!?])\s+'))
        .where((s) => s.trim().isNotEmpty)
        .toList();

    final source = parts.isEmpty ? <String>[clean] : parts;
    for (final sentence in source) {
      final s = sentence.trim();
      if (s.length <= 62) {
        chunks.add(s);
        continue;
      }

      final words = s.split(RegExp(r'\s+'));
      final buffer = StringBuffer();
      for (final word in words) {
        if (buffer.isEmpty) {
          buffer.write(word);
          continue;
        }
        final candidate = '${buffer.toString()} $word';
        if (candidate.length > 62) {
          chunks.add(buffer.toString());
          buffer
            ..clear()
            ..write(word);
        } else {
          buffer
            ..write(' ')
            ..write(word);
        }
      }
      if (buffer.isNotEmpty) {
        chunks.add(buffer.toString());
      }
    }

    return chunks;
  }

  String _cleanDisplayText(String text) {
    var out = text.trim();
    if (out.isEmpty) return out;

    out = out.replaceAll('**', '');
    out = out.replaceAll('*', '');
    out = out.replaceAll('_', ' ');
    out = out.replaceAll(
      RegExp(r'click\s+on\s+in\s+these\s+cards', caseSensitive: false),
      'click on these cards',
    );
    out = out.replaceAll(
      RegExp(r'\(\s*source\s*:[^)]+\)', caseSensitive: false),
      '',
    );
    out = out.replaceAll(
      RegExp(r'\(\s*timestamp\s*:[^)]+\)', caseSensitive: false),
      '',
    );
    out = out.replaceAll(
      RegExp(r'\b(ref|profile)\s*[\-_][a-z0-9\-_]+\b', caseSensitive: false),
      '',
    );
    out = out.replaceAll(
      RegExp(
        r'\b\d{4}-\d{2}-\d{2}t\d{2}:\d{2}:\d{2}[^\s,;)]*',
        caseSensitive: false,
      ),
      '',
    );
    out = out.replaceAll(
      RegExp(r'\bdata\s*now\b\s*[:\-]?', caseSensitive: false),
      '',
    );
    out = out.replaceAll(
      RegExp(
        r'\b(last\s+available\s+date|updated\s+at|as\s+of)\b\s*[:\-]?\s*[^.\n]*',
        caseSensitive: false,
      ),
      '',
    );

    out = out.replaceAll(RegExp(r'\s{2,}'), ' ').trim();
    return out;
  }

  List<String> _extractActionTags(Map<String, dynamic> data) {
    final out = <String>[];
    final seen = <String>{};
    const alias = <String, String>{
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
    };

    void addTag(dynamic rawTag) {
      var key = (rawTag ?? '').toString().trim().toLowerCase();
      if (key.isEmpty) return;
      key = key.replaceAll('-', '_').replaceAll(' ', '_');
      key = alias[key] ?? key;
      if (seen.add(key)) out.add(key);
    }

    final cards = data['ui_action_cards'];
    if (cards is List) {
      for (final card in cards) {
        addTag(card);
      }
    }

    if (out.isEmpty) {
      addTag(data['ui_redirect_tag']);
    }

    void scanForTags(dynamic node) {
      if (node is Map) {
        for (final entry in node.entries) {
          final key = entry.key.toString().toLowerCase();
          if (key.contains('tag') ||
              key.contains('redirect') ||
              key == 'intent' ||
              key == 'route') {
            addTag(entry.value);
          }
          scanForTags(entry.value);
        }
      } else if (node is List) {
        for (final item in node) {
          scanForTags(item);
        }
      }
    }

    scanForTags(data['tool_evidence']);
    scanForTags(data['agent_metadata']);

    if (out.isEmpty) {
      final combinedText =
          '${data['transcript'] ?? ''} ${data['transcript_display'] ?? ''} ${data['response'] ?? ''}';
      for (final inferred in _inferActionTagsFromText(combinedText)) {
        addTag(inferred);
      }
    }

    return out;
  }

  Map<String, String> _extractActionCardLabels(Map<String, dynamic> data) {
    final out = <String, String>{};
    const alias = <String, String>{
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
    };

    String normalizeTag(String? rawTag) {
      var key = (rawTag ?? '').trim().toLowerCase();
      if (key.isEmpty) return '';
      key = key.replaceAll('-', '_').replaceAll(' ', '_');
      return alias[key] ?? key;
    }

    void collectFrom(dynamic node) {
      if (node is! Map) return;
      for (final entry in node.entries) {
        final tag = normalizeTag(entry.key.toString());
        final label = (entry.value ?? '').toString().trim();
        if (tag.isNotEmpty && label.isNotEmpty) {
          out[tag] = label;
        }
      }
    }

    collectFrom(data['ui_action_card_labels']);
    if (data['agent_metadata'] is Map<String, dynamic>) {
      final meta = data['agent_metadata'] as Map<String, dynamic>;
      collectFrom(meta['ui_action_card_labels']);
    }

    return out;
  }

  List<String> _inferActionTagsFromText(String text) {
    final s = text.toLowerCase();
    final out = <String>[];

    void add(String tag) {
      if (!out.contains(tag)) out.add(tag);
    }

    if (RegExp(
      r'market|mandi|price|rate|buyer|sell|listing|मंडी|बाजार|दाम|भाव|बेच',
    ).hasMatch(s)) {
      add('marketplace');
      add('market_prices');
    }
    if (RegExp(
      r'weather|rain|forecast|temperature|humidity|मौसम|बारिश|वर्षा|तापमान|आर्द्रता',
    ).hasMatch(s)) {
      add('weather');
    }
    if (RegExp(r'soil|moisture|irrigation|मिट्टी|नमी|सिंचाई').hasMatch(s)) {
      add('soil_moisture');
    }
    if (RegExp(
      r'scheme|subsidy|eligibility|pm-kisan|kcc|pmfby|योजना|सब्सिडी|पात्र|दस्तावेज',
    ).hasMatch(s)) {
      add('documents');
    }
    if (RegExp(r'disease|pest|leaf|crop doctor|रोग|कीट').hasMatch(s)) {
      add('crop_doctor');
    }
    if (RegExp(
      r'equipment|tractor|harvester|sprayer|machine|उपकरण|ट्रैक्टर|मशीन',
    ).hasMatch(s)) {
      add('equipment_marketplace');
    }
    if (RegExp(r'rent|rental|hire|किराया|भाड़ा').hasMatch(s)) {
      add('rental');
    }
    if (RegExp(
      r'calendar|schedule|reminder|task|कैलेंडर|अनुसूची|रिमाइंडर|कार्य',
    ).hasMatch(s)) {
      add('calendar');
    }
    if (RegExp(
      r'cow|buffalo|dairy|cattle|goat|poultry|गाय|भैंस|डेयरी|पशु|बकरी|मुर्गी',
    ).hasMatch(s)) {
      add('cattle');
    }
    if (RegExp(r'stress|mental|anxiety|helpline|तनाव|मानसिक').hasMatch(s)) {
      add('mental_health');
    }
    return out;
  }

  List<_VoiceActionCard> _buildVoiceActionCards(
    List<String> tags, {
    Map<String, String> actionCardLabels = const <String, String>{},
  }) {
    const actionsByTag = <String, _VoiceActionCard>{
      'marketplace': _VoiceActionCard(
        label: 'screen.live_voice_screen.marketplace',
        icon: Icons.storefront_outlined,
        route: RoutePaths.marketplace,
      ),
      'market_prices': _VoiceActionCard(
        label: 'screen.live_voice_screen.mandi_prices',
        icon: Icons.attach_money_outlined,
        route: RoutePaths.marketPrices,
      ),
      'calendar': _VoiceActionCard(
        label: 'screen.live_voice_screen.calendar',
        icon: Icons.calendar_month_outlined,
        route: RoutePaths.calendar,
      ),
      'weather': _VoiceActionCard(
        label: 'screen.live_voice_screen.weather',
        icon: Icons.cloud_outlined,
        route: RoutePaths.weather,
      ),
      'soil_moisture': _VoiceActionCard(
        label: 'screen.live_voice_screen.soil_moisture',
        icon: Icons.water_drop_outlined,
        route: RoutePaths.soilMoisture,
      ),
      'cattle': _VoiceActionCard(
        label: 'screen.live_voice_screen.cattle',
        icon: Icons.pets_outlined,
        route: RoutePaths.cattle,
      ),
      'documents': _VoiceActionCard(
        label: 'screen.live_voice_screen.schemes',
        icon: Icons.description_outlined,
        route: RoutePaths.documents,
      ),
      'crop_doctor': _VoiceActionCard(
        label: 'screen.live_voice_screen.crop_doctor',
        icon: Icons.medical_services_outlined,
        route: RoutePaths.cropDoctor,
      ),
      'equipment_marketplace': _VoiceActionCard(
        label: 'screen.live_voice_screen.equipment',
        icon: Icons.agriculture_outlined,
        route: RoutePaths.equipmentMarketplace,
      ),
      'rental': _VoiceActionCard(
        label: 'screen.live_voice_screen.rental_hub',
        icon: Icons.build_outlined,
        route: RoutePaths.rental,
      ),
      'mental_health': _VoiceActionCard(
        label: 'screen.live_voice_screen.mental_health',
        icon: Icons.self_improvement_outlined,
        route: RoutePaths.mentalHealth,
      ),
      'equipment_hub': _VoiceActionCard(
        label: 'screen.live_voice_screen.equipment_hub',
        icon: Icons.handyman_outlined,
        route: RoutePaths.equipmentHub,
      ),
      'upi': _VoiceActionCard(
        label: 'screen.live_voice_screen.finance',
        icon: Icons.account_balance_wallet_outlined,
        route: RoutePaths.upi,
      ),
      'waste': _VoiceActionCard(
        label: 'screen.live_voice_screen.best_out_of_waste',
        icon: Icons.recycling_outlined,
        route: RoutePaths.waste,
      ),
    };

    final out = <_VoiceActionCard>[];
    final seenRoutes = <String>{};
    for (final tag in tags) {
      final action = actionsByTag[tag];
      if (action == null) continue;
      final localized = (actionCardLabels[tag] ?? '').trim();
      final resolved = localized.isEmpty
          ? action
          : _VoiceActionCard(
              label: localized,
              icon: action.icon,
              route: action.route,
            );
      if (seenRoutes.add(action.route)) {
        out.add(resolved);
      }
      if (out.length >= _maxActionCards) break;
    }
    return out;
  }

  bool _isRetryStyleResponse(String text) {
    final s = text.toLowerCase();
    return s.contains('cannot complete your answer right now') ||
        s.contains('please repeat your question') ||
        s.contains('crop location and goal');
  }

  bool _isWeatherIntent(String text) {
    final s = text.toLowerCase();
    return RegExp(
      r'weather|rain|forecast|temperature|humidity|wind|today|right now',
    ).hasMatch(s);
  }

  bool _isSchemeIntent(String text) {
    final s = text.toLowerCase();
    return RegExp(
      r'scheme|schemes|subsidy|pm-kisan|kcc|pmfby|eligibility',
    ).hasMatch(s);
  }

  String _languagePrimary(String languageCode) {
    final raw = languageCode.trim().toLowerCase().replaceAll('_', '-');
    if (raw.isEmpty) return '';
    if (raw.startsWith('auto-')) return raw;
    final parts = raw.split('-');
    return parts.isEmpty ? raw : parts.first;
  }

  String _weatherFallbackResponse(String languageCode) {
    final code = _languagePrimary(languageCode);
    if (code.startsWith('hi')) {
      return 'Abhi direct weather answer lane mein issue aa raha hai. Neeche Weather ya Soil Moisture card par tap karke current update dekh lijiye.';
    }
    if (code.startsWith('kn')) {
      return 'ಈಗ ಲೈವ್ ಹವಾಮಾನ ಉತ್ತರ ತರಲು ಸಮಸ್ಯೆ ಇದೆ. ಕೆಳಗಿನ Weather ಅಥವಾ Soil Moisture ಕಾರ್ಡ್ ತಟ್ಟಿ ತಕ್ಷಣದ ಮಾಹಿತಿ ನೋಡಿ.';
    }
    return 'I could not fetch the live weather answer right now. Tap Weather or Soil Moisture below to get current conditions quickly.';
  }

  String _schemeFallbackResponse(String languageCode) {
    final code = _languagePrimary(languageCode);
    if (code.startsWith('hi')) {
      return 'Scheme details laane mein abhi thoda issue aa raha hai. Neeche Schemes card par tap karke turant yojana aur eligibility dekh lijiye.';
    }
    if (code.startsWith('kn')) {
      return 'ಈಗ ಯೋಜನೆ ವಿವರಗಳನ್ನು ತರಲು ಸಮಸ್ಯೆ ಇದೆ. ಕೆಳಗಿನ Schemes ಕಾರ್ಡ್ ತಟ್ಟಿ ಅರ್ಹತೆ ಮತ್ತು ದಾಖಲೆ ಮಾಹಿತಿಯನ್ನು ತಕ್ಷಣ ನೋಡಿ.';
    }
    return 'I am having trouble fetching scheme details right now. Tap the Schemes card below for eligibility and document guidance.';
  }

  List<_VoiceActionCard> _mergePriorityCards(
    List<_VoiceActionCard> current,
    List<String> tags, {
    Map<String, String> actionCardLabels = const <String, String>{},
  }) {
    final priority = _buildVoiceActionCards(
      tags,
      actionCardLabels: actionCardLabels,
    );
    final out = <_VoiceActionCard>[];
    final seen = <String>{};
    for (final card in <_VoiceActionCard>[...priority, ...current]) {
      if (seen.add(card.route)) {
        out.add(card);
      }
      if (out.length >= _maxActionCards) break;
    }
    return out;
  }

  String _formatClock(int seconds) {
    final mins = (seconds ~/ 60).toString().padLeft(2, '0');
    final secs = (seconds % 60).toString().padLeft(2, '0');
    return '$mins:$secs';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final visibleCards = _actionCards.take(_visibleCardCount).toList();
    final showCards =
        _responseFlowCompleted &&
        _state != _VoiceState.processing &&
        _state != _VoiceState.recording &&
        _response.trim().isNotEmpty &&
        visibleCards.isNotEmpty;

    return Scaffold(
      backgroundColor: isDark
          ? AppColors.darkBackground
          : AppColors.lightBackground,
      body: Container(
        decoration: BoxDecoration(
          gradient: isDark
              ? const LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0xFF05070D),
                    Color(0xFF0B1420),
                    Color(0xFF101A2B),
                  ],
                )
              : LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    AppColors.lightBackground,
                    AppColors.lightBackground.withValues(alpha: 0.96),
                    const Color(0xFFDCF4E8),
                  ],
                ),
        ),
        child: SafeArea(
          child: Stack(
            fit: StackFit.expand,
            children: [
              Positioned(
                left: 0,
                right: 0,
                bottom: 96,
                child: IgnorePointer(
                  child: SizedBox(
                    height: math.min(
                      500,
                      MediaQuery.of(context).size.height * 0.58,
                    ),
                    child: AnimatedBuilder(
                      animation: Listenable.merge([
                        _hazeController,
                        _hazeAmplitudeNotifier,
                      ]),
                      builder: (context, _) {
                        return CustomPaint(
                          painter: VoiceHazeOrb(
                            amplitude: _hazeAmplitudeNotifier.value,
                            pulseValue: _hazeController.value,
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ),
              Column(
                children: [
                  _buildTopBar(isDark: isDark),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      child: Column(
                        children: [
                          _buildCompactConversationStrip(
                            isDark: isDark,
                            compact: showCards,
                          ),
                          const SizedBox(height: 10),
                          Expanded(
                            child: AnimatedSwitcher(
                              duration: const Duration(milliseconds: 300),
                              switchInCurve: Curves.easeOutCubic,
                              switchOutCurve: Curves.easeInCubic,
                              child: showCards
                                  ? _buildActionCenterStage(
                                      visibleCards,
                                      isDark: isDark,
                                      key: const ValueKey('action_stage'),
                                    )
                                  : _buildLiveWaveStage(
                                      isDark: isDark,
                                      key: const ValueKey('wave_stage'),
                                    ),
                            ),
                          ),
                          const SizedBox(height: 10),
                          _buildThinkingPanel(
                            isDark: isDark,
                            compact: showCards,
                          ),
                          const SizedBox(height: 8),
                        ],
                      ),
                    ),
                  ),
                  _buildBottomControlDock(isDark: isDark),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTopBar({required bool isDark}) {
    final textPrimary = isDark ? AppColors.darkText : AppColors.lightText;
    final textMuted = isDark
        ? AppColors.darkTextSecondary
        : AppColors.lightTextSecondary;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      child: Row(
        children: [
          IconButton(
            onPressed: () => context.pop(),
            icon: Icon(Icons.close_rounded, color: textMuted),
          ),
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.multitrack_audio_rounded,
                      size: 16,
                      color: AppColors.primary.withValues(alpha: 0.95),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Live',
                      style: TextStyle(
                        color: textPrimary,
                        fontSize: 21,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                if ((_sessionId ?? '').trim().isNotEmpty)
                  Text(
                    _formatClock(_sessionElapsedSeconds),
                    style: TextStyle(
                      color: textMuted,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
              ],
            ),
          ),
          IconButton(
            onPressed: _openChatContinuation,
            icon: Icon(Icons.chat_bubble_outline_rounded, color: textMuted),
            tooltip: 'Continue in chat',
          ),
        ],
      ),
    );
  }

  Widget _buildCompactConversationStrip({
    required bool isDark,
    required bool compact,
  }) {
    final textPrimary = isDark ? AppColors.darkText : AppColors.lightText;
    final textMuted = isDark
        ? AppColors.darkTextSecondary
        : AppColors.lightTextSecondary;
    final chipBg = isDark
        ? Colors.white.withValues(alpha: 0.06)
        : Colors.white.withValues(alpha: 0.7);
    final chipBorder = isDark
        ? AppColors.darkBorder.withValues(alpha: 0.7)
        : AppColors.lightBorder.withValues(alpha: 0.95);

    final hasQuestion = _activeQuestion.trim().isNotEmpty;
    final hasResponse = _response.trim().isNotEmpty;
    if (!hasQuestion && !hasResponse) {
      return const SizedBox.shrink();
    }

    final responseHeight = compact
        ? (_responseExpanded ? 96.0 : 64.0)
        : (_responseExpanded ? 270.0 : 176.0);

    return Column(
      children: [
        if (hasQuestion)
          Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
            decoration: BoxDecoration(
              color: chipBg,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: chipBorder),
            ),
            child: Text(
              _activeQuestion,
              maxLines: compact ? 1 : 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: textPrimary,
                fontSize: compact ? 12.5 : 13.5,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        if (hasResponse)
          GestureDetector(
            onTap: () {
              setState(() => _responseExpanded = !_responseExpanded);
            },
            onLongPress: _openResponseDetailsSheet,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 240),
              curve: Curves.easeOutCubic,
              width: double.infinity,
              constraints: BoxConstraints(maxHeight: responseHeight),
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
              decoration: BoxDecoration(
                color: chipBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: chipBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        'Response',
                        style: TextStyle(
                          color: textMuted,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const Spacer(),
                      Icon(
                        _responseExpanded
                            ? Icons.keyboard_arrow_up_rounded
                            : Icons.keyboard_arrow_down_rounded,
                        color: textMuted,
                        size: 18,
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Expanded(
                    child: _BottomFlowText(
                      key: ValueKey('flow_$_responseFlowKeySeed'),
                      lines: _responseChunks(_response),
                      revealDuration: _responseRevealDuration,
                      onRevealComplete: _onResponseRevealComplete,
                      textStyle: TextStyle(
                        color: textPrimary,
                        fontSize: compact ? 12.5 : 13.5,
                        height: 1.42,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildActionCenterStage(
    List<_VoiceActionCard> cards, {
    required bool isDark,
    Key? key,
  }) {
    return KeyedSubtree(
      key: key,
      child: LayoutBuilder(
        builder: (context, constraints) {
          const spacing = 12.0;
          final stageHeight = math.max(120.0, constraints.maxHeight * 0.9);

          if (cards.length == 1) {
            final singleHeight = stageHeight.clamp(132.0, 250.0).toDouble();
            return Align(
              alignment: Alignment.topCenter,
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  maxWidth: math.min(520.0, constraints.maxWidth).toDouble(),
                ),
                child: SizedBox(
                  height: singleHeight,
                  child: _buildActionTile(
                    cards.first,
                    isDark: isDark,
                    wide: true,
                  ),
                ),
              ),
            );
          }

          if (cards.length == 2) {
            final dualHeight = stageHeight.clamp(136.0, 220.0).toDouble();
            return Align(
              alignment: Alignment.topCenter,
              child: Row(
                children: [
                  Expanded(
                    child: SizedBox(
                      height: dualHeight,
                      child: _buildActionTile(
                        cards[0],
                        isDark: isDark,
                        wide: true,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: SizedBox(
                      height: dualHeight,
                      child: _buildActionTile(
                        cards[1],
                        isDark: isDark,
                        wide: true,
                      ),
                    ),
                  ),
                ],
              ),
            );
          }

          final crossAxisCount = constraints.maxWidth > 680 ? 3 : 2;
          final usableWidth =
              constraints.maxWidth - ((crossAxisCount - 1) * spacing);
          final tileWidth = usableWidth / crossAxisCount;
          final rowCount = (cards.length / crossAxisCount).ceil();
          final targetGridHeight = stageHeight.clamp(
            220.0,
            constraints.maxHeight,
          );
          final tileHeight =
              ((targetGridHeight - ((rowCount - 1) * spacing)) / rowCount)
                  .clamp(122.0, 230.0)
                  .toDouble();
          final ratio = tileWidth / tileHeight;
          final gridHeight =
              (rowCount * tileHeight) + ((rowCount - 1) * spacing);

          return Align(
            alignment: Alignment.topCenter,
            child: SizedBox(
              height: gridHeight,
              child: GridView.builder(
                padding: EdgeInsets.zero,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: cards.length,
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: crossAxisCount,
                  mainAxisSpacing: spacing,
                  crossAxisSpacing: spacing,
                  childAspectRatio: ratio,
                ),
                itemBuilder: (_, i) {
                  return _buildActionTile(cards[i], isDark: isDark, wide: true);
                },
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildActionTile(
    _VoiceActionCard card, {
    required bool isDark,
    required bool wide,
  }) {
    final textPrimary = isDark ? AppColors.darkText : AppColors.lightText;
    final textMuted = isDark
        ? AppColors.darkTextSecondary
        : AppColors.lightTextSecondary;
    final cardBg = isDark ? const Color(0xFF101827) : const Color(0xFFF1F8F4);
    final cardBorder = isDark
        ? const Color(0xFF243244)
        : AppColors.primary.withValues(alpha: 0.26);
    final topic = _topicColor(card.route);

    return TweenAnimationBuilder<double>(
      key: ValueKey('voice-card-${card.route}'),
      tween: Tween<double>(begin: 0, end: 1),
      duration: _cardPopDuration,
      curve: Curves.easeOutBack,
      builder: (context, value, child) {
        final opacity = value.clamp(0.0, 1.0).toDouble();
        return Opacity(
          opacity: opacity,
          child: Transform.scale(scale: 0.84 + (value * 0.16), child: child),
        );
      },
      child: Material(
        color: cardBg,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () {
            Haptics.selection();
            context.push(card.route);
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: cardBorder),
            ),
            child: Row(
              children: [
                Container(
                  width: wide ? 44 : 36,
                  height: wide ? 44 : 36,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [
                        topic.withValues(alpha: 0.95),
                        topic.withValues(alpha: 0.36),
                      ],
                    ),
                  ),
                  child: Icon(
                    card.icon,
                    size: wide ? 20 : 18,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        card.label.tr(),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: textPrimary,
                          fontWeight: FontWeight.w700,
                          fontSize: wide ? 18 : 13.5,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        _topicDescription(card.route),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: textMuted,
                          fontWeight: FontWeight.w500,
                          fontSize: wide ? 13.2 : 11,
                        ),
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

  Widget _buildLiveWaveStage({required bool isDark, Key? key}) {
    final textPrimary = isDark ? AppColors.darkText : AppColors.lightText;
    final textMuted = isDark
        ? AppColors.darkTextSecondary
        : AppColors.lightTextSecondary;

    return RepaintBoundary(
      key: key,
      child: Align(
        alignment: const Alignment(0, -0.22),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _statusLabel,
              style: TextStyle(
                color: textPrimary,
                fontWeight: FontWeight.w600,
                fontSize: 18,
              ),
            ),
            const SizedBox(height: 5),
            Text(
              'Tap response to expand. Long press for full view.',
              style: TextStyle(
                color: textMuted,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildThinkingPanel({required bool isDark, required bool compact}) {
    if (_thinkingSteps.isEmpty) {
      final muted = isDark
          ? AppColors.darkTextSecondary
          : AppColors.lightTextSecondary;
      return SizedBox(
        height: 24,
        child: Align(
          alignment: Alignment.centerLeft,
          child: Text(
            _statusLabel,
            style: TextStyle(color: muted, fontSize: 12.5),
          ),
        ),
      );
    }

    final textPrimary = isDark ? AppColors.darkText : AppColors.lightText;
    final textMuted = isDark
        ? AppColors.darkTextSecondary
        : AppColors.lightTextSecondary;
    final panelBg = isDark
        ? Colors.white.withValues(alpha: 0.06)
        : Colors.white.withValues(alpha: 0.68);
    final panelBorder = isDark
        ? AppColors.darkBorder.withValues(alpha: 0.7)
        : AppColors.lightBorder.withValues(alpha: 0.95);

    final collapsedHeight = compact ? 92.0 : 130.0;
    final expandedHeight = compact ? 170.0 : 230.0;
    final boxHeight = _thinkingExpanded ? expandedHeight : collapsedHeight;

    return GestureDetector(
      onTap: () {
        setState(() => _thinkingExpanded = !_thinkingExpanded);
        _scheduleThinkingAutoScroll();
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 240),
        curve: Curves.easeOutCubic,
        height: boxHeight,
        width: double.infinity,
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
        decoration: BoxDecoration(
          color: panelBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: panelBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.auto_awesome_rounded,
                  size: 16,
                  color: AppColors.primary,
                ),
                const SizedBox(width: 6),
                Text(
                  'Thinking',
                  style: TextStyle(
                    color: textPrimary,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const Spacer(),
                Text(
                  '${_thinkingElapsedSeconds}s',
                  style: TextStyle(
                    color: textMuted,
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(width: 2),
                Icon(
                  _thinkingExpanded
                      ? Icons.keyboard_arrow_up_rounded
                      : Icons.keyboard_arrow_down_rounded,
                  color: textMuted,
                  size: 18,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Expanded(
              child: SingleChildScrollView(
                controller: _thinkingScrollController,
                physics: const BouncingScrollPhysics(),
                child: Column(
                  children: [
                    for (var i = 0; i < _thinkingSteps.length; i++)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 3),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              margin: const EdgeInsets.only(top: 6),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(
                                  alpha: i == _thinkingSteps.length - 1
                                      ? 1
                                      : 0.55,
                                ),
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _thinkingSteps[i],
                                style: TextStyle(
                                  color: textMuted,
                                  fontSize: compact ? 12 : 12.8,
                                  fontWeight: i == _thinkingSteps.length - 1
                                      ? FontWeight.w600
                                      : FontWeight.w400,
                                  height: 1.34,
                                ),
                              ),
                            ),
                          ],
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

  Widget _buildBottomControlDock({required bool isDark}) {
    final dockBg = isDark
        ? const Color(0xCC0B111B)
        : Colors.white.withValues(alpha: 0.92);
    final border = isDark
        ? AppColors.darkBorder.withValues(alpha: 0.85)
        : AppColors.lightBorder.withValues(alpha: 0.95);

    final micColor = _state == _VoiceState.recording
        ? AppColors.danger
        : _state == _VoiceState.processing
        ? AppColors.info
        : AppColors.primary;

    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 6, 14, 16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
        decoration: BoxDecoration(
          color: dockBg,
          borderRadius: BorderRadius.circular(26),
          border: Border.all(color: border),
        ),
        child: Row(
          children: [
            _dockButton(
              icon: Icons.chat_bubble_outline_rounded,
              label: 'Chat',
              onTap: _openChatContinuation,
            ),
            const SizedBox(width: 8),
            _dockButton(
              icon: _state == _VoiceState.playing
                  ? (_isPlaybackPaused
                        ? Icons.play_arrow_rounded
                        : Icons.pause_rounded)
                  : Icons.replay_rounded,
              label: _state == _VoiceState.playing ? 'Pause' : 'Replay',
              onTap: _state == _VoiceState.playing
                  ? _togglePauseResume
                  : (_response.trim().isEmpty ? null : _replayLastResponse),
            ),
            const Spacer(),
            GestureDetector(
              onTap: _onMicTap,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 220),
                curve: Curves.easeOutCubic,
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isDark
                      ? const Color(0xFF132033)
                      : Colors.white.withValues(alpha: 0.98),
                  border: Border.all(
                    color: micColor.withValues(alpha: 0.95),
                    width: 1.3,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: micColor.withValues(alpha: 0.24),
                      blurRadius: 20,
                      spreadRadius: 1,
                    ),
                  ],
                ),
                child: Icon(
                  _state == _VoiceState.recording ||
                          _state == _VoiceState.processing ||
                          _state == _VoiceState.playing
                      ? Icons.stop_rounded
                      : Icons.mic_rounded,
                  color: micColor,
                  size: 32,
                ),
              ),
            ),
            const Spacer(),
            _dockButton(
              icon: Icons.close_rounded,
              label: 'Close',
              danger: true,
              onTap: () => context.pop(),
            ),
            const SizedBox(width: 8),
            _dockButton(
              icon: Icons.expand_less_rounded,
              label: 'Full',
              onTap: _openResponseDetailsSheet,
            ),
          ],
        ),
      ),
    );
  }

  Widget _dockButton({
    required IconData icon,
    required String label,
    required VoidCallback? onTap,
    bool danger = false,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final fg = danger
        ? Colors.white
        : (isDark ? AppColors.darkText : AppColors.lightText);
    final bg = danger
        ? const Color(0xFFDC2626)
        : (isDark
              ? Colors.white.withValues(alpha: 0.08)
              : Colors.black.withValues(alpha: 0.04));

    return Opacity(
      opacity: onTap == null ? 0.42 : 1,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Container(
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(18),
          ),
          child: Tooltip(
            message: label,
            child: Icon(icon, color: fg, size: 24),
          ),
        ),
      ),
    );
  }

  Color _topicColor(String route) {
    if (route == RoutePaths.weather || route == RoutePaths.soilMoisture) {
      return const Color(0xFF06B6D4);
    }
    if (route == RoutePaths.marketplace || route == RoutePaths.marketPrices) {
      return const Color(0xFF3B82F6);
    }
    if (route == RoutePaths.documents) {
      return AppColors.primary;
    }
    if (route == RoutePaths.equipmentMarketplace ||
        route == RoutePaths.equipmentHub) {
      return const Color(0xFF84CC16);
    }
    if (route == RoutePaths.cattle) {
      return const Color(0xFFEF4444);
    }
    return const Color(0xFF10B981);
  }

  String _topicDescription(String route) {
    if (route == RoutePaths.weather) return 'Forecast and rain risks';
    if (route == RoutePaths.soilMoisture) return 'Field moisture insights';
    if (route == RoutePaths.marketplace) return 'Buy and sell quickly';
    if (route == RoutePaths.marketPrices) return 'Latest mandi signals';
    if (route == RoutePaths.documents) return 'Scheme help and docs';
    if (route == RoutePaths.cropDoctor) return 'Disease and pest guidance';
    if (route == RoutePaths.equipmentMarketplace) return 'Tools and machinery';
    if (route == RoutePaths.rental) return 'Nearby rental options';
    if (route == RoutePaths.calendar) return 'Tasks and reminders';
    if (route == RoutePaths.cattle) return 'Dairy and livestock support';
    if (route == RoutePaths.mentalHealth) return 'Stress support resources';
    return 'Open related assistant tools';
  }

  String get _statusLabel {
    switch (_state) {
      case _VoiceState.idle:
        return 'Tap mic to speak';
      case _VoiceState.recording:
        return 'Listening...';
      case _VoiceState.processing:
        return 'Thinking...';
      case _VoiceState.playing:
        return _isPlaybackPaused ? 'Playback paused' : 'Speaking...';
    }
  }
}

class VoiceHazeOrb extends CustomPainter {
  final double amplitude;
  final double pulseValue;

  const VoiceHazeOrb({required this.amplitude, required this.pulseValue});

  @override
  void paint(Canvas canvas, Size size) {
    final amp = amplitude.clamp(0.0, 1.0).toDouble();
    final ampBoost = math.pow(amp, 0.6).toDouble();
    final pulse = pulseValue.clamp(0.0, 1.0).toDouble();
    final t = pulse * math.pi * 2;

    final ambientRect = Rect.fromLTWH(
      -size.width * 0.08,
      size.height * 0.56,
      size.width * 1.16,
      size.height * 0.48,
    );
    final ambient = Paint()
      ..shader = RadialGradient(
        center: const Alignment(0, 1.08),
        radius: 1.12,
        colors: [
          const Color(0xFF34D399).withValues(alpha: 0.13 + (0.24 * ampBoost)),
          const Color(0xFF22C58B).withValues(alpha: 0.05 + (0.11 * ampBoost)),
          Colors.transparent,
        ],
        stops: const [0.0, 0.58, 1.0],
      ).createShader(ambientRect);
    canvas.drawRect(ambientRect, ambient);

    void drawWaveLayer({
      required double baseLevel,
      required double ampFactor,
      required double freq,
      required double speed,
      required double phaseShift,
      required Color color,
      required double alphaMultiplier,
    }) {
      final waveAmp = (3.5 + (40.0 * ampBoost)) * ampFactor;
      final breathingLift =
          math.sin((t * 0.55) + phaseShift) * (1.8 + (ampBoost * 13.0));
      final baseY = (size.height * baseLevel) - breathingLift;
      final step = math.max(6.0, size.width / 84);
      final effectiveSpeed = speed * (1.0 + (ampBoost * 0.42));

      double waveY(double x) {
        final nx = x / size.width;
        final a =
            math.sin(
              (nx * freq * math.pi * 2) + (t * effectiveSpeed) + phaseShift,
            ) *
            waveAmp;
        final b =
            math.sin(
              (nx * (freq * 1.85) * math.pi * 2) -
                  (t * effectiveSpeed * 0.62) +
                  (phaseShift * 0.45),
            ) *
            (waveAmp * 0.34);
        return baseY + a + b;
      }

      final fillPath = Path()..moveTo(0, size.height);
      final firstY = waveY(0);
      fillPath.lineTo(0, firstY);
      for (double x = step; x <= size.width + step; x += step) {
        final clampedX = x > size.width ? size.width : x;
        fillPath.lineTo(clampedX, waveY(clampedX));
      }
      fillPath
        ..lineTo(size.width, size.height)
        ..close();

      final shaderTop = baseY - (waveAmp * 2.2);
      final fill = Paint()
        ..shader =
            LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                color.withValues(
                  alpha: (0.16 + (0.38 * ampBoost)) * alphaMultiplier,
                ),
                color.withValues(
                  alpha: (0.07 + (0.2 * ampBoost)) * alphaMultiplier,
                ),
                color.withValues(alpha: 0.0),
              ],
              stops: const [0.0, 0.52, 1.0],
            ).createShader(
              Rect.fromLTWH(0, shaderTop, size.width, size.height - shaderTop),
            );
      canvas.drawPath(fillPath, fill);

      final crestPath = Path()..moveTo(0, firstY);
      for (double x = step; x <= size.width + step; x += step) {
        final clampedX = x > size.width ? size.width : x;
        crestPath.lineTo(clampedX, waveY(clampedX));
      }
      final crest = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.0 + (ampBoost * 1.6)
        ..color = const Color(
          0xFFA7F3D0,
        ).withValues(alpha: (0.09 + (0.26 * ampBoost)) * alphaMultiplier)
        ..strokeCap = StrokeCap.round
        ..isAntiAlias = true;
      canvas.drawPath(crestPath, crest);
    }

    drawWaveLayer(
      baseLevel: 0.82,
      ampFactor: 1.15,
      freq: 1.15,
      speed: 1.0,
      phaseShift: 0.4,
      color: const Color(0xFF0F9B6A),
      alphaMultiplier: 0.95,
    );

    drawWaveLayer(
      baseLevel: 0.78,
      ampFactor: 0.9,
      freq: 1.55,
      speed: 1.22,
      phaseShift: 1.25,
      color: const Color(0xFF12B77B),
      alphaMultiplier: 0.82,
    );

    drawWaveLayer(
      baseLevel: 0.74,
      ampFactor: 0.7,
      freq: 1.95,
      speed: 1.4,
      phaseShift: 2.05,
      color: const Color(0xFF34D399),
      alphaMultiplier: 0.72,
    );
  }

  @override
  bool shouldRepaint(covariant VoiceHazeOrb oldDelegate) {
    return oldDelegate.amplitude != amplitude ||
        oldDelegate.pulseValue != pulseValue;
  }
}

class _BottomFlowText extends StatefulWidget {
  final List<String> lines;
  final Duration revealDuration;
  final TextStyle? textStyle;
  final VoidCallback? onRevealComplete;

  const _BottomFlowText({
    super.key,
    required this.lines,
    required this.revealDuration,
    this.textStyle,
    this.onRevealComplete,
  });

  @override
  State<_BottomFlowText> createState() => _BottomFlowTextState();
}

class _BottomFlowTextState extends State<_BottomFlowText> {
  Timer? _timer;
  late final ScrollController _scrollController;
  List<String> _words = const <String>[];
  int _visibleWords = 0;
  bool _didNotifyComplete = false;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    _restartTicker();
  }

  @override
  void didUpdateWidget(covariant _BottomFlowText oldWidget) {
    super.didUpdateWidget(oldWidget);
    final sameLines = oldWidget.lines.join('\n') == widget.lines.join('\n');
    if (!sameLines || oldWidget.revealDuration != widget.revealDuration) {
      _restartTicker();
    }
  }

  void _restartTicker() {
    _timer?.cancel();
    _didNotifyComplete = false;
    final merged = widget.lines
        .join(' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
    _words = merged.isEmpty ? const <String>[] : merged.split(' ');
    _visibleWords = _words.isEmpty ? 0 : 1;

    if (_words.isEmpty) {
      setState(() {});
      return;
    }

    if (_words.length == 1) {
      setState(() {});
      _notifyRevealCompleteOnce();
      return;
    }

    final totalMs = widget.revealDuration.inMilliseconds <= 0
        ? (_words.length * 170)
        : widget.revealDuration.inMilliseconds;
    var intervalMs = (totalMs / (_words.length - 1)).round();
    if (intervalMs < 36) intervalMs = 36;
    if (intervalMs > 900) intervalMs = 900;

    _timer = Timer.periodic(Duration(milliseconds: intervalMs), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_visibleWords >= _words.length) {
        timer.cancel();
        _notifyRevealCompleteOnce();
        return;
      }
      setState(() => _visibleWords += 1);
      if (_visibleWords >= _words.length) {
        timer.cancel();
        _notifyRevealCompleteOnce();
      }
      _scrollToBottom();
    });
    setState(() {});
    _scrollToBottom();
  }

  void _notifyRevealCompleteOnce() {
    if (_didNotifyComplete) return;
    _didNotifyComplete = true;
    widget.onRevealComplete?.call();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOutCubic,
      );
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final safeCount = _visibleWords.clamp(0, _words.length).toInt();
    final text = safeCount == 0 ? '' : _words.take(safeCount).join(' ');

    return SingleChildScrollView(
      controller: _scrollController,
      physics: const NeverScrollableScrollPhysics(),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        curve: Curves.easeOutCubic,
        child: Text(text, textAlign: TextAlign.left, style: widget.textStyle),
      ),
    );
  }
}
