import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
// --- ASYNC STORAGE IMPORT ---
// You need to install this library to store the user's mode choice
// expo install @react-native-async-storage/async-storage
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ChoiceScreen({ navigation }) {
  const [showHelp, setShowHelp] = useState(false);

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
      <Text style={styles.title}>Kisaan AI</Text>
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

      <TouchableOpacity 
        style={styles.featureButton} 
        onPress={() => navigation.navigate('NewMarketPrices')}
      >
        <Ionicons name="trending-up-outline" size={24} color="#10B981" />
        <Text style={styles.featureButtonText}>View Market Prices</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.featureButton} 
        onPress={() => navigation.navigate('SoilMoisture')}
      >
        <Ionicons name="water-outline" size={24} color="#3B82F6" />
        <Text style={[styles.featureButtonText, { color: '#3B82F6' }]}>Check Soil Moisture</Text>
      </TouchableOpacity>

      <View style={styles.helpCardContainer}>
        {showHelp && (
          <View style={styles.helpCard}>
            <Text style={styles.helpCardText}>
              Select "Voice Pilot" to control the app with your voice, or "Manual Mode" for traditional touch interaction.
            </Text>
          </View>
        )}
        <TouchableOpacity style={styles.helpButton} onPress={() => setShowHelp(!showHelp)}>
          <MaterialCommunityIcons name="help-circle-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
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
    textShadowColor: 'rgba(255,255,255,0.25)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 32,
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
    backgroundColor: '#000',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: 220,
    height: 160,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#fff',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 16,
  },
  optionText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  featureButton: {
    flexDirection: 'row',
    backgroundColor: '#27272a',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 40,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  featureButtonText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  orText: {
    color: 'gray',
    fontSize: 18,
    fontWeight: 'bold',
  },
  helpButton: {
    position: 'absolute',
    bottom:-40,
    right: 10,
    zIndex: 2,
    backgroundColor: '#000',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fff',
    padding: 8,
  },
  helpCardContainer: {
    position: 'absolute',
    bottom: 60, // appears just above the help button
    right: 20,
    alignItems: 'flex-end',
    zIndex: 1,
  },
  helpCard: {
    backgroundColor: '#000',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fff',
    paddingVertical: 5,
    paddingHorizontal: 18,
    marginBottom: 20,
    maxWidth: 260,
  },
  helpCardText: {
    color: '#fff',
    fontSize: 15,
    textAlign: 'left',
  },
});
