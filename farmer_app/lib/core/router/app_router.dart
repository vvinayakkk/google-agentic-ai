import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../shared/providers/auth_provider.dart';
import '../../features/auth/screens/language_select_screen.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/splash_screen.dart';
import '../../features/onboarding/screens/fetching_location_screen.dart';
import '../../features/home/screens/choice_screen.dart';
import '../../features/home/screens/featured_screen.dart';
import '../../features/chat/screens/chat_screen.dart';
import '../../features/chat/screens/live_voice_screen.dart';
import '../../features/chat/screens/chat_history_screen.dart';
import '../../features/profile/screens/profile_screen.dart';
import '../../features/crop/screens/crop_cycle_screen.dart';
import '../../features/crop/screens/crop_intelligence_screen.dart';
import '../../features/crop/screens/crop_doctor_screen.dart';
import '../../features/crop/screens/crop_cycle_sub/contract_farming_screen.dart';
import '../../features/crop/screens/crop_cycle_sub/credit_sources_screen.dart';
import '../../features/crop/screens/crop_cycle_sub/crop_insurance_screen.dart';
import '../../features/crop/screens/crop_cycle_sub/market_strategy_screen.dart';
import '../../features/crop/screens/crop_cycle_sub/power_supply_screen.dart';
import '../../features/crop/screens/crop_cycle_sub/soil_health_screen.dart';
import '../../features/market/screens/market_prices_screen.dart';
import '../../features/market/screens/add_crop_listing_screen.dart';
import '../../features/equipment/screens/listing_details_screen.dart';
import '../../features/equipment/screens/my_bookings_screen.dart';
import '../../features/equipment/screens/earnings_screen.dart';
import '../../features/equipment/screens/equipment_hub_screen.dart';
import '../../features/equipment/screens/equipment_marketplace_screen.dart';
import '../../features/equipment/screens/rental_rate_detail_screen.dart';
import '../../features/equipment/screens/rental_ticket_screen.dart';
import '../../features/equipment/screens/my_equipment_screen.dart';
import '../../features/weather/screens/weather_screen.dart';
import '../../features/weather/screens/soil_moisture_screen.dart';
import '../../features/cattle/screens/cattle_screen.dart';
import '../../features/calendar/screens/calendar_screen.dart';
import '../../features/voice/screens/speech_to_text_screen.dart';
import '../../features/notifications/screens/notifications_screen.dart';
import '../../features/upi/screens/upi_screen.dart';
import '../../features/documents/screens/document_builder_screen.dart';
import '../../features/documents/screens/document_agent_screen.dart';
import '../../features/documents/screens/document_vault_screen.dart';
import '../../features/documents/screens/loan_application_screen.dart';
import '../../features/waste/screens/best_out_of_waste_screen.dart';
import '../../features/mental_health/screens/suicide_prevention_screen.dart';
import '../../features/farm_viz/screens/farm_visualizer_screen.dart';

/// Route path constants.
abstract final class RoutePaths {
  static const languageSelect = '/language-select';
  static const splash = '/splash';
  static const login = '/login';
  static const fetchingLocation = '/fetching-location';
  static const home = '/';
  static const featured = '/featured';
  static const chat = '/chat';
  static const liveVoice = '/live-voice';
  static const chatHistory = '/chat-history';
  static const profile = '/profile';
  static const cropCycle = '/crop-cycle';
  static const cropIntelligence = '/crop-intelligence';
  static const cropDoctor = '/crop-doctor';
  static const contractFarming = '/crop-cycle/contract-farming';
  static const creditSources = '/crop-cycle/credit-sources';
  static const cropInsurance = '/crop-cycle/crop-insurance';
  static const marketStrategy = '/crop-cycle/market-strategy';
  static const powerSupply = '/crop-cycle/power-supply';
  static const soilHealth = '/crop-cycle/soil-health';
  static const marketplace = '/marketplace';
  static const marketPrices = '/market-prices';
  static const addListing = '/add-listing';
  static const rental = '/rental';
  static const equipmentHub = '/equipment-hub';
  static const equipmentMarketplace = '/equipment-marketplace';
  static const rentalTicket = '/rental-ticket';
  static const rentalRateDetail = '/rental-rate-detail';
  static const myEquipment = '/my-equipment';
  static const listingDetails = '/listing-details';
  static const myBookings = '/my-bookings';
  static const earnings = '/earnings';
  static const weather = '/weather';
  static const soilMoisture = '/soil-moisture';
  static const cattle = '/cattle';
  static const calendar = '/calendar';
  static const speechToText = '/speech-to-text';
  static const notifications = '/notifications';
  static const upi = '/upi';
  static const documents = '/documents';
  static const documentBuilder = '/document-builder';
  static const documentBuild = '/document-build';
  static const documentVault = '/document-vault';
  static const documentAgent = '/document-agent';
  static const equipmentRentalRates = '/equipment-rental-rates';
  static const waste = '/waste';
  static const mentalHealth = '/mental-health';
  static const farmViz = '/farm-viz';
}

