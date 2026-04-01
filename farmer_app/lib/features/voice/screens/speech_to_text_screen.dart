import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../shared/services/agent_service.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/mic_overlay.dart';

/// Possible states for the STT flow.
enum _SttStatus { ready, recording, processing, done }

class SpeechToTextScreen extends ConsumerStatefulWidget {
  const SpeechToTextScreen({super.key});

  @override
  ConsumerState<SpeechToTextScreen> createState() =>
      _SpeechToTextScreenState();
}

class _SpeechToTextScreenState extends ConsumerState<SpeechToTextScreen> {
  _SttStatus _status = _SttStatus.ready;
  String _transcript = '';

  final AudioRecorder _recorder = AudioRecorder();
  String? _recordingPath;

  @override
  void dispose() {
    _recorder.dispose();
    super.dispose();
  }

  bool get _isRecording => _status == _SttStatus.recording;

  Future<void> _toggleRecording() async {
    if (_status == _SttStatus.recording) {
      // Stop recording → process via backend STT
      final path = await _recorder.stop();
      if (path == null || path.isEmpty) {
        setState(() => _status = _SttStatus.ready);
        if (mounted) {
          context.showSnack('speech_to_text.no_result'.tr(), isError: true);
        }
        return;
      }

      setState(() => _status = _SttStatus.processing);

      try {
        final voice = ref.read(voiceServiceProvider);
        final data = await voice.stt(
          path,
          language: context.locale.languageCode,
        );

        final transcript = data['transcript'] as String? ?? '';

        if (mounted) {
          setState(() {
            _transcript = transcript.isEmpty
                ? 'speech_to_text.no_result'.tr()
                : transcript;
            _status = _SttStatus.done;
          });
        }
      } catch (e) {
        if (mounted) {
          setState(() => _status = _SttStatus.ready);
          context.showSnack('voice_assistant.error'.tr(), isError: true);
        }
      }
    } else {
      // Start recording
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
          '${dir.path}/stt_${DateTime.now().millisecondsSinceEpoch}.wav';

      await _recorder.start(
        const RecordConfig(encoder: AudioEncoder.wav),
        path: _recordingPath!,
      );

      setState(() {
        _status = _SttStatus.recording;
        _transcript = '';
      });
    }
  }

  void _copyToClipboard() {
    if (_transcript.isEmpty) return;
    Clipboard.setData(ClipboardData(text: _transcript));
    context.showSnack('common.copied'.tr());
  }

  void _useInChat() {
    if (_transcript.isEmpty) return;
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop(_transcript);
      return;
    }
    final encoded = Uri.encodeQueryComponent(_transcript);
    context.push('${RoutePaths.chat}?agent=general&q=$encoded');
  }

  void _clear() {
    setState(() {
      _status = _SttStatus.ready;
      _transcript = '';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('speech_to_text.title'.tr()),
        actions: [
          if (_transcript.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.clear),
              tooltip: 'speech_to_text.clear'.tr(),
              onPressed: _clear,
            ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: AppSpacing.allLg,
          child: Column(
            children: [
              const Spacer(),

              // ── Status Label ───────────────────────────
              Text(
                _statusLabel,
                style: context.textTheme.titleMedium?.copyWith(
                  color: _statusColor,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                _statusHint,
                style: context.textTheme.bodySmall?.copyWith(
                  color: context.appColors.textSecondary,
                ),
              ),
              const SizedBox(height: AppSpacing.xxl),

              // ── Mic Overlay ────────────────────────────
              MicOverlay(
                isListening: _isRecording,
                onTap: _status == _SttStatus.processing
                    ? () {}
                    : _toggleRecording,
                label: _isRecording
                    ? 'voice_assistant.tap_again'.tr()
                    : 'voice_assistant.tap_to_speak'.tr(),
              ),
              const SizedBox(height: AppSpacing.xxl),

              // ── Processing Indicator ───────────────────
              if (_status == _SttStatus.processing) ...[
                const SizedBox(
                  width: 28,
                  height: 28,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
              ],

              const Spacer(),

              // ── Transcript Area ────────────────────────
              AppCard(
                child: SizedBox(
                  width: double.infinity,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.text_snippet,
                              size: 18,
                              color: context.appColors.textSecondary),
                          const SizedBox(width: AppSpacing.sm),
                          Text(
                            'speech_to_text.transcript'.tr(),
                            style: context.textTheme.labelMedium?.copyWith(
                              color: context.appColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.md),
                      Container(
                        width: double.infinity,
                        constraints:
                            const BoxConstraints(minHeight: 80, maxHeight: 200),
                        padding: AppSpacing.allMd,
                        decoration: BoxDecoration(
                          color: context.isDark
                              ? AppColors.darkSurface
                              : AppColors.lightSurface,
                          borderRadius: AppRadius.smAll,
                          border: Border.all(
                              color: context.appColors.border, width: 0.5),
                        ),
                        child: SelectableText(
                          _transcript.isEmpty
                              ? 'speech_to_text.subtitle'.tr()
                              : _transcript,
                          style: context.textTheme.bodyMedium?.copyWith(
                            color: _transcript.isEmpty
                                ? context.appColors.textSecondary
                                : null,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),

              // ── Action Buttons ─────────────────────────
              if (_transcript.isNotEmpty &&
                  _status == _SttStatus.done) ...[
                Row(
                  children: [
                    Expanded(
                      child: AppButton(
                        label: 'speech_to_text.copy'.tr(),
                        icon: Icons.copy,
                        isOutlined: true,
                        onPressed: _copyToClipboard,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: AppButton(
                        label: 'speech_to_text.ask_ai'.tr(),
                        icon: Icons.chat,
                        onPressed: _useInChat,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.lg),
              ],
            ],
          ),
        ),
      ),
    );
  }

  String get _statusLabel {
    switch (_status) {
      case _SttStatus.ready:
        return 'speech_to_text.ready'.tr();
      case _SttStatus.recording:
        return 'speech_to_text.recording'.tr();
      case _SttStatus.processing:
        return 'speech_to_text.processing'.tr();
      case _SttStatus.done:
        return 'speech_to_text.done'.tr();
    }
  }

  String get _statusHint {
    switch (_status) {
      case _SttStatus.ready:
        return 'speech_to_text.subtitle'.tr();
      case _SttStatus.recording:
        return 'voice_assistant.listening'.tr();
      case _SttStatus.processing:
        return 'voice_assistant.processing'.tr();
      case _SttStatus.done:
        return 'speech_to_text.transcript'.tr();
    }
  }

  Color get _statusColor {
    switch (_status) {
      case _SttStatus.ready:
        return AppColors.primary;
      case _SttStatus.recording:
        return AppColors.danger;
      case _SttStatus.processing:
        return AppColors.warning;
      case _SttStatus.done:
        return AppColors.success;
    }
  }
}
