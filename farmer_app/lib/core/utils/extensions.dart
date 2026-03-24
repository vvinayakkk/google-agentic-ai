import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

/// String helpers.
extension StringX on String {
  /// Capitalize first letter.
  String get capitalize =>
      isEmpty ? this : '${this[0].toUpperCase()}${substring(1)}';

  /// Title case every word.
  String get titleCase =>
      split(' ').map((w) => w.capitalize).join(' ');
}

/// DateTime helpers.
extension DateTimeX on DateTime {
  String get formatted => DateFormat('dd MMM yyyy').format(this);
  String get shortDate => DateFormat('dd/MM/yy').format(this);
  String get timeOnly => DateFormat('hh:mm a').format(this);
  String get iso => toIso8601String();

  /// "2 hours ago", "Just now", etc.
  String get timeAgo {
    final diff = DateTime.now().difference(this);
    if (diff.inSeconds < 60) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return formatted;
  }
}

/// Number formatting.
extension NumX on num {
  /// ₹1,234.56
  String get inr => NumberFormat.currency(
        locale: 'en_IN',
        symbol: '₹',
        decimalDigits: toInt() == this ? 0 : 2,
      ).format(this);

  /// 1.2K, 3.4M etc.
  String get compact => NumberFormat.compact().format(this);
}

/// Widget spacing helpers.
extension WidgetSpacing on num {
  SizedBox get h => SizedBox(height: toDouble());
  SizedBox get w => SizedBox(width: toDouble());
}

/// Snackbar convenience.
extension SnackbarX on BuildContext {
  void showSnack(String message, {bool isError = false}) {
    ScaffoldMessenger.of(this).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor:
            isError ? Theme.of(this).colorScheme.error : null,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 3),
      ),
    );
  }
}
