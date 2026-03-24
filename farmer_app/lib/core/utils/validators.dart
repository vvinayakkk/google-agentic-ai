/// Common validators for form fields.
abstract final class Validators {
  /// Indian mobile number: 10 digits starting with 6-9.
  static String? phone(String? value) {
    if (value == null || value.isEmpty) return 'Phone number required';
    final cleaned = value.replaceAll(RegExp(r'[^\d]'), '');
    if (cleaned.length == 12 &&
        cleaned.startsWith('91') &&
        RegExp(r'^[6-9]').hasMatch(cleaned.substring(2))) {
      return null;
    }
    if (cleaned.length == 10 && RegExp(r'^[6-9]').hasMatch(cleaned)) {
      return null;
    }
    return 'Enter a valid phone number (10-digit or +91)';
  }

  /// 6-digit OTP.
  static String? otp(String? value) {
    if (value == null || value.isEmpty) return 'OTP required';
    if (value.length != 6 || int.tryParse(value) == null) {
      return 'Enter a valid 6-digit OTP';
    }
    return null;
  }

  /// Non-empty text.
  static String? required(String? value, [String field = 'This field']) {
    if (value == null || value.trim().isEmpty) return '$field is required';
    return null;
  }

  /// Price / numeric input.
  static String? positiveNumber(String? value, [String field = 'Value']) {
    if (value == null || value.isEmpty) return '$field is required';
    final n = double.tryParse(value);
    if (n == null || n <= 0) return 'Enter a valid positive number';
    return null;
  }

  /// Pincode.
  static String? pincode(String? value) {
    if (value == null || value.isEmpty) return 'Pincode required';
    if (value.length != 6 || int.tryParse(value) == null) {
      return 'Enter a valid 6-digit pincode';
    }
    return null;
  }
}
