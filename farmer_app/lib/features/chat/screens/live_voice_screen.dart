import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

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
import '../../../core/utils/app_cache.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/services/agent_service.dart';

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
  static const _orbProcessing = Color(0xFF00D4FF);
  static const _orbPlaying = Color(0xFF00E676);
  static const _cardBg = Color(0xFF13131A);
  static const _cardBorder = Color(0xFF252535);

  static const int _maxActionCards = 8;
  static const Duration _cardsStaggerStep = Duration(milliseconds: 420);
  static const Duration _cardPopDuration = Duration(milliseconds: 480);

  _VoiceState _state = _VoiceState.idle;
  String _response = '';
  String _activeQuestion = '';
  String? _fadingQuestion;
  String? _sessionId;
  String? _lastAudioBase64;
  bool _isPlaybackPaused = false;

  final List<String> _thinkingSteps = <String>[];
  int _thinkingElapsedSeconds = 0;
  Timer? _thinkingTimer;

  Timer? _sessionTimer;
  int _sessionElapsedSeconds = 0;

  Timer? _cardsStaggerTimer;
  List<_VoiceActionCard> _actionCards = <_VoiceActionCard>[];
  int _visibleCardCount = 0;

  double _liveVoiceLevel = 0;
  StreamSubscription<Amplitude>? _amplitudeSub;

  late final AnimationController _pulseController;
  late final AnimationController _waveController;
  late final AnimationController _playController;
  late final AnimationController _questionFadeController;

  final AudioRecorder _recorder = AudioRecorder();
  final AudioPlayer _audioPlayer = AudioPlayer();
  String? _recordingPath;

  int _responseFlowKeySeed = 0;
  String _responseFlowSource = '';

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _waveController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    );
    _playController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _questionFadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
      value: 1,
    );

    _audioPlayer.onPlayerComplete.listen((_) {
      if (!mounted) return;
      _stopWaveIfNeeded();
      _stopPlayPulseIfNeeded();
      setState(() {
        _state = _VoiceState.idle;
        _isPlaybackPaused = false;
      });
      _startCardsStagger();
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

    _pulseController.dispose();
    _waveController.dispose();
    _playController.dispose();
    _questionFadeController.dispose();

    _recorder.dispose();
    _audioPlayer.dispose();
    super.dispose();
  }

  Future<void> _onMicTap() async {
    Haptics.medium();
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
        .onAmplitudeChanged(const Duration(milliseconds: 70))
        .listen((amp) {
          if (!mounted || _state != _VoiceState.recording) return;
          final db = amp.current;
          double normalized;
          if (!db.isFinite) {
            normalized = 0;
          } else if (db <= 0) {
            normalized = ((db + 60) / 60).clamp(0.0, 1.0);
          } else {
            normalized = (db / 160).clamp(0.0, 1.0);
          }
          final nextLevel = math.pow(normalized, 1.25).toDouble();
          if ((_liveVoiceLevel - nextLevel).abs() < 0.02) return;
          setState(() => _liveVoiceLevel = nextLevel);
        });

    _stopThinkingTicker();
    _cardsStaggerTimer?.cancel();
    _stopPlayPulseIfNeeded();

    if (!_waveController.isAnimating) {
      _waveController.repeat();
    }

    setState(() {
      _state = _VoiceState.recording;
      _isPlaybackPaused = false;
      _response = '';
      _activeQuestion = '';
      _fadingQuestion = null;
      _thinkingSteps.clear();
      _thinkingElapsedSeconds = 0;
      _actionCards = <_VoiceActionCard>[];
      _visibleCardCount = 0;
      _liveVoiceLevel = 0;
    });

    Haptics.light();
  }

  Future<void> _stopAndProcess() async {
    Haptics.heavy();
    final isHindi = context.locale.languageCode.toLowerCase().startsWith('hi');
    _amplitudeSub?.cancel();
    _amplitudeSub = null;

    setState(() {
      _state = _VoiceState.processing;
      _isPlaybackPaused = false;
      _lastAudioBase64 = null;
      _response = '';
      _thinkingSteps
        ..clear()
        ..addAll(
          isHindi
              ? <String>[
                  'Awaaz process kar raha hoon',
                  'Speech ko text mein badal raha hoon',
                ]
              : <String>['Processing your voice', 'Transcribing your speech'],
        );
      _thinkingElapsedSeconds = 0;
      _visibleCardCount = 0;
      _liveVoiceLevel = 0;
    });

    _cardsStaggerTimer?.cancel();
    _startThinkingTicker();
    if (!_waveController.isAnimating) {
      _waveController.repeat();
    }

    final path = await _recorder.stop();
    if (path == null || path.isEmpty) {
      _stopThinkingTicker();
      if (!mounted) return;
      setState(() {
        _state = _VoiceState.idle;
        _liveVoiceLevel = 0;
      });
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
    });
  }

  void _stopThinkingTicker() {
    _thinkingTimer?.cancel();
    _thinkingTimer = null;
  }

  String _thinkingFallbackForElapsed(int elapsed) {
    final isHindi = context.locale.languageCode.toLowerCase().startsWith('hi');
    if (_thinkingSteps.length >= 5) return '';
    if (elapsed >= 6) {
      return isHindi
          ? 'Final answer tayar kar raha hoon'
          : 'Preparing the final answer';
    }
    if (elapsed >= 4) {
      return isHindi
          ? 'Relevant context check kar raha hoon'
          : 'Checking relevant context';
    }
    if (elapsed >= 2) {
      return isHindi
          ? 'Sawal ka intent samajh raha hoon'
          : 'Understanding your intent';
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
    if (_thinkingSteps.length > 16) {
      _thinkingSteps.removeRange(0, _thinkingSteps.length - 16);
    }
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
    if (!mounted || _actionCards.isEmpty || _state != _VoiceState.idle) {
      if (mounted) {
        setState(() => _visibleCardCount = 0);
      }
      return;
    }

    setState(() => _visibleCardCount = 0);
    _cardsStaggerTimer = Timer.periodic(_cardsStaggerStep, (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_state != _VoiceState.idle) {
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
    final hintedQuestion = (sourcePrompt ?? '').trim();
    final voice = ref.read(voiceServiceProvider);
    var handledResult = false;

    Future<void> fallbackToNonStreaming() async {
      final data = await voice.voiceCommandText(
        path,
        language: languageCode,
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
        language: languageCode,
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
          final sttDoneStep = languageCode.toLowerCase().startsWith('hi')
              ? 'Transcription complete, query samajh liya'
              : 'Transcription complete, understood your query';
          if (display.isNotEmpty) {
            final previousQuestion = _activeQuestion;
            setState(() {
              _activeQuestion = display;
              _appendThinkingStepInState(sttDoneStep);
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
              _appendThinkingStepInState(sttDoneStep);
            });
          }
          continue;
        }

        if (type == 'thinking') {
          final step = (event['step'] ?? '').toString().trim();
          if (step.isNotEmpty) {
            setState(() => _appendThinkingStepInState(step));
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
        _stopWaveIfNeeded();
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
    final baseResponse = _cleanDisplayText(data['response'] as String? ?? '');
    final audioBase64 = data['audio_base64'] as String? ?? '';

    final actionTags = _extractActionTags(data);
    var cards = _buildVoiceActionCards(actionTags);

    final retryStyleResponse = _isRetryStyleResponse(baseResponse);
    final weatherIntent = _isWeatherIntent(
      '$transcript $transcriptDisplay $hintedQuestion',
    );
    final schemeIntent = _isSchemeIntent(
      '$transcript $transcriptDisplay $hintedQuestion',
    );

    var effectiveResponse = baseResponse;
    if (retryStyleResponse && weatherIntent) {
      effectiveResponse = _weatherFallbackResponse(languageCode);
      cards = _mergePriorityCards(cards, const <String>[
        'weather',
        'soil_moisture',
      ]);
    } else if (retryStyleResponse && schemeIntent) {
      effectiveResponse = _schemeFallbackResponse(languageCode);
      cards = _mergePriorityCards(cards, const <String>['documents']);
    }

    final attachCardsCue = cards.isNotEmpty && !retryStyleResponse;
    final responseForDisplay = _withCardsCue(
      effectiveResponse,
      languageCode: languageCode,
      hasCards: attachCardsCue,
      forDisplay: true,
    );
    final responseForSpeech = _withCardsCue(
      effectiveResponse,
      languageCode: languageCode,
      hasCards: attachCardsCue,
      forDisplay: false,
    );

    final nextSession = data['session_id'] as String?;
    _syncSession(nextSession ?? _sessionId);

    final visibleQuestion = transcriptDisplay.isNotEmpty
        ? transcriptDisplay
        : (transcript.isNotEmpty ? transcript : hintedQuestion);
    final previousQuestion = _activeQuestion;

    setState(() {
      _response = '';
      _activeQuestion = visibleQuestion;
      _actionCards = cards;
      _visibleCardCount = 0;

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

    if (_responseFlowSource != responseForDisplay) {
      _responseFlowSource = responseForDisplay;
      _responseFlowKeySeed += 1;
    }

    setState(() {
      _response = responseForDisplay;
    });
    Haptics.selection();

    String audioToPlay = audioBase64;
    if (attachCardsCue && responseForSpeech.trim().isNotEmpty) {
      try {
        final voice = ref.read(voiceServiceProvider);
        final regenerated = await voice.ttsBase64(
          text: responseForSpeech,
          language: languageCode,
        );
        final regeneratedAudio = (regenerated['audio_base64'] as String? ?? '')
            .trim();
        if (regeneratedAudio.isNotEmpty) {
          audioToPlay = regeneratedAudio;
        }
      } catch (_) {
        // Keep primary server audio.
      }
    }

    _stopThinkingTicker();

    if (audioToPlay.isNotEmpty) {
      _lastAudioBase64 = audioToPlay;
      final played = await _playAudioBase64(audioToPlay);
      if (!played && mounted) {
        _stopWaveIfNeeded();
        setState(() => _state = _VoiceState.idle);
        _startCardsStagger();
      }
    } else {
      _lastAudioBase64 = null;
      _stopWaveIfNeeded();
      setState(() => _state = _VoiceState.idle);
      _startCardsStagger();
    }
  }

  void _clearQuestionStatusListener(AnimationStatus status) {
    if (status != AnimationStatus.completed) return;
    _questionFadeController.removeStatusListener(_clearQuestionStatusListener);
    if (!mounted) return;
    setState(() => _fadingQuestion = null);
  }

  Future<bool> _playAudioBase64(String base64Audio) async {
    if (base64Audio.isEmpty) return false;

    try {
      if (!mounted) return false;
      setState(() {
        _state = _VoiceState.playing;
        _isPlaybackPaused = false;
      });

      if (!_playController.isAnimating) {
        _playController.repeat(reverse: true);
      }
      if (!_waveController.isAnimating) {
        _waveController.repeat();
      }

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
      _stopWaveIfNeeded();
      _stopPlayPulseIfNeeded();
      setState(() {
        _state = _VoiceState.idle;
        _isPlaybackPaused = false;
      });
      return false;
    }
  }

  void _stopWaveIfNeeded() {
    if (_waveController.isAnimating) {
      _waveController.stop();
    }
  }

  void _stopPlayPulseIfNeeded() {
    if (_playController.isAnimating) {
      _playController.stop();
      _playController.value = 0;
    }
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

  void _openChatDirect() {
    context.push('${RoutePaths.chat}?agent=general');
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
      if (s.length <= 64) {
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
        if (candidate.length > 64) {
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

  List<String> _inferActionTagsFromText(String text) {
    final s = text.toLowerCase();
    final out = <String>[];

    void add(String tag) {
      if (!out.contains(tag)) out.add(tag);
    }

    if (RegExp(r'market|mandi|price|rate|buyer|sell|listing').hasMatch(s)) {
      add('marketplace');
      add('market_prices');
    }
    if (RegExp(r'weather|rain|forecast|temperature|humidity').hasMatch(s)) {
      add('weather');
    }
    if (RegExp(r'soil|moisture|irrigation').hasMatch(s)) {
      add('soil_moisture');
    }
    if (RegExp(r'scheme|subsidy|eligibility|pm-kisan|kcc|pmfby').hasMatch(s)) {
      add('documents');
    }
    if (RegExp(r'disease|pest|leaf|crop doctor').hasMatch(s)) {
      add('crop_doctor');
    }
    if (RegExp(r'equipment|tractor|harvester|sprayer|machine').hasMatch(s)) {
      add('equipment_marketplace');
    }
    if (RegExp(r'rent|rental|hire').hasMatch(s)) {
      add('rental');
    }
    if (RegExp(r'calendar|schedule|reminder|task').hasMatch(s)) {
      add('calendar');
    }
    if (RegExp(r'cow|buffalo|dairy|cattle|goat|poultry').hasMatch(s)) {
      add('cattle');
    }
    if (RegExp(r'stress|mental|anxiety|helpline').hasMatch(s)) {
      add('mental_health');
    }
    return out;
  }

  List<_VoiceActionCard> _buildVoiceActionCards(List<String> tags) {
    const actionsByTag = <String, _VoiceActionCard>{
      'marketplace': _VoiceActionCard(
        label: 'Marketplace',
        icon: Icons.storefront_outlined,
        route: RoutePaths.marketplace,
      ),
      'market_prices': _VoiceActionCard(
        label: 'Mandi Prices',
        icon: Icons.attach_money_outlined,
        route: RoutePaths.marketPrices,
      ),
      'calendar': _VoiceActionCard(
        label: 'Calendar',
        icon: Icons.calendar_month_outlined,
        route: RoutePaths.calendar,
      ),
      'weather': _VoiceActionCard(
        label: 'Weather',
        icon: Icons.cloud_outlined,
        route: RoutePaths.weather,
      ),
      'soil_moisture': _VoiceActionCard(
        label: 'Soil Moisture',
        icon: Icons.water_drop_outlined,
        route: RoutePaths.soilMoisture,
      ),
      'cattle': _VoiceActionCard(
        label: 'Cattle',
        icon: Icons.pets_outlined,
        route: RoutePaths.cattle,
      ),
      'documents': _VoiceActionCard(
        label: 'Schemes',
        icon: Icons.description_outlined,
        route: RoutePaths.documents,
      ),
      'crop_doctor': _VoiceActionCard(
        label: 'Crop Doctor',
        icon: Icons.medical_services_outlined,
        route: RoutePaths.cropDoctor,
      ),
      'equipment_marketplace': _VoiceActionCard(
        label: 'Equipment',
        icon: Icons.agriculture_outlined,
        route: RoutePaths.equipmentMarketplace,
      ),
      'rental': _VoiceActionCard(
        label: 'Rental Hub',
        icon: Icons.build_outlined,
        route: RoutePaths.rental,
      ),
      'mental_health': _VoiceActionCard(
        label: 'Mental Health',
        icon: Icons.self_improvement_outlined,
        route: RoutePaths.mentalHealth,
      ),
      'equipment_hub': _VoiceActionCard(
        label: 'Equipment Hub',
        icon: Icons.handyman_outlined,
        route: RoutePaths.equipmentHub,
      ),
      'upi': _VoiceActionCard(
        label: 'Finance',
        icon: Icons.account_balance_wallet_outlined,
        route: RoutePaths.upi,
      ),
      'waste': _VoiceActionCard(
        label: 'Best Out Of Waste',
        icon: Icons.recycling_outlined,
        route: RoutePaths.waste,
      ),
    };

    final out = <_VoiceActionCard>[];
    final seenRoutes = <String>{};
    for (final tag in tags) {
      final action = actionsByTag[tag];
      if (action == null) continue;
      if (seenRoutes.add(action.route)) {
        out.add(action);
      }
      if (out.length >= _maxActionCards) break;
    }
    return out;
  }

  String _cardsCueForLanguage(String languageCode) {
    final code = languageCode.toLowerCase();
    if (code.startsWith('hi')) {
      return 'Aap neeche diye gaye cards par tap karke turant action le sakte hain.';
    }
    return 'You can click on these cards to take action quickly.';
  }

  String _withCardsCue(
    String text, {
    required String languageCode,
    required bool hasCards,
    required bool forDisplay,
  }) {
    final clean = text.trim();
    if (clean.isEmpty || !hasCards) return clean;

    final hasCueAlready = RegExp(
      r'click|tap|card',
      caseSensitive: false,
    ).hasMatch(clean);
    if (hasCueAlready) return clean;

    final cue = _cardsCueForLanguage(languageCode);
    return forDisplay ? '$clean\n\n$cue' : '$clean. $cue';
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

  String _weatherFallbackResponse(String languageCode) {
    final code = languageCode.toLowerCase();
    if (code.startsWith('hi')) {
      return 'Abhi direct weather answer lane mein issue aa raha hai. Neeche Weather ya Soil Moisture card par tap karke current update dekh lijiye.';
    }
    return 'I could not fetch the live weather answer right now. Tap Weather or Soil Moisture below to get current conditions quickly.';
  }

  String _schemeFallbackResponse(String languageCode) {
    final code = languageCode.toLowerCase();
    if (code.startsWith('hi')) {
      return 'Scheme details laane mein abhi thoda issue aa raha hai. Neeche Schemes card par tap karke turant yojana aur eligibility dekh lijiye.';
    }
    return 'I am having trouble fetching scheme details right now. Tap the Schemes card below for eligibility and document guidance.';
  }

  List<_VoiceActionCard> _mergePriorityCards(
    List<_VoiceActionCard> current,
    List<String> tags,
  ) {
    final priority = _buildVoiceActionCards(tags);
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
    final visibleCards = _actionCards.take(_visibleCardCount).toList();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgTop = isDark ? AppColors.darkBackground : AppColors.lightBackground;
    final bgBottom = isDark ? AppColors.darkSurface : AppColors.lightSurface;

    return Scaffold(
      backgroundColor: bgTop,
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [bgTop, bgBottom],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Column(
              children: [
                _buildTopBar(),
                Expanded(
                  child: Column(
                    children: [
                      const Spacer(flex: 1),
                      _buildTranscriptChip(),
                      const Spacer(flex: 1),
                      _buildMicVisualizerSection(),
                      const Spacer(flex: 1),
                      _buildResponseArea(),
                      const Spacer(flex: 1),
                      _buildActionDeck(visibleCards),
                    ],
                  ),
                ),
                _buildBottomBar(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTopBar() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final mutedText = isDark
        ? AppColors.darkTextSecondary
        : AppColors.lightTextSecondary;
    return SizedBox(
      height: 54,
      child: Row(
        children: [
          IconButton(
            onPressed: () => context.pop(),
            icon: Icon(Icons.close_rounded, color: mutedText),
          ),
          const Spacer(),
          if (_sessionId != null && _sessionId!.isNotEmpty)
            _SessionTimer(label: _formatClock(_sessionElapsedSeconds)),
          const Spacer(),
          IconButton(
            onPressed: _openChatDirect,
            icon: Icon(Icons.chat_bubble_outline_rounded, color: mutedText),
          ),
        ],
      ),
    );
  }

  Widget _buildTranscriptChip() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textPrimary = isDark ? AppColors.darkText : AppColors.lightText;
    final mutedText = isDark
        ? AppColors.darkTextSecondary
        : AppColors.lightTextSecondary;
    final chipBg = isDark
        ? const Color(0x3313131A)
        : Colors.white.withValues(alpha: 0.66);
    final chipBorder = isDark
        ? const Color(0x55252535)
        : AppColors.lightBorder.withValues(alpha: 0.92);

    final question = _activeQuestion.trim();
    final hasAnyQuestion =
        question.isNotEmpty || (_fadingQuestion ?? '').isNotEmpty;
    if (!hasAnyQuestion) {
      return const SizedBox(height: 18);
    }

    final fade = CurvedAnimation(
      parent: _questionFadeController,
      curve: Curves.easeOutCubic,
    );

    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 520),
      child: AnimatedBuilder(
        animation: fade,
        builder: (context, _) {
          final dy = 12 * (1 - fade.value);
          return Transform.translate(
            offset: Offset(0, -dy),
            child: Opacity(
              opacity: fade.value,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if ((_fadingQuestion ?? '').isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Text(
                        _fadingQuestion!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: mutedText.withValues(alpha: 0.78),
                          fontSize: 12,
                        ),
                      ),
                    ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: chipBg,
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: chipBorder),
                    ),
                    child: Text(
                      question,
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: textPrimary,
                        fontSize: 14,
                        height: 1.35,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildMicVisualizerSection() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final accent = AppColors.primary;
    final centerFill = isDark
        ? AppColors.darkCard.withValues(alpha: 0.92)
        : Colors.white.withValues(alpha: 0.96);
    final borderColor = isDark
        ? AppColors.darkBorder.withValues(alpha: 0.9)
        : AppColors.lightBorder.withValues(alpha: 0.95);
    final iconColor = isDark ? AppColors.darkText : AppColors.lightText;
    final isRecording = _state == _VoiceState.recording;
    final isProcessing = _state == _VoiceState.processing;
    final isPlaying = _state == _VoiceState.playing;
    final isActive = isRecording || isProcessing || isPlaying;
    final level = isRecording
        ? _liveVoiceLevel.clamp(0.0, 1.0)
        : isPlaying
        ? (0.35 + (_playController.value * 0.4)).clamp(0.0, 1.0)
        : isProcessing
        ? (0.22 + (_pulseController.value * 0.28)).clamp(0.0, 1.0)
        : 0.08;

    return SizedBox(
      width: 300,
      height: 210,
      child: AnimatedBuilder(
        animation: Listenable.merge([
          _waveController,
          _pulseController,
          _playController,
        ]),
        builder: (context, _) {
          final phase = _waveController.value;
          return Stack(
            alignment: Alignment.center,
            children: [
              for (var i = 0; i < 3; i++)
                Transform.scale(
                  scale:
                      1 +
                      (i * 0.22) +
                      (isActive
                          ? (math.sin((phase * math.pi * 2) + i) * 0.045)
                          : 0),
                  child: Container(
                    width: 96 + (i * 28),
                    height: 96 + (i * 28),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: accent.withValues(
                          alpha: isActive
                              ? (0.24 - (i * 0.06))
                              : (0.1 - (i * 0.02)),
                        ),
                        width: 1.3,
                      ),
                    ),
                  ),
                ),
              Positioned(
                bottom: 34,
                child: CustomPaint(
                  size: const Size(240, 82),
                  painter: _CenterMicBarsPainter(
                    level: level,
                    phase: phase,
                    active: isActive,
                    color: accent,
                    mutedColor: borderColor,
                  ),
                ),
              ),
              Container(
                width: 84,
                height: 84,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: centerFill,
                  border: Border.all(color: borderColor),
                  boxShadow: [
                    BoxShadow(
                      color: accent.withValues(alpha: isActive ? 0.22 : 0.1),
                      blurRadius: isActive ? 24 : 12,
                      spreadRadius: isActive ? 1 : 0,
                    ),
                  ],
                ),
                child: Icon(
                  isRecording
                      ? Icons.graphic_eq_rounded
                      : isProcessing
                      ? Icons.auto_awesome_rounded
                      : isPlaying
                      ? Icons.volume_up_rounded
                      : Icons.mic_none_rounded,
                  color: iconColor,
                  size: 34,
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildResponseArea() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textPrimary = isDark ? AppColors.darkText : AppColors.lightText;
    final mutedText = isDark
        ? AppColors.darkTextSecondary
        : AppColors.lightTextSecondary;

    if (_state == _VoiceState.processing) {
      return _buildThinkingPanel();
    }

    final showResponse =
        _response.trim().isNotEmpty || _state == _VoiceState.playing;
    if (!showResponse) {
      return Text(
        'Tap mic below to speak',
        style: TextStyle(color: mutedText, fontSize: 13, letterSpacing: 0.5),
      );
    }

    final glow = _state == _VoiceState.playing ? _orbPlaying : _orbProcessing;
    final maxHeight = (MediaQuery.of(context).size.height * 0.30)
        .clamp(130.0, 250.0)
        .toDouble();
    return ConstrainedBox(
      constraints: BoxConstraints(maxWidth: 620, maxHeight: maxHeight),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: _state == _VoiceState.playing
              ? Colors.transparent
              : (isDark
                    ? const Color(0x2213131A)
                    : Colors.white.withValues(alpha: 0.42)),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: glow.withValues(alpha: 0.14),
              blurRadius: 40,
              spreadRadius: 1,
            ),
          ],
        ),
        child: _BottomFlowText(
          key: ValueKey('flow-${_responseFlowKeySeed.toString()}'),
          lines: _responseChunks(_response),
          lineDuration: const Duration(milliseconds: 460),
          textStyle: TextStyle(
            color: textPrimary,
            fontSize: 18.5,
            fontWeight: FontWeight.w400,
            height: 1.55,
          ),
        ),
      ),
    );
  }

  Widget _buildThinkingPanel() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textMuted = isDark
        ? AppColors.darkTextSecondary
        : AppColors.lightTextSecondary;
    final panelBg = isDark
        ? const Color(0x2213131A)
        : Colors.white.withValues(alpha: 0.66);
    final panelBorder = isDark
        ? const Color(0x55252535)
        : AppColors.lightBorder.withValues(alpha: 0.95);

    final steps = _thinkingSteps;

    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 560),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: panelBg,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: panelBorder),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (steps.isEmpty)
              Text(
                'Listening to your request...',
                style: TextStyle(color: textMuted, fontSize: 14),
              ),
            if (steps.isNotEmpty)
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 170),
                child: SingleChildScrollView(
                  child: Column(
                    children: [
                      for (var i = 0; i < steps.length; i++)
                        AnimatedSlide(
                          duration: const Duration(milliseconds: 280),
                          curve: Curves.easeOutCubic,
                          offset: Offset(0, (steps.length - 1 - i) * -0.02),
                          child: AnimatedOpacity(
                            duration: const Duration(milliseconds: 320),
                            opacity: i == steps.length - 1 ? 1.0 : 0.62,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4),
                              child: Row(
                                children: [
                                  Container(
                                    width: 6,
                                    height: 6,
                                    decoration: BoxDecoration(
                                      color: _orbProcessing.withValues(
                                        alpha: i == steps.length - 1 ? 1 : 0.62,
                                      ),
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      steps[i],
                                      style: TextStyle(
                                        color: textMuted,
                                        fontSize: 13.5,
                                        height: 1.35,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            Align(
              alignment: Alignment.centerRight,
              child: Text(
                '${_thinkingElapsedSeconds}s',
                style: TextStyle(
                  color: textMuted.withValues(alpha: 0.78),
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionDeck(List<_VoiceActionCard> visibleCards) {
    final shouldShow =
        _state == _VoiceState.idle &&
        _response.trim().isNotEmpty &&
        visibleCards.isNotEmpty;
    if (!shouldShow) {
      return const SizedBox(height: 8);
    }

    return ConstrainedBox(
      constraints: const BoxConstraints(maxHeight: 210),
      child: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        child: Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            for (final card in visibleCards)
              SizedBox(width: 168, child: _buildActionTile(card)),
          ],
        ),
      ),
    );
  }

  Widget _buildActionTile(_VoiceActionCard card) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textPrimary = isDark ? AppColors.darkText : AppColors.lightText;
    final textMuted = isDark
        ? AppColors.darkTextSecondary
        : AppColors.lightTextSecondary;
    final cardBg = isDark ? _cardBg : Colors.white.withValues(alpha: 0.9);
    final cardBorder = isDark
        ? _cardBorder
        : AppColors.lightBorder.withValues(alpha: 0.95);

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
          child: Transform.scale(scale: 0.8 + (value * 0.2), child: child),
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
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: cardBorder),
            ),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [
                        topic.withValues(alpha: 0.92),
                        topic.withValues(alpha: 0.35),
                      ],
                    ),
                  ),
                  child: Icon(card.icon, size: 18, color: Colors.white),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        card.label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: textPrimary,
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _topicDescription(card.route),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: textMuted,
                          fontWeight: FontWeight.w400,
                          fontSize: 12,
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

  Color _topicColor(String route) {
    if (route == RoutePaths.weather || route == RoutePaths.soilMoisture) {
      return const Color(0xFF00BFA5);
    }
    if (route == RoutePaths.marketplace || route == RoutePaths.marketPrices) {
      return const Color(0xFF42A5F5);
    }
    if (route == RoutePaths.documents) {
      return const Color(0xFFFFB74D);
    }
    if (route == RoutePaths.equipmentMarketplace ||
        route == RoutePaths.equipmentHub) {
      return const Color(0xFF8BC34A);
    }
    if (route == RoutePaths.cattle) {
      return const Color(0xFFEF5350);
    }
    return const Color(0xFF9FA8DA);
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

  Widget _buildBottomBar() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textMuted = isDark
        ? AppColors.darkTextSecondary
        : AppColors.lightTextSecondary;
    final isRecording = _state == _VoiceState.recording;
    final isProcessing = _state == _VoiceState.processing;
    final isPlaying = _state == _VoiceState.playing;
    final activeColor = isRecording
        ? AppColors.primary
        : isProcessing
        ? AppColors.info
        : isPlaying
        ? AppColors.warning
        : AppColors.primary;
    final buttonBg = isDark
        ? AppColors.darkCard.withValues(alpha: 0.95)
        : Colors.white.withValues(alpha: 0.98);
    final buttonBorder = isDark
        ? AppColors.darkBorder.withValues(alpha: 0.95)
        : AppColors.lightBorder.withValues(alpha: 0.95);

    return Padding(
      padding: const EdgeInsets.only(top: 10, bottom: 18),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          GestureDetector(
            onTap: _onMicTap,
            onLongPress: () {
              if (_state == _VoiceState.playing) {
                _togglePauseResume();
                return;
              }
              if (_response.trim().isNotEmpty) {
                _replayLastResponse();
              }
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 220),
              curve: Curves.easeOutCubic,
              width: 82,
              height: 82,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: buttonBg,
                border: Border.all(color: buttonBorder, width: 1.2),
                boxShadow: [
                  BoxShadow(
                    color: activeColor.withValues(alpha: 0.28),
                    blurRadius: isRecording || isProcessing ? 26 : 14,
                    spreadRadius: isRecording || isProcessing ? 1.5 : 0,
                  ),
                ],
              ),
              child: Icon(
                isRecording || isProcessing || isPlaying
                    ? Icons.stop_rounded
                    : Icons.mic_rounded,
                color: activeColor,
                size: 34,
              ),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            _statusLabel,
            style: TextStyle(
              color: textMuted,
              fontSize: 12.5,
              fontWeight: FontWeight.w400,
            ),
          ),
        ],
      ),
    );
  }

  String get _statusLabel {
    switch (_state) {
      case _VoiceState.idle:
        return 'Tap to speak';
      case _VoiceState.recording:
        return 'Listening...';
      case _VoiceState.processing:
        return 'Thinking...';
      case _VoiceState.playing:
        return _isPlaybackPaused ? 'Playback paused' : 'Speaking...';
    }
  }
}

class _SessionTimer extends StatelessWidget {
  final String label;

  const _SessionTimer({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: const Color(0x2213131A),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: const Color(0x55252535)),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Color(0xFFB7B7CC),
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _CenterMicBarsPainter extends CustomPainter {
  final double level;
  final double phase;
  final bool active;
  final Color color;
  final Color mutedColor;

  const _CenterMicBarsPainter({
    required this.level,
    required this.phase,
    required this.active,
    required this.color,
    required this.mutedColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    const bars = 30;
    const barWidth = 4.0;
    const gap = 3.2;
    final total = (bars * barWidth) + ((bars - 1) * gap);
    final startX = (size.width - total) / 2;
    final centerY = size.height * 0.5;
    final waveBase = phase * math.pi * 2;

    for (var i = 0; i < bars; i++) {
      final x = startX + (i * (barWidth + gap));
      final wave = (math.sin((i * 0.47) + waveBase) + 1) * 0.5;
      final amp = active ? (12 + (level * 30)) : 5;
      final h = 8 + (amp * wave);
      final rect = RRect.fromRectAndRadius(
        Rect.fromLTWH(x, centerY - (h / 2), barWidth, h),
        const Radius.circular(999),
      );
      final barPaint = Paint()
        ..color = active
            ? color.withValues(alpha: (0.35 + (wave * 0.65)).clamp(0.0, 1.0))
            : mutedColor.withValues(alpha: 0.45);
      canvas.drawRRect(rect, barPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _CenterMicBarsPainter oldDelegate) {
    return oldDelegate.level != level ||
        oldDelegate.phase != phase ||
        oldDelegate.active != active ||
        oldDelegate.color != color ||
        oldDelegate.mutedColor != mutedColor;
  }
}

class _BottomFlowText extends StatefulWidget {
  final List<String> lines;
  final Duration lineDuration;
  final TextStyle? textStyle;

  const _BottomFlowText({
    super.key,
    required this.lines,
    required this.lineDuration,
    this.textStyle,
  });

  @override
  State<_BottomFlowText> createState() => _BottomFlowTextState();
}

class _BottomFlowTextState extends State<_BottomFlowText> {
  Timer? _timer;
  late final ScrollController _scrollController;
  List<String> _words = const <String>[];
  int _visibleWords = 0;

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
    if (!sameLines || oldWidget.lineDuration != widget.lineDuration) {
      _restartTicker();
    }
  }

  void _restartTicker() {
    _timer?.cancel();
    final merged = widget.lines
        .join(' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
    _words = merged.isEmpty ? const <String>[] : merged.split(' ');
    _visibleWords = _words.isEmpty ? 0 : 1;

    if (_words.length <= 1) {
      setState(() {});
      return;
    }

    final intervalMs =
        (widget.lineDuration.inMilliseconds /
                math.max(6, (_words.length / 2.0)))
            .clamp(48, 130)
            .toInt();

    _timer = Timer.periodic(Duration(milliseconds: intervalMs), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_visibleWords >= _words.length) {
        timer.cancel();
        return;
      }
      setState(() => _visibleWords += 1);
      _scrollToBottom();
    });
    setState(() {});
    _scrollToBottom();
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
      physics: const BouncingScrollPhysics(),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOutCubic,
        child: Text(text, textAlign: TextAlign.left, style: widget.textStyle),
      ),
    );
  }
}
