import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { setLanguage, getStoredLanguage } from '../i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const LANGUAGES = [
  { label: 'English', value: 'en', flag: '🇺🇸' },
  { label: 'हिन्दी (Hindi)', value: 'hi', flag: '🇮🇳' },
  { label: 'বাংলা (Bengali)', value: 'bn', flag: '🇧🇩' },
  { label: 'ગુજરાતી (Gujarati)', value: 'gu', flag: '🇮🇳' },
  { label: 'मराठी (Marathi)', value: 'mr', flag: '🇮🇳' },
  { label: 'தமிழ் (Tamil)', value: 'ta', flag: '🇮🇳' },
  { label: 'తెలుగు (Telugu)', value: 'te', flag: '🇮🇳' },
  { label: 'ಕನ್ನಡ (Kannada)', value: 'kn', flag: '🇮🇳' },
];

const LanguageSelector = ({ 
  position = 'top-right', 
  onLanguageChange,
  showFlag = true,
  compact = false 
}) => {
  const { t, i18n } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    loadCurrentLanguage();
  }, []);

  const loadCurrentLanguage = async () => {
    try {
      const storedLang = await getStoredLanguage();
      setCurrentLanguage(storedLang);
    } catch (error) {
      console.error('Error loading current language:', error);
    }
  };

  const handleLanguageChange = async (langCode) => {
    if (langCode === currentLanguage) {
      setModalVisible(false);
      return;
    }

    setIsChanging(true);
    try {
      await setLanguage(langCode);
      setCurrentLanguage(langCode);
      
      // Call the callback if provided
      if (onLanguageChange) {
        onLanguageChange(langCode);
      }

      // Show success message
      Alert.alert(
        t('crop_intelligence.language_changed'),
        t('crop_intelligence.language_changed_message', { 
          language: LANGUAGES.find(lang => lang.value === langCode)?.label 
        }),
        [{ text: 'OK' }]
      );

      setModalVisible(false);
    } catch (error) {
      console.error('Error changing language:', error);
      Alert.alert(t('crop_intelligence.language_error'), t('crop_intelligence.language_error_message'));
    } finally {
      setIsChanging(false);
    }
  };

  const getCurrentLanguageInfo = () => {
    const lang = LANGUAGES.find(l => l.value === currentLanguage);
    return lang || LANGUAGES[0];
  };

  const renderLanguageOption = (language) => {
    const isSelected = language.value === currentLanguage;
    
    return (
      <TouchableOpacity
        key={language.value}
        style={[
          styles.languageOption,
          isSelected && styles.languageOptionSelected
        ]}
        onPress={() => handleLanguageChange(language.value)}
        disabled={isChanging}
      >
        <View style={styles.languageOptionContent}>
          {showFlag && (
            <Text style={styles.languageFlag}>{language.flag}</Text>
          )}
          <View style={styles.languageTextContainer}>
            <Text style={[
              styles.languageLabel,
              isSelected && styles.languageLabelSelected
            ]}>
              {language.label}
            </Text>
            {isSelected && (
              <Ionicons 
                name="checkmark-circle" 
                size={20} 
                color="#00C853" 
                style={styles.checkIcon}
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCompactButton = () => (
    <TouchableOpacity
      style={styles.compactButton}
      onPress={() => setModalVisible(true)}
    >
      <Ionicons name="ellipsis-vertical" size={24} color="#E0E0E0" />
    </TouchableOpacity>
  );

  const renderFullButton = () => (
    <TouchableOpacity
      style={styles.fullButton}
      onPress={() => setModalVisible(true)}
    >
      <View style={styles.fullButtonContent}>
        {showFlag && (
          <Text style={styles.currentLanguageFlag}>
            {getCurrentLanguageInfo().flag}
          </Text>
        )}
        <Text style={styles.currentLanguageText}>
          {getCurrentLanguageInfo().label}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#E0E0E0" />
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      {compact ? renderCompactButton() : renderFullButton()}
      
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={[
            styles.modalContent,
            position === 'top-right' && styles.modalTopRight,
            position === 'top-left' && styles.modalTopLeft,
            position === 'bottom-right' && styles.modalBottomRight,
            position === 'bottom-left' && styles.modalBottomLeft,
          ]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('crop_intelligence.select_language')}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#E0E0E0" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.languageList}>
              {LANGUAGES.map(renderLanguageOption)}
            </View>
            
            {isChanging && (
              <View style={styles.loadingOverlay}>
                <Text style={styles.loadingText}>{t('crop_intelligence.changing_language')}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // Compact button (three dots)
  compactButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  // Full button (with language name)
  fullButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  fullButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentLanguageFlag: {
    fontSize: 16,
  },
  currentLanguageText: {
    color: '#E0E0E0',
    fontSize: 14,
    fontWeight: '500',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 0,
    width: width * 0.85,
    maxWidth: 350,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#444',
  },
  modalTopRight: {
    position: 'absolute',
    top: 100,
    right: 20,
  },
  modalTopLeft: {
    position: 'absolute',
    top: 100,
    left: 20,
  },
  modalBottomRight: {
    position: 'absolute',
    bottom: 100,
    right: 20,
  },
  modalBottomLeft: {
    position: 'absolute',
    bottom: 100,
    left: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E0E0E0',
  },
  closeButton: {
    padding: 4,
  },
  languageList: {
    padding: 8,
  },
  languageOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 2,
  },
  languageOptionSelected: {
    backgroundColor: 'rgba(0, 200, 83, 0.2)',
    borderWidth: 1,
    borderColor: '#00C853',
  },
  languageOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  languageTextContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  languageLabel: {
    fontSize: 16,
    color: '#E0E0E0',
    flex: 1,
  },
  languageLabelSelected: {
    color: '#00C853',
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  loadingText: {
    color: '#E0E0E0',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default LanguageSelector; 