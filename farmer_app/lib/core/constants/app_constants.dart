/// App-wide constants.
abstract final class AppConstants {
  static const appName = 'KisanKiAwaaz';
  static const appTagline = 'AI-Powered Farmer Assistant';

  /// Fake OTP used during development. Remove in production.
  static const devOtp = '123456';

  /// Maximum characters for agent chat message.
  static const maxMessageLength = 5000;

  /// Supported locale codes.
  static const supportedLocales = ['en', 'hi', 'mr', 'gu', 'pa'];

  /// Language display names.
  static const languageNames = {
    'en': 'English',
    'hi': 'हिंदी',
    'mr': 'मराठी',
    'gu': 'ગુજરાતી',
    'pa': 'ਪੰਜਾਬੀ',
  };

  /// Agent types available for chat.
  static const agentTypes = ['crop', 'market', 'scheme', 'weather'];
}
