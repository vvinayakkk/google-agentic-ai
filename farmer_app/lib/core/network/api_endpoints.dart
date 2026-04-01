/// All API endpoint paths, organized by microservice.
/// Base URL is configured in [ApiClient].
abstract final class ApiEndpoints {
  // ── Auth (:8001 → /api/v1/auth) ───────────────────────
  static const register = '/api/v1/auth/register';
  static const login = '/api/v1/auth/login';
  static const refreshToken = '/api/v1/auth/refresh';
  static const authMe = '/api/v1/auth/me';
  static const changePassword = '/api/v1/auth/change-password';
  static const otpSend = '/api/v1/auth/otp/send';
  static const otpVerify = '/api/v1/auth/otp/verify';
  static const resetPassword = '/api/v1/auth/reset-password';

  // ── Farmer (:8002 → /api/v1/farmers) ───────────────────
  static const farmerProfile = '/api/v1/farmers/me/profile';
  static const farmerDashboard = '/api/v1/farmers/me/dashboard';
  static const farmerMe = '/api/v1/farmers/me';

  // ── Crop (:8003 → /api/v1/crops) ──────────────────────
  static const crops = '/api/v1/crops/';
  static String cropById(String id) => '/api/v1/crops/$id';
  static const cropCycles = '/api/v1/crops/cycles';
  static String cropCyclesByName(String name) => '/api/v1/crops/cycles/$name';
  static const cropRecommendations = '/api/v1/crops/recommendations';
  static const cropDiseaseDetect = '/api/v1/crops/disease/detect';

  // ── Market (:8004 → /api/v1/market) ────────────────────
  static const marketPrices = '/api/v1/market/prices/';
  static String marketPriceById(String id) => '/api/v1/market/prices/$id';
  static const marketMandis = '/api/v1/market/mandis/';
  static String marketMandiById(String id) => '/api/v1/market/mandis/$id';
  static const marketSchemes = '/api/v1/market/schemes/';
  static String marketSchemeById(String id) => '/api/v1/market/schemes/$id';
  static const marketSchemeEligibility =
      '/api/v1/market/schemes/check-eligibility';

  // ── Live Market (data.gov.in) ─────────────────────────
  static const liveMarketPrices = '/api/v1/market/live-market/prices';
  static const liveMarketPricesAllIndia =
      '/api/v1/market/live-market/prices/all-india';
  static const liveMarketMandis = '/api/v1/market/live-market/mandis';
  static const liveMarketMsp = '/api/v1/market/live-market/msp';
  static const liveMarketMspAll = '/api/v1/market/live-market/msp/all';
  static const liveMarketCommodities = '/api/v1/market/live-market/commodities';
  static const liveMarketStates = '/api/v1/market/live-market/states';

  // ── Weather + Soil (market service) ───────────────────
  static const marketWeatherCity = '/api/v1/market/weather/city';
  static const marketWeatherCoords = '/api/v1/market/weather/coords';
  static const marketWeatherForecastCity =
      '/api/v1/market/weather/forecast/city';
  static const marketWeatherForecastCoords =
      '/api/v1/market/weather/forecast/coords';
  static const marketWeatherFull = '/api/v1/market/weather/full';
  static const marketWeatherSoilComposition =
      '/api/v1/market/weather/soil-composition';
  static const marketSoilMoisture = '/api/v1/market/soil-moisture';

  // ── Document Builder ──────────────────────────────────
  static const docBuilderSchemes = '/api/v1/market/document-builder/schemes';
  static String docBuilderSchemeById(String id) =>
      '/api/v1/market/document-builder/schemes/$id';
  static const docBuilderStartSession =
      '/api/v1/market/document-builder/sessions/start';
  static String docBuilderGenerateSession(String sessionId) =>
      '/api/v1/market/document-builder/sessions/$sessionId/generate';
  static String docBuilderSubmitAnswers(String sessionId) =>
      '/api/v1/market/document-builder/sessions/$sessionId/answer';
  static String docBuilderExtractSession(String sessionId) =>
      '/api/v1/market/document-builder/sessions/$sessionId/extract';
  static String docBuilderDownloadSession(String sessionId) =>
      '/api/v1/market/document-builder/sessions/$sessionId/download';
  static const docBuilderExtractText =
      '/api/v1/market/document-builder/extract-text';
  static String docBuilderSessionById(String id) =>
      '/api/v1/market/document-builder/sessions/$id';
  static const docBuilderSchemeDocs =
      '/api/v1/market/document-builder/scheme-docs';
  static String docBuilderSchemeDocsByName(String schemeName) =>
      '/api/v1/market/document-builder/scheme-docs/$schemeName';
  static String docBuilderDownloadSchemeDocs(String schemeName) =>
      '/api/v1/market/document-builder/download-scheme-docs/$schemeName';
  static String docBuilderSchemeDocFile(String schemeName, String docName) =>
      '/api/v1/market/document-builder/scheme-docs/$schemeName/file/$docName';

