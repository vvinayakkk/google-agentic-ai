import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import all your screens
import WelcomeScreen from './screens/WelcomeScreen';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import { PlantLibraryScreen } from './screens/PlantLibraryScreen';
import { PlantDetailScreen } from './screens/PlantDetailScreen';
// Import the new AI Assistant screens
import PlantAILandingScreen from './screens/PlantAILandingScreen';
import PlantAssistantScreen from './screens/PlantAssistantScreen';

// Import your custom header component
import CustomHeader from './components/CustomHeader';
// Initialize the stack navigator
const Stack = createStackNavigator();

/**
 * The main application component that sets up the navigation stack.
 * This version uses a global CustomHeader and includes all screens.
 */
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Welcome"
        // Apply a custom header to all screens by default
        screenOptions={{
          header: (props) => <CustomHeader {...props} />,
        }}
      >
       
        {/* { <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          // The Welcome screen might not need a header. We can hide it.
          options={{ headerShown: false }}
        /> */}
        
        <Stack.Screen
          name="Home"
          component={ProfileScreen}
          // This will use the default CustomHeader
        />
        {/* <Stack.Screen
          name="PlantLibrary"
          component={PlantLibraryScreen}
          // This will use the default CustomHeader
        /> */}
        {/* <Stack.Screen
          name="PlantDetail"
          component={PlantDetailScreen}
          // This will use the default CustomHeader
        /> */}
        {/* <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          // This will use the default CustomHeader
        />} */}

        {/* --- AI Assistant Flow --- */}
        {/* The landing screen has its own UI and doesn't need the global header. */}
        {/* <Stack.Screen
          name="PlantAILanding"
          component={PlantAILandingScreen}
          options={{ headerShown: false }}
        /> */}
        
        {/* The chat screen also has a custom internal header. */}
        {/* <Stack.Screen
          name="PlantAssistant"
          component={PlantAssistantScreen}
          options={{ headerShown: false }}
        /> */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
