/// App-wide constants.
abstract final class AppConstants {
  static const appName = 'KisanKiAwaaz';
  static const appTagline = 'AI-Powered Farmer Assistant';

  /// Fake OTP used during development. Remove in production.
  static const devOtp = '123456';

  /// Maximum characters for agent chat message.
  static const maxMessageLength = 5000;

  /// Supported locale codes.
  static const supportedLocales = ['en', 'hi', 'bn', 'gu', 'mr', 'ta', 'te', 'kn'];

  /// Language display names.
  static const languageNames = {
    'en': 'English',
    'hi': 'हिंदी',
    'bn': 'বাংলা',
    'gu': 'ગુજરાતી',
    'mr': 'मराठी',
    'ta': 'தமிழ்',
    'te': 'తెలుగు',
    'kn': 'ಕನ್ನಡ',
  };

  /// Agent types available for chat.
  static const agentTypes = ['crop', 'market', 'scheme', 'weather'];
}
