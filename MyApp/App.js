import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
// Switch to the compatible stack navigator
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

// Import all your screens
import { PlantLibraryScreen } from './screens/PlantLibraryScreen';
import { PlantDetailScreen } from './screens/PlantDetailScreen';

// Use createStackNavigator
const Stack = createStackNavigator();

// Placeholder for your HomeScreen - no changes here
function HomeScreen({ navigation }) {
  return (
    <View style={homeStyles.container}>
      <Text style={homeStyles.title}>Welcome to Home Screen!</Text>
      <TouchableOpacity
        style={homeStyles.button}
        onPress={() => navigation.navigate('PlantLibrary')}
      >
        <Text style={homeStyles.buttonText}>Go to Plant Library</Text>
      </TouchableOpacity>
    </View>
  );
}

// Styles for the placeholder HomeScreen - no changes here
const homeStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  button: {
    backgroundColor: '#388E3C',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});


export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        // We hide the default header because our screens have custom headers/UIs
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* The Home screen still shows the default header because we override it below */}
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            headerShown: true, // Explicitly show header only for Home
            title: 'App Home',
             headerStyle: {
              backgroundColor: '#388E3C',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />

        {/* Plant Library screen uses its own custom header */}
        <Stack.Screen
          name="PlantLibrary"
          component={PlantLibraryScreen}
        />

        {/* Plant Detail screen also uses its own custom header/back button */}
        <Stack.Screen
          name="PlantDetail"
          component={PlantDetailScreen}
        />

      </Stack.Navigator>
    </NavigationContainer>
  );
}
