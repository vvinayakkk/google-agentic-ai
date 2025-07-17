import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import all your screens from the 'screens' directory
import WelcomeScreen from './screens/WelcomeScreen';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import { PlantLibraryScreen } from './screens/PlantLibraryScreen';
import { PlantDetailScreen } from './screens/PlantDetailScreen';

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
        // The first screen to be displayed is the Welcome screen
        initialRouteName="Welcome"
        // Global screen options: hide the default header for all screens.
        // Individual screens can override this to show a header if needed.
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* The Welcome screen is the entry point of the app. */}
        {/* <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          // The Welcome screen does not need a header.
        /> */}

        {/* The Home screen is the main hub after the welcome page. */}
        {/* <Stack.Screen
          name="Home"
          component={HomeScreen}
          // We override the global settings to show a custom-styled header for the Home screen.
          options={{
            headerShown: true,
            title: 'App Home',
            headerStyle: {
              backgroundColor: '#388E3C', // A green background for the header
            },
            headerTintColor: '#fff', // White color for the title and back button
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        /> */}

        {/* The Plant Library screen displays a list of plants. */}
        <Stack.Screen
          name="PlantLibrary"
          component={PlantLibraryScreen}
          // This screen uses its own custom header component, so we hide the default one.
        />

        {/* The Plant Detail screen shows information about a specific plant. */}
        <Stack.Screen
          name="PlantDetail"
          component={PlantDetailScreen}
          // This screen also has a custom UI and does not need the default header.
        />

        {/* The Profile screen, brought in from the other version. */}
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          // We'll give the Profile screen a standard header as well.
          options={{
            headerShown: true,
            title: 'Your Profile',
             headerStyle: {
              backgroundColor: '#388E3C',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
