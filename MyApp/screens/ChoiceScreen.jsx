import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function ChoiceScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Text style={styles.title}>Kissan AI</Text>
      <Text style={styles.subtitle}>How would you like to interact?</Text>
      
      <View style={styles.optionsContainer}>
        <TouchableOpacity 
          style={styles.optionButton} 
          onPress={() => navigation.navigate('LiveVoiceScreen')}
        >
          <MaterialCommunityIcons name="waveform" size={60} color="#fff" />
          <Text style={styles.optionText}>Voice</Text>
        </TouchableOpacity>
        
        <Text style={styles.orText}>OR</Text>
        
        <TouchableOpacity 
          style={styles.optionButton} 
          onPress={() => navigation.navigate('VoiceChatInputScreen')}
        >
          <Ionicons name="chatbubbles-outline" size={60} color="#fff" />
          <Text style={styles.optionText}>Chat</Text>
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
    width: 200,
    height: 150,
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
});
