# Flutter Replication Report — Kisan Sahayak (Krishi Sarthi)

> Comprehensive analysis of the React Native (Expo) app at `MyApp/` for **exact UI replication in Flutter**.

---

## Table of Contents

1. [App Overview & Architecture](#1-app-overview--architecture)
2. [Navigation Flow & Screen Registry](#2-navigation-flow--screen-registry)
3. [Theme System](#3-theme-system)
4. [Localization (i18n)](#4-localization-i18n)
5. [State Management](#5-state-management)
6. [Auth Flow](#6-auth-flow)
7. [Screen-by-Screen Specification](#7-screen-by-screen-specification)
8. [Reusable Components](#8-reusable-components)
9. [Service Layer & API Endpoints](#9-service-layer--api-endpoints)
10. [Assets & Dependencies](#10-assets--dependencies)
11. [Flutter Architecture Recommendation](#11-flutter-architecture-recommendation)

---

## 1. App Overview & Architecture

| Property | Value |
|----------|-------|
| **App Name** | `kisan-sahayak` (display: "Krishi Sarthi") |
| **Framework** | React Native + Expo SDK 53 |
| **Entry Point** | `expo/AppEntry.js` → `App.jsx` |
| **Navigation** | `@react-navigation/stack` v7 (Stack Navigator) |
| **State Mgmt** | React Context + `useState`/`useEffect` + AsyncStorage |
| **Localization** | i18next + react-i18next (8 languages) |
| **Theme** | Custom ThemeContext (Light/Dark/System) |
| **API Base** | `http://10.67.206.37:8000` (main backend) |
| **Agent API** | `http://10.67.206.37:8001/agent` (AI agent) |
| **Audio Agent** | `http://10.67.206.37:8001/audio_agent` |
| **Farmer ID** | Hardcoded `f001` throughout |

### Root Component Tree
```
ThemeProvider
  └─ I18nextProvider
       └─ NavigationContainer (themed)
            └─ Stack.Navigator (headerShown: false)
                 ├─ LanguageSelectScreen (initial)
                 ├─ LoginScreen
                 ├─ FetchingLocationScreen
                 ├─ ChoiceScreen
                 ├─ ... (47 total screens)
                 └─ ThemeToggle (overlay, only on VoiceChatInputScreen)
```

---

## 2. Navigation Flow & Screen Registry

### Initial Flow (Linear)
```
LanguageSelectScreen → LoginScreen → FetchingLocationScreen → ChoiceScreen (Home Hub)
```

### Complete Screen Registry (47 screens in Stack Navigator)

| # | Screen Name | File Path | Presentation |
|---|-------------|-----------|--------------|
| 1 | `LanguageSelectScreen` | `screens/LanguageSelectScreen.jsx` | card (initial) |
| 2 | `LoginScreen` | `screens/LoginScreen.jsx` | card |
| 3 | `FetchingLocationScreen` | `screens/FetchingLocationScreen.jsx` | card |
| 4 | `ChoiceScreen` | `screens/ChoiceScreen.jsx` | card |
| 5 | `VoiceChatInputScreen` | `screens/VoiceChatInputScreen.jsx` | card |
| 6 | `LiveVoiceScreen` | `screens/LiveVoiceScreen.jsx` | card |
| 7 | `Featured` | `screens/Featured.jsx` | card |
| 8 | `ChatHistoryScreen` | `screens/ChatHistoryScreen.jsx` | card |
| 9 | `CropCycle` | `screens/CropCycle.jsx` | card |
| 10 | `CalenderScreen` | `screens/CalenderScreen.jsx` | card |
| 11 | `CattleScreen` | `screens/CattleScreen.jsx` | card |
| 12 | `MarketplaceScreen` | `screens/MarketplaceScreen.jsx` | card |
| 13 | `UPI` | `screens/UPI.jsx` | card |
| 14 | `CropDoctor` | `screens/CropDoctor.jsx` | card |
| 15 | `DocumentAgentScreen` | `screens/DocumentAgentScreen.jsx` | card |
| 16 | `WeatherScreen` | `screens/WeatherScreen.jsx` | card |
| 17 | `SoilMoistureScreen` | `screens/SoilMoistureScreen.jsx` | card |
| 18 | `FarmerProfileScreen` | `screens/FarmerProfileScreen.jsx` | card |
| 19 | `Profile` | `screens/Profile.jsx` | card |
| 20 | `RentalScreen` | `screens/RentalScreen.jsx` | card |
| 21 | `BestOutOfWasteScreen` | `screens/BestOutOfWasteScreen.jsx` | card |
| 22 | `SuicidePrevention` | `screens/SuicidePrevention.jsx` | card |
| 23 | `SettingsScreen` | `screens/SettingsScreen.jsx` | card |
| 24 | `CropIntelligenceScreenNew` | `screens/CropIntelligenceScreenNew.jsx` | card |
| 25 | `FarmVisualizerScreen` | `screens/FarmVisualizerScreen.jsx` | card |
| 26 | `NewMarketPricesScreen` | `screens/NewMarketPricesScreen.jsx` | card |
| 27 | `Earnings` | `screens/Earnings.jsx` | card |
| 28 | `MyBookings` | `screens/MyBookings.jsx` | card |
| 29 | `ListingDetails` | `screens/ListingDetails.jsx` | card |
| 30 | `SpeechToTextScreen` | `screens/SpeechToTextScreen.jsx` | card |
| 31 | `FollowUpScreen` | `screens/FollowUpScreen.jsx` | **transparentModal** |
| 32 | `PayAnyoneScreen` | (inside `UPI.jsx`) | card |
| 33 | `ContactUPIDetailScreen` | (inside `UPI.jsx`) | card |
| 34 | `PaymentAmountScreen` | (inside `UPI.jsx`) | card |
| 35 | `BankSelectScreen` | (inside `UPI.jsx`) | card |
| 36 | `EnterPinScreen` | (inside `UPI.jsx`) | card |
| 37 | `PaymentSuccessScreen` | (inside `UPI.jsx`) | card |
| 38 | `PaymentProcessingScreen` | (inside `UPI.jsx`) | card |
| 39 | `BankTransferScreen` | (inside `UPI.jsx`) | card |
| 40 | `MobileRechargeScreen` | (inside `UPI.jsx`) | card |
| 41 | `ContractFarmingScreen` | `screens/cropcycle/ContractFarmingScreen.jsx` | card |
| 42 | `CreditSourcesScreen` | `screens/cropcycle/CreditSourcesScreen.jsx` | card |
| 43 | `CropInsuranceScreen` | `screens/cropcycle/CropInsuranceScreen.jsx` | card |
| 44 | `MarketStrategyScreen` | `screens/cropcycle/MarketStrategyScreen.jsx` | card |
| 45 | `PowerSupplyScreen` | `screens/cropcycle/PowerSupplyScreen.jsx` | card |
| 46 | `SoilHealthScreen` | `screens/cropcycle/SoilHealthScreen.jsx` | card |
| 47 | `*_new` variants | `screens/cropcycle/*_new.jsx` (6 files) | card |

### Navigation Actions Used
- `navigation.reset({ index: 0, routes: [{ name: 'X' }] })` — for auth flow (no back)
- `navigation.navigate('ScreenName', { params })` — standard push
- `navigation.goBack()` — pop
- `navigation.replace('ScreenName')` — replace current

---

## 3. Theme System

### Architecture
- **Provider**: `context/ThemeContext.jsx` → `ThemeProvider` wrapping entire app
- **Hook**: `useTheme()` returns `{ theme, isDark, mode, setMode, toggleTheme }`
- **Persistence**: AsyncStorage key `appThemePreference`
- **Modes**: `'light'`, `'dark'`, `'system'`
- **System Detection**: `Appearance.addChangeListener` from React Native

### Light Theme Colors
```dart
// Flutter equivalent
static const lightTheme = {
  background: Color(0xFFC8E6C9),      // Soft green
  text: Color(0xFF111827),
  textSecondary: Color(0xFF4B5563),
  primary: Color(0xFF10B981),          // Emerald green (brand)
  surface: Color(0xFFF6F7F9),
  card: Color(0xFFFFFFFF),
  border: Color(0xFFE2E8F0),
  success: Color(0xFF22C55E),
  danger: Color(0xFFFF5722),
  warning: Color(0xFFF59E0B),
  info: Color(0xFF3B82F6),
  accent: Color(0xFFA855F7),
  muted: Color(0xFF9CA3AF),
  headerBackground: Color(0xFFC8E6C9),
  headerTitle: Color(0xFF111827),
  headerTint: Color(0xFF10B981),
  statusBarStyle: Brightness.dark,     // 'dark-content'
};
```

### Dark Theme Colors
```dart
static const darkTheme = {
  background: Color(0xFF121212),
  text: Color(0xFFFFFFFF),
  textSecondary: Color(0xFFA1A1AA),
  primary: Color(0xFF10B981),          // Same emerald
  surface: Color(0xFF1A1A1A),
  card: Color(0xFF1F2937),
  border: Color(0xFF374151),
  success: Color(0xFF22C55E),
  danger: Color(0xFFFF5722),
  warning: Color(0xFFF59E0B),
  info: Color(0xFF3B82F6),
  accent: Color(0xFFA855F7),
  muted: Color(0xFF6B7280),
  headerBackground: Color(0xFF121212),
  headerTitle: Color(0xFFFFFFFF),
  headerTint: Color(0xFF10B981),
  statusBarStyle: Brightness.light,    // 'light-content'
};
```

### Spacing System
```dart
class AppSpacing {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double xxl = 32;
}
```

### Border Radii
```dart
class AppRadius {
  static const double sm = 6;
  static const double md = 12;
  static const double lg = 20;
  static const double xl = 28;
}
```

### Typography Sizes
```dart
class AppTypography {
  static const double xs = 12;
  static const double sm = 14;
  static const double md = 16;
  static const double lg = 18;
  static const double xl = 22;
  static const double xxl = 28;
  static const double display = 52;
}
```

---

## 4. Localization (i18n)

### Setup
- Library: `i18next` + `react-i18next` (Flutter: use `flutter_localizations` + `intl` or `easy_localization`)
- Compatibility: JSON v3
- Storage: AsyncStorage key `appLanguage`

### 8 Supported Languages

| Code | Language | Flag | JSON File |
|------|----------|------|-----------|
| `en` | English | 🇺🇸 | `languages_json/en.json` |
| `hi` | हिन्दी (Hindi) | 🇮🇳 | `languages_json/hi.json` |
| `bn` | বাংলা (Bengali) | 🇧🇩 | `languages_json/bn.json` |
| `gu` | ગુજરાતી (Gujarati) | 🇮🇳 | `languages_json/gu.json` |
| `mr` | मराठी (Marathi) | 🇮🇳 | `languages_json/mr.json` |
| `ta` | தமிழ் (Tamil) | 🇮🇳 | `languages_json/ta.json` |
| `te` | తెలుగు (Telugu) | 🇮🇳 | `languages_json/te.json` |
| `kn` | ಕನ್ನಡ (Kannada) | 🇮🇳 | `languages_json/kn.json` |

### Key Translation Namespaces (from en.json — 1105 lines)
- `common.*` — General UI strings
- `login.*` — Login/OTP screen
- `choice.*` — Home hub
- `voicechat.*` — Text chat screen
- `livevoice.*` — Voice chat screen
- `cattle.*` — Cattle management
- `calendar.*` — Calendar
- `cropdoctor.*` — Crop doctor
- `cropintel.*` / `crop_intelligence.*` — Crop intelligence
- `weather.*` / `soil.*` — Weather & soil
- `marketplace.*` — Marketplace
- `marketprices.*` — Market prices
- `suicide.*` — Suicide prevention
- `featured.*` — Features hub
- `chathistory.*` — Chat history
- `documentagent.*` — Document agent
- `upi.*` — UPI payment practice
- `bestout.*` — Best out of waste
- `earnings.*` — Earnings/Khaata book
- `cropcycle.*` — Crop cycle
- `followup.*` — Follow-up modal
- `languageselect.*` — Language selection
- `location.*` — Location/map screen
- `components.*` — Component labels
- `permission.*` — Permission strings

---

## 5. State Management

### Pattern
- **No Redux/MobX/Riverpod equivalent** — Pure React Context + local `useState`
- **ThemeContext**: Global theme state
- **AsyncStorage**: Persistent cache for:
  - `appThemePreference` — theme mode
  - `appLanguage` — selected language
  - `chat_messages_<chatId>` — chat messages
  - `weather-cache`, `forecast-cache`, `air-quality-cache` — weather data
  - `soilMoistureDataCache` — soil data
  - `market-prices-cache` — market prices
  - `cropcycle_dashboard_data` — crop cycle dashboard
  - `crop-combos-cache`, `ai-recommendations-cache` — crop intelligence
  - Various onboarding keys: `onboardingComplete_<screenName>`

### Flutter Recommendation
Use **Riverpod** or **Provider** for state management:
- `ThemeNotifier` (equivalent to ThemeContext)
- `LocaleNotifier` (equivalent to i18n context)
- `SharedPreferences` (equivalent to AsyncStorage)
- Per-screen state with `StateNotifier` or `ChangeNotifier`

---

## 6. Auth Flow

### Login Screen (`LoginScreen.jsx`, 552 lines)

**Step 1: Phone Input**
- Country code: `🇮🇳 +91` (fixed, India only)
- Phone input: 10-digit validation
- Button: "Send Verification Code"
- Leaf logo icon at top (Ionicons `leaf`)
- Animated fade-in/slide-up transitions

**Step 2: OTP Verification**
- 6 individual digit boxes with auto-focus advancement
- Fake OTP auto-fill: `"123456"` (simulated, no real SMS)
- SMS permission modal (cosmetic only)
- Resend timer: 14 seconds countdown
- Button: "Continue"

**API Calls**
- `GET ${API_BASE}/farmer/f001/profile` — fetch farmer profile
- `PUT ${API_BASE}/farmer/f001/profile` — update profile (background, fire-and-forget)

**On Success**
```
navigation.reset({ index: 0, routes: [{ name: 'FetchingLocationScreen' }] })
```

---

## 7. Screen-by-Screen Specification

### 7.1 LanguageSelectScreen
**File**: `screens/LanguageSelectScreen.jsx`  
**Purpose**: First screen — language selection  
**UI**:
- `SafeAreaView` with themed background
- StatusBar themed
- Card container (white/surface, rounded corners, shadow)
- Greeting text: "Hello Farmer," (translated)
- Subtext: "Please choose your language"
- 8 language buttons as selectable list items, each with:
  - Flag emoji (🇺🇸/🇮🇳/🇧🇩)
  - Language name (native + English)
  - Radio-button style selection indicator
- "Next" button at bottom (primary color, rounded)
- On press: `setLanguage(code)` → `navigation.reset → LoginScreen`

---

### 7.2 LoginScreen
**File**: `screens/LoginScreen.jsx` (552 lines)  
**Purpose**: Phone + OTP authentication  
**UI**:
- Animated leaf icon at top
- Title: "Welcome Back"
- Subtitle: "Enter your phone number to continue"
- Phone input row: `[🇮🇳 +91] [__________]`
- Send Code button (primary, full width, rounded)
- OTP view: 6 boxes in a row, each 48×56, rounded, border
- Auto-fill animation (digits appear one by one with 200ms delay)
- Resend code with countdown timer (14s)
- Continue button

---

### 7.3 FetchingLocationScreen
**File**: `screens/FetchingLocationScreen.jsx` (1060 lines)  
**Purpose**: Location permission + farm boundary selection + analysis  

**Phase 1: Preloader**
- Full-screen animated "farmer" word in 8 Indian languages cycling
- Fade in/out with 800ms timing

**Phase 2: Map View**
- `MapView` (react-native-maps) showing current location
- User taps 4 points to define farm boundary (Polygon)
- Area calculation in acres displayed
- Marker for each point

**Phase 3: Analysis Progress**
- 5 sequential analysis steps with progress indicators:
  1. "Analyzing Farm Land"
  2. "Analyzing Soil Conditions"
  3. "Fetching Nearby Mandi Prices"
  4. "Getting Latest Weather Updates"
  5. "Finalizing Personalized Insights"
- `LinearGradient` background effects
- On complete: navigate to `ChoiceScreen`

---

### 7.4 ChoiceScreen (Home Hub)
**File**: `screens/ChoiceScreen.jsx` (923 lines)  
**Purpose**: Main navigation hub  
**UI Layout**:
```
┌─────────────────────────────┐
│ [🌐 Lang] [App Logo] [⚙️]  │ ← Header
│                             │
│  ┌─────────────────────┐    │
│  │  🎤 Voice Pilot     │    │ ← Primary CTA (green gradient)
│  │  hands-free mode    │    │
│  └─────────────────────┘    │
│                             │
│         — OR —              │
│                             │
│  ┌─────────────────────┐    │
│  │  ✋ Manual Mode      │    │ ← Secondary CTA
│  │  text interaction   │    │
│  └─────────────────────┘    │
│                             │
│  Quick Access:              │
│  [♻️ Waste] [📈 Market]    │
│                             │
│                    [❓ FAB] │ ← Help floating button
└─────────────────────────────┘
```

**Key Details**:
- App logo: `assets/logo.png` (light) / `assets/logo_light.png` (dark), 270×280
- Language globe icon: orange `#FF6B00`
- Settings gear icon: blue `#0D47A1`
- Language dropdown modal with 8 languages + flags
- Voice Pilot → navigates to `LiveVoiceScreen`
- Manual Mode → creates chat session via `POST /farmer/f001/chat`, then → `VoiceChatInputScreen`
- Quick Access buttons: `BestOutOfWasteScreen`, `MarketplaceScreen`
- Interactive onboarding tooltip guide (6 steps)
- Help FAB (bottom-right, position absolute)

---

### 7.5 VoiceChatInputScreen (Text Chat)
**File**: `screens/VoiceChatInputScreen.jsx` (1428 lines)  
**Purpose**: AI text chat with message history  

**Header Bar**:
```
[🕐 History] [Title: "Kisaan AI"] [⭐ Featured] [👤 Profile]
```

**Empty State (FeaturesView)**:
- "What can I help with?" title
- Pill-shaped feature buttons (2-column grid):
  - Marketplace, Calendar, Cattle Schedule, Farm Visualizer
  - Crop Cycle, Weather, Crop Intelligence, EduFinance  
  - Document Builder, Crop Doctor, Rental system
- Each pill: icon + label, rounded, themed

**Chat Messages**:
- User messages: right-aligned, card background, rounded
- AI messages: left-aligned with ⭐ icon, markdown rendered (`react-native-markdown-display`)
- AI message action row: 👍 Like, 👎 Dislike, 📤 Share, 📋 Copy

**Input Bar** (bottom):
```
[+ Doc] [📷 Image] [_________input________] [➤ Send]
```
- Document attachment via `expo-document-picker` (base64)
- Image attachment via `expo-image-picker` (base64)
- Send button (primary color)

**Floating Elements**:
- Home button (bottom-right, floating)
- `+ New Chat` button (add-circle icon)
- ThemeToggle overlay (only on this screen, top:45, right:6)

**API**: `POST http://10.67.206.37:8001/agent`
```json
{
  "user_prompt": "...",
  "metadata": { "farmer_id": "f001" },
  "user_id": "f001",
  "session_id": "<chat_id>"
}
```
- Rate limit handling (429) with exponential backoff
- Interactive onboarding (8 steps)

---

### 7.6 LiveVoiceScreen
**File**: `screens/LiveVoiceScreen.jsx` (1768 lines)  
**Purpose**: Full-screen voice interaction with AI  

**Layout**:
```
┌─────────────────────────────┐
│ ● Connected    Kisaan AI    │ ← Network status + title
│                             │
│  ╔═══════════════════════╗  │
│  ║  Waveform Animation   ║  │ ← 20 vertical bars animating
│  ║  (during recording)   ║  │
│  ╚═══════════════════════╝  │
│                             │
│  [Question Asked]           │ ← User's question text
│  [AI Response]              │ ← AI response text
│  [▶ Play] [🔇 Mute]        │ ← Audio controls
│                             │
│  Action Tags:               │
│  [🌡 Temp] [☁ Weather]     │
│  [💰 Prices] [👤 Profile]   │
│  [🐄 Livestock] [🌾 Crops]  │
│  [📅 Calendar] [📊 Market]  │
│                             │
│  ┌──────────────────────┐   │
│  │ Conversation History  │   │ ← Expandable history
│  └──────────────────────┘   │
│                             │
│ ┌─ Bottom Bar (gradient) ──┐│
│ │[End] [Pause] [🎙 MIC] [X]││ ← Controls
│ └──────────────────────────┘│
└─────────────────────────────┘
```

**Key Details**:
- Network indicator: green dot = connected
- Waveform: 20 animated vertical bars (Animated.Value for each bar height)
- Recording via `expo-av` `Audio.Recording`
- Bottom bar gradient: `['#2b526f', '#2b9fdeff', '#4cabd9']`
- Mic button: white circle (80×80), red when recording, yellow when processing
- End button: orange, Pause: gray, Exit: red
- Welcome screen with example questions on first load
- Onboarding modal + interactive guide

**API**: `POST http://10.67.206.37:8001/audio_agent` (FormData)
```
audio_file: <file>
user_id: "f001"
session_id: "<uuid>"
metadata: { farmer_id: "f001" }
```
- Response includes text + audio URL for playback

---

### 7.7 Featured (Tools Hub)
**File**: `screens/Featured.jsx` (669 lines)  
**Purpose**: Feature/tools listing screen  

**Layout**:
- Header: "Agri-Suite Features"
- Quick Actions row: Market Prices, Farming Calendar
- Tools list (each tool = card with icon bg, title, subtitle):

| Tool | Icon BG | Screen |
|------|---------|--------|
| Crop Doctor | emerald | `CropDoctor` |
| Crop Cycle | blue | `CropCycle` |
| Weather | sky blue | `WeatherScreen` |
| Cattle Care | amber | `CattleScreen` |
| AgriFinance | violet | `UPI` |
| Rental System | orange | `RentalScreen` |
| Document Builder | indigo | `DocumentAgentScreen` |

- Interactive onboarding (10 steps)

---

### 7.8 ChatHistoryScreen
**File**: `screens/ChatHistoryScreen.jsx` (763 lines)  
**Purpose**: List of past chat conversations  

**UI**:
- Header: "Chat History" with subtitle
- Filter bar: All, Today, This Week, This Month, Last 3 Months, This Year, Last Year
- Grouped sections: Today, Yesterday, This Week, Last Week, This Month, Last Month, Earlier
- Each chat item: title, date, preview
- Swipe/tap actions: Open, Rename (Alert.prompt), Delete (confirmation)
- Uses `date-fns` for date grouping/filtering

**API**: `GET ${API_BASE}/farmer/f001/chat`

---

### 7.9 CropCycle
**File**: `screens/CropCycle.jsx` (2216 lines)  
**Purpose**: Multi-step crop cycle management wizard  

**Phases**:
1. **Crop Selection**: Available crops grid, select one
2. **Farm Details**: Land size, irrigation method, tools
3. **Dashboard**: Comprehensive analysis results

**Dashboard Sections** (navigable sub-screens):
- Analysis & Insights → AI crop analysis
- Corporate Buyers → `ContractFarmingScreen`
- Loan Schemes → `CreditSourcesScreen`
- Insurance Plans → `CropInsuranceScreen`
- Certifications → within Contract Farming
- Solar Schemes → `PowerSupplyScreen`
- Mandi Info → `MarketStrategyScreen`
- Government Schemes → `MarketStrategyScreen`
- Soil Health → `SoilHealthScreen`

**API**: `CropCycleService` (see Service Layer section)  
**Cache**: `cropcycle_dashboard_data` in AsyncStorage

---

### 7.10 CalenderScreen
**File**: `screens/CalenderScreen.jsx` (1033 lines)  
**Purpose**: Farm calendar with events and AI insights  

**UI**:
- Custom calendar grid (7 columns, month navigation)
- Day cells: number + event dot indicator (color = priority)
- AI insights carousel at top (4 cards: irrigation, crop growth, pest alert, weather)
- Events list below calendar for selected date
- Add event modal: manual entry or AI-generated via voice
- Event types: irrigation, planting, livestock, treatment, harvest
- Priority indicators: high=red, normal=green

**APIs**: Calendar events CRUD at `${API_BASE}/farmer/f001/calendar`

---

### 7.11 CattleScreen
**File**: `screens/CattleScreen.jsx` (1441 lines)  
**Purpose**: Livestock management  

**UI**:
- Header: "My Cattle" + "AI-Powered Suggestions" subtitle + LIVE badge
- Livestock list: expandable cards with animal info
  - Name, breed, age, type, icon emoji, color, health status
  - Last checkup date, milk/egg capacity
  - Edit/Delete buttons per card
- Add animal FAB (+)
- Add/Edit modal: name, breed, age, type, icon picker, color picker, health, checkup date, capacity
- Calendar updates section for livestock care
- AI Space Suggestions section:
  - Upload photo of field/barn
  - Get AI optimization tips
- Onboarding (8 steps)

**APIs**:
- `GET/POST/PUT/DELETE ${API_BASE}/farmer/f001/livestock`
- `POST ${API_BASE}/farmer/f001/livestock/space-suggestions` (image upload)

---

### 7.12 MarketplaceScreen
**File**: `screens/MarketplaceScreen.jsx` (4686 lines — largest screen)  
**Purpose**: Full marketplace with market data, listings, AI combos  

**Tabs**: Market Prices, My Listings

**Market Prices View**:
- Crop cards: Wheat, Rice, Corn with prices, % change, volume
- Real mandi data integration
- Filter: state, district, price range
- Export: PDF generation (`expo-print`, `expo-sharing`)

**My Listings View**:
- User's crop listings with views/inquiries count
- Add/Edit listing modal (name, quantity, price, emoji)
- Delete with confirmation

**AI Combo Plans**:
- Premium Mumbai Combo, Konkan Coastal Combo, Quick Nashik Returns
- Each with investment, returns, ROI

**API**: `CropMarketplaceService` + `${API_BASE}/market/prices`

---

### 7.13 UPI (Payment Practice)
**File**: `screens/UPI.jsx` (1507 lines)  
**Purpose**: Google Pay-style UPI practice interface  

**IMPORTANT**: Fixed dark theme (#000000 background), NOT using app theme

**Main Screen Layout** (Google Pay clone):
- Profile avatar + name + UPI ID
- Search bar: "Pay by name or phone number"
- Quick Actions grid: Scan QR, Pay Anyone, Bank Transfer, Mobile Recharge
- UPI Lite banner
- People section (contact avatars)
- Bills & Recharges: Jio, Mobile, DTH, Electricity, LIC, Loan EMI, Postpaid, Credit Cards
- App icons row: Google Cloud, Play, MakeMyTrip
- Offers & Rewards section
- Loan banner

**Sub-screens** (all defined within UPI.jsx, registered as separate screens):
1. `PayAnyoneScreen` — contact list + search + pay
2. `ContactUPIDetailScreen` — contact details + actions
3. `PaymentAmountScreen` — enter amount + note
4. `BankSelectScreen` — choose bank account
5. `EnterPinScreen` — 4-digit UPI PIN entry (correct PIN: "1234")
6. `PaymentSuccessScreen` — success with reward scratch card
7. `PaymentProcessingScreen` — processing animation
8. `BankTransferScreen` — account number + IFSC
9. `MobileRechargeScreen` — operator select + amount

**Mock QR Scan Flow**: Camera → Form → PIN → Success

---

### 7.14 CropDoctor
**File**: `screens/CropDoctor.jsx` (1088 lines)  
**Purpose**: AI crop disease diagnosis from image  

**UI**:
- Upload area: Take Photo / Choose from Gallery
- Supported formats note
- Loading animation: leaf icon rotation + bouncing dots
- Results: accordion-style expandable sections
  - Disease name + confidence score
  - Description, Symptoms, Solutions
- Actions: Speak Analysis (expo-speech), Follow Up → `FollowUpScreen`

**API**: `POST ${API_BASE}/crop-doctor/analyze` (FormData with image)

---

### 7.15 DocumentAgentScreen
**File**: `screens/DocumentAgentScreen.jsx` (1893 lines)  
**Purpose**: Government scheme browser + document builder  

**Government Schemes** (hardcoded cards):
| Scheme | Description |
|--------|-------------|
| PM-KISAN | ₹6,000/year income support |
| PMFBY | Crop insurance scheme |
| Soil Health Card | Soil testing program |
| PMKSY | Irrigation scheme |
| MahaDBT | Maharashtra direct benefit |

Each scheme card shows: eligibility, required documents, key benefits, helpline

**Features**:
- PDF generation + sharing
- ViewShot for screenshots
- MicOverlay for voice interaction
- Form image display for PM-KISAN

---

### 7.16 WeatherScreen
**File**: `screens/WeatherScreen.jsx` (502 lines)  
**Purpose**: Weather dashboard with AI analysis  

**UI**:
- Current conditions card: temp, description, icon
- Location name + "Your Farm" label
- Stats row: Humidity, Wind speed
- 5-day forecast horizontal scroll
- Air quality section: AQI, CO, NO₂, O₃, PM2.5, PM10
- AI Weather Insights: markdown rendered analysis
- Search bar for custom location
- BlurView + LinearGradient background effects

**APIs**:
- `GET ${API_BASE}/weather/coords?lat=X&lon=Y`
- `GET ${API_BASE}/weather/forecast/coords?lat=X&lon=Y`
- `GET ${API_BASE}/weather/air_quality?lat=X&lon=Y`
- `GET ${API_BASE}/weather/ai-analysis?lat=X&lon=Y`

---

### 7.17 SoilMoistureScreen
**File**: `screens/SoilMoistureScreen.jsx` (835 lines)  
**Purpose**: Soil moisture data with filters and AI suggestions  

**UI**:
- Header: "Soil Moisture"
- Stats bar: Records count, Avg Moisture
- Filters: State picker, District picker
- Data cards: agency, moisture at 15cm, location
- AI Assistant button → modal with AI suggestions (markdown)

**APIs**:
- `GET ${API_BASE}/soil-moisture`
- `POST ${API_BASE}/soil-moisture/ai-suggestion`

---

### 7.18 FarmerProfileScreen
**File**: `screens/FarmerProfileScreen.jsx` (1601 lines)  
**Purpose**: Comprehensive farmer profile with wizard  

**Profile Building Wizard** (4 steps):
1. Farm location (village, district, state)
2. Primary crops (multi-select)
3. Livestock (add animals)
4. Experience level

**Profile View**:
- Avatar/photo, name, phone
- Farm details section (location, area, irrigation)
- Crops section (list with edit/delete)
- Livestock section (list with edit/delete)
- Calendar events section
- Voice input simulation
- Edit mode for all fields

**APIs**:
- `GET/PUT ${API_BASE}/farmer/f001/profile`
- `GET/POST/PUT/DELETE ${API_BASE}/farmer/f001/crops`
- `GET/POST/PUT/DELETE ${API_BASE}/farmer/f001/livestock`
- `GET ${API_BASE}/farmer/f001/calendar`

---

### 7.19 Profile
**File**: `screens/Profile.jsx` (938 lines)  
**Purpose**: Simpler profile display (accessed from chat screen profile icon)  
**Similar to FarmerProfileScreen** but streamlined — profile display + edit, crops, livestock, events

---

### 7.20 RentalScreen
**File**: `screens/RentalScreen.jsx` (1332 lines)  
**Purpose**: Equipment rental marketplace  

**UI**:
- Search bar
- Featured rentals horizontal scroll
- Category filters
- Equipment cards: image, category badge, status, rating, price, "Book" button
- My Activity section (My Bookings, Earnings links)

**API**: `EnhancedRentalService`
- `GET /rental/search`, `/rental/featured`, `/rental/activity`
- `POST /rental/book`, `/rental/list`
- Booking management CRUD

---

### 7.21 BestOutOfWasteScreen
**File**: `screens/BestOutOfWasteScreen.jsx` (896 lines)  
**Purpose**: AI-powered waste recycling suggestions  

**UI**:
- Header: "♻️ Best Out of Waste" + "AI-powered recycling suggestions"
- Image upload area (take photo / pick from gallery)
- "Analyze with AI" button
- AI Suggestions section: numbered suggestion cards
- Common Practices carousel:
  - Each practice: icon emoji, title, difficulty, time required
  - Modal with full details + steps
- LinearGradient practice cards

**API**: `WasteRecyclingService`
- `POST /waste-recycling/analyze-waste` (FormData with image)
- `GET /waste-recycling/common-practices`

---

### 7.22 SuicidePrevention
**File**: `screens/SuicidePrevention.jsx` (522 lines)  
**Purpose**: Mental health helpline directory  

**UI**:
- Banner: "Need Immediate Help?" + "Call 988"
- Info text: "You're Not Alone"
- 6 Helpline cards:
  1. National Crisis Helpline — 988
  2. Crisis Text Line — 741741
  3. Vandrevala Foundation — 1860-2662-345
  4. iCall Helpline — 9152987821
  5. Sneha Foundation — 044-24640050
  6. AASRA — 91-22-27546669
- Each card: name, description, phone icon tap → `Linking.openURL(tel:...)`
- Emergency call button (100) at bottom
- Additional resources: Online Support Groups, Mental Health Resources, Find Local Services

**API**: `SuicidePreventionService`
- `POST /suicide-prevention/emergency-call`
- `GET /suicide-prevention/helplines`

---

### 7.23 SettingsScreen
**File**: `screens/SettingsScreen.jsx` (222 lines)  
**Purpose**: App settings  

**Sections**:
1. **Appearance**: Light/Dark toggle pills (active pill has primary bg)
2. **Language**: Picker with 8 language options
3. **Privacy**: Policy, Terms, Data Preferences (placeholder)
4. **Support**: Contact Us, Help Center (placeholder)
5. **Version**: v3.1.0
6. **Reset to defaults** option

---

### 7.24 CropIntelligenceScreenNew
**File**: `screens/CropIntelligenceScreenNew.jsx` (1597 lines) + `.styles.js`  
**Purpose**: Weather + crop combinations + AI recommendations  

**UI**:
- Back button + location text
- Weather dashboard: temp, humidity, wind, air quality, soil moisture
- 5-day forecast horizontal scroll
- Tabs: "Crop Combos" | "AI Recommendations"
- Crop Combos: cards with season, difficulty, success rate, investment, returns, ROI
- Combo detail modal with crops, advantages, challenges
- Edit combo modal
- AI Recommendations: "Generate Master Plan" button → AI analysis cards
- Uses expo-location for coordinates
- Onboarding (5 steps)

**APIs**: Weather + soil + AI endpoints (see API section)

---

### 7.25 FarmVisualizerScreen
**File**: `screens/FarmVisualizerScreen.jsx` (2483 lines)  
**Purpose**: Isometric farm simulation game  

**IMPORTANT**: This is a full farm management game/simulator — NOT a standard data screen.

**Game Features**:
- 16×16 tile grid (soil, farmhouse, well, silo, forest)
- Tools toolbar: Inspect, Plow, Plant, Water, Fertilize, Pesticide, Harvest
- Farmer profile: name, level, XP, wallet, energy
- Time system: hour/minute, day, month, season
- Weather system with forecast
- Farm ecosystem: soil health, water table, biodiversity
- Inventory: seeds (wheat, corn, rice, tomato), resources
- Market system with price trends
- Quests & events
- Factions & reputation
- Pinch/pan gesture handlers for map navigation

---

### 7.26 NewMarketPricesScreen
**File**: `screens/NewMarketPricesScreen.jsx` (280 lines)  
**Purpose**: Live mandi market prices (can be embedded)  

**UI**:
- Search input for commodity
- Animated list items (fade+slide)
- Market cards: crop emoji, commodity name, market name, modal price, variety, min/max prices
- Cached data via AsyncStorage

**API**: `GET ${API_BASE}/market/prices?state=X&commodity=Y&district=Z`

---

### 7.27 Earnings
**File**: `screens/Earnings.jsx` (hardcoded data)  
**Purpose**: Khaata Book (ledger) for rental earnings  

**UI**:
- Header: "Khaata Book"
- Summary card: Total Credit, Total Debit, Balance
- Transaction list with running balance
  - Credit items: green, with equipment name, date, note
  - Debit items: red left border accent
- Each entry shows running balance

---

### 7.28 MyBookings
**File**: `screens/MyBookings.jsx` (hardcoded data)  
**Purpose**: Equipment booking history  

**UI**:
- Header: "My Bookings" with back button
- Booking cards: equipment name, date range, status badge, price
- Status colors: Confirmed=green, Completed=blue, Cancelled=red

---

### 7.29 ListingDetails
**File**: `screens/ListingDetails.jsx`  
**Purpose**: Equipment rental detail view  

**UI**:
- Back button + "Details" header
- Equipment image (full width, rounded)
- Title, category (primary color), description
- Meta rows: location, rating, price + unit
- "Book Now" button (primary, rounded)

---

### 7.30 SpeechToTextScreen
**File**: `screens/SpeechToTextScreen.jsx`  
**Purpose**: Standalone speech-to-text testing  

**UI**:
- Title: "Speech to Text (Backend)"
- Transcript display area
- Large mic button (toggles recording)
- Green when idle, primary/success when recording
- Back button

**API**: `POST ${API_BASE}/speech-to-text/` (FormData with audio file, retry on 429)

---

### 7.31 FollowUpScreen
**File**: `screens/FollowUpScreen.jsx`  
**Presentation**: `transparentModal`  
**Purpose**: After crop doctor diagnosis — choose follow-up action  

**UI**:
- Semi-transparent overlay (`rgba(0,0,0,0.7)`)
- Modal card (dark surface `#1E293B`, rounded 24)
- Disease name in green/primary
- Image preview (100×100)
- "How would you like to continue?"
- Two action buttons: "Start Text Chat" → VoiceChatInputScreen, "Start Live Voice Chat" → LiveVoiceScreen
- Cancel button

---

### 7.32-7.37 CropCycle Sub-screens
**Directory**: `screens/cropcycle/`  
**Pattern**: All 6 screens follow similar pattern:
- Load cached data from `AsyncStorage('cropcycle_dashboard_data')`
- Tab-based navigation between data views
- Card-based data display
- Phone call integration via `CropCycleService.initiateCall()`
- Dark theme hardcoded (not using ThemeContext)

| Screen | Purpose |
|--------|---------|
| `ContractFarmingScreen` | Corporate buyers + certifications |
| `CreditSourcesScreen` | Loan schemes (KCC, Gold, Cooperative) |
| `CropInsuranceScreen` | Insurance plans (Government/Private) + risk analysis |
| `MarketStrategyScreen` | Mandi info + government schemes |
| `PowerSupplyScreen` | Solar schemes + power cost analysis |
| `SoilHealthScreen` | Soil health score + parameters + testing labs + nutrient tips |

Each has a `_new` variant (6 additional files) with updated UI.

---

## 8. Reusable Components

### 8.1 MicOverlay (`components/MicOverlay.jsx`)
- Floating mic button (position: absolute)
- Props: `onPress`, `isVisible`, `isActive`, `position`, `size`, `style`
- Positions: bottomRight (default), bottomLeft, bottomCenter, topRight, topLeft
- Sizes: small (50), medium (60), large (70)
- Pulse animation when active (scale 1.0↔1.1, 800ms loop)
- Active state: red bg (`#FF5722`), border red
- Inactive: white bg, green border (`#10B981`)

### 8.2 ThemeToggle (`components/ThemeToggle.jsx`)
- Small circular button (38×38, radius 22)
- Shows 🌙 (dark) or ☀️ (light) emoji
- Themed border and background
- Calls `toggleTheme()` from ThemeContext
- Position: top:35, marginRight:92 (hardcoded for VoiceChatInput overlay)

### 8.3 AnimatedCard (`components/AnimatedCard.js`)
- Wrapper that fades in and slides up
- Props: `children`, `delay` (default 0)
- Animation: opacity 0→1, translateY 30→0, duration 600ms

### 8.4 AnimatedLoading (`components/AnimatedLoading.js`)
- Full-screen loading overlay
- Props: `visible`
- ActivityIndicator + "Getting your app ready..." text
- Background: dark overlay (0.9 opacity dark, 0.95 light)

### 8.5 CustomHeader (`components/CustomHeader.js`)
- Simple header bar with title + menu button (⋮)
- Props: `title` (default "Plantix"), `small`
- Themed colors

### 8.6 LanguageSelector (`components/LanguageSelector.jsx`)
- Floating language button + modal
- Same 8 languages as LanguageSelectScreen
- Props: `position`, `onLanguageChange`, `showFlag`, `compact`
- Success alert on language change

### 8.7 LoadingState (`components/LoadingState.js`)
- Centered loading with ActivityIndicator + text + optional progress bar
- Props: `text`, `progress`

### 8.8 DetailCard (`components/DetailCard.js`)
- Card with colored left indicator bar + title + children content
- Props: `title`, `children`, `color`

### 8.9 MetricCard (`components/MetricCard.js`)
- Displays metric with icon, title, value, subtitle, trend
- Props: `icon`, `title`, `value`, `subtitle`, `trend`, `color`
- Trend color: green for positive, red for negative

### 8.10 AnalysisCard (`components/AnalysisCard.js`)
- Analysis result card with emoji icon, title, value, details, metrics array
- Props: `icon`, `title`, `value`, `details`, `color`, `metrics[]`

### 8.11 ReasonCard (`components/ReasonCard.js`)
- Card with title, content, optional confidence badge, optional impact indicator
- Props: `title`, `children`, `confidence`, `impact`

### 8.12 TimelineNode (`components/TimelineNode.js`)
- Timeline item with vertical line, circle indicator, title, date, details
- Props: `isFirst`, `isLast`, `title`, `date`, `details`, `priority`, `completed`
- Uses AnimatedCard wrapper

### 8.13 LoanComparisonRow (`components/LoanComparisonRow.js`)
- Table row comparing KCC, Gold, Cooperative loan values
- Props: `label`, `kcc`, `gold`, `cooperative`

### 8.14 Icon (`components/Icon.js`)
- Simple emoji/text icon component
- Props: `name` (emoji string), `style`, `color`

---

## 9. Service Layer & API Endpoints

### 9.1 NetworkConfig (`utils/NetworkConfig.js`)
```
API_BASE = "http://10.67.206.37:8000"
TIMEOUT = 30000ms
FALLBACK_URLS array for failover
Methods: testConnection(), getBestUrl(), safeFetch(), setMode(), getMode()
```

### 9.2 Complete API Endpoint Map

#### Farmer Profile
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/farmer/f001/profile` | Get farmer profile |
| PUT | `/farmer/f001/profile` | Update profile |
| GET | `/farmer/f001/crops` | Get farmer's crops |
| POST | `/farmer/f001/crops` | Add crop |
| PUT | `/farmer/f001/crops/{id}` | Update crop |
| DELETE | `/farmer/f001/crops/{id}` | Delete crop |
| GET | `/farmer/f001/livestock` | Get livestock |
| POST | `/farmer/f001/livestock` | Add animal |
| PUT | `/farmer/f001/livestock/{id}` | Update animal |
| DELETE | `/farmer/f001/livestock/{id}` | Delete animal |
| POST | `/farmer/f001/livestock/space-suggestions` | AI space analysis (image) |
| GET | `/farmer/f001/calendar` | Get calendar events |
| POST | `/farmer/f001/calendar` | Add event |
| PUT | `/farmer/f001/calendar/{id}` | Update event |
| DELETE | `/farmer/f001/calendar/{id}` | Delete event |
| GET | `/farmer/f001/chat` | Get chat list |
| POST | `/farmer/f001/chat` | Create new chat |

#### AI Agent
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `http://10.67.206.37:8001/agent` | Text AI chat |
| POST | `http://10.67.206.37:8001/audio_agent` | Voice AI (FormData) |

#### Weather
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/weather/coords?lat=X&lon=Y` | Current weather |
| GET | `/weather/forecast/coords?lat=X&lon=Y` | 5-day forecast |
| GET | `/weather/air_quality?lat=X&lon=Y` | Air quality data |
| GET | `/weather/ai-analysis?lat=X&lon=Y` | AI weather analysis |
| GET | `/weather/city?city=X` | Weather by city name |

#### Soil Moisture
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/soil-moisture` | Soil moisture data |
| POST | `/soil-moisture/ai-suggestion` | AI soil suggestions |

#### Market / Mandi
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/market/prices` | All market prices |
| GET | `/market/prices?state=X&commodity=Y&district=Z` | Filtered prices |

#### Crop Cycle (`CropCycleService`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/crop-cycle/analyze-crop` | Analyze crop data |
| GET | `/crop-cycle/corporate-buyers/{crop}` | Corporate buyers |
| GET | `/crop-cycle/loan-schemes` | Loan schemes |
| GET | `/crop-cycle/insurance-plans` | Insurance plans |
| GET | `/crop-cycle/certifications` | Certifications |
| GET | `/crop-cycle/solar-schemes` | Solar schemes |
| GET | `/crop-cycle/soil-testing-labs` | Testing labs |
| GET | `/crop-cycle/mandi-info` | Mandi information |
| GET | `/crop-cycle/government-schemes` | Government schemes |
| POST | `/crop-cycle/generate-insights` | AI insights |
| GET | `/crop-cycle/search?query=X` | Search crop data |
| POST | `/crop-cycle/initiate-call` | Phone call initiation |

#### Marketplace (`CropMarketplaceService`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/marketplace/crops` | List crops (filterable) |
| POST | `/marketplace/crops` | Add crop listing |
| GET | `/marketplace/crops/{id}` | Crop details |
| PUT | `/marketplace/crops/{id}` | Update listing |
| DELETE | `/marketplace/crops/{id}` | Remove listing |
| GET | `/marketplace/crops/search?query=X` | Search crops |
| GET | `/marketplace/crops/categories` | Categories |
| GET | `/marketplace/analytics/trending` | Trending crops |
| POST | `/marketplace/crops/{id}/buy` | Purchase crop |
| GET | `/marketplace/orders` | Get orders |

#### Rental (`EnhancedRentalService`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/rental/items` | List equipment (filterable) |
| GET | `/rental/items/{id}` | Item details |
| PUT | `/rental/items/{id}` | Update item |
| DELETE | `/rental/items/{id}` | Delete item |
| POST | `/rental/list` | List new equipment |
| POST | `/rental/book` | Book equipment |
| GET | `/rental/bookings?farmerId=X` | Get bookings |
| GET | `/rental/bookings/{id}` | Booking details |
| PUT | `/rental/bookings/{id}` | Update booking status |
| POST | `/rental/bookings/{id}/extend` | Extend booking |
| GET | `/rental/search` | Search equipment |
| GET | `/rental/featured` | Featured rentals |
| GET | `/rental/activity` | Rental activity |

#### Waste Recycling (`WasteRecyclingService`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/waste-recycling/analyze-waste` | Analyze waste (image) |
| GET | `/waste-recycling/common-practices` | Common practices |
| GET | `/waste-recycling/practice/{id}` | Practice details |
| POST | `/waste-recycling/save-analysis` | Save analysis |

#### Suicide Prevention (`SuicidePreventionService`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/suicide-prevention/emergency-call` | Initiate call |
| GET | `/suicide-prevention/helplines` | List helplines |
| GET | `/suicide-prevention/health` | Health check |

#### Voice / Speech
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/voice-command/` | Process voice command |
| POST | `/speech-to-text/` | Transcribe audio |
| POST | `/chat/rag` | RAG chat query |

#### Crop Doctor
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/crop-doctor/analyze` | Analyze crop image |

---

## 10. Assets & Dependencies

### Image Assets
| Asset | Usage | Path |
|-------|-------|------|
| App Logo (light) | ChoiceScreen header | `assets/logo.png` |
| App Logo (dark) | ChoiceScreen header (dark mode) | `assets/logo_light.png` |

### Icon Libraries Used
- **Ionicons** — Primary (navigation, actions)
- **MaterialCommunityIcons** — Secondary (specialized icons)
- **Feather** — FollowUpScreen only

### Key Flutter Package Equivalents

| React Native Package | Flutter Equivalent |
|---|---|
| `@react-navigation/stack` | `go_router` or `Navigator 2.0` |
| `react-i18next` + i18next | `easy_localization` or `flutter_localizations` |
| `@react-native-async-storage` | `shared_preferences` |
| `expo-av` (Audio recording) | `record` + `audioplayers` |
| `expo-location` | `geolocator` + `geocoding` |
| `expo-camera` | `camera` |
| `expo-image-picker` | `image_picker` |
| `expo-document-picker` | `file_picker` |
| `react-native-maps` (MapView) | `google_maps_flutter` |
| `react-native-markdown-display` | `flutter_markdown` |
| `expo-linear-gradient` | `Container` with `BoxDecoration(gradient:)` |
| `expo-blur` (BlurView) | `BackdropFilter` + `ImageFilter.blur` |
| `expo-haptics` | `HapticFeedback` from `flutter/services` |
| `expo-speech` | `flutter_tts` |
| `expo-print` | `printing` or `pdf` |
| `expo-sharing` | `share_plus` |
| `react-native-view-shot` | `screenshot` or `RepaintBoundary` |
| `date-fns` | `intl` (built-in) |
| `axios` | `dio` or `http` |
| `react-native-reanimated` | Flutter's built-in `AnimationController` |
| `react-native-gesture-handler` | Flutter's built-in `GestureDetector` |

---

## 11. Flutter Architecture Recommendation

### Suggested Structure
```
lib/
├── main.dart
├── app.dart                          # MaterialApp + routing
├── config/
│   ├── theme.dart                    # Light/Dark themes
│   ├── routes.dart                   # GoRouter config
│   ├── constants.dart                # API_BASE, FARMER_ID
│   └── network_config.dart           # API client setup
├── l10n/
│   ├── app_en.arb                    # English translations
│   ├── app_hi.arb                    # Hindi
│   ├── app_bn.arb ... (8 total)
│   └── l10n.dart                     # Generated
├── providers/
│   ├── theme_provider.dart           # ThemeNotifier
│   ├── locale_provider.dart          # LocaleNotifier
│   └── auth_provider.dart            # Auth state
├── models/
│   ├── farmer.dart
│   ├── chat_message.dart
│   ├── livestock.dart
│   ├── crop.dart
│   ├── calendar_event.dart
│   ├── weather_data.dart
│   ├── market_price.dart
│   ├── rental_item.dart
│   └── ...
├── services/
│   ├── api_client.dart               # Dio/HTTP client + interceptors
│   ├── farmer_service.dart
│   ├── chat_service.dart
│   ├── weather_service.dart
│   ├── crop_cycle_service.dart
│   ├── marketplace_service.dart
│   ├── rental_service.dart
│   ├── waste_recycling_service.dart
│   ├── suicide_prevention_service.dart
│   ├── voice_command_service.dart
│   └── cache_service.dart            # SharedPreferences wrapper
├── screens/
│   ├── language_select/
│   │   └── language_select_screen.dart
│   ├── login/
│   │   └── login_screen.dart
│   ├── location/
│   │   └── fetching_location_screen.dart
│   ├── home/
│   │   └── choice_screen.dart
│   ├── chat/
│   │   ├── voice_chat_input_screen.dart
│   │   ├── live_voice_screen.dart
│   │   └── chat_history_screen.dart
│   ├── featured/
│   │   └── featured_screen.dart
│   ├── crop_cycle/
│   │   ├── crop_cycle_screen.dart
│   │   ├── contract_farming_screen.dart
│   │   ├── credit_sources_screen.dart
│   │   ├── crop_insurance_screen.dart
│   │   ├── market_strategy_screen.dart
│   │   ├── power_supply_screen.dart
│   │   └── soil_health_screen.dart
│   ├── calendar/
│   │   └── calendar_screen.dart
│   ├── cattle/
│   │   └── cattle_screen.dart
│   ├── marketplace/
│   │   ├── marketplace_screen.dart
│   │   └── new_market_prices_screen.dart
│   ├── upi/
│   │   ├── upi_screen.dart
│   │   ├── pay_anyone_screen.dart
│   │   ├── payment_amount_screen.dart
│   │   ├── enter_pin_screen.dart
│   │   ├── payment_success_screen.dart
│   │   ├── bank_transfer_screen.dart
│   │   └── mobile_recharge_screen.dart
│   ├── crop_doctor/
│   │   ├── crop_doctor_screen.dart
│   │   └── follow_up_screen.dart
│   ├── document_agent/
│   │   └── document_agent_screen.dart
│   ├── weather/
│   │   └── weather_screen.dart
│   ├── soil/
│   │   └── soil_moisture_screen.dart
│   ├── profile/
│   │   ├── farmer_profile_screen.dart
│   │   └── profile_screen.dart
│   ├── rental/
│   │   ├── rental_screen.dart
│   │   ├── listing_details_screen.dart
│   │   ├── my_bookings_screen.dart
│   │   └── earnings_screen.dart
│   ├── waste/
│   │   └── best_out_of_waste_screen.dart
│   ├── mental_health/
│   │   └── suicide_prevention_screen.dart
│   ├── settings/
│   │   └── settings_screen.dart
│   ├── intelligence/
│   │   └── crop_intelligence_screen.dart
│   ├── farm_visualizer/
│   │   └── farm_visualizer_screen.dart
│   └── speech/
│       └── speech_to_text_screen.dart
├── widgets/                          # Reusable components
│   ├── mic_overlay.dart
│   ├── theme_toggle.dart
│   ├── animated_card.dart
│   ├── animated_loading.dart
│   ├── custom_header.dart
│   ├── language_selector.dart
│   ├── loading_state.dart
│   ├── detail_card.dart
│   ├── metric_card.dart
│   ├── analysis_card.dart
│   ├── reason_card.dart
│   ├── timeline_node.dart
│   ├── loan_comparison_row.dart
│   └── icon_widget.dart
└── utils/
    ├── helpers.dart
    └── date_utils.dart
```

### Key Implementation Notes

1. **Navigation**: Use `GoRouter` with `ShellRoute` for the main app shell. The initial flow (Language → Login → Location → Home) should use `go()` for replacement navigation.

2. **Theme**: Use `ChangeNotifierProvider<ThemeNotifier>` at root. `ThemeNotifier` reads/writes `SharedPreferences`. Wrap in `MaterialApp` with `theme`/`darkTheme`/`themeMode`.

3. **Localization**: Use `easy_localization` package. Copy all 8 JSON files to `assets/translations/`. Use `tr()` method.

4. **Audio**: Use `record` package for recording + `dio` for uploading as multipart, `audioplayers` for playback.

5. **Maps**: Use `google_maps_flutter`. The farm boundary selection requires tap-to-add-marker + polygon drawing.

6. **Animations**: Many screens use fade+slide animations. Use `AnimatedBuilder` + `AnimationController` or `implicit_animations` where simpler. The waveform in LiveVoiceScreen needs 20 individual `AnimationController`s.

7. **Markdown**: Use `flutter_markdown` for AI responses in chat.

8. **UPI Screen**: Hardcoded dark theme — use a `Theme` override widget. This is essentially a Google Pay UI clone.

9. **FarmVisualizer**: This is the most complex screen — a full tile-based game. Consider using `CustomPainter` for the grid and `GestureDetector` for interactions.

10. **Onboarding**: Many screens have interactive tooltip-based onboarding. Use `tutorial_coach_mark` package or build custom overlay tooltips.

11. **PDF Generation**: Use `pdf` package + `printing` package for PDF export + sharing.

12. **Rate Limiting**: The AI agent endpoint handles 429 responses with exponential backoff. Implement a retry interceptor in Dio.

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total screens | 47 |
| Reusable components | 14 |
| Service classes | 7 |
| API endpoints | 60+ |
| Supported languages | 8 |
| Translation keys | ~500+ |
| Lines of React Native code | ~30,000+ |
| Largest screen | MarketplaceScreen (4,686 lines) |
| Screens with onboarding | 8+ |
| Screens with offline cache | 10+ |
