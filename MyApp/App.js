import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import your screens
// import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#f4511e',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Home" 
          // component={HomeScreen} 
          component={ProfileScreen} 
          options={{ title: 'Home Page' }}
        />
        
        {/* Commented out Profile screen */}
        {/* <Stack.Screen 
          name="Profile" 
          component={ProfileScreen} 
          options={{ title: 'Profile Page' }}
        /> */}
        
      </Stack.Navigator>
    </NavigationContainer>
  );
}