import 'dart:async';
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
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/app_cache.dart';
import '../../../core/utils/extensions.dart';
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
  int _thinkingPulse = 0;
  int _thinkingElapsedSeconds = 0;
  bool _thinkingExpanded = true;
  Timer? _thinkingTimer;
  final List<_VoiceTurn> _recentTurns = <_VoiceTurn>[];
  List<_VoiceActionCard> _actionCards = <_VoiceActionCard>[];

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
      if (!mounted) return;
      setState(() {
        _state = _VoiceState.idle;
        _isPlaybackPaused = false;
        _playbackPosition = Duration.zero;
        _playbackDuration = Duration.zero;
        _lastPlaybackUiMs = -1;
      });
    });

    _audioPlayer.onDurationChanged.listen((duration) {
      if (!mounted) return;
      setState(() => _playbackDuration = duration);
    });

    _audioPlayer.onPositionChanged.listen((position) {
      if (!mounted) return;
      final atMs = position.inMilliseconds;
      if (_playbackDuration > Duration.zero) {
        final shouldPaint =
            _lastPlaybackUiMs < 0 ||
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
    _thinkingTimer?.cancel();
    _pulseController.dispose();
    _flickerController.dispose();
    _waveController.dispose();
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

    setState(() {
      _state = _VoiceState.recording;
      _isPlaybackPaused = false;
      _transcript = '';
      _response = '';
      _activeQuestion = '';
      _fadingQuestion = null;
      _actionCards = <_VoiceActionCard>[];
      _recentTurns.clear();
    });
    Haptics.light();
    _pulseController.repeat(reverse: true);
    _flickerController.repeat(reverse: true);
    _waveController.repeat();
  }

  Future<void> _stopAndProcess() async {
    Haptics.heavy();
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

  void _startThinkingTicker() {
    _thinkingTimer?.cancel();
    _thinkingTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted || _state != _VoiceState.processing) return;
      setState(() {
        _thinkingPulse = (_thinkingPulse + 1) % 12;
        _thinkingElapsedSeconds += 1;
      });
    });
  }

  void _stopThinkingTicker() {
    _thinkingTimer?.cancel();
    _thinkingTimer = null;
  }

  Future<void> _processVoiceFile(String path, {String? sourcePrompt}) async {
    final languageCode = context.locale.languageCode;
    final hintedQuestion = (sourcePrompt ?? '').trim();

    setState(() {
      _state = _VoiceState.processing;
      _isPlaybackPaused = false;
      _lastAudioBase64 = null;
      _response = '';
      _thinkingPulse = 0;
      _thinkingElapsedSeconds = 0;
      _thinkingExpanded = true;
      _actionCards = <_VoiceActionCard>[];
    });
    _startThinkingTicker();
    _waveController.repeat();

    try {
      final voice = ref.read(voiceServiceProvider);
      final data = await voice.voiceCommandText(
        path,
        language: languageCode,
        sessionId: _sessionId,
      );

      if (!mounted) return;

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

      var effectiveResponse = baseResponse;
      if (retryStyleResponse && weatherIntent) {
        effectiveResponse = _weatherFallbackResponse(languageCode);
        cards = _mergePriorityCards(cards, const <String>[
          'weather',
          'soil_moisture',
        ]);
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

      _sessionId = data['session_id'] as String? ?? _sessionId;
      final visibleQuestion = transcriptDisplay.isNotEmpty
          ? transcriptDisplay
          : (transcript.isNotEmpty ? transcript : hintedQuestion);
      final previousQuestion = _activeQuestion;

      setState(() {
        _transcript = transcript;
        _response = '';
        _activeQuestion = visibleQuestion;
        _actionCards = cards;

        if (effectiveResponse.isNotEmpty &&
            previousQuestion.isNotEmpty &&
            previousQuestion != visibleQuestion) {
          _fadingQuestion = previousQuestion;
          _questionFadeController.forward(from: 0);
        }

        if (transcript.isNotEmpty || effectiveResponse.isNotEmpty) {
          _recentTurns.insert(
            0,
            _VoiceTurn(
              transcript: transcript,
              response: responseForDisplay,
              at: DateTime.now(),
            ),
          );
          if (_recentTurns.length > 4) {
            _recentTurns.removeRange(4, _recentTurns.length);
          }
        }
      });

      if (effectiveResponse.isNotEmpty &&
          previousQuestion.isNotEmpty &&
          previousQuestion != visibleQuestion) {
        _questionFadeController.addStatusListener(_clearQuestionStatusListener);
      }

      await Future<void>.delayed(const Duration(milliseconds: 700));
      if (!mounted) return;

      setState(() {
        _response = responseForDisplay;
      });
      Haptics.selection();

      String audioToPlay = audioBase64;
      if (attachCardsCue && responseForSpeech.trim().isNotEmpty) {
        try {
          final regenerated = await voice.ttsBase64(
            text: responseForSpeech,
            language: languageCode,
          );
          final regeneratedAudio =
              (regenerated['audio_base64'] as String? ?? '').trim();
          if (regeneratedAudio.isNotEmpty) {
            audioToPlay = regeneratedAudio;
          }
        } catch (_) {
          // Keep server audio as fallback.
        }
      }

      _stopThinkingTicker();
      _waveController.stop();

      if (audioToPlay.isNotEmpty) {
        _lastAudioBase64 = audioToPlay;
        await _playAudioBase64(audioToPlay);
      } else {
        _lastAudioBase64 = null;
        setState(() => _state = _VoiceState.idle);
      }
    } catch (_) {
      _stopThinkingTicker();
      _waveController.stop();
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
      if (mounted) setState(() => _isPlaybackPaused = false);
    } else {
      await _audioPlayer.pause();
      if (mounted) setState(() => _isPlaybackPaused = true);
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
      if (out.length >= 4) break;
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

  String _weatherFallbackResponse(String languageCode) {
    final code = languageCode.toLowerCase();
    if (code.startsWith('hi')) {
      return 'Abhi direct weather answer lane mein issue aa raha hai. Neeche Weather ya Soil Moisture card par tap karke current update dekh lijiye.';
    }
    return 'I could not fetch the live weather answer right now. Tap Weather or Soil Moisture below to get current conditions quickly.';
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
      if (out.length >= 4) break;
    }
    return out;
  }

  @override
  Widget build(BuildContext context) {
    final isActive = _state == _VoiceState.recording;
    final isProcessing = _state == _VoiceState.processing;
    final isPlaying = _state == _VoiceState.playing;

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Column(
          children: [
            _buildTopBar(context),
            Expanded(
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 400),
                switchInCurve: Curves.easeOutCubic,
                switchOutCurve: Curves.easeInCubic,
                transitionBuilder: (child, animation) {
                  return FadeTransition(
                    opacity: animation,
                    child: SlideTransition(
                      position: Tween<Offset>(
                        begin: const Offset(0, 0.06),
                        end: Offset.zero,
                      ).animate(animation),
                      child: child,
                    ),
                  );
                },
                child: _buildStateContent(
                  context,
                  isActive: isActive,
                  isProcessing: isProcessing,
                  isPlaying: isPlaying,
                ),
              ),
            ),
            _buildActionChips(context),
            _buildMicButton(context),
            Padding(
              padding: const EdgeInsets.only(bottom: 24, top: 6),
              child: Text(
                _statusLabel,
                style: context.textTheme.bodySmall?.copyWith(
                  color: Colors.white38,
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTopBar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            icon: const Icon(Icons.close_rounded, color: Colors.white70),
            onPressed: () => context.pop(),
          ),
          IconButton(
            icon: const Icon(
              Icons.chat_bubble_outline_rounded,
              color: Colors.white54,
            ),
            onPressed: _openChatDirect,
          ),
        ],
      ),
    );
  }

  Widget _buildStateContent(
    BuildContext context, {
    required bool isActive,
    required bool isProcessing,
    required bool isPlaying,
  }) {
    if (isProcessing) {
      final showQuestion = _thinkingExpanded && _activeQuestion.isNotEmpty;
      return Center(
        key: const ValueKey('voice-processing'),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  color: AppColors.primary,
                  strokeWidth: 1.5,
                ),
              ),
              const SizedBox(height: 16),
              if (showQuestion)
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 220),
                  child: Text(
                    _activeQuestion,
                    key: ValueKey(_activeQuestion),
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 17,
                      height: 1.4,
                    ),
                  ),
                ),
              const SizedBox(height: 12),
              Text(
                'Thinking${'.' * ((_thinkingPulse % 3) + 1)}  ${_thinkingElapsedSeconds}s',
                style: const TextStyle(color: AppColors.primary, fontSize: 13),
              ),
            ],
          ),
        ),
      );
    }

    if (isActive) {
      return Center(
        key: const ValueKey('voice-recording'),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text(
                'Listening...',
                style: TextStyle(
                  color: Colors.white54,
                  fontSize: 13,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 12),
              _ReactiveWaveform(
                controller: _waveController,
                isActive: true,
                color: AppColors.primary,
              ),
            ],
          ),
        ),
      );
    }

    final showAnswer = isPlaying || _response.trim().isNotEmpty;
    if (showAnswer) {
      return Center(
        key: const ValueKey('voice-answer'),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (_fadingQuestion != null)
                Text(
                  _fadingQuestion!,
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white24, fontSize: 12),
                ),
              if (_fadingQuestion != null) const SizedBox(height: 8),
              if (_activeQuestion.isNotEmpty)
                Text(
                  _activeQuestion,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white38,
                    fontSize: 14,
                    height: 1.3,
                  ),
                ),
              const SizedBox(height: 20),
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 160),
                transitionBuilder: (child, animation) =>
                    FadeTransition(opacity: animation, child: child),
                child: Text(
                  _heroText,
                  key: ValueKey(_heroText.hashCode),
                  textAlign: TextAlign.center,
                  maxLines: 5,
                  overflow: TextOverflow.fade,
                  style: GoogleFonts.sora(
                    fontSize: 22,
                    fontWeight: FontWeight.w400,
                    color: Colors.white,
                    height: 1.45,
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Center(
      key: const ValueKey('voice-idle'),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AnimatedBuilder(
            animation: _pulseController,
            builder: (context, child) {
              final scale = 0.92 + (_pulseController.value * 0.16);
              return Transform.scale(scale: scale, child: child);
            },
            child: Container(
              width: 160,
              height: 160,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppColors.primary.withValues(alpha: 0.18),
                    AppColors.primary.withValues(alpha: 0),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 14),
          const Text(
            'Tap the mic to speak',
            style: TextStyle(color: Colors.white54, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildActionChips(BuildContext context) {
    final hasCards = _actionCards.isNotEmpty;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 320),
      curve: Curves.easeOutCubic,
      height: hasCards ? 86 : 0,
      child: ClipRect(
        child: AnimatedSlide(
          offset: hasCards ? Offset.zero : const Offset(0, 1),
          duration: const Duration(milliseconds: 380),
          curve: Curves.easeOutCubic,
          child: AnimatedOpacity(
            opacity: hasCards ? 1 : 0,
            duration: const Duration(milliseconds: 300),
            child: SizedBox(
              height: 70,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: _actionCards.length,
                separatorBuilder: (context, index) => const SizedBox(width: 10),
                itemBuilder: (context, i) {
                  final card = _actionCards[i];
                  return InkWell(
                    onTap: () {
                      Haptics.selection();
                      context.push(card.route);
                    },
                    borderRadius: BorderRadius.circular(50),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(50),
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.2),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(card.icon, color: AppColors.primary, size: 16),
                          const SizedBox(width: 8),
                          Text(
                            card.label,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
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
        ),
      ),
    );
  }

  Widget _buildMicButton(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 32, top: 12),
      child: Center(
        child: GestureDetector(
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
          child: AnimatedBuilder(
            animation: Listenable.merge([_pulseController, _flickerController]),
            builder: (context, _) {
              final isRecording = _state == _VoiceState.recording;
              final isProcessing = _state == _VoiceState.processing;
              final pulseScale = isRecording
                  ? (1.0 + _pulseController.value * 0.14)
                  : 1.0;

              return Stack(
                alignment: Alignment.center,
                children: [
                  if (isRecording)
                    Transform.scale(
                      scale: pulseScale,
                      child: Container(
                        width: 108,
                        height: 108,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppColors.primary.withValues(
                              alpha: 0.35 - (_pulseController.value * 0.15),
                            ),
                            width: 2,
                          ),
                        ),
                      ),
                    ),
                  if (isRecording)
                    Transform.scale(
                      scale: 1.0 + _pulseController.value * 0.06,
                      child: Container(
                        width: 96,
                        height: 96,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppColors.primary.withValues(alpha: 0.55),
                            width: 1.5,
                          ),
                        ),
                      ),
                    ),
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isRecording
                          ? AppColors.primary
                          : (isProcessing
                                ? Colors.white.withValues(alpha: 0.08)
                                : Colors.white.withValues(alpha: 0.12)),
                      border: Border.all(
                        color: isRecording
                            ? AppColors.primaryLight
                            : Colors.white.withValues(alpha: 0.25),
                        width: 1.5,
                      ),
                    ),
                    child: Icon(
                      isRecording ? Icons.stop_rounded : Icons.mic_rounded,
                      color: isRecording ? Colors.white : Colors.white70,
                      size: 32,
                    ),
                  ),
                ],
              );
            },
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
        return _isPlaybackPaused
            ? 'Playback paused'
            : 'voice_assistant.playing'.tr();
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
      height: 56,
      child: AnimatedBuilder(
        animation: controller,
        builder: (context, _) {
          final t = controller.value * math.pi * 2;
          return Row(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: List.generate(28, (i) {
              final wave = math.sin(t + (i * 0.28)).abs();
              final base = isActive ? 6.0 : 3.0;
              final amp = isActive ? 32.0 : 10.0;
              final h = base + (amp * wave);
              final alpha = isActive
                  ? (0.9 - (i % 3) * 0.15).clamp(0.3, 0.9)
                  : 0.2;
              return Container(
                width: 3,
                height: h,
                margin: const EdgeInsets.symmetric(horizontal: 1.5),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: alpha.toDouble()),
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
