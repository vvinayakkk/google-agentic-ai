import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import 'document_builder_service.dart';

class DocumentExportService {
  static bool _isHtmlLike(GeneratedDocumentFile file) {
    final path = file.file.path.toLowerCase();
    final contentType = file.contentType.toLowerCase();
    return path.endsWith('.html') ||
        path.endsWith('.htm') ||
        contentType.contains('text/html') ||
        contentType.contains('text/');
  }

  static Future<GeneratedDocumentFile> ensurePdf(
    GeneratedDocumentFile file, {
    String? preferredBaseName,
  }) async {
    if (file.isPdf) return file;
    if (!_isHtmlLike(file)) return file;

    final html = await _readTextLossy(file.file);
    final text = _normalizePrintableText(_htmlToReadableText(html));

    final tempDir = await getTemporaryDirectory();
    final baseRaw = (preferredBaseName ?? file.file.uri.pathSegments.last)
        .trim()
        .replaceAll(RegExp(r'\.[^.]+$'), '');
    final base = baseRaw.isEmpty ? 'document' : _sanitizeFilePart(baseRaw);
    final pdfFile = File('${tempDir.path}/$base.pdf');

    try {
      await _writePlainTextPdf(pdfFile, text);
    } catch (_) {
      // Last-resort export: force strict ASCII so PDF creation never blocks UX.
      final fallback = _normalizePrintableText(text, strictAscii: true);
      final safeText = fallback.trim().isEmpty
          ? 'Autofilled document exported as PDF.'
          : fallback;
      await _writePlainTextPdf(pdfFile, safeText);
    }

    return GeneratedDocumentFile(
      file: pdfFile,
      contentType: 'application/pdf',
      fromServer: false,
    );
  }

  static Future<GeneratedDocumentFile> ensurePdfOrOriginal(
    GeneratedDocumentFile file, {
    String? preferredBaseName,
  }) async {
    try {
      return await ensurePdf(file, preferredBaseName: preferredBaseName);
    } catch (_) {
      return file;
    }
  }

  static Future<void> _writePlainTextPdf(File file, String text) async {
    final bounded = _boundPdfText(text);
    final pdfDoc = pw.Document();
    pdfDoc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(24),
        maxPages: 200,
        build: (context) => <pw.Widget>[
          pw.Text(
            bounded,
            style: const pw.TextStyle(fontSize: 10, lineSpacing: 2),
          ),
        ],
      ),
    );
    await file.writeAsBytes(await pdfDoc.save(), flush: true);
  }

  static String _sanitizeFilePart(String value) {
    return value
        .replaceAll(RegExp(r'[^A-Za-z0-9._-]+'), '_')
        .replaceAll(RegExp(r'_+'), '_')
        .replaceAll(RegExp(r'^_+|_+$'), '');
  }

  static Future<String> _readTextLossy(File file) async {
    final bytes = await file.readAsBytes();
    if (bytes.isEmpty) return '';
    return utf8.decode(bytes, allowMalformed: true);
  }

  static String _boundPdfText(String text) {
    const limit = 180000;
    if (text.length <= limit) return text;
    return '${text.substring(0, limit)}\n\n[Content truncated for PDF export]';
  }

  static String _htmlToReadableText(String html) {
    var text = html;

    text = text.replaceAll(
      RegExp(r'<script[^>]*>.*?</script>', caseSensitive: false, dotAll: true),
      ' ',
    );

    text = text.replaceAll(
      RegExp(r'<style[^>]*>.*?</style>', caseSensitive: false, dotAll: true),
      ' ',
    );

    text = text.replaceAll(
      RegExp(
        r'</(p|div|section|article|tr|table|h[1-6]|li|br)>',
        caseSensitive: false,
      ),
      '\n',
    );

    text = text.replaceAll(
      RegExp(r'<[^>]+>', caseSensitive: false, dotAll: true),
      ' ',
    );

    const entities = <String, String>{
      '&nbsp;': ' ',
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
    };
    entities.forEach((key, value) {
      text = text.replaceAll(key, value);
    });

    text = text.replaceAll(RegExp(r'[ \t]+'), ' ');
    text = text.replaceAll(RegExp(r'\n\s*\n+'), '\n\n');

    final trimmed = text.trim();
    return trimmed.isEmpty ? 'No readable content found.' : trimmed;
  }

  static String _normalizePrintableText(String text, {bool strictAscii = false}) {
    var out = text;

    const map = <String, String>{
      '\u00A0': ' ',
      '\u200B': '',
      '\u2018': "'",
      '\u2019': "'",
      '\u201C': '"',
      '\u201D': '"',
      '\u2013': '-',
      '\u2014': '-',
      '\u2022': '- ',
      '\u2026': '...',
      '\u20B9': 'Rs ',
    };
    map.forEach((k, v) => out = out.replaceAll(k, v));

    if (strictAscii) {
      out = out.replaceAll(RegExp(r'[^\x09\x0A\x0D\x20-\x7E]'), ' ');
    } else {
      // Remove only control and private-use chars in normal mode.
      out = out.replaceAll(RegExp(r'[\u0000-\u0008\u000B\u000C\u000E-\u001F]'), ' ');
    }

    out = out.replaceAll(RegExp(r'[ \t]+'), ' ');
    out = out.replaceAll(RegExp(r'\n\s*\n+'), '\n\n');
    return out.trim();
  }
}
