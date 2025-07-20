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
import CropDoctorScreen from './screens/CropDoctor';
import FollowUpScreen from './screens/FollowUpScreen';
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
      </Stack.Navigator>
      <Toast />
    </NavigationContainer>
  );
}
