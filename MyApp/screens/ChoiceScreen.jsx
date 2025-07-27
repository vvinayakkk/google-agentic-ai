import React, { useState, useRef, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Alert, Dimensions, Modal } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
// --- ASYNC STORAGE IMPORT ---
// You need to install this library to store the user's mode choice
// expo install @react-native-async-storage/async-storage
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import AnimatedLoading from '../components/AnimatedLoading';
import { useTranslation } from 'react-i18next';
import { NetworkConfig } from '../utils/NetworkConfig';
import { setLanguage } from '../i18n';

const API_BASE = NetworkConfig.API_BASE;
const FARMER_ID = 'f001';
const { width } = Dimensions.get('window');

// Interactive Guide Tooltip Component for ChoiceScreen
function InteractiveGuideTooltip({ step, onNext, onSkip }) {
  const getTooltipPosition = () => {
    switch (step.target) {
      case 'voiceButton':
        return {
          top: '25%', // Above the voice button (which is centered)
          alignSelf: 'center',
        };
      case 'manualButton':
        return {
          top: '50%', // Above the manual button (below voice button)
          alignSelf: 'center',
        };
      case 'profileIcon':
        return {
          top: 140, // Below the profile icon (top right)
          right: 10, // Align with profile icon position
        };
      // case 'marketButton':
      //   return {
      //     bottom: 200, // Above the market prices button
      //     alignSelf: 'center',
      //   };
      case 'soilButton':
        return {
          bottom: 140, // Above the soil moisture button (different from market)
          alignSelf: 'center',
        };
      case 'helpButton':
        return {
          bottom: 160, // Above the help button (bottom right)
          right: 10, // Align with help button position
        };
      case 'screen':
      default:
        return {
          top: '35%', // Center of screen for welcome message
          alignSelf: 'center',
        };
    }
  };

  return (
    <View style={[styles.tooltip, getTooltipPosition()]}>
      {/* Pointer Arrow */}
      {step.position === 'bottom' && <View style={styles.tooltipArrowDown} />}
      {step.position === 'top' && <View style={styles.tooltipArrowUp} />}
      {/* No arrow for center position */}
      
      <View style={styles.tooltipContent}>
        <Text style={styles.tooltipTitle}>{step.title}</Text>
        <Text style={styles.tooltipMessage}>{step.message}</Text>
        
        <View style={styles.tooltipButtons}>
          <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipButtonText}>Skip Tour</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextButton} onPress={onNext}>
            <Text style={styles.nextButtonText}>
              {step.id === 'help_features' ? 'Got it!' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// REMOVED: fetchWeatherContext, fetchSoilContext, fetchMarketContext, CONTEXT_FETCHED_KEY, and related useEffect

export default function ChoiceScreen({ navigation }) {
  const [showHelp, setShowHelp] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const { t, i18n } = useTranslation();
  // Onboarding states
  const [showInteractiveGuide, setShowInteractiveGuide] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  // Language options
  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
    { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
    { code: 'gu', name: 'ગુજરાતી', flag: '🇮🇳' },
    { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
    { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
    { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
    { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' },
  ];

  const handleLanguageChange = async (languageCode) => {
    try {
      await setLanguage(languageCode);
      setShowLanguageDropdown(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to change language');
    }
  };

  // Interactive onboarding steps for ChoiceScreen
  const ONBOARDING_STEPS = [
    {
      id: 'welcome',
      title: t('choice.onboarding.welcome_title'),
      message: t('choice.onboarding.welcome_message'),
      target: 'screen',
      position: 'center'
    },
    {
      id: 'voice_mode',
      title: t('choice.onboarding.voice_title'),
      message: t('choice.onboarding.voice_message'),
      target: 'voiceButton',
      position: 'top'
    },
    {
      id: 'manual_mode',
      title: t('choice.onboarding.manual_title'),
      message: t('choice.onboarding.manual_message'),
      target: 'manualButton',
      position: 'top'
    },
    {
      id: 'profile_access',
      title: t('choice.onboarding.profile_title'),
      message: t('choice.onboarding.profile_message'),
      target: 'profileIcon',
      position: 'bottom'
    },
    {
      id: 'market_prices',
      title: t('choice.onboarding.market_title'),
      message: t('choice.onboarding.market_message'),
      target: 'marketButton',
      position: 'bottom'
    },
    {
      id: 'help_features',
      title: t('choice.onboarding.help_title'),
      message: t('choice.onboarding.help_message'),
      target: 'helpButton',
      position: 'bottom'
    }
  ];

  // Check if user has seen onboarding before
  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const hasSeenGuide = await AsyncStorage.getItem('choiceScreenOnboardingCompleted');
      console.log('Onboarding status check:', hasSeenGuide);
      
      if (!hasSeenGuide) {
        console.log('First-time user detected, starting onboarding...');
        // Start onboarding after a short delay
        setTimeout(() => {
          setShowInteractiveGuide(true);
          setOnboardingStep(0);
        }, 500); // Increased delay to ensure UI is ready
      } else {
        console.log('Returning user, onboarding already completed');
      }
      setHasSeenOnboarding(!!hasSeenGuide);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      // If there's an error, show onboarding anyway
      setTimeout(() => {
        setShowInteractiveGuide(true);
        setOnboardingStep(0);
      }, 1500);
    }
  };

  const startInteractiveGuide = () => {
    console.log('Starting interactive guide manually...');
    setShowInteractiveGuide(true);
    setOnboardingStep(0);
  };

  // Debug function to reset onboarding (for testing)
  const resetOnboarding = async () => {
    try {
      await AsyncStorage.removeItem('choiceScreenOnboardingCompleted');
      setHasSeenOnboarding(false);
      console.log('Onboarding reset - will show on next app start');
      Alert.alert('Debug', 'Onboarding reset! Restart the app to see it again.');
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  };

  const nextOnboardingStep = () => {
    if (onboardingStep < ONBOARDING_STEPS.length - 1) {
      setOnboardingStep(onboardingStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const skipOnboarding = async () => {
    completeOnboarding();
  };

  const completeOnboarding = async () => {
    setShowInteractiveGuide(false);
    setOnboardingStep(0);
    setHasSeenOnboarding(true);
    
    try {
      await AsyncStorage.setItem('choiceScreenOnboardingCompleted', 'true');
    } catch (error) {
      console.error('Error saving onboarding completion:', error);
    }
  };
  // REMOVED: loading state and timeoutRef

  // Debug: log loading state changes
  useEffect(() => {
    console.log('ChoiceScreen mounted');
    return () => {
      console.log('ChoiceScreen unmounted');
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      console.log('ChoiceScreen focused');
      return () => {
        console.log('ChoiceScreen unfocused');
      };
    }, [])
  );

  const handleModeSelection = async (mode, screen) => {
    try {
      await AsyncStorage.setItem('userMode', mode);
      const newChat = {
        id: Date.now().toString(),
        title: t('voicechat.new_chat'),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        messages: [],
        context: { weather: '', soil: '', market: '' }
      };
      // Navigate immediately
      navigation.navigate(screen, { context: { weather: '', soil: '', market: '' } });
      // Fire and forget the API call
      axios.post(`${API_BASE}/farmer/${FARMER_ID}/chat`, newChat)
        .catch(() => {
          // Optionally show a toast or log error, but don't block navigation
        });
    } catch (e) {
      Alert.alert(t('common.error'), t('choice.error_start_chat'));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Header Icons at Top Right */}
      <View style={styles.headerContainer}>
        {/* Language Menu Button */}
        <TouchableOpacity
          style={styles.languageButton}
          onPress={() => setShowLanguageDropdown(!showLanguageDropdown)}
          activeOpacity={0.8}
        >
          <Ionicons name="ellipsis-vertical" size={30} color="#10B981" />
        </TouchableOpacity>
        
        {/* Profile Icon */}
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('FarmerProfile', { farmerId: FARMER_ID })}
          activeOpacity={0.8}
        >
          <Ionicons name="person-circle-outline" size={50} color="#10B981" />
        </TouchableOpacity>
      </View>
      {/* Title and Subtitle */}
      <Text style={styles.title}>{t('choice.title')}</Text>
      <Text style={styles.subtitle}>{t('choice.subtitle')}</Text>
      
      <View style={styles.optionsContainer}>
        <TouchableOpacity 
          style={styles.optionButton} 
          onPress={() => handleModeSelection('voice', 'LiveVoiceScreen')}
          // REMOVED: disabled={loading}
        >
          <MaterialCommunityIcons name="microphone-outline" size={60} color="#fff" />
          <Text style={styles.optionText}>{t('choice.voice_pilot')}</Text>
        </TouchableOpacity>
        
        <Text style={styles.orText}>{t('choice.or')}</Text>
        
        <TouchableOpacity 
          style={styles.optionButton} 
          onPress={() => handleModeSelection('manual', 'VoiceChatInputScreen')}
          // REMOVED: disabled={loading}
        >
          <Ionicons name="hand-right-outline" size={60} color="#fff" />
          <Text style={styles.optionText}>{t('choice.manual_mode')}</Text>
        </TouchableOpacity>
      </View>

      {/* Feature Buttons */}
      <View style={styles.featureButtonsContainer}>
        <TouchableOpacity 
          style={styles.featureButton} 
          onPress={() => navigation.navigate('BestOutOfWasteScreen')}
        >
          <Ionicons name="reload-circle-outline" size={24} color="#10B981" />
          <Text style={styles.featureButtonText}>♻️ Best Out of Waste</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.featureButton} 
          onPress={() => navigation.navigate('MarketplaceScreen')}
        >
          <Ionicons name="trending-up-outline" size={24} color="#10B981" />
          <Text style={styles.featureButtonText}>{t('choice.view_market_prices')}</Text>
        </TouchableOpacity>
      </View>
      {/* <TouchableOpacity 
        style={styles.featureButton} 
        onPress={() => navigation.navigate('SoilMoisture')}
        // REMOVED: disabled={loading}
      >
        <Ionicons name="water-outline" size={24} color="#3B82F6" />
        <Text style={[styles.featureButtonText, { color: '#3B82F6' }]}>{t('choice.check_soil_moisture')}</Text>
      </TouchableOpacity> */}

      {/* <TouchableOpacity 
        style={[styles.optionButton, { marginTop: 32, backgroundColor: '#10B981' }]}
        onPress={() => navigation.navigate('SpeechToTextScreen')}
      >
        <Ionicons name="mic" size={32} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18, marginLeft: 12 }}>Try Speech-to-Text Demo</Text>
      </TouchableOpacity> */}

      {/* Tour Buttons */}
      {hasSeenOnboarding && (
        <View style={styles.tourButtonsContainer}>
          <TouchableOpacity 
            style={styles.restartTourButton} 
            onPress={startInteractiveGuide}
          >
            <MaterialCommunityIcons name="replay" size={20} color="#10B981" />
            <Text style={styles.restartTourText}>Tour</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.resetTourButton} 
            onPress={resetOnboarding}
          >
            <MaterialCommunityIcons name="refresh" size={16} color="#FF5722" />
            <Text style={styles.resetTourText}>Reset</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.helpCardContainer}>
        {showHelp && (
          <View style={styles.helpCard}>
            <Text style={styles.helpCardText}>{t('choice.help_text')}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.helpButton} onPress={() => setShowHelp(!showHelp)} disabled={false}>
          <MaterialCommunityIcons name="help-circle-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Language Dropdown Modal */}
      <Modal
        visible={showLanguageDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLanguageDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageDropdown(false)}
        >
          <View style={styles.languageDropdown}>
            <Text style={styles.languageDropdownTitle}>Select Language</Text>
            {languages.map((language) => (
              <TouchableOpacity
                key={language.code}
                style={[
                  styles.languageOption,
                  i18n.language === language.code && styles.selectedLanguage
                ]}
                onPress={() => handleLanguageChange(language.code)}
              >
                <Text style={styles.languageFlag}>{language.flag}</Text>
                <Text style={[
                  styles.languageName,
                  i18n.language === language.code && styles.selectedLanguageText
                ]}>
                  {language.name}
                </Text>
                {i18n.language === language.code && (
                  <Ionicons name="checkmark" size={20} color="#10B981" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Interactive Guide Overlay */}
      {showInteractiveGuide && (
        <View style={styles.guideOverlay}>
          <TouchableOpacity 
            style={styles.guideOverlayBackground}
            onPress={nextOnboardingStep}
            activeOpacity={1}
          />
          <InteractiveGuideTooltip 
            step={ONBOARDING_STEPS[onboardingStep]}
            onNext={nextOnboardingStep}
            onSkip={skipOnboarding}
          />
        </View>
      )}
      
      {/* REMOVED: AnimatedLoading visible={loading} */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundImage: 'linear-gradient(to bottom, #0f172a, #121212)',
  },
  title: {
    fontSize: 52,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 10,
    textShadowColor: 'rgba(16,185,129,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.9,
    textAlign: 'center',
    paddingHorizontal: 20,
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(16,185,129,0.3)',
  },
  subtitle: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 60,
    letterSpacing: 0.5,
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 28,
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
  featureButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    gap: 15,
    flexWrap: 'wrap',
  },
  featureButton: {
    flexDirection: 'row',
    backgroundColor: '#27272a',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
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
    color: 'rgba(255,255,255,0.6)',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 2,
    marginVertical: 25,
    textTransform: 'uppercase',
    position: 'relative',
    paddingHorizontal: 20,
    textShadowColor: 'rgba(255,255,255,0.1)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
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

  // Onboarding Tour Button
  tourButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 10
  },
  restartTourButton: {
    zIndex: 2,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  restartTourText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  resetTourButton: {
    zIndex: 2,
    backgroundColor: 'rgba(255,87,34,0.1)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FF5722',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  resetTourText: {
    color: '#FF5722',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
    letterSpacing: 0.5,
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
    backgroundColor: '#10B981',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Language Dropdown Styles
  headerContainer: {
    position: 'absolute',
    top: 80,
    right: 28,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  languageButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  profileButton: {
    // No additional styles needed, keeping original positioning
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageDropdown: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 300,
    borderWidth: 1,
    borderColor: '#374151',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  languageDropdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    paddingBottom: 12,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: '#374151',
  },
  selectedLanguage: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  languageFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  languageName: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  selectedLanguageText: {
    color: '#10B981',
    fontWeight: 'bold',
  },
});
