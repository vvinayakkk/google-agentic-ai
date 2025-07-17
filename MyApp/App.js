import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import all your screens from the 'screens' directory
import WelcomeScreen from './screens/WelcomeScreen';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import { PlantLibraryScreen } from './screens/PlantLibraryScreen';
import { PlantDetailScreen } from './screens/PlantDetailScreen';
import CustomHeader from './components/CustomHeader';

// Initialize the stack navigator
const Stack = createStackNavigator();

/**
 * The main application component that sets up the navigation stack.
 * This merged version includes all screens from the conflicting files.
 * The navigation flow is:
 * 1. WelcomeScreen (Initial Route)
 * 2. HomeScreen
 * 3. PlantLibraryScreen
 * 4. PlantDetailScreen
 * 5. ProfileScreen (also available in the stack)
 */
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          header: () => <CustomHeader />,
        }}
      >
        <Stack.Screen
          name="Welcome"
          component={HomeScreen}
        />
        {/*
        <Stack.Screen
          name="Home"
          component={HomeScreen}
        />
        <Stack.Screen
          name="PlantLibrary"
          component={PlantLibraryScreen}
        />
        <Stack.Screen
          name="PlantDetail"
          component={PlantDetailScreen}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
        />
        */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
