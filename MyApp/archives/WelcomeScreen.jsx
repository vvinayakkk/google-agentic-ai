import React, { useState, useRef, useMemo } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  FlatList,
  I18nManager,
  Modal,
} from 'react-native';
import { Svg, Circle, G, Path } from 'react-native-svg';
import * as Speech from 'expo-speech';
import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';
import logo from '../assets/logo.png';
import { BlurView } from 'expo-blur';
import Toast from 'react-native-toast-message';
import { Animated, Easing } from 'react-native';

const theme = {
  colors: {
    primaryGreen: '#4CAF50',
    secondaryGreen: '#66BB6A',
    darkGreen: '#2E7D32',
    skyBlue: '#2196F3',
    lightBlue: '#64B5F6',
    orange: '#FF9800',
    red: '#F44336',
    gray: '#9E9E9E',
    lightGray: '#F5F5F5',
    white: '#FFFFFF',
    black: '#000000',
  },
  typography: {
    headingLarge: { fontSize: 28, fontWeight: 'bold' },
    bodyLarge: { fontSize: 16, fontWeight: 'normal' },
  },
  spacing: {
    small: 8,
    medium: 16,
    large: 24,
    extraLarge: 32,
  },
  layout: {
    horizontalPadding: 20,
    verticalPadding: 16,
  },
  borderRadius: {
    button: 25,
    card: 12,
  },
};

const translations = {
  en: {
    languageName: 'English',
    skip: 'Skip',
    next: 'Next',
    slides: [
      {
        title: 'Your Smart\nAgricultural Partner',
        description: 'Mazraaty is your trusted companion to diagnose plant diseases and provide actionable insights for healthier crops',
      },
      {
        title: 'Track Your Farm\nFrom Anywhere',
        description: 'Monitor weather, soil moisture, and crop health in real-time to make informed decisions.',
      },
      {
        title: 'Get Expert\nRecommendations',
        description: 'Receive personalized advice on fertilization, irrigation, and pest control.',
      },
      {
        title: 'Connect With\nCommunity',
        description: 'Share your experience and learn from other farmers in the Mazraaty community.',
      },
    ],
  },
  ar: {
    languageName: 'العربية',
    skip: 'تخطى',
    next: 'التالي',
    slides: [
      {
        title: 'شريكك الزراعي\nالذكي',
        description: 'مزرعتي هو رفيقك الموثوق به لتشخيص أمراض النباتات وتقديم رؤى قابلة للتنفيذ لمحاصيل أكثر صحة',
      },
      {
        title: 'تتبع مزرعتك\nمن أي مكان',
        description: 'راقب الطقس ورطوبة التربة وصحة المحاصيل في الوقت الفعلي لاتخاذ قرارات مستنيرة.',
      },
      {
        title: 'احصل على توصيات\nالخبراء',
        description: 'احصل على نصائح شخصية حول التسميد والري ومكافحة الآفات.',
      },
      {
        title: 'تواصل مع\nالمجتمع',
        description: 'شارك تجربتك وتعلم من المزارعين الآخرين في مجتمع مزرعتي.',
      },
    ],
  },
};

const i18n = new I18n(translations);
i18n.enableFallback = true;
i18n.locale = Localization.getLocales()[0].languageCode || 'en';

const { width, height } = Dimensions.get('window');

const Pagination = ({ activeIndex, total }) => (
  <View style={styles.paginationContainer}>
    {Array.from({ length: total }).map((_, index) => (
      <View
        key={index}
        style={[
          styles.paginationDot,
          {
            backgroundColor:
              index === activeIndex
                ? theme.colors.primaryGreen
                : theme.colors.gray,
            width: index === activeIndex ? 10 : 8,
            height: index === activeIndex ? 10 : 8,
          },
        ]}
      />
    ))}
  </View>
);

const PrimaryButton = ({ title, onPress }) => (
  <TouchableOpacity style={styles.primaryButton} onPress={onPress}>
    <Text style={styles.primaryButtonText}>{title}</Text>
  </TouchableOpacity>
);