/// A thin ChangeNotifier that lets GoRouter re-evaluate its redirect without
/// rebuilding (and thus recreating) the GoRouter itself.
class _RouterChangeNotifier extends ChangeNotifier {
  void notify() => notifyListeners();
}

final routerProvider = Provider<GoRouter>((ref) {
  // IMPORTANT: do NOT watch authStateProvider here — that would recreate
  // GoRouter (resetting to initialLocation) on every auth-state change.
  // Instead, listen and poke the ChangeNotifier so GoRouter re-runs redirect.
  final notifier = _RouterChangeNotifier();
  ref.listen<AsyncValue>(authStateProvider, (_, __) => notifier.notify());
  ref.onDispose(notifier.dispose);

  return GoRouter(
    initialLocation: RoutePaths.splash,
    debugLogDiagnostics: false,
    refreshListenable: notifier,
    redirect: (context, state) {
      final authAsync = ref.read(authStateProvider);
      if (authAsync.isLoading || authAsync.value?.isLoading == true) {
        return null;
      }

      final isLoggedIn = authAsync.value?.isLoggedIn ?? false;
      // Splash and all auth screens are always reachable; guard everything else.
      final isAuthRoute =
          state.matchedLocation == RoutePaths.splash ||
          state.matchedLocation == RoutePaths.languageSelect ||
          state.matchedLocation == RoutePaths.login ||
          state.matchedLocation == RoutePaths.fetchingLocation;

      if (!isLoggedIn && state.matchedLocation == RoutePaths.fetchingLocation) {
        return RoutePaths.login;
      }
      if (!isLoggedIn && !isAuthRoute) return RoutePaths.login;
      return null;
    },
    routes: [
      // ── Auth ─────────────────────────────────────────
      GoRoute(
        path: RoutePaths.splash,
        builder: (_, __) => const SplashScreen(),
      ),
      GoRoute(
        path: RoutePaths.languageSelect,
        builder: (_, _) => const LanguageSelectScreen(),
      ),
      GoRoute(path: RoutePaths.login, builder: (_, _) => const LoginScreen()),
      GoRoute(
        path: RoutePaths.fetchingLocation,
        builder: (_, _) => const FetchingLocationScreen(),
      ),

      // ── Home ─────────────────────────────────────────
      GoRoute(path: RoutePaths.home, builder: (_, _) => const ChoiceScreen()),
      GoRoute(
        path: RoutePaths.featured,
        builder: (_, _) => const FeaturedScreen(),
      ),

      // ── Chat / Voice ─────────────────────────────────
      GoRoute(
        path: RoutePaths.chat,
        builder: (_, state) {
          final rawSession = state.uri.queryParameters['session'];
          final cleanedSession =
              (rawSession == null || rawSession.trim().isEmpty)
              ? null
              : rawSession.trim();
          return ChatScreen(
            agentType: state.uri.queryParameters['agent'] ?? 'crop',
            sessionId: cleanedSession,
            initialMessage: state.uri.queryParameters['q'],
          );
        },
      ),
      GoRoute(
        path: RoutePaths.liveVoice,
        builder: (_, _) => const LiveVoiceScreen(),
      ),
      GoRoute(
        path: RoutePaths.chatHistory,
        builder: (_, _) => const ChatHistoryScreen(),
      ),
      GoRoute(
        path: RoutePaths.speechToText,
        builder: (_, _) => const SpeechToTextScreen(),
      ),

      // ── Profile ──────────────────────────────────────
      GoRoute(
        path: RoutePaths.profile,
        builder: (_, _) => const ProfileScreen(),
      ),

      // ── Crop ─────────────────────────────────────────
      GoRoute(
        path: RoutePaths.cropCycle,
        builder: (_, _) => const CropCycleScreen(),
      ),
      GoRoute(
        path: RoutePaths.cropIntelligence,
        builder: (_, _) => const CropIntelligenceScreen(),
      ),
      GoRoute(
        path: RoutePaths.cropDoctor,
        builder: (_, _) => const CropDoctorScreen(),
      ),
      GoRoute(
        path: RoutePaths.contractFarming,
        builder: (_, _) => const ContractFarmingScreen(),
      ),
      GoRoute(
        path: RoutePaths.creditSources,
        builder: (_, _) => const CreditSourcesScreen(),
      ),
      GoRoute(
        path: RoutePaths.cropInsurance,
        builder: (_, _) => const CropInsuranceScreen(),
      ),
      GoRoute(
        path: RoutePaths.marketStrategy,
        builder: (_, _) => const MarketStrategyScreen(),
      ),
      GoRoute(
        path: RoutePaths.powerSupply,
        builder: (_, _) => const PowerSupplyScreen(),
      ),
      GoRoute(
        path: RoutePaths.soilHealth,
        builder: (_, _) => const SoilHealthScreen(),
      ),

      // ── Market ───────────────────────────────────────
      GoRoute(
        path: RoutePaths.marketplace,
        builder: (_, state) => MarketPricesScreen(
          initialSection: state.uri.queryParameters['section'],
          initialSchemeQuery: state.uri.queryParameters['scheme'],
        ),
      ),
      GoRoute(
        path: RoutePaths.marketPrices,
        builder: (_, state) => MarketPricesScreen(
          initialSection: state.uri.queryParameters['section'],
          initialSchemeQuery: state.uri.queryParameters['scheme'],
        ),
      ),
      GoRoute(
        path: RoutePaths.addListing,
        builder: (_, _) => const AddCropListingScreen(),
      ),

      // ── Equipment ────────────────────────────────────
      GoRoute(
        path: RoutePaths.rental,
        builder: (_, _) => const EquipmentHubScreen(),
      ),
      GoRoute(
        path: RoutePaths.equipmentHub,
        builder: (_, _) => const EquipmentHubScreen(),
      ),
      GoRoute(
        path: RoutePaths.equipmentMarketplace,
        builder: (_, state) => EquipmentMarketplaceScreen(
          initialCategory: state.uri.queryParameters['category'],
          initialState: state.uri.queryParameters['state'],
        ),
      ),
      GoRoute(
        path: RoutePaths.rentalTicket,
        builder: (_, state) =>
            RentalTicketScreen(rentalId: state.uri.queryParameters['id'] ?? ''),
      ),
      GoRoute(
        path: RoutePaths.rentalRateDetail,
        builder: (_, state) => RentalRateDetailScreen(
          equipmentName: state.uri.queryParameters['name'] ?? '',
          category: state.uri.queryParameters['category'],
        ),
      ),
      GoRoute(
        path: RoutePaths.myEquipment,
        builder: (_, _) => const MyEquipmentScreen(),
      ),
      GoRoute(
        path: RoutePaths.listingDetails,
        builder: (_, state) => ListingDetailsScreen(
          equipmentId: state.uri.queryParameters['id'] ?? '',
        ),
      ),
      GoRoute(
        path: RoutePaths.myBookings,
        builder: (_, _) => const MyBookingsScreen(),
      ),
      GoRoute(
        path: RoutePaths.earnings,
        builder: (_, _) => const EarningsScreen(),
      ),

      // ── Weather ──────────────────────────────────────
      GoRoute(
        path: RoutePaths.weather,
        builder: (_, _) => const WeatherScreen(),
      ),
      GoRoute(
        path: RoutePaths.soilMoisture,
        builder: (_, _) => const SoilMoistureScreen(),
      ),

      // ── Cattle / Calendar ────────────────────────────
      GoRoute(path: RoutePaths.cattle, builder: (_, _) => const CattleScreen()),
      GoRoute(
        path: RoutePaths.calendar,
        builder: (_, _) => const CalendarScreen(),
      ),

      // ── Other features ──────────────────────────────
      GoRoute(
        path: RoutePaths.notifications,
        builder: (_, _) => const NotificationsScreen(),
      ),
      GoRoute(path: RoutePaths.upi, builder: (_, _) => const UpiScreen()),
      GoRoute(
        path: RoutePaths.documents,
        builder: (_, _) => const DocumentBuilderScreen(),
      ),
      GoRoute(
        path: RoutePaths.documentBuilder,
        builder: (_, _) => const DocumentBuilderScreen(),
      ),
      GoRoute(
        path: RoutePaths.documentBuild,
        builder: (_, state) {
          final schemeId = (state.uri.queryParameters['scheme_id'] ?? '')
              .trim();
          final docType = state.uri.queryParameters['doc_type'];
          return LoanApplicationScreen(schemeId: schemeId, docType: docType);
        },
      ),
      GoRoute(
        path: RoutePaths.documentVault,
        builder: (_, _) => const DocumentVaultScreen(),
      ),
      GoRoute(
        path: RoutePaths.documentAgent,
        builder: (_, _) => const DocumentAgentScreen(),
      ),
      GoRoute(
        path: RoutePaths.equipmentRentalRates,
        builder: (_, _) => const EquipmentMarketplaceScreen(),
      ),
      GoRoute(
        path: RoutePaths.waste,
        builder: (_, _) => const BestOutOfWasteScreen(),
      ),
      GoRoute(
        path: RoutePaths.mentalHealth,
        builder: (_, _) => const SuicidePreventionScreen(),
      ),
      GoRoute(
        path: RoutePaths.farmViz,
        builder: (_, _) => const FarmVisualizerScreen(),
      ),
    ],
  );
});
