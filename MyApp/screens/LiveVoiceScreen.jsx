import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Alert, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';
import { NetworkConfig } from '../utils/NetworkConfig';

const API_BASE = NetworkConfig.API_BASE;

// Action button mapping for different AI actions
const ACTION_BUTTONS = {
  weather: { icon: 'cloud', label: 'Weather', color: '#4FC3F7' },
  soil_moisture: { icon: 'water', label: 'Soil Check', color: '#8BC34A' },
  crop_intelligence: { icon: 'leaf', label: 'Crop Intelligence', color: '#4CAF50' },
  cattle_management: { icon: 'paw', label: 'Livestock', color: '#FF9800' },
  profile: { icon: 'person', label: 'Profile', color: '#9C27B0' },
  capture_image: { icon: 'camera', label: 'Camera', color: '#FF5722' },
  chat: { icon: 'chatbubble', label: 'Chat', color: '#03DAC6' },
  do_nothing: { icon: 'help-circle', label: 'Help', color: '#757575' }
};

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

// Interactive Guide Tooltip Component
function InteractiveGuideTooltip({ step, onNext, onSkip }) {
  const getTooltipPosition = () => {
    switch (step.target) {
      case 'voiceButton':
        return {
          bottom: step.position === 'bottom' ? 150 : undefined,
          top: step.position === 'top' ? 120 : undefined,
          alignSelf: 'center',
        };
      case 'response':
        return {
          top: 200,
          alignSelf: 'center',
        };
      default:
        return {
          top: '40%',
          alignSelf: 'center',
        };
    }
  };

  return (
    <View style={[styles.tooltip, getTooltipPosition()]}>
      {/* Pointer Arrow */}
      {step.position === 'bottom' && <View style={styles.tooltipArrowDown} />}
      {step.position === 'top' && <View style={styles.tooltipArrowUp} />}
      
      <View style={styles.tooltipContent}>
        <Text style={styles.tooltipTitle}>{step.title}</Text>
        <Text style={styles.tooltipMessage}>{step.message}</Text>
        
        <View style={styles.tooltipButtons}>
          <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextButton} onPress={onNext}>
            <Text style={styles.nextButtonText}>
              {step.id === 'continue_conversation' || step.id === 'first_question' ? 'Got it!' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function LiveVoiceScreen({ navigation }) {
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionActive, setSessionActive] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [currentAction, setCurrentAction] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [recording, setRecording] = useState(null);
  const [networkStatus, setNetworkStatus] = useState('checking'); // checking, connected, error
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [showInteractiveGuide, setShowInteractiveGuide] = useState(false);
  const [hasAskedFirstQuestion, setHasAskedFirstQuestion] = useState(false);
  
  // Audio playback states
  const [currentAudio, setCurrentAudio] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioBase64, setAudioBase64] = useState('');
  const [isMuted, setIsMuted] = useState(false); // Global mute state

  // Test network connection on component mount
  useEffect(() => {
    testNetworkConnection();
  }, []);

    const testNetworkConnection = async () => {
    try {
      setNetworkStatus('checking');
      const response = await axios.get(`${API_BASE}/`, { timeout: 5000 });
      
      if (response.status === 200) {
        console.log('✅ Network connection established');
        setNetworkStatus('connected');
      } else {
        setNetworkStatus('error');
        Alert.alert(
          'Connection Error',
          'Cannot connect to server. Please check:\n• Backend server is running\n• Device is on same WiFi network\n• IP address is correct in NetworkConfig',
          [
            { text: 'Retry', onPress: testNetworkConnection },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Network test failed:', error.message);
      setNetworkStatus('error');
    }
  };

  // Interactive onboarding steps
  const ONBOARDING_STEPS = [
    {
      id: 'welcome',
      title: 'Welcome to Voice Assistant!',
      message: 'Let me show you how to use this app. Tap anywhere to continue.',
      target: 'screen',
      position: 'center'
    },
    {
      id: 'voice_button',
      title: 'Tap the microphone',
      message: 'Press and hold this button to start recording your question.',
      target: 'voiceButton',
      position: 'bottom'
    },
    {
      id: 'first_question',
      title: 'Ask your first question',
      message: 'Try asking: "What\'s the weather like?" or "Tell me about farming tips"',
      target: 'voiceButton',
      position: 'top'
    }
  ];

  const FOLLOWUP_STEPS = [
    {
      id: 'followup_info',
      title: 'Great! You got a response',
      message: 'You can now ask follow-up questions or start a new topic. The AI remembers our conversation!',
      target: 'response',
      position: 'top'
    },
    {
      id: 'continue_conversation',
      title: 'Keep the conversation going',
      message: 'Press the microphone again to ask more questions or continue the discussion.',
      target: 'voiceButton',
      position: 'bottom'
    }
  ];

  const startInteractiveGuide = () => {
    setShowInteractiveGuide(true);
    setOnboardingStep(0);
  };

  const nextOnboardingStep = () => {
    const currentSteps = hasAskedFirstQuestion ? FOLLOWUP_STEPS : ONBOARDING_STEPS;
    if (onboardingStep < currentSteps.length - 1) {
      setOnboardingStep(onboardingStep + 1);
    } else {
      setShowInteractiveGuide(false);
      setOnboardingStep(0);
    }
  };

  const skipOnboarding = () => {
    setShowInteractiveGuide(false);
    setOnboardingStep(0);
  };

  // Audio recording functions
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Audio recording permission is needed');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );
      setRecording(recording);
      setIsListening(true);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    setIsListening(false);
    setIsProcessing(true);
    
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      
      // Process the audio with backend
      await processVoiceCommand(uri);
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to process recording');
    }
    
    setIsProcessing(false);
  };

  // Process voice command with backend
  const processVoiceCommand = async (audioUri) => {
    if (!audioUri) return;

    try {
      console.log('Processing voice command with audio URI:', audioUri);
      
      // Determine file type from URI
      const fileExtension = audioUri.split('.').pop() || '3gp';
      const fileName = `recording.${fileExtension}`;
      
      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        name: fileName,
        type: fileExtension === '3gp' ? 'audio/3gpp' : 
              fileExtension === 'wav' ? 'audio/wav' : 
              fileExtension === 'mp3' ? 'audio/mpeg' : 
              'audio/3gpp', // default for mobile recordings
      });

      // Use axios like other working screens
      const response = await axios.post(`${API_BASE}/voice-command/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const result = response.data;
      console.log('✅ Voice command response:', result);
      
      // Update state with AI response and question
      setCurrentQuestion(result.transcribed_text || '');
      setCurrentResponse(result.summary || 'No response received');
      setCurrentAction(result.action || 'do_nothing');
      
      // Store audio data for playback
      if (result.audioSummary) {
        setAudioBase64(result.audioSummary);
        console.log('🎵 Audio response received, ready for playback');
        
        // Auto-play the audio response only if not muted
        if (!isMuted) {
          setTimeout(() => {
            playAudioResponse(result.audioSummary);
          }, 500); // Small delay to let UI update first
        } else {
          console.log('🔇 Audio auto-play skipped - muted');
        }
      }
      
      // Trigger follow-up onboarding after first question
      if (!hasAskedFirstQuestion) {
        setHasAskedFirstQuestion(true);
        // Start follow-up guide after a short delay
        setTimeout(() => {
          setShowInteractiveGuide(true);
          setOnboardingStep(0);
        }, 2000);
      }
      
      // Add to conversation history
      setConversationHistory(prev => [...prev, {
        id: Date.now(),
        type: 'ai_response',
        action: result.action || 'do_nothing',
        summary: result.summary || 'No response',
        transcribed: result.transcribed_text || '',
        audioData: result.audioSummary || '', // Store audio data
        timestamp: new Date().toLocaleTimeString()
      }]);

    } catch (error) {
      console.error('Voice command processing error:', error);
      
      let errorMessage = 'Failed to process voice command';
      if (error.response) {
        errorMessage = `Server error: ${error.response.status} - ${error.response.data?.detail || error.response.statusText}`;
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Server may be slow.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network connection failed. Check your connection.';
      }
      
      Alert.alert('Processing Error', errorMessage, [
        { text: 'Retry', onPress: () => processVoiceCommand(audioUri) },
        { text: 'Cancel', style: 'cancel' }
      ]);
    }
  };

  // Handle action button press
  const handleActionPress = (action) => {
    switch (action) {
      case 'weather':
        navigation.navigate('WeatherScreen');
        break;
      case 'soil_moisture':
        navigation.navigate('SoilMoistureScreen');
        break;
      case 'crop_intelligence':
        navigation.navigate('CropIntelligenceScreen');
        break;
      case 'cattle_management':
        navigation.navigate('CattleScreen');
        break;
      case 'profile':
        navigation.navigate('FarmerProfileScreen');
        break;
      case 'capture_image':
        // Handle image capture
        handleImageCapture();
        break;
      case 'chat':
        navigation.navigate('VoiceChatInputScreen');
        break;
      default:
        Alert.alert('Action', `${action} feature coming soon!`);
    }
  };

  const handleImageCapture = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });
      
      if (result.type === 'success') {
        Alert.alert('Image Selected', `Selected: ${result.name}`);
        // You can process the image here
      }
    } catch (error) {
      console.error('Image selection error:', error);
    }
  };

  // Audio playback functions
  const playAudioResponse = async (audioBase64Data) => {
    try {
      // Check if muted
      if (isMuted) {
        console.log('🔇 Audio playback blocked - muted');
        return;
      }

      if (!audioBase64Data) {
        console.log('No audio data to play');
        return;
      }

      // Stop any currently playing audio
      if (currentAudio) {
        await currentAudio.unloadAsync();
        setCurrentAudio(null);
      }

      console.log('🔊 Playing audio response...');
      setIsPlayingAudio(true);

      // Create data URI from base64
      const audioUri = `data:audio/mp3;base64,${audioBase64Data}`;
      
      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create and load the sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );

      setCurrentAudio(sound);

      // Set up completion callback
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlayingAudio(false);
          sound.unloadAsync();
          setCurrentAudio(null);
          console.log('✅ Audio playback completed');
        }
      });

    } catch (error) {
      console.error('❌ Audio playback error:', error);
      setIsPlayingAudio(false);
      Alert.alert('Audio Error', 'Failed to play audio response');
    }
  };

  const stopAudioPlayback = async () => {
    try {
      if (currentAudio) {
        await currentAudio.unloadAsync();
        setCurrentAudio(null);
        setIsPlayingAudio(false);
        console.log('🔇 Audio playback stopped');
      }
    } catch (error) {
      console.error('❌ Error stopping audio:', error);
    }
  };

  // Button handlers
  const handleEndSession = () => {
    if (recording) {
      recording.stopAndUnloadAsync();
      setRecording(null);
    }
    // Stop any playing audio
    stopAudioPlayback();
    setSessionActive(false);
  };
  
  const handlePause = () => setIsPaused((p) => !p);
  
  const handleMic = async () => {
    if (isListening) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };
  
  const handleExit = () => {
    if (recording) {
      recording.stopAndUnloadAsync();
      setRecording(null);
    }
    // Stop any playing audio
    stopAudioPlayback();
    if (navigation && navigation.navigate) {
      navigation.navigate('VoiceChatInputScreen');
    }
  };

  if (!sessionActive) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}> 
        <Text style={{ color: 'white', fontSize: 22, marginBottom: 20 }}>Session Ended</Text>
        <Text style={{ color: '#90caf9', fontSize: 16, marginBottom: 30, textAlign: 'center', paddingHorizontal: 20 }}>
          {conversationHistory.length > 0 
            ? `Processed ${conversationHistory.length} voice command${conversationHistory.length > 1 ? 's' : ''}`
            : 'No voice commands processed'}
        </Text>
        <TouchableOpacity 
          style={styles.micButton} 
          onPress={() => {
            setSessionActive(true);
            setCurrentResponse('');
            setCurrentAction('');
          }}
        >
          <Ionicons name="mic" size={40} color="black" />
        </TouchableOpacity>
        <Text style={{ color: 'white', fontSize: 14, marginTop: 10 }}>Start New Session</Text>
      </View>
    );
  }

  return (
    <View style={styles.outerGlowContainer}>
      <View style={styles.container}>
        {/* Header with Network Status and Help */}
        <View style={styles.headerContainer}>
          <View style={styles.networkStatusContainer}>
            <View style={[
              styles.networkIndicator, 
              { backgroundColor: networkStatus === 'connected' ? '#4CAF50' : networkStatus === 'error' ? '#F44336' : '#FF9800' }
            ]} />
            <Text style={styles.networkStatusText}>
              {networkStatus === 'connected' ? '🟢 Connected' : 
               networkStatus === 'error' ? '🔴 Offline' : '🟡 Connecting...'}
            </Text>
            {networkStatus === 'error' && (
              <TouchableOpacity onPress={testNetworkConnection} style={styles.retryButton}>
                <Ionicons name="refresh" size={16} color="white" />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.helpButton} 
            onPress={() => {
              Alert.alert(
                'Help Options',
                'How would you like to learn about this app?',
                [
                  { text: 'Interactive Guide', onPress: startInteractiveGuide },
                  { text: 'Help Manual', onPress: () => setShowOnboarding(true) },
                  { text: 'Cancel', style: 'cancel' }
                ]
              );
            }}
          >
            <Ionicons name="help-circle-outline" size={24} color="#03DAC6" />
          </TouchableOpacity>
        </View>

        {/* Voice Waveform Animation */}
        <View style={{ marginTop: 20, marginBottom: 20 }}>
          <VoiceWaveform isActive={isListening && !isPaused} />
        </View>

        {/* AI Response and Action Area */}
        <View style={styles.transcriptContainer}>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {isProcessing && (
              <View style={styles.processingContainer}>
                <Text style={styles.processingText}>🎤 Processing voice command...</Text>
              </View>
            )}
            
            {(currentQuestion || currentResponse) && (
              <View style={styles.conversationContainer}>
                {currentQuestion && (
                  <View style={styles.questionContainer}>
                    <Text style={styles.questionTitle}>🎤 You asked:</Text>
                    <Text style={styles.questionText}>"{currentQuestion}"</Text>
                  </View>
                )}
                
                {currentResponse && (
                  <View style={styles.responseContainer}>
                    <Text style={styles.responseTitle}>🤖 AI Response:</Text>
                    <Text style={styles.responseText}>{currentResponse}</Text>
                    
                    {/* Audio controls */}
                    {audioBase64 && (
                      <View style={styles.audioControlsContainer}>
                        <TouchableOpacity 
                          style={[styles.audioButton, isPlayingAudio && styles.audioButtonActive]}
                          onPress={() => isPlayingAudio ? stopAudioPlayback() : playAudioResponse(audioBase64)}
                        >
                          <Ionicons 
                            name={isPlayingAudio ? "stop" : "play"} 
                            size={20} 
                            color={isPlayingAudio ? "#FF5722" : "#03DAC6"} 
                          />
                          <Text style={[styles.audioButtonText, isPlayingAudio && styles.audioButtonTextActive]}>
                            {isPlayingAudio ? "Stop Audio" : "🔊 Play Response"}
                          </Text>
                        </TouchableOpacity>
                        
                        {/* Mute toggle button */}
                        <TouchableOpacity 
                          style={[styles.muteButton, isMuted && styles.muteButtonActive]}
                          onPress={() => setIsMuted(!isMuted)}
                        >
                          <Ionicons 
                            name={isMuted ? "volume-mute" : "volume-high"} 
                            size={20} 
                            color={isMuted ? "#FF5722" : "#03DAC6"} 
                          />
                          <Text style={[styles.muteButtonText, isMuted && styles.muteButtonTextActive]}>
                            {isMuted ? "Unmute" : "Mute"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    
                    {currentAction && currentAction !== 'do_nothing' && (
                      <TouchableOpacity 
                        style={[styles.actionButton, { backgroundColor: ACTION_BUTTONS[currentAction]?.color || '#03DAC6' }]}
                        onPress={() => handleActionPress(currentAction)}
                      >
                        <Ionicons 
                          name={ACTION_BUTTONS[currentAction]?.icon || 'help-circle'} 
                          size={24} 
                          color="white" 
                        />
                        <Text style={styles.actionButtonText}>
                          {ACTION_BUTTONS[currentAction]?.label || currentAction}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}
            
            {conversationHistory.length > 0 && !currentResponse && (
              <View style={styles.historyContainer}>
                <Text style={styles.historyTitle}>💬 Recent Commands:</Text>
                {conversationHistory.slice(-3).map((item) => (
                  <View key={item.id} style={styles.historyItem}>
                    <Text style={styles.historyTime}>{item.timestamp}</Text>
                    {item.transcribed && (
                      <Text style={styles.historyQuestion}>🎤 "{item.transcribed}"</Text>
                    )}
                    <Text style={styles.historyAction}>
                      {ACTION_BUTTONS[item.action]?.label || item.action}
                    </Text>
                    {item.audioData && (
                      <TouchableOpacity 
                        style={styles.historyAudioButton}
                        onPress={() => playAudioResponse(item.audioData)}
                      >
                        <Ionicons name="play" size={16} color="#03DAC6" />
                        <Text style={styles.historyAudioText}>Replay</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}
            
            {!currentResponse && !isProcessing && conversationHistory.length === 0 && (
              <View style={styles.welcomeContainer}>
                <Text style={styles.welcomeText}>🎤 Ready to Listen</Text>
                <Text style={styles.welcomeSubtext}>
                  Tap the microphone and ask about:
                  {'\n'}• Weather & farming conditions
                  {'\n'}• Crop recommendations & techniques
                  {'\n'}• Livestock management
                  {'\n'}• Soil moisture levels
                  {'\n'}• Your farm profile
                </Text>
                <TouchableOpacity 
                  style={styles.quickHelpButton}
                  onPress={() => setShowOnboarding(true)}
                >
                  <Ionicons name="help-circle" size={20} color="#03DAC6" />
                  <Text style={styles.quickHelpText}>Need help getting started?</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
          
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
            <TouchableOpacity 
              style={[
                styles.micButton, 
                isListening && { backgroundColor: '#FF5722', transform: [{ scale: 1.1 }] },
                isProcessing && { backgroundColor: '#FFC107' }
              ]} 
              onPress={handleMic}
              disabled={isProcessing}
            >
              <Ionicons 
                name={isProcessing ? "sync" : (isListening ? "stop" : "mic")} 
                size={40} 
                color="black" 
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.redXButton} onPress={handleExit}>
              <MaterialCommunityIcons name="close" size={28} color="white" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Interactive Guide Overlay */}
        {showInteractiveGuide && (
          <View style={styles.guideOverlay}>
            <TouchableOpacity 
              style={styles.guideOverlayBackground}
              onPress={nextOnboardingStep}
              activeOpacity={1}
            />
            <InteractiveGuideTooltip 
              step={hasAskedFirstQuestion ? FOLLOWUP_STEPS[onboardingStep] : ONBOARDING_STEPS[onboardingStep]}
              onNext={nextOnboardingStep}
              onSkip={skipOnboarding}
            />
          </View>
        )}
        
        {/* Onboarding Modal */}
        {showOnboarding && (
          <View style={styles.modalOverlay}>
            <View style={styles.onboardingModal}>
              <View style={styles.onboardingHeader}>
                <Text style={styles.onboardingTitle}>🎤 Voice Assistant Guide</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowOnboarding(false)}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.onboardingContent}>
                <View style={styles.guideSection}>
                  <Text style={styles.guideSectionTitle}>🚀 How to Use:</Text>
                  <Text style={styles.guideText}>1. Tap the microphone button 🎤</Text>
                  <Text style={styles.guideText}>2. Speak your question clearly</Text>
                  <Text style={styles.guideText}>3. Wait for AI response</Text>
                  <Text style={styles.guideText}>4. Tap action buttons to navigate</Text>
                </View>
                
                <View style={styles.guideSection}>
                  <Text style={styles.guideSectionTitle}>💬 Sample Questions:</Text>
                  <Text style={styles.guideExample}>"What's the weather today?"</Text>
                  <Text style={styles.guideExample}>"What crops should I grow now?"</Text>
                  <Text style={styles.guideExample}>"Show me modern farming techniques"</Text>
                  <Text style={styles.guideExample}>"Check soil moisture levels"</Text>
                  <Text style={styles.guideExample}>"Find equipment for rent"</Text>
                </View>
                
                <View style={styles.guideSection}>
                  <Text style={styles.guideSectionTitle}>🔄 Follow-up Questions:</Text>
                  <Text style={styles.guideText}>You can ask follow-up questions and the AI will remember the context of your conversation!</Text>
                  <Text style={styles.guideExample}>Example: "What's the weather?" → "Should I water my crops?"</Text>
                </View>
                
                <View style={styles.guideSection}>
                  <Text style={styles.guideSectionTitle}>🎯 Action Buttons:</Text>
                  <View style={styles.actionExamples}>
                    <View style={styles.actionExample}>
                      <Ionicons name="cloud" size={20} color="#4FC3F7" />
                      <Text style={styles.actionExampleText}>Weather</Text>
                    </View>
                    <View style={styles.actionExample}>
                      <Ionicons name="leaf" size={20} color="#4CAF50" />
                      <Text style={styles.actionExampleText}>Crop Intelligence</Text>
                    </View>
                    <View style={styles.actionExample}>
                      <Ionicons name="water" size={20} color="#8BC34A" />
                      <Text style={styles.actionExampleText}>Soil Check</Text>
                    </View>
                    <View style={styles.actionExample}>
                      <Ionicons name="paw" size={20} color="#FF9800" />
                      <Text style={styles.actionExampleText}>Livestock</Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
              
              <TouchableOpacity 
                style={styles.gotItButton}
                onPress={() => setShowOnboarding(false)}
              >
                <Text style={styles.gotItText}>Got it! Let's start 🚀</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  // Network Status Styles
  networkStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
    paddingBottom: 10,
  },
  networkIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  networkStatusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  retryButton: {
    marginLeft: 10,
    padding: 5,
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
  // New AI Response Styles
  processingContainer: {
    padding: 20,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  processingText: {
    color: '#FFC107',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
  },
  responseContainer: {
    padding: 20,
    backgroundColor: 'rgba(3, 218, 198, 0.1)',
    borderRadius: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#03DAC6',
  },
  responseTitle: {
    color: '#03DAC6',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  responseText: {
    color: '#B3E5FC',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 25,
    marginTop: 10,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  historyContainer: {
    padding: 20,
    backgroundColor: 'rgba(144, 202, 249, 0.1)',
    borderRadius: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#90CAF9',
  },
  historyTitle: {
    color: '#90CAF9',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  historyItem: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  historyTime: {
    color: '#757575',
    fontSize: 12,
    marginBottom: 2,
  },
  historyQuestion: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 2,
  },
  historyAction: {
    color: '#B3E5FC',
    fontSize: 14,
    fontWeight: '500',
  },
  welcomeContainer: {
    padding: 30,
    backgroundColor: 'rgba(156, 39, 176, 0.1)',
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'rgba(156, 39, 176, 0.3)',
    alignItems: 'center',
  },
  welcomeText: {
    color: '#CE93D8',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  welcomeSubtext: {
    color: '#B3E5FC',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
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
  
  // New styles for enhanced UI
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  helpButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(3, 218, 198, 0.1)',
  },
  conversationContainer: {
    width: '100%',
  },
  questionContainer: {
    backgroundColor: 'rgba(3, 218, 198, 0.1)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#03DAC6',
  },
  questionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#03DAC6',
    marginBottom: 5,
  },
  questionText: {
    fontSize: 16,
    color: '#333',
    fontStyle: 'italic',
  },
  quickHelpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 12,
    backgroundColor: 'rgba(3, 218, 198, 0.1)',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#03DAC6',
  },
  quickHelpText: {
    color: '#03DAC6',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  
  // Onboarding modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  onboardingModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  onboardingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  onboardingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  onboardingContent: {
    padding: 20,
    maxHeight: 400,
  },
  guideSection: {
    marginBottom: 20,
  },
  guideSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  guideText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 5,
  },
  guideExample: {
    fontSize: 14,
    color: '#03DAC6',
    fontStyle: 'italic',
    marginBottom: 5,
    paddingLeft: 10,
  },
  actionExamples: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  actionExample: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 10,
  },
  actionExampleText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  gotItButton: {
    backgroundColor: '#03DAC6',
    margin: 20,
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  gotItText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Interactive Guide Styles
  guideOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
  },
  guideOverlayBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    maxWidth: width - 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltipArrowDown: {
    position: 'absolute',
    bottom: -8,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'white',
  },
  tooltipArrowUp: {
    position: 'absolute',
    top: -8,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'white',
  },
  tooltipContent: {
    alignItems: 'center',
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  tooltipMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  tooltipButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  skipButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  skipButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  nextButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#03DAC6',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Audio control styles
  audioControlsContainer: {
    marginTop: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(3, 218, 198, 0.1)',
    borderColor: '#03DAC6',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    flex: 1,
  },
  audioButtonActive: {
    backgroundColor: 'rgba(255, 87, 34, 0.1)',
    borderColor: '#FF5722',
  },
  audioButtonText: {
    color: '#03DAC6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  audioButtonTextActive: {
    color: '#FF5722',
  },
  muteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(3, 218, 198, 0.1)',
    borderColor: '#03DAC6',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    flex: 1,
  },
  muteButtonActive: {
    backgroundColor: 'rgba(255, 87, 34, 0.1)',
    borderColor: '#FF5722',
  },
  muteButtonText: {
    color: '#03DAC6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  muteButtonTextActive: {
    color: '#FF5722',
  },
  historyAudioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(3, 218, 198, 0.1)',
    borderRadius: 12,
  },
  historyAudioText: {
    color: '#03DAC6',
    fontSize: 12,
    marginLeft: 4,
  },
});