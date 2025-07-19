import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

function VoiceWaveform({ isActive }) {
  const barCount = 20;
  const animatedValues = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.5))
  ).current;

  React.useEffect(() => {
    let animations = [];
    if (isActive) {
      animations = animatedValues.map((val, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(val, {
              toValue: Math.random() * 1.5 + 0.5,
              duration: 120 + Math.random() * 80,
              useNativeDriver: true,
            }),
            Animated.timing(val, {
              toValue: 0.5,
              duration: 120 + Math.random() * 80,
              useNativeDriver: true,
            }),
          ])
        )
      );
      Animated.stagger(30, animations).start();
    } else {
      animatedValues.forEach((val) => val.setValue(0.5));
    }
    return () => {
      animatedValues.forEach((val) => val.stopAnimation());
    };
  }, [isActive]);

  return (
    <View style={styles.waveformContainer}>
      {animatedValues.map((val, i) => (
        <Animated.View
          key={i}
          style={[
            styles.waveBar,
            {
              transform: [
                { scaleY: val },
                { translateY: val.interpolate({ inputRange: [0, 2], outputRange: [0, -10] }) },
              ],
              backgroundColor: i % 2 === 0 ? '#90caf9' : '#b3e5fc',
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function LiveVoiceScreen({ navigation }) {
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionActive, setSessionActive] = useState(true);

  // Button handlers
  const handleEndSession = () => {
    setSessionActive(false);
  };
  const handlePause = () => setIsPaused((p) => !p);
  const handleMic = () => {
    setIsListening((l) => !l);
  };
  const handleExit = () => {
    if (navigation && navigation.navigate) {
      navigation.navigate('VoiceChatInputScreen');
    }
  };

  if (!sessionActive) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}> 
        <Text style={{ color: 'white', fontSize: 22, marginBottom: 20 }}>Session Ended</Text>
        <TouchableOpacity style={styles.micButton} onPress={() => setSessionActive(true)}>
          <Ionicons name="mic" size={40} color="black" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.outerGlowContainer}>
      <View style={styles.container}>
        {/* Voice Waveform Animation */}
        <View style={{ marginTop: 60, marginBottom: 20 }}>
          <VoiceWaveform isActive={isListening && !isPaused} />
        </View>

        {/* Transcript Area (removed) */}
        <View style={styles.transcriptContainer}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
            {/* No transcript or error shown */}
          </View>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,1)']}
            style={styles.gradientOverlay}
            locations={[0, 0.8, 1]}
          />
        </View>

        {/* Blue Themed Bottom Controls with Glow */}
        <View style={styles.bottomHalfContainer}>
          <LinearGradient
            colors={["#2c3e50", "#2980b9", "#6dd5fa"]}
            style={styles.blueGradient}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
          <View style={styles.controlsContainer}>
            <TouchableOpacity style={styles.controlButton} onPress={handleEndSession}>
              <MaterialCommunityIcons name="square" size={28} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={handlePause}>
              <MaterialCommunityIcons name={isPaused ? "play" : "pause"} size={28} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.micButton, isListening && { backgroundColor: '#90caf9' }]} onPress={handleMic}>
              <Ionicons name={isListening ? "mic-off" : "mic"} size={40} color="black" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.redXButton} onPress={handleExit}>
              <MaterialCommunityIcons name="close" size={28} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    width: width,
    height: 60,
    marginBottom: 10,
  },
  waveBar: {
    width: 8,
    height: 40,
    borderRadius: 4,
    marginHorizontal: 2,
    backgroundColor: '#90caf9',
  },
  transcriptContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 120,
    position: 'relative',
  },
  transcriptText: {
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 30,
  },
  userText: {
    color: '#90caf9',
    fontWeight: 'bold',
  },
  geminiText: {
    color: '#b3e5fc', // blueish instead of yellow
    fontStyle: 'italic',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  bottomHalfContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 200,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: 'hidden',
    zIndex: 2,
  },
  blueGradient: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    height:250,
    paddingTop:60
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 80, // more bottom padding
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    minHeight: 100,
    zIndex: 3,
  },
  controlButton: {
    backgroundColor: '#333',
    borderRadius: 50,
    width: 55,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0, // no border
  },
  micButton: {
    backgroundColor: 'white',
    borderRadius: 50,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 15,
    borderWidth: 0, // no border
  },
  redXButton: {
    backgroundColor: '#e63946',
    borderRadius: 50,
    width: 55,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0, // no border
  },
  outerGlowContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 32,
    margin: 8,
    shadowColor: '#0a1a3c',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 32,
    borderWidth: 4,
    borderColor: '#0a1a3c',
    // For Android
    elevation: 30,
    overflow: 'hidden',
  },
});