  // ── Equipment (:8005 → /api/v1/equipment) ──────────────
  static const equipment = '/api/v1/equipment/';
  static const equipmentBrowse = '/api/v1/equipment/?browse=true';
  static String equipmentById(String id) => '/api/v1/equipment/$id';
  static const rentals = '/api/v1/equipment/rentals/';
  static String rentalById(String id) => '/api/v1/equipment/rentals/$id';
  static String rentalApprove(String id) =>
      '/api/v1/equipment/rentals/$id/approve';
  static String rentalReject(String id) =>
      '/api/v1/equipment/rentals/$id/reject';
  static String rentalComplete(String id) =>
      '/api/v1/equipment/rentals/$id/complete';
  static String rentalCancel(String id) =>
      '/api/v1/equipment/rentals/$id/cancel';
  static const livestock = '/api/v1/equipment/livestock/';
  static String livestockById(String id) => '/api/v1/equipment/livestock/$id';

  // ── Equipment Rental Rates ────────────────────────────
  static const equipmentRentalRates = '/api/v1/equipment/rental-rates/';
  static const equipmentRentalCategories =
      '/api/v1/equipment/rental-rates/categories';
  static String equipmentRentalByCategory(String category) =>
      '/api/v1/equipment/rental-rates/category/$category';
  static String equipmentRentalSearch(String query) =>
      '/api/v1/equipment/rental-rates/search?q=$query';
  static String equipmentRentalByState(String state) =>
      '/api/v1/equipment/rental-rates/state/$state';
  static String equipmentRentalByName(String name) =>
      '/api/v1/equipment/rental-rates/$name';
  static String equipmentMechanizationStats([String? state]) =>
      state == null || state.isEmpty
      ? '/api/v1/equipment/rental-rates/mechanization-stats'
      : '/api/v1/equipment/rental-rates/mechanization-stats?state=$state';
  static String equipmentRateHistory(String name, [String? state]) =>
      state == null || state.isEmpty
      ? '/api/v1/equipment/rental-rates/rate-history?equipment_name=$name'
      : '/api/v1/equipment/rental-rates/rate-history?equipment_name=$name&state=$state';

  // ── Agent (:8006 → /api/v1/agent) ─────────────────────
  static const agentChat = '/api/v1/agent/chat';
  static const agentChatPrepare = '/api/v1/agent/chat/prepare';
  static const agentChatFinalize = '/api/v1/agent/chat/finalize';
  static const agentSessions = '/api/v1/agent/sessions';
  static String agentSessionById(String id) => '/api/v1/agent/sessions/$id';
  static const agentSearch = '/api/v1/agent/search';

  // ── Voice (:8007 → /api/v1/voice) ─────────────────────
  static const voiceTts = '/api/v1/voice/tts';
  static const voiceTtsBase64 = '/api/v1/voice/tts/base64';
  static const voiceStt = '/api/v1/voice/stt';
  static const voiceCommand = '/api/v1/voice/command';
  static const voiceCommandText = '/api/v1/voice/command/text';

  // ── Notification (:8008 → /api/v1/notifications) ──────
  static const notifications = '/api/v1/notifications/';
  static const notificationsUnreadCount = '/api/v1/notifications/unread/count';
  static String notificationById(String id) => '/api/v1/notifications/$id';
  static String notificationRead(String id) => '/api/v1/notifications/$id/read';
  static const notificationReadAll = '/api/v1/notifications/read-all';
}
