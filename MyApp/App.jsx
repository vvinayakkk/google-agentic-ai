import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';


import PlantAILandingScreen from './screens/PlantAILandingScreen';
import HomeScreen from './screens/HomeScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen 
          name="PlantAILanding" 
          component={PlantAILandingScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: true, title: 'Home' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}