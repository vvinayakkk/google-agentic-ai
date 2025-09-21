import React, { useState, useRef, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Alert, Dimensions, Modal, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
// --- ASYNC STORAGE IMPORT ---
// You need to install this library to store the user's mode choice
// expo install @react-native-async-storage/async-storage
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import AnimatedLoading from '../components/AnimatedLoading';
import { useTranslation } from 'react-i18next';
import { NetworkConfig } from '../utils/NetworkConfig';
import { useTheme } from '../context/ThemeContext';
import { setLanguage } from '../i18n';

const API_BASE = NetworkConfig.API_BASE;
const FARMER_ID = 'f001';
const { width, height } = Dimensions.get('window');

// Interactive Guide Tooltip Component for ChoiceScreen
function InteractiveGuideTooltip({ step, onNext, onSkip }) {
  const { t } = useTranslation();
  const getTooltipPosition = () => {
    switch (step.target) {
      case 'voiceButton':
        return {
          top: height * 0.35,
          alignSelf: 'center',
        };
      case 'manualButton':
        return {
          top: height * 0.55,
          alignSelf: 'center',
        };
      case 'profileIcon':
        return {
          top: height * 0.15,
          right: 20,
        };
      case 'soilButton':
        return {
          bottom: height * 0.25,
          alignSelf: 'center',
        };
      case 'helpButton':
        return {
          bottom: height * 0.15,
          right: 20,
        };
      case 'screen':
      default:
        return {
          top: height * 0.3,
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
            <Text style={styles.skipButtonText}>{t('choice.tour.skip', 'Skip Tour')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextButton} onPress={onNext}>
            <Text style={styles.nextButtonText}>
              {step.id === 'help_features' ? t('choice.tour.got_it', 'Got it!') : t('choice.tour.next', 'Next')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function ChoiceScreen({ navigation }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [showHelp, setShowHelp] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const { t, i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || 'en');
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
  // optimistically update selected language then persist & apply
  setSelectedLanguage(languageCode);
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
      title: t('choice.onboarding.welcome_title') || 'Welcome!',
      message: t('choice.onboarding.welcome_message') || 'Let\'s take a quick tour of the app features.',
      target: 'screen',
      position: 'center'
    },
    {
      id: 'voice_mode',
      title: t('choice.onboarding.voice_title') || 'Voice Mode',
      message: t('choice.onboarding.voice_message') || 'Use voice commands to interact with the AI assistant.',
      target: 'voiceButton',
      position: 'top'
    },
    {
      id: 'manual_mode',
      title: t('choice.onboarding.manual_title') || 'Manual Mode',
      message: t('choice.onboarding.manual_message') || 'Type your questions and get instant responses.',
      target: 'manualButton',
      position: 'top'
    },
    {
      id: 'profile_access',
      title: t('choice.onboarding.profile_title') || 'Profile',
      message: t('choice.onboarding.profile_message') || 'Access your profile and settings here.',
      target: 'profileIcon',
      position: 'bottom'
    },
    {
      id: 'market_prices',
      title: t('choice.onboarding.market_title') || 'Market Prices',
      message: t('choice.onboarding.market_message') || 'Check current market prices for your crops.',
      target: 'marketButton',
      position: 'bottom'
    },
    {
      id: 'help_features',
      title: t('choice.onboarding.help_title') || 'Help',
      message: t('choice.onboarding.help_message') || 'Get help and support whenever you need it.',
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
        setTimeout(() => {
          setShowInteractiveGuide(true);
          setOnboardingStep(0);
        }, 500);
      } else {
        console.log('Returning user, onboarding already completed');
      }
      setHasSeenOnboarding(!!hasSeenGuide);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
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
  Alert.alert(t('debug.title', 'Debug'), t('onboarding.reset_message', 'Onboarding reset! Restart the app to see it again.'));
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
      // Ensure the selected language is applied before navigating so subsequent screens render
      // in the chosen language. If no change is needed this resolves quickly.
      const currentLang = i18n.language || 'en';
      if (selectedLanguage && selectedLanguage !== currentLang) {
        await setLanguage(selectedLanguage);
      }
      const newChat = {
        id: Date.now().toString(),
        title: t('voicechat.new_chat') || 'New Chat',
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
      Alert.alert(t('common.error') || 'Error', t('choice.error_start_chat') || 'Failed to start chat');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <StatusBar barStyle={theme.colors.statusBarStyle} />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header Icons */}
        <View style={styles.headerContainer}>
          {/* Language Menu Button */}
          <TouchableOpacity
            style={[styles.languageButton, { backgroundColor: `${theme.colors.primary}20`, borderColor: `${theme.colors.primary}40` }]}
            onPress={() => setShowLanguageDropdown(!showLanguageDropdown)}
            activeOpacity={0.8}
          >
            <Ionicons name="ellipsis-vertical" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          
          {/* Profile Icon */}
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('FarmerProfile', { farmerId: FARMER_ID })}
            activeOpacity={0.8}
          >
            <Ionicons name="person-circle-outline" size={32} color={theme.colors.primary} />
          </TouchableOpacity>

          {/* Settings Icon */}
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.8}
          >
            <Ionicons name="settings-outline" size={28} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Title and Subtitle */}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.colors.primary }]}>
            {t('choice.title') || 'FarmBot'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {t('choice.subtitle') || 'Choose your interaction mode'}
          </Text>
        </View>
        
        {/* Main Options */}
        <View style={styles.optionsContainer}>
          <TouchableOpacity 
            style={[styles.optionButton, { 
              backgroundColor: theme.colors.surface, 
              borderColor: theme.colors.primary,
              shadowColor: theme.colors.primary 
            }]} 
            onPress={() => handleModeSelection('voice', 'LiveVoiceScreen')}
          >
            <MaterialCommunityIcons name="microphone-outline" size={50} color={theme.colors.primary} />
            <Text style={[styles.optionText, { color: theme.colors.text }]}>
              {t('choice.voice_pilot') || 'Voice Mode'}
            </Text>
          </TouchableOpacity>
          
          <Text style={[styles.orText, { color: theme.colors.textSecondary }]}>
            {t('choice.or') || 'OR'}
          </Text>
          
          <TouchableOpacity 
            style={[styles.optionButton, { 
              backgroundColor: theme.colors.surface, 
              borderColor: theme.colors.primary,
              shadowColor: theme.colors.primary 
            }]} 
            onPress={() => handleModeSelection('manual', 'VoiceChatInputScreen')}
          >
            <Ionicons name="hand-right-outline" size={50} color={theme.colors.primary} />
            <Text style={[styles.optionText, { color: theme.colors.text }]}>
              {t('choice.manual_mode') || 'Manual Mode'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Feature Buttons */}
        <View style={styles.featureButtonsContainer}>
          <TouchableOpacity 
            style={[styles.featureButton, { 
              backgroundColor: theme.colors.surface, 
              borderColor: theme.colors.border 
            }]} 
            onPress={() => navigation.navigate('BestOutOfWasteScreen')}
          >
            <Ionicons name="reload-circle-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.featureButtonText, { color: theme.colors.primary }]}>
              ♻️ Best Out of Waste
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.featureButton, { 
              backgroundColor: theme.colors.surface, 
              borderColor: theme.colors.border 
            }]} 
            onPress={() => navigation.navigate('MarketplaceScreen')}
          >
            <Ionicons name="trending-up-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.featureButtonText, { color: theme.colors.primary }]}>
              {t('choice.view_market_prices') || 'Market Prices'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tour Buttons */}
        {hasSeenOnboarding && (
          <View style={styles.tourButtonsContainer}>
            <TouchableOpacity 
              style={[styles.restartTourButton, { 
                backgroundColor: `${theme.colors.primary}20`, 
                borderColor: theme.colors.primary 
              }]} 
              onPress={startInteractiveGuide}
            >
              <MaterialCommunityIcons name="replay" size={18} color={theme.colors.primary} />
              <Text style={[styles.restartTourText, { color: theme.colors.primary }]}>{t('choice.tour.button', 'Tour')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.resetTourButton} 
              onPress={resetOnboarding}
            >
              <MaterialCommunityIcons name="refresh" size={16} color="#FF5722" />
              <Text style={styles.resetTourText}>{t('choice.tour.reset', 'Reset')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Help Button - Fixed Position */}
      <View style={styles.helpContainer}>
        {showHelp && (
          <View style={[styles.helpCard, { 
            backgroundColor: theme.colors.surface, 
            borderColor: theme.colors.border 
          }]}>
            <Text style={[styles.helpCardText, { color: theme.colors.text }]}>
              {t('choice.help_text') || 'Choose voice mode for hands-free interaction or manual mode for typing. Access your profile and market prices from the buttons above.'}
            </Text>
          </View>
        )}
        <TouchableOpacity 
          style={[styles.helpButton, { 
            backgroundColor: theme.colors.primary,
            shadowColor: theme.colors.primary 
          }]} 
          onPress={() => setShowHelp(!showHelp)}
        >
          <MaterialCommunityIcons name="help-circle-outline" size={24} color="white" />
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
          <View style={[styles.languageDropdown, { 
            backgroundColor: theme.colors.card, 
            borderColor: theme.colors.border 
          }]}> 
            <Text style={[styles.languageDropdownTitle, { 
              color: theme.colors.text, 
              borderBottomColor: theme.colors.border 
            }]}>
              {t('choice.select_language', 'Select Language')}
            </Text>
            {languages.map((language) => (
              <TouchableOpacity
                key={language.code}
                style={[
                  styles.languageOption,
                  { backgroundColor: theme.colors.surface },
                  i18n.language === language.code && { 
                    borderColor: theme.colors.primary, 
                    backgroundColor: `${theme.colors.primary}20` 
                  }
                ]}
                onPress={() => handleLanguageChange(language.code)}
              >
                  <Text style={styles.languageFlag}>{language.flag}</Text>
                <Text style={[
                  styles.languageName,
                  { color: theme.colors.text },
                  i18n.language === language.code && { 
                    color: theme.colors.primary, 
                    fontWeight: '700' 
                  }
                ]}>
                  {language.name}
                </Text>
                {i18n.language === language.code && (
                  <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100, // Space for help button
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingTop: 10,
  },
  languageButton: {
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  profileButton: {
    padding: 4,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: Math.min(width * 0.12, 48),
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: Math.min(width * 0.045, 18),
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  optionsContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  optionButton: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: Math.min(width * 0.8, 280),
    height: Math.min(height * 0.18, 140),
    marginVertical: 12,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  optionText: {
    fontSize: Math.min(width * 0.055, 22),
    fontWeight: 'bold',
    marginTop: 12,
    textAlign: 'center',
  },
  orText: {
    fontSize: Math.min(width * 0.045, 18),
    fontWeight: '600',
    letterSpacing: 1,
    marginVertical: 16,
    textAlign: 'center',
  },
  featureButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  featureButton: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    minWidth: Math.min(width * 0.4, 160),
    justifyContent: 'center',
  },
  featureButtonText: {
    fontSize: Math.min(width * 0.035, 14),
    fontWeight: '600',
    marginLeft: 8,
    textAlign: 'center',
  },
  tourButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  restartTourButton: {
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  restartTourText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  resetTourButton: {
    backgroundColor: 'rgba(255,87,34,0.1)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FF5722',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resetTourText: {
    color: '#FF5722',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  helpContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    alignItems: 'flex-end',
    zIndex: 100,
  },
  helpButton: {
    borderRadius: 25,
    padding: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  helpCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    maxWidth: width * 0.7,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  helpCardText: {
    fontSize: 14,
    lineHeight: 20,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageDropdown: {
    borderRadius: 16,
    padding: 20,
    width: Math.min(width * 0.85, 320),
    maxHeight: height * 0.7,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  languageDropdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
  },
  languageFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  languageName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
});