import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
// --- ASYNC STORAGE IMPORT ---
// You need to install this library to store the user's mode choice
// expo install @react-native-async-storage/async-storage
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ChoiceScreen({ navigation }) {

  const handleModeSelection = async (mode, screen) => {
    try {
      await AsyncStorage.setItem('userMode', mode);
      navigation.navigate(screen);
    } catch (e) {
      Alert.alert("Error", "Could not save your mode selection.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Text style={styles.title}>Kissan AI</Text>
      <Text style={styles.subtitle}>Select Your Interaction Mode</Text>
      
      <View style={styles.optionsContainer}>
        <TouchableOpacity 
          style={styles.optionButton} 
          onPress={() => handleModeSelection('voice', 'LiveVoiceScreen')}
        >
          <MaterialCommunityIcons name="microphone-outline" size={60} color="#fff" />
          <Text style={styles.optionText}>Voice Pilot</Text>
        </TouchableOpacity>
        
        <Text style={styles.orText}>OR</Text>
        
        <TouchableOpacity 
          style={styles.optionButton} 
          onPress={() => handleModeSelection('manual', 'VoiceChatInputScreen')}
        >
          <Ionicons name="hand-right-outline" size={60} color="#fff" />
          <Text style={styles.optionText}>Manual Mode</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.helpButton} onPress={() => Alert.alert('Help', 'Select "Voice Pilot" to control the app with your voice, or "Manual Mode" for traditional touch interaction.')}>
        <MaterialCommunityIcons name="help-circle-outline" size={30} color="gray" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 20,
    color: 'gray',
    marginBottom: 60,
  },
  optionsContainer: {
    alignItems: 'center',
  },
  optionButton: {
    backgroundColor: '#1e1e1e',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: 220,
    height: 160,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#333'
  },
  optionText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  orText: {
    color: 'gray',
    fontSize: 18,
    fontWeight: 'bold',
  },
  helpButton: {
    position: 'absolute',
    bottom: 40,
    right: 30,
  }
});
