import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, StatusBar, SafeAreaView, Alert, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { setLanguage, getStoredLanguage } from '../i18n';
import { Picker } from '@react-native-picker/picker';

const Row = ({ label, control }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <View>{control}</View>
  </View>
);

export default function SettingsScreen({ navigation }) {
  const { theme, mode, setMode } = useTheme();
  const { t, i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  const LANGUAGES = [
    { label: 'English', value: 'en' },
    { label: 'हिन्दी (Hindi)', value: 'hi' },
    { label: 'বাংলা (Bengali)', value: 'bn' },
    { label: 'తెలుగు (Telugu)', value: 'te' },
    { label: 'मराठी (Marathi)', value: 'mr' },
    { label: 'தமிழ் (Tamil)', value: 'ta' },
    { label: 'ગુજરાતી (Gujarati)', value: 'gu' },
    { label: 'ಕನ್ನಡ (Kannada)', value: 'kn' },
  ];

  useEffect(() => {
    let mounted = true;
    getStoredLanguage().then((lang) => {
      if (mounted && lang) setSelectedLanguage(lang);
    });
    return () => (mounted = false);
  }, []);

  const onChangeLanguage = async (lang) => {
    try {
      setSelectedLanguage(lang);
      await setLanguage(lang);
      // i18n.changeLanguage is invoked inside setLanguage via i18n.js, but ensure t updates
      if (i18n && i18n.changeLanguage) {
        i18n.changeLanguage(lang);
      }
      // optional feedback
      if (Platform.OS === 'web') {
        // no native Toast - use alert
        Alert.alert(t('common.success') || 'Success', t('crop_intelligence.language_changed_message', { language: lang }) || 'Language changed');
      }
    } catch (e) {
      Alert.alert(t('common.error') || 'Error', t('crop_intelligence.language_error_message') || 'Failed to change language');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <StatusBar barStyle={theme.colors.statusBarStyle} backgroundColor={theme.colors.headerBackground} />
  <View style={[styles.header, { backgroundColor: theme.colors.headerBackground, borderBottomColor: theme.colors.border }]}> 
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: theme.colors.headerTitle }]}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.headerTitle }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}> 
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Appearance</Text>

        <Row 
          label="Use System Theme" 
          control={
            <Switch
              value={mode === 'system'}
              onValueChange={(v) => setMode(v ? 'system' : 'light')}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={theme.colors.onPrimary}
            />
          }
        />

        <Row 
          label="Dark Mode" 
          control={
            <Switch
              value={mode === 'dark'}
              onValueChange={(v) => setMode(v ? 'dark' : 'light')}
              disabled={mode === 'system'}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={theme.colors.onPrimary}
            />
          }
        />
      </View>
      
      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}> 
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Language</Text>
        {/* Platform-friendly picker for language selection */}
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedLanguage}
            onValueChange={(val) => onChangeLanguage(val)}
            style={{ color: theme.colors.text }}
            itemStyle={{ color: theme.colors.text }}
          >
            {LANGUAGES.map((l) => (
              <Picker.Item key={l.value} label={l.label} value={l.value} />
            ))}
          </Picker>
        </View>
      </View>
  </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  backBtn: { padding: 8, width: 40 },
  backText: { fontSize: 18, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700' },
  card: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowLabel: { fontSize: 16 },
});
