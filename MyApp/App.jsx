import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import all your screens
import WelcomeScreen from './archives/WelcomeScreen';
import HomeScreen from './archives/HomeScreen';
import ProfileScreen from './archives/ProfileScreen';
import { PlantLibraryScreen } from './archives/PlantLibraryScreen';
import { PlantDetailScreen } from './archives/PlantDetailScreen';
// Import the new AI Assistant screens
import PlantAILandingScreen from './archives/PlantAILandingScreen';
import PlantAssistantScreen from './archives/PlantAssistantScreen';
// Import the new Chat Interface Screen
import ChatInterfaceScreen from './archives/ChatInterfaceScreen';

// Import your custom header component
import CustomHeader from './components/CustomHeader';
import DiseaseHistory from './archives/DiseaseHistory';
import ScanPlantScreen from './archives/ScanPlantScreen'; 
import ScanPlantDetails from './archives/ScanPlantDetails';

// Initialize the stack navigator
const Stack = createStackNavigator();

/**
 * The main application component that sets up the navigation stack.
 * This version uses a global CustomHeader and includes all screens.
 */
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        
      </Stack.Navigator>
    </NavigationContainer>
  );
}