import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import ModalDropdown from 'react-native-modal-dropdown';
import { useTranslation } from 'react-i18next';
import { setLanguage, getStoredLanguage } from '../i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGES = [
  { label: 'English', value: 'en' },
  { label: 'हिन्दी (Hindi)', value: 'hi' },
  { label: 'বাংলা (Bengali)', value: 'bn' },
  { label: 'తెలుగు (Telugu)', value: 'te' },
  { label: 'మరాఠీ (Marathi)', value: 'mr' },
  { label: 'தமிழ் (Tamil)', value: 'ta' },
  { label: 'ગુજરાતી (Gujarati)', value: 'gu' },
  { label: 'ಕನ್ನಡ (Kannada)', value: 'kn' },
];

const LanguageSelectScreen = () => {
  const navigation = useNavigation();
  const { t, i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  useEffect(() => {
    getStoredLanguage().then((lang) => setSelectedLanguage(lang));
  }, []);

  const handleNext = async () => {
    await setLanguage(selectedLanguage);
    navigation.reset({
      index: 0,
      routes: [{ name: 'ChoiceScreen' }],
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.greeting}>{t('languageselect.greeting')}</Text>
        <Text style={styles.subtext}>{t('languageselect.subtext')}</Text>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.value}
            style={[
              styles.langButton,
              selectedLanguage === lang.value && styles.langButtonSelected,
            ]}
            onPress={() => setSelectedLanguage(lang.value)}
          >
            <Text
              style={[
                styles.langButtonText,
                selectedLanguage === lang.value && styles.langButtonTextSelected,
              ]}
            >
              {lang.label}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>{t('languageselect.next')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#000',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#fff',
  },
  greeting: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtext: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 18,
    textAlign: 'center',
  },
  pickerContainer: {
    backgroundColor: '#181820',
    borderRadius: 12,
    width: '100%',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  picker: {
    color: '#fff',
    width: '100%',
    height: 48,
  },
  pickerItem: {
    color: '#fff',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    marginTop: 8,
    flexDirection: 'row',
  },
  buttonText: {
    color: '#000',
    fontSize: 22,
    fontWeight: 'bold',
  },
  dropdown: {
    width: '100%',
    backgroundColor: '#000',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 28,
    marginTop: 8,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  dropdownText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'left',
  },
  dropdownList: {
    backgroundColor: '#000',
    borderRadius: 16,
    width: '80%',
    alignSelf: 'center',
    maxHeight: 320,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#fff',
  },
  dropdownOption: {
    color: '#fff',
    fontSize: 18,
    paddingVertical: 12,
    paddingHorizontal: 18,
    textAlign: 'left',
    backgroundColor: '#000',
  },
  dropdownOptionHighlight: {
    color: '#000',
    backgroundColor: '#fff',
    fontWeight: 'bold',
  },
  searchBar: {
    width: '100%',
    backgroundColor: '#000',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fff',
    color: '#fff',
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
    marginTop: 4,
  },
  langButton: {
    width: '100%',
    backgroundColor: '#181820',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
    alignItems: 'center',
  },
  langButtonSelected: {
    backgroundColor: '#fff',
    borderColor: '#000',
  },
  langButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  langButtonTextSelected: {
    color: '#000',
    fontWeight: 'bold',
  },
});

export default LanguageSelectScreen; 