const SkipButton = ({ onPress, title }) => (
  <TouchableOpacity style={styles.skipButton} onPress={onPress}>
    <Text style={styles.skipButtonText}>{title}</Text>
  </TouchableOpacity>
);

const VoiceButton = ({ onPress, isSpeaking }) => (
    <TouchableOpacity onPress={onPress} style={styles.voiceButton}>
        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <Path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" fill={isSpeaking ? theme.colors.primaryGreen : theme.colors.darkGreen}/>
            <Path d="M19 10v2a7 7 0 01-14 0v-2h2v2a5 5 0 0010 0v-2h2z" fill={isSpeaking ? theme.colors.primaryGreen : theme.colors.darkGreen}/>
        </Svg>
    </TouchableOpacity>
);

const LanguageSelector = ({ onPress, currentLang }) => (
    <TouchableOpacity onPress={onPress} style={styles.languageButton}>
        <Text style={styles.languageButtonText}>
            {currentLang.toUpperCase()}
        </Text>
    </TouchableOpacity>
);

const LanguageModal = ({ isVisible, onClose, onSelectLanguage, currentLocale }) => {
    const [modalAnim] = useState(new Animated.Value(height));

    Animated.spring(modalAnim, {
        toValue: 0,
        friction: 5,
        useNativeDriver: true,
    }).start();

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
            accessibilityViewIsModal={true}
            accessibilityLabel="language-selection-modal"
        >
            <View style={styles.modalContainer}>
                <Animated.View style={[styles.modalContent, { transform: [{ translateY: modalAnim }] }]}>
                    <Text style={styles.modalTitle}>Select Language</Text>
                    {Object.keys(translations).map((langCode) => (
                        <TouchableOpacity
                            key={langCode}
                            style={styles.languageOption}
                            onPress={() => onSelectLanguage(langCode)}
                        >
                            <Text style={[styles.languageOptionText, langCode === currentLocale && styles.languageOptionTextSelected]}>
                                {translations[langCode].languageName}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </Animated.View>
            </View>
        </Modal>
    );
};

const OnboardingSlide = ({ item }) => (
  <View style={styles.slide}>
    <View style={styles.imageContainer}>
      <Svg height="100%" width="100%" viewBox="0 0 200 200">
        <G>
          <Circle cx="100" cy="125" r="5" fill={theme.colors.darkGreen} />
          <Circle cx="100" cy="115" r="5" fill={theme.colors.darkGreen} />
          <Circle cx="100" cy="105" r="5" fill={theme.colors.darkGreen} />
          <Circle cx="100" cy="95" r="5" fill={theme.colors.darkGreen} />
          <Circle cx="100" cy="65" r="20" fill={theme.colors.darkGreen} />
          <Circle cx="100" cy="35" r="10" fill={theme.colors.primaryGreen} />
          <Circle cx="125" cy="50" r="10" fill={theme.colors.primaryGreen} />
          <Circle cx="125" cy="80" r="10" fill={theme.colors.primaryGreen} />
          <Circle cx="100" cy="95" r="10" fill={theme.colors.primaryGreen} />
          <Circle cx="75" cy="80" r="10" fill={theme.colors.primaryGreen} />
          <Circle cx="75" cy="50" r="10" fill={theme.colors.primaryGreen} />
        </G>
      </Svg>
    </View>
    <Text style={styles.title}>{item.title}</Text>
    <Text style={styles.description}>{item.description}</Text>
  </View>
);

const WelcomeScreen = () => {
  const [locale, setLocale] = useState(i18n.locale);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const slidesRef = useRef(null);

  const isRTL = locale.startsWith('ar');
  I18nManager.forceRTL(isRTL);

  const onboardingSlides = useMemo(() => {
    return i18n.t('slides').map((slide, index) => ({
      ...slide,
      key: String(index),
    }));
  }, [locale]);

  const handleLanguageChange = (newLocale) => {
    i18n.locale = newLocale;
    setLocale(newLocale);
    setModalVisible(false);
  };

  const handleNext = () => {
    if (activeIndex < onboardingSlides.length - 1) {
      slidesRef.current.scrollToIndex({ index: activeIndex + 1 });
    } else {
      console.log('Onboarding finished!');
    }
  };

  const handleSkip = () => {
    console.log('Onboarding skipped!');
  };
  
  const handleSpeech = async () => {
      const speaking = await Speech.isSpeakingAsync();
      if (speaking) {
          Speech.stop();
          setIsSpeaking(false);
      } else {
          setIsSpeaking(true);
          const currentSlide = onboardingSlides[activeIndex];
          const textToSpeak = `${currentSlide.title}. ${currentSlide.description}`;
          Speech.speak(textToSpeak, {
              language: locale,
              onDone: () => setIsSpeaking(false),
              onError: () => setIsSpeaking(false),
          });
      }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  return (
    <SafeAreaView style={styles.container}>
      <LanguageModal 
        isVisible={isModalVisible}
        onClose={() => setModalVisible(false)}
        onSelectLanguage={handleLanguageChange}
        currentLocale={locale}
      />
      <View style={[styles.topBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <VoiceButton onPress={handleSpeech} isSpeaking={isSpeaking}/>
            <LanguageSelector onPress={() => setModalVisible(true)} currentLang={locale.split('-')[0]} />
        </View>
        <SkipButton onPress={handleSkip} title={i18n.t('skip')} />
      </View>

      <View style={{ flex: 3 }}>
        <FlatList
          ref={slidesRef}
          data={onboardingSlides}
          renderItem={({ item }) => <OnboardingSlide item={item} />}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          scrollEventThrottle={32}
        />
      </View>

      <View style={styles.footer}>
        <Pagination activeIndex={activeIndex} total={onboardingSlides.length} />
        <PrimaryButton title={i18n.t('next')} onPress={handleNext} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  topBar: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.layout.horizontalPadding,
    paddingTop: theme.layout.verticalPadding,
  },
  skipButton: {
    padding: theme.spacing.small,
  },
  skipButtonText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.darkGreen,
  },
  voiceButton: {
    padding: theme.spacing.small,
  },
  languageButton: {
    padding: theme.spacing.small,
    marginHorizontal: theme.spacing.small,
  },
  languageButtonText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.darkGreen,
    fontWeight: 'bold',
  },
  slide: {
    width: width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.layout.horizontalPadding,
  },
  imageContainer: {
    width: width * 0.8,
    height: height * 0.3,
    marginBottom: theme.spacing.extraLarge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.headingLarge,
    color: theme.colors.darkGreen,
    textAlign: 'center',
    marginBottom: theme.spacing.medium,
  },
  description: {
    ...theme.typography.bodyLarge,
    color: theme.colors.gray,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.large,
    lineHeight: 24,
  },
  footer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.layout.horizontalPadding,
    paddingBottom: theme.spacing.large,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.large,
  },
  paginationDot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  primaryButton: {
    backgroundColor: theme.colors.primaryGreen,
    paddingVertical: theme.spacing.medium,
    borderRadius: theme.borderRadius.button,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primaryGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  primaryButtonText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalContent: {
    width: width * 0.95,
    minHeight: height * 0.6,
    maxHeight: height * 0.85,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#14532D',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDesc: {
    fontSize: 15,
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalButton: {
    width: '100%',
    backgroundColor: '#1976D2',
    borderRadius: 16,
    paddingVertical: 14,
    marginVertical: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
    letterSpacing: 0.2,
  },
  languageOption: {
    paddingVertical: theme.spacing.medium,
  },
  languageOptionText: {
    ...theme.typography.bodyLarge,
    textAlign: 'center',
  },
  languageOptionTextSelected: {
    color: theme.colors.primaryGreen,
    fontWeight: 'bold',
  },
});

export default WelcomeScreen;
