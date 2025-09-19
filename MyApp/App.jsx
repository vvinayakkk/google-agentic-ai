import './i18n';
import { I18nextProvider } from 'react-i18next';
import i18n, { getStoredLanguage } from './i18n';
import React, { Suspense, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { CardStyleInterpolators } from '@react-navigation/stack';

import Toast from 'react-native-toast-message';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { buildNavigationTheme } from './theme';
import ChoiceScreen from './screens/ChoiceScreen';
import VoiceChatInputScreen from './screens/VoiceChatInputScreen';
import LiveVoiceScreen from './screens/LiveVoiceScreen'; // Import the actual screen
import FeaturedScreen from './screens/Featured';
import ChatHistoryScreen from './screens/ChatHistoryScreen';
import CropCycleScreen from './screens/CropCycle';
import SmartCalendar from './screens/CalenderScreen';
import CattleScreen from './screens/CattleScreen';
import MarketplaceScreen from './screens/MarketplaceScreen';
import UPIScreen from './screens/UPI';
import CropDoctorScreen from './screens/CropDoctor';
import FollowUpScreen from './screens/FollowUpScreen';
import PayAnyoneScreen from './UPI/PayAnyoneScreen';
import ContactUPIDetailScreen from './UPI/ContactUPIDetailScreen';
import PaymentAmountScreen from './UPI/PaymentAmountScreen';
import BankSelectScreen from './UPI/BankSelectScreen';
import EnterPinScreen from './UPI/EnterPinScreen';
import PaymentSuccessScreen from './UPI/PaymentSuccessScreen';
import PaymentProcessingScreen from './UPI/PaymentProcessingScreen';
import BankTransferScreen from './UPI/BankTransferScreen';
import MobileRechargeScreen from './UPI/MobileRechargeScreen';
import LanguageSelectScreen from './screens/LanguageSelectScreen';
import FetchingLocationScreen from './screens/FetchingLocationScreen';
import DocumentAgentScreen from './screens/DocumentAgentScreen';
import WeatherScreen from './screens/WeatherScreen';
import NewMarketPricesScreen from './screens/NewMarketPricesScreen';
import SoilMoistureScreen from './screens/SoilMoistureScreen';
import FarmerProfileScreen from './screens/FarmerProfileScreen';
import LoginScreen from './screens/LoginScreen';
import RentalScreen from './screens/RentalScreen';
import MyBookings from './screens/MyBookings';
import Earnings from './screens/Earnings';
import ListingDetails from './screens/ListingDetails';
import SpeechToTextScreen from './screens/SpeechToTextScreen';
import CropIntelligenceScreenNew from './screens/CropIntelligenceScreenNew';
import MarketStrategyScreen from './screens/cropcycle/MarketStrategyScreen';
import PowerSupplyScreen from './screens/cropcycle/PowerSupplyScreen';
import ContractFarmingScreen from './screens/cropcycle/ContractFarmingScreen';
import CropInsuranceScreen from './screens/cropcycle/CropInsuranceScreen';
import CreditSourcesScreen from './screens/cropcycle/CreditSourcesScreen';
import SoilHealthScreen from './screens/cropcycle/SoilHealthScreen';
import BestOutOfWasteScreen from './screens/BestOutOfWasteScreen';
import SuicidePrevention from './screens/SuicidePrevention';
import SettingsScreen from './screens/SettingsScreen';
import FarmVisualizerScreen from './screens/FarmVisualizerScreen';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import NetworkConfig from './utils/NetworkConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
const Stack = createStackNavigator();



function AppInner() {
  const { theme } = useTheme();
  useEffect(() => {
    getStoredLanguage().then((lang) => {
      if (i18n.language !== lang) {
        i18n.changeLanguage(lang);
      }
    });
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <Suspense fallback={null}>
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <NavigationContainer theme={buildNavigationTheme(theme)}>
            <Stack.Navigator initialRouteName="LanguageSelectScreen"
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen 
                name="LanguageSelectScreen" 
                component={LanguageSelectScreen} 
                options={{
                  headerShown: false,
                }} 
              />
              <Stack.Screen 
                name="FetchingLocationScreen" 
                component={FetchingLocationScreen} 
                options={{
                  headerShown: false,
                }} 
              />
              <Stack.Screen 
                name="LoginScreen" 
                component={LoginScreen} 
                options={{
                  headerShown: false,
                }} 
              />
              <Stack.Screen 
                name="ChoiceScreen" 
                component={ChoiceScreen} 
                options={{
                  headerShown: false,
                  animationEnabled: true,
                  cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
                }} 
              />
              <Stack.Screen 
                name="VoiceChatInputScreen" 
                component={VoiceChatInputScreen} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="LiveVoiceScreen" 
                component={LiveVoiceScreen} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="Featured" 
                component={FeaturedScreen} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="ChatHistory" 
                component={ChatHistoryScreen} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="CropCycle" 
                component={CropCycleScreen} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="CalenderScreen" 
                component={SmartCalendar} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="CattleScreen" 
                component={CattleScreen} 
                options={{ headerShown: false }} 
              />
               <Stack.Screen 
                name="MarketplaceScreen" 
                component={MarketplaceScreen} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="UPI" 
                component={UPIScreen} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="CropDoctor" 
                component={CropDoctorScreen} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="FollowUpScreen" 
                component={FollowUpScreen} 
                options={{
                  headerShown: false,
                  presentation: 'transparentModal', 
                  animationEnabled: true,
                }}
              />
              <Stack.Screen 
                name="PayAnyone" 
                component={PayAnyoneScreen} 
                options={{ headerShown: false }} 
              />
               <Stack.Screen 
                name="ContactUPIDetail" 
                component={ContactUPIDetailScreen} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="PaymentAmountScreen" 
                component={PaymentAmountScreen} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="BankSelectScreen" 
                component={BankSelectScreen} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="EnterPinScreen" 
                component={EnterPinScreen} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="PaymentSuccessScreen" 
                component={PaymentSuccessScreen} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="PaymentProcessingScreen" 
                component={PaymentProcessingScreen} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="BankTransferScreen" 
                component={BankTransferScreen} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="MobileRechargeScreen" 
                component={MobileRechargeScreen} 
                options={{ headerShown: false }} 
              />
               <Stack.Screen 
                name="DocumentAgentScreen" 
                component={DocumentAgentScreen} 
                options={{
                  headerShown: false,
                }} 
              />
              <Stack.Screen 
                name="WeatherScreen" 
                component={WeatherScreen} 
                options={{
                  headerShown: false,
                }} 
              />
              <Stack.Screen 
                name="NewMarketPrices" 
                component={NewMarketPricesScreen} 
                options={{
                  headerShown: false,
                }} 
              />
              <Stack.Screen 
                name="SoilMoisture" 
                component={SoilMoistureScreen} 
                options={{
                  headerShown: false,
                }} 
              />
              <Stack.Screen 
                name="FarmerProfile" 
                component={FarmerProfileScreen} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="RentalSystemScreen" 
                component={RentalScreen} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="ListingDetails" 
                component={ListingDetails} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="MyBookings" 
                component={MyBookings} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="Earnings" 
                component={Earnings} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="SpeechToTextScreen" 
                component={SpeechToTextScreen} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="CropIntelligenceScreenNew" 
                component={CropIntelligenceScreenNew} 
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="MarketStrategyScreen" 
                component={MarketStrategyScreen} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="PowerSupplyScreen" 
                component={PowerSupplyScreen} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="ContractFarmingScreen" 
                component={ContractFarmingScreen} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="CropInsuranceScreen" 
                component={CropInsuranceScreen} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="CreditSourcesScreen" 
                component={CreditSourcesScreen} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="SoilHealthScreen" 
                component={SoilHealthScreen} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="BestOutOfWasteScreen" 
                component={BestOutOfWasteScreen} 
                />
                <Stack.Screen  
                name="FarmVisualizerScreen" 
                component={FarmVisualizerScreen} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="SuicidePrevention" 
                component={SuicidePrevention} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="Settings" 
                component={SettingsScreen} 
                options={{ headerShown: false }} 
              />
            </Stack.Navigator>
          </NavigationContainer>
          <Toast />
        </View>
      </Suspense>
    </I18nextProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

// Remove the styles since they're no longer needed
