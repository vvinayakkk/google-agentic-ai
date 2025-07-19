import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import Toast from 'react-native-toast-message';
import ChoiceScreen from './screens/ChoiceScreen';
import VoiceChatInputScreen from './screens/VoiceChatInputScreen';
import LiveVoiceScreen from './screens/LiveVoiceScreen'; // Import the actual screen
import FeaturedScreen from './screens/Featured';
import ChatHistoryScreen from './screens/ChatHistoryScreen';

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
      </Stack.Navigator>
      <Toast />
    </NavigationContainer>
  );
}
