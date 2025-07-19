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
// Import the new Chat Interface Screen
import ChatInterfaceScreen from './screens/ChatInterfaceScreen';

// Import your custom header component
import CustomHeader from './components/CustomHeader';
import DiseaseHistory from './screens/DiseaseHistory';
import ScanPlantScreen from './screens/ScanPlantScreen'; 
import ScanPlantDetails from './screens/ScanPlantDetails';

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
        {/* <Stack.Screen name="DiseaseHistory" component={ScanPlantDetails} /> */}
        <Stack.Screen 
          name="ChatInterface" 
          component={ChatInterfaceScreen}
          options={{
            title: 'AI Chat Assistant',
            headerStyle: {
              backgroundColor: '#f8f9fa',
            },
            headerTitleStyle: {
              fontWeight: '600',
            },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}