import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons'; // Assuming you have these font icons

export default function LiveVoiceScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <Text style={styles.timeText}>8:38</Text>
        <MaterialCommunityIcons name="wifi" size={20} color="white" style={styles.iconMargin} />
        <MaterialCommunityIcons name="battery" size={20} color="white" />
        <Text style={styles.batteryText}>93%</Text>
        <View style={{ flex: 1 }} /> {/* Spacer */}
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live</Text>
        </View>
        <Ionicons name="square-outline" size={24} color="white" style={styles.iconMargin} />
        <MaterialCommunityIcons name="dots-vertical" size={24} color="white" />
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          To interrupt Gemini,{"\n"}tap or start talking.
        </Text>
      </View>

      {/* Transcript Area */}
      <View style={styles.transcriptContainer}>
        <Text style={styles.transcriptText}>twenty-eight degrees.</Text>
        <Text style={styles.transcriptText}>
          In Mumbai, there'll be light rain, with a high of twenty.
        </Text>
        {/* You can add more transcript lines here */}

        {/* Gradient Blur at the bottom */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,1)']} // Adjust colors for your background
          style={styles.gradientOverlay}
          locations={[0, 0.8, 1]}
        />
      </View>

      {/* Bottom Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.controlButton}>
          <MaterialCommunityIcons name="square" size={28} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton}>
          <MaterialCommunityIcons name="pause" size={28} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.micButton}>
          <Ionicons name="mic" size={40} color="black" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.redXButton}>
          <MaterialCommunityIcons name="close" size={28} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black', // Dark background
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  timeText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
    marginRight: 5,
  },
  batteryText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 3,
  },
  iconMargin: {
    marginRight: 10,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 15,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 10,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'red',
    marginRight: 5,
  },
  liveText: {
    color: 'white',
    fontSize: 12,
  },
  instructionsContainer: {
    position: 'absolute',
    top: '30%', // Adjust as needed
    alignSelf: 'center',
    zIndex: 1, // Ensure it's above transcript if needed
  },
  instructionsText: {
    color: 'gray',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  transcriptContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 120, // Make space for controls
    position: 'relative', // For gradient positioning
  },
  transcriptText: {
    color: 'white',
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 30,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150, // Height of the fade effect
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 10,
    backgroundColor: '#1c1c1c', // Slightly lighter than background
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: 100, // Ensure enough height for buttons
  },
  controlButton: {
    backgroundColor: '#333',
    borderRadius: 50,
    width: 55,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButton: {
    backgroundColor: 'white',
    borderRadius: 50,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 15, // Space out
  },
  redXButton: {
    backgroundColor: '#e63946', // Red color
    borderRadius: 50,
    width: 55,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
});