import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VoiceChatInputScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <TouchableOpacity>
          <Ionicons name="chatbubble-outline" size={28} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }} /> {/* Spacer */}
        <TouchableOpacity>
          <Ionicons name="home-outline" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* Live Voice Chat Section */}
      <View style={styles.liveVoiceChatSection}>
        <Text style={styles.liveVoiceChatText}>Live Voice Chat</Text>
        <MaterialCommunityIcons name="waveform" size={60} color="white" style={styles.waveformIcon} />
      </View>

      {/* OR Separator */}
      <Text style={styles.orText}>OR</Text>

      {/* Ask Gemini Input Field */}
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.plusButton}>
          <Ionicons name="add" size={28} color="gray" />
        </TouchableOpacity>
        <TextInput
          style={styles.textInput}
          placeholder="Ask Gemini"
          placeholderTextColor="gray"
        />
        <TouchableOpacity>
          <Ionicons name="videocam-outline" size={24} color="gray" style={styles.inputIcon} />
        </TouchableOpacity>
        <TouchableOpacity>
          <MaterialCommunityIcons name="file-document-outline" size={24} color="gray" style={styles.inputIcon} />
        </TouchableOpacity>
        <TouchableOpacity>
          <MaterialCommunityIcons name="pencil-outline" size={24} color="gray" style={styles.inputIcon} />
        </TouchableOpacity>
        <TouchableOpacity>
          <MaterialCommunityIcons name="dots-horizontal" size={24} color="gray" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'space-between', // Pushes content apart
    paddingBottom: 20, // Add some bottom padding
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20, // Space below top bar
  },
  liveVoiceChatSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1, // Takes up available space
  },
  liveVoiceChatText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  waveformIcon: {
    // This icon would ideally be animated
    // For now, it's a static icon
  },
  orText: {
    color: 'gray',
    fontSize: 16,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1c', // Lighter background for input
    borderRadius: 30,
    paddingHorizontal: 15,
    paddingVertical: 10,
    width: '90%', // Adjust width as needed
    marginBottom: 20, // Space above bottom of screen
  },
  plusButton: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    marginRight: 10,
  },
  inputIcon: {
    marginRight: 10,
  },
});