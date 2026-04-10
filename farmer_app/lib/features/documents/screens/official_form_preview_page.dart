import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:syncfusion_flutter_pdfviewer/pdfviewer.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/services/document_builder_service.dart';

class OfficialFormPreviewPage extends StatefulWidget {
  const OfficialFormPreviewPage({
    super.key,
    required this.title,
    required this.typeLabel,
    required this.file,
    this.onAutofill,
    this.onDownload,
    this.onOpenExternal,
    this.onOpenHub,
  });

  final String title;
  final String typeLabel;
  final GeneratedDocumentFile file;
  final Future<void> Function()? onAutofill;
  final Future<void> Function()? onDownload;
  final Future<void> Function()? onOpenExternal;
  final VoidCallback? onOpenHub;

  @override
  State<OfficialFormPreviewPage> createState() =>
      _OfficialFormPreviewPageState();
}

class _OfficialFormPreviewPageState extends State<OfficialFormPreviewPage>
    with TickerProviderStateMixin {
  late final AnimationController _entryController;
  late final Animation<double> _headerFade;
  late final Animation<Offset> _headerSlide;
  late final Animation<double> _actionsFade;
  late final Animation<Offset> _actionsSlide;

  bool _isLoading = false;
  String? _loadingLabel;
  WebViewController? _htmlController;
  String? _htmlSignature;

  bool get _isTextLike {
    final path = widget.file.file.path.toLowerCase();
    return path.endsWith('.html') ||
        path.endsWith('.htm') ||
        path.endsWith('.txt') ||
        widget.file.contentType.contains('text/') ||
        widget.file.contentType.contains('html');
  }

  bool _looksLikeHtml(String raw) {
    final probe = raw.toLowerCase();
    return probe.contains("<html") ||
        probe.contains("<head") ||
        probe.contains("<body") ||
        probe.contains("<form") ||
        probe.contains("<input") ||
        probe.contains("<select") ||
        probe.contains("<textarea") ||
        probe.contains("<script") ||
        probe.contains("<style");
  }

  String _wrapAsHtmlDocument(String text) {
    final escaped = const HtmlEscape(HtmlEscapeMode.element).convert(text);
    return '''
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: sans-serif; margin: 16px; line-height: 1.5; }
    pre { white-space: pre-wrap; word-break: break-word; }
  </style>
</head>
<body>
  <pre>$escaped</pre>
</body>
</html>
''';
  }

  String _injectMobilePreviewTuning(String htmlText) {
    const tuning = '''
<style id="kka-mobile-preview-style">
  html, body { margin: 0 !important; padding: 0 !important; }
  body { -webkit-text-size-adjust: 100% !important; }
</style>
<script id="kka-mobile-preview-script">
  (function () {
    function naturalWidth(body) {
      body.style.zoom = '1';
      body.style.transform = 'none';
      body.style.width = 'auto';
      return Math.max(
        body.scrollWidth || 0,
        document.documentElement.scrollWidth || 0,
        Math.ceil(body.getBoundingClientRect().width || 0),
        window.innerWidth || 360
      );
    }

    function applyScale(body, scale) {
      body.style.zoom = String(scale);
      body.style.transformOrigin = 'top left';
      body.style.transform = 'scale(' + scale + ')';
      body.style.width = (100 / scale) + '%';
    }

    function fit() {
      try {
        var body = document.body;
        if (!body) return;
        var viewport = window.innerWidth || document.documentElement.clientWidth || 360;
        var contentWidth = naturalWidth(body);
        var scale = viewport / contentWidth;
        if (!isFinite(scale) || scale <= 0) scale = 1;
        // Force slightly zoomed-out default on mobile to avoid giant first render.
        scale = Math.min(0.78, Math.max(0.24, scale));
        applyScale(body, scale);
      } catch (_) {}
    }

    window.addEventListener('load', fit);
    window.addEventListener('resize', fit);
    setTimeout(fit, 0);
    setTimeout(fit, 120);
    setTimeout(fit, 420);
  })();
</script>
''';

    final lower = htmlText.toLowerCase();
    if (lower.contains('id="kka-mobile-preview-script"')) {
      return htmlText;
    }

    final headClose = RegExp(r'</head>', caseSensitive: false);
    if (headClose.hasMatch(htmlText)) {
      return htmlText.replaceFirst(headClose, '$tuning</head>');
    }

    return '<head>$tuning</head>$htmlText';
  }

  WebViewController _buildHtmlController(String htmlText) {
    final controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.transparent)
      ..loadHtmlString(htmlText);
    return controller;
  }

  @override
  void initState() {
    super.initState();
    _entryController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );

    _headerFade = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(
        parent: _entryController,
        curve: const Interval(0.0, 0.6, curve: Curves.easeOut),
      ),
    );
    _headerSlide = Tween<Offset>(
      begin: const Offset(0, -0.12),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _entryController,
        curve: const Interval(0.0, 0.6, curve: Curves.easeOutCubic),
      ),
    );
    _actionsFade = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(
        parent: _entryController,
        curve: const Interval(0.4, 1.0, curve: Curves.easeOut),
      ),
    );
    _actionsSlide = Tween<Offset>(
      begin: const Offset(0, 0.25),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _entryController,
        curve: const Interval(0.4, 1.0, curve: Curves.easeOutCubic),
      ),
    );

    _entryController.forward();
  }

  @override
  void dispose() {
    _entryController.dispose();
    super.dispose();
  }

  Future<void> _runAction(
      Future<void> Function() action, String label) async {
    setState(() {
      _isLoading = true;
      _loadingLabel = label;
    });
    try {
      await action();
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _loadingLabel = null;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;

    return Scaffold(
      backgroundColor: isDark
          ? AppColors.darkBackground
          : AppColors.lightBackground,
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? <Color>[AppColors.darkBackground, AppColors.darkSurface]
                : <Color>[AppColors.lightBackground, AppColors.lightSurface],
          ),
        ),
        child: Stack(
          children: [
          // Ambient orbs — Positioned so they never affect layout
          Positioned(
            top: -80,
            right: -60,
            child: _AmbientOrb(
              color:
                  AppColors.primary.withValues(alpha: isDark ? 0.18 : 0.12),
              size: 280,
            ),
          ),
          Positioned(
            bottom: 100,
            left: -40,
            child: _AmbientOrb(
              color: AppColors.primaryDark
                  .withValues(alpha: isDark ? 0.12 : 0.08),
              size: 200,
            ),
          ),

          // Main column — SafeArea handles insets, Expanded handles flex
          SafeArea(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // App bar
                _buildAppBar(context, isDark),

                // Header card — fixed height, safe to animate
                SlideTransition(
                  position: _headerSlide,
                  child: FadeTransition(
                    opacity: _headerFade,
                    child: _buildHeaderCard(context, isDark),
                  ),
                ),

                // Viewer — Expanded lives here, NOT inside any animation wrapper
                Expanded(
                  child: _buildViewer(context, isDark),
                ),

                // Action bar — fixed height, safe to animate
                SlideTransition(
                  position: _actionsSlide,
                  child: FadeTransition(
                    opacity: _actionsFade,
                    child: _buildActionBar(context, isDark),
                  ),
                ),
              ],
            ),
          ),

          // Loading overlay
          if (_isLoading) _buildLoadingOverlay(isDark),
          ],
        ),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  App bar
  // ─────────────────────────────────────────────────────────────────────────

  Widget _buildAppBar(BuildContext context, bool isDark) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 8, 16, 0),
      child: Row(
        children: [
          IconButton(
            onPressed: () => Navigator.of(context).maybePop(),
            icon: Icon(
              Icons.arrow_back_ios_new_rounded,
              size: 18,
              color: isDark
                  ? Colors.white.withValues(alpha: 0.6)
                  : Colors.black.withValues(alpha: 0.5),
            ),
          ),
          Text(
            'Form Preview',
            style: context.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
              letterSpacing: 0.3,
              color: isDark
                  ? Colors.white.withValues(alpha: 0.45)
                  : Colors.black.withValues(alpha: 0.38),
            ),
          ),
        ],
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Header card
  // ─────────────────────────────────────────────────────────────────────────

  Widget _buildHeaderCard(BuildContext context, bool isDark) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Container(
        padding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        decoration: BoxDecoration(
          color: isDark
              ? Colors.white.withValues(alpha: 0.07)
              : Colors.white.withValues(alpha: 0.85),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isDark
                ? Colors.white.withValues(alpha: 0.1)
                : Colors.white.withValues(alpha: 0.95),
            width: 1.2,
          ),
          boxShadow: isDark
              ? null
              : [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.06),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                ],
        ),
        child: Row(
          children: [
            // Gradient icon badge
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [AppColors.primary, AppColors.primaryDark],
                ),
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.32),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: const Icon(
                Icons.description_rounded,
                color: Colors.white,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            // Title
            Expanded(
              child: Text(
                widget.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: context.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                  height: 1.25,
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.92)
                      : Colors.black.withValues(alpha: 0.85),
                ),
              ),
            ),
            const SizedBox(width: 10),
            // Type pill
            Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(
                  color: AppColors.primary.withValues(alpha: 0.25),
                ),
              ),
              child: Text(
                widget.typeLabel,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary,
                  letterSpacing: 0.3,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Viewer  (lives inside Expanded — no animation wrapper around it)
  // ─────────────────────────────────────────────────────────────────────────

  Widget _buildViewer(BuildContext context, bool isDark) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: Container(
          decoration: BoxDecoration(
            color: isDark
                ? Colors.white.withValues(alpha: 0.04)
                : Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.08)
                  : Colors.black.withValues(alpha: 0.06),
            ),
          ),
          child: _buildViewerContent(context, isDark),
        ),
      ),
    );
  }

  Widget _buildViewerContent(BuildContext context, bool isDark) {
    if (widget.file.isPdf) {
      return SfPdfViewer.file(widget.file.file);
    }

    if (_isTextLike) {
      return FutureBuilder<String>(
        future: widget.file.file.readAsString(),
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return Center(
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppColors.primary,
              ),
            );
          }

          final text = (snapshot.data ?? '').trim();
          if (text.isEmpty) {
            return _EmptyState(
              isDark: isDark,
              message: 'No preview text available for this form.',
            );
          }

          final htmlText = _looksLikeHtml(text) ? text : _wrapAsHtmlDocument(text);
          final tunedHtml = _injectMobilePreviewTuning(htmlText);
          final signature = '${widget.file.file.path}:${tunedHtml.hashCode}';
          if (_htmlController == null || _htmlSignature != signature) {
            _htmlController = _buildHtmlController(tunedHtml);
            _htmlSignature = signature;
          }

          return WebViewWidget(controller: _htmlController!);
        },
      );
    }

    return _EmptyState(
      isDark: isDark,
      message: 'Inline preview is not available for this file type.',
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Action bar
  // ─────────────────────────────────────────────────────────────────────────

  Widget _buildActionBar(BuildContext context, bool isDark) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Container(
        padding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: isDark
              ? Colors.white.withValues(alpha: 0.07)
              : Colors.white.withValues(alpha: 0.9),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isDark
                ? Colors.white.withValues(alpha: 0.1)
                : Colors.black.withValues(alpha: 0.07),
          ),
          boxShadow: isDark
              ? null
              : [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 12,
                    offset: const Offset(0, 3),
                  ),
                ],
        ),
        child: Row(
          children: [
            if (widget.onOpenExternal != null) ...[
              _GhostIconButton(
                icon: Icons.open_in_new_rounded,
                tooltip: 'Open',
                isDark: isDark,
                onTap: () =>
                    _runAction(widget.onOpenExternal!, 'Opening…'),
              ),
              const SizedBox(width: 6),
            ],
            if (widget.onDownload != null)
              _GhostIconButton(
                icon: Icons.download_rounded,
                tooltip: 'Download',
                isDark: isDark,
                onTap: () =>
                    _runAction(widget.onDownload!, 'Downloading…'),
              ),
            const Spacer(),
            if (widget.onOpenHub != null) ...[
              _PillButton(
                label: 'Forms Hub',
                icon: Icons.dashboard_customize_rounded,
                color: AppColors.primaryDark,
                onTap: widget.onOpenHub!,
              ),
              const SizedBox(width: 8),
            ],
            if (widget.onAutofill != null)
              _PillButton(
                label: 'Autofill',
                icon: Icons.auto_fix_high_rounded,
                color: AppColors.primary,
                onTap: () =>
                    _runAction(widget.onAutofill!, 'Filling form…'),
                glow: true,
              ),
          ],
        ),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Loading overlay
  // ─────────────────────────────────────────────────────────────────────────

  Widget _buildLoadingOverlay(bool isDark) {
    return Positioned.fill(
      child: ColoredBox(
        color: Colors.black.withValues(alpha: 0.45),
        child: Center(
          child: Container(
            padding: const EdgeInsets.symmetric(
                horizontal: 28, vertical: 22),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1C1C22) : Colors.white,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  width: 32,
                  height: 32,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  _loadingLabel ?? 'Loading…',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.8)
                        : Colors.black.withValues(alpha: 0.7),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Sub-widgets
// ─────────────────────────────────────────────────────────────────────────────

class _AmbientOrb extends StatelessWidget {
  const _AmbientOrb({required this.color, required this.size});
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [color, color.withValues(alpha: 0)],
          ),
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.isDark, required this.message});
  final bool isDark;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(
                Icons.insert_drive_file_outlined,
                size: 28,
                color: AppColors.primary.withValues(alpha: 0.55),
              ),
            ),
            const SizedBox(height: 14),
            Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                height: 1.5,
                color: isDark
                    ? Colors.white.withValues(alpha: 0.38)
                    : Colors.black.withValues(alpha: 0.35),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GhostIconButton extends StatelessWidget {
  const _GhostIconButton({
    required this.icon,
    required this.tooltip,
    required this.isDark,
    required this.onTap,
  });
  final IconData icon;
  final String tooltip;
  final bool isDark;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(11),
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(11),
            border: Border.all(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.12)
                  : Colors.black.withValues(alpha: 0.1),
            ),
          ),
          child: Icon(
            icon,
            size: 17,
            color: isDark
                ? Colors.white.withValues(alpha: 0.6)
                : Colors.black.withValues(alpha: 0.45),
          ),
        ),
      ),
    );
  }
}

class _PillButton extends StatefulWidget {
  const _PillButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
    this.glow = false,
  });
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  final bool glow;

  @override
  State<_PillButton> createState() => _PillButtonState();
}

class _PillButtonState extends State<_PillButton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 80),
      reverseDuration: const Duration(milliseconds: 180),
      lowerBound: 0,
      upperBound: 1,
    );
    _scale = Tween<double>(begin: 1.0, end: 0.95)
        .animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOut));
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => _ctrl.forward(),
      onTapUp: (_) {
        _ctrl.reverse();
        widget.onTap();
      },
      onTapCancel: () => _ctrl.reverse(),
      child: ScaleTransition(
        scale: _scale,
        child: Container(
          padding:
              const EdgeInsets.symmetric(horizontal: 15, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: widget.color.withValues(alpha: widget.glow ? 0.6 : 0.45),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(widget.icon, size: 14, color: widget.color),
              const SizedBox(width: 6),
              Text(
                widget.label,
                style: TextStyle(
                  color: widget.color,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.2,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}