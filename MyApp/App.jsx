import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import Toast from 'react-native-toast-message';
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
import PayAnyoneScreen from './screens/PayAnyoneScreen';
import ContactUPIDetailScreen from './screens/ContactUPIDetailScreen';
import PaymentAmountScreen from './screens/PaymentAmountScreen';
import BankSelectScreen from './screens/BankSelectScreen';
import EnterPinScreen from './screens/EnterPinScreen';
import PaymentSuccessScreen from './screens/PaymentSuccessScreen';
import PaymentProcessingScreen from './screens/PaymentProcessingScreen';
import BankTransferScreen from './screens/BankTransferScreen';
import MobileRechargeScreen from './screens/MobileRechargeScreen';
const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="ChoiceScreen">
      
        <Stack.Screen 
          name="ChoiceScreen" 
          component={ChoiceScreen} 
          options={{ headerShown: false }} 
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
      </Stack.Navigator>
      <Toast />
    </NavigationContainer>
  );
}
