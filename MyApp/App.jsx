import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import Toast from 'react-native-toast-message';
import VoiceChatInputScreen from './screens/VoiceChatInputScreen';
import LiveVoiceScreen from './screens/LiveVoiceScreen';
import FeaturedScreen from './screens/Featured';
const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
      
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
          name="FeaturedScreen" 
          component={FeaturedScreen} 
          options={{ headerShown: false }} 
        />
        
      </Stack.Navigator>
      <Toast />
    </NavigationContainer>
  );
}